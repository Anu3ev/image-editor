import {
  ActiveSelection,
  Canvas,
  FabricObject,
  IEvent,
  Textbox,
  TextboxProps,
  Transform
} from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'
import { TEXT_EDITING_DEBOUNCE_MS } from '../constants'
import type { EditorFontDefinition } from '../types/font'
import {
  BackgroundTextbox,
  registerBackgroundTextbox,
  type BackgroundTextboxProps
} from './background-textbox'
import {
  applyStylesToRange,
  getFullTextRange,
  getSelectionRange,
  getSelectionStyleValue,
  isFullTextSelection,
  resolveStrokeColor,
  resolveStrokeWidth,
  toUpperCaseSafe,
  type TextSelectionRange
} from '../utils/text'

type TextCreationFlags = {
  withoutSelection?: boolean
  withoutSave?: boolean
  withoutAdding?: boolean
}

export type TextStyleOptions = {
  id?: string
  text?: string
  fontFamily?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  uppercase?: boolean
  strikethrough?: boolean
  align?: 'left' | 'center' | 'right' | 'justify'
  color?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  backgroundColor?: string
  backgroundOpacity?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  radiusTopLeft?: number
  radiusTopRight?: number
  radiusBottomRight?: number
  radiusBottomLeft?: number
} & Partial<
  Omit<
    BackgroundTextboxProps,
    | 'fontFamily'
    | 'fontSize'
    | 'fontWeight'
    | 'fontStyle'
    | 'underline'
    | 'textAlign'
    | 'fill'
    | 'linethrough'
    | 'opacity'
    | 'stroke'
    | 'strokeWidth'
    | 'text'
    | 'shadow'
    | 'textTransform'
  >
>

type EditorTextbox = Textbox & Partial<BackgroundTextboxProps>

type TextReference = string | EditorTextbox | null | undefined

type UpdateOptions = {
  target?: TextReference
  style?: TextStyleOptions
  withoutSave?: boolean
  skipRender?: boolean
}

const DIMENSION_EPSILON = 0.01

type PaddingValues = {
  bottom: number
  left: number
  right: number
  top: number
}

type CornerRadiiValues = {
  bottomLeft: number
  bottomRight: number
  topLeft: number
  topRight: number
}

type TextboxStyles = Record<string, Record<string, TextboxProps>>

type ScalingState = {
  baseWidth: number
  baseLeft: number
  baseFontSize: number
  baseStyles: TextboxStyles
  basePadding: PaddingValues
  baseRadii: CornerRadiiValues
  hasWidthChange: boolean
}

