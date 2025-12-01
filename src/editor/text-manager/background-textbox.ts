import {
  Color,
  Point,
  Textbox,
  type TextboxProps,
  classRegistry
} from 'fabric'
import ErrorManager from '../error-manager'

export type BackgroundTextboxProps = TextboxProps & {
  backgroundColor?: string
  backgroundOpacity?: number
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
    this.paddingTop = options.paddingTop ?? 0
    this.paddingRight = options.paddingRight ?? 0
    this.paddingBottom = options.paddingBottom ?? 0
    this.paddingLeft = options.paddingLeft ?? 0
    this.radiusTopLeft = options.radiusTopLeft ?? 0
    this.radiusTopRight = options.radiusTopRight ?? 0
    this.radiusBottomRight = options.radiusBottomRight ?? 0
    this.radiusBottomLeft = options.radiusBottomLeft ?? 0
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
}

/**
 * Регистрирует кастомный текстовый класс в реестре Fabric для корректной десериализации.
 */
export const registerBackgroundTextbox = (): void => {
  if (classRegistry?.setClass) {
    classRegistry.setClass(BackgroundTextbox, 'background-textbox')
  }
}
