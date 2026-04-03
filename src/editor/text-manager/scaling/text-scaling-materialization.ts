import {
  Point,
  type TextboxProps
} from 'fabric'
import type CanvasManager from '../../canvas-manager'
import type { ObjectPlacement } from '../../canvas-manager'
import type { LineFontDefaults } from '../background-textbox'
import {
  MIN_TEXTBOX_FONT_SIZE,
  DIMENSION_EPSILON
} from '../constants'
import {
  cloneLineFontDefaults,
  scaleLineFontDefaults
} from '../line-defaults'
import { roundTextboxDimensions } from '../geometry'
import type {
  CornerRadiiValues,
  EditorTextbox,
  PaddingValues,
  TextScaleBaseState,
  TextboxStyles
} from '../types'

export type CommitStandaloneTextScaleResult = {
  appliedWidth: number
  dimensionsRounded: boolean
}

type TextScalingBounds = {
  fontScale: number
  proportionalScale: number
  widthScale: number
}

type CommitStandaloneTextScaleOptions = {
  textbox: EditorTextbox
  canvasManager: CanvasManager
  base: TextScaleBaseState
  widthScale: number
  heightScale: number
  placement: ObjectPlacement
  anchorPlacement?: ObjectPlacement
  shouldScaleFontSize: boolean
  shouldScalePadding: boolean
  shouldScaleRadii: boolean
  shouldDisableAutoExpandOnHorizontalChange?: boolean
  shouldRoundDimensions?: boolean
}

/**
 * Снимает с textbox базовое состояние, относительно которого можно материализовать transient scale.
 */
export const captureTextScaleBase = ({
  textbox
}: {
  textbox: EditorTextbox
}): TextScaleBaseState => {
  const width = textbox.width ?? textbox.calcTextWidth()
  const fontSize = textbox.fontSize ?? 16
  const { styles: textboxStyles = {} } = textbox
  const { lineFontDefaults } = textbox
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

  return {
    width,
    fontSize,
    padding: {
      top: paddingTop,
      right: paddingRight,
      bottom: paddingBottom,
      left: paddingLeft
    },
    radii: {
      topLeft: radiusTopLeft,
      topRight: radiusTopRight,
      bottomRight: radiusBottomRight,
      bottomLeft: radiusBottomLeft
    },
    styles: JSON.parse(JSON.stringify(textboxStyles)) as TextboxStyles,
    lineFontDefaults: cloneLineFontDefaults({ lineFontDefaults })
  }
}

/**
 * Возвращает минимальные допустимые scale-значения для width, font-size и пропорционального drag.
 */
export const resolveMinimumTextScalingBounds = (
  {
    base
  }: {
    base: TextScaleBaseState
  }
): TextScalingBounds => {
  const widthScale = 1 / Math.max(1, base.width)
  const fontSizes: number[] = [base.fontSize]

  Object.values(base.styles).forEach((lineStyles) => {
    Object.values(lineStyles).forEach((charStyle) => {
      const { fontSize } = charStyle
      if (typeof fontSize !== 'number' || !Number.isFinite(fontSize) || fontSize <= 0) return

      fontSizes.push(fontSize)
    })
  })

  Object.values(base.lineFontDefaults ?? {}).forEach((lineDefault) => {
    const { fontSize } = lineDefault
    if (typeof fontSize !== 'number' || !Number.isFinite(fontSize) || fontSize <= 0) return

    fontSizes.push(fontSize)
  })

  const fontScale = fontSizes.reduce((maxScale, fontSize) => {
    const minimumFontSize = Math.min(MIN_TEXTBOX_FONT_SIZE, fontSize)

    return Math.max(maxScale, minimumFontSize / fontSize)
  }, 0)

  return {
    widthScale,
    fontScale,
    proportionalScale: Math.max(widthScale, fontScale)
  }
}

/**
 * Материализует transient scale standalone-textbox в канонические width/font/padding/radius значения.
 * `placement` здесь означает стабильный placement самого объекта,
 * а `anchorPlacement` — временную точку удержания текущего drag.
 */
export const commitStandaloneTextboxScale = (
  {
    textbox,
    canvasManager,
    base,
    widthScale,
    heightScale,
    placement,
    anchorPlacement,
    shouldScaleFontSize,
    shouldScalePadding,
    shouldScaleRadii,
    shouldDisableAutoExpandOnHorizontalChange = false,
    shouldRoundDimensions = true
  }: CommitStandaloneTextScaleOptions
): CommitStandaloneTextScaleResult => {
  const {
    width: baseWidth,
    fontSize: baseFontSize,
    padding: basePadding,
    radii: baseRadii,
    styles: baseStyles,
    lineFontDefaults: baseLineFontDefaults
  } = base
  const nextWidth = Math.max(1, baseWidth * widthScale)
  const roundedNextWidth = Math.max(1, Math.round(nextWidth))
  const committedWidth = shouldRoundDimensions ? roundedNextWidth : nextWidth
  const minimumBaseFontSize = Math.min(MIN_TEXTBOX_FONT_SIZE, baseFontSize)
  const nextFontSize = Math.max(minimumBaseFontSize, baseFontSize * heightScale)
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
          const minimumCharFontSize = Math.min(MIN_TEXTBOX_FONT_SIZE, charStyle.fontSize)
          nextCharStyle.fontSize = Math.max(minimumCharFontSize, charStyle.fontSize * heightScale)
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

  let nextLineFontDefaults: LineFontDefaults | undefined
  if (shouldScaleFontSize) {
    nextLineFontDefaults = scaleLineFontDefaults({
      lineFontDefaults: baseLineFontDefaults,
      scale: heightScale
    })
  }

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
  const currentWidth = textbox.width ?? baseWidth
  const widthChanged = Math.abs(committedWidth - currentWidth) > DIMENSION_EPSILON

  if (shouldDisableAutoExpandOnHorizontalChange && widthChanged) {
    textbox.autoExpand = false
  }

  if (nextStyles) {
    textbox.styles = nextStyles
  }

  if (nextLineFontDefaults) {
    textbox.lineFontDefaults = nextLineFontDefaults
  }

  textbox.set({
    width: committedWidth,
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

  const previousShouldRoundDimensionsOnInit = textbox.shouldRoundDimensionsOnInit

  textbox.shouldRoundDimensionsOnInit = shouldRoundDimensions

  try {
    textbox.initDimensions()
  } finally {
    textbox.shouldRoundDimensionsOnInit = previousShouldRoundDimensionsOnInit
  }

  const dimensionsRounded = shouldRoundDimensions
    ? roundTextboxDimensions({ textbox })
    : false

  if (dimensionsRounded) {
    textbox.dirty = true
  }

  if (anchorPlacement) {
    textbox.set({
      originX: placement.originX,
      originY: placement.originY
    })
    textbox.setPositionByOrigin(
      new Point(anchorPlacement.left, anchorPlacement.top),
      anchorPlacement.originX,
      anchorPlacement.originY
    )
    textbox.setCoords()

    return {
      appliedWidth: textbox.width ?? committedWidth,
      dimensionsRounded
    }
  }

  canvasManager.applyObjectPlacement({
    object: textbox,
    placement
  })
  textbox.setCoords()

  return {
    appliedWidth: textbox.width ?? committedWidth,
    dimensionsRounded
  }
}
