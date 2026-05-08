import {
  Canvas,
  FabricObject,
  Point,
  Textbox,
  util
} from 'fabric'
import type {
  BasicTransformEvent,
  TextboxProps,
  TPointerEvent,
  Transform
} from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'
import type { ObjectPlacement } from '../canvas-manager'
import { TEXT_EDITING_DEBOUNCE_MS } from '../constants'
import type { EditorFontDefinition } from '../types/font'
import {
  BackgroundTextbox,
  registerBackgroundTextbox
} from './background-textbox'
import TextUpdateController from './text-update-controller'
import {
  DIMENSION_EPSILON
} from './constants'
import TextScalingController from './scaling/text-scaling'
import {
  syncLineFontDefaultsAfterTextChange
} from './line-defaults'
import {
  clampTextboxToMontage,
  getLongestLineWidth,
  getTextboxContentPlacement,
  roundTextboxDimensions
} from './geometry'
import type {
  EditorTextbox,
  TextCreationFlags,
  TextReference,
  TextStyleOptions,
  TextboxSnapshot,
  UpdateOptions
} from './types'
import {
  resolveStrokeColor,
  resolveStrokeWidth,
  toUpperCaseSafe
} from '../utils/text'

export type { TextStyleOptions } from './types'

/**
 * Базовый event-контракт TextManager для событий с текстовым target.
 */
type TextManagerTargetEvent = {
  target?: EditorTextbox | FabricObject | null
}

/**
 * Transform-event Fabric, расширенный target-контрактом TextManager.
 */
type TextManagerTransformEvent = BasicTransformEvent<TPointerEvent> & TextManagerTargetEvent & {
  e?: TPointerEvent | null
  transform?: Transform | null
}

/**
 * Менеджер текста для редактора.
 * Управляет добавлением и обновлением текстовых объектов, а также синхронизацией размера шрифта при трансформациях.
 */
