/* eslint-disable no-use-before-define, @typescript-eslint/no-use-before-define */
import {
  ShapeLayoutInput,
  ShapeTextMeasurementCache,
  ShapeTextWrapPolicy
} from '../types'
import { MIN_SHAPE_TEXT_FRAME_SIZE } from './shape-padding'

/**
 * Минимальная ширина/высота frame для безопасного измерения Fabric textbox.
 */
const MIN_TEXT_FRAME_SIZE = MIN_SHAPE_TEXT_FRAME_SIZE

/**
 * Допуск для проверки, что измеренный текст заполняет frame.
 */
const TEXT_FRAME_FILL_EPSILON = 0.5
const TEXT_FRAME_WIDTH_CACHE_PRECISION = 1_000_000

/**
 * Снимок mutable textbox-свойств, которые временно меняются во время измерения.
 */
type TextboxMeasurementState = {
  autoExpand?: boolean
  splitByGrapheme?: boolean
  width?: number
  scaleX?: number
  scaleY?: number
}

/**
 * Результат измерения textbox внутри конкретной ширины text frame.
 */
type ShapeTextFrameMeasurement = {
  measuredHeight: number
  renderedLineCount: number
  longestLineWidth: number
  requiresGraphemeSplit: boolean
}

/**
 * Измеряет текущее состояние textbox для переданной ширины текстового фрейма
 * в явно заданном режиме splitByGrapheme.
 */
export function measureShapeTextFrameLayout({
  text,
  frameWidth,
  splitByGrapheme,
  requiresGraphemeSplit,
  measurementCache
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
  splitByGrapheme: boolean
  requiresGraphemeSplit?: boolean
  measurementCache?: ShapeTextMeasurementCache
}): ShapeTextFrameMeasurement {
  const safeFrameWidth = Math.max(MIN_TEXT_FRAME_SIZE, frameWidth)
  const measurementCacheKey = resolveMeasurementCacheKey({
    frameWidth: safeFrameWidth,
    splitByGrapheme
  })
  const cachedMeasurement = measurementCache?.measurementsByKey.get(measurementCacheKey)

  if (cachedMeasurement) return cachedMeasurement

  const previousState = captureTextboxMeasurementState({ text })
  const resolvedRequiresGraphemeSplit = requiresGraphemeSplit
    ?? resolveSplitByGraphemeForFrame({
      text,
      frameWidth: safeFrameWidth,
      measurementCache
    })

  text.set({
    autoExpand: false,
    width: safeFrameWidth,
    splitByGrapheme,
    scaleX: 1,
    scaleY: 1
  })
  text.initDimensions()

  const renderedLineCount = getRenderedTextboxLineCount({ text })
  const explicitLineCount = getExplicitTextboxLineCount({ text })
  const measurement = {
    measuredHeight: getTextboxHeight({ text }),
    renderedLineCount: renderedLineCount > 0 ? renderedLineCount : explicitLineCount,
    longestLineWidth: Math.ceil(getTextboxLongestLineWidth({ text })),
    requiresGraphemeSplit: resolvedRequiresGraphemeSplit
  }

  restoreTextboxMeasurementState({
    text,
    state: previousState
  })

  measurementCache?.measurementsByKey.set(measurementCacheKey, measurement)

  return measurement
}

/**
 * Измеряет ширину самой длинной строки и факт автопереноса для переданной ширины текстового фрейма.
 */
export function measureTextboxLayoutForFrame({
  text,
  frameWidth,
  wrapPolicy,
  measurementCache
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
  wrapPolicy?: ShapeTextWrapPolicy
  measurementCache?: ShapeTextMeasurementCache
}): {
  hasWrappedLines: boolean
  longestLineWidth: number
} {
  const explicitLineCount = getExplicitTextboxLineCount({ text })
  const requiresGraphemeSplit = resolveSplitByGraphemeForFrame({
    text,
    frameWidth,
    wrapPolicy,
    measurementCache
  })
  const measurement = measureShapeTextFrameLayout({
    text,
    frameWidth,
    splitByGrapheme: requiresGraphemeSplit,
    requiresGraphemeSplit,
    measurementCache
  })

  return {
    hasWrappedLines: measurement.renderedLineCount > explicitLineCount,
    longestLineWidth: measurement.longestLineWidth
  }
}

/**
 * Измеряет высоту текста в рамках переданной ширины текстового фрейма.
 */
export function measureTextboxHeightForFrame({
  text,
  frameWidth,
  splitByGrapheme,
  wrapPolicy,
  measurementCache
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
  splitByGrapheme?: boolean
  wrapPolicy?: ShapeTextWrapPolicy
  measurementCache?: ShapeTextMeasurementCache
}): number {
  const resolvedSplitByGrapheme = splitByGrapheme
    ?? resolveSplitByGraphemeForFrame({
      text,
      frameWidth,
      wrapPolicy,
      measurementCache
    })

  return measureShapeTextFrameLayout({
    text,
    frameWidth,
    splitByGrapheme: resolvedSplitByGrapheme,
    requiresGraphemeSplit: resolvedSplitByGrapheme,
    measurementCache
  }).measuredHeight
}

