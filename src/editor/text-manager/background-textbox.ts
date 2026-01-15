import {
  Color,
  Point,
  Textbox,
  type GraphemeBBox,
  type TextboxProps,
  classRegistry
} from 'fabric'
import ErrorManager from '../error-manager'
import { resolveStrokeColor, resolveStrokeWidth } from '../utils/text'

export type LineFontDefault = {
  fontFamily?: string
  fontSize?: number
  fill?: string
  stroke?: string
}

export type LineFontDefaults = Record<number, LineFontDefault>

export type BackgroundTextboxProps = TextboxProps & {
  backgroundColor?: string
  backgroundOpacity?: number
  lineFontDefaults?: LineFontDefaults
  paddingBottom?: number
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  radiusBottomLeft?: number
  radiusBottomRight?: number
  radiusTopLeft?: number
  radiusTopRight?: number
  type?: string
}

type CornerRadii = {
  bottomLeft: number
  bottomRight: number
  topLeft: number
  topRight: number
}

type BackgroundRectOptions = {
  ctx: CanvasRenderingContext2D
  height: number
  left: number
  radii: CornerRadii
  top: number
  width: number
}

type Padding = {
  bottom: number
  left: number
  right: number
  top: number
}

const clampNumber = ({
  value,
  min,
  max
}: {
  max: number
  min: number
  value: number
}): number => Math.min(Math.max(value, min), max)

export class BackgroundTextbox extends Textbox {
  static override type = 'background-textbox'

  static override cacheProperties = [
    ...Array.isArray(Textbox.cacheProperties) ? Textbox.cacheProperties : [],
    'backgroundColor',
    'backgroundOpacity',
    'lineFontDefaults',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'radiusTopLeft',
    'radiusTopRight',
    'radiusBottomRight',
    'radiusBottomLeft'
  ]

  static override stateProperties = [
    ...Array.isArray(Textbox.stateProperties) ? Textbox.stateProperties : [],
    'backgroundColor',
    'backgroundOpacity',
    'lineFontDefaults',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'radiusTopLeft',
    'radiusTopRight',
    'radiusBottomRight',
    'radiusBottomLeft'
  ]

  public backgroundOpacity?: number

  public lineFontDefaults?: LineFontDefaults

  public paddingBottom?: number

  public paddingLeft?: number

  public paddingRight?: number

  public paddingTop?: number

  public radiusBottomLeft?: number

  public radiusBottomRight?: number

  public radiusTopLeft?: number

  public radiusTopRight?: number

  constructor(text: string, options: BackgroundTextboxProps = {}) {
    super(text, options)

    this.backgroundOpacity = options.backgroundOpacity ?? 1
    this.lineFontDefaults = options.lineFontDefaults ?? undefined
    this.paddingTop = options.paddingTop ?? 0
    this.paddingRight = options.paddingRight ?? 0
    this.paddingBottom = options.paddingBottom ?? 0
    this.paddingLeft = options.paddingLeft ?? 0
    this.radiusTopLeft = options.radiusTopLeft ?? 0
    this.radiusTopRight = options.radiusTopRight ?? 0
    this.radiusBottomRight = options.radiusBottomRight ?? 0
    this.radiusBottomLeft = options.radiusBottomLeft ?? 0

    this._roundDimensions()
  }

  /**
   * Пересчитывает размеры текста и округляет их до целых значений.
   */
  public override initDimensions(): void {
    super.initDimensions()
    this._roundDimensions()
  }

  protected override _getLeftOffset(): number {
    const { width } = this._getBackgroundDimensions()
    const { left } = this._getPadding()
    return (-width / 2) + left
  }

  protected override _getTopOffset(): number {
    const { height } = this._getBackgroundDimensions()
    const { top } = this._getPadding()
    return (-height / 2) + top
  }

  protected override _getNonTransformedDimensions(): Point {
    const { width, height } = this._getBackgroundDimensions()
    return new Point(width, height).scalarAdd(this.strokeWidth)
  }

  protected override _getTransformedDimensions(options: { width?: number; height?: number } = {}): Point {
    const { width, height } = this._getBackgroundDimensions()
    return super._getTransformedDimensions({
      ...options,
      width,
      height
    })
  }

  /**
   * Возвращает сериализованное представление с учётом фона, отступов и скруглений.
   */
  public override toObject(propertiesToInclude: string[] = []): Record<string, unknown> {
    const baseObject = super.toObject(propertiesToInclude)

    return {
      ...baseObject,
      backgroundOpacity: this.backgroundOpacity,
      lineFontDefaults: this.lineFontDefaults,
      paddingTop: this.paddingTop,
      paddingRight: this.paddingRight,
      paddingBottom: this.paddingBottom,
      paddingLeft: this.paddingLeft,
      radiusTopLeft: this.radiusTopLeft,
      radiusTopRight: this.radiusTopRight,
      radiusBottomRight: this.radiusBottomRight,
      radiusBottomLeft: this.radiusBottomLeft
    }
  }

