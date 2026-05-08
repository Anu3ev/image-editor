import {
  DEFAULT_SHAPE_PRESET_KEY,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN,
  getShapePreset,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset
} from './shape-presets'
import {
  applyShapeTextLayout,
  resolveShapeTextAutoExpandWidthForText
} from './layout/shape-layout'
import {
  normalizeShapeUserPadding,
  resolveShapeTextContentInset,
  sumShapePadding
} from './layout/shape-padding'
import type { ObjectPlacement } from '../canvas-manager'
import type { ImageEditor } from '../index'
import type {
  ShapeGroupLike,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapePaddingChangeMap,
  ShapeTextNode,
  ShapeTextStyleOptions,
  ShapeVerticalAlign
} from './types'

/**
 * Пара визуальных размеров shape-группы в текущем layout-контракте.
 */
type ShapeGroupDimensions = {
  width: number
  height: number
}

/**
 * Содержит чистую layout-логику ShapeManager: размеры, padding и финальное размещение.
 */
export default class ShapeLayoutController {
  /**
   * Editor runtime нужен для доступа к canvasManager и монтажной области.
   */
  private readonly editor: ImageEditor

  /**
   * Инициализирует layout controller зависимостями editor-level layout runtime.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Вписывает размеры в целевой бокс с сохранением aspect ratio пресета.
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
  }): ShapeGroupDimensions {
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
   * Возвращает текущие визуальные размеры группы с учётом transient scale.
   */
  public resolveCurrentDimensions({
    group
  }: {
    group: ShapeGroupLike
  }): ShapeGroupDimensions {
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
   * Возвращает ручную базу размеров, от которой отталкивается update/layout контракт.
   */
  public resolveManualDimensions({
    group
  }: {
    group: ShapeGroupLike
  }): ShapeGroupDimensions {
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
   * Возвращает стабильный replace-box, который используется при замене пресета.
   */
  public resolveReplaceBoxDimensions({
    group
  }: {
    group: ShapeGroupLike
  }): ShapeGroupDimensions {
    const currentDimensions = this.resolveCurrentDimensions({ group })

    return {
      width: Math.max(1, group.shapeReplaceBoxWidth ?? currentDimensions.width),
      height: Math.max(1, group.shapeReplaceBoxHeight ?? currentDimensions.height)
    }
  }

  /**
   * Возвращает пользовательские padding-значения текстовой области фигуры.
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
   * Возвращает полный внутренний inset текста для текущих размеров группы.
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
   * Проверяет включён ли у группы режим авторасширения по тексту.
   */
  public isShapeTextAutoExpandEnabled({
    group
  }: {
    group: ShapeGroupLike
  }): boolean {
    return group.shapeTextAutoExpand !== false
  }

  /**
   * Возвращает ширину монтажной области в scene coordinates.
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
   * Возвращает финальную ширину layout с учётом manual base и auto-expand режима.
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
   * Возвращает актуальное горизонтальное выравнивание текста внутри фигуры.
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
   * Применяет финальный layout фигуры и текста в текущем placement-контракте.
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
   * Считает ширину авторасширения с ограничением по монтажной области.
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