/**
 * Возвращает минимальную ширину текстового фрейма, достаточную для отображения одного символа.
 */
export function resolveMinimumTextFrameWidth({
  text,
  measurementCache
}: {
  text: ShapeLayoutInput['text']
  measurementCache?: ShapeTextMeasurementCache
}): number {
  if (measurementCache?.minimumTextFrameWidth !== null && measurementCache?.minimumTextFrameWidth !== undefined) {
    return measurementCache.minimumTextFrameWidth
  }

  const minimumFrameWidth = measureTextboxLongestLineWidthForFrame({
    text,
    frameWidth: MIN_TEXT_FRAME_SIZE,
    splitByGrapheme: true,
    measurementCache
  })

  const resolvedMinimumTextFrameWidth = Math.max(MIN_TEXT_FRAME_SIZE, minimumFrameWidth)

  if (measurementCache) {
    measurementCache.minimumTextFrameWidth = resolvedMinimumTextFrameWidth
  }

  return resolvedMinimumTextFrameWidth
}

/**
 * Вычисляет верхнюю координату текста по вертикальному выравниванию.
 */
export function resolveVerticalTop({
  alignV,
  frameHeight,
  frameTop,
  textHeight
}: {
  alignV: ShapeLayoutInput['alignV']
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
export function resolveSplitByGraphemeForFrame({
  text,
  frameWidth,
  wrapPolicy,
  measurementCache
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
  wrapPolicy?: ShapeTextWrapPolicy
  measurementCache?: ShapeTextMeasurementCache
}): boolean {
  if (wrapPolicy === 'words-only') return false

  const safeFrameWidth = Math.max(MIN_TEXT_FRAME_SIZE, frameWidth)
  const frameWidthCacheKey = resolveMeasurementFrameWidthCacheKey({
    frameWidth: safeFrameWidth
  })
  const cachedSplitByGrapheme = measurementCache?.splitByGraphemeByFrameWidth.get(frameWidthCacheKey)

  if (typeof cachedSplitByGrapheme === 'boolean') {
    return cachedSplitByGrapheme
  }

  const previousState = captureTextboxMeasurementState({ text })

  text.set({
    autoExpand: false,
    width: safeFrameWidth,
    splitByGrapheme: false,
    scaleX: 1,
    scaleY: 1
  })
  text.initDimensions()

  const dynamicMinWidth = getTextboxDynamicMinWidth({ text })
  const shouldSplitByGrapheme = dynamicMinWidth > safeFrameWidth + TEXT_FRAME_FILL_EPSILON

  restoreTextboxMeasurementState({
    text,
    state: previousState
  })

  measurementCache?.splitByGraphemeByFrameWidth.set(frameWidthCacheKey, shouldSplitByGrapheme)

  return shouldSplitByGrapheme
}

/**
 * Измеряет максимальную ширину строки textbox при заданной ширине фрейма и режиме переноса.
 */
function measureTextboxLongestLineWidthForFrame({
  text,
  frameWidth,
  splitByGrapheme,
  measurementCache
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
  splitByGrapheme: boolean
  measurementCache?: ShapeTextMeasurementCache
}): number {
  const cachedMeasurement = measurementCache?.measurementsByKey.get(resolveMeasurementCacheKey({
    frameWidth,
    splitByGrapheme
  }))

  if (cachedMeasurement) {
    return cachedMeasurement.longestLineWidth
  }

  const previousState = captureTextboxMeasurementState({ text })

  text.set({
    autoExpand: false,
    width: Math.max(MIN_TEXT_FRAME_SIZE, frameWidth),
    splitByGrapheme,
    scaleX: 1,
    scaleY: 1
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
    width,
    scaleX,
    scaleY
  } = text

  return {
    autoExpand,
    splitByGrapheme,
    width: typeof width === 'number' ? width : undefined,
    scaleX: typeof scaleX === 'number' ? scaleX : undefined,
    scaleY: typeof scaleY === 'number' ? scaleY : undefined
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
    width,
    scaleX,
    scaleY
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

  if (typeof scaleX === 'number') {
    updates.scaleX = scaleX
  }

  if (typeof scaleY === 'number') {
    updates.scaleY = scaleY
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

/**
 * Возвращает стабильный cache key для ширины измеряемого text frame.
 */
function resolveMeasurementFrameWidthCacheKey({
  frameWidth
}: {
  frameWidth: number
}): string {
  const safeFrameWidth = Math.max(MIN_TEXT_FRAME_SIZE, frameWidth)

  return String(
    Math.round(safeFrameWidth * TEXT_FRAME_WIDTH_CACHE_PRECISION) / TEXT_FRAME_WIDTH_CACHE_PRECISION
  )
}

/**
 * Возвращает cache key измерения с учётом ширины и режима splitByGrapheme.
 */
function resolveMeasurementCacheKey({
  frameWidth,
  splitByGrapheme
}: {
  frameWidth: number
  splitByGrapheme: boolean
}): string {
  return `${resolveMeasurementFrameWidthCacheKey({ frameWidth })}:${splitByGrapheme ? 1 : 0}`
}
