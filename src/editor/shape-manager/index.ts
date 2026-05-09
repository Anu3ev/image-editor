import {
  ActiveSelection,
  FabricObject,
  Group
} from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'
import type { ObjectPlacement } from '../canvas-manager'
import type { TextStyleOptions } from '../text-manager'
import {
  DEFAULT_SHAPE_PRESET_KEY,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN,
  getShapePreset,
  isShapePresetRoundable,
  resolvePresetKeyForRounding,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset
} from './domain/shape-presets'
import {
  createShapeNode
} from './creation/shape-node-factory'
import { normalizeShapeRounding } from './domain/shape-rounding'
import { resolveShapeStyle } from './domain/shape-style'
import {
  applyShapeTextLayout
} from './layout/shape-layout'
import {
  getShapePaddingChangeMap,
  normalizeShapeUserPadding,
  resolveShapeTextContentInset,
  sumShapePadding
} from './layout/shape-padding'
import ShapeScalingController from './scaling/shape-scaling-controller'
import ShapeEditingController from './editing/shape-editing-controller'
import ShapeEventController from './events/shape-event-controller'
import ShapeLayoutController from './layout/shape-layout-controller'
import ShapeLifecycleController from './lifecycle/shape-lifecycle-controller'
import ShapeMutationController from './mutation/shape-mutation-controller'
import {
  registerShapeGroup,
  ShapeGroupObject
} from './domain/shape-group'
import {
  getShapeNodes
} from './domain/shape-nodes'
import {
  isShapeGroup
} from './domain/shape-reference'
import {
  applyShapeGroupInteractivity,
  detachShapeGroupAutoLayout,
  prepareShapeTextNode
} from './domain/shape-runtime'
import {
  ShapeAddedPayload,
  ShapeAddOptions,
  ShapeGroup,
  ShapeGroupLike,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapePaddingChangeMap,
  ShapePreset,
  ShapeReference,
  ShapeStrokeOptions,
  ShapeTextAlignOptions,
  ShapeTextStyleOptions,
  ShapeTextNode,
  ShapeUpdateOptions,
  ShapeVerticalAlign,
  ShapeVisualStyle
} from './types'

