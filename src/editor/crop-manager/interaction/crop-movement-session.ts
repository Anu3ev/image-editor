import { Point, util, type TMat2D, type Transform } from 'fabric'
import { english, type Translate } from '../../i18n'
/* eslint-disable no-use-before-define -- Intent calculation precedes final position constraints. */

import type SnappingManager from '../../snapping-manager'
import {
  createMovementGestureBaseline,
  type MovementGestureBaseline,
  type MovementRawIntent,
  type MovementTargetPosition
} from '../../snapping-manager/movement/movement-snapping-resolver'
import { MovementSnappingRuntime } from '../../snapping-manager/movement/movement-snapping-runtime'
import type { CropFrame } from '../domain/crop-frame'
import { getCropFrameTransformState } from '../domain/crop-frame-transform-state'
import {
  getCropObjectSceneBounds,
  getCropRectInSource,
  getCropSourceClampOffset,
  getSourceSize
} from '../domain/crop-geometry'
import type { CropFrameTransformState, CropRect, CropSize } from '../types'

/** Tolerance for converting source constraints to scene coordinates. */
const SOURCE_POSITION_EPSILON = 0.000000001

/** Initial crop movement geometry and the last validated frame. */
export interface CropMovementSession {
  kind: 'movement'
  transform: Transform
  originalHandler: Transform['actionHandler']
  runtime: MovementSnappingRuntime
  baseline: MovementGestureBaseline
  pointerStart: Point
  startRect: CropRect
  sourceSize: CropSize
  sourceMatrix: TMat2D
  inverseSourceMatrix: TMat2D
  allowOverflow: boolean
  confirmed: CropFrameTransformState
}

/** Captures scene and source geometry before the first drag mutation. */
export function createCropMovementSession({
  t = english,
  frame,
  transform,
  snapping
}: {
  t?: Translate
  frame: CropFrame
  transform: Transform
  snapping: SnappingManager
}): CropMovementSession | null {
  const source = frame.cropSource
  if (!source || source.group || source.skewX || source.skewY) return null
  if (frame.group || frame.skewX || frame.skewY || frame.flipX || frame.flipY) return null
  if (frame.lockMovementX || frame.lockMovementY || frame.angle !== source.angle) return null

  const baseline = createMovementGestureBaseline({
    t,
    bounds: frame.getObjectSnappingBounds(),
    position: { left: frame.left, top: frame.top },
    environment: snapping.captureMovementSnapEnvironment({
      activeObject: frame,
      domainBoundary: { object: source, bounds: getCropObjectSceneBounds({ object: source }) }
    })
  })
  const runtime = new MovementSnappingRuntime(t)
  runtime.startSession({ baseline })
  const sourceMatrix: TMat2D = [...source.calcTransformMatrix()]

  return {
    kind: 'movement',
    transform,
    originalHandler: transform.actionHandler,
    runtime,
    baseline,
    pointerStart: new Point(transform.ex, transform.ey),
    startRect: getCropRectInSource({ source, frame }),
    sourceSize: getSourceSize({ source }),
    sourceMatrix,
    inverseSourceMatrix: util.invertTransform(sourceMatrix),
    allowOverflow: frame.cropAllowFrameOverflow,
    confirmed: getCropFrameTransformState({ frame })
  }
}

/** Calculates the raw offset from the pointer position at the start of the gesture without reading the modified frame. */
export function resolveCropMovementIntent({
  session, pointer, ctrlKey
}: {
  session: CropMovementSession
  pointer: Point
  ctrlKey: boolean
}): MovementRawIntent {
  const { bounds, position } = session.baseline
  const delta = pointer.subtract(session.pointerStart)
  const rawPosition = { left: position.left + delta.x, top: position.top + delta.y }
  const constrained = resolveCropMovementPosition({ session, position: rawPosition })
  const blockedX = Math.abs(constrained.left - rawPosition.left) > SOURCE_POSITION_EPSILON
  const blockedY = Math.abs(constrained.top - rawPosition.top) > SOURCE_POSITION_EPSILON
  const isBlocked = blockedX || blockedY

  return {
    position: rawPosition,
    bounds: {
      left: bounds.left + delta.x,
      right: bounds.right + delta.x,
      top: bounds.top + delta.y,
      bottom: bounds.bottom + delta.y,
      centerX: bounds.centerX + delta.x,
      centerY: bounds.centerY + delta.y
    },
    axes: {
      x: !blockedX && (!isBlocked || Math.abs(delta.x) > SOURCE_POSITION_EPSILON),
      y: !blockedY && (!isBlocked || Math.abs(delta.y) > SOURCE_POSITION_EPSILON)
    },
    modifiers: { ctrlKey }
  }
}

/** Constrains the selected position to the source bounds without changing the crop size. */
export function resolveCropMovementPosition({
  session, position
}: {
  session: CropMovementSession
  position: MovementTargetPosition
}): MovementTargetPosition {
  if (session.allowOverflow) return position

  const { baseline, startRect, inverseSourceMatrix, sourceMatrix, sourceSize } = session
  const sourceDelta = new Point(position.left - baseline.position.left, position.top - baseline.position.top)
    .transform(inverseSourceMatrix, true)
  const correction = getCropSourceClampOffset({
    sourceSize,
    rect: { ...startRect, left: startRect.left + sourceDelta.x, top: startRect.top + sourceDelta.y }
  }).transform(sourceMatrix, true)

  return { left: position.left + correction.x, top: position.top + correction.y }
}
