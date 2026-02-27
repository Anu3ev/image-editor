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
const MAX_HEIGHT_RESIZE_ITERATIONS = 8

type TextboxMeasurementState = {
  autoExpand?: boolean
  splitByGrapheme?: boolean
  width?: number
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
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const normalizedPadding = normalizePadding({
    padding
  })
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

  const frame = createTextFrame({
    width: safeWidth,
    height: safeHeight,
    padding: normalizedPadding
  })
  const splitByGrapheme = resolveSplitByGraphemeForFrame({
    text,
    frameWidth: frame.width
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
    top: frame.top,
    originX: 'left',
    originY: 'top',
    splitByGrapheme
  })

  text.initDimensions()

  const measuredHeight = getTextboxHeight({ text })
  const top = resolveVerticalTop({
    alignV,
    frameHeight: frame.height,
    frameTop: frame.top,
    textHeight: measuredHeight
  })

  text.set({ top })

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
    scaleX: 1,
    scaleY: 1
  })

  group.triggerLayout()
  group.setCoords()
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
}): {
  left: number
  top: number
  width: number
  height: number
} {
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
  frameWidth
}: {
  text: ShapeLayoutInput['text']
  frameWidth: number
}): number {
  const previousState = captureTextboxMeasurementState({ text })
  const splitByGrapheme = resolveSplitByGraphemeForFrame({
    text,
    frameWidth
  })

  text.set({
    autoExpand: false,
    width: Math.max(MIN_TEXT_FRAME_SIZE, frameWidth),
    splitByGrapheme
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
