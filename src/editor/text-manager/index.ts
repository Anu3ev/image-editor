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
import type { EditorFontDefinition } from '../types/font'

type TextCreationFlags = {
  withoutSelection?: boolean
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
  align?: 'left' | 'center' | 'right'
  color?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
} & Partial<
  Omit<
    TextboxProps,
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

type TextReference = string | Textbox | null | undefined

type UpdateOptions = {
  withoutSave?: boolean
  skipRender?: boolean
}

const DIMENSION_EPSILON = 0.01

type ScalingState = {
  baseWidth: number
  baseLeft: number
  baseFontSize: number
  hasWidthChange: boolean
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
  private fonts: EditorFontDefinition[]

  /**
   * Данные о масштабе текста, которые собираются в процессе трансформации.
   */
  private scalingState: WeakMap<Textbox, ScalingState>

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.fonts = editor.options.fonts ?? []
    this.scalingState = new WeakMap()

    this._bindEvents()
  }

  /**
   * Уничтожает менеджер и снимает слушатели.
   */
  public destroy(): void {
    this.canvas.off('object:scaling', this.handleObjectScaling)
    this.canvas.off('object:modified', this.handleObjectModified)
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
      ...rest
    }: TextStyleOptions = {},
    { withoutSelection, withoutAdding }: TextCreationFlags = {}
  ): Textbox {
    const resolvedFontFamily = fontFamily ?? this._getDefaultFontFamily()

    const resolvedStrokeWidth = TextManager._resolveStrokeWidth(strokeWidth)
    const resolvedStrokeColor = TextManager._resolveStrokeColor(
      strokeColor,
      resolvedStrokeWidth
    )

    const textbox = new Textbox(text, {
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

    return textbox
  }

  /**
   * Обновляет текстовый объект.
   * @param target — объект, его id или активный объект (если не передан)
   * @param style — стиль, который нужно применить
   * @param options — настройки обновления
   */
  public updateText(
    target: TextReference,
    style: TextStyleOptions = {},
    { withoutSave, skipRender }: UpdateOptions = {}
  ): Textbox | null {
    const textbox = this._resolveTextObject(target)
    if (!textbox) return null

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
      ...rest
    } = style

    const updates: Partial<TextboxProps> = { ...rest }

    if (fontFamily !== undefined) {
      updates.fontFamily = fontFamily
    }

    if (fontSize !== undefined) {
      updates.fontSize = fontSize
    }

    if (bold !== undefined) {
      updates.fontWeight = bold ? 'bold' : 'normal'
    }

    if (italic !== undefined) {
      updates.fontStyle = italic ? 'italic' : 'normal'
    }

    if (underline !== undefined) {
      updates.underline = underline
    }

    if (strikethrough !== undefined) {
      updates.linethrough = strikethrough
    }

    if (align !== undefined) {
      updates.textAlign = align
    }

    if (color !== undefined) {
      updates.fill = color
    }

    if (strokeColor !== undefined || strokeWidth !== undefined) {
      const widthSource = strokeWidth ?? textbox.strokeWidth ?? 0
      const resolvedStrokeWidth = TextManager._resolveStrokeWidth(widthSource)
      const colorSource = strokeColor ?? textbox.stroke ?? undefined
      updates.stroke = TextManager._resolveStrokeColor(colorSource, resolvedStrokeWidth)
      updates.strokeWidth = resolvedStrokeWidth
    }

    if (opacity !== undefined) {
      updates.opacity = opacity
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
    textbox.setCoords()

    if (!skipRender) {
      this.canvas.requestRenderAll()
    }

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    return textbox
  }

  /**
   * Возвращает активный текст или ищет по id.
   */
  private _resolveTextObject(reference: TextReference): Textbox | null {
    if (reference instanceof Textbox) return reference

    if (!reference) {
      const activeObject = this.canvas.getActiveObject()
      return TextManager._isTextbox(activeObject) ? activeObject : null
    }

    if (typeof reference === 'string') {
      const object = this.canvas.getObjects()
        .find((item): item is Textbox => TextManager._isTextbox(item) && item.id === reference)

      return object ?? null
    }

    return null
  }

  private static _isTextbox(object?: FabricObject | null): object is Textbox {
    return Boolean(object) && object instanceof Textbox
  }

  private _bindEvents(): void {
    this.canvas.on('object:scaling', this.handleObjectScaling)
    this.canvas.on('object:modified', this.handleObjectModified)
  }

  private handleObjectScaling = (event: IEvent<MouseEvent> & { transform?: Transform }): void => {
    // При масштабировании текстовых объектов пересчитываем ширину/кегль и сбрасываем scale,
    // чтобы Fabric не копил дробные значения и не ломал базовую геометрию.
    const { target, transform } = event
    if (!TextManager._isTextbox(target)) return
    if (!transform) return

    const state = this._ensureScalingState(target)
    const { baseWidth: stateBaseWidth, baseLeft: stateBaseLeft, baseFontSize } = state
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

    const originX = transform.originX ?? target.originX ?? 'left'
    const rightEdge = baseLeft + baseWidth
    const centerX = baseLeft + (baseWidth / 2)

    const currentWidth = target.width ?? baseWidth
    const widthChanged = Math.abs(nextWidth - currentWidth) > DIMENSION_EPSILON
    const fontSizeChanged = Math.abs(nextFontSize - (target.fontSize ?? baseFontSize)) > DIMENSION_EPSILON

    if (!widthChanged && !fontSizeChanged) {
      target.set({ scaleX: 1, scaleY: 1 })
      transform.scaleX = 1
      transform.scaleY = 1
      return
    }

    target.set({
      width: nextWidth,
      fontSize: isCornerHandle || isVerticalHandle ? nextFontSize : baseFontSize,
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
    state.hasWidthChange = widthActuallyChanged || fontSizeChanged
  }

  private handleObjectModified = (event: IEvent<MouseEvent>): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return
    const state = this.scalingState.get(target)
    this.scalingState.delete(target)
    if (!state?.hasWidthChange) return

    // После завершения трансформации фиксируем ширину и размер шрифта через updateText,
    // чтобы излишние scaleX/scaleY не попадали в историю.

    const width = target.width ?? target.calcTextWidth()
    const fontSize = target.fontSize ?? state?.baseFontSize ?? 16

    this.updateText(target, { width, fontSize })

    target.set({ scaleX: 1, scaleY: 1 })
    target.setCoords()
  }

  private _ensureScalingState(textbox: Textbox): ScalingState {
    let state = this.scalingState.get(textbox)

    if (!state) {
      const baseWidth = textbox.width ?? textbox.calcTextWidth()
      const baseLeft = textbox.left ?? 0
      const baseFontSize = textbox.fontSize ?? 16
      // Храним базовые размеры для одного цикла масштабирования.
      state = {
        baseWidth,
        baseFontSize,
        baseLeft,
        hasWidthChange: false
      }
      this.scalingState.set(textbox, state)
    }

    return state
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
