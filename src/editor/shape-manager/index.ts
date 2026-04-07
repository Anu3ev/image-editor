import {
  ActiveSelection,
  FabricObject,
  Group,
  Textbox
} from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'
import type { ObjectPlacement } from '../canvas-manager'
import type { TextStyleOptions } from '../text-manager'
import type {
  BeforeTextUpdatedPayload,
  TextUpdatedPayload
} from '../text-manager/types'
import {
  DEFAULT_SHAPE_PRESET_KEY,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN,
  getShapePreset,
  isShapePresetRoundable,
  resolvePresetKeyForRounding,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset
} from './shape-presets'
import {
  applyShapeStyle,
  createShapeNode
} from './shape-factory'
import {
  applyShapeTextLayout,
  resolveShapeTextAutoExpandWidthForText
} from './layout/shape-layout'
import {
  getShapePaddingChangeMap,
  mergeShapePadding,
  normalizeShapeUserPadding,
  resolveShapeTextContentInset,
  sumShapePadding
} from './layout/shape-padding'
import ShapeScalingController from './scaling/shape-scaling'
import ShapeEditingController from './shape-editing'
import ShapeLifecycleController from './shape-lifecycle'
import {
  registerShapeGroup,
  ShapeGroupObject
} from './shape-group'
import {
  applyGroupInteractivity,
  getShapeNodes,
  isShapeGroup
} from './shape-utils'
import {
  detachShapeGroupAutoLayout,
  prepareShapeTextNode
} from './shape-runtime'
import {
  ShapeAddedPayload,
  ShapeAddOptions,
  ShapeGroup,
  ShapeGroupLike,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapePaddingChangeMap,
  ShapeReference,
  ShapeStrokeOptions,
  ShapeTextAlignOptions,
  ShapeTextStyleOptions,
  ShapeTextNode,
  ShapeUpdateOptions,
  ShapeVerticalAlign,
  ShapeVisualStyle
} from './types'

const DEFAULT_SHAPE_FILL = '#B4B7BD'

const DEFAULT_SHAPE_STROKE_WIDTH = 0

const DEFAULT_SHAPE_OPACITY = 1

type ShapeCanvasEvent = {
  target?: FabricObject | null
  e?: Event | MouseEvent
  subTargets?: FabricObject[]
  transform?: import('fabric').Transform | null
}

type ShapeGroupDimensions = {
  width: number
  height: number
}

/**
 * Менеджер фигур и композитных объектов "фигура + текст".
 */
export default class ShapeManager {
  /**
   * Ссылка на редактор.
   */
  public editor: ImageEditor

  /**
   * Контроллер масштабирования shape-групп.
   */
  private scalingController: ShapeScalingController

  /**
   * Контроллер редактирования текста в shape-группах.
   */
  private editingController: ShapeEditingController

  /**
   * Placement shape-групп на время редактирования текста.
   */
  private editingPlacements: WeakMap<ShapeGroup, ObjectPlacement>

  /**
   * Контроллер lifecycle-событий shape-композиций.
   */
  private lifecycleController: ShapeLifecycleController

  /**
   * Текстовые узлы, которые ShapeManager обновляет сам и уже синхронизирует вручную.
   */
  private internalTextUpdates: WeakSet<ShapeTextNode>

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    registerShapeGroup()
    this.scalingController = new ShapeScalingController({
      canvas: editor.canvas
    })
    this.editingController = new ShapeEditingController({
      canvas: editor.canvas
    })
    this.editingPlacements = new WeakMap()
    this.lifecycleController = new ShapeLifecycleController({
      canvas: editor.canvas
    })
    this.internalTextUpdates = new WeakSet()

