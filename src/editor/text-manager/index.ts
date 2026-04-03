import {
  Canvas,
  FabricObject,
  IEvent,
  Textbox,
  TextboxProps,
  Transform,
  util
} from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'
import type { ObjectPlacement } from '../canvas-manager'
import { TEXT_EDITING_DEBOUNCE_MS } from '../constants'
import type { EditorFontDefinition } from '../types/font'
import {
  BackgroundTextbox,
  registerBackgroundTextbox,
  type BackgroundTextboxProps,
  type LineFontDefault,
  type LineFontDefaults
} from './background-textbox'
import {
  DIMENSION_EPSILON
} from './constants'
import TextScalingController from './scaling/text-scaling'
import {
  applyLineDefaultUpdates,
  syncLineDefaultStyles
} from './line-defaults'
import {
  clampSelectionRange,
  expandRangeToFullLines,
  getFirstDiffIndex,
  getFullLineIndicesForRange,
  getLineIndexByCharIndex,
  getLineIndicesForRange,
  getLineStartIndex
} from './selection'
import {
  clampTextboxToMontage,
  getLongestLineWidth,
  hasLayoutAffectingStyles,
  roundTextboxDimensions
} from './geometry'
import type {
  BeforeTextUpdatedPayload,
  EditorTextbox,
  LineFontDefaultUpdate,
  TextUpdatedPayload,
  TextCreationFlags,
  TextReference,
  TextStyleOptions,
  TextboxSnapshot,
  UpdateOptions
} from './types'
import {
  applyStylesToRange,
  getFullTextRange,
  getSelectionRange,
  getSelectionStyleValue,
  isFullTextSelection,
  resolveStrokeColor,
  resolveStrokeWidth,
  toUpperCaseSafe
} from '../utils/text'

