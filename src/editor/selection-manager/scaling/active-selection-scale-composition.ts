import {
  FabricImage,
  Textbox,
  type ActiveSelection,
  type FabricObject,
  type Transform
} from 'fabric'
/* eslint-disable no-use-before-define -- The public contract precedes the internal checks. */

import type { ImageEditor } from '../..'
import type {
  RectangularScaleGestureMode,
  RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'

/** Local image properties that must not be changed by the overall selection transform. */
type ProtectedSelectionImageState = Readonly<{
  angle: number
  cropX: number
  cropY: number
  flipX: boolean
  flipY: boolean
  height: number
  kind: 'image'
  left: number
  originX: FabricImage['originX']
  originY: FabricImage['originY']
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  target: FabricImage
  top: number
  width: number
}>

/** Shape properties that layout must not change during shared scaling. */
type ProtectedSelectionShapeState = Readonly<{
  angle: number
  flipX: boolean
  flipY: boolean
  kind: 'shape'
  originX: FabricObject['originX']
  originY: FabricObject['originY']
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  target: FabricObject
}>

/** Text properties that must not be changed when applying the calculated active selection size. */
type ProtectedSelectionTextState = Readonly<{
  angle: number
  flipX: boolean
  flipY: boolean
  kind: 'text'
  originX: FabricObject['originX']
  originY: FabricObject['originY']
  skewX: number
  skewY: number
  target: Textbox
  text: string
}>

/** Protected state of a child in a selection whose geometry is determined by text. */
type ProtectedSelectionTextCompositionChildState =
  | ProtectedSelectionImageState
  | ProtectedSelectionTextState

/** Protected state of a child in a full mixed composition. */
type ProtectedSelectionMixedChildState =
  | ProtectedSelectionImageState
  | ProtectedSelectionShapeState
  | ProtectedSelectionTextState

/** Selection composition and child properties that must be preserved during shared scaling. */
export type ActiveSelectionScaleComposition = Readonly<{
  children: readonly ProtectedSelectionImageState[]
  kind: 'images'
}> | Readonly<{
  children: readonly ProtectedSelectionShapeState[]
  kind: 'shapes'
}> | Readonly<{
  children: readonly ProtectedSelectionTextCompositionChildState[]
  kind: 'texts'
}> | Readonly<{
  children: readonly ProtectedSelectionMixedChildState[]
  kind: 'mixed'
}>

/** Selection and Fabric transform properties that must be preserved during the gesture. */
export type ActiveSelectionScaleProtectedState = Readonly<{
  action: Transform['action']
  angle: number
  composition: ActiveSelectionScaleComposition
  controlKey: string
  flipX: boolean
  flipY: boolean
  height: number
  lockScalingFlip: boolean
  originX: Transform['originX']
  originY: Transform['originY']
  skewX: number
  skewY: number
  targetOriginX: ActiveSelection['originX']
  targetOriginY: ActiveSelection['originY']
  width: number
}>

/** Comparison tolerance for protected numeric selection properties. */
const ACTIVE_SELECTION_SCALE_STATE_EPSILON = 0.000000001

/** Returns the supported active selection composition. */
export function resolveActiveSelectionScaleCompositionKind({
  editor,
  target
}: {
  editor: ImageEditor
  target: ActiveSelection
}): ActiveSelectionScaleComposition['kind'] | null {
  if (isSupportedImageSelection({ target })) return 'images'
  if (editor.shapeManager.supportsActiveSelectionScaling({ selection: target })) return 'shapes'
  if (editor.textManager.supportsActiveSelectionScaling({ selection: target })) return 'texts'
  if (isSupportedMixedSelection({ editor, target })) return 'mixed'

  return null
}

/** Validates the selection's overall geometry before determining its domain composition. */
export function isSupportedActiveSelectionScaleGeometry({
  target
}: {
  target: ActiveSelection
}): boolean {
  const hasUnsupportedState = [
    target.group,
    target.parent,
    target.flipX,
    target.flipY,
    target.locked,
    target.lockScalingX,
    target.lockScalingY
  ].some(Boolean)
  if (hasUnsupportedState) return false

  const finiteValues = [
    target.width,
    target.height,
    target.angle ?? 0,
    target.skewX ?? 0,
    target.skewY ?? 0
  ]
  if (!finiteValues.every(Number.isFinite) || target.width <= 0 || target.height <= 0) return false

  return Math.abs(target.skewX ?? 0) <= ACTIVE_SELECTION_SCALE_STATE_EPSILON
    && Math.abs(target.skewY ?? 0) <= ACTIVE_SELECTION_SCALE_STATE_EPSILON
}

/** Saves selection properties and the protected state of its child objects. */
export function captureActiveSelectionScaleProtectedState({
  compositionKind,
  target,
  transform
}: {
  compositionKind: ActiveSelectionScaleComposition['kind']
  target: ActiveSelection
  transform: Transform
}): ActiveSelectionScaleProtectedState {
  return Object.freeze({
    action: transform.action,
    angle: target.angle ?? 0,
    composition: captureProtectedSelectionComposition({ compositionKind, target }),
    controlKey: transform.corner,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    height: target.height,
    lockScalingFlip: Boolean(target.lockScalingFlip),
    originX: transform.originX,
    originY: transform.originY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0,
    targetOriginX: target.originX,
    targetOriginY: target.originY,
    width: target.width
  })
}

/** Checks that Fabric has not switched the active gesture to another transform. */
export function isActiveSelectionScaleGesturePreserved({
  protectedState,
  target,
  transform
}: {
  protectedState: ActiveSelectionScaleProtectedState
  target: ActiveSelection
  transform: Transform
}): boolean {
  return transform.action === protectedState.action
    && transform.corner === protectedState.controlKey
    && transform.originX === protectedState.originX
    && transform.originY === protectedState.originY
    && areActiveSelectionScaleValuesNear({ first: target.angle ?? 0, second: protectedState.angle })
    && areActiveSelectionScaleValuesNear({ first: target.skewX ?? 0, second: protectedState.skewX })
    && areActiveSelectionScaleValuesNear({ first: target.skewY ?? 0, second: protectedState.skewY })
    && Boolean(target.flipX) === protectedState.flipX
    && Boolean(target.flipY) === protectedState.flipY
}

/** Checks selection properties, children, and inactive degrees of freedom. */
export function isActiveSelectionScaleProtectedStatePreserved({
  mode,
  multipliers,
  protectedState,
  target,
  transform
}: {
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  protectedState: ActiveSelectionScaleProtectedState
  target: ActiveSelection
  transform: Transform
}): boolean {
  if (!isCanonicalActiveSelectionStatePreserved({ protectedState, target, transform })) return false
  if (mode === 'horizontal') return areActiveSelectionScaleValuesNear({ first: multipliers.y, second: 1 })
  if (mode === 'vertical') return areActiveSelectionScaleValuesNear({ first: multipliers.x, second: 1 })
  if (mode === 'uniform') {
    return areActiveSelectionScaleValuesNear({ first: multipliers.x, second: multipliers.y })
  }

  return true
}

/** Compares finite scaling values within the protected state tolerance. */
export function areActiveSelectionScaleValuesNear({
  first,
  second
}: {
  first: number
  second: number
}): boolean {
  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= ACTIVE_SELECTION_SCALE_STATE_EPSILON
}

/** Checks a selection composed only of direct image children. */
function isSupportedImageSelection({ target }: { target: ActiveSelection }): boolean {
  const objects = target.getObjects()
  if (objects.length < 2) return false
  if (objects.some((object) => !(object instanceof FabricImage) || Boolean(object.parent))) return false

  return true
}

/** Checks a full composition containing at least an image, a shape, and standalone text. */
function isSupportedMixedSelection({
  editor,
  target
}: {
  editor: ImageEditor
  target: ActiveSelection
}): boolean {
  const shapes = editor.shapeManager.resolveSupportedActiveSelectionShapeChildren({ selection: target })
  if (!shapes) return false
  if (!target.getObjects().some((object) => object instanceof FabricImage)) return false

  return editor.textManager.supportsActiveSelectionScaling({
    domainTargets: shapes,
    selection: target
  })
}

/** Saves protected child properties according to the selection composition. */
function captureProtectedSelectionComposition({
  compositionKind,
  target
}: {
  compositionKind: ActiveSelectionScaleComposition['kind']
  target: ActiveSelection
}): ActiveSelectionScaleComposition {
  if (compositionKind === 'images') {
    return Object.freeze({
      children: Object.freeze(target.getObjects().map((object) => {
        return captureProtectedSelectionImageState({ target: object as FabricImage })
      })),
      kind: 'images'
    })
  }

  if (compositionKind === 'texts') {
    return Object.freeze({
      children: Object.freeze(target.getObjects().map((object) => {
        if (object instanceof FabricImage) {
          return captureProtectedSelectionImageState({ target: object })
        }

        return captureProtectedSelectionTextState({ target: object })
      })),
      kind: 'texts'
    })
  }

  if (compositionKind === 'mixed') {
    return Object.freeze({
      children: Object.freeze(target.getObjects().map((object) => {
        if (object instanceof FabricImage) return captureProtectedSelectionImageState({ target: object })
        if (object instanceof Textbox) return captureProtectedSelectionTextState({ target: object })

        return captureProtectedSelectionShapeState({ target: object })
      })),
      kind: 'mixed'
    })
  }

  return Object.freeze({
    children: Object.freeze(target.getObjects().map((object) => {
      return captureProtectedSelectionShapeState({ target: object })
    })),
    kind: 'shapes'
  })
}

/** Saves the local properties of one image within an active selection. */
function captureProtectedSelectionImageState({
  target
}: {
  target: FabricImage
}): ProtectedSelectionImageState {
  return Object.freeze({
    angle: target.angle ?? 0,
    cropX: target.cropX ?? 0,
    cropY: target.cropY ?? 0,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    height: target.height,
    kind: 'image',
    left: target.left,
    originX: target.originX,
    originY: target.originY,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0,
    target,
    top: target.top,
    width: target.width
  })
}

/** Saves the properties of one shape that do not depend on the current layout. */
function captureProtectedSelectionShapeState({
  target
}: {
  target: FabricObject
}): ProtectedSelectionShapeState {
  return Object.freeze({
    angle: target.angle ?? 0,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    kind: 'shape',
    originX: target.originX,
    originY: target.originY,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0,
    target
  })
}

/** Saves text properties that do not depend on canonical resizing. */
function captureProtectedSelectionTextState({
  target
}: {
  target: FabricObject
}): ProtectedSelectionTextState {
  if (!(target instanceof Textbox)) {
    throw new Error('A text composition must contain only Textbox objects')
  }

  return Object.freeze({
    angle: target.angle ?? 0,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    kind: 'text',
    originX: target.originX,
    originY: target.originY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0,
    target,
    text: target.text ?? ''
  })
}

/** Checks shared selection properties and the protected properties of its composition. */
function isCanonicalActiveSelectionStatePreserved({
  protectedState,
  target,
  transform
}: {
  protectedState: ActiveSelectionScaleProtectedState
  target: ActiveSelection
  transform: Transform
}): boolean {
  const { composition } = protectedState
  const children = target.getObjects()
  if (children.length !== composition.children.length) return false

  return isActiveSelectionScaleGesturePreserved({ protectedState, target, transform })
    && areActiveSelectionScaleValuesNear({ first: target.width, second: protectedState.width })
    && areActiveSelectionScaleValuesNear({ first: target.height, second: protectedState.height })
    && target.originX === protectedState.targetOriginX
    && target.originY === protectedState.targetOriginY
    && Boolean(target.lockScalingFlip) === protectedState.lockScalingFlip
    && isProtectedSelectionCompositionPreserved({ children, composition })
}

/** Checks immutable image, shape, and text properties within the selection. */
function isProtectedSelectionCompositionPreserved({
  children,
  composition
}: {
  children: FabricObject[]
  composition: ActiveSelectionScaleComposition
}): boolean {
  if (composition.kind === 'images') {
    return composition.children.every((state, index) => {
      return children[index] === state.target && isProtectedSelectionImageStatePreserved({ state })
    })
  }

  if (composition.kind === 'texts' || composition.kind === 'mixed') {
    return composition.children.every((state, index) => {
      if (children[index] !== state.target) return false

      if (state.kind === 'image') return isProtectedSelectionImageContentStatePreserved({ state })
      if (state.kind === 'shape') return isProtectedSelectionAffineStatePreserved({ state })

      return isProtectedSelectionTextStatePreserved({ state })
    })
  }

  return composition.children.every((state, index) => {
    return children[index] === state.target && isProtectedSelectionShapeStatePreserved({ state })
  })
}

/** Checks the local properties of one image after the overall selection transform. */
function isProtectedSelectionImageStatePreserved({
  state
}: {
  state: ProtectedSelectionImageState
}): boolean {
  const { target } = state

  return areActiveSelectionScaleValuesNear({ first: target.left, second: state.left })
    && areActiveSelectionScaleValuesNear({ first: target.top, second: state.top })
    && areActiveSelectionScaleValuesNear({ first: target.scaleX, second: state.scaleX })
    && areActiveSelectionScaleValuesNear({ first: target.scaleY, second: state.scaleY })
    && isProtectedSelectionImageContentStatePreserved({ state })
}

/** Checks image properties that must not change when layout is recalculated. */
function isProtectedSelectionImageContentStatePreserved({
  state
}: {
  state: ProtectedSelectionImageState
}): boolean {
  const { target } = state

  return areActiveSelectionScaleValuesNear({ first: target.width, second: state.width })
    && areActiveSelectionScaleValuesNear({ first: target.height, second: state.height })
    && areActiveSelectionScaleValuesNear({ first: target.angle ?? 0, second: state.angle })
    && areActiveSelectionScaleValuesNear({ first: target.skewX ?? 0, second: state.skewX })
    && areActiveSelectionScaleValuesNear({ first: target.skewY ?? 0, second: state.skewY })
    && areActiveSelectionScaleValuesNear({ first: target.cropX ?? 0, second: state.cropX })
    && areActiveSelectionScaleValuesNear({ first: target.cropY ?? 0, second: state.cropY })
    && Boolean(target.flipX) === state.flipX
    && Boolean(target.flipY) === state.flipY
    && target.originX === state.originX
    && target.originY === state.originY
}

/** Checks shape properties that layout must not change during the gesture. */
function isProtectedSelectionShapeStatePreserved({
  state
}: {
  state: ProtectedSelectionShapeState
}): boolean {
  const { target } = state

  return areActiveSelectionScaleValuesNear({ first: target.scaleX, second: state.scaleX })
    && areActiveSelectionScaleValuesNear({ first: target.scaleY, second: state.scaleY })
    && isProtectedSelectionAffineStatePreserved({ state })
}

/** Checks text properties that must not change when applying the calculated size. */
function isProtectedSelectionTextStatePreserved({
  state
}: {
  state: ProtectedSelectionTextState
}): boolean {
  const { target } = state

  return isProtectedSelectionAffineStatePreserved({ state })
    && (target.text ?? '') === state.text
}

/** Checks shared protected shape or text properties. */
function isProtectedSelectionAffineStatePreserved({
  state
}: {
  state: ProtectedSelectionShapeState | ProtectedSelectionTextState
}): boolean {
  const { target } = state

  return areActiveSelectionScaleValuesNear({ first: target.angle ?? 0, second: state.angle })
    && areActiveSelectionScaleValuesNear({ first: target.skewX ?? 0, second: state.skewX })
    && areActiveSelectionScaleValuesNear({ first: target.skewY ?? 0, second: state.skewY })
    && Boolean(target.flipX) === state.flipX
    && Boolean(target.flipY) === state.flipY
    && target.originX === state.originX
    && target.originY === state.originY
}
