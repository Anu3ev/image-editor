/* eslint-disable no-use-before-define -- Session creation precedes internal calculations. */
import { Point, type FabricObject, type Transform } from 'fabric'

import type SnappingManager from '../../snapping-manager'
import {
  createRectangularScaleGestureProjection,
  createRectangularScaleProjectionModes,
  resolveRectangularScaleMovingEdges,
  resolveRectangularScaleMultipliers,
  type RectangularScaleGestureProjection,
  type RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import { createScaleGestureBaseline, type ScaleSnapPlan } from '../../snapping-manager/scaling/scale-snapping-resolver'
import { ScaleSnappingRuntime } from '../../snapping-manager/scaling/scale-snapping-runtime'
import {
  getCropObjectSceneBounds,
  getCropRectInSource,
  getSourceSize,
  MAX_CROP_FRAME_HEIGHT,
  MAX_CROP_FRAME_WIDTH,
  MIN_CROP_FRAME_HEIGHT,
  MIN_CROP_FRAME_WIDTH
} from '../domain/crop-geometry'
import {
  resolveCropSourceScaleAnchor,
  resolveCropSourceAxisScaleLimit,
  type CropSourceScaleAnchor
} from '../domain/crop-source-scale'
import type { CropFrame } from '../domain/crop-frame'
import type { CropFrameTransformState, CropRect } from '../types'
import { getCropFrameTransformState } from '../domain/crop-frame-transform-state'

/** Geometry and constraints for a single resize, immutable until the gesture ends. */
export interface CropScaleSession {
  kind: 'scale'
  frame: CropFrame
  transform: Transform
  projection: RectangularScaleGestureProjection
  runtime: ScaleSnappingRuntime
  startRect: CropRect
  anchorX: CropSourceScaleAnchor
  anchorY: CropSourceScaleAnchor
  minimum: RectangularScaleMultipliers
  maximum: RectangularScaleMultipliers
  confirmed: CropFrameTransformState
}

/** Creates a crop session with exact corners excluding the stroke and constraints in source pixels. */
export function createCropScaleSession({
  frame,
  transform,
  snapping
}: {
  frame: CropFrame
  transform: Transform
  snapping: SnappingManager
}): CropScaleSession | null {
  const source = frame.cropSource
  if (!source || source.group || source.skewX || source.skewY) return null
  if (frame.group || frame.skewX || frame.skewY || frame.flipX || frame.flipY) return null
  if (frame.lockScalingX || frame.lockScalingY || frame.angle !== source.angle) return null

  const matrix = frame.calcTransformMatrix()
  const corners = [
    new Point(-frame.width / 2, -frame.height / 2),
    new Point(frame.width / 2, -frame.height / 2),
    new Point(frame.width / 2, frame.height / 2),
    new Point(-frame.width / 2, frame.height / 2)
  ].map((point) => point.transform(matrix))
  const projection = createRectangularScaleGestureProjection({
    // In Fabric, the action field is optional, while the projection accepts it explicitly, including as undefined.
    transform: { ...transform, action: transform.action },
    pointerStart: { x: transform.ex, y: transform.ey },
    corners
  })
  if (!projection) return null

  const startRect = getCropRectInSource({ source, frame })
  const anchorX = resolveCropSourceScaleAnchor({ source, transform, axis: 'x' })
  const anchorY = resolveCropSourceScaleAnchor({ source, transform, axis: 'y' })
  const maximum = resolveCropScaleMaximum({ frame, startRect, anchorX, anchorY })

  return {
    kind: 'scale',
    frame,
    transform,
    projection,
    runtime: startCropScaleSnapping({ frame, source, projection, snapping }),
    startRect,
    anchorX,
    anchorY,
    minimum: { x: MIN_CROP_FRAME_WIDTH / startRect.width, y: MIN_CROP_FRAME_HEIGHT / startRect.height },
    maximum,
    confirmed: getCropFrameTransformState({ frame })
  }
}

/** Captures candidates from the shared resolver, including the priority crop source bounds. */
function startCropScaleSnapping({
  frame,
  source,
  projection,
  snapping
}: {
  frame: CropFrame
  source: FabricObject
  projection: RectangularScaleGestureProjection
  snapping: SnappingManager
}): ScaleSnappingRuntime {
  const projectionModes = createRectangularScaleProjectionModes({ projection, includeUniformSideScale: true })
  const environment = snapping.captureScaleSnapEnvironment({
    activeObject: frame,
    targetEdges: resolveRectangularScaleMovingEdges({ projectionModes }),
    domainBoundary: { object: source, bounds: getCropObjectSceneBounds({ object: source }) }
  })
  const runtime = new ScaleSnappingRuntime()
  runtime.startSession({
    baseline: createScaleGestureBaseline({
      bounds: projection.baselineBounds,
      fixedAnchor: projection.fixedAnchor,
      projectionModes,
      candidates: environment.candidates,
      zoom: environment.zoom
    })
  })

  return runtime
}

/** Returns the maximum size multipliers around the fixed source sides. */
function resolveCropScaleMaximum({
  frame,
  startRect,
  anchorX,
  anchorY
}: {
  frame: CropFrame
  startRect: CropRect
  anchorX: CropSourceScaleAnchor
  anchorY: CropSourceScaleAnchor
}): RectangularScaleMultipliers {
  const maximum = { x: MAX_CROP_FRAME_WIDTH / startRect.width, y: MAX_CROP_FRAME_HEIGHT / startRect.height }
  if (frame.cropAllowFrameOverflow || !frame.cropSource) return maximum

  const sourceSize = getSourceSize({ source: frame.cropSource })
  maximum.x = Math.min(maximum.x, resolveCropSourceAxisScaleLimit({
    sourceSize, startRect, axis: 'x', anchor: anchorX
  }))
  maximum.y = Math.min(maximum.y, resolveCropSourceAxisScaleLimit({
    sourceSize, startRect, axis: 'y', anchor: anchorY
  }))

  return maximum
}

/** Applies source size constraints and rounding to the plan without modifying the live crop area. */
export function resolveCropScaleSize({
  session,
  plan
}: {
  session: CropScaleSession
  plan: ScaleSnapPlan
}): RectangularScaleMultipliers {
  const { minimum, maximum, startRect } = session
  const desired = resolveRectangularScaleMultipliers({
    projectionMode: plan.projectionMode,
    effectiveValues: plan.effectiveValues
  })

  if (plan.projectionMode === 'uniform') {
    let multiplier = desired.x
    if (!plan.constraints.x && !plan.constraints.y) {
      const fromWidth = Math.round(startRect.width * multiplier) / startRect.width
      const fromHeight = Math.round(startRect.height * multiplier) / startRect.height
      multiplier = Math.abs(fromWidth - multiplier) <= Math.abs(fromHeight - multiplier) ? fromWidth : fromHeight
    }
    multiplier = Math.max(Math.max(minimum.x, minimum.y), Math.min(Math.min(maximum.x, maximum.y), multiplier))

    return { x: multiplier, y: multiplier }
  }

  const hasGuide = Boolean(plan.constraints.x || plan.constraints.y)
  const multipliers = { x: 1, y: 1 }
  if (plan.projectionMode !== 'vertical') {
    const x = hasGuide ? desired.x : Math.round(startRect.width * desired.x) / startRect.width
    multipliers.x = Math.max(minimum.x, Math.min(maximum.x, x))
  }
  if (plan.projectionMode !== 'horizontal') {
    const y = hasGuide ? desired.y : Math.round(startRect.height * desired.y) / startRect.height
    multipliers.y = Math.max(minimum.y, Math.min(maximum.y, y))
  }

  return multipliers
}

/** Returns the final source rect, preserving the fixed side of each axis. */
export function resolveCropScaledRect({
  session,
  multipliers
}: {
  session: CropScaleSession
  multipliers: RectangularScaleMultipliers
}): CropRect {
  const { startRect, anchorX, anchorY } = session
  const width = startRect.width * multipliers.x
  const height = startRect.height * multipliers.y
  const offsetX = { min: 0, center: 0.5, max: 1 }[anchorX]
  const offsetY = { min: 0, center: 0.5, max: 1 }[anchorY]

  return {
    left: startRect.left + ((startRect.width - width) * offsetX),
    top: startRect.top + ((startRect.height - height) * offsetY),
    width,
    height
  }
}
