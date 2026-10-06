/* eslint-disable no-use-before-define -- Frame operations precede internal calculations. */
import {
  applyCropFrameTransformState,
  getCropFrameTransformStateFromSourceRect
} from '../domain/crop-frame-transform-state'
import { getCropSessionResultRect } from '../domain/crop-result'
import {
  resolveAnchoredRectStart,
  resolveCropProportionalSourceSnapPlan,
  resolveCropSourceScaleAnchor
} from '../domain/crop-source-scale'
import type { CropSourceScaleAnchor } from '../domain/crop-source-scale'
import type { CropFrameTransformState, CropRect, CropSession, CropSize } from '../types'
import type { CropFrameChangeEvent, CropSourceBoundScale, CropSourceBoundTransform } from './crop-resize.types'

/** Tolerance for comparing the snap plan with the source scale limit. */
const SOURCE_SCALE_PLAN_EPSILON = 0.000000001

/** Gap in source pixels within which the plan is considered to have reached the source boundary. */
const SOURCE_SCALE_PLAN_SNAP_GAP_PIXELS = 1

/** Size and fixed sides of the frame constrained to the source image. */
interface CropSourceBoundScalePlan {
  rect: CropRect
  scale: CropSourceBoundScale
  anchorX: CropSourceScaleAnchor
  anchorY: CropSourceScaleAnchor
}

/** Constrains the legacy snap plan to the source and saves it in the current transform. */
export function applyCropSourceBoundScalePlan({
  session,
  transform,
  nextScaleX,
  nextScaleY
}: {
  session: CropSession
  transform: CropSourceBoundTransform
  nextScaleX: number | null
  nextScaleY: number | null
}): boolean {
  const plan = resolveSourceBoundScalePlan({ session, transform, nextScaleX, nextScaleY })
  if (!plan) return false

  transform.cropSourceScaleClamped = true
  transform.cropSourceScalePreserveAspectRatio = true
  transform.cropSourceScaleAnchorX = plan.anchorX
  transform.cropSourceScaleAnchorY = plan.anchorY
  transform.cropSourceBoundScale = plan.scale
  transform.scaleX = plan.scale.scaleX
  transform.scaleY = plan.scale.scaleY
  applyCropFrameTransformState({
    frame: session.frame,
    state: getCropFrameTransformStateFromSourceRect({
      source: session.source, frame: session.frame, rect: plan.rect, scale: plan.scale
    })
  })

  return true
}

/** Restores the frame to the size already held at the source boundary by the legacy resize. */
export function restoreCropSourceBoundFrame({
  session,
  event
}: {
  session: CropSession
  event?: CropFrameChangeEvent
}): boolean {
  if (event?.transform?.cropSourceScaleClamped !== true) {
    session.sourceBoundFrameState = null
    return false
  }

  const state = getSourceBoundFrameState({ session, transform: event.transform }) ?? session.sourceBoundFrameState
  if (!state) return false

  applyCropFrameTransformState({ frame: session.frame, state })
  return true
}

/** Restores the fixed source point after legacy snapping or rounding. */
export function restoreCropScaleAnchor({
  session,
  transform
}: {
  session: CropSession
  transform?: CropSourceBoundTransform | null
}): boolean {
  if (!transform) return false
  const { width, height } = getCropSessionResultRect({ session })
  const rect = getAnchoredSourceRect({ session, transform, size: { width, height } })
  if (!rect) return false

  const { frame, source } = session
  applyCropFrameTransformState({
    frame,
    state: getCropFrameTransformStateFromSourceRect({
      source,
      frame,
      rect,
      scale: { scaleX: frame.scaleX ?? 1, scaleY: frame.scaleY ?? 1 }
    })
  })
  return true
}

