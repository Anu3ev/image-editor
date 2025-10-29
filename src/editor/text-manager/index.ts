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

export type TextStrokePlacement = 'unset' | 'inset' | 'center'

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
  strokePlacement?: TextStrokePlacement
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
   * Состояние шрифтов для объектов, которые пользователи растягивают.
   */
  private scalingState: WeakMap<Textbox, { fontSize: number }>

  private handleObjectScalingBound: (event: IEvent<MouseEvent> & { transform?: Transform }) => void

  private handleObjectModifiedBound: (event: IEvent<MouseEvent>) => void

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.fonts = editor.options.fonts ?? []
    this.scalingState = new WeakMap()

    this.handleObjectScalingBound = this.handleObjectScaling.bind(this)
    this.handleObjectModifiedBound = this.handleObjectModified.bind(this)

    this._bindEvents()
  }

  /**
   * Уничтожает менеджер и снимает слушатели.
   */
  public destroy(): void {
    this.canvas.off('object:scaling', this.handleObjectScalingBound)
    this.canvas.off('object:modified', this.handleObjectModifiedBound)
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
      strokePlacement = strokeWidth > 0 ? 'center' : 'unset',
      opacity = 1,
      ...rest
    }: TextStyleOptions = {},
    { withoutSelection, withoutAdding }: TextCreationFlags = {}
  ): Textbox {
    const resolvedFontFamily = fontFamily ?? this._getDefaultFontFamily()

    const resolvedStrokeWidth = TextManager._resolveStrokeWidth(strokePlacement, strokeWidth)
    const resolvedStrokeColor = TextManager._resolveStrokeColor(
      strokePlacement,
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
      textTransform: uppercase ? 'uppercase' : 'none',
      linethrough: strikethrough,
      textAlign: align,
      fill: color,
      stroke: resolvedStrokeColor,
      strokeWidth: resolvedStrokeWidth,
      strokeUniform: true,
      opacity,
      ...rest
    })

    textbox.textStrokePlacement = strokePlacement

    if (!rest.left && !rest.top) {
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
      strokePlacement,
      opacity,
      ...rest
    } = style

    const updates: Partial<TextboxProps> = { ...rest }

    if (text !== undefined) {
      updates.text = text
    }

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

    if (uppercase !== undefined) {
      updates.textTransform = uppercase ? 'uppercase' : 'none'
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

    if (strokeColor !== undefined || strokeWidth !== undefined || strokePlacement !== undefined) {
      const providedWidth = strokeWidth !== undefined ? strokeWidth : textbox.strokeWidth ?? 0
      const providedPlacement = strokePlacement !== undefined
        ? strokePlacement
        : textbox.textStrokePlacement ?? (providedWidth > 0 ? 'center' : 'unset')

      const normalizedPlacement = providedWidth > 0 && providedPlacement !== 'unset'
        ? providedPlacement ?? 'center'
        : 'unset'

      textbox.textStrokePlacement = normalizedPlacement

      const resolvedPlacement = textbox.textStrokePlacement ?? 'unset'
      const widthSource = strokeWidth !== undefined ? strokeWidth : textbox.strokeWidth ?? 0
      const resolvedStrokeWidth = TextManager._resolveStrokeWidth(resolvedPlacement, widthSource)
      const colorSource = strokeColor !== undefined ? strokeColor : textbox.stroke ?? undefined
      updates.stroke = TextManager._resolveStrokeColor(resolvedPlacement, colorSource, resolvedStrokeWidth)
      updates.strokeWidth = resolvedStrokeWidth
    }

    if (opacity !== undefined) {
      updates.opacity = opacity
    }

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

    const { canvas } = this.editor

    if (!reference) {
      const activeObject = canvas.getActiveObject()
      return TextManager._isTextbox(activeObject) ? activeObject : null
    }

    if (typeof reference === 'string') {
      const object = canvas.getObjects()
        .find((item) => TextManager._isTextbox(item) && item.id === reference) as Textbox | undefined

      return object ?? null
    }

    return null
  }

  private static _isTextbox(object?: FabricObject | null): object is Textbox {
    return Boolean(object) && object instanceof Textbox
  }

  private _bindEvents(): void {
    this.canvas.on('object:scaling', this.handleObjectScalingBound)
    this.canvas.on('object:modified', this.handleObjectModifiedBound)
  }

  private handleObjectScaling(event: IEvent<MouseEvent> & { transform?: Transform }): void {
    const { target, transform } = event
    if (!TextManager._isTextbox(target)) return

    const baseFontSize = this._ensureScalingState(target)
    const scaleX = transform?.scaleX ?? target.scaleX ?? 1
    const scaleY = transform?.scaleY ?? target.scaleY ?? 1
    const maxScale = Math.max(Math.abs(scaleX), Math.abs(scaleY))
    const scale = Number.isFinite(maxScale) && maxScale > 0 ? maxScale : 1
    const nextFontSize = Math.max(1, baseFontSize * scale)

    const updatedTextbox = this.updateText(target, { fontSize: nextFontSize }, {
      withoutSave: true,
      skipRender: true
    })

    if (!updatedTextbox) return

    updatedTextbox.set({
      scaleX: 1,
      scaleY: 1
    })
    if (transform) {
      transform.scaleX = 1
      transform.scaleY = 1
    }

    this.scalingState.set(updatedTextbox, { fontSize: updatedTextbox.fontSize ?? nextFontSize })

    updatedTextbox.setCoords()
    this.canvas.requestRenderAll()
  }

  private handleObjectModified(event: IEvent<MouseEvent>): void {
    const { target } = event
    if (!TextManager._isTextbox(target)) return

    this.scalingState.delete(target)
  }

  private _ensureScalingState(textbox: Textbox): number {
    let state = this.scalingState.get(textbox)

    if (!state) {
      state = { fontSize: textbox.fontSize ?? 16 }
      this.scalingState.set(textbox, state)
    }

    return state.fontSize
  }

  private static _resolveStrokeColor(
    placement: TextStrokePlacement,
    strokeColor: string | undefined,
    width: number
  ): string | undefined {
    if (placement === 'unset' || width <= 0) return undefined

    return strokeColor ?? '#000000'
  }

  private static _resolveStrokeWidth(placement: TextStrokePlacement, width: number | undefined): number {
    if (placement === 'unset' || !width || width <= 0) return 0

    // Fabric поддерживает только центрированную обводку.
    return Math.max(0, width)
  }

  private _getDefaultFontFamily(): string {
    return this.fonts[0]?.family ?? 'Arial'
  }
}
