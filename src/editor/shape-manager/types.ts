import type { FabricObject, Group } from 'fabric'
import type { TextStyleOptions } from '../text-manager'
import type { EditorTextbox, TextboxSnapshot } from '../text-manager/types'

export type ShapePresetType = 'rect' | 'path' | 'polygon' | 'polyline' | 'svg' | 'ellipse' | 'triangle'

export type ShapeHorizontalAlign = 'left' | 'center' | 'right' | 'justify'

export type ShapeVerticalAlign = 'top' | 'middle' | 'bottom'

export type ShapeNodeType = 'shape' | 'text'

export type ShapeTransformOriginX = 'left' | 'center' | 'right' | number

export type ShapeTransformOriginY = 'top' | 'center' | 'bottom' | number

export type ShapePlacementOriginX = Group['originX']

export type ShapePlacementOriginY = Group['originY']

export type ShapePoint = {
  x: number
  y: number
}

export type ShapePadding = {
  top: number
  right: number
  bottom: number
  left: number
}

export type ShapePaddingRatio = {
  top: number
  right: number
  bottom: number
  left: number
}

export type ShapePaddingChangeMap = Partial<Record<keyof ShapePadding, boolean>>

export type ShapeVisualStyle = {
  fill?: string
  stroke?: string | null
  strokeWidth?: number
  strokeDashArray?: number[] | null
  opacity?: number
}

/**
 * Публичные текстовые стили shape-группы.
 * Режим shapeTextAutoExpand управляется только на уровне shape API.
 */
export type ShapeTextStyleOptions = Omit<TextStyleOptions, 'autoExpand'>

export type ShapePresetBase = {
  key: string
  type: ShapePresetType
  width: number
  height: number
  title?: string
  internalTextInset?: Partial<ShapePaddingRatio>
  roundedVariant?: string
}

export type RectShapePreset = ShapePresetBase & {
  type: 'rect'
}

export type PathShapePreset = ShapePresetBase & {
  type: 'path'
  path: string
}

export type PolygonShapePreset = ShapePresetBase & {
  type: 'polygon'
  points: ShapePoint[]
}

export type PolylineShapePreset = ShapePresetBase & {
  type: 'polyline'
  points: ShapePoint[]
}

export type SvgShapePreset = ShapePresetBase & {
  type: 'svg'
  svg: string
}

export type EllipseShapePreset = ShapePresetBase & {
  type: 'ellipse'
}

export type TriangleShapePreset = ShapePresetBase & {
  type: 'triangle'
}

export type ShapePreset =
  | RectShapePreset
  | PathShapePreset
  | PolygonShapePreset
  | PolylineShapePreset
  | SvgShapePreset
  | EllipseShapePreset
  | TriangleShapePreset

export type ShapeNode = FabricObject & {
  shapeNodeType?: ShapeNodeType
}

export type ShapeTextNode = EditorTextbox & {
  shapeNodeType?: ShapeNodeType
}

export type ShapeGroupMetadata = {
  shapeComposite: boolean
  shapePresetKey: string
  shapeBaseWidth: number
  shapeBaseHeight: number
  shapeManualBaseWidth: number
  shapeManualBaseHeight: number
  shapeReplaceBoxWidth: number
  shapeReplaceBoxHeight: number
  shapeTextAutoExpand: boolean
  shapeAlignHorizontal: ShapeHorizontalAlign
  shapeAlignVertical: ShapeVerticalAlign
  shapePaddingTop: number
  shapePaddingRight: number
  shapePaddingBottom: number
  shapePaddingLeft: number
  shapeFill?: string
  shapeStroke?: string | null
  shapeStrokeWidth?: number
  shapeStrokeDashArray?: number[] | null
  shapeOpacity?: number
  shapeRounding?: number
  shapeCanRound?: boolean
  shapeScalingNoopTransform?: boolean
}

export type ShapeGroup = Group & Partial<ShapeGroupMetadata>

export type ShapeGroupLike = ShapeGroup

export type ShapeReference = ShapeGroup | FabricObject | string | null | undefined

export type ShapeCreationFlags = {
  withoutSelection?: boolean
  withoutAdding?: boolean
  withoutSave?: boolean
}

export type ShapeAddOptions = ShapeVisualStyle & ShapeCreationFlags & {
  id?: string
  left?: number
  top?: number
  originX?: ShapePlacementOriginX
  originY?: ShapePlacementOriginY
  width?: number
  height?: number
  shapeTextAutoExpand?: boolean
  text?: string
  textStyle?: ShapeTextStyleOptions
  alignH?: ShapeHorizontalAlign
  alignV?: ShapeVerticalAlign
  rounding?: number
  textPadding?: Partial<ShapePadding>
}

