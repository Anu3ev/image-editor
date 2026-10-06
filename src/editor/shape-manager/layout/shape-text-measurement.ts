/* eslint-disable no-use-before-define, @typescript-eslint/no-use-before-define */
import {
  ShapeLayoutInput,
  ShapeTextMeasurementCache,
  ShapeTextWrapPolicy
} from '../types'
import { MIN_SHAPE_TEXT_FRAME_SIZE } from './shape-padding'

/**
 * Minimum frame width/height for safely measuring a Fabric textbox.
 */
const MIN_TEXT_FRAME_SIZE = MIN_SHAPE_TEXT_FRAME_SIZE

/**
 * Tolerance for checking whether measured text fills the frame.
 */
const TEXT_FRAME_FILL_EPSILON = 0.5
const TEXT_FRAME_WIDTH_CACHE_PRECISION = 1_000_000

/**
 * Snapshot of mutable textbox properties temporarily changed during measurement.
 */
type TextboxMeasurementState = {
  autoExpand?: boolean
  splitByGrapheme?: boolean
  width?: number
  scaleX?: number
  scaleY?: number
}

/**
 * Result of measuring a textbox at a specific text-frame width.
 */
type ShapeTextFrameMeasurement = {
  measuredHeight: number
  renderedLineCount: number
  longestLineWidth: number
  requiresGraphemeSplit: boolean
}

/**
 * Measures the current textbox state for the given text-frame width
 * in an explicitly specified splitByGrapheme mode.
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
 * Measures the longest line width and whether automatic wrapping occurs at the given text-frame width.
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
 * Measures text height within the given text-frame width.
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
 * Returns the minimum text-frame width sufficient to display a single character.
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
 * Calculates the text's top coordinate from its vertical alignment.
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
 * Determines whether long words without spaces require a splitByGrapheme fallback.
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
 * Measures the maximum textbox line width for the given frame width and wrapping mode.
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
 * Returns the textbox's visual height.
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
 * Returns the width of the textbox's longest rendered line.
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
 * Returns the number of explicit lines in the source text before automatic wrapping.
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
 * Returns the number of actually rendered textbox lines.
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
 * Measures the longest line already rendered in the textbox.
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
 * Returns the current textbox state for temporary measurements.
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
 * Restores the textbox state after temporary measurements.
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
 * Returns the textbox's dynamicMinWidth for checking unbreakable words.
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
 * Returns a stable cache key for the measured text-frame width.
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
 * Returns a measurement cache key that includes width and splitByGrapheme mode.
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
