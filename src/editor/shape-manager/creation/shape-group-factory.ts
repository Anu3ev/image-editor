import { nanoid } from 'nanoid'
import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN,
  getShapePreset,
  isShapePresetRoundable,
  resolvePresetKeyForRounding,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset
} from '../domain/shape-presets'
import { normalizeShapeRounding } from '../domain/shape-rounding'
import { resolveShapeStyle } from '../domain/shape-style'
import {
  applyShapeGroupMetadata,
  ShapeGroupObject
} from '../domain/shape-group'
import {
  applyShapeGroupInteractivity,
  detachShapeGroupAutoLayout,
  prepareShapeTextNode
} from '../domain/shape-runtime'
import {
  applyShapeTextLayout
} from '../layout/shape-layout'
import {
  getShapePaddingChangeMap,
  normalizeShapeUserPadding,
  resolveShapeTextContentInset,
  sumShapePadding
} from '../layout/shape-padding'
import { createShapeNode } from './shape-node-factory'
import type ShapeLayoutController from '../layout/shape-layout-controller'
import type ShapeTextNodeController from '../text/shape-text-node-controller'
import type {
  ShapeAddOptions,
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapeInsetResolver,
  ShapeNode,
  ShapePadding,
  ShapePaddingChangeMap,
  ShapePreset,
  ShapeTextNode,
  ShapeVerticalAlign,
  ShapeVisualStyle
} from '../types'

/**
 * Нормализованный preset и rounding для создания shape-группы.
 */
type ShapeAddPresetState = {
  preset: ShapePreset
  presetCanRound: boolean
  rounding: number
}

/**
 * Базовые и replacement-размеры shape до text layout.
 */
type ShapeAddDimensionState = {
  manualWidth: number
  manualHeight: number
  replaceBoxWidth?: number
  replaceBoxHeight?: number
  preserveAspectRatio: boolean
}

/**
 * Style, padding и alignment, необходимые initial shape layout.
 */
type ShapeAddLayoutState = {
  shapeTextAutoExpand: boolean
  alignH: ShapeHorizontalAlign
  alignV: ShapeVerticalAlign
  userPadding: ShapePadding
  internalShapeTextInset: ShapePadding
  resolveInternalShapeTextInset: ShapeInsetResolver
  changedPadding: ShapePaddingChangeMap
  style: ShapeVisualStyle
}

/**
 * Полное состояние child nodes и metadata перед initial layout.
 */
type ShapeGroupMaterializationInput = {
  id: string
  presetKey: string
  presetCanRound: boolean
  shape: ShapeNode
  text: ShapeTextNode
  width: number
  dimensions: ShapeAddDimensionState
  layout: ShapeAddLayoutState
  rounding: number
}

/**
 * Возвращает initial horizontal align из add options и text style.
 */
const resolveInitialHorizontalAlign = ({
  explicitAlign,
  textAlign
}: {
  explicitAlign?: ShapeHorizontalAlign
  textAlign?: string
}): ShapeHorizontalAlign => {
  if (explicitAlign) return explicitAlign

  if (
    textAlign === 'left'
    || textAlign === 'center'
    || textAlign === 'right'
    || textAlign === 'justify'
  ) return textAlign

  return SHAPE_DEFAULT_HORIZONTAL_ALIGN
}

/**
 * Создаёт resolver полного inset с учётом preset geometry и stroke.
 */
const createInternalShapeTextInsetResolver = ({
  preset,
  style
}: {
  preset: ShapePreset
  style: ShapeVisualStyle
}): ShapeInsetResolver => ({ width, height }) => resolveShapeTextContentInset({
  baseInset: resolvePresetInternalShapeTextInset({
    preset,
    width,
    height
  }),
  stroke: style.stroke,
  strokeWidth: style.strokeWidth
})

/**
 * Создаёт готовую off-canvas shape-группу для публичного add-сценария.
 */
export default class ShapeGroupFactory {
  /**
   * Владелец shape layout и размерных вычислений.
   */
  private readonly layoutController: ShapeLayoutController

  /**
   * Владелец shape-owned textbox materialization.
   */
  private readonly textNodeController: ShapeTextNodeController

  /**
   * Инициализирует factory конкретными layout и text dependencies.
   */
  constructor({
    layoutController,
    textNodeController
  }: {
    layoutController: ShapeLayoutController
    textNodeController: ShapeTextNodeController
  }) {
    this.layoutController = layoutController
    this.textNodeController = textNodeController
  }