export default class TextManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Ссылка на Canvas fabric.
   */
  private canvas: Canvas

  /**
   * Список доступных шрифтов, переданных при инициализации редактора.
   */
  public fonts: EditorFontDefinition[]

  /**
   * Контроллер масштабирования standalone-textbox.
   */
  private scalingController: TextScalingController

  /**
   * Контроллер программного обновления standalone-textbox.
   */
  private updateController: TextUpdateController

  /**
   * Placement текстового объекта на момент входа в редактирование.
   */
  private editingPlacementState?: WeakMap<EditorTextbox, ObjectPlacement>

  /**
   * Флаг, указывающий что текст находится в режиме редактирования или недавно вышел из него.
   * Используется для предотвращения сохранения состояния с временными lock-свойствами.
   */
  public isTextEditingActive: boolean

  /**
   * Инициализирует manager и связывает фасад с text update/scaling контроллерами.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.fonts = editor.options.fonts ?? []
    this.scalingController = new TextScalingController({
      canvas: editor.canvas,
      canvasManager: editor.canvasManager,
      persistScaledTextbox: ({ target, style }) => {
        this.updateText({
          target,
          style
        })
      }
    })
    this.updateController = new TextUpdateController({
      runtime: {
        canvas: this.canvas,
        canvasManager: editor.canvasManager,
        historyManager: editor.historyManager,
        resolveTextObject: (reference) => this._resolveTextObject(reference),
        normalizeTextboxAfterContentChange: (params) => this._normalizeTextboxAfterContentChange(params),
        restoreTextboxContentPlacement: (params) => this._restoreTextboxContentPlacement(params),
        syncLineStylesWithText: (params) => this._syncLineStylesWithText(params),
        getSnapshot: (textbox) => TextManager._getSnapshot(textbox)
      }
    })
    this.editingPlacementState = new WeakMap()
    this.isTextEditingActive = false

    this._bindEvents()
    registerBackgroundTextbox()
  }

  /**
   * Добавляет новый текстовый объект на канвас.
   * Если `left/top` не переданы, объект визуально центрируется в монтажной области.
   * Если координаты переданы, placement трактуется через `left/top + originX/originY`.
   * `emitLifecycleEvents=false` отключает editor-level lifecycle события
   * для внутренних materialization-path без изменения самого create-контракта.
   * @param options — настройки текста
   * @param flags — флаги поведения
   */
  public addText(
    {
      id = `background-textbox-${nanoid()}`,
      text = 'Новый текст',
      autoExpand = true,
      fontFamily,
      fontSize = 48,
      bold = false,
      italic = false,
      underline = false,
      uppercase = false,
      strikethrough = false,
      align = 'left',
      color = '#000000',
      strokeColor,
      strokeWidth = 0,
      opacity = 1,
      backgroundColor,
      backgroundOpacity = 1,
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      radiusTopLeft = 0,
      radiusTopRight = 0,
      radiusBottomRight = 0,
      radiusBottomLeft = 0,
      ...rest
    }: TextStyleOptions = {},
    {
      withoutSelection = false,
      withoutSave = false,
      withoutAdding = false,
      emitLifecycleEvents = true
    }: TextCreationFlags = {}
  ): EditorTextbox {
    const {
      canvasManager,
      historyManager
    } = this.editor
    const { canvas } = this
    historyManager.suspendHistory()

    const resolvedFontFamily = fontFamily ?? this._getDefaultFontFamily()

    const resolvedStrokeWidth = resolveStrokeWidth({ width: strokeWidth })
    const resolvedStrokeColor = resolveStrokeColor({
      strokeColor,
      width: resolvedStrokeWidth
    })
    const resolvedFontWeight: TextboxProps['fontWeight'] = bold ? 'bold' : 'normal'
    const resolvedFontStyle: TextboxProps['fontStyle'] = italic ? 'italic' : 'normal'

    const finalOptions = {
      id,
      fontFamily: resolvedFontFamily,
      fontSize,
      fontWeight: resolvedFontWeight,
      fontStyle: resolvedFontStyle,
      underline,
      uppercase,
      linethrough: strikethrough,
      textAlign: align,
      fill: color,
      stroke: resolvedStrokeColor,
      strokeWidth: resolvedStrokeWidth,
      strokeUniform: true,
      opacity,
      backgroundColor,
      backgroundOpacity,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      radiusTopLeft,
      radiusTopRight,
      radiusBottomRight,
      radiusBottomLeft,
      ...rest
    }

    const textbox = new BackgroundTextbox(text, finalOptions)
    const isAutoExpandEnabled = autoExpand !== false
    textbox.autoExpand = isAutoExpandEnabled
    const hasExplicitPlacement = rest.left !== undefined || rest.top !== undefined

    // textCaseRaw хранит исходную строку без применения uppercase
    textbox.textCaseRaw = textbox.text ?? ''

    if (uppercase) {
      const uppercased = toUpperCaseSafe({ value: textbox.textCaseRaw })
      if (uppercased !== textbox.text) {
        textbox.set({ text: uppercased })
      }
    }

    const dimensionsRoundedOnCreate = roundTextboxDimensions({ textbox })

    if (dimensionsRoundedOnCreate) {
      textbox.dirty = true
    }

    let placement: ObjectPlacement | undefined

    if (hasExplicitPlacement) {
      placement = canvasManager.resolveObjectPlacement({
        object: textbox,
        left: rest.left,
        top: rest.top,
        originX: rest.originX,
        originY: rest.originY,
        fallbackPoint: canvasManager.getMontageAreaSceneCenter()
      })
    }

    const shouldAutoExpandOnCreate = isAutoExpandEnabled
      && TextManager._hasWrappedLinesBeyondExplicitBreaks(textbox)

    if (hasExplicitPlacement || shouldAutoExpandOnCreate) {
      this._normalizeTextboxAfterContentChange({
        textbox,
        placement,
        shouldAutoExpand: shouldAutoExpandOnCreate,
        clampToMontage: hasExplicitPlacement
      })
    }

    if (!placement) {
      canvasManager.centerObjectToMontageArea({ object: textbox })
    }

    if (!withoutAdding) {
      canvas.add(textbox)
    }

    if (!withoutSelection) {
      canvas.setActiveObject(textbox)
    }

    canvas.requestRenderAll()

    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    if (emitLifecycleEvents) {
      canvas.fire('editor:text-added', {
        textbox,
        options: {
          ...finalOptions,
          text,
          bold,
          italic,
          strikethrough,
          align,
          color,
          strokeColor: resolvedStrokeColor,
          strokeWidth: resolvedStrokeWidth
        },
        flags: {
          withoutSelection: Boolean(withoutSelection),
          withoutSave: Boolean(withoutSave),
          withoutAdding: Boolean(withoutAdding)
        }
      })
    }

    return textbox
  }

  /**
   * Обновляет текстовый объект.
   * @param options — настройки обновления
   * @param options.target — объект, его id или активный объект (если не передан)
   * @param options.style — стиль, который нужно применить
   * `style.left/top/originX/originY` трактуются как placement-контракт объекта в scene coordinates.
   * @param options.withoutSave — не сохранять состояние в историю
   * @param options.skipRender — не вызывать перерисовку канваса
   * @param options.selectionRange — внешний диапазон выделения для применения стилей
   * @param options.emitLifecycleEvents — отключает editor-level lifecycle события
   * для внутренних materialization-path без изменения update-контракта.
   * @param options.syncLineStylesWithText — синхронизирует lineFontDefaults и runtime styles
   * с новым текстом при программном обновлении. По умолчанию включён.
   * @fires editor:before:text-updated
   * @fires editor:text-updated
   */
  public updateText({
    target,
    style = {},
    withoutSave,
    skipRender,
    selectionRange: selectionRangeOverride,
    emitLifecycleEvents = true,
    syncLineStylesWithText = true
  }: UpdateOptions = {}): EditorTextbox | null {
    return this.updateController.updateText({
      target,
      style,
      withoutSave,
      skipRender,
      selectionRange: selectionRangeOverride,
      emitLifecycleEvents,
      syncLineStylesWithText
    })
  }

  /**
   * Преобразует стили из массивного формата Fabric в объектный.
   */
  // eslint-disable-next-line class-methods-use-this
  public stylesFromArray(
    styles: Parameters<typeof util.stylesFromArray>[0],
    text: Parameters<typeof util.stylesFromArray>[1]
  ): ReturnType<typeof util.stylesFromArray> {
    return util.stylesFromArray(styles, text)
  }

  /**
   * Завершает активное редактирование текста перед внешним прерывающим действием.
   * Используется там, где следующее действие должно зафиксировать введённый текст
   * отдельным history-шагом до собственной мутации.
   */
  public exitActiveTextEditing(): boolean {
    const activeObject = this.canvas.getActiveObject()

    if (!TextManager._isTextbox(activeObject)) return false

    if (!activeObject.isEditing) return false

    activeObject.exitEditing()
    this.canvas.requestRenderAll()

    return true
  }

  /**
   * Уничтожает менеджер и снимает слушатели.
   */
  public destroy(): void {
    const { canvas } = this
    canvas.off('object:scaling', this.scalingController.handleObjectScaling)
    canvas.off('object:resizing', this._handleObjectResizing)
    canvas.off('object:modified', this.scalingController.handleObjectModified)
    canvas.off('mouse:move', this.scalingController.handleMouseMove)
    canvas.off('text:editing:exited', this._handleTextEditingExited)
    canvas.off('text:editing:entered', this._handleTextEditingEntered)
    canvas.off('text:changed', this._handleTextChanged)
  }

  /**
   * Запекает текущий transient scale standalone-textbox в каноническую геометрию.
   * После materialization также возвращает standalone-textbox в базовое runtime-состояние.
   * Используется для live-scaling, history/template rehydration и групповых трансформаций.
   */
  public commitStandaloneTextScale(
    {
      target,
      shouldDisableAutoExpandOnHorizontalChange = false
    }: {
      target?: FabricObject | null
      shouldDisableAutoExpandOnHorizontalChange?: boolean
    }
  ): boolean {
    const scaleCommitted = this.scalingController.commitStandaloneTextScale({
      target,
      shouldDisableAutoExpandOnHorizontalChange
    })

    if (!TextManager._isTextbox(target)) return scaleCommitted
    const textbox = target as EditorTextbox
    const group = textbox.group as (FabricObject & {
      shapeComposite?: boolean
    }) | undefined
    if (group?.shapeComposite === true) return scaleCommitted

    const isLocked = Boolean(textbox.locked)

    textbox.set({
      editable: !isLocked,
      evented: true,
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      selectable: true
    })
    textbox.setCoords()

    return scaleCommitted
  }

  /**
   * Возвращает активный текст или ищет по id.
   */
  private _resolveTextObject(reference: TextReference): EditorTextbox | null {
    if (reference instanceof Textbox) return reference

    const { canvas } = this

    if (!reference) {
      const activeObject = canvas.getActiveObject()
      return TextManager._isTextbox(activeObject) ? activeObject : null
    }

    if (typeof reference === 'string') {
      const object = canvas.getObjects()
        .find((item): item is EditorTextbox => TextManager._isTextbox(item) && item.id === reference)

      return object ?? null
    }

    return null
  }

  /**
   * Проверяет, является ли объект текстовым блоком редактора.
   */
  private static _isTextbox(object?: FabricObject | null): object is EditorTextbox {
    return Boolean(object) && object instanceof Textbox
  }

  /**
   * Возвращает true для текстового узла, чей layout и placement принадлежат shape-композиции.
   * Для таких textbox TextManager должен сохранять текстовые семантики,
   * но не применять standalone geometry/placement-логику поверх ShapeManager.
   */
  private static _isShapeOwnedTextbox(object?: FabricObject | null): boolean {
    if (!TextManager._isTextbox(object)) return false

    const group = object.group as (FabricObject & {
      shapeComposite?: boolean
    }) | undefined

    return object.shapeNodeType === 'text' && group?.shapeComposite === true
  }

  /**
   * Возвращает true, если textbox уже на create-path получил лишние переносы
   * относительно явных `\n` и должен сразу получить autoExpand-ширину.
   */
  private static _hasWrappedLinesBeyondExplicitBreaks(textbox: EditorTextbox): boolean {
    const textValue = typeof textbox.text === 'string' ? textbox.text : ''
    if (!textValue.length) return false

    const explicitLineCount = textValue.split('\n').length
    const textboxWithLines = textbox as EditorTextbox & {
      textLines?: string[]
    }
    const { textLines } = textboxWithLines

    return Array.isArray(textLines) && textLines.length > explicitLineCount
  }

  /**
   * Нормализует standalone-геометрию текстового объекта после layout-изменений.
   * При включённом autoExpand пересчитывает ширину по фактической ширине текста.
   * В остальных случаях только округляет размеры и восстанавливает placement.
   */
  private _normalizeTextboxAfterContentChange(
    {
      textbox,
      placement,
      shouldAutoExpand,
      clampToMontage = true
    }: {
      textbox: EditorTextbox
      placement?: ObjectPlacement | null
      shouldAutoExpand: boolean
      clampToMontage?: boolean
    }
  ): boolean {
    let geometryAdjusted = false

    if (shouldAutoExpand) {
      geometryAdjusted = this._autoExpandTextboxWidth(textbox, {
        placement: placement ?? undefined,
        clampToMontage
      })
    }

    let dimensionsRounded = false
    if (!geometryAdjusted) {
      dimensionsRounded = roundTextboxDimensions({ textbox })
    }

    let placementApplied = false
    if (!geometryAdjusted && placement) {
      this.editor.canvasManager.applyObjectPlacement({
        object: textbox,
        placement
      })
      placementApplied = true
    }

    if (geometryAdjusted || dimensionsRounded) {
      textbox.dirty = true
    }

    if (geometryAdjusted || dimensionsRounded || placementApplied) {
      textbox.setCoords()
    }

    return geometryAdjusted || dimensionsRounded
  }

  /**
   * Восстанавливает scene placement внутренней text-area после обновления padding.
   * Это удерживает сам текст на месте, пока меняется только его визуальная оболочка.
   */
  private _restoreTextboxContentPlacement(
    {
      textbox,
      contentPlacement
    }: {
      textbox: EditorTextbox
      contentPlacement: ObjectPlacement
    }
  ): boolean {
    const currentContentPlacement = getTextboxContentPlacement({
      textbox,
      originX: contentPlacement.originX,
      originY: contentPlacement.originY
    })
    const currentCenterPlacement = this.editor.canvasManager.getObjectPlacement({
      object: textbox,
      originX: 'center',
      originY: 'center'
    })
    const deltaX = contentPlacement.left - currentContentPlacement.left
    const deltaY = contentPlacement.top - currentContentPlacement.top

    if (Math.abs(deltaX) <= DIMENSION_EPSILON && Math.abs(deltaY) <= DIMENSION_EPSILON) {
      return false
    }

    const nextCenterPoint = new Point(
      currentCenterPlacement.left + deltaX,
      currentCenterPlacement.top + deltaY
    )
    const textboxWithSetXY = textbox as EditorTextbox & {
      setXY?: (point: Point, originX: 'center', originY: 'center') => void
    }

    if (typeof textboxWithSetXY.setXY === 'function') {
      textboxWithSetXY.setXY(nextCenterPoint, 'center', 'center')
    } else {
      textbox.setPositionByOrigin(nextCenterPoint, 'center', 'center')
    }
    textbox.setCoords()

    return true
  }

  /**
   * Вешает обработчики событий Fabric для работы с текстом.
   */
  private _bindEvents(): void {
    const { canvas } = this
    canvas.on('object:scaling', this.scalingController.handleObjectScaling)
    canvas.on('object:resizing', this._handleObjectResizing)
    canvas.on('object:modified', this.scalingController.handleObjectModified)
    canvas.on('mouse:move', this.scalingController.handleMouseMove)
    canvas.on('text:editing:entered', this._handleTextEditingEntered)
    canvas.on('text:editing:exited', this._handleTextEditingExited)
    canvas.on('text:changed', this._handleTextChanged)
  }

  /**
   * Обработчик входа в режим редактирования текста.
   * Для текста внутри shape-композиций action истории сохраняется,
   * но placement-снимок не создаётся: layout такого узла принадлежит ShapeManager.
   */
  private _handleTextEditingEntered = (event: TextManagerTargetEvent): void => {
    this.isTextEditingActive = true
    const { target } = event
    if (!TextManager._isTextbox(target)) return
    const {
      canvasManager,
      historyManager
    } = this.editor
    historyManager.beginAction({ reason: 'text-edit' })
    target.__lineDefaultsPrevText = target.text ?? ''

    if (TextManager._isShapeOwnedTextbox(target)) return

    const placementState = this._ensureEditingPlacementState()
    placementState.set(target, canvasManager.getObjectPlacement({ object: target }))
  }

  /**
   * Реагирует на изменение текста в режиме редактирования.
   * Для standalone-textbox дополнительно удерживает geometry/placement.
   * Для текста внутри shape-композиций ограничивается текстовыми семантиками,
   * не вмешиваясь в layout, которым владеет ShapeManager.
   */
  private _handleTextChanged = (event: TextManagerTargetEvent): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return

    const isShapeOwnedTextbox = TextManager._isShapeOwnedTextbox(target)
    const { text = '', uppercase, autoExpand } = target
    const isUppercase = Boolean(uppercase)
    const isAutoExpandEnabled = autoExpand !== false
    const normalizedRaw = text.toLocaleLowerCase()
    const placement = isShapeOwnedTextbox
      ? null
      : this.editingPlacementState?.get(target) ?? this.editor.canvasManager.getObjectPlacement({ object: target })

    if (isUppercase) {
      const uppercased = toUpperCaseSafe({ value: normalizedRaw })

      if (uppercased !== text) {
        target.set({ text: uppercased })
      }

      target.textCaseRaw = normalizedRaw
    } else {
      target.textCaseRaw = text
    }

    if (!isShapeOwnedTextbox && autoExpand === undefined) {
      target.autoExpand = true
    }

    if (isShapeOwnedTextbox) {
      this._syncLineStylesWithText({ textbox: target })
      return
    }

    this._normalizeTextboxAfterContentChange({
      textbox: target,
      placement,
      shouldAutoExpand: isAutoExpandEnabled
    })

    this._syncLineStylesWithText({ textbox: target })
  }

  /**
   * Синхронизирует lineFontDefaults и runtime styles после изменения текста.
   */
  private _syncLineStylesWithText({
    textbox,
    previousText,
    currentText
  }: {
    textbox: EditorTextbox
    previousText?: string
    currentText?: string
  }): void {
    const resolvedCurrentText = currentText ?? textbox.text ?? ''
    const resolvedPreviousText = previousText ?? textbox.__lineDefaultsPrevText ?? resolvedCurrentText

    const syncResult = syncLineFontDefaultsAfterTextChange({
      textbox,
      previousText: resolvedPreviousText,
      currentText: resolvedCurrentText
    })

    if (syncResult.lineFontDefaultsChanged) {
      textbox.lineFontDefaults = syncResult.lineFontDefaults
    }

    if (syncResult.stylesChanged) {
      textbox.styles = syncResult.styles
      textbox.dirty = true
    }

    textbox.__lineDefaultsPrevText = resolvedCurrentText
  }

  /**
   * Автоматически увеличивает ширину текстового объекта до ширины текста,
   * но не шире монтажной области. При переданном placement дополнительно
   * восстанавливает placement-контракт и при необходимости удерживает объект
   * в пределах монтажной области.
   */
  private _autoExpandTextboxWidth(
    textbox: EditorTextbox,
    {
      placement,
      clampToMontage = true
    }: {
      placement?: ObjectPlacement
      clampToMontage?: boolean
    } = {}
  ): boolean {
    const { canvasManager, montageArea } = this.editor
    if (!montageArea) return false

    const textValue = typeof textbox.text === 'string' ? textbox.text : ''
    if (!textValue.length) return false

    const {
      left: montageLeft,
      width: montageWidth
    } = canvasManager.getMontageAreaSceneBounds()
    if (!Number.isFinite(montageWidth) || montageWidth <= 0) return false

    const scaleX = Math.abs(textbox.scaleX ?? 1) || 1
    const paddingLeft = textbox.paddingLeft ?? 0
    const paddingRight = textbox.paddingRight ?? 0
    const strokeWidth = textbox.strokeWidth ?? 0
    const maxInnerWidth = Math.max(
      1,
      (montageWidth / scaleX) - paddingLeft - paddingRight - strokeWidth
    )

    if (!Number.isFinite(maxInnerWidth) || maxInnerWidth <= 0) return false

    const explicitLineCount = textValue.split('\n').length

    let geometryChanged = false
    if (Math.abs((textbox.width ?? 0) - maxInnerWidth) > DIMENSION_EPSILON) {
      textbox.set({ width: maxInnerWidth })
      geometryChanged = true
    }

    textbox.initDimensions()
    const { textLines } = textbox as EditorTextbox & { textLines?: string[] }
    const hasWrappedLines = Array.isArray(textLines) && textLines.length > explicitLineCount

    const longestLineWidth = Math.ceil(
      getLongestLineWidth({ textbox, text: textValue })
    )
    const minWidth = Math.min(textbox.minWidth ?? 1, maxInnerWidth)
    let targetWidth = Math.min(
      maxInnerWidth,
      Math.max(longestLineWidth, minWidth)
    )

    if (hasWrappedLines) {
      targetWidth = maxInnerWidth
    }

    if (Math.abs((textbox.width ?? 0) - targetWidth) > DIMENSION_EPSILON) {
      textbox.set({ width: targetWidth })
      textbox.initDimensions()
      geometryChanged = true
    }

    const dimensionsRounded = roundTextboxDimensions({ textbox })
    if (dimensionsRounded) {
      geometryChanged = true
    }

    if (placement) {
      canvasManager.applyObjectPlacement({
        object: textbox,
        placement
      })
    }

    let positionAdjusted = false

    if (clampToMontage) {
      positionAdjusted = clampTextboxToMontage({
        textbox,
        montageLeft,
        montageRight: montageLeft + montageWidth
      })
    }

    return geometryChanged || positionAdjusted
  }

  /**
   * Обработчик выхода из режима редактирования текста.
   * Для текста внутри shape-композиций завершает history-action,
   * но не применяет standalone geometry cleanup поверх shape-layout.
   */
  private _handleTextEditingExited = (event: TextManagerTargetEvent): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return
    const isShapeOwnedTextbox = TextManager._isShapeOwnedTextbox(target)
    this.editingPlacementState?.delete(target)
    delete target.__lineDefaultsPrevText

    // Обновляем textCaseRaw после редактирования, чтобы сохранить актуальное содержимое
    const currentText = target.text ?? ''
    const isUppercase = Boolean(target.uppercase)

    if (isUppercase) {
      // Если uppercase включен, пытаемся восстановить оригинальный регистр
      // Используем предыдущий textCaseRaw если он есть, иначе переводим в нижний регистр
      const previousRaw = target.textCaseRaw ?? currentText.toLocaleLowerCase()
      target.textCaseRaw = previousRaw
    } else {
      // Если uppercase выключен, сохраняем текст как есть
      target.textCaseRaw = currentText
    }

    if (!isShapeOwnedTextbox) {
      const dimensionsRoundedAfterEditing = roundTextboxDimensions({ textbox: target })

      if (dimensionsRoundedAfterEditing) {
        target.setCoords()
        target.dirty = true
        this.canvas.requestRenderAll()
      }

      // Сбрасываем lock-свойства после выхода из режима редактирования
      if (!target.locked) {
        target.set({
          lockMovementX: false,
          lockMovementY: false
        })
      }
    }

    const { historyManager } = this.editor

    historyManager.endAction({ reason: 'text-edit' })
    historyManager.stageCurrentStateForPendingSave({ reason: 'text-edit' })

    // Сохраняем состояние с небольшой задержкой, чтобы Fabric успел завершить все внутренние операции
    historyManager.scheduleSaveState({
      delayMs: TEXT_EDITING_DEBOUNCE_MS,
      reason: 'text-edit'
    })
  }

  /**
   * Обрабатывает изменение ширины текстового объекта (resizing).
   * Корректирует ширину, вычитая паддинги, так как Fabric при изменении ширины
   * устанавливает значение, включающее визуальные отступы.
   * Также корректирует позицию при ресайзе слева, чтобы компенсировать смещение.
   * Любой ручной horizontal resize переводит textbox в fixed-width режим.
   */
  private _handleObjectResizing = (event: TextManagerTransformEvent): void => {
    const { target, transform, e } = event
    if (!TextManager._isTextbox(target)) return
    if (TextManager._isShapeOwnedTextbox(target)) return

    target.autoExpand = false

    const {
      paddingLeft = 0,
      paddingRight = 0
    } = target

    const totalPadding = paddingLeft + paddingRight

    if (totalPadding !== 0) {
      const { width: previousWidth = 0 } = target
      const anchorOriginX = transform?.originX ?? target.originX ?? 'left'
      const anchorOriginY = transform?.originY ?? target.originY ?? 'top'
      const anchorPoint = target.getPointByOrigin(anchorOriginX, anchorOriginY)

      // Fabric рассчитывает новую ширину на основе положения курсора.
      // Так как контролы отрисовываются с учетом паддингов (через _getTransformedDimensions),
      // рассчитанная ширина включает в себя паддинги.
      // Нам нужно сохранить "чистую" ширину текста.
      const nextWidth = Math.max(0, previousWidth - totalPadding)

      if (previousWidth !== nextWidth) {
        target.set({ width: nextWidth })

        const { width: finalWidth = 0 } = target
        if (previousWidth !== finalWidth) {
          target.setPositionByOrigin(anchorPoint, anchorOriginX, anchorOriginY)
          target.setCoords()
        }
      }
    }

    this.editor.snappingManager.applyTextResizingSnap({
      target,
      transform,
      event: e ?? null
    })
  }

  /**
   * Возвращает хранилище placement-состояния на время редактирования.
   */
  private _ensureEditingPlacementState(): WeakMap<EditorTextbox, ObjectPlacement> {
    if (!this.editingPlacementState) {
      this.editingPlacementState = new WeakMap()
    }

    return this.editingPlacementState
  }

  /**
   * Формирует снимок текущих свойств текстового объекта для истории и событий.
   */
  private static _getSnapshot(textbox: EditorTextbox): TextboxSnapshot {
    const addIfPresent = (
      {
        snapshot,
        entries
      }: {
        snapshot: TextboxSnapshot;
        entries: Record<string, unknown>
      }
    ): void => {
      Object.entries(entries).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          snapshot[key] = value
        }
      })
    }

    const {
      id,
      text,
      textCaseRaw,
      uppercase,
      autoExpand,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      underline,
      linethrough,
      textAlign,
      fill,
      stroke,
      strokeWidth,
      opacity,
      backgroundColor,
      backgroundOpacity,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      radiusTopLeft,
      radiusTopRight,
      radiusBottomRight,
      radiusBottomLeft,
      left,
      top,
      width,
      height,
      angle,
      scaleX,
      scaleY
    } = textbox

    const snapshot: TextboxSnapshot = {
      id,
      uppercase: Boolean(uppercase),
      textAlign
    }

    addIfPresent({
      snapshot,
      entries: {
        text,
        textCaseRaw,
        autoExpand,
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        underline,
        linethrough,
        fill,
        stroke,
        strokeWidth,
        opacity,
        backgroundColor,
        backgroundOpacity,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        radiusTopLeft,
        radiusTopRight,
        radiusBottomRight,
        radiusBottomLeft,
        left,
        top,
        width,
        height,
        angle,
        scaleX,
        scaleY
      }
    })

    return snapshot
  }

  /**
   * Возвращает первый доступный шрифт или дефолтный Arial.
   */
  private _getDefaultFontFamily(): string {
    return this.fonts[0]?.family ?? 'Arial'
  }
}
