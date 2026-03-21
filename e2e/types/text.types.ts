import type {
  EditorObjectInfo,
  ObjectTargetParams,
  TemplateDefinition
} from './editor.types'

export type TextHorizontalAlign = 'left' | 'center' | 'right'
export type TextResizeOriginX = 'left' | 'right'
export type TextResizeOriginY = 'top' | 'center' | 'bottom'

/** Параметры добавления standalone text-объекта через e2e-модель. */
export interface TextAddParams {
  id?: string
  text?: string
  left?: number
  top?: number
  width?: number
  angle?: number
  autoExpand?: boolean
  fontFamily?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  align?: TextHorizontalAlign
  color?: string
  backgroundColor?: string
  backgroundOpacity?: number
  lineHeight?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  radiusTopLeft?: number
  radiusTopRight?: number
  radiusBottomRight?: number
  radiusBottomLeft?: number
}

/** Частичный inline-стиль текста для диапазона или line defaults. */
export interface TextInlineStyle {
  fill?: string
  fontFamily?: string
  fontSize?: number
  fontStyle?: string
  fontWeight?: string
}

/** Карта дефолтных стилей строк standalone text-объекта. */
export type TextLineDefaults = Record<number, TextInlineStyle>

/** Сериализованная информация о standalone text-объекте. */
export interface TextObjectInfo extends EditorObjectInfo {
  text: string
  textAlign: TextHorizontalAlign
  fontFamily: string
  fontSize: number
  fontWeight: string
  fontStyle: string
  lineHeight: number
  lineCount: number
  backgroundColor: string | null
  backgroundOpacity: number
  autoExpand: boolean
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  radiusTopLeft: number
  radiusTopRight: number
  radiusBottomRight: number
  radiusBottomLeft: number
}

/** Snapshot standalone text-объекта во время/после horizontal resize. */
export interface TextResizeSnapshot extends TextObjectInfo {
  boundsLeft: number
  boundsTop: number
  boundsWidth: number
  boundsHeight: number
  boundsRight: number
  boundsBottom: number
  leftTopX: number
  leftTopY: number
  leftCenterX: number
  leftCenterY: number
  rightTopX: number
  rightTopY: number
  rightCenterX: number
  rightCenterY: number
  rightBottomX: number
  rightBottomY: number
}

/** Параметры применения inline-стиля к диапазону standalone text. */
export interface TextRangeStyleParams extends ObjectTargetParams {
  start: number
  end: number
  style: TextInlineStyle
}

/** Параметры установки угла поворота standalone text. */
export interface TextRotateParams extends ObjectTargetParams {
  angle: number
}

/** Параметры одного live-шагa horizontal resize standalone text. */
export interface TextResizeStepParams extends ObjectTargetParams {
  width: number
  corner: 'ml' | 'mr'
  originX: TextResizeOriginX
  originY: TextResizeOriginY
}

/** Параметры resize слева для standalone text. */
export interface TextResizeFromLeftParams extends ObjectTargetParams {
  width: number
  originY?: TextResizeOriginY
}

/** Параметры resize справа для standalone text. */
export interface TextResizeFromRightParams extends ObjectTargetParams {
  width: number
  originY?: TextResizeOriginY
}

/** Параметры применения text-only template через standalone text-модель. */
export interface TextTemplateApplyParams {
  template: TemplateDefinition
}
