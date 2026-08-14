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
export type TextScaleHandleCorner = 'tl' | 'tr' | 'bl' | 'br' | 'mb' | 'mr'

/** Угловые ручки пропорционального скейлинга отдельного текста. */
export type TextCornerScaleHandle = Extract<TextScaleHandleCorner, 'tl' | 'tr' | 'bl' | 'br'>

/** Одно движение указателя при настоящем перетаскивании ручки скейлинга отдельного текста. */
export interface TextScaleDragStep {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Браузерный сценарий сужения отдельного текста за конкретный угол. */
export interface TextScaleHandleCase {
  title: string
  corner: TextCornerScaleHandle
  steps: TextScaleDragStep[]
}

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
  left?: number
  top?: number
  originX?: TextPlacementOriginX
  originY?: TextPlacementOriginY
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

/** Исходные стили строк отдельного текста. */
export type TextLineDefaults = Record<number, TextInlineStyle>

/** Сериализованное состояние отдельного текста. */
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

/** Состояние отдельного текста во время или после изменения ширины. */
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

/** Состояние текста со всеми углами, необходимыми для проверки углового скейлинга. */
export interface TextCornerScaleSnapshot extends TextResizeSnapshot {
  leftBottomX: number
  leftBottomY: number
}

/** Диапазон текста для выделения или частичного обновления стиля. */
export interface TextSelectionRange {
  start: number
  end: number
}

/** Параметры обновления стиля текстового объекта через TextManager. */
export interface TextUpdateStyleParams extends ObjectTargetParams {
  style: TextStyleParams
  selectionRange?: TextSelectionRange
  syncLineStylesWithText?: boolean
}

/** Параметры применения посимвольного стиля к диапазону отдельного текста. */
export interface TextRangeStyleParams extends ObjectTargetParams {
  start: number
  end: number
  style: TextInlineStyle
}

/** Параметры выделения диапазона в режиме редактирования текста. */
export interface TextSelectionParams extends ObjectTargetParams, TextSelectionRange {}

/** Сериализованный стиль выделенного диапазона текстового объекта. */
export interface TextSelectionStyleInfo {
  fill: string | null
  fontFamily: string | null
  stroke: string | null
  strokeWidth: number | null
  fontSize: number | null
  fontWeight: string | null
  fontStyle: string | null
  underline: boolean | null
  linethrough: boolean | null
}

/** Параметры установки угла поворота отдельного текста. */
export interface TextRotateParams extends ObjectTargetParams {
  angle: number
}

/** Параметры изменения текста в режиме редактирования. */
export interface TextEditingUpdateParams extends ObjectTargetParams {
  text: string
  selectionEnd?: number
  selectionStart?: number
}

/** Параметры одного движения боковой ручки отдельного текста. */
export interface TextResizeStepParams extends ObjectTargetParams {
  width: number
  corner: 'ml' | 'mr'
  originX: TextResizeOriginX
  originY: TextResizeOriginY
  centered?: boolean
  ctrlKey?: boolean
}

/** Параметры следующего движения уже захваченной боковой ручки. */
export interface TextResizeContinueParams {
  deltaX: number
  deltaY: number
  ctrlKey?: boolean
  pointerSteps?: number
}

/** Сторона отдельного текста, ширина которого меняется боковой ручкой. */
export type TextResizeSide = 'left' | 'right'

/** Ось направляющей, к которой подводится видимая грань текста. */
export type TextResizeGuideAxis = 'x' | 'y'

/** Параметры подвода боковой ручки к направляющей в координатах сцены. */
export interface TextResizeToGuideParams extends ObjectTargetParams {
  axis: TextResizeGuideAxis
  centered?: boolean
  position: number
  side: TextResizeSide
}

/** Параметры изменения ширины отдельного текста слева. */
export interface TextResizeFromLeftParams extends ObjectTargetParams {
  width: number
  centered?: boolean
  ctrlKey?: boolean
}

/** Параметры изменения ширины отдельного текста справа. */
export interface TextResizeFromRightParams extends ObjectTargetParams {
  width: number
  centered?: boolean
  ctrlKey?: boolean
}

/** Параметры сужения отдельного текста до появления новой строки. */
export interface TextResizeUntilWrapParams extends ObjectTargetParams {
  ctrlKey?: boolean
}

/** Параметры применения шаблона, содержащего только отдельный текст. */
export interface TextTemplateApplyParams {
  template: TemplateDefinition
}