export type ShapeUpdateOptions = ShapeVisualStyle & {
  left?: number
  top?: number
  originX?: ShapePlacementOriginX
  originY?: ShapePlacementOriginY
  width?: number
  height?: number
  preserveCurrentAspectRatio?: boolean
  shapeTextAutoExpand?: boolean
  text?: string
  textStyle?: ShapeTextStyleOptions
  alignH?: ShapeHorizontalAlign
  alignV?: ShapeVerticalAlign
  rounding?: number
  textPadding?: Partial<ShapePadding>
  withoutSelection?: boolean
  withoutSave?: boolean
}

export type ShapeSnapshot = {
  id?: string
  presetKey?: string
  baseWidth?: number
  baseHeight?: number
  manualBaseWidth?: number
  manualBaseHeight?: number
  currentWidth?: number
  currentHeight?: number
  shapeTextAutoExpand: boolean
  alignH: ShapeHorizontalAlign
  alignV: ShapeVerticalAlign
  padding: ShapePadding
  fill?: string
  stroke?: string | null
  strokeWidth?: number
  strokeDashArray?: number[] | null
  opacity?: number
  rounding?: number
  left?: number
  top?: number
  originX?: ShapePlacementOriginX
  originY?: ShapePlacementOriginY
  angle?: number
  flipX?: boolean
  flipY?: boolean
  scaleX?: number
  scaleY?: number
  text?: TextboxSnapshot
}

export type ShapeAddedPayload = {
  shape: ShapeGroup
  presetKey: string
  options: ShapeAddOptions
}

export type ShapeUpdateSource =
  | 'update'
  | 'fill'
  | 'stroke'
  | 'opacity'
  | 'text-style'
  | 'text-align'
  | 'text-edit'
  | 'text-update'
  | 'resize'

/**
 * Общая часть payload editor-level событий перед и после обновления shape-композиции.
 * Контракт покрывает все shape-level update path, а не только публичный `update()`.
 */
export type ShapeUpdateLifecyclePayload = {
  shape: ShapeGroup
  source: ShapeUpdateSource
  target?: ShapeReference
  presetKey?: string
  options?: ShapeUpdateOptions
  withoutSave?: boolean
}

export type BeforeShapeUpdatedPayload = ShapeUpdateLifecyclePayload

export type ShapeUpdateLifecycleContext = {
  before: ShapeSnapshot
  payload: BeforeShapeUpdatedPayload
}

export type ShapeUpdatedPayload = ShapeUpdateLifecyclePayload & {
  before: ShapeSnapshot
  after: ShapeSnapshot
}

export type ShapeStrokeOptions = {
  stroke?: string | null
  strokeWidth?: number
  dash?: number[] | null
  withoutSave?: boolean
}

export type ShapeTextAlignOptions = {
  horizontal?: ShapeHorizontalAlign
  vertical?: ShapeVerticalAlign
  withoutSave?: boolean
}

export type ShapeFactoryInput = {
  preset: ShapePreset
  width: number
  height: number
  style: ShapeVisualStyle
  rounding?: number
}

export type ShapeLayoutInput = {
  group: ShapeGroupLike
  shape: ShapeNode
  text: ShapeTextNode
  width: number
  height: number
  alignH: ShapeHorizontalAlign
  alignV: ShapeVerticalAlign
  padding: ShapePadding
  internalShapeTextInset?: ShapePadding
  resolveInternalShapeTextInset?: ({ width, height }: {
    width: number
    height: number
  }) => ShapePadding
  preserveAspectRatio?: boolean
  montageAreaWidth?: number | null
  expandShapeHeightToFitText?: boolean
  changedPadding?: ShapePaddingChangeMap
}

export type ShapeScalingState = {
  startWidth: number
  startHeight: number
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
  baseRounding: number
  cannotScaleDownAtStart: boolean
  isProportionalScaling: boolean
  blockedScaleAttempt: boolean
  startLeft: number
  startTop: number
  startScaleX: number
  startScaleY: number
  startTransformOriginX: ShapeTransformOriginX | null
  startTransformOriginY: ShapeTransformOriginY | null
  startTransformCorner: string | null
  scalingAnchorX: number | null
  scalingAnchorY: number | null
  scalingAnchorOriginX: ShapeTransformOriginX | null
  scalingAnchorOriginY: ShapeTransformOriginY | null
  crossedOppositeCorner: boolean
  lastAllowedFlipX: boolean
  lastAllowedFlipY: boolean
  lastAllowedScaleX: number
  lastAllowedScaleY: number
  lastAllowedLeft: number
  lastAllowedTop: number
}

export type ShapeEditingOptions = {
  canvas: import('fabric').Canvas
}
