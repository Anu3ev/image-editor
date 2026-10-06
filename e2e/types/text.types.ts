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

/** Corner handles for proportional standalone-text scaling. */
export type TextCornerScaleHandle = Extract<TextScaleHandleCorner, 'tl' | 'tr' | 'bl' | 'br'>

/** One pointer movement during a real standalone-text scaling-handle drag. */
export interface TextScaleDragStep {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Browser scenario for narrowing standalone text from a specific corner. */
export interface TextScaleHandleCase {
  title: string
  corner: TextCornerScaleHandle
  steps: TextScaleDragStep[]
}

/** Standalone text-object styling options. */
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

/** Options for adding a text object through the e2e model. */
export interface TextAddParams extends TextStyleParams {
  id?: string
  left?: number
  top?: number
  originX?: TextPlacementOriginX
  originY?: TextPlacementOriginY
  width?: number
  angle?: number
}

/** Partial inline text style for a range or line defaults. */
export interface TextInlineStyle {
  fill?: string
  fontFamily?: string
  fontSize?: number
  fontStyle?: string
  fontWeight?: string
}

/** Initial line styles of standalone text. */
export type TextLineDefaults = Record<number, TextInlineStyle>

/** Serialized standalone-text state. */
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

/** Standalone-text state during or after a width change. */
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

/** Text state with all corners needed to test corner scaling. */
export interface TextCornerScaleSnapshot extends TextResizeSnapshot {
  leftBottomX: number
  leftBottomY: number
}

/** Text range for selection or partial style updates. */
export interface TextSelectionRange {
  start: number
  end: number
}

/** Options for updating text-object style through TextManager. */
export interface TextUpdateStyleParams extends ObjectTargetParams {
  style: TextStyleParams
  selectionRange?: TextSelectionRange
  syncLineStylesWithText?: boolean
}

/** Options for applying per-character style to a standalone-text range. */
export interface TextRangeStyleParams extends ObjectTargetParams {
  start: number
  end: number
  style: TextInlineStyle
}

/** Options for selecting a range in text-editing mode. */
export interface TextSelectionParams extends ObjectTargetParams, TextSelectionRange {}

/** Serialized style of a text object's selected range. */
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

/** Options for setting standalone-text rotation angle. */
export interface TextRotateParams extends ObjectTargetParams {
  angle: number
}

/** Options for changing text in editing mode. */
export interface TextEditingUpdateParams extends ObjectTargetParams {
  text: string
  selectionEnd?: number
  selectionStart?: number
}

/** Options for one movement of a standalone-text side handle. */
export interface TextResizeStepParams extends ObjectTargetParams {
  width: number
  corner: 'ml' | 'mr'
  originX: TextResizeOriginX
  originY: TextResizeOriginY
  centered?: boolean
  ctrlKey?: boolean
}

/** Options for the next movement of an already captured side handle. */
export interface TextResizeContinueParams {
  deltaX: number
  deltaY: number
  ctrlKey?: boolean
  pointerSteps?: number
}

/** Side of standalone text whose width is changed by a side handle. */
export type TextResizeSide = 'left' | 'right'

/** Guide axis to which the visible text edge is moved. */
export type TextResizeGuideAxis = 'x' | 'y'

/** Options for bringing a side handle to a guide in scene coordinates. */
export interface TextResizeToGuideParams extends ObjectTargetParams {
  axis: TextResizeGuideAxis
  centered?: boolean
  position: number
  side: TextResizeSide
}

/** Options for changing standalone-text width from the left. */
export interface TextResizeFromLeftParams extends ObjectTargetParams {
  width: number
  centered?: boolean
  ctrlKey?: boolean
}

/** Options for changing standalone-text width from the right. */
export interface TextResizeFromRightParams extends ObjectTargetParams {
  width: number
  centered?: boolean
  ctrlKey?: boolean
}

/** Options for narrowing standalone text until a new line appears. */
export interface TextResizeUntilWrapParams extends ObjectTargetParams {
  ctrlKey?: boolean
}

/** Options for applying a template containing only standalone text. */
export interface TextTemplateApplyParams {
  template: TemplateDefinition
}