/** Restores the saved scale and position from the initial gesture rectangle. */
function getSourceBoundFrameState({
  session,
  transform
}: {
  session: CropSession
  transform: CropSourceBoundTransform
}): CropFrameTransformState | null {
  const { cropSourceBoundScale: scale, cropSourceScaleBounds: bounds } = transform
  if (!scale || !Number.isFinite(scale.scaleX) || !Number.isFinite(scale.scaleY)) return null

  const originalScaleX = transform.original?.scaleX
  const originalScaleY = transform.original?.scaleY
  let rect: CropRect | null = null
  if (bounds && typeof originalScaleX === 'number' && typeof originalScaleY === 'number'
    && Number.isFinite(originalScaleX) && Number.isFinite(originalScaleY)
    && originalScaleX !== 0 && originalScaleY !== 0) {
    rect = getAnchoredSourceRect({
      session,
      transform,
      size: {
        width: bounds.startRect.width * Math.abs(scale.scaleX / originalScaleX),
        height: bounds.startRect.height * Math.abs(scale.scaleY / originalScaleY)
      }
    })
  }
  if (rect) {
    return getCropFrameTransformStateFromSourceRect({
      source: session.source, frame: session.frame, rect, scale
    })
  }

  return { left: session.frame.left, top: session.frame.top, scaleX: scale.scaleX, scaleY: scale.scaleY }
}

/** Returns a rectangle of the specified size relative to the fixed source sides. */
function getAnchoredSourceRect({
  session,
  transform,
  size
}: {
  session: CropSession
  transform: CropSourceBoundTransform
  size: CropSize
}): CropRect | null {
  const { cropSourceScaleBounds: bounds } = transform
  if (!bounds) return null

  const { source } = session
  const anchorX = transform.cropSourceScaleAnchorX ?? resolveCropSourceScaleAnchor({ source, transform, axis: 'x' })
  const anchorY = transform.cropSourceScaleAnchorY ?? resolveCropSourceScaleAnchor({ source, transform, axis: 'y' })

  return {
    left: resolveAnchoredRectStart({
      start: bounds.startRect.left, length: bounds.startRect.width, nextLength: size.width, anchor: anchorX
    }),
    top: resolveAnchoredRectStart({
      start: bounds.startRect.top, length: bounds.startRect.height, nextLength: size.height, anchor: anchorY
    }),
    width: size.width,
    height: size.height
  }
}

/** Constrains the proportional plan to the source bounds available from the start of the gesture. */
function resolveSourceBoundScalePlan({
  session, transform, nextScaleX, nextScaleY
}: {
  session: CropSession
  transform: CropSourceBoundTransform
  nextScaleX: number | null
  nextScaleY: number | null
}): CropSourceBoundScalePlan | null {
  const { cropSourceScaleBounds: bounds } = transform
  const originalScaleX = transform.original?.scaleX
  const originalScaleY = transform.original?.scaleY
  if (!bounds) return null
  if (typeof originalScaleX !== 'number' || typeof originalScaleY !== 'number') return null
  if (originalScaleX === 0 || originalScaleY === 0) return null

  const { source, frame } = session
  const scaleX = nextScaleX ?? frame.scaleX ?? originalScaleX
  const scaleY = nextScaleY ?? frame.scaleY ?? originalScaleY
  if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return null

  const anchorX = transform.cropSourceScaleAnchorX ?? resolveCropSourceScaleAnchor({ source, transform, axis: 'x' })
  const anchorY = transform.cropSourceScaleAnchorY ?? resolveCropSourceScaleAnchor({ source, transform, axis: 'y' })
  const sourcePlan = resolveCropProportionalSourceSnapPlan({
    sourceSize: bounds.sourceSize, startRect: bounds.startRect, anchorX, anchorY
  })
  if (!sourcePlan) return null

  const proposedScale = Math.max(Math.abs(scaleX / originalScaleX), Math.abs(scaleY / originalScaleY))
  const sourceScaleGap = Math.max(0, sourcePlan.scale - proposedScale)
    * Math.min(bounds.startRect.width, bounds.startRect.height)

  if (proposedScale <= sourcePlan.scale + SOURCE_SCALE_PLAN_EPSILON
    && sourceScaleGap > SOURCE_SCALE_PLAN_SNAP_GAP_PIXELS) return null

  return {
    anchorX,
    anchorY,
    rect: sourcePlan.rect,
    scale: { scaleX: originalScaleX * sourcePlan.scale, scaleY: originalScaleY * sourcePlan.scale }
  }
}
