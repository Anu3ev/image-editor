/* eslint-disable no-use-before-define, @typescript-eslint/no-use-before-define */
import { resizeShapeNode } from '../shape-factory'
import {
  MIN_SHAPE_TEXT_FRAME_SIZE,
  normalizeShapeLayoutPadding,
  normalizeShapeUserPadding
} from './shape-padding'
import {
  resolveAppliedShapePadding,
  resolveTextFrameWidth
} from './shape-layout-padding'
import {
  ShapeLayoutInput,
  ShapePadding,
  ShapeVerticalAlign
} from '../types'

const MIN_TEXT_FRAME_SIZE = MIN_SHAPE_TEXT_FRAME_SIZE
const TEXT_FRAME_FILL_EPSILON = 0.5
const MAX_LAYOUT_RESOLVE_ITERATIONS = 8
const MAX_WIDTH_SEARCH_ITERATIONS = 20
const MAX_WIDTH_BOUND_EXPANSIONS = 16

type TextboxMeasurementState = {
  autoExpand?: boolean
  splitByGrapheme?: boolean
  width?: number
}

type ShapeTextFrame = {
  left: number
  top: number
  width: number
  height: number
}

type ShapeTextFrameLayout = {
  frame: ShapeTextFrame
  splitByGrapheme: boolean
  textTop: number
}

type ResolvePaddingForWidth = ({ width }: {
  width: number
}) => ShapePadding

type ResolvePaddingForSize = ({ width, height }: {
  width: number
  height: number
}) => ShapePadding

type ResolveInternalShapeTextInset = ({ width, height }: {
  width: number
  height: number
}) => ShapePadding

type ResolveShapeWidthValidity = ({ width }: {
  width: number
}) => boolean

/**
 * Применяет layout для композиции shape + text,
 * сохраняя ручные базовые размеры отдельно от фактического auto-fit размера
 * и пересчитывая derived inset формы на каждом шаге layout.
 */
export const applyShapeTextLayout = ({
  group,
  shape,
  text,
  width,
  height,
  alignH,
  alignV,
  padding,
  internalShapeTextInset,
  resolveInternalShapeTextInset,
  expandShapeHeightToFitText = true,
  changedPadding
}: ShapeLayoutInput): void => {
  const requestedUserPadding = normalizeShapeUserPadding({
    padding
  })
  const normalizedInternalShapeTextInset = normalizeShapeLayoutPadding({
    padding: internalShapeTextInset
  })
  const manualBaseWidth = Math.max(
    MIN_TEXT_FRAME_SIZE,
    group.shapeManualBaseWidth ?? width
  )
  const manualBaseHeight = Math.max(
    MIN_TEXT_FRAME_SIZE,
    group.shapeManualBaseHeight ?? height
  )
  let finalWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  let finalHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  let resolvedPaddingLayout = resolveAppliedShapePadding({
    text,
    width: finalWidth,
    height: finalHeight,
    padding: requestedUserPadding,
    internalShapeTextInset: resolveCurrentInternalShapeTextInset({
      width: finalWidth,
      height: finalHeight,
      internalShapeTextInset: normalizedInternalShapeTextInset,
      resolveInternalShapeTextInset
    }),
    expandShapeHeightToFitText,
    changedPadding,
    measureTextboxHeightForFrame,
    resolveMinimumTextFrameWidth
  })

  for (let iteration = 0; iteration < MAX_LAYOUT_RESOLVE_ITERATIONS; iteration += 1) {
    const nextWidth = Math.max(finalWidth, resolvedPaddingLayout.requiredWidth)
    const nextHeight = Math.max(finalHeight, resolvedPaddingLayout.requiredHeight)

    if (
      nextWidth <= finalWidth + TEXT_FRAME_FILL_EPSILON
      && nextHeight <= finalHeight + TEXT_FRAME_FILL_EPSILON
    ) {
      break
    }

    finalWidth = nextWidth
    finalHeight = nextHeight
    resolvedPaddingLayout = resolveAppliedShapePadding({
      text,
      width: finalWidth,
      height: finalHeight,
      padding: requestedUserPadding,
      internalShapeTextInset: resolveCurrentInternalShapeTextInset({
        width: finalWidth,
        height: finalHeight,
        internalShapeTextInset: normalizedInternalShapeTextInset,
        resolveInternalShapeTextInset
      }),
      expandShapeHeightToFitText,
      changedPadding,
      measureTextboxHeightForFrame,
      resolveMinimumTextFrameWidth
    })
  }
  const {
    appliedPadding,
    appliedUserPadding
  } = resolvedPaddingLayout

  resizeShapeNode({
    shape,
    width: finalWidth,
    height: finalHeight,
    rounding: group.shapeRounding,
    strokeWidth: group.shapeStrokeWidth
  })

  const {
    frame,
    splitByGrapheme,
    textTop
  } = resolveShapeTextFrameLayout({
    text,
    width: finalWidth,
    height: finalHeight,
    alignV,
    padding: appliedPadding
  })

  text.set({
    autoExpand: false,
    width: frame.width,
    textAlign: alignH,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    left: frame.left,
    top: textTop,
    originX: 'left',
    originY: 'top',
    splitByGrapheme
  })

  text.initDimensions()

  text.setCoords()
  shape.setCoords()

  group.shapeBaseWidth = finalWidth
  group.shapeBaseHeight = finalHeight
  group.shapeManualBaseWidth = manualBaseWidth
  group.shapeManualBaseHeight = manualBaseHeight
  group.shapePaddingTop = appliedUserPadding.top
  group.shapePaddingRight = appliedUserPadding.right
  group.shapePaddingBottom = appliedUserPadding.bottom
  group.shapePaddingLeft = appliedUserPadding.left
  group.shapeAlignHorizontal = alignH
  group.shapeAlignVertical = alignV

  group.set({
    width: finalWidth,
    height: finalHeight,
    scaleX: 1,
    scaleY: 1
  })

  group.set('dirty', true)
  group.setCoords()
}

