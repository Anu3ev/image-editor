import type { EditorObjectInfo, ObjectTargetParams } from './editor.types'

/** Доступные ключи shape-пресетов */
export type ShapePresetKey =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'sparkle'
  | 'heart'
  | 'arrow-right-fat'
  | 'arrow-up-fat'
  | 'arrow-right'
  | 'arrow-down-fat'
  | 'arrow-up-down'
  | 'arrow-left-right'
  | 'drop'
  | 'cross'
  | 'gear'
  | 'badge'
  | 'bookmark'
  | 'tag'
  | 'moon'

export type ShapeHorizontalAlign = 'left' | 'center' | 'right'
export type ShapeVerticalAlign = 'top' | 'middle' | 'bottom'
export type ShapeScaleOriginX = 'left' | 'center' | 'right'
export type ShapeScaleOriginY = 'top' | 'center' | 'bottom'
export type ShapeScaleCorner = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

/** Параметры стилизации текста внутри shape */
export interface ShapeTextStyleParams {
  text?: string
  fill?: string
  stroke?: string | null
  strokeWidth?: number
  fontSize?: number
  fontWeight?: string
  fontStyle?: string
  underline?: boolean
  linethrough?: boolean
  opacity?: number
  align?: ShapeHorizontalAlign
}

/** Параметры добавления shape через модель (подмножество ShapeAddOptions) */
export interface ShapeAddParams {
  presetKey?: ShapePresetKey
  options?: {
    id?: string
    left?: number
    top?: number
    width?: number
    height?: number
    text?: string
    fill?: string
    stroke?: string | null
    strokeWidth?: number
    opacity?: number
    rounding?: number
    alignH?: ShapeHorizontalAlign
    alignV?: ShapeVerticalAlign
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
    width?: number
    height?: number
    text?: string
    fill?: string
    stroke?: string | null
    strokeWidth?: number
    opacity?: number
    rounding?: number
    alignH?: ShapeHorizontalAlign
    alignV?: ShapeVerticalAlign
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
  textAlign: ShapeHorizontalAlign
  fontSize: number
  fontWeight: string
  fontStyle: string
  underline: boolean
  linethrough: boolean
  isEditing: boolean
  evented: boolean
  lockMovementX: boolean
  lockMovementY: boolean
}

/** Параметры одного шага интерактивного масштабирования */
export interface ShapeScaleStepParams extends ObjectTargetParams {
  scaleX: number
  scaleY: number
  corner?: ShapeScaleCorner
  originX?: ShapeScaleOriginX
  originY?: ShapeScaleOriginY
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
}

/** Расширенная информация о shape-группе */
export interface ShapeObjectInfo extends EditorObjectInfo {
  shapeComposite: boolean
  shapePresetKey: string
  shapeAlignHorizontal: ShapeHorizontalAlign
  shapeAlignVertical: ShapeVerticalAlign
  shapeFill?: string
  shapeStroke?: string | null
  shapeStrokeWidth?: number
  shapeOpacity?: number
  shapeRounding?: number
}
