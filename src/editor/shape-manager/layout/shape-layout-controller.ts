import {
  DEFAULT_SHAPE_PRESET_KEY,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN,
  getShapePreset,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset
} from '../domain/shape-presets'
import {
  applyShapeTextLayout,
  resolveShapeTextAutoExpandWidthForText
} from './shape-layout'
import {
  normalizeShapeUserPadding,
  resolveShapeTextContentInset,
  sumShapePadding
} from './shape-padding'
import type { ObjectPlacement } from '../../canvas-manager'
import type { ImageEditor } from '../../index'
import type {
  ShapeGroupLike,
  ShapeDimensions,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapePaddingChangeMap,
  ShapeTextWrapPolicy,
  ShapeTextNode,
  ShapeTextStyleOptions,
  ShapeVerticalAlign
} from '../types'

/**
 * Contains pure ShapeManager layout logic: dimensions, padding, and final placement.
 */
export default class ShapeLayoutController {
  /**
   * Editor runtime required to access canvasManager and the artboard.
   */
  private readonly editor: ImageEditor

  /**
   * Initializes the layout controller with editor-level layout runtime dependencies.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Fits dimensions into the target box, preserving the preset's aspect ratio.
   */
  public resolveAspectRatioFittedDimensions({
    targetWidth,
    targetHeight,
    aspectWidth,
    aspectHeight
  }: {
    targetWidth?: number
    targetHeight?: number
    aspectWidth: number
    aspectHeight: number
  }): ShapeDimensions {
    const safeAspectWidth = Math.max(1, aspectWidth)
    const safeAspectHeight = Math.max(1, aspectHeight)
    const safeTargetWidth = targetWidth !== undefined
      ? Math.max(1, targetWidth)
      : undefined
    const safeTargetHeight = targetHeight !== undefined
      ? Math.max(1, targetHeight)
      : undefined

    if (safeTargetWidth !== undefined && safeTargetHeight === undefined) {
      const scale = safeTargetWidth / safeAspectWidth

      return {
        width: safeTargetWidth,
        height: safeAspectHeight * scale
      }
    }

    if (safeTargetWidth === undefined && safeTargetHeight !== undefined) {
      const scale = safeTargetHeight / safeAspectHeight

      return {
        width: safeAspectWidth * scale,
        height: safeTargetHeight
      }
    }

    if (safeTargetWidth === undefined || safeTargetHeight === undefined) {
      return {
        width: safeAspectWidth,
        height: safeAspectHeight
      }
    }

    const scale = Math.min(
      safeTargetWidth / safeAspectWidth,
      safeTargetHeight / safeAspectHeight
    )

    return {
      width: safeAspectWidth * scale,
      height: safeAspectHeight * scale
    }
  }

  /**
   * Returns the group's current visual dimensions, accounting for transient scale.
   */
  public resolveCurrentDimensions({
    group
  }: {
    group: ShapeGroupLike
  }): ShapeDimensions {
    const width = Math.max(
      1,
      (group.shapeBaseWidth ?? group.width ?? 1) * (Math.abs(group.scaleX ?? 1) || 1)
    )
    const height = Math.max(
      1,
      (group.shapeBaseHeight ?? group.height ?? 1) * (Math.abs(group.scaleY ?? 1) || 1)
    )

    return {
      width,
      height
    }
  }

  /**
   * Returns the manual base dimensions used by the update/layout contract.
   */
  public resolveManualDimensions({
    group
  }: {
    group: ShapeGroupLike
  }): ShapeDimensions {
    const width = Math.max(
      1,
      group.shapeManualBaseWidth ?? group.shapeBaseWidth ?? group.width ?? 1
    )
    const height = Math.max(
      1,
      group.shapeManualBaseHeight ?? group.shapeBaseHeight ?? group.height ?? 1
    )

    return {
      width,
      height
    }
  }

  /**
   * Returns the stable replacement box used when replacing the preset.
   */
  public resolveReplaceBoxDimensions({
    group
  }: {
    group: ShapeGroupLike
  }): ShapeDimensions {
    const currentDimensions = this.resolveCurrentDimensions({ group })

    return {
      width: Math.max(1, group.shapeReplaceBoxWidth ?? currentDimensions.width),
      height: Math.max(1, group.shapeReplaceBoxHeight ?? currentDimensions.height)
    }
  }

  /**
   * Returns the user-defined padding values for the shape's text area.
   */
  public resolveGroupUserPadding({
    group
  }: {
    group: ShapeGroupLike
  }): ShapePadding {
    return normalizeShapeUserPadding({
      padding: {
        top: group.shapePaddingTop,
        right: group.shapePaddingRight,
        bottom: group.shapePaddingBottom,
        left: group.shapePaddingLeft
      }
    })
  }

  /**
   * Returns the full inner text inset for the group's current dimensions.
   */
  public resolveGroupInternalShapeTextInset({
    group,
    width,
    height
  }: {
    group: ShapeGroupLike
    width: number
    height: number
  }): ShapePadding {
    const preset = getShapePreset({
      presetKey: group.shapePresetKey ?? DEFAULT_SHAPE_PRESET_KEY
    })
    const presetInset = preset
      ? resolvePresetInternalShapeTextInset({
        preset,
        width,
        height
      })
      : undefined

    return resolveShapeTextContentInset({
      baseInset: presetInset,
      stroke: group.shapeStroke,
      strokeWidth: group.shapeStrokeWidth
    })
  }

  /**
   * Checks whether the group's text auto-expansion mode is enabled.
   */
  public isShapeTextAutoExpandEnabled({
    group
  }: {
    group: ShapeGroupLike
  }): boolean {
    return group.shapeTextAutoExpand !== false
  }