/**
 * Возвращает целевую ширину shape для режима shapeTextAutoExpand,
 * измеряя текст на максимально допустимой ширине монтажной области,
 * даже если effective padding зависит от candidate width,
 * и не позволяя сужаться ниже ручной базовой ширины.
 */
export const resolveShapeTextAutoExpandWidthForText = ({
  text,
  currentWidth,
  minimumWidth,
  padding,
  montageAreaWidth,
  resolvePaddingForWidth
}: {
  text: ShapeLayoutInput['text']
  currentWidth: number
  minimumWidth: number
  padding?: ShapePadding
  montageAreaWidth: number
  resolvePaddingForWidth?: ResolvePaddingForWidth
}): number => {
  const safeCurrentWidth = Math.max(MIN_TEXT_FRAME_SIZE, currentWidth)
  const safeMinimumWidth = Math.max(MIN_TEXT_FRAME_SIZE, minimumWidth)
  if (!hasShapeTextContent({ text })) return safeMinimumWidth

  const safeMontageAreaWidth = Number.isFinite(montageAreaWidth) && montageAreaWidth > 0
    ? Math.max(MIN_TEXT_FRAME_SIZE, montageAreaWidth)
    : Math.max(safeCurrentWidth, safeMinimumWidth)
  const effectiveMaxShapeWidth = Math.max(safeMinimumWidth, safeMontageAreaWidth)
  const maxMeasurementPadding = resolveCurrentPaddingForWidth({
    width: effectiveMaxShapeWidth,
    padding,
    resolvePaddingForWidth
  })
  const maxFrameWidth = resolveTextFrameWidth({
    width: effectiveMaxShapeWidth,
    padding: maxMeasurementPadding
  })

  const maxShapeWidth = effectiveMaxShapeWidth
  const maxMeasurement = measureTextboxLayoutForFrame({
    text,
    frameWidth: maxFrameWidth
  })

  if (maxMeasurement.hasWrappedLines) return maxShapeWidth

  const requiredFrameWidth = Math.max(
    MIN_TEXT_FRAME_SIZE,
    maxMeasurement.longestLineWidth
  )

  return resolveMinimumValidShapeWidth({
    minimumWidth: safeMinimumWidth,
    maximumWidth: maxShapeWidth,
    isWidthValid: ({ width }) => {
      const currentPadding = resolveCurrentPaddingForWidth({
        width,
        padding,
        resolvePaddingForWidth
      })
      const frameWidth = resolveTextFrameWidth({
        width,
        padding: currentPadding
      })

      if (frameWidth < requiredFrameWidth - TEXT_FRAME_FILL_EPSILON) {
        return false
      }

      const validation = measureTextboxLayoutForFrame({
        text,
        frameWidth
      })

      return !validation.hasWrappedLines
    }
  })
}

