/* eslint-disable no-use-before-define, @typescript-eslint/no-use-before-define */

import { Point } from 'fabric'
import { resizeShapeNode } from './shape-factory'
import {
  ShapeLayoutInput,
  ShapePadding,
  ShapeVerticalAlign
} from './types'

const MIN_TEXT_FRAME_SIZE = 1
const TEXT_FRAME_FILL_EPSILON = 0.5
const MAX_HORIZONTAL_PADDING_PX = 12
const MAX_VERTICAL_PADDING_PX = 12
const MAX_PADDING_RATIO = 0.45
const MAX_WIDTH_RESIZE_ITERATIONS = 8
const MAX_HEIGHT_RESIZE_ITERATIONS = 8

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

/**
 * Применяет layout для композиции shape + text.
 */
export const applyShapeTextLayout = ({
  group,
  shape,
  text,
  width,
  height,
  alignH,
  alignV,
  padding
}: ShapeLayoutInput): void => {
  const normalizedPadding = normalizePadding({
    padding
  })
  const minWidth = resolveRequiredShapeWidthForText({
    text,
    width,
    padding: normalizedPadding
  })
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, minWidth)
  const minHeight = resolveRequiredShapeHeightForText({
    text,
    width: safeWidth,
    height,
    padding: normalizedPadding
  })
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, minHeight)

  resizeShapeNode({
    shape,
    width: safeWidth,
    height: safeHeight,
    rounding: group.shapeRounding,
    strokeWidth: group.shapeStrokeWidth
  })

  const {
    frame,
    splitByGrapheme,
    textTop
  } = resolveShapeTextFrameLayout({
    text,
    width: safeWidth,
    height: safeHeight,
    alignV,
    padding: normalizedPadding
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

  group.shapeBaseWidth = safeWidth
  group.shapeBaseHeight = safeHeight
  group.shapePaddingTop = normalizedPadding.top
  group.shapePaddingRight = normalizedPadding.right
  group.shapePaddingBottom = normalizedPadding.bottom
  group.shapePaddingLeft = normalizedPadding.left
  group.shapeAlignHorizontal = alignH
  group.shapeAlignVertical = alignV

  group.set({
    width: safeWidth,
    height: safeHeight,
    scaleX: 1,
    scaleY: 1
  })

  group.set('dirty', true)
  group.setCoords()
}

/**
 * Вычисляет текстовый фрейм, режим переноса и вертикальную позицию текста для переданных размеров шейпа.
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
  const normalizedPadding = normalizePadding({
    padding
  })
  const frame = createTextFrame({
    width: safeWidth,
    height: safeHeight,
    padding: normalizedPadding
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
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const normalizedPadding = normalizePadding({
    padding
  })
  const frame = createTextFrame({
    width: safeWidth,
    height: safeHeight,
    padding: normalizedPadding
  })

  const measuredHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: frame.width
  })

  return measuredHeight >= frame.height - TEXT_FRAME_FILL_EPSILON
}

/**
 * Возвращает минимальную высоту shape, чтобы текст помещался в текстовый фрейм.
 */
export const resolveRequiredShapeHeightForText = ({
  text,
  width,
  height,
  padding
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  padding: ShapePadding
}): number => {
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const normalizedPadding = normalizePadding({
    padding
  })
  let nextHeight = safeHeight

  for (let iteration = 0; iteration < MAX_HEIGHT_RESIZE_ITERATIONS; iteration += 1) {
    const frame = createTextFrame({
      width: safeWidth,
      height: nextHeight,
      padding: normalizedPadding
    })

    const measuredHeight = measureTextboxHeightForFrame({
      text,
      frameWidth: frame.width
    })

    if (measuredHeight <= frame.height + TEXT_FRAME_FILL_EPSILON) {
      return nextHeight
    }

    const missingHeight = measuredHeight - frame.height
    nextHeight = Math.max(nextHeight + missingHeight, nextHeight * 1.05)
  }

  return nextHeight
}

/**
 * Возвращает минимальную ширину shape, при которой текст не выходит за пределы текстового фрейма.
 */
function resolveRequiredShapeWidthForText({
  text,
  width,
  padding
}: {
  text: ShapeLayoutInput['text']
  width: number
  padding: ShapePadding
}): number {
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const normalizedPadding = normalizePadding({
    padding
  })
  const currentFrameWidth = resolveTextFrameWidth({
    width: safeWidth,
    padding: normalizedPadding
  })
  const requiredFrameWidth = resolveRequiredTextFrameWidth({
    text,
    frameWidth: currentFrameWidth
  })

  if (requiredFrameWidth <= currentFrameWidth + TEXT_FRAME_FILL_EPSILON) {
    return safeWidth
  }

  let nextWidth = safeWidth

  for (let iteration = 0; iteration < MAX_WIDTH_RESIZE_ITERATIONS; iteration += 1) {
    const nextFrameWidth = resolveTextFrameWidth({
      width: nextWidth,
      padding: normalizedPadding
    })

    if (nextFrameWidth >= requiredFrameWidth - TEXT_FRAME_FILL_EPSILON) {
      return nextWidth
    }

    const missingWidth = requiredFrameWidth - nextFrameWidth
    nextWidth = Math.max(nextWidth + missingWidth, nextWidth * 1.05)
  }

  return nextWidth
}

/**
 * Возвращает центр для размещения группы на канвасе.
 */
export function resolveGroupCenterPoint({
  left,
  top,
  canvasCenter
}: {
  left?: number
  top?: number
  canvasCenter: Point
}): Point {
  if (typeof left === 'number' && typeof top === 'number') return new Point(left, top)

  return canvasCenter
}

/**
 * Нормализует относительные отступы текстового фрейма.
 */
function normalizePadding({ padding }: { padding: ShapePadding }): ShapePadding {
  return {
    top: clampPaddingValue({ value: padding.top }),
    right: clampPaddingValue({ value: padding.right }),
    bottom: clampPaddingValue({ value: padding.bottom }),
    left: clampPaddingValue({ value: padding.left })
  }
}

/**
 * Ограничивает значение padding в безопасном диапазоне.
 */
function clampPaddingValue({ value }: { value: number }): number {
  return Math.min(Math.max(value, 0), MAX_PADDING_RATIO)
}

/**
 * Формирует прямоугольник текстовой рамки внутри фигуры.
 */
function createTextFrame({
  width,
  height,
  padding
}: {
  width: number
  height: number
  padding: ShapePadding
}): ShapeTextFrame {
  const leftPadding = resolvePaddingPixels({
    size: width,
    ratio: padding.left,
    axis: 'horizontal'
  })
  const rightPadding = resolvePaddingPixels({
    size: width,
    ratio: padding.right,
    axis: 'horizontal'
  })
  const topPadding = resolvePaddingPixels({
    size: height,
    ratio: padding.top,
    axis: 'vertical'
  })
  const bottomPadding = resolvePaddingPixels({
    size: height,
    ratio: padding.bottom,
    axis: 'vertical'
  })

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
 * Возвращает доступную ширину текстового фрейма для переданной ширины шейпа.
 */
function resolveTextFrameWidth({
  width,
  padding
}: {
  width: number
  padding: ShapePadding
}): number {
  const leftPadding = resolvePaddingPixels({
    size: width,
    ratio: padding.left,
    axis: 'horizontal'
  })
  const rightPadding = resolvePaddingPixels({
    size: width,
    ratio: padding.right,
    axis: 'horizontal'
  })

  return Math.max(MIN_TEXT_FRAME_SIZE, width - leftPadding - rightPadding)
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
 * Возвращает требуемую ширину текстового фрейма, если даже перенос по символам не устраняет горизонтальный overflow.
 */
function resolveRequiredTextFrameWidth({
  text,
  frameWidth
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
}): number {
  const safeFrameWidth = Math.max(MIN_TEXT_FRAME_SIZE, frameWidth)
  const longestWordWidth = measureTextboxLongestLineWidthForFrame({
    text,
    frameWidth: safeFrameWidth,
    splitByGrapheme: false
  })

  if (longestWordWidth <= safeFrameWidth + TEXT_FRAME_FILL_EPSILON) {
    return safeFrameWidth
  }

  const longestGraphemeLineWidth = measureTextboxLongestLineWidthForFrame({
    text,
    frameWidth: safeFrameWidth,
    splitByGrapheme: true
  })

  if (longestGraphemeLineWidth <= safeFrameWidth + TEXT_FRAME_FILL_EPSILON) {
    return safeFrameWidth
  }

  return longestGraphemeLineWidth
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
 * Возвращает реальный padding в пикселях с ограничением по максимуму.
 */
function resolvePaddingPixels({
  size,
  ratio,
  axis
}: {
  size: number
  ratio: number
  axis: 'horizontal' | 'vertical'
}): number {
  const maxPadding = axis === 'horizontal'
    ? MAX_HORIZONTAL_PADDING_PX
    : MAX_VERTICAL_PADDING_PX
  const relativePadding = size * ratio

  return Math.max(0, Math.min(relativePadding, maxPadding))
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
  const textbox = text as ShapeLayoutInput['text'] & {
    textLines?: string[]
  }

  if (Array.isArray(textbox.textLines) && textbox.textLines.length > 0) {
    return measureLongestRenderedLineWidth({
      text,
      lineCount: textbox.textLines.length
    })
  }

  const rawText = textbox.text ?? ''
  const lineCount = Math.max(rawText.split('\n').length, 1)

  return measureLongestRenderedLineWidth({
    text,
    lineCount
  })
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