export type { TextStyleOptions } from './types'

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
   * Placement текстового объекта на момент входа в редактирование.
   */
  private editingPlacementState?: WeakMap<EditorTextbox, ObjectPlacement>

  /**
   * Хранилище для защиты от повторной синхронизации lineFontDefaults.
   */
  private lineDefaultsSyncing: WeakSet<EditorTextbox>

  /**
   * Флаг, указывающий что текст находится в режиме редактирования или недавно вышел из него.
   * Используется для предотвращения сохранения состояния с временными lock-свойствами.
   */
  public isTextEditingActive: boolean

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
    this.editingPlacementState = new WeakMap()
    this.lineDefaultsSyncing = new WeakSet()
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
      id = `text-${nanoid()}`,
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

    const finalOptions = {
      id,
      fontFamily: resolvedFontFamily,
      fontSize,
      fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal',
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
   * @fires editor:before:text-updated
   * @fires editor:text-updated
   */
  public updateText({
    target,
    style = {},
    withoutSave,
    skipRender,
    selectionRange: selectionRangeOverride,
    emitLifecycleEvents = true
  }: UpdateOptions = {}): EditorTextbox | null {
    const textbox = this._resolveTextObject(target)
    if (!textbox) return null

    const {
      text: currentText = ''
    } = textbox
    const { historyManager } = this.editor
    const { canvasManager } = this.editor
    const { canvas } = this
    historyManager.suspendHistory()

    const beforeState = TextManager._getSnapshot(textbox)

    const {
      text,
      autoExpand,
      fontFamily,
      fontSize,
      bold,
      italic,
      underline,
      uppercase,
      strikethrough,
      align,
      color,
      strokeColor,
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
      originX,
      originY,
      ...rest
    } = style

    const updates: Partial<BackgroundTextboxProps> = { ...rest }
    const placement = canvasManager.resolveObjectPlacement({
      object: textbox,
      left,
      top,
      originX,
      originY
    })
    const selectionRange = selectionRangeOverride !== undefined
      ? clampSelectionRange({
        text: currentText,
        range: selectionRangeOverride
      })
      : getSelectionRange({ textbox })
    const fontSelectionRange = selectionRange
      ? expandRangeToFullLines({ textbox, range: selectionRange })
      : null
    const selectionStyles: Partial<TextboxProps> = {}
    const lineSelectionStyles: Partial<TextboxProps> = {}
    const wholeTextStyles: Partial<TextboxProps> = {}
    let resolvedStrokeColor: string | null | undefined
    let resolvedStrokeWidth: number | undefined
    const isSelectionForWholeText = isFullTextSelection({ textbox, range: selectionRange })
    const shouldUpdateWholeObject = !selectionRange || isSelectionForWholeText
    const shouldApplyWholeTextStyles = !selectionRange

    if (fontFamily !== undefined) {
      if (fontSelectionRange) {
        lineSelectionStyles.fontFamily = fontFamily
      }

      if (shouldUpdateWholeObject) {
        updates.fontFamily = fontFamily
        if (shouldApplyWholeTextStyles) {
          wholeTextStyles.fontFamily = fontFamily
        }
      }
    }

    if (fontSize !== undefined) {
      if (fontSelectionRange) {
        lineSelectionStyles.fontSize = fontSize
      }

      if (shouldUpdateWholeObject) {
        updates.fontSize = fontSize
        if (shouldApplyWholeTextStyles) {
          wholeTextStyles.fontSize = fontSize
        }
      }
    }

    if (bold !== undefined) {
      const fontWeight = bold ? 'bold' : 'normal'
      if (selectionRange) {
        selectionStyles.fontWeight = fontWeight
      }

      if (shouldUpdateWholeObject) {
        updates.fontWeight = fontWeight
        if (shouldApplyWholeTextStyles) {
          wholeTextStyles.fontWeight = fontWeight
        }
      }
    }

    if (italic !== undefined) {
      const fontStyle = italic ? 'italic' : 'normal'
      if (selectionRange) {
        selectionStyles.fontStyle = fontStyle
      }

      if (shouldUpdateWholeObject) {
        updates.fontStyle = fontStyle
        if (shouldApplyWholeTextStyles) {
          wholeTextStyles.fontStyle = fontStyle
        }
      }
    }

    if (underline !== undefined) {
      if (selectionRange) {
        selectionStyles.underline = underline
      }

      if (shouldUpdateWholeObject) {
        updates.underline = underline
        if (shouldApplyWholeTextStyles) {
          wholeTextStyles.underline = underline
        }
      }
    }

    if (strikethrough !== undefined) {
      if (selectionRange) {
        selectionStyles.linethrough = strikethrough
      }

      if (shouldUpdateWholeObject) {
        updates.linethrough = strikethrough
        if (shouldApplyWholeTextStyles) {
          wholeTextStyles.linethrough = strikethrough
        }
      }
    }

    if (align !== undefined) {
      updates.textAlign = align
    }

    if (color !== undefined) {
      if (selectionRange) {
        selectionStyles.fill = color
      }

      if (shouldUpdateWholeObject) {
        updates.fill = color
        if (shouldApplyWholeTextStyles) {
          wholeTextStyles.fill = color
        }
      }
    }

    if (strokeColor !== undefined || strokeWidth !== undefined) {
      const selectionStrokeWidth = selectionRange
        ? getSelectionStyleValue<number>({ textbox, range: selectionRange, property: 'strokeWidth' })
        : undefined
      const selectionStrokeColor = selectionRange
        ? getSelectionStyleValue<string>({ textbox, range: selectionRange, property: 'stroke' })
        : undefined

      const widthSource = strokeWidth ?? selectionStrokeWidth ?? textbox.strokeWidth ?? 0
      resolvedStrokeWidth = resolveStrokeWidth({ width: widthSource })
      const colorSource = strokeColor ?? selectionStrokeColor ?? textbox.stroke ?? undefined
      resolvedStrokeColor = resolveStrokeColor({
        strokeColor: colorSource,
        width: resolvedStrokeWidth
      })

      if (selectionRange) {
        selectionStyles.stroke = resolvedStrokeColor
        selectionStyles.strokeWidth = resolvedStrokeWidth
      }

      if (shouldUpdateWholeObject) {
        updates.stroke = resolvedStrokeColor
        updates.strokeWidth = resolvedStrokeWidth
        if (shouldApplyWholeTextStyles) {
          wholeTextStyles.stroke = resolvedStrokeColor
          wholeTextStyles.strokeWidth = resolvedStrokeWidth
        }
      }
    }

    if (opacity !== undefined) {
      updates.opacity = opacity
    }

    if (backgroundColor !== undefined) {
      updates.backgroundColor = backgroundColor
    }

    if (backgroundOpacity !== undefined) {
      updates.backgroundOpacity = backgroundOpacity
    }

    if (paddingTop !== undefined) {
      updates.paddingTop = paddingTop
    }

    if (paddingRight !== undefined) {
      updates.paddingRight = paddingRight
    }

    if (paddingBottom !== undefined) {
      updates.paddingBottom = paddingBottom
    }

    if (paddingLeft !== undefined) {
      updates.paddingLeft = paddingLeft
    }

    if (radiusTopLeft !== undefined) {
      updates.radiusTopLeft = radiusTopLeft
    }

    if (radiusTopRight !== undefined) {
      updates.radiusTopRight = radiusTopRight
    }

    if (radiusBottomRight !== undefined) {
      updates.radiusBottomRight = radiusBottomRight
    }

    if (radiusBottomLeft !== undefined) {
      updates.radiusBottomLeft = radiusBottomLeft
    }

    const previousRaw = textbox.textCaseRaw ?? currentText
    const previousUppercase = Boolean(textbox.uppercase)
    const hasTextUpdate = text !== undefined
    const targetRawText = hasTextUpdate ? text ?? '' : previousRaw
    const nextUppercase = uppercase ?? previousUppercase
    const uppercaseChanged = nextUppercase !== previousUppercase

    // textCaseRaw хранит исходный текст без учёта uppercase,
    // чтобы можно было переключать регистр без потери оригинальной строки.
    if (hasTextUpdate || uppercaseChanged) {
      const renderedText = nextUppercase
        ? toUpperCaseSafe({ value: targetRawText })
        : targetRawText
      updates.text = renderedText
      textbox.textCaseRaw = targetRawText
    } else if (textbox.textCaseRaw === undefined) {
      textbox.textCaseRaw = previousRaw
    }

    textbox.uppercase = nextUppercase

    textbox.set(updates)

    let stylesApplied = false
    if (selectionRange) {
      const selectionApplied = applyStylesToRange({ textbox, styles: selectionStyles, range: selectionRange })
      const lineApplied = fontSelectionRange
        ? applyStylesToRange({ textbox, styles: lineSelectionStyles, range: fontSelectionRange })
        : false
      stylesApplied = selectionApplied || lineApplied
    } else if (Object.keys(wholeTextStyles).length) {
      const fullRange = getFullTextRange({ textbox })
      if (fullRange) {
        stylesApplied = applyStylesToRange({ textbox, styles: wholeTextStyles, range: fullRange })
      }
    }

    const shouldRecalculateDimensions = stylesApplied
      && hasLayoutAffectingStyles({
        stylesList: [
          selectionStyles,
          lineSelectionStyles,
          wholeTextStyles
        ]
      })

    if (stylesApplied) {
      textbox.dirty = true
    }

    if (fontSelectionRange && (fontFamily !== undefined || fontSize !== undefined)) {
      const lineIndices = getLineIndicesForRange({
        textbox,
        range: fontSelectionRange
      })
      const lineDefaultsUpdates: LineFontDefaultUpdate = {}

      if (fontFamily !== undefined) {
        lineDefaultsUpdates.fontFamily = fontFamily
      }

      if (fontSize !== undefined) {
        lineDefaultsUpdates.fontSize = fontSize
      }

      applyLineDefaultUpdates({
        textbox,
        lineIndices,
        updates: lineDefaultsUpdates
      })
    }

    if (
      selectionRange
      && (color !== undefined || strokeColor !== undefined || strokeWidth !== undefined)
    ) {
      const fullLineIndices = getFullLineIndicesForRange({
        textbox,
        range: selectionRange
      })
      const lineDefaultsUpdates: LineFontDefaultUpdate = {}

      if (color !== undefined) {
        lineDefaultsUpdates.fill = color
      }

      if (strokeColor !== undefined || strokeWidth !== undefined) {
        if (resolvedStrokeColor === null) {
          lineDefaultsUpdates.stroke = null
        }

        if (resolvedStrokeColor !== null && resolvedStrokeColor !== undefined) {
          lineDefaultsUpdates.stroke = resolvedStrokeColor
        }
      }

      applyLineDefaultUpdates({
        textbox,
        lineIndices: fullLineIndices,
        updates: lineDefaultsUpdates
      })
    }

    if (shouldRecalculateDimensions) {
      textbox.initDimensions()
      textbox.dirty = true
    }

    if (
      backgroundColor !== undefined
      || backgroundOpacity !== undefined
      || paddingTop !== undefined
      || paddingRight !== undefined
      || paddingBottom !== undefined
      || paddingLeft !== undefined
      || radiusTopLeft !== undefined
      || radiusTopRight !== undefined
      || radiusBottomRight !== undefined
      || radiusBottomLeft !== undefined
    ) {
      textbox.dirty = true
    }

    const hasLayoutUpdates = hasLayoutAffectingStyles({
      stylesList: [
        updates,
        selectionStyles,
        lineSelectionStyles,
        wholeTextStyles
      ]
    })
    const { autoExpand: storedAutoExpand } = textbox
    const hasAutoExpandUpdate = autoExpand !== undefined
    const hasExplicitWidthUpdate = Object.prototype.hasOwnProperty.call(updates, 'width')
    const resolvedAutoExpand = autoExpand ?? storedAutoExpand
    const isAutoExpandEnabled = resolvedAutoExpand !== false

    if (hasAutoExpandUpdate) {
      textbox.autoExpand = autoExpand !== false
    } else if (storedAutoExpand === undefined) {
      textbox.autoExpand = true
    }
    const shouldAutoExpand = isAutoExpandEnabled
      && !hasExplicitWidthUpdate
      && (hasTextUpdate || uppercaseChanged || hasLayoutUpdates)
    this._normalizeTextboxAfterContentChange({
      textbox,
      placement,
      shouldAutoExpand
    })

    textbox.setCoords()
    const eventOptions = {
      withoutSave: Boolean(withoutSave),
      skipRender: Boolean(skipRender)
    }

    const hasSelectionStyles = Boolean(selectionRange) && Object.keys(selectionStyles).length > 0

    const beforeTextUpdatedPayload: BeforeTextUpdatedPayload = {
      textbox,
      target,
      style,
      options: eventOptions,
      updates,
      selectionRange: selectionRange ?? undefined,
      selectionStyles: hasSelectionStyles ? selectionStyles : undefined
    }

    if (emitLifecycleEvents) {
      canvas.fire('editor:before:text-updated', beforeTextUpdatedPayload)
    }

    if (!skipRender) {
      canvas.requestRenderAll()
    }

    const afterState = TextManager._getSnapshot(textbox)

    historyManager.resumeHistory()
    if (!withoutSave) {
      historyManager.saveState()
    }

    const textUpdatedPayload: TextUpdatedPayload = {
      ...beforeTextUpdatedPayload,
      before: beforeState,
      after: afterState
    }

    if (emitLifecycleEvents) {
      canvas.fire('editor:text-updated', textUpdatedPayload)
    }

    return textbox
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
    return this.scalingController.commitStandaloneTextScale({
      target,
      shouldDisableAutoExpandOnHorizontalChange
    })
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
  private static _isShapeOwnedTextbox(object?: FabricObject | null): object is EditorTextbox {
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
  private _handleTextEditingEntered = (event: IEvent): void => {
    this.isTextEditingActive = true
    const { target } = event
    if (!TextManager._isTextbox(target)) return
    const {
      canvasManager,
      historyManager
    } = this.editor
    historyManager.beginAction({ reason: 'text-edit' })
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
  private _handleTextChanged = (event: IEvent): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return
    if (this.lineDefaultsSyncing.has(target)) return

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
      this._syncLineFontDefaultsOnTextChanged({ textbox: target })
      return
    }

    this._normalizeTextboxAfterContentChange({
      textbox: target,
      placement,
      shouldAutoExpand: isAutoExpandEnabled
    })

    this._syncLineFontDefaultsOnTextChanged({ textbox: target })
  }

  /**
   * Синхронизирует lineFontDefaults при изменении текста и сохраняет typing style для пустых строк.
   */
  private _syncLineFontDefaultsOnTextChanged({ textbox }: { textbox: EditorTextbox }): void {
    const {
      text = '',
      lineFontDefaults,
      styles,
      fontFamily: globalFontFamily,
      fontSize: globalFontSize,
      fill: rawGlobalFill,
      stroke: rawGlobalStroke,
      selectionStart,
      isEditing
    } = textbox
    const currentText = text
    const previousText = textbox.__lineDefaultsPrevText ?? currentText
    const previousLines = previousText.split('\n')
    const currentLines = currentText.split('\n')
    const oldLineCount = previousLines.length
    const newLineCount = currentLines.length
    const deltaLines = newLineCount - oldLineCount

    let nextLineDefaults = lineFontDefaults
    let lineDefaultsChanged = false
    let lineDefaultsCloned = false

    const resolvedGlobalFill = typeof rawGlobalFill === 'string' ? rawGlobalFill : undefined
    const resolvedGlobalStroke = typeof rawGlobalStroke === 'string' ? rawGlobalStroke : undefined

    if (deltaLines !== 0 && lineFontDefaults && Object.keys(lineFontDefaults).length) {
      const diffIndex = getFirstDiffIndex({
        previous: previousText,
        next: currentText
      })
      const lineIndexOld = getLineIndexByCharIndex({
        text: previousText,
        charIndex: diffIndex
      })

      if (deltaLines > 0) {
        const lineStartOld = getLineStartIndex({
          text: previousText,
          lineIndex: lineIndexOld
        })
        let shiftStartIndex = lineIndexOld + 1
        if (diffIndex === lineStartOld) {
          shiftStartIndex = lineIndexOld
        }

        const shiftedDefaults: LineFontDefaults = {}
        for (const key in lineFontDefaults) {
          if (!Object.prototype.hasOwnProperty.call(lineFontDefaults, key)) continue
          const numericIndex = Number(key)
          if (!Number.isFinite(numericIndex)) continue
          const lineDefault = lineFontDefaults[numericIndex]
          if (!lineDefault) continue

          const nextIndex = numericIndex >= shiftStartIndex
            ? numericIndex + deltaLines
            : numericIndex
          shiftedDefaults[nextIndex] = { ...lineDefault }
        }

        nextLineDefaults = shiftedDefaults
        lineDefaultsChanged = true
        lineDefaultsCloned = true
      }

      if (deltaLines < 0) {
        const removedLinesCount = Math.abs(deltaLines)
        let removedLineStart = lineIndexOld
        const oldChar = previousText[diffIndex]

        if (oldChar === '\n') {
          const lineText = previousLines[lineIndexOld] ?? ''
          if (lineText.length > 0) {
            removedLineStart = lineIndexOld + 1
          }
        }

        const removedLineEnd = removedLineStart + removedLinesCount - 1
        const shiftedDefaults: LineFontDefaults = {}

        for (const key in lineFontDefaults) {
          if (!Object.prototype.hasOwnProperty.call(lineFontDefaults, key)) continue
          const numericIndex = Number(key)
          if (!Number.isFinite(numericIndex)) continue
          const lineDefault = lineFontDefaults[numericIndex]
          if (!lineDefault) continue

          if (numericIndex < removedLineStart) {
            shiftedDefaults[numericIndex] = { ...lineDefault }
          }

          if (numericIndex > removedLineEnd) {
            shiftedDefaults[numericIndex + deltaLines] = { ...lineDefault }
          }
        }

        nextLineDefaults = shiftedDefaults
        lineDefaultsChanged = true
        lineDefaultsCloned = true
      }
    }

    let cursorLineIndex: number | null = null
    if (isEditing && typeof selectionStart === 'number') {
      const cursorLocation = textbox.get2DCursorLocation(selectionStart)
      const { lineIndex } = cursorLocation
      if (Number.isFinite(lineIndex)) {
        cursorLineIndex = lineIndex
      }
    }

    let nextStyles = styles
    let stylesChanged = false
    let stylesCloned = false
    let lastLineDefaults: LineFontDefault | undefined
    let cursorLineDefaults: LineFontDefault | null = null

    for (let lineIndex = 0; lineIndex < currentLines.length; lineIndex += 1) {
      const lineText = currentLines[lineIndex] ?? ''
      const storedLineDefaults = nextLineDefaults ? nextLineDefaults[lineIndex] : undefined

      if (storedLineDefaults) {
        lastLineDefaults = storedLineDefaults
      }

      const hasLineText = lineText.length !== 0
      if (hasLineText) {
        if (storedLineDefaults) {
          const syncResult = syncLineDefaultStyles({
            lineText,
            lineStyles: nextStyles ? nextStyles[lineIndex] : undefined,
            lineDefaults: storedLineDefaults
          })

          if (syncResult.changed) {
            if (!nextStyles) {
              nextStyles = {}
              stylesCloned = true
            }

            if (!stylesCloned) {
              nextStyles = { ...nextStyles }
              stylesCloned = true
            }

            if (syncResult.lineStyles) {
              nextStyles[lineIndex] = syncResult.lineStyles
            }

            if (!syncResult.lineStyles && nextStyles[lineIndex]) {
              delete nextStyles[lineIndex]
            }

            stylesChanged = true
          }
        }

        continue
      }

      const sourceDefaults = storedLineDefaults ?? lastLineDefaults
      const resolvedDefaults: LineFontDefault = {}

      if (sourceDefaults?.fontFamily !== undefined) {
        resolvedDefaults.fontFamily = sourceDefaults.fontFamily
      } else if (globalFontFamily !== undefined) {
        resolvedDefaults.fontFamily = globalFontFamily
      }

      if (sourceDefaults?.fontSize !== undefined) {
        resolvedDefaults.fontSize = sourceDefaults.fontSize
      } else if (globalFontSize !== undefined) {
        resolvedDefaults.fontSize = globalFontSize
      }

      if (sourceDefaults?.fill !== undefined) {
        resolvedDefaults.fill = sourceDefaults.fill
      } else if (resolvedGlobalFill !== undefined) {
        resolvedDefaults.fill = resolvedGlobalFill
      }

      if (sourceDefaults?.stroke !== undefined) {
        resolvedDefaults.stroke = sourceDefaults.stroke
      } else if (resolvedGlobalStroke !== undefined) {
        resolvedDefaults.stroke = resolvedGlobalStroke
      }

      if (!storedLineDefaults && Object.keys(resolvedDefaults).length) {
        if (!nextLineDefaults) {
          nextLineDefaults = {}
          lineDefaultsCloned = true
        }

        if (!lineDefaultsCloned) {
          nextLineDefaults = { ...nextLineDefaults }
          lineDefaultsCloned = true
        }

        nextLineDefaults[lineIndex] = resolvedDefaults
        lineDefaultsChanged = true
        lastLineDefaults = resolvedDefaults
      }

      if (storedLineDefaults) {
        lastLineDefaults = storedLineDefaults
      }

      if (cursorLineIndex !== null && cursorLineIndex === lineIndex) {
        cursorLineDefaults = resolvedDefaults
      }

      const allowedStyles: Partial<TextboxProps> = {}
      if (resolvedDefaults.fontFamily !== undefined) {
        allowedStyles.fontFamily = resolvedDefaults.fontFamily
      }

      if (resolvedDefaults.fontSize !== undefined) {
        allowedStyles.fontSize = resolvedDefaults.fontSize
      }

      if (resolvedDefaults.fill !== undefined) {
        allowedStyles.fill = resolvedDefaults.fill
      }

      if (resolvedDefaults.stroke !== undefined) {
        allowedStyles.stroke = resolvedDefaults.stroke
      }

      const hasAllowedStyles = Object.keys(allowedStyles).length > 0
      if (hasAllowedStyles || (nextStyles && nextStyles[lineIndex])) {
        if (!nextStyles) {
          nextStyles = {}
          stylesCloned = true
        }

        if (!stylesCloned) {
          nextStyles = { ...nextStyles }
          stylesCloned = true
        }

        if (hasAllowedStyles) {
          nextStyles[lineIndex] = { 0: allowedStyles }
        }

        if (!hasAllowedStyles && nextStyles[lineIndex]) {
          delete nextStyles[lineIndex]
        }

        stylesChanged = true
      }
    }

    if (lineDefaultsChanged && nextLineDefaults) {
      textbox.lineFontDefaults = nextLineDefaults
    }

    if (stylesChanged) {
      textbox.styles = nextStyles
      textbox.dirty = true
    }

    if (cursorLineDefaults && typeof selectionStart === 'number') {
      const typingStyles: Partial<TextboxProps> = {}

      if (cursorLineDefaults.fontFamily !== undefined) {
        typingStyles.fontFamily = cursorLineDefaults.fontFamily
      }

      if (cursorLineDefaults.fontSize !== undefined) {
        typingStyles.fontSize = cursorLineDefaults.fontSize
      }

      if (cursorLineDefaults.fill !== undefined) {
        typingStyles.fill = cursorLineDefaults.fill
      }

      if (cursorLineDefaults.stroke !== undefined) {
        typingStyles.stroke = cursorLineDefaults.stroke
      }

      if (Object.keys(typingStyles).length) {
        this.lineDefaultsSyncing.add(textbox)
        try {
          textbox.setSelectionStyles(typingStyles, selectionStart, selectionStart)
        } finally {
          this.lineDefaultsSyncing.delete(textbox)
        }
      }
    }

    textbox.__lineDefaultsPrevText = currentText
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
    const { textLines } = (textbox as unknown as { textLines?: string[] })
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
  private _handleTextEditingExited = (event: IEvent): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return
    const isShapeOwnedTextbox = TextManager._isShapeOwnedTextbox(target)
    this.editingPlacementState?.delete(target)

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
  private _handleObjectResizing = (event: IEvent<MouseEvent> & { transform?: Transform }): void => {
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