/**
 * Возвращает минимальную ширину shape, при которой в текстовом фрейме помещается один символ.
 */
export const resolveMinimumShapeWidthForText = ({
  text,
  padding,
  resolvePaddingForWidth
}: {
  text: ShapeLayoutInput['text']
  padding?: ShapePadding
  resolvePaddingForWidth?: ResolvePaddingForWidth
}): number => {
  if (!hasShapeTextContent({
    text
  })) return MIN_TEXT_FRAME_SIZE

  const minimumFrameWidth = resolveMinimumTextFrameWidth({ text })
  const minimumSearchWidth = Math.max(MIN_TEXT_FRAME_SIZE, minimumFrameWidth)
  const isWidthValid: ResolveShapeWidthValidity = ({ width }) => {
    const currentPadding = resolveCurrentPaddingForWidth({
      width,
      padding,
      resolvePaddingForWidth
    })
    const frameWidth = resolveTextFrameWidth({
      width,
      padding: currentPadding
    })

    return frameWidth >= minimumFrameWidth - TEXT_FRAME_FILL_EPSILON
  }
  const maximumWidth = resolveValidShapeWidthUpperBound({
    minimumWidth: minimumSearchWidth,
    isWidthValid
  })

  return resolveMinimumValidShapeWidth({
    minimumWidth: minimumSearchWidth,
    maximumWidth,
    isWidthValid
  })
}

/**
 * Вычисляет текстовый фрейм, режим переноса и вертикальную позицию текста
 * для уже примененного padding.
 */
export const resolveShapeTextFrameLayout = ({
  text,
  width,
  height,
  alignV,
  padding
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  alignV: ShapeVerticalAlign
  padding: ShapePadding
}): ShapeTextFrameLayout => {
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const appliedPadding = normalizeShapeLayoutPadding({
    padding
  })
  const frame = createTextFrame({
    width: safeWidth,
    height: safeHeight,
    padding: appliedPadding
  })
  const splitByGrapheme = resolveSplitByGraphemeForFrame({
    text,
    frameWidth: frame.width
  })
  const measuredHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: frame.width,
    splitByGrapheme
  })
  const textTop = resolveVerticalTop({
    alignV,
    frameHeight: frame.height,
    frameTop: frame.top,
    textHeight: measuredHeight
  })

  return {
    frame,
    splitByGrapheme,
    textTop
  }
}

/**
 * Возвращает true, если текст заполняет всю доступную высоту фрейма.
 */
export const isShapeTextFrameFilled = ({
  text,
  width,
  height,
  padding
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  padding: ShapePadding
}): boolean => {
  if (!hasShapeTextContent({
    text
  })) return false

  const {
    frame
  } = resolveShapeTextFrameLayout({
    text,
    width,
    height,
    alignV: 'top',
    padding
  })

  const measuredHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: frame.width
  })

  return measuredHeight >= frame.height - TEXT_FRAME_FILL_EPSILON
}

/**
 * Возвращает минимальную высоту shape, чтобы текст помещался в текстовый фрейм.
 * Для пустого текста высота не раздувается и остается равной переданному safe-height.
 */
export const resolveRequiredShapeHeightForText = ({
  text,
  width,
  height,
  padding,
  resolvePaddingForSize
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  padding: ShapePadding
  resolvePaddingForSize?: ResolvePaddingForSize
}): number => {
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  if (!hasShapeTextContent({
    text
  })) return safeHeight

  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  let requiredHeight = safeHeight

  for (let iteration = 0; iteration < MAX_LAYOUT_RESOLVE_ITERATIONS; iteration += 1) {
    const currentPadding = resolveCurrentPaddingForSize({
      width: safeWidth,
      height: requiredHeight,
      padding,
      resolvePaddingForSize
    })
    const frameWidth = resolveTextFrameWidth({
      width: safeWidth,
      padding: currentPadding
    })
    const measuredHeight = measureTextboxHeightForFrame({
      text,
      frameWidth
    })
    const nextHeight = Math.max(
      safeHeight,
      measuredHeight + currentPadding.top + currentPadding.bottom
    )

    if (nextHeight <= requiredHeight + TEXT_FRAME_FILL_EPSILON) {
      return nextHeight
    }

    requiredHeight = nextHeight
  }

  return requiredHeight
}

