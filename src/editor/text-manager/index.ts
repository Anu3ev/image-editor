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
  initialWidth: number
  initialFontSize: number
  anchorLeft: number
  anchorRight: number
  anchorCenter: number
  baseWidth: number
  baseLeft: number
  baseFontSize: number
  lastAppliedWidth: number
  lastAppliedFontSize: number
  hasWidthChange: boolean
  hasFontSizeChange: boolean
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

    textbox.textCaseRaw = textbox.text ?? ''

    if (uppercase) {
      const uppercased = TextManager._toUpperCase(textbox.textCaseRaw)
      if (uppercased !== textbox.text) {
        textbox.set({ text: uppercased })
      }
    }

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

    if (uppercase !== undefined) {
      // handled below
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
      const widthSource = strokeWidth !== undefined ? strokeWidth : textbox.strokeWidth ?? 0
      const resolvedStrokeWidth = TextManager._resolveStrokeWidth(widthSource)
      const colorSource = strokeColor !== undefined ? strokeColor : textbox.stroke ?? undefined
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
    const nextUppercase = uppercase !== undefined ? uppercase : previousUppercase
    const uppercaseChanged = nextUppercase !== previousUppercase

    if (hasTextUpdate || uppercaseChanged) {
      const normalizedRaw = targetRawText
      const renderedText = nextUppercase
        ? TextManager._toUpperCase(normalizedRaw)
        : normalizedRaw
      updates.text = renderedText
      textbox.textCaseRaw = normalizedRaw
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
    console.log('[TextManager] handleObjectScaling triggered')
    const { target, transform } = event
    if (!TextManager._isTextbox(target)) return
    if (!transform) return

    const state = this._ensureScalingState(target)
    const originalWidth = typeof transform.original?.width === 'number' ? transform.original.width : undefined
    const originalLeft = typeof transform.original?.left === 'number' ? transform.original.left : undefined
    const { baseWidth, baseLeft, baseFontSize } = {
      baseWidth: originalWidth ?? state.baseWidth,
      baseLeft: originalLeft ?? state.baseLeft,
      baseFontSize: state.baseFontSize
    }

    const corner = transform.corner ?? ''
    const action = transform.action ?? ''
    const isHorizontalHandle = ['ml', 'mr'].includes(corner) || action === 'scaleX'
    const isVerticalHandle = ['mt', 'mb'].includes(corner) || action === 'scaleY'
    const isCornerHandle = ['tl', 'tr', 'bl', 'br'].includes(corner) || action === 'scale'

    console.log('[TextManager] handleObjectScaling info', {
      corner,
      action,
      isHorizontalHandle,
      isVerticalHandle,
      isCornerHandle,
      transformScaleX: transform.scaleX,
      transformScaleY: transform.scaleY,
      targetScaleX: target.scaleX,
      targetScaleY: target.scaleY
    })

    if (!isHorizontalHandle && !isVerticalHandle && !isCornerHandle) return

    const widthScale = Math.abs(target.scaleX ?? transform.scaleX ?? 1) || 1
    const heightScale = Math.abs(target.scaleY ?? transform.scaleY ?? 1) || 1
    const nextWidth = Math.max(1, baseWidth * widthScale)
    const nextFontSize = Math.max(1, baseFontSize * heightScale)

    const originX = transform.originX ?? target.originX ?? 'left'
    const rightEdge = baseLeft + baseWidth
    const centerX = baseLeft + (baseWidth / 2)

    let nextLeft = baseLeft

    if (originX === 'right') {
      nextLeft = rightEdge - nextWidth
    } else if (originX === 'center') {
      nextLeft = centerX - (nextWidth / 2)
    }

    const currentWidth = target.width ?? baseWidth
    const widthChanged = Math.abs(nextWidth - currentWidth) > DIMENSION_EPSILON
    const fontSizeChanged = Math.abs(nextFontSize - (target.fontSize ?? baseFontSize)) > DIMENSION_EPSILON

    console.log('[TextManager] handleObjectScaling computed', {
      widthScale,
      heightScale,
      nextWidth,
      nextLeft,
      nextFontSize,
      currentWidth,
      widthChanged,
      fontSizeChanged,
      originX
    })

    if (!widthChanged && !fontSizeChanged) {
      target.set({ scaleX: 1, scaleY: 1 })
      transform.scaleX = 1
      transform.scaleY = 1
      console.log('[TextManager] handleObjectScaling skipped (no changes)')
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

    console.log('[TextManager] handleObjectScaling applied', {
      width: appliedWidth,
      left: adjustedLeft,
      fontSize: target.fontSize
    })
  }

  private handleObjectModified(event: IEvent<MouseEvent>): void {
    const { target } = event
    if (!TextManager._isTextbox(target)) return
    const state = this.scalingState.get(target)
    const hasWidthChange = state?.hasWidthChange

    this.scalingState.delete(target)

    if (!hasWidthChange) {
      console.log('[TextManager] handleObjectModified: no width change, skip update')
      return
    }

    const width = target.width ?? target.calcTextWidth()
    const fontSize = target.fontSize ?? state?.baseFontSize ?? 16

    console.log('[TextManager] handleObjectModified: apply final size', {
      width,
      fontSize
    })

    this.updateText(target, {
      width,
      fontSize
    })

    target.set({ scaleX: 1, scaleY: 1 })
    target.setCoords()
  }

  private _ensureScalingState(textbox: Textbox): ScalingState {
    let state = this.scalingState.get(textbox)

    if (!state) {
      const baseWidth = textbox.width ?? textbox.calcTextWidth()
      const baseLeft = textbox.left ?? 0
      const baseFontSize = textbox.fontSize ?? 16
      state = {
        initialWidth: baseWidth,
        initialFontSize: baseFontSize,
        anchorLeft: baseLeft,
        anchorRight: baseLeft + baseWidth,
        anchorCenter: baseLeft + (baseWidth / 2),
        baseWidth,
        baseFontSize,
        baseLeft,
        lastAppliedWidth: baseWidth,
        lastAppliedFontSize: baseFontSize,
        hasWidthChange: false,
        hasFontSizeChange: false
      } as unknown as ScalingState
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
    if (!width || width <= 0) return 0

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
