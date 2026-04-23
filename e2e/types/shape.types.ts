import type { EditorObjectInfo, ObjectTargetParams } from './editor.types'

/** Доступные ключи shape-пресетов */
export type ShapePresetKey =
  | 'circle'
  | 'pie'
  | 'triangle'
  | 'square'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'star-16'
  | 'sparkle'
  | 'heart'
  | 'arrow-right-fat'
  | 'arrow-up-fat'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down-fat'
  | 'arrow-down'
  | 'arrow-up-down'
  | 'arrow-left-right'
  | 'banner'
  | 'drop'
  | 'cross'
  | 'ribbon'
  | 'gear'
  | 'badge'
  | 'bookmark'
  | 'tag'
  | 'moon'

export type ShapeHorizontalAlign = 'left' | 'center' | 'right' | 'justify'
export type ShapeVerticalAlign = 'top' | 'middle' | 'bottom'
export type ShapeScaleOriginX = 'left' | 'center' | 'right'
export type ShapeScaleOriginY = 'top' | 'center' | 'bottom'
export type ShapeScaleCorner = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'
export type ShapeScaleSide = 'right' | 'bottom' | 'left' | 'top'

/** Пользовательские внутренние отступы текста внутри фигуры. */
export interface ShapePaddingParams {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

/** Параметры стилизации текста внутри shape */
export interface ShapeTextStyleParams {
  text?: string
  fontFamily?: string
  color?: string
  strokeColor?: string
  strokeWidth?: number
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  uppercase?: boolean
  opacity?: number
  align?: ShapeHorizontalAlign
}

/** Параметры выделения диапазона текста внутри shape в режиме editing */
export interface ShapeTextSelectionParams {
  start: number
  end: number
}

/** Сериализованный стиль выделенного диапазона текста внутри shape */
export interface ShapeTextSelectionStyleInfo {
  fill: string | null
  stroke: string | null
  strokeWidth: number | null
  fontSize: number | null
  fontWeight: string | null
  fontStyle: string | null
  underline: boolean | null
  linethrough: boolean | null
}

/** Параметры добавления shape через модель (подмножество ShapeAddOptions) */
export interface ShapeAddParams {
  presetKey?: ShapePresetKey
  options?: {
    id?: string
    left?: number
    top?: number
    originX?: ShapeScaleOriginX
    originY?: ShapeScaleOriginY
    width?: number
    height?: number
    preserveAspectRatio?: boolean
    shapeTextAutoExpand?: boolean
    text?: string
    textStyle?: ShapeTextStyleParams
    fill?: string
    stroke?: string | null
    strokeWidth?: number
    opacity?: number
    rounding?: number
    alignH?: ShapeHorizontalAlign
    alignV?: ShapeVerticalAlign
    textPadding?: ShapePaddingParams
  }
}

/** Параметры добавления shape по границам bounding box, а не по центру объекта. */
export interface ShapeAddAtBoundsParams {
  presetKey?: ShapePresetKey
  options: {
    id?: string
    left: number
    top: number
    width: number
    height: number
    shapeTextAutoExpand?: boolean
    text?: string
    textStyle?: ShapeTextStyleParams
    fill?: string
    stroke?: string | null
    strokeWidth?: number
    opacity?: number
    rounding?: number
    alignH?: ShapeHorizontalAlign
    alignV?: ShapeVerticalAlign
    textPadding?: ShapePaddingParams
  }
}

/** Параметры обводки shape */
export interface ShapeStrokeParams {
  stroke?: string | null
  strokeWidth?: number
  dash?: number[] | null
}

/** Параметры обновления shape через модель (подмножество ShapeUpdateOptions) */
export interface ShapeUpdateParams {
  presetKey?: ShapePresetKey
  options?: {
    left?: number
    top?: number
    originX?: ShapeScaleOriginX
    originY?: ShapeScaleOriginY
    width?: number
    height?: number
    shapeTextAutoExpand?: boolean
    text?: string
    textStyle?: ShapeTextStyleParams
    fill?: string
    stroke?: string | null
    strokeWidth?: number
    opacity?: number
    rounding?: number
    alignH?: ShapeHorizontalAlign
    alignV?: ShapeVerticalAlign
    textPadding?: ShapePaddingParams
    preserveCurrentAspectRatio?: boolean
    withoutSelection?: boolean
  }
}

/** Параметры выравнивания текста внутри shape */
export interface ShapeTextAlignParams {
  horizontal?: ShapeHorizontalAlign
  vertical?: ShapeVerticalAlign
}

/** Сериализованная информация о текстовом узле внутри shape */
export interface ShapeTextInfo extends EditorObjectInfo {
  text: string
  fontFamily: string
  textAlign: ShapeHorizontalAlign
  fontSize: number
  fontWeight: string
  fontStyle: string
  underline: boolean
  linethrough: boolean
  uppercase: boolean
  isEditing: boolean
  evented: boolean
  lockMovementX: boolean
  lockMovementY: boolean
  lineCount: number
  selectionStart: number
  selectionEnd: number
  splitByGrapheme: boolean
}

/** ID shape-группы и её внутренних объектов. */
export interface ShapeObjectTreeIds {
  groupId: string | null
  shapeId: string | null
  textId: string | null
}

/** Параметры одного шага интерактивного масштабирования */
export interface ShapeScaleStepParams extends ObjectTargetParams {
  scaleX: number
  scaleY: number
  corner?: ShapeScaleCorner
  originX?: ShapeScaleOriginX
  originY?: ShapeScaleOriginY
  shiftKey?: boolean
  ctrlKey?: boolean
}

/** Параметры live-scale шага с synthetic mouse:move относительно активного transform. */
export interface ShapeScaleMouseMoveStepParams extends ShapeScaleStepParams {
  pointerX: number
  pointerY: number
  action?: 'scaleX' | 'scaleY'
  signX?: number
  signY?: number
}

/** Снимок состояния shape-группы во время/после масштабирования */
export interface ShapeScaleSnapshot {
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  shapeStrokeUniform: boolean | null
  shapeStrokeWidth: number | null
  groupBoundsLeft: number
  groupBoundsTop: number
  groupBoundsWidth: number
  groupBoundsHeight: number
  groupBoundsRight: number
  groupBoundsBottom: number
  shapeBoundsLeft: number | null
  shapeBoundsTop: number | null
  shapeBoundsWidth: number | null
  shapeBoundsHeight: number | null
  shapeBoundsRight: number | null
  shapeBoundsBottom: number | null
  textBoundsLeft: number | null
  textBoundsTop: number | null
  textBoundsWidth: number | null
  textBoundsHeight: number | null
  textBoundsRight: number | null
  textBoundsBottom: number | null
}

/** Расширенная информация о shape-группе */
export interface ShapeObjectInfo extends EditorObjectInfo {
  shapeComposite: boolean
  shapePresetKey: string
  shapeTextAutoExpand?: boolean
  shapeAlignHorizontal: ShapeHorizontalAlign
  shapeAlignVertical: ShapeVerticalAlign
  shapePaddingTop: number
  shapePaddingRight: number
  shapePaddingBottom: number
  shapePaddingLeft: number
  shapeFill?: string
  shapeStroke?: string | null
  shapeStrokeWidth?: number
  shapeOpacity?: number
  shapeRounding?: number
}