/**
 * Возвращает true, если textbox содержит видимый текстовый контент.
 */
function hasShapeTextContent({
  text
}: {
  text: ShapeLayoutInput['text']
}): boolean {
  const rawText = text.text ?? ''

  return rawText.trim().length > 0
}

function resolveCurrentPaddingForWidth({
  width,
  padding,
  resolvePaddingForWidth
}: {
  width: number
  padding?: ShapePadding
  resolvePaddingForWidth?: ResolvePaddingForWidth
}): ShapePadding {
  if (!resolvePaddingForWidth) {
    return normalizeShapeLayoutPadding({
      padding
    })
  }

  return normalizeShapeLayoutPadding({
    padding: resolvePaddingForWidth({
      width: Math.max(MIN_TEXT_FRAME_SIZE, width)
    })
  })
}

function resolveCurrentPaddingForSize({
  width,
  height,
  padding,
  resolvePaddingForSize
}: {
  width: number
  height: number
  padding?: ShapePadding
  resolvePaddingForSize?: ResolvePaddingForSize
}): ShapePadding {
  if (!resolvePaddingForSize) {
    return normalizeShapeLayoutPadding({
      padding
    })
  }

  return normalizeShapeLayoutPadding({
    padding: resolvePaddingForSize({
      width: Math.max(MIN_TEXT_FRAME_SIZE, width),
      height: Math.max(MIN_TEXT_FRAME_SIZE, height)
    })
  })
}

function resolveCurrentInternalShapeTextInset({
  width,
  height,
  internalShapeTextInset,
  resolveInternalShapeTextInset
}: {
  width: number
  height: number
  internalShapeTextInset?: ShapePadding
  resolveInternalShapeTextInset?: ResolveInternalShapeTextInset
}): ShapePadding {
  if (!resolveInternalShapeTextInset) {
    return normalizeShapeLayoutPadding({
      padding: internalShapeTextInset
    })
  }

  return normalizeShapeLayoutPadding({
    padding: resolveInternalShapeTextInset({
      width: Math.max(MIN_TEXT_FRAME_SIZE, width),
      height: Math.max(MIN_TEXT_FRAME_SIZE, height)
    })
  })
}

function resolveValidShapeWidthUpperBound({
  minimumWidth,
  isWidthValid
}: {
  minimumWidth: number
  isWidthValid: ResolveShapeWidthValidity
}): number {
  let upperBound = Math.max(MIN_TEXT_FRAME_SIZE, minimumWidth)

  if (isWidthValid({ width: upperBound })) {
    return upperBound
  }

  for (let iteration = 0; iteration < MAX_WIDTH_BOUND_EXPANSIONS; iteration += 1) {
    upperBound = Math.max(upperBound + 1, upperBound * 2)

    if (isWidthValid({ width: upperBound })) {
      return upperBound
    }
  }

  return upperBound
}

function resolveMinimumValidShapeWidth({
  minimumWidth,
  maximumWidth,
  isWidthValid
}: {
  minimumWidth: number
  maximumWidth: number
  isWidthValid: ResolveShapeWidthValidity
}): number {
  let low = Math.max(MIN_TEXT_FRAME_SIZE, minimumWidth)
  let high = Math.max(low, maximumWidth)

  if (isWidthValid({ width: low })) {
    return low
  }

  if (!isWidthValid({ width: high })) {
    return high
  }

  for (let iteration = 0; iteration < MAX_WIDTH_SEARCH_ITERATIONS; iteration += 1) {
    if (high - low <= TEXT_FRAME_FILL_EPSILON) {
      break
    }

    const candidateWidth = low + (high - low) / 2

    if (isWidthValid({ width: candidateWidth })) {
      high = candidateWidth
      continue
    }

    low = candidateWidth
  }

  return high
}

function createTextFrame({
  width,
  height,
  padding
}: {
  width: number
  height: number
  padding: ShapePadding
}): ShapeTextFrame {
  const leftPadding = Math.max(0, padding.left)
  const rightPadding = Math.max(0, padding.right)
  const topPadding = Math.max(0, padding.top)
  const bottomPadding = Math.max(0, padding.bottom)

  const left = -width / 2 + leftPadding
  const top = -height / 2 + topPadding
  const frameWidth = Math.max(MIN_TEXT_FRAME_SIZE, width - leftPadding - rightPadding)
  const frameHeight = Math.max(MIN_TEXT_FRAME_SIZE, height - topPadding - bottomPadding)

  return {
    left,
    top,
    width: frameWidth,
    height: frameHeight
  }
}

