import type { ObjectPlacement } from '../../canvas-manager'
import type ShapeLifecycleController from '../lifecycle/shape-lifecycle-controller'
import type { TextStyleOptions } from '../../text-manager'
import type {
  ShapeGroup,
  ShapeGroupLike,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapePaddingChangeMap,
  ShapeReference,
  ShapeTextNode,
  ShapeTextStyleOptions,
  ShapeUpdateOptions,
  ShapeVerticalAlign,
  ShapeVisualStyle
} from '../types'
import type { ImageEditor } from '../../index'

/**
 * Пара визуальных размеров shape-группы в текущем mutation/layout контракте.
 */
export type ShapeGroupDimensions = {
  width: number
  height: number
}

/**
 * Функция, которая возвращает внутренний text inset для заданных размеров фигуры.
 */
export type ShapeInsetResolver = ({
  width,
  height
}: {
  width: number
  height: number
}) => ShapePadding

/**
 * Runtime-зависимости mutation controller без прямого владения ShapeManager internals.
 */
export type ShapeMutationRuntime = {
  editor: ImageEditor
  lifecycleController: ShapeLifecycleController
  editingPlacements: WeakMap<ShapeGroup, ObjectPlacement>
  resolveShapeGroup: ({ target }: { target?: ShapeReference }) => ShapeGroup | null
  resolveCurrentDimensions: ({ group }: { group: ShapeGroupLike }) => ShapeGroupDimensions
  resolveManualDimensions: ({ group }: { group: ShapeGroupLike }) => ShapeGroupDimensions
  resolveReplaceBoxDimensions: ({ group }: { group: ShapeGroupLike }) => ShapeGroupDimensions
  resolveGroupUserPadding: ({ group }: { group: ShapeGroupLike }) => ShapePadding
  isShapeTextAutoExpandEnabled: ({ group }: { group: ShapeGroupLike }) => boolean
  resolveShapeStyle: ({
    options,
    fallback
  }: {
    options: Pick<
      ShapeUpdateOptions,
      'fill' | 'stroke' | 'strokeWidth' | 'strokeDashArray' | 'opacity'
    >
    fallback: ShapeGroupLike | null
  }) => ShapeVisualStyle
  resolveCurrentTextStyle: ({ textNode }: { textNode: ShapeTextNode }) => TextStyleOptions
  createTextNode: ({
    text,
    textStyle,
    width,
    align
  }: {
    text?: string
    textStyle?: ShapeTextStyleOptions
    width: number
    align: ShapeHorizontalAlign
  }) => ShapeTextNode
  applyTextUpdates: ({
    textNode,
    text,
    textStyle,
    align,
    syncLineStylesWithText
  }: {
    textNode: ShapeTextNode
    text?: string
    textStyle?: ShapeTextStyleOptions
    align?: ShapeHorizontalAlign
    syncLineStylesWithText?: boolean
  }) => void
  hasShapeTextSizeAffectingStyleChanges: ({ textStyle }: { textStyle?: ShapeTextStyleOptions }) => boolean
  resolveShapeLayoutWidth: ({
    text,
    currentWidth,
    manualWidth,
    shapeTextAutoExpandEnabled,
    padding,
    resolvePaddingForWidth
  }: {
    text: ShapeTextNode
    currentWidth: number
    manualWidth: number
    shapeTextAutoExpandEnabled: boolean
    padding: ShapePadding
    resolvePaddingForWidth?: ({ width }: { width: number }) => ShapePadding
  }) => number
  resolveAspectRatioFittedDimensions: ({
    targetWidth,
    targetHeight,
    aspectWidth,
    aspectHeight
  }: {
    targetWidth?: number
    targetHeight?: number
    aspectWidth: number
    aspectHeight: number
  }) => ShapeGroupDimensions
  applyShapeGroupMetadata: (params: {
    group: ShapeGroupLike
    presetKey: string
    presetCanRound: boolean
    width: number
    height: number
    manualWidth: number
    manualHeight: number
    replaceBoxWidth: number
    replaceBoxHeight: number
    shapeTextAutoExpand: boolean
    alignH: ShapeHorizontalAlign
    alignV: ShapeVerticalAlign
    padding: ShapePadding
    style: ShapeVisualStyle
    rounding: number
  }) => void
  applyCurrentLayout: (params: {
    group: ShapeGroupLike
    shape: ShapeNode
    text: ShapeTextNode
    width?: number
    height: number
    placement?: ObjectPlacement
    alignH?: ShapeHorizontalAlign
    alignV?: ShapeVerticalAlign
    internalShapeTextInset?: ShapePadding
    resolveInternalShapeTextInset?: ShapeInsetResolver
    preserveAspectRatio?: boolean
    expandShapeHeightToFitText?: boolean
    changedPadding?: ShapePaddingChangeMap
  }) => void
  resolveShapeTextHorizontalAlign: ({
    group,
    textStyle
  }: {
    group: ShapeGroupLike
    textStyle?: ShapeTextStyleOptions
  }) => ShapeHorizontalAlign
  detachShapeGroupAutoLayout: ({ group }: { group: ShapeGroupLike }) => void
  beginMutation: () => void
  endMutation: ({ withoutSave }: { withoutSave?: boolean }) => void
  isOnCanvas: ({ object }: { object: ShapeGroup }) => boolean
}