type TextboxSnapshot = Record<string, unknown>

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
   * Данные о масштабе текста, которые собираются в процессе трансформации.
   */
  private scalingState: WeakMap<EditorTextbox, ScalingState>

  /**
   * Флаг, указывающий что текст находится в режиме редактирования или недавно вышел из него.
   * Используется для предотвращения сохранения состояния с временными lock-свойствами.
   */
  public isTextEditingActive: boolean

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.fonts = editor.options.fonts ?? []
    this.scalingState = new WeakMap()
    this.isTextEditingActive = false

    this._bindEvents()
    registerBackgroundTextbox()
  }

  /**
   * Добавляет новый текстовый объект на канвас.
   * @param options — настройки текста
   * @param flags — флаги поведения
   */
  public addText(
    {
      id = `text-${nanoid()}`,
      text = 'Новый текст',
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
    { withoutSelection = false, withoutSave = false, withoutAdding = false }: TextCreationFlags = {}
  ): EditorTextbox {
    const { historyManager } = this.editor
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

    // textCaseRaw хранит исходную строку без применения uppercase
    textbox.textCaseRaw = textbox.text ?? ''

    if (uppercase) {
      const uppercased = toUpperCaseSafe({ value: textbox.textCaseRaw })
      if (uppercased !== textbox.text) {
        textbox.set({ text: uppercased })
      }
    }

    const dimensionsRoundedOnCreate = TextManager._roundTextboxDimensions({ textbox })

    if (dimensionsRoundedOnCreate) {
      textbox.dirty = true
    }

    if (rest.left === undefined && rest.top === undefined) {
      canvas.centerObject(textbox)
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

    return textbox
  }

  /**
   * Обновляет текстовый объект.
   * @param options — настройки обновления
   * @param options.target — объект, его id или активный объект (если не передан)
   * @param options.style — стиль, который нужно применить
   * @param options.withoutSave — не сохранять состояние в историю
   * @param options.skipRender — не вызывать перерисовку канваса
   */
  public updateText({ target, style = {}, withoutSave, skipRender }: UpdateOptions = {}): EditorTextbox | null {
    const textbox = this._resolveTextObject(target)
    if (!textbox) return null

    const { historyManager } = this.editor
    const { canvas } = this
    historyManager.suspendHistory()

    const beforeState = TextManager._getSnapshot(textbox)

    const {
      text,
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
      ...rest
    } = style

    const updates: Partial<BackgroundTextboxProps> = { ...rest }
    const selectionRange = getSelectionRange({ textbox })
    const fontSelectionRange = selectionRange
      ? this._expandRangeToFullLines({ textbox, range: selectionRange })
      : null
    const selectionStyles: Partial<TextboxProps> = {}
    const lineSelectionStyles: Partial<TextboxProps> = {}
    const wholeTextStyles: Partial<TextboxProps> = {}
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
      const resolvedStrokeWidth = resolveStrokeWidth({ width: widthSource })
      const colorSource = strokeColor ?? selectionStrokeColor ?? textbox.stroke ?? undefined
      const resolvedStrokeColor = resolveStrokeColor({
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

    const previousRaw = textbox.textCaseRaw ?? (textbox.text ?? '')
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

    if (stylesApplied) {
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

    const dimensionsRounded = TextManager._roundTextboxDimensions({ textbox })

    if (dimensionsRounded) {
      textbox.dirty = true
    }

    textbox.setCoords()

    if (!skipRender) {
      canvas.requestRenderAll()
    }

    historyManager.resumeHistory()
    if (!withoutSave) {
      historyManager.saveState()
    }

    const afterState = TextManager._getSnapshot(textbox)

    canvas.fire('editor:text-updated', {
      textbox,
      target,
      style,
      options: {
        withoutSave: Boolean(withoutSave),
        skipRender: Boolean(skipRender)
      },
      updates,
      before: beforeState,
      after: afterState,
      selectionRange: selectionRange ?? undefined,
      selectionStyles: selectionRange && Object.keys(selectionStyles).length ? selectionStyles : undefined
    })

    return textbox
  }

  /**
   * Уничтожает менеджер и снимает слушатели.
   */
  public destroy(): void {
    const { canvas } = this
    canvas.off('object:scaling', this._handleObjectScaling)
    canvas.off('object:modified', this._handleObjectModified)
    canvas.off('text:editing:exited', this._handleTextEditingExited)
    canvas.off('text:editing:entered', this._handleTextEditingEntered)
    canvas.off('text:changed', this._handleTextChanged)
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
   * Вешает обработчики событий Fabric для работы с текстом.
   */
  private _bindEvents(): void {
    const { canvas } = this
    canvas.on('object:scaling', this._handleObjectScaling)
    canvas.on('object:modified', this._handleObjectModified)
    canvas.on('text:editing:entered', this._handleTextEditingEntered)
    canvas.on('text:editing:exited', this._handleTextEditingExited)
    canvas.on('text:changed', this._handleTextChanged)
  }

  /**
   * Обработчик входа в режим редактирования текста.
   */
  private _handleTextEditingEntered = (): void => {
    this.isTextEditingActive = true
  }

  /**
   * Реагирует на изменение текста в режиме редактирования: синхронизирует textCaseRaw и uppercase.
   */
  private _handleTextChanged = (event: IEvent): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return

    const { text = '', uppercase } = target
    const isUppercase = Boolean(uppercase)
    const normalizedRaw = text.toLocaleLowerCase()

    if (isUppercase) {
      const uppercased = toUpperCaseSafe({ value: normalizedRaw })

      if (uppercased !== text) {
        target.set({ text: uppercased })
      }

      target.textCaseRaw = normalizedRaw
    } else {
      target.textCaseRaw = text
    }

    const dimensionsRounded = TextManager._roundTextboxDimensions({ textbox: target })

    if (dimensionsRounded) {
      target.setCoords()
      target.dirty = true
    }
  }

  /**
   * Обработчик выхода из режима редактирования текста.
   */
  private _handleTextEditingExited = (event: IEvent): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return

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

    const dimensionsRoundedAfterEditing = TextManager._roundTextboxDimensions({ textbox: target })

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

    // Сохраняем состояние с небольшой задержкой, чтобы Fabric успел завершить все внутренние операции
    setTimeout(() => {
      this.isTextEditingActive = false
      this.editor.historyManager.saveState()
    }, TEXT_EDITING_DEBOUNCE_MS)
  }

  /**
   * Обрабатывает масштабирование текстового объекта: пересчитывает ширину, кегль и паддинги/радиусы.
   * Для ActiveSelection с текстом блокирует горизонтальное масштабирование.
   */
  private _handleObjectScaling = (event: IEvent<MouseEvent> & { transform?: Transform }): void => {
    // При масштабировании текстовых объектов пересчитываем ширину/кегль и сбрасываем scale,
    // чтобы Fabric не копил дробные значения и не ломал базовую геометрию.
    const { target, transform } = event
    if (target instanceof ActiveSelection) {
      return
    }
    if (!TextManager._isTextbox(target)) return
    if (!transform) return

    target.isScaling = true

    const state = this._ensureScalingState(target)
    const {
      baseWidth: stateBaseWidth,
      baseLeft: stateBaseLeft,
      baseFontSize,
      basePadding,
      baseRadii,
      baseStyles
    } = state
    const originalWidth = typeof transform.original?.width === 'number' ? transform.original.width : undefined
    const originalLeft = typeof transform.original?.left === 'number' ? transform.original.left : undefined
    const baseWidth = originalWidth ?? stateBaseWidth
    const baseLeft = originalLeft ?? stateBaseLeft

    const corner = transform.corner ?? ''
    const action = transform.action ?? ''
    const isHorizontalHandle = ['ml', 'mr'].includes(corner) || action === 'scaleX'
    const isVerticalHandle = ['mt', 'mb'].includes(corner) || action === 'scaleY'
    const isCornerHandle = ['tl', 'tr', 'bl', 'br'].includes(corner) || action === 'scale'
    const shouldScaleFontSize = isCornerHandle || isVerticalHandle

    if (!isHorizontalHandle && !isVerticalHandle && !isCornerHandle) return

    const widthScale = Math.abs(target.scaleX ?? transform.scaleX ?? 1) || 1
    const heightScale = Math.abs(target.scaleY ?? transform.scaleY ?? 1) || 1
    const nextWidth = Math.max(1, baseWidth * widthScale)
    const roundedNextWidth = Math.max(1, Math.round(nextWidth))
    const nextFontSize = Math.max(1, baseFontSize * heightScale)
    const {
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      radiusTopLeft = 0,
      radiusTopRight = 0,
      radiusBottomRight = 0,
      radiusBottomLeft = 0,
      fontSize: currentFontSize,
      width: currentWidthProp,
      originX: targetOriginX = 'left'
    } = target
    const shouldScalePadding = isCornerHandle || isVerticalHandle
    const shouldScaleRadii = isCornerHandle || isVerticalHandle
    const nextPadding: PaddingValues = shouldScalePadding
      ? {
        top: Math.max(0, basePadding.top * heightScale),
        right: Math.max(0, basePadding.right * heightScale),
        bottom: Math.max(0, basePadding.bottom * heightScale),
        left: Math.max(0, basePadding.left * heightScale)
      }
      : basePadding
    const nextRadii: CornerRadiiValues = shouldScaleRadii
      ? {
        topLeft: Math.max(0, baseRadii.topLeft * heightScale),
        topRight: Math.max(0, baseRadii.topRight * heightScale),
        bottomRight: Math.max(0, baseRadii.bottomRight * heightScale),
        bottomLeft: Math.max(0, baseRadii.bottomLeft * heightScale)
      }
      : baseRadii
    const hasBaseStyles = Object.keys(baseStyles).length > 0
    let nextStyles: EditorTextbox['styles'] | undefined
    if (shouldScaleFontSize && hasBaseStyles) {
      const scaledStyles: TextboxStyles = {}

      Object.entries(baseStyles).forEach(([lineIndex, lineStyles]) => {
        if (!lineStyles) return

        const scaledLineStyles: Record<string, TextboxProps> = {}
        Object.entries(lineStyles as Record<string, TextboxProps>).forEach(([charIndex, charStyle]) => {
          if (!charStyle) return

          const nextCharStyle: TextboxProps = { ...charStyle }
          if (typeof charStyle.fontSize === 'number') {
            nextCharStyle.fontSize = Math.max(1, charStyle.fontSize * heightScale)
          }

          scaledLineStyles[charIndex] = nextCharStyle
        })

        if (Object.keys(scaledLineStyles).length) {
          scaledStyles[lineIndex] = scaledLineStyles
        }
      })

      if (Object.keys(scaledStyles).length) {
        nextStyles = scaledStyles
      }
    }

    const originX = transform.originX ?? targetOriginX ?? 'left'
    const rightEdge = baseLeft + baseWidth
    const centerX = baseLeft + (baseWidth / 2)

    const currentWidth = currentWidthProp ?? baseWidth
    const widthChanged = roundedNextWidth !== currentWidth
    const fontSizeChanged = Math.abs(nextFontSize - (currentFontSize ?? baseFontSize)) > DIMENSION_EPSILON
    const paddingChanged = Math.abs(nextPadding.top - paddingTop) > DIMENSION_EPSILON
      || Math.abs(nextPadding.right - paddingRight) > DIMENSION_EPSILON
      || Math.abs(nextPadding.bottom - paddingBottom) > DIMENSION_EPSILON
      || Math.abs(nextPadding.left - paddingLeft) > DIMENSION_EPSILON
    const radiusChanged = Math.abs(nextRadii.topLeft - radiusTopLeft) > DIMENSION_EPSILON
      || Math.abs(nextRadii.topRight - radiusTopRight) > DIMENSION_EPSILON
      || Math.abs(nextRadii.bottomRight - radiusBottomRight) > DIMENSION_EPSILON
      || Math.abs(nextRadii.bottomLeft - radiusBottomLeft) > DIMENSION_EPSILON

    if (!widthChanged && !fontSizeChanged && !paddingChanged && !radiusChanged) {
      target.set({ scaleX: 1, scaleY: 1 })
      transform.scaleX = 1
      transform.scaleY = 1
      return
    }

    if (nextStyles) {
      target.styles = nextStyles
    }

    target.set({
      width: roundedNextWidth,
      fontSize: shouldScaleFontSize ? nextFontSize : baseFontSize,
      paddingTop: nextPadding.top,
      paddingRight: nextPadding.right,
      paddingBottom: nextPadding.bottom,
      paddingLeft: nextPadding.left,
      radiusTopLeft: nextRadii.topLeft,
      radiusTopRight: nextRadii.topRight,
      radiusBottomRight: nextRadii.bottomRight,
      radiusBottomLeft: nextRadii.bottomLeft,
      scaleX: 1,
      scaleY: 1
    })

    const dimensionsRoundedOnScale = TextManager._roundTextboxDimensions({ textbox: target })

    if (dimensionsRoundedOnScale) {
      target.dirty = true
    }

    const appliedWidth = target.width ?? roundedNextWidth
    const widthActuallyChanged = appliedWidth !== currentWidth

    let adjustedLeft = baseLeft
    if (widthActuallyChanged && (isHorizontalHandle || isCornerHandle)) {
      if (originX === 'right') {
        adjustedLeft = rightEdge - appliedWidth
      } else if (originX === 'center') {
        adjustedLeft = centerX - (appliedWidth / 2)
      }
    }

    target.set({ left: adjustedLeft })
    state.baseLeft = adjustedLeft

    transform.scaleX = 1
    transform.scaleY = 1

    const { original } = transform
    if (original) {
      original.scaleX = 1
      original.scaleY = 1
      original.width = appliedWidth
      original.height = target.height
      original.left = adjustedLeft
    }

    target.setCoords()
    this.canvas.requestRenderAll()

    state.baseWidth = appliedWidth
    state.baseFontSize = target.fontSize ?? nextFontSize
    state.baseStyles = JSON.parse(JSON.stringify(target.styles ?? {})) as TextboxStyles
    state.basePadding = {
      top: nextPadding.top,
      right: nextPadding.right,
      bottom: nextPadding.bottom,
      left: nextPadding.left
    }
    state.baseRadii = {
      topLeft: nextRadii.topLeft,
      topRight: nextRadii.topRight,
      bottomRight: nextRadii.bottomRight,
      bottomLeft: nextRadii.bottomLeft
    }
    state.hasWidthChange = widthActuallyChanged
      || fontSizeChanged
      || paddingChanged
      || radiusChanged
      || dimensionsRoundedOnScale
  }

  /**
   * Завершает трансформацию текстового объекта и фиксирует обновлённые стили/размеры.
   */
  private _handleObjectModified = (event: IEvent<MouseEvent>): void => {
    const { target } = event
    if (target instanceof ActiveSelection) {
      const objects = target.getObjects()
      const hasText = objects.some((obj) => TextManager._isTextbox(obj))
      if (!hasText) return

      const { scaleX = 1, scaleY = 1 } = target
      if (Math.abs(scaleX - 1) < DIMENSION_EPSILON && Math.abs(scaleY - 1) < DIMENSION_EPSILON) return

      // "Запекаем" трансформацию группы в объекты, расформировывая группу.
      // Это обновляет абсолютные координаты и масштаб объектов на канвасе.
      this.canvas.discardActiveObject()

      objects.forEach((obj) => {
        if (TextManager._isTextbox(obj)) {
          const sX = obj.scaleX ?? 1
          const sY = obj.scaleY ?? 1

          const newFontSize = (obj.fontSize ?? 16) * sY
          const newWidth = (obj.width ?? 0) * sX

          // Используем scaleY для отступов и радиусов
          const scaleForProps = sY

          const {
            paddingTop = 0,
            paddingRight = 0,
            paddingBottom = 0,
            paddingLeft = 0,
            radiusTopLeft = 0,
            radiusTopRight = 0,
            radiusBottomRight = 0,
            radiusBottomLeft = 0,
            styles
          } = obj

          const nextPadding = {
            paddingTop: Math.max(0, paddingTop * scaleForProps),
            paddingRight: Math.max(0, paddingRight * scaleForProps),
            paddingBottom: Math.max(0, paddingBottom * scaleForProps),
            paddingLeft: Math.max(0, paddingLeft * scaleForProps)
          }

          const nextRadii = {
            radiusTopLeft: Math.max(0, radiusTopLeft * scaleForProps),
            radiusTopRight: Math.max(0, radiusTopRight * scaleForProps),
            radiusBottomRight: Math.max(0, radiusBottomRight * scaleForProps),
            radiusBottomLeft: Math.max(0, radiusBottomLeft * scaleForProps)
          }

          let nextStyles: TextboxStyles | undefined = styles
          if (styles && Object.keys(styles).length > 0) {
            nextStyles = JSON.parse(JSON.stringify(styles)) as TextboxStyles
            Object.values(nextStyles).forEach((line) => {
              Object.values(line).forEach((charStyle) => {
                if (typeof charStyle.fontSize === 'number') {
                  charStyle.fontSize = Math.max(1, charStyle.fontSize * scaleForProps)
                }
              })
            })
          }

          obj.set({
            fontSize: newFontSize,
            width: newWidth,
            scaleX: 1,
            scaleY: 1,
            ...nextPadding,
            ...nextRadii,
            styles: nextStyles
          })

          TextManager._roundTextboxDimensions({ textbox: obj })
        }

        obj.setCoords()
      })

      // Пересоздаем ActiveSelection, чтобы Fabric пересчитал границы группы
      // на основе новых размеров и позиций объектов.
      const newSelection = new ActiveSelection(objects, {
        canvas: this.canvas
      })
      this.canvas.setActiveObject(newSelection)
      this.canvas.requestRenderAll()
      return
    }

    if (!TextManager._isTextbox(target)) return

    target.isScaling = false

    const state = this.scalingState.get(target)
    this.scalingState.delete(target)
    if (!state?.hasWidthChange) return

    // После завершения трансформации фиксируем ширину, отступы, и размер шрифта через updateText,
    // чтобы излишние scaleX/scaleY не попадали в историю.
    const width = target.width ?? target.calcTextWidth()
    const fontSize = target.fontSize ?? state?.baseFontSize ?? 16
    const hasInlineStyles = Boolean(state.baseStyles && Object.keys(state.baseStyles).length)
    const {
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      radiusTopLeft = 0,
      radiusTopRight = 0,
      radiusBottomRight = 0,
      radiusBottomLeft = 0
    } = target

    const styleUpdates: Partial<BackgroundTextboxProps> = {
      width,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      radiusTopLeft,
      radiusTopRight,
      radiusBottomRight,
      radiusBottomLeft
    }

    if (!hasInlineStyles) {
      styleUpdates.fontSize = fontSize
    }

    this.updateText({
      target,
      style: styleUpdates
    })

    target.set({ scaleX: 1, scaleY: 1 })
    target.setCoords()
  }

  /**
   * Возвращает диапазоны символов для каждой строки текста без учёта символов переноса.
   */
  private _getLineRanges({ textbox }: { textbox: EditorTextbox }): TextSelectionRange[] {
    const text = textbox.text ?? ''
    if (!text.length) return []

    const lines = text.split('\n')
    let offset = 0

    return lines.map((line) => {
      const start = offset
      const end = offset + line.length
      offset = end + 1
      return { start, end }
    })
  }

  /**
   * Расширяет выделение до полных строк, которые оно пересекает.
   */
  private _expandRangeToFullLines({
    textbox,
    range
  }: {
    textbox: EditorTextbox
    range: TextSelectionRange
  }): TextSelectionRange {
    const lineRanges = this._getLineRanges({ textbox })
    if (!lineRanges.length) return range

    let { start } = range
    let { end } = range

    lineRanges.forEach(({ start: lineStart, end: lineEnd }) => {
      const intersectsLine = range.end > lineStart && range.start < lineEnd
      if (!intersectsLine) return

      start = Math.min(start, lineStart)
      end = Math.max(end, lineEnd)
    })

    return { start, end }
  }

  /**
   * Создаёт или возвращает сохранённое состояние для текущего цикла масштабирования текста.
   */
  private _ensureScalingState(textbox: EditorTextbox): ScalingState {
    let state = this.scalingState.get(textbox)

    if (!state) {
      const baseWidth = textbox.width ?? textbox.calcTextWidth()
      const baseLeft = textbox.left ?? 0
      const baseFontSize = textbox.fontSize ?? 16
      const { styles: textboxStyles = {} } = textbox
      const {
        paddingTop = 0,
        paddingRight = 0,
        paddingBottom = 0,
        paddingLeft = 0
      } = textbox
      const {
        radiusTopLeft = 0,
        radiusTopRight = 0,
        radiusBottomRight = 0,
        radiusBottomLeft = 0
      } = textbox
      // Храним базовые размеры и стили для одного цикла масштабирования.
      state = {
        baseWidth,
        baseFontSize,
        baseLeft,
        basePadding: {
          top: paddingTop,
          right: paddingRight,
          bottom: paddingBottom,
          left: paddingLeft
        },
        baseRadii: {
          topLeft: radiusTopLeft,
          topRight: radiusTopRight,
          bottomRight: radiusBottomRight,
          bottomLeft: radiusBottomLeft
        },
        baseStyles: JSON.parse(JSON.stringify(textboxStyles)) as TextboxStyles,
        hasWidthChange: false
      }
      this.scalingState.set(textbox, state)
    }

    return state
  }

  /**
   * Возвращает числовое значение размера, используя исходное значение или заранее вычисленное.
   */
  private static _resolveDimension(
    {
      rawValue,
      calculatedValue
    }: {
      rawValue: unknown
      calculatedValue?: unknown
    }
  ): number {
    if (typeof rawValue === 'number') return rawValue

    if (typeof calculatedValue === 'number') {
      return calculatedValue
    }

    return 0
  }

  /**
   * Округляет ширину и высоту текстового блока до ближайших целых значений.
   */
  private static _roundTextboxDimensions(
    {
      textbox
    }: {
      textbox: EditorTextbox
    }
  ): boolean {
    const { width: rawWidth, height: rawHeight, calcTextWidth, calcTextHeight } = textbox as Textbox

    const calculatedWidth = typeof calcTextWidth === 'function'
      ? calcTextWidth.call(textbox)
      : undefined
    const calculatedHeight = typeof calcTextHeight === 'function'
      ? calcTextHeight.call(textbox)
      : undefined

    const width = TextManager._resolveDimension({
      rawValue: rawWidth,
      calculatedValue: calculatedWidth
    })
    const height = TextManager._resolveDimension({
      rawValue: rawHeight,
      calculatedValue: calculatedHeight
    })

    const roundedWidth = Number.isFinite(width) ? Math.round(width) : null
    const roundedHeight = Number.isFinite(height) ? Math.round(height) : null
    const updates: Partial<EditorTextbox> = {}

    if (roundedWidth !== null && roundedWidth !== width) {
      updates.width = Math.max(0, roundedWidth)
    }

    if (roundedHeight !== null && roundedHeight !== height) {
      updates.height = Math.max(0, roundedHeight)
    }

    if (!Object.keys(updates).length) return false

    textbox.set(updates)
    return true
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