/**
 * Пара размеров shape-группы в текущем layout-контракте.
 */
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
   * Контроллер layout- и размерной логики shape-композиций.
   */
  private layoutController: ShapeLayoutController

  /**
   * Контроллер публичных мутаций shape-композиций.
   */
  private mutationController: ShapeMutationController

  /**
   * Контроллер canvas-событий и editing/scaling lifecycle для shape-композиций.
   */
  private eventController: ShapeEventController

  /**
   * Текстовые узлы, которые ShapeManager обновляет сам и уже синхронизирует вручную.
   */
  private internalTextUpdates: WeakSet<ShapeTextNode>

  /**
   * Инициализирует manager и связывает фасад с lifecycle/layout/mutation контроллерами.
   */
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
    this.layoutController = new ShapeLayoutController({
      editor: this.editor
    })
    this.mutationController = new ShapeMutationController({
      runtime: {
        editor: this.editor,
        lifecycleController: this.lifecycleController,
        editingPlacements: this.editingPlacements,
        resolveShapeGroup: (params) => this._resolveShapeGroup(params),
        resolveCurrentDimensions: (params) => this._resolveCurrentDimensions(params),
        resolveManualDimensions: (params) => this._resolveManualDimensions(params),
        resolveReplaceBoxDimensions: (params) => this._resolveReplaceBoxDimensions(params),
        resolveGroupUserPadding: (params) => this._resolveGroupUserPadding(params),
        isShapeTextAutoExpandEnabled: (params) => this._isShapeTextAutoExpandEnabled(params),
        resolveShapeStyle,
        resolveCurrentTextStyle: (params) => this._resolveCurrentTextStyle(params),
        createTextNode: (params) => this._createTextNode(params),
        applyTextUpdates: (params) => this._applyTextUpdates(params),
        hasShapeTextSizeAffectingStyleChanges: (params) => this._hasShapeTextSizeAffectingStyleChanges(params),
        resolveShapeLayoutWidth: (params) => this._resolveShapeLayoutWidth(params),
        applyShapeGroupMetadata: (params) => this._applyShapeGroupMetadata(params),
        applyCurrentLayout: (params) => this._applyCurrentLayout(params),
        resolveShapeTextHorizontalAlign: (params) => this._resolveShapeTextHorizontalAlign(params),
        detachShapeGroupAutoLayout: (params) => this._detachShapeGroupAutoLayout(params),
        resolveAspectRatioFittedDimensions: (params) => this._resolveAspectRatioFittedDimensions(params),
        beginMutation: () => this._beginMutation(),
        endMutation: (params) => this._endMutation(params),
        isOnCanvas: (params) => this._isOnCanvas(params)
      }
    })
    this.internalTextUpdates = new WeakSet()
    this.eventController = new ShapeEventController({
      runtime: {
        editor: this.editor,
        scalingController: this.scalingController,
        editingController: this.editingController,
        lifecycleController: this.lifecycleController,
        editingPlacements: this.editingPlacements,
        internalTextUpdates: this.internalTextUpdates,
        collectShapeGroupsFromTarget: (params) => this._collectShapeGroupsFromTarget(params),
        detachShapeGroupAutoLayout: (params) => this._detachShapeGroupAutoLayout(params),
        syncShapeTextLayoutAfterTextMutation: (params) => this._syncShapeTextLayoutAfterTextMutation(params)
      }
    })

    this.eventController.bind()
  }

  /**
   * Добавляет shape-композицию (фигура + текст) по presetKey.
   * По умолчанию width/height трактуются как точный итоговый размер фигуры
   * и могут растянуть preset относительно его исходных пропорций.
   * `preserveAspectRatio=true` переключает add-path в режим fit по пропорциям preset:
   * одна переданная ось остаётся точной, а вторая вычисляется из aspect ratio;
   * если переданы обе оси, фигура вписывается в этот box с сохранением пропорций.
   * Если при этом включен shapeTextAutoExpand и тексту нужно больше места,
   * финальный размер может вырасти относительно переданного box.
   * При shapeTextAutoExpand=true ручная базовая ширина остается нижней границей,
   * но текущий размер может стать больше неё, если этого требует текст.
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
      left,
      top,
      originX,
      originY,
      withoutAdding,
      withoutSelection,
      withoutSave
    } = options

    const group = await this._createShapeGroupForAdd({
      basePreset,
      options
    })
    const addedPayload: ShapeAddedPayload = {
      shape: group,
      presetKey: group.shapePresetKey ?? basePreset.key,
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
   * Создает готовую shape-группу для add() до placement и добавления на canvas.
   */
  private async _createShapeGroupForAdd({
    basePreset,
    options
  }: {
    basePreset: ShapePreset
    options: ShapeAddOptions
  }): Promise<ShapeGroup> {
    const {
      width: rawWidth,
      height: rawHeight,
      preserveAspectRatio,
      shapeTextAutoExpand,
      text,
      textStyle,
      alignH,
      alignV,
      textPadding,
      rounding,
      id
    } = options
    const requestedRounding = normalizeShapeRounding({ rounding })

    const effectivePresetKey = resolvePresetKeyForRounding({
      preset: basePreset,
      rounding: requestedRounding
    })

    const effectivePreset = getShapePreset({
      presetKey: effectivePresetKey
    }) ?? basePreset
    const presetCanRound = isShapePresetRoundable({
      preset: effectivePreset
    })
    const effectiveRounding = presetCanRound ? requestedRounding : 0
    const {
      width: presetWidth,
      height: presetHeight
    } = effectivePreset

    const shouldPreserveAspectRatio = Boolean(preserveAspectRatio)

    let manualWidth = Math.max(1, rawWidth ?? presetWidth)
    let manualHeight = Math.max(1, rawHeight ?? presetHeight)

    // Явные размеры от пользователя становятся стабильным box для replace.
    // Автоматический рост из-за текста не должен расширять replaceBox.
    const replaceBoxWidth = rawWidth !== undefined
      ? Math.max(1, rawWidth)
      : undefined
    const replaceBoxHeight = rawHeight !== undefined
      ? Math.max(1, rawHeight)
      : undefined

    if (shouldPreserveAspectRatio) {
      const fittedDimensions = this._resolveAspectRatioFittedDimensions({
        targetWidth: replaceBoxWidth,
        targetHeight: replaceBoxHeight,
        aspectWidth: presetWidth,
        aspectHeight: presetHeight
      })

      manualWidth = fittedDimensions.width
      manualHeight = fittedDimensions.height
    }

    const isShapeTextAutoExpandEnabled = shapeTextAutoExpand !== false

    const horizontalAlign = this._resolveHorizontalAlign({
      explicitAlign: alignH,
      textStyle
    })

    const verticalAlign = alignV ?? SHAPE_DEFAULT_VERTICAL_ALIGN

    const style = resolveShapeStyle({
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

    let initialWidth = manualWidth

    if (!shouldPreserveAspectRatio) {
      initialWidth = this._resolveShapeLayoutWidth({
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
    }

    const shape = await createShapeNode({
      preset: effectivePreset,
      width: initialWidth,
      height: manualHeight,
      style,
      rounding: effectiveRounding
    })

    return this._createShapeGroup({
      id: id ?? `shape-${nanoid()}`,
      presetKey: effectivePreset.key,
      presetCanRound,
      shape,
      text: textNode,
      width: initialWidth,
      height: manualHeight,
      manualWidth,
      manualHeight,
      replaceBoxWidth,
      replaceBoxHeight,
      preserveAspectRatio: shouldPreserveAspectRatio,
      shapeTextAutoExpand: isShapeTextAutoExpandEnabled,
      alignH: horizontalAlign,
      alignV: verticalAlign,
      padding: userPadding,
      internalShapeTextInset,
      resolveInternalShapeTextInset,
      changedPadding,
      style,
      rounding: effectiveRounding
    })
  }

  /**
   * Обновляет пресет фигуры у существующей shape-группы с сохранением текста и трансформаций.
   * При shapeTextAutoExpand=true явная width обновляет ручную базовую ширину,
   * а текущая ширина сразу пересчитывается по тексту относительно этой базы.
   * При replace с новым presetKey по умолчанию не сохраняет текущий aspect ratio группы:
   * новая фигура вписывается в текущий replacement box и дальше получает итоговый размер
   * через общий layout с пропорциями своего пресета. При выключенном
   * shapeTextAutoExpand текст может переноситься, но итоговый размер всё равно
   * сохраняет эти пропорции. Этот итоговый размер становится новой базой фигуры
   * для последующих text-layout перерасчётов.
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
    return this.mutationController.update({
      target,
      presetKey,
      options
    })
  }

  /**
   * Вписывает размеры в целевой box с сохранением пропорций пресета.
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
    return this.layoutController.resolveAspectRatioFittedDimensions({
      targetWidth,
      targetHeight,
      aspectWidth,
      aspectHeight
    })
  }

  /**
   * Удаляет shape-группу, если target существует и не заблокирован.
   */
  public remove({
    target,
    withoutSave
  }: {
    target?: ShapeReference
    withoutSave?: boolean
  } = {}): boolean {
    return this.mutationController.remove({
      target,
      withoutSave
    })
  }

  /**
   * Обновляет заливку shape-узла у выбранной группы.
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
    return this.mutationController.setFill({
      target,
      fill,
      withoutSave
    })
  }

  /**
   * Обновляет stroke-параметры фигуры у выбранной группы.
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
    return this.mutationController.setStroke({
      target,
      stroke,
      strokeWidth,
      dash,
      withoutSave
    })
  }

  /**
   * Обновляет opacity фигуры и, при необходимости, вложенного текста.
   */
  public setOpacity({
    target,
    opacity,
    applyToText = true,
    withoutSave
  }: {
    target?: ShapeReference
    opacity: number
    applyToText?: boolean
    withoutSave?: boolean
  }): ShapeGroup | null {
    return this.mutationController.setOpacity({
      target,
      opacity,
      applyToText,
      withoutSave
    })
  }

  /**
   * Возвращает текстовый узел выбранной shape-группы.
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
   * Обновляет стиль текста внутри shape-группы без смены shape-параметров.
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
    return this.mutationController.updateTextStyle({
      target,
      style,
      withoutSave
    })
  }

  /**
   * Обновляет горизонтальное и вертикальное выравнивание текста внутри фигуры.
   */
  public setTextAlign({
    target,
    horizontal,
    vertical,
    withoutSave
  }: {
    target?: ShapeReference
  } & ShapeTextAlignOptions): ShapeGroup | null {
    return this.mutationController.setTextAlign({
      target,
      horizontal,
      vertical,
      withoutSave
    })
  }

  /**
   * Нормализует rounding и делегирует изменение в общий update path.
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
    return this.mutationController.setRounding({
      target,
      rounding,
      withoutSave
    })
  }

  /**
   * Материализует rehydrated shape-группу обратно в канонический layout-контракт.
   */
  public commitRehydratedShapeLayout({
    target,
    textScale = 1,
    shapeTextAutoExpand
  }: {
    target?: ShapeReference
    textScale?: number
    shapeTextAutoExpand?: boolean
  }): boolean {
    return this.mutationController.commitRehydratedShapeLayout({
      target,
      textScale,
      shapeTextAutoExpand
    })
  }

  /**
   * Снимает подписки ShapeManager на canvas-события.
   */
  public destroy(): void {
    this.eventController.destroy()
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
    replaceBoxWidth,
    replaceBoxHeight,
    preserveAspectRatio,
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
    replaceBoxWidth?: number
    replaceBoxHeight?: number
    preserveAspectRatio?: boolean
    shapeTextAutoExpand: boolean
    alignH: ShapeHorizontalAlign
    alignV: ShapeVerticalAlign
    padding: ShapePadding
    internalShapeTextInset?: ShapePadding
    resolveInternalShapeTextInset?: (dimensions: {
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
      replaceBoxWidth,
      replaceBoxHeight,
      shapeTextAutoExpand,
      alignH,
      alignV,
      padding,
      style,
      rounding
    })

    group.rehydrateRuntimeState()

    applyShapeGroupInteractivity({ group })
    prepareShapeTextNode({ text })
    const montageAreaWidth = preserveAspectRatio
      ? this._resolveMontageAreaWidth()
      : undefined

    applyShapeTextLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      padding,
      shapeTextAutoExpandEnabled: shapeTextAutoExpand,
      preserveAspectRatio,
      internalShapeTextInset,
      resolveInternalShapeTextInset,
      montageAreaWidth,
      changedPadding
    })

    if (preserveAspectRatio) {
      group.shapeManualBaseWidth = Math.max(
        1,
        group.shapeBaseWidth ?? width
      )
      group.shapeManualBaseHeight = Math.max(
        1,
        group.shapeBaseHeight ?? height
      )
    }

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
    const normalizedRounding = presetCanRound
      ? normalizeShapeRounding({ rounding })
      : 0

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
      shapeRounding: normalizedRounding,
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
    align,
    syncLineStylesWithText
  }: {
    textNode: ShapeTextNode
    text?: string
    textStyle?: ShapeTextStyleOptions
    align?: ShapeHorizontalAlign
    syncLineStylesWithText?: boolean
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
        emitLifecycleEvents: false,
        syncLineStylesWithText
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
    return this.layoutController.resolveCurrentDimensions({ group })
  }

  /**
   * Возвращает ручные базовые размеры группы до auto-expand и runtime-scale.
   */
  private _resolveManualDimensions({ group }: { group: ShapeGroupLike }): ShapeGroupDimensions {
    return this.layoutController.resolveManualDimensions({ group })
  }

  /**
   * Возвращает replacement box, который используется при замене пресета.
   */
  private _resolveReplaceBoxDimensions({ group }: { group: ShapeGroupLike }): ShapeGroupDimensions {
    return this.layoutController.resolveReplaceBoxDimensions({ group })
  }

  /**
   * Возвращает только пользовательский padding shape-группы без внутренних inset-ов пресета.
   */
  private _resolveGroupUserPadding({ group }: { group: ShapeGroupLike }): ShapePadding {
    return this.layoutController.resolveGroupUserPadding({ group })
  }

  /**
   * Возвращает внутренний inset между shape-контуром и текстом для заданных размеров.
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
    return this.layoutController.resolveGroupInternalShapeTextInset({
      group,
      width,
      height
    })
  }

  /**
   * Проверяет, включён ли shape-level auto-expand текста у группы.
   */
  private _isShapeTextAutoExpandEnabled({ group }: { group: ShapeGroupLike }): boolean {
    return this.layoutController.isShapeTextAutoExpandEnabled({ group })
  }

  /**
   * Возвращает доступную ширину монтажной области для layout с сохранением пропорций.
   */
  private _resolveMontageAreaWidth(): number | null {
    return this.layoutController.resolveMontageAreaWidth()
  }

  /**
   * Рассчитывает auto-expand ширину shape-группы для текущего текста и padding.
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
    return this.layoutController.resolveShapeLayoutWidth({
      text,
      currentWidth,
      manualWidth: minimumWidth,
      shapeTextAutoExpandEnabled: true,
      padding,
      resolvePaddingForWidth
    })
  }

  /**
   * Возвращает итоговую width shape-layout с учётом auto-expand и ручной базы.
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
    return this.layoutController.resolveShapeLayoutWidth({
      text,
      currentWidth,
      manualWidth,
      shapeTextAutoExpandEnabled,
      padding,
      resolvePaddingForWidth
    })
  }

  /**
   * Разрешает горизонтальное выравнивание текста внутри shape-группы.
   */
  private _resolveShapeTextHorizontalAlign({
    group,
    textStyle
  }: {
    group: ShapeGroupLike
    textStyle?: ShapeTextStyleOptions
  }): ShapeHorizontalAlign {
    return this.layoutController.resolveShapeTextHorizontalAlign({
      group,
      textStyle
    })
  }

  /**
   * Применяет текущий layout shape-группы через выделенный layout controller.
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
    this.layoutController.applyCurrentLayout({
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
      expandShapeHeightToFitText,
      changedPadding
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
