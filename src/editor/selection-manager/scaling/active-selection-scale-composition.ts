/* eslint-disable no-use-before-define -- Публичный контракт расположен перед внутренними проверками. */
import {
  FabricImage,
  Textbox,
  type ActiveSelection,
  type FabricObject,
  type Transform
} from 'fabric'

import type { ImageEditor } from '../..'
import type {
  RectangularScaleGestureMode,
  RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'

/** Локальные свойства изображения, которые не должно изменять общее преобразование выделения. */
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

/** Свойства шейпа, которые не должна менять компоновка во время общего скейлинга. */
type ProtectedSelectionShapeState = Readonly<{
  angle: number
  flipX: boolean
  flipY: boolean
  originX: FabricObject['originX']
  originY: FabricObject['originY']
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  target: FabricObject
}>

/** Свойства текста, которые не должно изменять применение рассчитанного размера общего выделения. */
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

/** Защищённое состояние ребёнка выделения, геометрию которого определяют тексты. */
type ProtectedSelectionTextCompositionChildState =
  | ProtectedSelectionImageState
  | ProtectedSelectionTextState

/** Состав выделения и свойства детей, которые должны сохраниться во время общего скейлинга. */
export type ActiveSelectionScaleComposition = Readonly<{
  children: readonly ProtectedSelectionImageState[]
  kind: 'images'
}> | Readonly<{
  children: readonly ProtectedSelectionShapeState[]
  kind: 'shapes'
}> | Readonly<{
  children: readonly ProtectedSelectionTextCompositionChildState[]
  kind: 'texts'
}>

/** Свойства выделения и преобразования Fabric, которые должны сохраниться во время жеста. */
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

/** Допуск сравнения защищённых числовых свойств выделения. */
const ACTIVE_SELECTION_SCALE_STATE_EPSILON = 0.000000001

/** Возвращает поддерживаемый состав общего выделения. */
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

  return null
}

/** Проверяет общую геометрию выделения до определения его доменного состава. */
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

/** Сохраняет свойства выделения и защищённое состояние его дочерних объектов. */
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

/** Проверяет, что Fabric не переключил активный жест на другое преобразование. */
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

/** Проверяет свойства выделения, детей и неактивные степени свободы. */
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

/** Сравнивает конечные значения скейлинга в пределах допуска защищённого состояния. */
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

/** Проверяет состав выделения только из прямых изображений. */
function isSupportedImageSelection({ target }: { target: ActiveSelection }): boolean {
  const objects = target.getObjects()
  if (objects.length < 2) return false
  if (objects.some((object) => !(object instanceof FabricImage) || Boolean(object.parent))) return false

  return true
}

/** Сохраняет защищённые свойства дочерних объектов с учётом состава выделения. */
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

  return Object.freeze({
    children: Object.freeze(target.getObjects().map((object) => {
      return captureProtectedSelectionShapeState({ target: object })
    })),
    kind: 'shapes'
  })
}

/** Сохраняет локальные свойства одного изображения внутри общего выделения. */
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

/** Сохраняет свойства одного шейпа, которые не зависят от текущей компоновки. */
function captureProtectedSelectionShapeState({
  target
}: {
  target: FabricObject
}): ProtectedSelectionShapeState {
  return Object.freeze({
    angle: target.angle ?? 0,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    originX: target.originX,
    originY: target.originY,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0,
    target
  })
}

/** Сохраняет свойства текста, которые не зависят от канонического изменения размера. */
function captureProtectedSelectionTextState({
  target
}: {
  target: FabricObject
}): ProtectedSelectionTextState {
  if (!(target instanceof Textbox)) {
    throw new Error('Текстовый состав должен содержать только объекты Textbox')
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

/** Проверяет общие свойства выделения и защищённые свойства его состава. */
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

/** Проверяет неизменяемые свойства изображений, шейпов и текстов внутри выделения. */
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

  if (composition.kind === 'texts') {
    return composition.children.every((state, index) => {
      if (children[index] !== state.target) return false

      return state.kind === 'image'
        ? isProtectedSelectionImageContentStatePreserved({ state })
        : isProtectedSelectionTextStatePreserved({ state })
    })
  }

  return composition.children.every((state, index) => {
    return children[index] === state.target && isProtectedSelectionShapeStatePreserved({ state })
  })
}

/** Проверяет локальные свойства одного изображения после общего преобразования выделения. */
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

/** Проверяет свойства изображения, которые не должны меняться при пересчёте компоновки. */
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

/** Проверяет свойства шейпа, которые компоновка во время жеста не должна менять. */
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

/** Проверяет свойства текста, которые не должно изменять применение рассчитанного размера. */
function isProtectedSelectionTextStatePreserved({
  state
}: {
  state: ProtectedSelectionTextState
}): boolean {
  const { target } = state

  return isProtectedSelectionAffineStatePreserved({ state })
    && (target.text ?? '') === state.text
}

/** Проверяет общие защищённые свойства шейпа или текста. */
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