    this._bindEvents()
  }

  /**
   * Добавляет shape-композицию (фигура + текст) по presetKey.
   * При shapeTextAutoExpand=true явная width задаёт ручную базовую ширину,
   * но текущая ширина может быть больше неё, если этого требует текст.
   * Если `left/top` не переданы, объект визуально центрируется в монтажной области.
   * Если координаты переданы, placement трактуется через `left/top + originX/originY`.
   * @fires editor:shape-added
   */
  public async add({
    presetKey = DEFAULT_SHAPE_PRESET_KEY,
    options = {}
  }: {
    presetKey?: string
    options?: ShapeAddOptions
  } = {}): Promise<ShapeGroup | null> {
    const basePreset = getShapePreset({ presetKey })
    if (!basePreset) return null

    const {
      width: rawWidth,
      height: rawHeight,
      shapeTextAutoExpand,
      left,
      top,
      originX,
      originY,
      text,
      textStyle,
      alignH,
      alignV,
      textPadding,
      rounding,
      withoutAdding,
      withoutSelection,
      withoutSave,
      id
    } = options

    const effectivePresetKey = resolvePresetKeyForRounding({
      preset: basePreset,
      rounding
    })

    const effectivePreset = getShapePreset({
      presetKey: effectivePresetKey
    }) ?? basePreset

    const manualWidth = Math.max(1, rawWidth ?? effectivePreset.width)
    const manualHeight = Math.max(1, rawHeight ?? effectivePreset.height)
    const isShapeTextAutoExpandEnabled = shapeTextAutoExpand !== false

    const horizontalAlign = this._resolveHorizontalAlign({
      explicitAlign: alignH,
      textStyle
    })

    const verticalAlign = alignV ?? SHAPE_DEFAULT_VERTICAL_ALIGN

    const style = this._resolveShapeStyle({
      options,
      fallback: null
    })

    const userPadding = normalizeShapeUserPadding({
      padding: textPadding
    })
    const resolveInternalShapeTextInset = ({
      width,
      height
    }: {
      width: number
      height: number
    }): ShapePadding => resolveShapeTextContentInset({
      baseInset: resolvePresetInternalShapeTextInset({
        preset: effectivePreset,
        width,
        height
      }),
      stroke: style.stroke,
      strokeWidth: style.strokeWidth
    })
    const internalShapeTextInset = resolveShapeTextContentInset({
      baseInset: resolvePresetInternalShapeTextInset({
        preset: effectivePreset,
        width: manualWidth,
        height: manualHeight
      }),
      stroke: style.stroke,
      strokeWidth: style.strokeWidth
    })
    const padding = sumShapePadding({
      base: internalShapeTextInset,
      addition: userPadding
    })
    const changedPadding = getShapePaddingChangeMap({
      padding: textPadding
    })

    const textNode = this._createTextNode({
      text,
      textStyle,
      width: manualWidth,
      align: horizontalAlign,
      opacity: style.opacity
    })

    const layoutWidth = this._resolveShapeLayoutWidth({
      text: textNode,
      currentWidth: manualWidth,
      manualWidth,
      shapeTextAutoExpandEnabled: isShapeTextAutoExpandEnabled,
      padding,
      resolvePaddingForWidth: ({ width }) => sumShapePadding({
        base: resolveInternalShapeTextInset({
          width,
          height: manualHeight
        }),
        addition: userPadding
      })
    })

    const shape = await createShapeNode({
      preset: effectivePreset,
      width: layoutWidth,
      height: manualHeight,
      style,
      rounding
    })

    const group = this._createShapeGroup({
      id: id ?? `shape-${nanoid()}`,
      presetKey: effectivePreset.key,
      presetCanRound: isShapePresetRoundable({
        preset: effectivePreset
      }),
      shape,
      text: textNode,
      width: layoutWidth,
      height: manualHeight,
      manualWidth,
      manualHeight,
      shapeTextAutoExpand: isShapeTextAutoExpandEnabled,
      alignH: horizontalAlign,
      alignV: verticalAlign,
      padding: userPadding,
      internalShapeTextInset,
      changedPadding,
      style,
      rounding
    })
    const addedPayload: ShapeAddedPayload = {
      shape: group,
      presetKey: effectivePreset.key,
      options
    }

    if (left === undefined && top === undefined) {
      this.editor.canvasManager.centerObjectToMontageArea({ object: group })
    } else {
      const placement = this.editor.canvasManager.resolveObjectPlacement({
        object: group,
        left,
        top,
        originX,
        originY,
        fallbackPoint: this.editor.canvasManager.getMontageAreaSceneCenter()
      })

      this.editor.canvasManager.applyObjectPlacement({
        object: group,
        placement
      })
    }

    if (withoutAdding) {
      this.editor.canvas.fire('editor:shape-added', addedPayload)
      return group
    }

    this._beginMutation()

    try {
      this.editor.canvas.add(group)

      if (!withoutSelection) {
        this.editor.canvas.setActiveObject(group)
      }

      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.editor.canvas.fire('editor:shape-added', addedPayload)

    return group
  }

  /**
  * Обновляет пресет фигуры у существующей shape-группы с сохранением текста и трансформаций.
  * При shapeTextAutoExpand=true явная width обновляет ручную базовую ширину,
  * а текущая ширина сразу пересчитывается по тексту относительно этой базы.
  * При replace с новым presetKey по умолчанию не сохраняет текущий aspect ratio группы:
  * новая фигура вписывается в текущий replacement box и дальше расширяется по тексту с пропорциями своего пресета.
  * `preserveCurrentAspectRatio=true` оставляет текущее поведение без такого пересчета.
  * Если переданы `left/top/originX/originY`, они становятся новым placement-контрактом группы.
  * Сохраняет тот же instance группы и при необходимости заменяет только внутренний shape-узел.
  * @fires editor:before:shape-updated
  * @fires editor:shape-updated
   */
  public async update({
    target,
    presetKey,
    options = {}
  }: {
    target?: ShapeReference
    presetKey?: string
    options?: ShapeUpdateOptions
  } = {}): Promise<ShapeGroup | null> {
    const currentGroup = this._resolveShapeGroup({ target })
    if (!currentGroup) return null

    const currentPresetKey = presetKey ?? currentGroup.shapePresetKey ?? DEFAULT_SHAPE_PRESET_KEY
    const basePreset = getShapePreset({ presetKey: currentPresetKey })
    if (!basePreset) return null

    const {
      left,
      top,
      originX,
      originY,
      width: rawWidth,
      height: rawHeight,
      preserveCurrentAspectRatio,
      shapeTextAutoExpand,
      text,
      textStyle,
      alignH,
      alignV,
      textPadding,
      rounding,
      withoutSelection,
      withoutSave
    } = options
    const placement = this.editor.canvasManager.resolveObjectPlacement({
      object: currentGroup,
      left,
      top,
      originX,
      originY
    })

    const currentDimensions = this._resolveCurrentDimensions({
      group: currentGroup
    })
    const currentManualDimensions = this._resolveManualDimensions({
      group: currentGroup
    })
    const currentReplaceBoxDimensions = this._resolveReplaceBoxDimensions({
      group: currentGroup
    })
    const currentShapeTextAutoExpand = this._isShapeTextAutoExpandEnabled({
      group: currentGroup
    })
    const nextShapeTextAutoExpand = shapeTextAutoExpand !== undefined
      ? shapeTextAutoExpand !== false
      : currentShapeTextAutoExpand

    const effectiveRounding = rounding ?? currentGroup.shapeRounding ?? 0
    const effectivePresetKey = resolvePresetKeyForRounding({
      preset: basePreset,
      rounding: effectiveRounding
    })

    const effectivePreset = getShapePreset({
      presetKey: effectivePresetKey
    }) ?? basePreset
    const { width: presetWidth, height: presetHeight } = effectivePreset
    const shouldPreserveCurrentAspectRatio = Boolean(preserveCurrentAspectRatio)
    const isPresetReplace = presetKey !== undefined
    const shouldFitReplacementToPreset = isPresetReplace
      && !shouldPreserveCurrentAspectRatio
    const nextReplaceBoxDimensions = shouldFitReplacementToPreset
      ? {
        width: Math.max(1, rawWidth ?? currentReplaceBoxDimensions.width),
        height: Math.max(1, rawHeight ?? currentReplaceBoxDimensions.height)
      }
      : null

    const nextCurrentDimensions = nextReplaceBoxDimensions
      ? this._resolveAspectRatioFittedDimensions({
        targetWidth: nextReplaceBoxDimensions.width,
        targetHeight: nextReplaceBoxDimensions.height,
        aspectWidth: presetWidth,
        aspectHeight: presetHeight
      })
      : {
        width: Math.max(1, rawWidth ?? currentDimensions.width),
        height: Math.max(1, rawHeight ?? currentDimensions.height)
      }
    const { width: nextWidth, height } = nextCurrentDimensions

    const horizontalAlign = alignH
      ?? currentGroup.shapeAlignHorizontal
      ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN

    const verticalAlign = alignV
      ?? currentGroup.shapeAlignVertical
      ?? SHAPE_DEFAULT_VERTICAL_ALIGN

    const currentUserPadding = this._resolveGroupUserPadding({
      group: currentGroup
    })
    const changedPadding = getShapePaddingChangeMap({
      padding: textPadding
    })
    const nextUserPadding = mergeShapePadding({
      base: currentUserPadding,
      override: textPadding
    })
    const style = this._resolveShapeStyle({
      options,
      fallback: currentGroup
    })
    const resolveInternalShapeTextInset = ({
      width,
      height: nextHeight
    }: {
      width: number
      height: number
    }): ShapePadding => resolveShapeTextContentInset({
      baseInset: resolvePresetInternalShapeTextInset({
        preset: effectivePreset,
        width,
        height: nextHeight
      }),
      stroke: style.stroke,
      strokeWidth: style.strokeWidth
    })
    const baseInternalShapeTextInset = resolveInternalShapeTextInset({
      width: nextWidth,
      height
    })
    const basePadding = sumShapePadding({
      base: baseInternalShapeTextInset,
      addition: nextUserPadding
    })

    let manualWidth = currentManualDimensions.width
    let manualHeight = currentManualDimensions.height

    if (isPresetReplace) {
      manualWidth = nextWidth
      manualHeight = height
    }

    if (!isPresetReplace && rawWidth !== undefined) {
      manualWidth = Math.max(1, rawWidth)
    }

    if (!isPresetReplace && rawHeight !== undefined) {
      manualHeight = Math.max(1, rawHeight)
    }

    if (!isPresetReplace && rawWidth === undefined && currentShapeTextAutoExpand && !nextShapeTextAutoExpand) {
      manualWidth = currentDimensions.width
    }

    const {
      shape: currentShapeNode,
      text: currentTextNode
    } = getShapeNodes({
      group: currentGroup
    })

    if (!currentShapeNode || !currentTextNode) return null

    const lifecycle = this.lifecycleController.createContext({
      group: currentGroup,
      source: 'update',
      target,
      presetKey: effectivePreset.key,
      options,
      withoutSave
    })

    const textLayoutState = {
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      scaleX: 1,
      scaleY: 1,
      autoExpand: false,
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top'
    } as const

    const currentTextNodeWithRawText = currentTextNode as ShapeTextNode & {
      textCaseRaw?: string
    }
    const stagedTextNode = this._createTextNode({
      text: currentTextNodeWithRawText.textCaseRaw ?? currentTextNode.text ?? '',
      textStyle: this._resolveCurrentTextStyle({
        textNode: currentTextNode
      }),
      width: Math.max(1, currentTextNode.width ?? currentDimensions.width),
      align: horizontalAlign
    })

    stagedTextNode.set(textLayoutState)

    this._applyTextUpdates({
      textNode: stagedTextNode,
      text,
      textStyle,
      align: horizontalAlign
    })

    const shouldPreserveCurrentWidth = rawWidth === undefined
      && rawHeight === undefined
      && presetKey === undefined
      && shapeTextAutoExpand === undefined
      && rounding === undefined
      && text === undefined
      && !this._hasShapeTextSizeAffectingStyleChanges({ textStyle })
    const shouldPreventPaddingResize = textPadding !== undefined
      && shouldPreserveCurrentWidth
    const shouldResolveReplaceLayoutWithPresetRatio = shouldFitReplacementToPreset
      && nextShapeTextAutoExpand
    let resolvedLayoutWidth = nextWidth
    let resolvedLayoutHeight = height

    if (shouldPreserveCurrentWidth) {
      resolvedLayoutWidth = currentDimensions.width
      resolvedLayoutHeight = currentDimensions.height
    } else if (!shouldResolveReplaceLayoutWithPresetRatio) {
      resolvedLayoutWidth = this._resolveShapeLayoutWidth({
        text: stagedTextNode,
        currentWidth: nextWidth,
        manualWidth,
        shapeTextAutoExpandEnabled: nextShapeTextAutoExpand,
        padding: basePadding,
        resolvePaddingForWidth: ({ width }) => sumShapePadding({
          base: resolveInternalShapeTextInset({
            width,
            height
          }),
          addition: nextUserPadding
        })
      })
    }

    const resolvedInternalShapeTextInset = resolveInternalShapeTextInset({
      width: resolvedLayoutWidth,
      height: resolvedLayoutHeight
    })

    const shape = await createShapeNode({
      preset: effectivePreset,
      width: resolvedLayoutWidth,
      height: resolvedLayoutHeight,
      style,
      rounding: effectiveRounding
    })
    const currentObjects = currentGroup.getObjects()
    const currentShapeIndex = currentObjects.indexOf(currentShapeNode)
    if (currentShapeIndex < 0) return null

    const applyUpdateToCurrentGroup = (): void => {
      this._detachShapeGroupAutoLayout({
        group: currentGroup
      })

      currentTextNode.set(textLayoutState)
      this._applyTextUpdates({
        textNode: currentTextNode,
        text,
        textStyle,
        align: horizontalAlign
      })

      currentGroup.remove(currentShapeNode)
      currentGroup.insertAt(currentShapeIndex, shape)

      this._applyShapeGroupMetadata({
        group: currentGroup,
        presetKey: effectivePreset.key,
        presetCanRound: isShapePresetRoundable({
          preset: effectivePreset
        }),
        width: resolvedLayoutWidth,
        height: resolvedLayoutHeight,
        manualWidth,
        manualHeight,
        replaceBoxWidth: nextReplaceBoxDimensions?.width,
        replaceBoxHeight: nextReplaceBoxDimensions?.height,
        shapeTextAutoExpand: nextShapeTextAutoExpand,
        alignH: horizontalAlign,
        alignV: verticalAlign,
        padding: nextUserPadding,
        style,
        rounding: effectiveRounding
      })

      this._applyCurrentLayout({
        group: currentGroup,
        shape,
        text: currentTextNode,
        placement,
        width: resolvedLayoutWidth,
        height: resolvedLayoutHeight,
        alignH: horizontalAlign,
        alignV: verticalAlign,
        internalShapeTextInset: resolvedInternalShapeTextInset,
        resolveInternalShapeTextInset,
        preserveAspectRatio: shouldResolveReplaceLayoutWithPresetRatio,
        minimumReplaceBox: nextReplaceBoxDimensions ?? undefined,
        expandShapeHeightToFitText: !shouldPreventPaddingResize,
        changedPadding
      })

      if (currentTextNode.isEditing) {
        this.editingPlacements.set(currentGroup, placement)
      }
    }

    const wasOnCanvas = this._isOnCanvas({ object: currentGroup })
    if (!wasOnCanvas) {
      applyUpdateToCurrentGroup()

      this.lifecycleController.fireBefore({
        lifecycle
      })
      this.lifecycleController.fireUpdated({
        lifecycle
      })

      return currentGroup
    }

    this._beginMutation()

    try {
      applyUpdateToCurrentGroup()

      if (!currentTextNode.isEditing && !withoutSelection) {
        this.editor.canvas.setActiveObject(currentGroup)
      }

      this.lifecycleController.fireBefore({
        lifecycle
      })

      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.lifecycleController.fireUpdated({
      lifecycle
    })

    return currentGroup
  }

  /**
   * Вписывает размеры фигуры в целевой бокс с сохранением заданного aspect ratio.
   * Если задана только одна ось, вторая вычисляется из пропорций.
   */
  private _resolveAspectRatioFittedDimensions({
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
   * Удаляет shape-группу с канваса.
   */
  public remove({
    target,
    withoutSave
  }: {
    target?: ShapeReference
    withoutSave?: boolean
  } = {}): boolean {
    const group = this._resolveShapeGroup({ target })
    if (!group) return false

    this._beginMutation()

    try {
      this.editor.canvas.remove(group)
      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    return true
  }

  /**
   * Обновляет цвет заливки фигуры.
   * @fires editor:before:shape-updated
   * @fires editor:shape-updated
   */
  public setFill({
    target,
    fill,
    withoutSave
  }: {
    target?: ShapeReference
    fill: string
    withoutSave?: boolean
  }): ShapeGroup | null {
    const group = this._resolveShapeGroup({ target })
    if (!group) return null

    const { shape } = getShapeNodes({ group })
    if (!shape) return null

    const lifecycle = this.lifecycleController.createContext({
      group,
      source: 'fill',
      target,
      withoutSave
    })

    this._beginMutation()

    try {
      applyShapeStyle({
        shape,
        style: { fill }
      })

      group.shapeFill = fill
      group.setCoords()
      this.lifecycleController.fireBefore({
        lifecycle
      })
      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.lifecycleController.fireUpdated({
      lifecycle
    })

    return group
  }

  /**
   * Обновляет параметры обводки фигуры.
   * @fires editor:before:shape-updated
   * @fires editor:shape-updated
   */
  public setStroke({
    target,
    stroke,
    strokeWidth,
    dash,
    withoutSave
  }: {
    target?: ShapeReference
  } & ShapeStrokeOptions): ShapeGroup | null {
    const group = this._resolveShapeGroup({ target })
    if (!group) return null

    const {
      shape,
      text
    } = getShapeNodes({ group })
    if (!shape) return null

    const lifecycle = this.lifecycleController.createContext({
      group,
      source: 'stroke',
      target,
      withoutSave
    })

    this._beginMutation()

    try {
      applyShapeStyle({
        shape,
        style: {
          stroke,
          strokeWidth,
          strokeDashArray: dash
        }
      })

      if (stroke !== undefined) {
        group.shapeStroke = stroke
      }

      if (strokeWidth !== undefined) {
        group.shapeStrokeWidth = strokeWidth
      }

      if (dash !== undefined) {
        group.shapeStrokeDashArray = dash
      }

      if (text) {
        const currentDimensions = this._resolveCurrentDimensions({ group })

        this._applyCurrentLayout({
          group,
          shape,
          text,
          width: currentDimensions.width,
          height: currentDimensions.height
        })
      }

      group.setCoords()
      this.lifecycleController.fireBefore({
        lifecycle
      })
      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.lifecycleController.fireUpdated({
      lifecycle
    })

    return group
  }

  /**
   * Обновляет прозрачность фигуры.
   * @fires editor:before:shape-updated
   * @fires editor:shape-updated
   */
  public setOpacity({
    target,
    opacity,
    withoutSave
  }: {
    target?: ShapeReference
    opacity: number
    withoutSave?: boolean
  }): ShapeGroup | null {
    const group = this._resolveShapeGroup({ target })
    if (!group) return null

    const {
      shape,
      text
    } = getShapeNodes({ group })
    if (!shape) return null

    const lifecycle = this.lifecycleController.createContext({
      group,
      source: 'opacity',
      target,
      withoutSave
    })

    this._beginMutation()

    try {
      applyShapeStyle({
        shape,
        style: { opacity }
      })

      if (text) {
        text.set({ opacity })
        text.setCoords()
      }

      group.shapeOpacity = opacity
      group.setCoords()
      this.lifecycleController.fireBefore({
        lifecycle
      })
      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.lifecycleController.fireUpdated({
      lifecycle
    })

    return group
  }

  /**
   * Возвращает текстовый узел внутри shape-группы.
   */
  public getTextNode({
    target
  }: {
    target?: ShapeReference
  } = {}): ShapeTextNode | null {
    const group = this._resolveShapeGroup({ target })
    if (!group) return null

    const { text } = getShapeNodes({ group })
    if (!text) return null

    return text
  }

  /**
   * Обновляет стиль текста внутри shape-группы и пересчитывает layout композиции,
   * не переключая shape-level режим shapeTextAutoExpand.
   * @fires editor:before:shape-updated
   * @fires editor:shape-updated
   */
  public updateTextStyle({
    target,
    style = {},
    withoutSave
  }: {
    target?: ShapeReference
    style?: ShapeTextStyleOptions
    withoutSave?: boolean
  } = {}): ShapeGroup | null {
    const group = this._resolveShapeGroup({ target })
    if (!group) return null

    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) return null

    const hasStyleUpdates = Object.keys(style).length > 0
    if (!hasStyleUpdates) return group

    const manualDimensions = this._resolveManualDimensions({ group })
    const placement = this.editor.canvasManager.getObjectPlacement({ object: group })
    const alignH = this._resolveShapeTextHorizontalAlign({
      group,
      textStyle: style
    })
    const lifecycle = this.lifecycleController.createContext({
      group,
      source: 'text-style',
      target,
      withoutSave
    })

    this._beginMutation()

    try {
      this._applyTextUpdates({
        textNode: text,
        textStyle: style,
        align: alignH
      })

      this._applyCurrentLayout({
        group,
        shape,
        text,
        placement,
        height: manualDimensions.height,
        alignH
      })

      this.lifecycleController.fireBefore({
        lifecycle
      })
      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.lifecycleController.fireUpdated({
      lifecycle
    })

    return group
  }

  /**
   * Обновляет горизонтальное и вертикальное выравнивание текста внутри shape-группы.
   * @fires editor:before:shape-updated
   * @fires editor:shape-updated
   */
  public setTextAlign({
    target,
    horizontal,
    vertical,
    withoutSave
  }: {
    target?: ShapeReference
  } & ShapeTextAlignOptions): ShapeGroup | null {
    const group = this._resolveShapeGroup({ target })
    if (!group) return null

    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) return null

    const dimensions = this._resolveCurrentDimensions({ group })

    const alignH = horizontal
      ?? group.shapeAlignHorizontal
      ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN

    const alignV = vertical
      ?? group.shapeAlignVertical
      ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const lifecycle = this.lifecycleController.createContext({
      group,
      source: 'text-align',
      target,
      withoutSave
    })

    this._beginMutation()

    try {
      this._applyTextUpdates({
        textNode: text,
        align: alignH
      })

      this._applyCurrentLayout({
        group,
        shape,
        text,
        height: dimensions.height,
        width: dimensions.width,
        alignH,
        alignV
      })

      this.lifecycleController.fireBefore({
        lifecycle
      })
      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.lifecycleController.fireUpdated({
      lifecycle
    })

    return group
  }

  /**
   * Устанавливает скругление для фигуры.
   */
  public async setRounding({
    target,
    rounding,
    withoutSave
  }: {
    target?: ShapeReference
    rounding: number
    withoutSave?: boolean
  }): Promise<ShapeGroup | null> {
    const group = this._resolveShapeGroup({ target })
    if (!group) return null

    const normalizedRounding = Math.max(0, rounding)
    if (group.shapeCanRound === false) return group
    const presetKey = group.shapePresetKey ?? DEFAULT_SHAPE_PRESET_KEY

    return this.update({
      target: group,
      presetKey,
      options: {
        rounding: normalizedRounding,
        withoutSave
      }
    })
  }

  /**
   * Уничтожает менеджер и снимает подписки.
   */
  public destroy(): void {
    const { canvas } = this.editor

    canvas.off('object:scaling', this._handleObjectScaling)
    canvas.off('object:modified', this._handleObjectModified)
    canvas.off('mouse:move', this._handleMouseMove)
    canvas.off('mouse:down', this._handleMouseDown)
    canvas.off('mouse:up', this._handleMouseUp)
    canvas.off('text:editing:entered', this._handleTextEditingEntered)
    canvas.off('text:editing:exited', this._handleTextEditingExited)
    canvas.off('text:changed', this._handleTextChanged)
    canvas.off('editor:before:text-updated', this._handleBeforeTextUpdated)
    canvas.off('editor:text-updated', this._handleTextUpdated)
  }

  /**
   * Подписывает manager на события canvas.
   */
  private _bindEvents(): void {
    const { canvas } = this.editor

    canvas.on('object:scaling', this._handleObjectScaling)
    canvas.on('object:modified', this._handleObjectModified)
    canvas.on('mouse:move', this._handleMouseMove)
    canvas.on('mouse:down', this._handleMouseDown)
    canvas.on('mouse:up', this._handleMouseUp)
    canvas.on('text:editing:entered', this._handleTextEditingEntered)
    canvas.on('text:editing:exited', this._handleTextEditingExited)
    canvas.on('text:changed', this._handleTextChanged)
    canvas.on('editor:before:text-updated', this._handleBeforeTextUpdated)
    canvas.on('editor:text-updated', this._handleTextUpdated)
  }

  /**
   * Обработчик live-resize shape-групп.
   */
  private _handleObjectScaling = (
    event: ShapeCanvasEvent
  ): void => {
    const group = event.target && isShapeGroup(event.target)
      ? event.target
      : null

    if (group) {
      this.lifecycleController.beginResize({
        group
      })
    }

    this.scalingController.handleObjectScaling(event)
  }

  /**
   * Обработчик commit ресайза shape после завершения transform.
   */
  private _handleObjectModified = (
    event: ShapeCanvasEvent
  ): void => {
    this.scalingController.handleObjectModified(event)
    const group = event.target && isShapeGroup(event.target)
      ? event.target
      : null
    if (!group) return

    this.lifecycleController.finishResize({
      group
    })
  }

  /**
   * Обновляет live-scaling shape-групп на кадрах, где Fabric не эмитит object:scaling.
   */
  private _handleMouseMove = (
    event: ShapeCanvasEvent
  ): void => {
    this.scalingController.handleCanvasMouseMove(event)
  }

  /**
   * Обработчик клика по canvas для входа в редактирование текста shape-группы.
   */
  private _handleMouseDown = (
    event: ShapeCanvasEvent
  ): void => {
    const groups = this._collectShapeGroupsFromTarget({
      target: event.target,
      subTargets: event.subTargets
    })

    groups.forEach((group) => {
      this.lifecycleController.captureResizeStart({
        group
      })
    })

    this.editingController.handleMouseDown(event)
  }

  /**
   * Сбрасывает resize-start snapshots после завершения pointer-action без scaling.
   */
  private _handleMouseUp = (): void => {
    this.lifecycleController.clearResizeStarts()
  }

  /**
   * Обработчик выхода из режима редактирования текста.
   */
  private _handleTextEditingExited = (
    event: ShapeCanvasEvent
  ): void => {
    let completedEditing: {
      group: ShapeGroup
      textNode: ShapeTextNode
    } | null = null

    const { target } = event
    if (target instanceof Textbox) {
      const textNode = target as ShapeTextNode
      const { group } = textNode
      if (isShapeGroup(group)) {
        this.editingPlacements.delete(group)
        completedEditing = {
          group,
          textNode
        }
      }
    }

    this.editingController.handleTextEditingExited(event)

    if (!completedEditing) return

    this.lifecycleController.finishTextEditing(completedEditing)
  }

  /**
   * Обработчик входа в режим редактирования текста.
   */
  private _handleTextEditingEntered = (
    event: ShapeCanvasEvent
  ): void => {
    const { target } = event
    if (target instanceof Textbox) {
      const textNode = target as ShapeTextNode
      const { group } = textNode
      if (isShapeGroup(group)) {
        this._detachShapeGroupAutoLayout({
          group
        })
        this.lifecycleController.beginTextEditing({
          group
        })
        this.editingPlacements.set(
          group,
          this.editor.canvasManager.getObjectPlacement({ object: group })
        )
      }
    }

    this.editingController.handleTextEditingEntered(event)
  }

  /**
   * Обновляет layout shape-композиции при вводе текста.
   */
  private _handleTextChanged = (
    event: ShapeCanvasEvent
  ): void => {
    const { target } = event
    if (!(target instanceof Textbox)) return

    const textNode = target as ShapeTextNode
    const { group } = textNode
    if (!isShapeGroup(group)) return

    const wasSynchronized = this._syncShapeTextLayoutAfterTextMutation({
      textNode
    })
    if (!wasSynchronized) return

    this.editor.canvas.requestRenderAll()
  }

  /**
   * Синхронизирует shape-layout до фиксации программного обновления текста в истории.
   */
  private _handleBeforeTextUpdated = (
    event: BeforeTextUpdatedPayload
  ): void => {
    const { textbox, style } = event
    if (!(textbox instanceof Textbox)) return

    const textNode = textbox as ShapeTextNode
    const { group } = textNode
    if (!isShapeGroup(group)) return
    if (this.internalTextUpdates.has(textNode)) return

    const lifecycle = this.lifecycleController.beginTextUpdate({
      group,
      textNode,
      withoutSave: event.options.withoutSave
    })
    const wasSynchronized = this._syncShapeTextLayoutAfterTextMutation({
      textNode,
      textStyle: style
    })
    if (!wasSynchronized) {
      this.lifecycleController.cancelTextUpdate({
        textNode
      })
      return
    }

    this.lifecycleController.fireBefore({
      lifecycle
    })
  }

  /**
   * Завершает shape lifecycle после программного обновления вложенного текстового узла.
   */
  private _handleTextUpdated = (
    event: TextUpdatedPayload
  ): void => {
    const { textbox } = event
    if (!(textbox instanceof Textbox)) return

    const textNode = textbox as ShapeTextNode
    this.lifecycleController.finishTextUpdate({
      textNode
    })
  }

  /**
   * Создает shape-группу с метаданными и layout.
   */
  private _createShapeGroup({
    id,
    presetKey,
    presetCanRound,
    shape,
    text,
    width,
    height,
    manualWidth,
    manualHeight,
    shapeTextAutoExpand,
    alignH,
    alignV,
    padding,
    internalShapeTextInset,
    resolveInternalShapeTextInset,
    changedPadding,
    style,
    rounding
  }: {
    id: string
    presetKey: string
    presetCanRound: boolean
    shape: ShapeNode
    text: ShapeTextNode
    width: number
    height: number
    manualWidth?: number
    manualHeight?: number
    shapeTextAutoExpand: boolean
    alignH: ShapeHorizontalAlign
    alignV: ShapeVerticalAlign
    padding: ShapePadding
    internalShapeTextInset?: ShapePadding
    resolveInternalShapeTextInset?: ({ width: nextWidth, height: nextHeight }: {
      width: number
      height: number
    }) => ShapePadding
    changedPadding?: ShapePaddingChangeMap
    style: ShapeVisualStyle
    rounding?: number
  }): ShapeGroup {
    const group = new ShapeGroupObject([shape, text], {
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
      lockScalingFlip: true,
      centeredScaling: false,
      objectCaching: false
    }) as ShapeGroupObject & ShapeGroup
    const groupWithId = group as ShapeGroup & {
      id?: string
    }
    groupWithId.id = id

    this._applyShapeGroupMetadata({
      group,
      presetKey,
      presetCanRound,
      width,
      height,
      manualWidth,
      manualHeight,
      shapeTextAutoExpand,
      alignH,
      alignV,
      padding,
      style,
      rounding
    })

    group.rehydrateRuntimeState()

    applyGroupInteractivity({ group })
    prepareShapeTextNode({ text })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      padding,
      internalShapeTextInset,
      resolveInternalShapeTextInset,
      changedPadding
    })

    group.shapeReplaceBoxWidth = Math.max(1, group.shapeBaseWidth ?? width)
    group.shapeReplaceBoxHeight = Math.max(1, group.shapeBaseHeight ?? height)

    this._detachShapeGroupAutoLayout({
      group
    })

    return group
  }

  /**
   * Применяет к shape-группе сохраняемое доменное состояние без пересоздания внешнего объекта.
   */
  private _applyShapeGroupMetadata({
    group,
    presetKey,
    presetCanRound,
    width,
    height,
    manualWidth,
    manualHeight,
    replaceBoxWidth,
    replaceBoxHeight,
    shapeTextAutoExpand,
    alignH,
    alignV,
    padding,
    style,
    rounding
  }: {
    group: ShapeGroupLike
    presetKey: string
    presetCanRound: boolean
    width: number
    height: number
    manualWidth?: number
    manualHeight?: number
    replaceBoxWidth?: number
    replaceBoxHeight?: number
    shapeTextAutoExpand: boolean
    alignH: ShapeHorizontalAlign
    alignV: ShapeVerticalAlign
    padding: ShapePadding
    style: ShapeVisualStyle
    rounding?: number
  }): void {
    const strokeDashArray = style.strokeDashArray
      ? style.strokeDashArray.slice()
      : style.strokeDashArray ?? null

    group.set({
      shapeComposite: true,
      shapePresetKey: presetKey,
      shapeBaseWidth: width,
      shapeBaseHeight: height,
      shapeManualBaseWidth: Math.max(1, manualWidth ?? width),
      shapeManualBaseHeight: Math.max(1, manualHeight ?? height),
      shapeReplaceBoxWidth: Math.max(1, replaceBoxWidth ?? width),
      shapeReplaceBoxHeight: Math.max(1, replaceBoxHeight ?? height),
      shapeTextAutoExpand,
      shapeAlignHorizontal: alignH,
      shapeAlignVertical: alignV,
      shapePaddingTop: padding.top,
      shapePaddingRight: padding.right,
      shapePaddingBottom: padding.bottom,
      shapePaddingLeft: padding.left,
      shapeFill: style.fill,
      shapeStroke: style.stroke,
      shapeStrokeWidth: style.strokeWidth,
      shapeStrokeDashArray: strokeDashArray,
      shapeOpacity: style.opacity,
      shapeRounding: Math.max(0, rounding ?? 0),
      shapeCanRound: presetCanRound
    })
  }

  /**
   * Создает текстовый узел для shape-группы через TextManager.
   */
  private _createTextNode({
    text,
    textStyle,
    width,
    align,
    opacity
  }: {
    text?: string
    textStyle?: ShapeTextStyleOptions
    width: number
    align: ShapeHorizontalAlign
    opacity?: number
  }): ShapeTextNode {
    const style = textStyle ?? {}
    const updates: TextStyleOptions = {
      ...style,
      text: text ?? style.text ?? '',
      align,
      autoExpand: false,
      splitByGrapheme: false,
      width: Math.max(1, width),
      left: 0,
      top: 0
    }

    if (typeof opacity === 'number' && style.opacity === undefined) {
      updates.opacity = opacity
    }

    const textbox = this.editor.textManager.addText(updates, {
      withoutAdding: true,
      withoutSave: true,
      withoutSelection: true,
      emitLifecycleEvents: false
    }) as ShapeTextNode

    textbox.set({
      shapeNodeType: 'text',
      splitByGrapheme: false
    })

    prepareShapeTextNode({ text: textbox })

    return textbox
  }

  /**
   * Применяет текстовые обновления к textbox shape-группы.
   */
  private _applyTextUpdates({
    textNode,
    text,
    textStyle,
    align
  }: {
    textNode: ShapeTextNode
    text?: string
    textStyle?: ShapeTextStyleOptions
    align?: ShapeHorizontalAlign
  }): void {
    const styleUpdates: TextStyleOptions = {}

    if (textStyle) {
      const keys = Object.keys(textStyle) as Array<keyof ShapeTextStyleOptions>

      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index]
        styleUpdates[key] = textStyle[key] as never
      }
    }

    if (text !== undefined) {
      styleUpdates.text = text
    }

    if (align) {
      styleUpdates.align = align
    }

    styleUpdates.autoExpand = false
    styleUpdates.splitByGrapheme = false

    const hasUpdates = Object.keys(styleUpdates).length > 0
    if (!hasUpdates) return

    this.internalTextUpdates.add(textNode)

    try {
      this.editor.textManager.updateText({
        target: textNode,
        style: styleUpdates,
        skipRender: true,
        withoutSave: true,
        emitLifecycleEvents: false
      })
    } finally {
      this.internalTextUpdates.delete(textNode)
    }

    textNode.autoExpand = false
  }

  /**
   * Возвращает текущее состояние текстового узла в виде style-объекта для staged update.
   */
  private _resolveCurrentTextStyle({ textNode }: { textNode: ShapeTextNode }): TextStyleOptions {
    const textNodeWithCase = textNode as ShapeTextNode & {
      uppercase?: boolean
    }
    const {
      backgroundColor,
      backgroundOpacity,
      fill,
      fontFamily,
      fontSize,
      fontStyle,
      fontWeight,
      lineFontDefaults,
      linethrough,
      opacity,
      paddingBottom,
      paddingLeft,
      paddingRight,
      paddingTop,
      radiusBottomLeft,
      radiusBottomRight,
      radiusTopLeft,
      radiusTopRight,
      stroke,
      strokeWidth,
      styles,
      textAlign,
      underline,
      uppercase
    } = textNodeWithCase
    const hasExplicitTextAlign = textAlign === 'left'
      || textAlign === 'center'
      || textAlign === 'right'
      || textAlign === 'justify'
    const textAlignOverride = hasExplicitTextAlign
      ? { align: textAlign }
      : undefined
    const align = this._resolveShapeTextHorizontalAlign({
      group: textNode.group as ShapeGroupLike,
      textStyle: textAlignOverride
    })

    return {
      align,
      backgroundColor: typeof backgroundColor === 'string' ? backgroundColor : undefined,
      backgroundOpacity,
      bold: fontWeight === 'bold',
      color: typeof fill === 'string' ? fill : undefined,
      fontFamily,
      fontSize,
      italic: fontStyle === 'italic',
      lineFontDefaults: lineFontDefaults
        ? JSON.parse(JSON.stringify(lineFontDefaults)) as TextStyleOptions['lineFontDefaults']
        : undefined,
      opacity,
      paddingBottom,
      paddingLeft,
      paddingRight,
      paddingTop,
      radiusBottomLeft,
      radiusBottomRight,
      radiusTopLeft,
      radiusTopRight,
      splitByGrapheme: false,
      strokeColor: typeof stroke === 'string' ? stroke : undefined,
      strokeWidth,
      strikethrough: Boolean(linethrough),
      styles: styles
        ? JSON.parse(JSON.stringify(styles)) as TextStyleOptions['styles']
        : undefined,
      underline: Boolean(underline),
      uppercase: Boolean(uppercase)
    }
  }

  /**
   * Возвращает текущие визуальные размеры shape-группы.
   */
  private _resolveCurrentDimensions({ group }: { group: ShapeGroupLike }): { width: number; height: number } {
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
   * Возвращает ручные базовые размеры shape-группы.
   */
  private _resolveManualDimensions({ group }: { group: ShapeGroupLike }): ShapeGroupDimensions {
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
   * Возвращает стабильный размерный бокс, который используется при replace с пересчетом пропорций.
   */
  private _resolveReplaceBoxDimensions({ group }: { group: ShapeGroupLike }): ShapeGroupDimensions {
    const currentDimensions = this._resolveCurrentDimensions({ group })

    return {
      width: Math.max(1, group.shapeReplaceBoxWidth ?? currentDimensions.width),
      height: Math.max(1, group.shapeReplaceBoxHeight ?? currentDimensions.height)
    }
  }

  /**
   * Возвращает пользовательские отступы текстовой области shape-группы.
   */
  private _resolveGroupUserPadding({ group }: { group: ShapeGroupLike }): ShapePadding {
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
   * Возвращает полный внутренний inset текста для текущих размеров группы с учетом пресета и обводки.
   */
  private _resolveGroupInternalShapeTextInset({
    group,
    width,
    height
  }: {
    group: ShapeGroupLike
    width: number
    height: number
  }): ShapePadding {
    const presetKey = group.shapePresetKey ?? DEFAULT_SHAPE_PRESET_KEY
    const preset = getShapePreset({ presetKey })
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
   * Возвращает true, если у shape-группы включен режим расширения по тексту.
   */
  private _isShapeTextAutoExpandEnabled({ group }: { group: ShapeGroupLike }): boolean {
    return group.shapeTextAutoExpand !== false
  }

  /**
   * Возвращает ширину монтажной области в scene coordinates.
   */
  private _resolveMontageAreaWidth(): number | null {
    const { canvasManager, montageArea } = this.editor
    if (!montageArea) return null

    const { width: montageWidth } = canvasManager.getMontageAreaSceneBounds()

    if (!Number.isFinite(montageWidth) || montageWidth <= 0) {
      return null
    }

    return montageWidth
  }

  /**
   * Возвращает ширину shape для режима shapeTextAutoExpand с учетом ограничений монтажной области и ручной базовой ширины как нижней границы.
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
    resolvePaddingForWidth?: ({ width }: {
      width: number
    }) => ShapePadding
  }): number {
    const montageAreaWidth = this._resolveMontageAreaWidth()
    if (!montageAreaWidth) {
      return Math.max(
        1,
        currentWidth,
        minimumWidth
      )
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

  /**
   * Возвращает текущую ширину shape-группы из режима shapeTextAutoExpand и ручной базовой ширины.
   */
  private _resolveShapeLayoutWidth({
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
    resolvePaddingForWidth?: ({ width }: {
      width: number
    }) => ShapePadding
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
   * Возвращает актуальное горизонтальное выравнивание текста для shape-группы.
   */
  private _resolveShapeTextHorizontalAlign({
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
   * Применяет актуальный layout для shape-группы.
   */
  private _applyCurrentLayout({
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
    minimumReplaceBox,
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
    resolveInternalShapeTextInset?: ({ width: nextWidth, height: nextHeight }: {
      width: number
      height: number
    }) => ShapePadding
    preserveAspectRatio?: boolean
    minimumReplaceBox?: ShapeGroupDimensions
    expandShapeHeightToFitText?: boolean
    changedPadding?: ShapePaddingChangeMap
  }): void {
    const currentDimensions = this._resolveCurrentDimensions({ group })
    const manualDimensions = this._resolveManualDimensions({ group })
    const userPadding = this._resolveGroupUserPadding({ group })
    const resolveCurrentInternalShapeTextInset = resolveInternalShapeTextInset
      ?? (({ width: nextWidth, height: nextHeight }: {
        width: number
        height: number
      }) => internalShapeTextInset ?? this._resolveGroupInternalShapeTextInset({
        group,
        width: nextWidth,
        height: nextHeight
      }))
    let resolvedWidth = currentDimensions.width

    if (width !== undefined) {
      resolvedWidth = Math.max(1, width)
    } else {
      const resolvedAutoExpandHeight = Math.max(1, height ?? currentDimensions.height)
      resolvedWidth = this._resolveShapeLayoutWidth({
        text,
        currentWidth: currentDimensions.width,
        manualWidth: manualDimensions.width,
        shapeTextAutoExpandEnabled: this._isShapeTextAutoExpandEnabled({ group }),
        padding: sumShapePadding({
          base: resolveCurrentInternalShapeTextInset({
            width: resolvedWidth,
            height: resolvedAutoExpandHeight
          }),
          addition: userPadding
        }),
        resolvePaddingForWidth: ({ width: nextWidth }) => sumShapePadding({
          base: resolveCurrentInternalShapeTextInset({
            width: nextWidth,
            height: resolvedAutoExpandHeight
          }),
          addition: userPadding
        })
      })
    }

    const resolvedHeight = Math.max(1, height ?? currentDimensions.height)
    const resolvedInternalShapeTextInset = resolveCurrentInternalShapeTextInset({
      width: resolvedWidth,
      height: resolvedHeight
    })
    const stablePlacement = placement ?? this.editor.canvasManager.getObjectPlacement({ object: group })
    const montageAreaWidth = preserveAspectRatio
      ? this._resolveMontageAreaWidth()
      : undefined

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: resolvedWidth,
      height: resolvedHeight,
      alignH: alignH ?? group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
      alignV: alignV ?? group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
      padding: userPadding,
      internalShapeTextInset: resolvedInternalShapeTextInset,
      resolveInternalShapeTextInset: resolveCurrentInternalShapeTextInset,
      preserveAspectRatio,
      montageAreaWidth,
      expandShapeHeightToFitText,
      changedPadding
    })

    group.shapeReplaceBoxWidth = Math.max(
      1,
      minimumReplaceBox?.width ?? 0,
      group.shapeBaseWidth ?? resolvedWidth
    )
    group.shapeReplaceBoxHeight = Math.max(
      1,
      minimumReplaceBox?.height ?? 0,
      group.shapeBaseHeight ?? resolvedHeight
    )

    this.editor.canvasManager.applyObjectPlacement({
      object: group,
      placement: stablePlacement
    })
  }

  /**
   * Синхронизирует layout shape-группы после изменения вложенного текстового узла.
   */
  private _syncShapeTextLayoutAfterTextMutation({
    textNode,
    textStyle
  }: {
    textNode: ShapeTextNode
    textStyle?: ShapeTextStyleOptions
  }): boolean {
    const { group } = textNode
    if (!isShapeGroup(group)) return false

    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) return false

    this._detachShapeGroupAutoLayout({
      group
    })

    const placement = this._resolveEditingPlacement({
      group
    })
    const manualDimensions = this._resolveManualDimensions({
      group
    })
    const alignH = this._resolveShapeTextHorizontalAlign({
      group,
      textStyle
    })

    this._applyCurrentLayout({
      group,
      shape,
      text,
      placement,
      height: manualDimensions.height,
      alignH
    })

    return true
  }

  /**
   * Возвращает стабильный placement группы для текущего редактирования текста.
   */
  private _resolveEditingPlacement({ group }: { group: ShapeGroup }): ObjectPlacement {
    const storedPlacement = this.editingPlacements.get(group)
    if (storedPlacement) return storedPlacement

    return this.editor.canvasManager.getObjectPlacement({ object: group })
  }

  /**
   * Отключает встроенный fit-content layout группы, чтобы shape-композиция управлялась только ShapeManager.
   */
  private _detachShapeGroupAutoLayout({ group }: { group: ShapeGroupLike }): void {
    detachShapeGroupAutoLayout({
      group
    })
  }

  /**
   * Нормализует выравнивание по горизонтали для нового shape.
   */
  private _resolveHorizontalAlign({
    explicitAlign,
    textStyle
  }: {
    explicitAlign?: ShapeHorizontalAlign
    textStyle?: ShapeTextStyleOptions
  }): ShapeHorizontalAlign {
    if (explicitAlign) return explicitAlign

    const alignFromTextStyle = textStyle?.align
    if (
      alignFromTextStyle === 'left'
      || alignFromTextStyle === 'center'
      || alignFromTextStyle === 'right'
      || alignFromTextStyle === 'justify'
    ) {
      return alignFromTextStyle
    }

    return SHAPE_DEFAULT_HORIZONTAL_ALIGN
  }

  /**
   * Возвращает true, если обновление textStyle может изменить размеры текстового layout.
   */
  private _hasShapeTextSizeAffectingStyleChanges({
    textStyle
  }: {
    textStyle?: ShapeTextStyleOptions
  }): boolean {
    if (!textStyle) return false

    const keys = Object.keys(textStyle) as Array<keyof ShapeTextStyleOptions>

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]
      if (
        key === 'align'
        || key === 'color'
        || key === 'strokeColor'
        || key === 'strokeWidth'
        || key === 'underline'
        || key === 'strikethrough'
        || key === 'opacity'
      ) {
        continue
      }

      return true
    }

    return false
  }

  /**
   * Возвращает итоговый стиль фигуры с учетом переданных и сохраненных значений.
   */
  private _resolveShapeStyle({
    options,
    fallback
  }: {
    options: Pick<
      ShapeAddOptions | ShapeUpdateOptions,
      'fill' | 'stroke' | 'strokeWidth' | 'strokeDashArray' | 'opacity'
    >
    fallback: ShapeGroupLike | null
  }): ShapeVisualStyle {
    const {
      fill,
      stroke,
      strokeWidth,
      strokeDashArray,
      opacity
    } = options

    const dashArray = strokeDashArray !== undefined
      ? strokeDashArray
      : fallback?.shapeStrokeDashArray

    return {
      fill: fill ?? fallback?.shapeFill ?? DEFAULT_SHAPE_FILL,
      stroke: stroke ?? fallback?.shapeStroke ?? null,
      strokeWidth: strokeWidth ?? fallback?.shapeStrokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH,
      strokeDashArray: dashArray ?? null,
      opacity: opacity ?? fallback?.shapeOpacity ?? DEFAULT_SHAPE_OPACITY
    }
  }

  /**
   * Собирает все shape-группы, затронутые текущим target/subTargets.
   */
  private _collectShapeGroupsFromTarget({
    target,
    subTargets = []
  }: {
    target?: FabricObject | null
    subTargets?: FabricObject[]
  }): ShapeGroup[] {
    const groups: ShapeGroup[] = []

    const addGroup = (object?: FabricObject | null): void => {
      if (!object) return

      if (object instanceof ActiveSelection) {
        object.getObjects().forEach((item) => {
          addGroup(item)
        })
        return
      }

      if (isShapeGroup(object)) {
        if (!groups.includes(object)) {
          groups.push(object)
        }
        return
      }

      const { group } = object
      if (!group || !isShapeGroup(group)) return

      if (!groups.includes(group)) {
        groups.push(group)
      }
    }

    addGroup(target)

    subTargets.forEach((object) => {
      addGroup(object)
    })

    return groups
  }

  /**
   * Начинает мутацию canvas с временным отключением history.
   */
  private _beginMutation(): void {
    this.editor.historyManager.suspendHistory()
  }

  /**
   * Завершает мутацию canvas и при необходимости сохраняет state.
   */
  private _endMutation({ withoutSave }: { withoutSave?: boolean }): void {
    this.editor.historyManager.resumeHistory()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }
  }

  /**
   * Проверяет, добавлен ли объект в canvas редактора.
   */
  private _isOnCanvas({ object }: { object: FabricObject }): boolean {
    const objects = this.editor.canvas.getObjects()

    for (let index = 0; index < objects.length; index += 1) {
      if (objects[index] === object) return true
    }

    return false
  }

  /**
   * Разрешает ссылку на shape-группу.
   */
  private _resolveShapeGroup({ target }: { target?: ShapeReference }): ShapeGroup | null {
    if (target instanceof Group && isShapeGroup(target)) return target

    if (!target) {
      const active = this.editor.canvas.getActiveObject()
      if (isShapeGroup(active)) return active

      const activeGroup = active?.group
      if (activeGroup && isShapeGroup(activeGroup)) {
        return activeGroup
      }

      return null
    }

    if (typeof target === 'string') {
      const objects = this.editor.canvas.getObjects()

      for (let index = 0; index < objects.length; index += 1) {
        const object = objects[index]
        const objectWithId = object as FabricObject & {
          id?: string
        }
        if (objectWithId.id === target && isShapeGroup(object)) {
          return object
        }
      }
    }

    if (target instanceof FabricObject) {
      if (isShapeGroup(target)) return target

      const { group } = target
      if (group && isShapeGroup(group)) return group
    }

    return null
  }
}