  protected override _renderBackground(ctx: CanvasRenderingContext2D): void {
    const fill = this._getEffectiveBackgroundFill()
    if (!fill) return

    if (fill) {
      const padding = this._getPadding()
      const textWidth = this.width ?? 0
      const textHeight = this.height ?? 0
      const width = textWidth + padding.left + padding.right
      const height = textHeight + padding.top + padding.bottom
      const radii = this._getCornerRadii({ width, height })
      const startX = this._getLeftOffset() - padding.left
      const startY = this._getTopOffset() - padding.top

      ctx.save()
      BackgroundTextbox._renderRoundedRect({
        ctx,
        height,
        left: startX,
        radii,
        top: startY,
        width
      })
      ctx.fillStyle = fill
      ctx.fill()
      ctx.restore()
    }
  }

  protected override _renderTextDecoration(
    ctx: CanvasRenderingContext2D,
    type: 'underline' | 'linethrough' | 'overline'
  ): void {
    if (!this[type] && !this.styleHas(type)) {
      return
    }
    let topOffset = this._getTopOffset()
    const leftOffset = this._getLeftOffset()
    const { path } = this
    const charSpacing = this._getWidthOfCharSpacing()
    const offsetAligner = type === 'linethrough' ? 0.5 : type === 'overline' ? 1 : 0
    const offsetY = this.offsets[type]

    for (let i = 0, len = this._textLines.length; i < len; i += 1) {
      const heightOfLine = this.getHeightOfLine(i)
      if (!this[type] && !this.styleHas(type, i)) {
        topOffset += heightOfLine
        continue
      }
      const line = this._textLines[i]
      const maxHeight = heightOfLine / this.lineHeight
      const lineLeftOffset = this._getLineLeftOffset(i)
      let boxStart = 0
      let boxWidth = 0
      let lastDecoration = this.getValueOfPropertyAt(i, 0, type)
      let lastDecorationColor = this._getDecorationColorAt(i, 0)
      let lastThickness = this.getValueOfPropertyAt(i, 0, 'textDecorationThickness')
      let currentDecoration = lastDecoration
      let currentDecorationColor = lastDecorationColor
      let currentThickness = lastThickness
      const top = topOffset + maxHeight * (1 - this._fontSizeFraction)
      let size = this.getHeightOfChar(i, 0)
      let dy = this.getValueOfPropertyAt(i, 0, 'deltaY')

      for (let j = 0, jlen = line.length; j < jlen; j += 1) {
        const charBox = this.__charBounds[i][j] as Required<GraphemeBBox>
        currentDecoration = this.getValueOfPropertyAt(i, j, type)
        currentDecorationColor = this._getDecorationColorAt(i, j)
        currentThickness = this.getValueOfPropertyAt(i, j, 'textDecorationThickness')
        const currentSize = this.getHeightOfChar(i, j)
        const currentDy = this.getValueOfPropertyAt(i, j, 'deltaY')
        if (path && currentDecoration && currentDecorationColor) {
          const finalThickness = (this.fontSize * currentThickness) / 1000
          ctx.save()
          ctx.fillStyle = lastDecorationColor as string
          ctx.translate(charBox.renderLeft, charBox.renderTop)
          ctx.rotate(charBox.angle)
          ctx.fillRect(
            -charBox.kernedWidth / 2,
            offsetY * currentSize + currentDy - offsetAligner * finalThickness,
            charBox.kernedWidth,
            finalThickness
          )
          ctx.restore()
        } else if (
          (currentDecoration !== lastDecoration
            || currentDecorationColor !== lastDecorationColor
            || currentSize !== size
            || currentThickness !== lastThickness
            || currentDy !== dy)
          && boxWidth > 0
        ) {
          const finalThickness = (this.fontSize * lastThickness) / 1000
          let drawStart = leftOffset + lineLeftOffset + boxStart
          if (this.direction === 'rtl') {
            drawStart = this.width - drawStart - boxWidth
          }
          if (lastDecoration && lastDecorationColor && lastThickness) {
            ctx.fillStyle = lastDecorationColor as string
            ctx.fillRect(
              drawStart,
              top + offsetY * size + dy - offsetAligner * finalThickness,
              boxWidth,
              finalThickness
            )
          }
          boxStart = charBox.left
          boxWidth = charBox.width
          lastDecoration = currentDecoration
          lastThickness = currentThickness
          lastDecorationColor = currentDecorationColor
          size = currentSize
          dy = currentDy
        } else {
          boxWidth += charBox.kernedWidth
        }
      }
      let drawStart = leftOffset + lineLeftOffset + boxStart
      if (this.direction === 'rtl') {
        drawStart = this.width - drawStart - boxWidth
      }
      ctx.fillStyle = currentDecorationColor as string
      const finalThickness = (this.fontSize * currentThickness) / 1000
      currentDecoration
        && currentDecorationColor
        && currentThickness
        && ctx.fillRect(
          drawStart,
          top + offsetY * size + dy - offsetAligner * finalThickness,
          boxWidth - charSpacing,
          finalThickness
        )
      topOffset += heightOfLine
    }
    this._removeShadow(ctx)
  }