  /**
   * Returns the artboard width in scene coordinates.
   */
  public resolveMontageAreaWidth(): number | null {
    const { canvasManager, montageArea } = this.editor

    if (!montageArea) return null

    const { width: montageWidth } = canvasManager.getMontageAreaSceneBounds()

    if (!Number.isFinite(montageWidth) || montageWidth <= 0) {
      return null
    }

    return montageWidth
  }

  /**
   * Returns the final layout width, accounting for the manual base and auto-expansion mode.
   */
  public resolveShapeLayoutWidth({
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
  }): number {
    if (!shapeTextAutoExpandEnabled) {
      return Math.max(1, manualWidth)
    }

    return this._resolveAutoExpandShapeWidth({
      text,
      currentWidth,
      minimumWidth: manualWidth,
      padding,
      resolvePaddingForWidth
    })
  }

  /**
   * Returns the current horizontal text alignment within the shape.
   */
  public resolveShapeTextHorizontalAlign({
    group,
    textStyle
  }: {
    group: ShapeGroupLike
    textStyle?: ShapeTextStyleOptions
  }): ShapeHorizontalAlign {
    const align = textStyle?.align

    if (align === 'left' || align === 'center' || align === 'right' || align === 'justify') {
      return align
    }

    return group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
  }

  /**
   * Applies the final shape and text layout under the current placement contract.
   */
  public applyCurrentLayout({
    group,
    shape,
    text,
    placement,
    width,
    height,
    alignH,
    alignV,
    internalShapeTextInset,
    resolveInternalShapeTextInset,
    wrapPolicy,
    preserveAspectRatio,
    expandShapeHeightToFitText = true,
    changedPadding
  }: {
    group: ShapeGroupLike
    shape: ShapeNode
    text: ShapeTextNode
    placement?: ObjectPlacement
    width?: number
    height?: number
    alignH?: ShapeHorizontalAlign
    alignV?: ShapeVerticalAlign
    internalShapeTextInset?: ShapePadding
    resolveInternalShapeTextInset?: (dimensions: {
      width: number
      height: number
    }) => ShapePadding
    wrapPolicy?: ShapeTextWrapPolicy
    preserveAspectRatio?: boolean
    expandShapeHeightToFitText?: boolean
    changedPadding?: ShapePaddingChangeMap
  }): void {
    const currentDimensions = this.resolveCurrentDimensions({ group })
    const manualDimensions = this.resolveManualDimensions({ group })
    const userPadding = this.resolveGroupUserPadding({ group })
    const shapeTextAutoExpandEnabled = this.isShapeTextAutoExpandEnabled({ group })
    const resolveCurrentInset = resolveInternalShapeTextInset
      ?? (({ width: nextWidth, height: nextHeight }: {
        width: number
        height: number
      }) => internalShapeTextInset ?? this.resolveGroupInternalShapeTextInset({
        group,
        width: nextWidth,
        height: nextHeight
      }))
    let resolvedWidth = currentDimensions.width

    if (width !== undefined) {
      resolvedWidth = Math.max(1, width)
    } else {
      const resolvedAutoExpandHeight = Math.max(1, height ?? currentDimensions.height)

      resolvedWidth = this.resolveShapeLayoutWidth({
        text,
        currentWidth: currentDimensions.width,
        manualWidth: manualDimensions.width,
        shapeTextAutoExpandEnabled,
        padding: sumShapePadding({
          base: resolveCurrentInset({
            width: resolvedWidth,
            height: resolvedAutoExpandHeight
          }),
          addition: userPadding
        }),
        resolvePaddingForWidth: ({ width: nextWidth }) => sumShapePadding({
          base: resolveCurrentInset({
            width: nextWidth,
            height: resolvedAutoExpandHeight
          }),
          addition: userPadding
        })
      })
    }

    const resolvedHeight = Math.max(1, height ?? currentDimensions.height)
    const resolvedInset = resolveCurrentInset({
      width: resolvedWidth,
      height: resolvedHeight
    })
    const stablePlacement = placement ?? this.editor.canvasManager.getObjectPlacement({
      object: group
    })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: resolvedWidth,
      height: resolvedHeight,
      alignH: alignH ?? group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
      alignV: alignV ?? group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
      padding: userPadding,
      wrapPolicy,
      shapeTextAutoExpandEnabled,
      internalShapeTextInset: resolvedInset,
      resolveInternalShapeTextInset: resolveCurrentInset,
      preserveAspectRatio,
      montageAreaWidth: preserveAspectRatio
        ? this.resolveMontageAreaWidth()
        : undefined,
      expandShapeHeightToFitText,
      changedPadding
    })

    this.editor.canvasManager.applyObjectPlacement({
      object: group,
      placement: stablePlacement
    })
  }

  /**
   * Calculates the auto-expansion width, limited by the artboard.
   */
  private _resolveAutoExpandShapeWidth({
    text,
    currentWidth,
    minimumWidth,
    padding,
    resolvePaddingForWidth
  }: {
    text: ShapeTextNode
    currentWidth: number
    minimumWidth: number
    padding: ShapePadding
    resolvePaddingForWidth?: ({ width }: { width: number }) => ShapePadding
  }): number {
    const montageAreaWidth = this.resolveMontageAreaWidth()

    if (!montageAreaWidth) {
      return Math.max(1, currentWidth, minimumWidth)
    }

    return resolveShapeTextAutoExpandWidthForText({
      text,
      currentWidth,
      minimumWidth,
      padding,
      montageAreaWidth,
      resolvePaddingForWidth
    })
  }
}
