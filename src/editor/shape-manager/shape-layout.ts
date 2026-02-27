import { Point } from 'fabric'
import { resizeShapeNode } from './shape-factory'
import {
  ShapeLayoutInput,
  ShapePadding,
  ShapeVerticalAlign
} from './types'

const MIN_TEXT_FRAME_SIZE = 1
const TEXT_FRAME_FILL_EPSILON = 0.5
const MIN_VERTICAL_SPACE_RATIO = 0.1

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
    splitByGrapheme: true
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
  const frame = createTextFrame({
    width: safeWidth,
    height: safeHeight,
    padding: normalizedPadding
  })
  const measuredHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: frame.width
  })
  const frameHeight = frame.height

  if (measuredHeight <= frameHeight + TEXT_FRAME_FILL_EPSILON) {
    return safeHeight
  }

  const verticalSpaceRatio = Math.max(
    MIN_VERTICAL_SPACE_RATIO,
    1 - normalizedPadding.top - normalizedPadding.bottom
  )

  const requiredHeight = measuredHeight / verticalSpaceRatio
  return Math.max(safeHeight, requiredHeight)
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
  return Math.min(Math.max(value, 0), 0.45)
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
  const left = -width / 2 + width * padding.left
  const top = -height / 2 + height * padding.top

  const frameWidth = Math.max(
    MIN_TEXT_FRAME_SIZE,
    width * (1 - padding.left - padding.right)
  )

  const frameHeight = Math.max(
    MIN_TEXT_FRAME_SIZE,
    height * (1 - padding.top - padding.bottom)
  )

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
  text.set({
    autoExpand: false,
    width: Math.max(MIN_TEXT_FRAME_SIZE, frameWidth),
    splitByGrapheme: true
  })

  text.initDimensions()

  return getTextboxHeight({ text })
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
