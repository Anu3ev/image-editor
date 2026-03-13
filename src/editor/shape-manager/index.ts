import {
  FabricObject,
  Group,
  Textbox
} from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'
import type { TextStyleOptions } from '../text-manager'
import {
  DEFAULT_SHAPE_PRESET_KEY,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN,
  getShapePreset,
  isShapePresetRoundable,
  resolvePresetKeyForRounding,
  resolveShapePadding
} from './shape-presets'
import {
  applyShapeStyle,
  createShapeNode
} from './shape-factory'
import {
  applyShapeTextLayout,
  resolveGroupCenterPoint
} from './shape-layout'
import ShapeScalingController from './shape-scaling'
import ShapeEditingController from './shape-editing'
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
  ShapeAddOptions,
  ShapeGroup,
  ShapeGroupLike,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapeStrokeOptions,
  ShapeTextAlignOptions,
  ShapeTextNode,
  ShapeUpdateOptions,
  ShapeVerticalAlign,
  ShapeVisualStyle
} from './types'

type ShapeReference = ShapeGroup | FabricObject | string | null | undefined

const DEFAULT_SHAPE_FILL = '#B0B5BF'

const DEFAULT_SHAPE_STROKE_WIDTH = 0

const DEFAULT_SHAPE_OPACITY = 1

type ShapeCanvasEvent = {
  target?: FabricObject | null
  e?: Event | MouseEvent
  subTargets?: FabricObject[]
  transform?: import('fabric').Transform | null
}

