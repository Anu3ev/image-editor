import {
  Point,
  type TextStyleDeclaration
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
import {
  getLongestLineWidth,
  roundTextboxDimensions
} from '../geometry'
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

type ApplyScaledTextboxVisualStateOptions = {
  textbox: EditorTextbox
  base: TextScaleBaseState
  scale: number
  shouldScaleFontSize?: boolean
  shouldScalePadding?: boolean
  shouldScaleRadii?: boolean
}

type ScaledAutoExpandOptions = {
  textbox: EditorTextbox
  canvasManager: CanvasManager
  base: TextScaleBaseState
  committedWidth: number
  shouldScaleFontSize: boolean
}

/**
 * Возвращает число строк, заданных явными переносами текста.
 */
const resolveExplicitLineCount = ({ text }: { text?: string }): number => {
  const textValue = typeof text === 'string' ? text : ''
  return Math.max(textValue.split('\n').length, 1)
}

/**
 * Возвращает число реально рассчитанных Fabric строк.
 */
const resolveRenderedLineCount = ({
  textbox,
  fallbackLineCount
}: {
  textbox: EditorTextbox
  fallbackLineCount: number
}): number => {
  const { textLines } = textbox

  return Array.isArray(textLines) && textLines.length > 0
    ? textLines.length
    : fallbackLineCount
}

/**
 * Возвращает максимальную ширину text-area для autoExpand внутри монтажной области.
 */
const resolveAutoExpandMaxWidth = ({
  textbox,
  canvasManager
}: {
  textbox: EditorTextbox
  canvasManager: CanvasManager
}): number => {
  const { width: montageWidth } = canvasManager.getMontageAreaSceneBounds()
  const scaleX = Math.abs(textbox.scaleX ?? 1) || 1
  const paddingLeft = textbox.paddingLeft ?? 0
  const paddingRight = textbox.paddingRight ?? 0
  const strokeWidth = textbox.strokeWidth ?? 0

  return Math.max(
    1,
    (montageWidth / scaleX) - paddingLeft - paddingRight - strokeWidth
  )
}

/**
 * При autoExpand сохраняет отсутствие soft-wrap во время пропорционального live-scale.
 */
const preserveScaledAutoExpandLineCount = ({
  textbox,
  canvasManager,
  base,
  committedWidth,
  shouldScaleFontSize
}: ScaledAutoExpandOptions): void => {
  if (!shouldScaleFontSize) return
  if (textbox.autoExpand === false) return

  const explicitLineCount = base.explicitLineCount
    ?? resolveExplicitLineCount({ text: textbox.text })
  const renderedLineCount = base.renderedLineCount ?? explicitLineCount
  if (renderedLineCount > explicitLineCount) return

  const currentLineCount = resolveRenderedLineCount({
    textbox,
    fallbackLineCount: explicitLineCount
  })
  if (currentLineCount <= explicitLineCount) return

  const currentWidth = textbox.width ?? committedWidth
  const maxWidth = resolveAutoExpandMaxWidth({
    textbox,
    canvasManager
  })
  if (maxWidth <= currentWidth + DIMENSION_EPSILON) return

  textbox.set({ width: maxWidth })
  textbox.initDimensions()

  const text = typeof textbox.text === 'string' ? textbox.text : ''
  const targetWidth = Math.min(
    maxWidth,
    Math.max(
      currentWidth,
      Math.ceil(getLongestLineWidth({ textbox, text }))
    )
  )

  textbox.set({ width: targetWidth })
  textbox.initDimensions()
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
  const explicitLineCount = resolveExplicitLineCount({ text: textbox.text })
  const renderedLineCount = resolveRenderedLineCount({
    textbox,
    fallbackLineCount: explicitLineCount
  })
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
    explicitLineCount,
    renderedLineCount,
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
 * Запекает масштаб в визуальные свойства textbox без изменения его placement и ширины.
 * Используется там, где геометрией объекта управляет другой доменный слой.
 */
export const applyScaledTextboxVisualState = ({
  textbox,
  base,
  scale,
  shouldScaleFontSize = true,
  shouldScalePadding = true,
  shouldScaleRadii = true
}: ApplyScaledTextboxVisualStateOptions): void => {
  const {
    fontSize: baseFontSize,
    padding: basePadding,
    radii: baseRadii,
    styles: baseStyles,
    lineFontDefaults: baseLineFontDefaults
  } = base
  const minimumBaseFontSize = Math.min(MIN_TEXTBOX_FONT_SIZE, baseFontSize)
  const nextFontSize = Math.max(minimumBaseFontSize, baseFontSize * scale)
  const hasBaseStyles = Object.keys(baseStyles).length > 0
  let nextStyles: EditorTextbox['styles'] | undefined

  if (shouldScaleFontSize && hasBaseStyles) {
    const scaledStyles: TextboxStyles = {}

    Object.entries(baseStyles).forEach(([lineIndex, lineStyles]) => {
      if (!lineStyles) return

      const scaledLineStyles: Record<string, TextStyleDeclaration> = {}
      Object.entries(lineStyles as Record<string, TextStyleDeclaration>).forEach(([charIndex, charStyle]) => {
        if (!charStyle) return

        const nextCharStyle: TextStyleDeclaration = { ...charStyle }
        if (typeof charStyle.fontSize === 'number') {
          const minimumCharFontSize = Math.min(MIN_TEXTBOX_FONT_SIZE, charStyle.fontSize)
          nextCharStyle.fontSize = Math.max(minimumCharFontSize, charStyle.fontSize * scale)
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
      scale
    })
  }

  const nextPadding: PaddingValues = shouldScalePadding
    ? {
      top: Math.max(0, basePadding.top * scale),
      right: Math.max(0, basePadding.right * scale),
      bottom: Math.max(0, basePadding.bottom * scale),
      left: Math.max(0, basePadding.left * scale)
    }
    : basePadding
  const nextRadii: CornerRadiiValues = shouldScaleRadii
    ? {
      topLeft: Math.max(0, baseRadii.topLeft * scale),
      topRight: Math.max(0, baseRadii.topRight * scale),
      bottomRight: Math.max(0, baseRadii.bottomRight * scale),
      bottomLeft: Math.max(0, baseRadii.bottomLeft * scale)
    }
    : baseRadii

  if (nextStyles) {
    textbox.styles = nextStyles
  }

  if (nextLineFontDefaults) {
    textbox.lineFontDefaults = nextLineFontDefaults
  }

  textbox.set({
    fontSize: shouldScaleFontSize ? nextFontSize : baseFontSize,
    paddingTop: nextPadding.top,
    paddingRight: nextPadding.right,
    paddingBottom: nextPadding.bottom,
    paddingLeft: nextPadding.left,
    radiusTopLeft: nextRadii.topLeft,
    radiusTopRight: nextRadii.topRight,
    radiusBottomRight: nextRadii.bottomRight,
    radiusBottomLeft: nextRadii.bottomLeft
  })
}

/** Восстанавливает обычное положение объекта или неподвижную точку текущего жеста. */
function restoreScaledTextboxPlacement({
  anchorPlacement,
  canvasManager,
  committedWidth,
  dimensionsRounded,
  placement,
  textbox
}: {
  anchorPlacement?: ObjectPlacement
  canvasManager: CanvasManager
  committedWidth: number
  dimensionsRounded: boolean
  placement: ObjectPlacement
  textbox: EditorTextbox
}): CommitStandaloneTextScaleResult {
  if (anchorPlacement) {
    textbox.set({ originX: placement.originX, originY: placement.originY })
    textbox.setPositionByOrigin(
      new Point(anchorPlacement.left, anchorPlacement.top),
      anchorPlacement.originX,
      anchorPlacement.originY
    )
  } else {
    canvasManager.applyObjectPlacement({ object: textbox, placement })
  }

  textbox.setCoords()

  return {
    appliedWidth: textbox.width ?? committedWidth,
    dimensionsRounded
  }
}

/** Применяет канонические свойства текста и восстанавливает положение объекта. */
function materializeStandaloneTextboxScale({
  options,
  shouldRoundDimensions
}: {
  options: CommitStandaloneTextScaleOptions
  shouldRoundDimensions: boolean
}): CommitStandaloneTextScaleResult {
  const {
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
    shouldDisableAutoExpandOnHorizontalChange = false
  } = options
  const nextWidth = Math.max(1, base.width * widthScale)
  const committedWidth = shouldRoundDimensions ? Math.max(1, Math.round(nextWidth)) : nextWidth
  const widthChanged = Math.abs(committedWidth - (textbox.width ?? base.width)) > DIMENSION_EPSILON

  if (shouldDisableAutoExpandOnHorizontalChange && widthChanged) textbox.autoExpand = false

  applyScaledTextboxVisualState({
    textbox,
    base,
    scale: heightScale,
    shouldScaleFontSize,
    shouldScalePadding,
    shouldScaleRadii
  })
  textbox.set({ width: committedWidth, scaleX: 1, scaleY: 1 })
  textbox.initDimensions()
  preserveScaledAutoExpandLineCount({
    textbox,
    canvasManager,
    base,
    committedWidth,
    shouldScaleFontSize
  })

  const dimensionsRounded = shouldRoundDimensions ? roundTextboxDimensions({ textbox }) : false
  if (dimensionsRounded) textbox.dirty = true

  return restoreScaledTextboxPlacement({
    anchorPlacement,
    canvasManager,
    committedWidth,
    dimensionsRounded,
    placement,
    textbox
  })
}

/**
 * Переносит временный масштаб отдельного текста в его ширину, размер шрифта, отступы и скругления.
 * Обычное положение берётся из `placement`, а неподвижная точка текущего жеста — из `anchorPlacement`.
 */
export const commitStandaloneTextboxScale = (
  options: CommitStandaloneTextScaleOptions
): CommitStandaloneTextScaleResult => {
  const shouldRoundDimensions = options.shouldRoundDimensions ?? true
  const { textbox } = options
  const previousShouldRoundDimensionsOnInit = textbox.shouldRoundDimensionsOnInit

  textbox.shouldRoundDimensionsOnInit = shouldRoundDimensions
  try {
    return materializeStandaloneTextboxScale({ options, shouldRoundDimensions })
  } finally {
    textbox.shouldRoundDimensionsOnInit = previousShouldRoundDimensionsOnInit
  }
}
