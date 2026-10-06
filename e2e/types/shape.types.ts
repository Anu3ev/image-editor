import type { EditorObjectInfo, ObjectTargetParams } from './editor.types'

/** Available shape-preset keys */
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

/** User-defined text padding inside a shape. */
export interface ShapePaddingParams {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

/** Options for styling text inside a shape */
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

/** Options for selecting a text range inside a shape in editing mode */
export interface ShapeTextSelectionParams {
  start: number
  end: number
}

/** Options for changing text inside a shape in editing mode */
export interface ShapeTextEditingUpdateParams extends ObjectTargetParams {
  text: string
  selectionEnd?: number
  selectionStart?: number
}

/** Serialized style of the selected text range inside a shape */
export interface ShapeTextSelectionStyleInfo {
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

/** Options for adding a shape through the model (subset of ShapeAddOptions) */
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
    withoutSelection?: boolean
  }
}

/** Options for adding a shape by bounding-box bounds rather than object center. */
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
    withoutSelection?: boolean
  }
}

/** Shape-stroke options */
export interface ShapeStrokeParams {
  stroke?: string | null
  strokeWidth?: number
  dash?: number[] | null
}

/** Options for updating a shape through the model (subset of ShapeUpdateOptions) */
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
    syncLineStylesWithText?: boolean
  }
}

/** Options for text alignment inside a shape */
export interface ShapeTextAlignParams {
  horizontal?: ShapeHorizontalAlign
  vertical?: ShapeVerticalAlign
}

/** Serialized information about the text node inside a shape */
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
  lines: string[]
  lineCount: number
  selectionStart: number
  selectionEnd: number
  splitByGrapheme: boolean
}

/** IDs of the shape group and its internal objects. */
export interface ShapeObjectTreeIds {
  groupId: string | null
  shapeId: string | null
  textId: string | null
}

/** Options for one interactive-scaling step */
export interface ShapeScaleStepParams extends ObjectTargetParams {
  scaleX: number
  scaleY: number
  corner?: ShapeScaleCorner
  originX?: ShapeScaleOriginX
  originY?: ShapeScaleOriginY
  shiftKey?: boolean
  ctrlKey?: boolean
}

/** Options for a live scaling step with synthetic mouse:move relative to the active transform. */
export interface ShapeScaleMouseMoveStepParams extends ShapeScaleStepParams {
  pointerX: number
  pointerY: number
  action?: 'scaleX' | 'scaleY'
  signX?: number
  signY?: number
}

/** Snapshot of shape-group state during/after scaling */
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

/** Extended shape-group information */
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
  shapeReplaceBoxWidth: number
  shapeReplaceBoxHeight: number
  shapeFill?: string
  shapeStroke?: string | null
  shapeStrokeWidth?: number
  shapeOpacity?: number
  shapeRounding?: number
}