  private _getDecorationColorAt(lineIndex: number, charIndex: number): string | null {
    const rawStrokeWidth = this.getValueOfPropertyAt(lineIndex, charIndex, 'strokeWidth')
    const resolvedStrokeWidth = resolveStrokeWidth({
      width: typeof rawStrokeWidth === 'number' && Number.isFinite(rawStrokeWidth) ? rawStrokeWidth : 0
    })
    const rawStroke = this.getValueOfPropertyAt(lineIndex, charIndex, 'stroke') as string | null | undefined
    const resolvedStrokeColor = rawStroke == null
      ? null
      : resolveStrokeColor({ strokeColor: rawStroke, width: resolvedStrokeWidth })

    if (resolvedStrokeWidth > 0 && resolvedStrokeColor != null) {
      return resolvedStrokeColor
    }

    const fill = this.getValueOfPropertyAt(lineIndex, charIndex, 'fill') as string | null | undefined
    return fill ?? null
  }

  private _getBackgroundDimensions(): { width: number; height: number } {
    const width = this.width ?? this.calcTextWidth() ?? 0
    const height = this.height ?? this.calcTextHeight() ?? 0
    const padding = this._getPadding()

    return {
      height: height + padding.top + padding.bottom,
      width: width + padding.left + padding.right
    }
  }

  private _getCornerRadii({ width, height }: { width: number; height: number }): CornerRadii {
    const maxRadiusX = width / 2
    const maxRadiusY = height / 2
    const maxRadius = Math.min(maxRadiusX, maxRadiusY)

    return {
      bottomLeft: clampNumber({ value: this.radiusBottomLeft ?? 0, min: 0, max: maxRadius }),
      bottomRight: clampNumber({ value: this.radiusBottomRight ?? 0, min: 0, max: maxRadius }),
      topLeft: clampNumber({ value: this.radiusTopLeft ?? 0, min: 0, max: maxRadius }),
      topRight: clampNumber({ value: this.radiusTopRight ?? 0, min: 0, max: maxRadius })
    }
  }

  private _getPadding(): Padding {
    return {
      bottom: this.paddingBottom ?? 0,
      left: this.paddingLeft ?? 0,
      right: this.paddingRight ?? 0,
      top: this.paddingTop ?? 0
    }
  }

  private _getEffectiveBackgroundFill(): string | null {
    const color = this.backgroundColor
    if (!color) return null

    const opacity = clampNumber({ value: this.backgroundOpacity ?? 1, min: 0, max: 1 })
    let fabricColor: Color
    try {
      fabricColor = new Color(color)
    } catch (error) {
      ErrorManager.emitError({
        origin: 'BackgroundTextbox',
        method: '_getEffectiveBackgroundFill',
        code: 'INVALID_COLOR_VALUE',
        message: `Некорректное значение цвета фона: ${color}`,
        data: { color, error }
      })

      return null
    }
    fabricColor.setAlpha(opacity)
    return fabricColor.toRgba()
  }

  private static _renderRoundedRect({
    ctx,
    height,
    left,
    radii,
    top,
    width
  }: BackgroundRectOptions): void {
    const right = left + width
    const bottom = top + height
    const {
      topLeft,
      topRight,
      bottomRight,
      bottomLeft
    } = radii
    const radiusTopLeftX = clampNumber({ value: topLeft, min: 0, max: width })
    const radiusTopRightX = clampNumber({ value: topRight, min: 0, max: width })
    const radiusBottomRightX = clampNumber({ value: bottomRight, min: 0, max: width })
    const radiusBottomLeftX = clampNumber({ value: bottomLeft, min: 0, max: width })

    ctx.beginPath()
    ctx.moveTo(left + radiusTopLeftX, top)
    ctx.lineTo(right - radiusTopRightX, top)
    ctx.quadraticCurveTo(right, top, right, top + radiusTopRightX)
    ctx.lineTo(right, bottom - radiusBottomRightX)
    ctx.quadraticCurveTo(right, bottom, right - radiusBottomRightX, bottom)
    ctx.lineTo(left + radiusBottomLeftX, bottom)
    ctx.quadraticCurveTo(left, bottom, left, bottom - radiusBottomLeftX)
    ctx.lineTo(left, top + radiusTopLeftX)
    ctx.quadraticCurveTo(left, top, left + radiusTopLeftX, top)
    ctx.closePath()
  }

  /**
   * Округляет текущие значения ширины и высоты до ближайших целых.
   */
  private _roundDimensions(): void {
    const {
      width: rawWidth = 0,
      height: rawHeight = 0
    } = this
    const roundedWidth = Math.round(rawWidth)
    const roundedHeight = Math.round(rawHeight)

    if (roundedWidth !== rawWidth) {
      this.width = Math.max(0, roundedWidth)
    }

    if (roundedHeight !== rawHeight) {
      this.height = Math.max(0, roundedHeight)
    }
  }
}

/**
 * Регистрирует кастомный текстовый класс в реестре Fabric для корректной десериализации.
 */
export const registerBackgroundTextbox = (): void => {
  if (classRegistry?.setClass) {
    classRegistry.setClass(BackgroundTextbox, 'background-textbox')
  }
}
