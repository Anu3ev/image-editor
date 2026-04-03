import type {
  EditorObjectInfo,
  ObjectTargetParams,
  TemplateDefinition
} from './editor.types'

export type TextHorizontalAlign = 'left' | 'center' | 'right'
export type TextPlacementOriginX = 'left' | 'center' | 'right'
export type TextPlacementOriginY = 'top' | 'center' | 'bottom'
export type TextResizeOriginX = 'left' | 'right'
export type TextResizeOriginY = 'top' | 'center' | 'bottom'

/** Параметры стилизации отдельного текстового объекта. */
export interface TextStyleParams {
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
  align?: TextHorizontalAlign
  backgroundColor?: string
  backgroundOpacity?: number
  lineHeight?: number
  autoExpand?: boolean
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  radiusTopLeft?: number
  radiusTopRight?: number
  radiusBottomRight?: number
  radiusBottomLeft?: number
}

/** Параметры добавления текстового объекта через e2e-модель. */
export interface TextAddParams extends TextStyleParams {
  id?: string
  left?: number
  top?: number
  originX?: TextPlacementOriginX
  originY?: TextPlacementOriginY
  width?: number
  angle?: number
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
  underline: boolean
  linethrough: boolean
  uppercase: boolean
  lineHeight: number
  lineCount: number
  isEditing: boolean
  evented: boolean
  lockMovementX: boolean
  lockMovementY: boolean
  selectionStart: number
  selectionEnd: number
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
  textAreaLeftTopX: number
  textAreaLeftTopY: number
}

/** Параметры обновления стиля текстового объекта через TextManager. */
export interface TextUpdateStyleParams extends ObjectTargetParams {
  style: TextStyleParams
}

/** Параметры применения inline-стиля к диапазону standalone text. */
export interface TextRangeStyleParams extends ObjectTargetParams {
  start: number
  end: number
  style: TextInlineStyle
}

/** Параметры выделения диапазона в режиме редактирования текста. */
export interface TextSelectionParams extends ObjectTargetParams {
  start: number
  end: number
}

/** Сериализованный стиль выделенного диапазона текстового объекта. */
export interface TextSelectionStyleInfo {
  fill: string | null
  stroke: string | null
  strokeWidth: number | null
  fontSize: number | null
  fontWeight: string | null
  fontStyle: string | null
  underline: boolean | null
  linethrough: boolean | null
}

/** Параметры установки угла поворота standalone text. */
export interface TextRotateParams extends ObjectTargetParams {
  angle: number
}

/** Параметры изменения текста в режиме редактирования. */
export interface TextEditingUpdateParams extends ObjectTargetParams {
  text: string
}

/** Параметры одного live-шагa horizontal resize standalone text. */
export interface TextResizeStepParams extends ObjectTargetParams {
  width: number
  corner: 'ml' | 'mr'
  originX: TextResizeOriginX
  originY: TextResizeOriginY
  ctrlKey?: boolean
}

/** Параметры resize слева для standalone text. */
export interface TextResizeFromLeftParams extends ObjectTargetParams {
  width: number
  originY?: TextResizeOriginY
  ctrlKey?: boolean
}

/** Параметры resize справа для standalone text. */
export interface TextResizeFromRightParams extends ObjectTargetParams {
  width: number
  originY?: TextResizeOriginY
  ctrlKey?: boolean
}

/** Параметры сужения standalone text до переноса текста на новую строку. */
export interface TextResizeUntilWrapParams extends ObjectTargetParams {
  originY?: TextResizeOriginY
  ctrlKey?: boolean
}

/** Параметры применения text-only template через standalone text-модель. */
export interface TextTemplateApplyParams {
  template: TemplateDefinition
}
