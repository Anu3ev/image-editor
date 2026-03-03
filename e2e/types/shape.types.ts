import type { EditorObjectInfo } from './editor.types'

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