  /**
   * Возвращает полностью materialized группу до placement и добавления на canvas.
   */
  public async createForAdd({
    basePreset,
    options
  }: {
    basePreset: ShapePreset
    options: ShapeAddOptions
  }): Promise<ShapeGroup> {
    const presetState = this._resolvePresetState({ basePreset, options })
    const dimensions = this._resolveDimensions({
      preset: presetState.preset,
      options
    })
    const layout = this._resolveLayoutState({
      preset: presetState.preset,
      dimensions,
      options
    })
    const text = this.textNodeController.create({
      text: options.text,
      textStyle: options.textStyle,
      width: dimensions.manualWidth,
      align: layout.alignH,
      opacity: layout.style.opacity
    })
    const width = this._resolveInitialWidth({
      text,
      dimensions,
      layout
    })
    const shape = await createShapeNode({
      preset: presetState.preset,
      width,
      height: dimensions.manualHeight,
      style: layout.style,
      rounding: presetState.rounding
    })
    const group = this._createGroupObject({
      id: options.id ?? `shape-${nanoid()}`,
      presetKey: presetState.preset.key,
      presetCanRound: presetState.presetCanRound,
      shape,
      text,
      width,
      dimensions,
      layout,
      rounding: presetState.rounding
    })

    this._applyInitialLayout({
      group,
      shape,
      text,
      width,
      dimensions,
      layout
    })

    return group
  }

  /**
   * Нормализует effective preset и поддерживаемое им rounding.
   */
  private _resolvePresetState({
    basePreset,
    options
  }: {
    basePreset: ShapePreset
    options: ShapeAddOptions
  }): ShapeAddPresetState {
    const requestedRounding = normalizeShapeRounding({
      rounding: options.rounding
    })
    const effectivePresetKey = resolvePresetKeyForRounding({
      preset: basePreset,
      rounding: requestedRounding
    })
    const preset = getShapePreset({
      presetKey: effectivePresetKey
    }) ?? basePreset
    const presetCanRound = isShapePresetRoundable({ preset })

    return {
      preset,
      presetCanRound,
      rounding: presetCanRound ? requestedRounding : 0
    }
  }

  /**
   * Разрешает manual base и replace box до automatic text expansion.
   */
  private _resolveDimensions({
    preset,
    options
  }: {
    preset: ShapePreset
    options: ShapeAddOptions
  }): ShapeAddDimensionState {
    const {
      width: rawWidth,
      height: rawHeight,
      preserveAspectRatio
    } = options
    const replaceBoxWidth = rawWidth !== undefined
      ? Math.max(1, rawWidth)
      : undefined
    const replaceBoxHeight = rawHeight !== undefined
      ? Math.max(1, rawHeight)
      : undefined
    const shouldPreserveAspectRatio = Boolean(preserveAspectRatio)

    if (shouldPreserveAspectRatio) {
      const fitted = this.layoutController.resolveAspectRatioFittedDimensions({
        targetWidth: replaceBoxWidth,
        targetHeight: replaceBoxHeight,
        aspectWidth: preset.width,
        aspectHeight: preset.height
      })

      return {
        manualWidth: fitted.width,
        manualHeight: fitted.height,
        replaceBoxWidth,
        replaceBoxHeight,
        preserveAspectRatio: true
      }
    }

    return {
      manualWidth: Math.max(1, rawWidth ?? preset.width),
      manualHeight: Math.max(1, rawHeight ?? preset.height),
      replaceBoxWidth,
      replaceBoxHeight,
      preserveAspectRatio: false
    }
  }

  /**
   * Собирает style, padding, inset и alignment initial layout.
   */
  private _resolveLayoutState({
    preset,
    dimensions,
    options
  }: {
    preset: ShapePreset
    dimensions: ShapeAddDimensionState
    options: ShapeAddOptions
  }): ShapeAddLayoutState {
    const style = resolveShapeStyle({
      options,
      fallback: null
    })
    const userPadding = normalizeShapeUserPadding({
      padding: options.textPadding
    })
    const resolveInternalShapeTextInset = createInternalShapeTextInsetResolver({
      preset,
      style
    })

    return {
      shapeTextAutoExpand: options.shapeTextAutoExpand !== false,
      alignH: resolveInitialHorizontalAlign({
        explicitAlign: options.alignH,
        textAlign: options.textStyle?.align
      }),
      alignV: options.alignV ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
      userPadding,
      internalShapeTextInset: resolveInternalShapeTextInset({
        width: dimensions.manualWidth,
        height: dimensions.manualHeight
      }),
      resolveInternalShapeTextInset,
      changedPadding: getShapePaddingChangeMap({
        padding: options.textPadding
      }),
      style
    }
  }