/**
 * Возвращает визуальную высоту textbox.
 */
function getTextboxHeight({ text }: { text: ShapeLayoutInput['text'] }): number {
  const { height } = text
  if (typeof height === 'number' && Number.isFinite(height)) {
    return height
  }

  if (typeof text.calcTextHeight === 'function') {
    const calculated = text.calcTextHeight()

    if (typeof calculated === 'number' && Number.isFinite(calculated)) {
      return calculated
    }
  }

  return MIN_TEXT_FRAME_SIZE
}

/**
 * Измеряет ширину самой длинной строки и факт автопереноса для переданной ширины текстового фрейма.
 */
function measureTextboxLayoutForFrame({
  text,
  frameWidth
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
}): {
  hasWrappedLines: boolean
  longestLineWidth: number
} {
  const explicitLineCount = getExplicitTextboxLineCount({ text })
  const splitByGrapheme = resolveSplitByGraphemeForFrame({
    text,
    frameWidth
  })
  const previousState = captureTextboxMeasurementState({ text })

  text.set({
    autoExpand: false,
    width: Math.max(MIN_TEXT_FRAME_SIZE, frameWidth),
    splitByGrapheme
  })
  text.initDimensions()

  const hasWrappedLines = getRenderedTextboxLineCount({ text }) > explicitLineCount
  const longestLineWidth = Math.ceil(
    getTextboxLongestLineWidth({ text })
  )

  restoreTextboxMeasurementState({
    text,
    state: previousState
  })

  return {
    hasWrappedLines,
    longestLineWidth
  }
}

/**
 * Измеряет высоту текста в рамках переданной ширины текстового фрейма.
 */
function measureTextboxHeightForFrame({
  text,
  frameWidth,
  splitByGrapheme
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
  splitByGrapheme?: boolean
}): number {
  const previousState = captureTextboxMeasurementState({ text })
  const resolvedSplitByGrapheme = splitByGrapheme
    ?? resolveSplitByGraphemeForFrame({
      text,
      frameWidth
    })

  text.set({
    autoExpand: false,
    width: Math.max(MIN_TEXT_FRAME_SIZE, frameWidth),
    splitByGrapheme: resolvedSplitByGrapheme
  })

  text.initDimensions()
  const measuredHeight = getTextboxHeight({ text })

  restoreTextboxMeasurementState({
    text,
    state: previousState
  })

  return measuredHeight
}

/**
 * Возвращает минимальную ширину текстового фрейма, достаточную для отображения одного символа.
 */
function resolveMinimumTextFrameWidth({
  text
}: {
  text: ShapeLayoutInput['text']
}): number {
  const minimumFrameWidth = measureTextboxLongestLineWidthForFrame({
    text,
    frameWidth: MIN_TEXT_FRAME_SIZE,
    splitByGrapheme: true
  })

  return Math.max(MIN_TEXT_FRAME_SIZE, minimumFrameWidth)
}

/**
 * Измеряет максимальную ширину строки textbox при заданной ширине фрейма и режиме переноса.
 */
function measureTextboxLongestLineWidthForFrame({
  text,
  frameWidth,
  splitByGrapheme
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
  splitByGrapheme: boolean
}): number {
  const previousState = captureTextboxMeasurementState({ text })

  text.set({
    autoExpand: false,
    width: Math.max(MIN_TEXT_FRAME_SIZE, frameWidth),
    splitByGrapheme
  })

  text.initDimensions()
  const longestLineWidth = getTextboxLongestLineWidth({ text })

  restoreTextboxMeasurementState({
    text,
    state: previousState
  })

  return longestLineWidth
}

/**
 * Вычисляет верхнюю координату текста по вертикальному выравниванию.
 */
function resolveVerticalTop({
  alignV,
  frameHeight,
  frameTop,
  textHeight
}: {
  alignV: ShapeVerticalAlign
  frameHeight: number
  frameTop: number
  textHeight: number
}): number {
  const freeSpace = Math.max(0, frameHeight - textHeight)

  if (alignV === 'top') return frameTop
  if (alignV === 'bottom') return frameTop + freeSpace

  return frameTop + freeSpace / 2
}

