import {
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

type ScalingState = {
  baseWidth: number
  baseLeft: number
  baseFontSize: number
  basePadding: PaddingValues
  baseRadii: CornerRadiiValues
  hasWidthChange: boolean
}

type TextSelectionRange = {
  start: number
  end: number
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
    historyManager.suspendHistory()

    const resolvedFontFamily = fontFamily ?? this._getDefaultFontFamily()

    const resolvedStrokeWidth = TextManager._resolveStrokeWidth(strokeWidth)
    const resolvedStrokeColor = TextManager._resolveStrokeColor(
      strokeColor,
      resolvedStrokeWidth
    )

    const textbox = new BackgroundTextbox(text, {
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
    })

    // textCaseRaw хранит исходную строку без применения uppercase
    textbox.textCaseRaw = textbox.text ?? ''

    if (uppercase) {
      const uppercased = TextManager._toUpperCase(textbox.textCaseRaw)
      if (uppercased !== textbox.text) {
        textbox.set({ text: uppercased })
      }
    }

    if (rest.left === undefined && rest.top === undefined) {
      this.canvas.centerObject(textbox)
    }

    if (!withoutAdding) {
      this.canvas.add(textbox)
    }

    if (!withoutSelection) {
      this.canvas.setActiveObject(textbox)
    }

    this.canvas.requestRenderAll()

    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    const appliedOptions = {
      id,
      text,
      fontFamily: resolvedFontFamily,
      fontSize,
      bold,
      italic,
      underline,
      uppercase,
      strikethrough,
      align,
      color,
      strokeColor: resolvedStrokeColor,
      strokeWidth: resolvedStrokeWidth,
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

    this.canvas.fire('editor:text-added', {
      textbox,
      options: appliedOptions,
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
    historyManager.suspendHistory()

    const beforeState = {
      id: textbox.id,
      text: textbox.text ?? undefined,
      textCaseRaw: textbox.textCaseRaw ?? undefined,
      uppercase: Boolean(textbox.uppercase),
      fontFamily: textbox.fontFamily ?? undefined,
      fontSize: textbox.fontSize ?? undefined,
      fontWeight: textbox.fontWeight ?? undefined,
      fontStyle: textbox.fontStyle ?? undefined,
      underline: textbox.underline ?? undefined,
      linethrough: textbox.linethrough ?? undefined,
      textAlign: textbox.textAlign,
      fill: textbox.fill ?? undefined,
      stroke: textbox.stroke ?? undefined,
      strokeWidth: textbox.strokeWidth ?? undefined,
      opacity: textbox.opacity ?? undefined,
      backgroundColor: textbox.backgroundColor ?? undefined,
      backgroundOpacity: textbox.backgroundOpacity ?? undefined,
      paddingTop: textbox.paddingTop ?? undefined,
      paddingRight: textbox.paddingRight ?? undefined,
      paddingBottom: textbox.paddingBottom ?? undefined,
      paddingLeft: textbox.paddingLeft ?? undefined,
      radiusTopLeft: textbox.radiusTopLeft ?? undefined,
      radiusTopRight: textbox.radiusTopRight ?? undefined,
      radiusBottomRight: textbox.radiusBottomRight ?? undefined,
      radiusBottomLeft: textbox.radiusBottomLeft ?? undefined,
      left: textbox.left ?? undefined,
      top: textbox.top ?? undefined,
      width: textbox.width ?? undefined,
      height: textbox.height ?? undefined,
      angle: textbox.angle ?? undefined,
      scaleX: textbox.scaleX ?? undefined,
      scaleY: textbox.scaleY ?? undefined
    }

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
    const selectionRange = TextManager._getSelectionRange(textbox)
    const selectionStyles: Partial<TextboxProps> = {}
    const wholeTextStyles: Partial<TextboxProps> = {}
    const isFullTextSelection = TextManager._isFullTextSelection(textbox, selectionRange)
    const shouldUpdateWholeObject = !selectionRange || isFullTextSelection
    const shouldApplyWholeTextStyles = !selectionRange

    if (fontFamily !== undefined) {
      if (selectionRange) {
        selectionStyles.fontFamily = fontFamily
      }

      if (shouldUpdateWholeObject) {
        updates.fontFamily = fontFamily
        if (shouldApplyWholeTextStyles) {
          wholeTextStyles.fontFamily = fontFamily
        }
      }
    }

    if (fontSize !== undefined) {
      updates.fontSize = fontSize
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
        ? TextManager._getSelectionStyleValue<number>(textbox, selectionRange, 'strokeWidth')
        : undefined
      const selectionStrokeColor = selectionRange
        ? TextManager._getSelectionStyleValue<string>(textbox, selectionRange, 'stroke')
        : undefined

      const widthSource = strokeWidth ?? selectionStrokeWidth ?? textbox.strokeWidth ?? 0
      const resolvedStrokeWidth = TextManager._resolveStrokeWidth(widthSource)
      const colorSource = strokeColor ?? selectionStrokeColor ?? textbox.stroke ?? undefined
      const resolvedStrokeColor = TextManager._resolveStrokeColor(colorSource, resolvedStrokeWidth)

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
        ? TextManager._toUpperCase(targetRawText)
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
      stylesApplied = TextManager._applyStylesToRange(textbox, selectionStyles, selectionRange)
    } else if (Object.keys(wholeTextStyles).length) {
      const fullRange = TextManager._getFullTextRange(textbox)
      if (fullRange) {
        stylesApplied = TextManager._applyStylesToRange(textbox, wholeTextStyles, fullRange)
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

    textbox.setCoords()

    if (!skipRender) {
      this.canvas.requestRenderAll()
    }

    historyManager.resumeHistory()
    if (!withoutSave) {
      historyManager.saveState()
    }

    const afterState = {
      id: textbox.id,
      text: textbox.text ?? undefined,
      textCaseRaw: textbox.textCaseRaw ?? undefined,
      uppercase: Boolean(textbox.uppercase),
      fontFamily: textbox.fontFamily ?? undefined,
      fontSize: textbox.fontSize ?? undefined,
      fontWeight: textbox.fontWeight ?? undefined,
      fontStyle: textbox.fontStyle ?? undefined,
      underline: textbox.underline ?? undefined,
      linethrough: textbox.linethrough ?? undefined,
      textAlign: textbox.textAlign,
      fill: textbox.fill ?? undefined,
      stroke: textbox.stroke ?? undefined,
      strokeWidth: textbox.strokeWidth ?? undefined,
      opacity: textbox.opacity ?? undefined,
      backgroundColor: textbox.backgroundColor ?? undefined,
      backgroundOpacity: textbox.backgroundOpacity ?? undefined,
      paddingTop: textbox.paddingTop ?? undefined,
      paddingRight: textbox.paddingRight ?? undefined,
      paddingBottom: textbox.paddingBottom ?? undefined,
      paddingLeft: textbox.paddingLeft ?? undefined,
      radiusTopLeft: textbox.radiusTopLeft ?? undefined,
      radiusTopRight: textbox.radiusTopRight ?? undefined,
      radiusBottomRight: textbox.radiusBottomRight ?? undefined,
      radiusBottomLeft: textbox.radiusBottomLeft ?? undefined,
      left: textbox.left ?? undefined,
      top: textbox.top ?? undefined,
      width: textbox.width ?? undefined,
      height: textbox.height ?? undefined,
      angle: textbox.angle ?? undefined,
      scaleX: textbox.scaleX ?? undefined,
      scaleY: textbox.scaleY ?? undefined
    }

    this.canvas.fire('editor:text-updated', {
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
    this.canvas.off('object:scaling', this._handleObjectScaling)
    this.canvas.off('object:modified', this._handleObjectModified)
    this.canvas.off('text:editing:exited', this._handleTextEditingExited)
    this.canvas.off('text:editing:entered', this._handleTextEditingEntered)
    this.canvas.off('text:changed', this._handleTextChanged)
  }

  /**
   * Возвращает активный текст или ищет по id.
   */
  private _resolveTextObject(reference: TextReference): EditorTextbox | null {
    if (reference instanceof Textbox) return reference

    if (!reference) {
      const activeObject = this.canvas.getActiveObject()
      return TextManager._isTextbox(activeObject) ? activeObject : null
    }

    if (typeof reference === 'string') {
      const object = this.canvas.getObjects()
        .find((item): item is EditorTextbox => TextManager._isTextbox(item) && item.id === reference)

      return object ?? null
    }

    return null
  }

  private static _isTextbox(object?: FabricObject | null): object is EditorTextbox {
    return Boolean(object) && object instanceof Textbox
  }

  private _bindEvents(): void {
    this.canvas.on('object:scaling', this._handleObjectScaling)
    this.canvas.on('object:modified', this._handleObjectModified)
    this.canvas.on('text:editing:entered', this._handleTextEditingEntered)
    this.canvas.on('text:editing:exited', this._handleTextEditingExited)
    this.canvas.on('text:changed', this._handleTextChanged)
  }

  private _handleTextEditingEntered = (): void => {
    this.isTextEditingActive = true
  }

  /**
   * Обрабатывает изменение текста во время редактирования.
   * Обновляет textCaseRaw в реальном времени для корректной работы uppercase.
   */
  private _handleTextChanged = (event: IEvent): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return

    const currentText = target.text ?? ''
    const isUppercase = Boolean(target.uppercase)
    const previousRaw = target.textCaseRaw ?? ''

    if (isUppercase) {
      // Если uppercase включен, принудительно переводим весь текст в верхний регистр
      const uppercased = TextManager._toUpperCase(currentText)

      if (uppercased !== currentText) {
        // Текст содержит маленькие буквы, нужно их перевести в верхний регистр
        target.set({ text: uppercased })
        this.canvas.requestRenderAll()
      }

      // Восстанавливаем оригинальный регистр:
      // Определяем, какие символы были добавлены/изменены
      const rawLength = previousRaw.length
      const currentLength = currentText.length

      if (currentLength > rawLength) {
        // Добавлены новые символы - сохраняем их в нижнем регистре
        const addedText = currentText.slice(rawLength).toLocaleLowerCase()
        target.textCaseRaw = previousRaw + addedText
      } else if (currentLength < rawLength) {
        // Символы удалены - обрезаем textCaseRaw
        target.textCaseRaw = previousRaw.slice(0, currentLength)
      } else {
        // Длина не изменилась, но текст мог измениться (замена символов)
        // Сохраняем новые символы в нижнем регистре
        target.textCaseRaw = currentText.toLocaleLowerCase()
      }
    } else {
      // Если uppercase выключен, сохраняем текст как есть (с оригинальным регистром)
      target.textCaseRaw = currentText
    }
  }

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

  private _handleObjectScaling = (event: IEvent<MouseEvent> & { transform?: Transform }): void => {
    // При масштабировании текстовых объектов пересчитываем ширину/кегль и сбрасываем scale,
    // чтобы Fabric не копил дробные значения и не ломал базовую геометрию.
    const { target, transform } = event
    if (!TextManager._isTextbox(target)) return
    if (!transform) return

    target.isScaling = true

    const state = this._ensureScalingState(target)
    const {
      baseWidth: stateBaseWidth,
      baseLeft: stateBaseLeft,
      baseFontSize,
      basePadding,
      baseRadii
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

    if (!isHorizontalHandle && !isVerticalHandle && !isCornerHandle) return

    const widthScale = Math.abs(target.scaleX ?? transform.scaleX ?? 1) || 1
    const heightScale = Math.abs(target.scaleY ?? transform.scaleY ?? 1) || 1
    const nextWidth = Math.max(1, baseWidth * widthScale)
    const nextFontSize = Math.max(1, baseFontSize * heightScale)
    const { paddingTop = 0, paddingRight = 0, paddingBottom = 0, paddingLeft = 0 } = target
    const {
      radiusTopLeft = 0,
      radiusTopRight = 0,
      radiusBottomRight = 0,
      radiusBottomLeft = 0
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

    const originX = transform.originX ?? target.originX ?? 'left'
    const rightEdge = baseLeft + baseWidth
    const centerX = baseLeft + (baseWidth / 2)

    const currentWidth = target.width ?? baseWidth
    const widthChanged = Math.abs(nextWidth - currentWidth) > DIMENSION_EPSILON
    const fontSizeChanged = Math.abs(nextFontSize - (target.fontSize ?? baseFontSize)) > DIMENSION_EPSILON
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

    target.set({
      width: nextWidth,
      fontSize: isCornerHandle || isVerticalHandle ? nextFontSize : baseFontSize,
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

    const appliedWidth = target.width ?? nextWidth
    const widthActuallyChanged = Math.abs(appliedWidth - currentWidth) > DIMENSION_EPSILON

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
    state.hasWidthChange = widthActuallyChanged || fontSizeChanged || paddingChanged || radiusChanged
  }

  private _handleObjectModified = (event: IEvent<MouseEvent>): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return

    target.isScaling = false

    const state = this.scalingState.get(target)
    this.scalingState.delete(target)
    if (!state?.hasWidthChange) return

    // После завершения трансформации фиксируем ширину, отступы, и размер шрифта через updateText,
    // чтобы излишние scaleX/scaleY не попадали в историю.
    const width = target.width ?? target.calcTextWidth()
    const fontSize = target.fontSize ?? state?.baseFontSize ?? 16
    const {
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0
    } = target
    const {
      radiusTopLeft = 0,
      radiusTopRight = 0,
      radiusBottomRight = 0,
      radiusBottomLeft = 0
    } = target

    this.updateText({
      target,
      style: {
        width,
        fontSize,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        radiusTopLeft,
        radiusTopRight,
        radiusBottomRight,
        radiusBottomLeft
      }
    })

    target.set({ scaleX: 1, scaleY: 1 })
    target.setCoords()
  }

  private _ensureScalingState(textbox: EditorTextbox): ScalingState {
    let state = this.scalingState.get(textbox)

    if (!state) {
      const baseWidth = textbox.width ?? textbox.calcTextWidth()
      const baseLeft = textbox.left ?? 0
      const baseFontSize = textbox.fontSize ?? 16
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
      // Храним базовые размеры для одного цикла масштабирования.
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
        hasWidthChange: false
      }
      this.scalingState.set(textbox, state)
    }

    return state
  }

  private static _getSelectionRange(textbox: EditorTextbox): TextSelectionRange | null {
    if (!textbox.isEditing) return null

    const selectionStart = textbox.selectionStart ?? 0
    const selectionEnd = textbox.selectionEnd ?? selectionStart
    if (selectionStart === selectionEnd) return null

    return {
      start: Math.min(selectionStart, selectionEnd),
      end: Math.max(selectionStart, selectionEnd)
    }
  }

  private static _getFullTextRange(textbox: EditorTextbox): TextSelectionRange | null {
    const length = textbox.text?.length ?? 0
    if (length <= 0) return null

    return { start: 0, end: length }
  }

  private static _isFullTextSelection(
    textbox: EditorTextbox,
    range: TextSelectionRange | null
  ): boolean {
    if (!range) return false

    const textLength = textbox.text?.length ?? 0
    if (textLength <= 0) return false

    return range.start <= 0 && range.end >= textLength
  }

  private static _applyStylesToRange(
    textbox: EditorTextbox,
    styles: Partial<TextboxProps>,
    range: TextSelectionRange
  ): boolean {
    if (!styles || !Object.keys(styles).length) return false
    const { start, end } = range
    if (end <= start) return false

    textbox.setSelectionStyles(styles, start, end)
    return true
  }

  private static _getSelectionStyleValue<T extends keyof TextboxProps>(
    textbox: EditorTextbox,
    range: TextSelectionRange | null,
    property: T
  ): TextboxProps[T] | undefined {
    if (!range) return undefined

    const styles = textbox.getSelectionStyles(
      range.start,
      range.end,
      true
    ) as Array<Partial<TextboxProps>>

    if (!styles.length) return undefined
    return styles[0]?.[property]
  }

  private static _resolveStrokeColor(
    strokeColor: string | undefined,
    width: number
  ): string | undefined {
    if (width <= 0) return undefined

    return strokeColor ?? '#000000'
  }

  private static _resolveStrokeWidth(width: number | undefined): number {
    if (!width) return 0

    // Fabric поддерживает только центрированную обводку.
    return Math.max(0, width)
  }

  private static _toUpperCase(value: string): string {
    return typeof value === 'string' ? value.toLocaleUpperCase() : ''
  }

  private _getDefaultFontFamily(): string {
    return this.fonts[0]?.family ?? 'Arial'
  }
}