  /**
   * Рассчитывает initial width с учётом manual base и text auto-expand.
   */
  private _resolveInitialWidth({
    text,
    dimensions,
    layout
  }: {
    text: ShapeTextNode
    dimensions: ShapeAddDimensionState
    layout: ShapeAddLayoutState
  }): number {
    if (dimensions.preserveAspectRatio) return dimensions.manualWidth

    const padding = sumShapePadding({
      base: layout.internalShapeTextInset,
      addition: layout.userPadding
    })

    return this.layoutController.resolveShapeLayoutWidth({
      text,
      currentWidth: dimensions.manualWidth,
      manualWidth: dimensions.manualWidth,
      shapeTextAutoExpandEnabled: layout.shapeTextAutoExpand,
      padding,
      resolvePaddingForWidth: ({ width }) => sumShapePadding({
        base: layout.resolveInternalShapeTextInset({
          width,
          height: dimensions.manualHeight
        }),
        addition: layout.userPadding
      })
    })
  }

  /**
   * Создаёт ShapeGroupObject и применяет persisted metadata и runtime invariants.
   */
  private _createGroupObject({
    id,
    presetKey,
    presetCanRound,
    shape,
    text,
    width,
    dimensions,
    layout,
    rounding
  }: ShapeGroupMaterializationInput): ShapeGroup {
    const group = new ShapeGroupObject([shape, text], {
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
      lockScalingFlip: true,
      centeredScaling: false,
      objectCaching: false
    }) as ShapeGroupObject & ShapeGroup
    const groupWithId = group as ShapeGroup & { id?: string }
    groupWithId.id = id

    applyShapeGroupMetadata({
      group,
      metadata: {
        presetKey,
        presetCanRound,
        width,
        height: dimensions.manualHeight,
        manualWidth: dimensions.manualWidth,
        manualHeight: dimensions.manualHeight,
        replaceBoxWidth: dimensions.replaceBoxWidth,
        replaceBoxHeight: dimensions.replaceBoxHeight,
        shapeTextAutoExpand: layout.shapeTextAutoExpand,
        alignH: layout.alignH,
        alignV: layout.alignV,
        padding: layout.userPadding,
        style: layout.style,
        rounding
      }
    })
    group.rehydrateRuntimeState()
    applyShapeGroupInteractivity({ group })
    prepareShapeTextNode({ text })

    return group
  }

  /**
   * Применяет canonical initial layout и нормализует proportional manual base.
   */
  private _applyInitialLayout({
    group,
    shape,
    text,
    width,
    dimensions,
    layout
  }: {
    group: ShapeGroup
    shape: ShapeNode
    text: ShapeTextNode
    width: number
    dimensions: ShapeAddDimensionState
    layout: ShapeAddLayoutState
  }): void {
    applyShapeTextLayout({
      group,
      shape,
      text,
      width,
      height: dimensions.manualHeight,
      alignH: layout.alignH,
      alignV: layout.alignV,
      padding: layout.userPadding,
      shapeTextAutoExpandEnabled: layout.shapeTextAutoExpand,
      preserveAspectRatio: dimensions.preserveAspectRatio,
      internalShapeTextInset: layout.internalShapeTextInset,
      resolveInternalShapeTextInset: layout.resolveInternalShapeTextInset,
      montageAreaWidth: dimensions.preserveAspectRatio
        ? this.layoutController.resolveMontageAreaWidth()
        : undefined,
      changedPadding: layout.changedPadding
    })

    if (dimensions.preserveAspectRatio) {
      group.shapeManualBaseWidth = Math.max(1, group.shapeBaseWidth ?? width)
      group.shapeManualBaseHeight = Math.max(
        1,
        group.shapeBaseHeight ?? dimensions.manualHeight
      )
    }

    detachShapeGroupAutoLayout({ group })
  }
}