type ShapeGroupCenter = {
  x: number
  y: number
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
   * Центры shape-групп на время редактирования текста.
   */
  private editingCenters: WeakMap<ShapeGroup, ShapeGroupCenter>

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    registerShapeGroup()
    this.scalingController = new ShapeScalingController({
      canvas: editor.canvas
    })
    this.editingController = new ShapeEditingController({
      canvas: editor.canvas
    })
    this.editingCenters = new WeakMap()

    this._bindEvents()
  }

  /**
   * Добавляет shape-композицию (фигура + текст) по presetKey.
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
      left,
      top,
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

    const width = Math.max(1, rawWidth ?? effectivePreset.width)
    const height = Math.max(1, rawHeight ?? effectivePreset.height)

    const horizontalAlign = this._resolveHorizontalAlign({
      explicitAlign: alignH,
      textStyle
    })

    const verticalAlign = alignV ?? SHAPE_DEFAULT_VERTICAL_ALIGN

    const padding = resolveShapePadding({
      preset: effectivePreset,
      overridePadding: textPadding
    })

    const style = this._resolveShapeStyle({
      options,
      fallback: null
    })

    const shape = await createShapeNode({
      preset: effectivePreset,
      width,
      height,
      style,
      rounding
    })

    const textNode = this._createTextNode({
      text,
      textStyle,
      width,
      align: horizontalAlign,
      opacity: style.opacity
    })

    const group = this._createShapeGroup({
      id: id ?? `shape-${nanoid()}`,
      presetKey: effectivePreset.key,
      presetCanRound: isShapePresetRoundable({
        preset: effectivePreset
      }),
      shape,
      text: textNode,
      width,
      height,
      alignH: horizontalAlign,
      alignV: verticalAlign,
      padding,
      style,
      rounding
    })

    const center = resolveGroupCenterPoint({
      left,
      top,
      canvasCenter: this.editor.canvas.getCenterPoint()
    })

    group.setPositionByOrigin(center, 'center', 'center')
    group.setCoords()

    if (withoutAdding) return group

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

    return group
  }

  /**
   * Обновляет пресет фигуры у существующей shape-группы с сохранением текста и трансформаций.
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
      width: rawWidth,
      height: rawHeight,
      text,
      textStyle,
      alignH,
      alignV,
      textPadding,
      rounding,
      withoutSelection,
      withoutSave
    } = options

    const currentDimensions = this._resolveCurrentDimensions({
      group: currentGroup
    })

    const width = Math.max(1, rawWidth ?? currentDimensions.width)
    const height = Math.max(1, rawHeight ?? currentDimensions.height)

    const effectiveRounding = rounding ?? currentGroup.shapeRounding ?? 0
    const effectivePresetKey = resolvePresetKeyForRounding({
      preset: basePreset,
      rounding: effectiveRounding
    })

    const effectivePreset = getShapePreset({
      presetKey: effectivePresetKey
    }) ?? basePreset

    const horizontalAlign = alignH
      ?? currentGroup.shapeAlignHorizontal
      ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN

    const verticalAlign = alignV
      ?? currentGroup.shapeAlignVertical
      ?? SHAPE_DEFAULT_VERTICAL_ALIGN

    const currentPadding = this._resolveGroupPadding({
      group: currentGroup
    })

    const paddingOverride = textPadding ?? currentPadding

    const padding = resolveShapePadding({
      preset: effectivePreset,
      overridePadding: paddingOverride
    })

    const style = this._resolveShapeStyle({
      options,
      fallback: currentGroup
    })
    const manualWidth = Math.max(1, rawWidth ?? currentGroup.shapeManualBaseWidth ?? width)
    const manualHeight = Math.max(1, rawHeight ?? currentGroup.shapeManualBaseHeight ?? height)

    const center = currentGroup.getCenterPoint()
    const {
      id,
      angle = 0,
      customData,
      evented = true,
      flipX = false,
      flipY = false,
      lockMovementX = false,
      lockMovementY = false,
      lockRotation = false,
      lockScalingX = false,
      lockScalingY = false,
      lockSkewingX = false,
      lockSkewingY = false,
      locked = false,
      selectable = true
    } = currentGroup

    const { text: currentTextNode } = getShapeNodes({
      group: currentGroup
    })

    if (!currentTextNode) return null

    const detachedObjects = currentGroup.removeAll() as ShapeNode[]
    const existingTextNode = this._findTextNode({
      objects: detachedObjects,
      fallback: currentTextNode
    })

    if (!existingTextNode) return null

    existingTextNode.set({
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
    })

    this._applyTextUpdates({
      textNode: existingTextNode,
      text,
      textStyle,
      align: horizontalAlign
    })

    const shape = await createShapeNode({
      preset: effectivePreset,
      width,
      height,
      style,
      rounding: effectiveRounding
    })

    const updatedGroup = this._createShapeGroup({
      id: id ?? `shape-${nanoid()}`,
      presetKey: effectivePreset.key,
      presetCanRound: isShapePresetRoundable({
        preset: effectivePreset
      }),
      shape,
      text: existingTextNode,
      width,
      height,
      manualWidth,
      manualHeight,
      alignH: horizontalAlign,
      alignV: verticalAlign,
      padding,
      style,
      rounding: effectiveRounding
    })

    updatedGroup.set({
      angle,
      customData,
      evented,
      flipX,
      flipY,
      lockMovementX,
      lockMovementY,
      lockRotation,
      lockScalingX,
      lockScalingY,
      lockSkewingX,
      lockSkewingY,
      locked,
      selectable
    })

    updatedGroup.setPositionByOrigin(center, 'center', 'center')
    updatedGroup.setCoords()

    const wasOnCanvas = this._isOnCanvas({ object: currentGroup })

    if (!wasOnCanvas) return updatedGroup

    this._beginMutation()

    try {
      this.editor.canvas.remove(currentGroup)
      this.editor.canvas.add(updatedGroup)

      if (!withoutSelection) {
        this.editor.canvas.setActiveObject(updatedGroup)
      }

      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    return updatedGroup
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

    this._beginMutation()

    try {
      applyShapeStyle({
        shape,
        style: { fill }
      })

      group.shapeFill = fill
      group.setCoords()
      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    return group
  }

  /**
   * Обновляет параметры обводки фигуры.
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
        this._applyCurrentLayout({
          group,
          shape,
          text
        })
      }

      group.setCoords()
      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    return group
  }

  /**
   * Обновляет прозрачность фигуры.
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
      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

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
   * Обновляет стиль текста внутри shape-группы и пересчитывает layout композиции.
   */
  public updateTextStyle({
    target,
    style = {},
    withoutSave
  }: {
    target?: ShapeReference
    style?: TextStyleOptions
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
    const center = group.getCenterPoint()
    const alignH = style.align === 'left' || style.align === 'center' || style.align === 'right'
      ? style.align
      : group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN

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
        center: {
          x: center.x,
          y: center.y
        },
        width: manualDimensions.width,
        height: manualDimensions.height,
        alignH
      })

      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    return group
  }

  /**
   * Обновляет горизонтальное и вертикальное выравнивание текста внутри shape-группы.
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

    const padding = this._resolveGroupPadding({ group })

    this._beginMutation()

    try {
      this._applyTextUpdates({
        textNode: text,
        align: alignH
      })

      applyShapeTextLayout({
        group,
        shape,
        text,
        width: dimensions.width,
        height: dimensions.height,
        alignH,
        alignV,
        padding
      })

      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

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
    canvas.off('text:editing:entered', this._handleTextEditingEntered)
    canvas.off('text:editing:exited', this._handleTextEditingExited)
    canvas.off('text:changed', this._handleTextChanged)
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
    canvas.on('text:editing:entered', this._handleTextEditingEntered)
    canvas.on('text:editing:exited', this._handleTextEditingExited)
    canvas.on('text:changed', this._handleTextChanged)
  }

  /**
   * Обработчик масштабирования объектов.
   */
  private _handleObjectScaling = (
    event: ShapeCanvasEvent
  ): void => {
    this.scalingController.handleObjectScaling(event)
  }

  /**
   * Обработчик завершения трансформации объектов.
   */
  private _handleObjectModified = (
    event: ShapeCanvasEvent
  ): void => {
    this.scalingController.handleObjectModified(event)
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
    this.editingController.handleMouseDown(event)
  }

  /**
   * Обработчик выхода из режима редактирования текста.
   */
  private _handleTextEditingExited = (
    event: ShapeCanvasEvent
  ): void => {
    const { target } = event
    if (target instanceof Textbox) {
      const textNode = target as ShapeTextNode
      const { group } = textNode
      if (isShapeGroup(group)) {
        this.editingCenters.delete(group)
      }
    }

    this.editingController.handleTextEditingExited(event)
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

        const center = group.getCenterPoint()
        this.editingCenters.set(group, {
          x: center.x,
          y: center.y
        })
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

    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) return

    this._detachShapeGroupAutoLayout({
      group
    })
    const center = this._resolveEditingCenter({
      group
    })
    const manualDimensions = this._resolveManualDimensions({
      group
    })

    this._applyCurrentLayout({
      group,
      shape,
      text,
      center,
      width: manualDimensions.width,
      height: manualDimensions.height
    })

    this.editor.canvas.requestRenderAll()
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
    alignH,
    alignV,
    padding,
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
    alignH: ShapeHorizontalAlign
    alignV: ShapeVerticalAlign
    padding: ShapePadding
    style: ShapeVisualStyle
    rounding?: number
  }): ShapeGroup {
    const group = new ShapeGroupObject([shape, text], {
      id,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
      lockScalingFlip: true,
      centeredScaling: false,
      objectCaching: false
    }) as ShapeGroup

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
      padding
    })

    this._detachShapeGroupAutoLayout({
      group
    })

    return group
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
    textStyle?: TextStyleOptions
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
      withoutSelection: true
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
    textStyle?: TextStyleOptions
    align?: ShapeHorizontalAlign
  }): void {
    const styleUpdates: TextStyleOptions = {}

    if (textStyle) {
      const keys = Object.keys(textStyle) as Array<keyof TextStyleOptions>

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

    this.editor.textManager.updateText({
      target: textNode,
      style: styleUpdates,
      skipRender: true,
      withoutSave: true
    })

    textNode.autoExpand = false
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
   * Возвращает текущие отступы текстовой области shape-группы.
   */
  private _resolveGroupPadding({ group }: { group: ShapeGroupLike }): ShapePadding {
    return {
      top: group.shapePaddingTop ?? 0.2,
      right: group.shapePaddingRight ?? 0.2,
      bottom: group.shapePaddingBottom ?? 0.2,
      left: group.shapePaddingLeft ?? 0.2
    }
  }

  /**
   * Применяет актуальный layout для shape-группы.
   */
  private _applyCurrentLayout({
    group,
    shape,
    text,
    center,
    width,
    height,
    alignH,
    alignV
  }: {
    group: ShapeGroupLike
    shape: ShapeNode
    text: ShapeTextNode
    center?: ShapeGroupCenter
    width?: number
    height?: number
    alignH?: ShapeHorizontalAlign
    alignV?: ShapeVerticalAlign
  }): void {
    const dimensions = this._resolveCurrentDimensions({ group })
    const resolvedWidth = Math.max(1, width ?? dimensions.width)
    const resolvedHeight = Math.max(1, height ?? dimensions.height)
    const padding = this._resolveGroupPadding({ group })
    const currentCenter = group.getCenterPoint()
    const stableCenter = center ?? {
      x: currentCenter.x,
      y: currentCenter.y
    }

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: resolvedWidth,
      height: resolvedHeight,
      alignH: alignH ?? group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
      alignV: alignV ?? group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
      padding
    })

    group.set({
      left: stableCenter.x,
      top: stableCenter.y
    })
    group.setCoords()
  }

  /**
   * Возвращает стабильный центр группы для текущего редактирования текста.
   */
  private _resolveEditingCenter({ group }: { group: ShapeGroup }): ShapeGroupCenter {
    const storedCenter = this.editingCenters.get(group)
    if (storedCenter) return storedCenter

    const center = group.getCenterPoint()
    return {
      x: center.x,
      y: center.y
    }
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
    textStyle?: TextStyleOptions
  }): ShapeHorizontalAlign {
    if (explicitAlign) return explicitAlign

    const alignFromTextStyle = textStyle?.align
    if (alignFromTextStyle === 'left' || alignFromTextStyle === 'center' || alignFromTextStyle === 'right') {
      return alignFromTextStyle
    }

    return SHAPE_DEFAULT_HORIZONTAL_ALIGN
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
   * Возвращает текстовый узел из массива объектов.
   */
  private _findTextNode({
    objects,
    fallback
  }: {
    objects: ShapeNode[]
    fallback?: ShapeTextNode | null
  }): ShapeTextNode | null {
    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index]
      if (object instanceof Textbox) {
        return object as ShapeTextNode
      }
    }

    if (fallback instanceof Textbox) {
      return fallback as ShapeTextNode
    }

    return null
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
        if (object.id === target && isShapeGroup(object)) {
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