/**
 * Определяет, нужен ли fallback на splitByGrapheme для длинных слов без пробелов.
 */
function resolveSplitByGraphemeForFrame({
  text,
  frameWidth
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
}): boolean {
  const safeFrameWidth = Math.max(MIN_TEXT_FRAME_SIZE, frameWidth)
  const previousState = captureTextboxMeasurementState({ text })

  text.set({
    autoExpand: false,
    width: safeFrameWidth,
    splitByGrapheme: false
  })
  text.initDimensions()

  const dynamicMinWidth = getTextboxDynamicMinWidth({ text })
  const shouldSplitByGrapheme = dynamicMinWidth > safeFrameWidth + TEXT_FRAME_FILL_EPSILON

  restoreTextboxMeasurementState({
    text,
    state: previousState
  })

  return shouldSplitByGrapheme
}

/**
 * Возвращает ширину самой длинной отрисованной строки textbox.
 */
function getTextboxLongestLineWidth({
  text
}: {
  text: ShapeLayoutInput['text']
}): number {
  const lineCount = getRenderedTextboxLineCount({ text })

  if (lineCount > 0) {
    return measureLongestRenderedLineWidth({
      text,
      lineCount
    })
  }

  const rawText = text.text ?? ''
  const explicitLineCount = Math.max(rawText.split('\n').length, 1)

  return measureLongestRenderedLineWidth({
    text,
    lineCount: explicitLineCount
  })
}

/**
 * Возвращает количество явных строк в исходном тексте до автопереноса.
 */
function getExplicitTextboxLineCount({
  text
}: {
  text: ShapeLayoutInput['text']
}): number {
  const rawText = text.text ?? ''
  return Math.max(rawText.split('\n').length, 1)
}

/**
 * Возвращает количество реально отрисованных строк textbox.
 */
function getRenderedTextboxLineCount({
  text
}: {
  text: ShapeLayoutInput['text']
}): number {
  const textbox = text as ShapeLayoutInput['text'] & {
    textLines?: string[]
  }

  if (Array.isArray(textbox.textLines)) {
    return textbox.textLines.length
  }

  return 0
}

/**
 * Измеряет ширину самой длинной уже отрисованной строки textbox.
 */
function measureLongestRenderedLineWidth({
  text,
  lineCount
}: {
  text: ShapeLayoutInput['text']
  lineCount: number
}): number {
  let longestLineWidth = MIN_TEXT_FRAME_SIZE

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const lineWidth = text.getLineWidth(lineIndex)

    if (lineWidth > longestLineWidth) {
      longestLineWidth = lineWidth
    }
  }

  return longestLineWidth
}

/**
 * Возвращает текущее состояние textbox для временных измерений.
 */
function captureTextboxMeasurementState({
  text
}: {
  text: ShapeLayoutInput['text']
}): TextboxMeasurementState {
  const {
    autoExpand,
    splitByGrapheme,
    width
  } = text

  return {
    autoExpand,
    splitByGrapheme,
    width: typeof width === 'number' ? width : undefined
  }
}

/**
 * Восстанавливает состояние textbox после временных измерений.
 */
function restoreTextboxMeasurementState({
  text,
  state
}: {
  text: ShapeLayoutInput['text']
  state: TextboxMeasurementState
}): void {
  const {
    autoExpand,
    splitByGrapheme,
    width
  } = state

  const updates: TextboxMeasurementState = {}
  if (autoExpand !== undefined) {
    updates.autoExpand = autoExpand
  }

  if (splitByGrapheme !== undefined) {
    updates.splitByGrapheme = splitByGrapheme
  }

  if (typeof width === 'number') {
    updates.width = width
  }

  const hasUpdates = Object.keys(updates).length > 0
  if (!hasUpdates) return

  text.set(updates)
  text.initDimensions()
}

/**
 * Возвращает dynamicMinWidth textbox для проверки неразрывных слов.
 */
function getTextboxDynamicMinWidth({
  text
}: {
  text: ShapeLayoutInput['text']
}): number {
  const { dynamicMinWidth } = text

  if (typeof dynamicMinWidth === 'number' && Number.isFinite(dynamicMinWidth)) {
    return dynamicMinWidth
  }

  return 0
}
