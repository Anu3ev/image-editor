/* eslint-disable no-use-before-define, @typescript-eslint/no-use-before-define */
import { resizeShapeNode } from './shape-factory'
import {
  MIN_SHAPE_TEXT_FRAME_SIZE,
  normalizeShapePadding,
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
} from './types'

const MIN_TEXT_FRAME_SIZE = MIN_SHAPE_TEXT_FRAME_SIZE
const TEXT_FRAME_FILL_EPSILON = 0.5
const MAX_WIDTH_RESIZE_ITERATIONS = 8

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
 * Применяет layout для композиции shape + text,
 * сохраняя ручные базовые размеры отдельно от фактического auto-fit размера.
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
  expandShapeHeightToFitText = true,
  changedPadding
}: ShapeLayoutInput): void => {
  const requestedUserPadding = normalizeShapeUserPadding({
    padding
  })
  const normalizedInternalShapeTextInset = normalizeShapePadding({
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
  const minWidth = resolveMinimumTextFrameWidth({
    text
  })
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width, minWidth)

  const {
    appliedPadding,
    appliedUserPadding,
    requiredHeight
  } = resolveAppliedShapePadding({
    text,
    width: safeWidth,
    height,
    padding: requestedUserPadding,
    internalShapeTextInset: normalizedInternalShapeTextInset,
    expandShapeHeightToFitText,
    changedPadding,
    measureTextboxHeightForFrame,
    resolveMinimumTextFrameWidth
  })
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, requiredHeight)

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

  group.shapeBaseWidth = safeWidth
  group.shapeBaseHeight = safeHeight
  group.shapeManualBaseWidth = manualBaseWidth
  group.shapeManualBaseHeight = manualBaseHeight
  group.shapePaddingTop = appliedUserPadding.top
  group.shapePaddingRight = appliedUserPadding.right
  group.shapePaddingBottom = appliedUserPadding.bottom
  group.shapePaddingLeft = appliedUserPadding.left
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
 * Возвращает целевую ширину shape для режима shapeTextAutoExpand,
 * измеряя текст на максимально допустимой ширине монтажной области и не позволяя сужаться ниже ручной базовой ширины.
 */
export const resolveShapeTextAutoExpandWidthForText = ({
  text,
  currentWidth,
  minimumWidth,
  padding,
  strokeWidth,
  montageAreaWidth
}: {
  text: ShapeLayoutInput['text']
  currentWidth: number
  minimumWidth: number
  padding?: ShapePadding
  strokeWidth?: number
  montageAreaWidth: number
}): number => {
  const safeCurrentWidth = Math.max(MIN_TEXT_FRAME_SIZE, currentWidth)
  const safeMinimumWidth = Math.max(MIN_TEXT_FRAME_SIZE, minimumWidth)
  if (!hasShapeTextContent({ text })) return safeMinimumWidth

  const safeMontageAreaWidth = Number.isFinite(montageAreaWidth) && montageAreaWidth > 0
    ? Math.max(MIN_TEXT_FRAME_SIZE, montageAreaWidth)
    : Math.max(safeCurrentWidth, safeMinimumWidth)
  const safeStrokeWidth = Math.max(0, strokeWidth ?? 0)
  const normalizedPadding = normalizeShapePadding({
    padding
  })
  const effectiveMaxShapeWidth = Math.max(safeMinimumWidth, safeMontageAreaWidth)
  const maxFrameWidth = resolveTextFrameWidth({
    width: effectiveMaxShapeWidth,
    padding: normalizedPadding
  })

  if (safeStrokeWidth >= effectiveMaxShapeWidth) {
    return Math.max(safeCurrentWidth, safeMinimumWidth)
  }

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
  const requiredShapeWidth = Math.max(
    MIN_TEXT_FRAME_SIZE,
    requiredFrameWidth + normalizedPadding.left + normalizedPadding.right
  )
  let nextWidth = Math.min(
    maxShapeWidth,
    Math.max(
      safeMinimumWidth,
      requiredShapeWidth
    )
  )

  for (let iteration = 0; iteration < MAX_WIDTH_RESIZE_ITERATIONS; iteration += 1) {
    const frameWidth = resolveTextFrameWidth({
      width: nextWidth,
      padding: normalizedPadding
    })
    const validation = measureTextboxLayoutForFrame({
      text,
      frameWidth
    })
    const isWideEnough = frameWidth >= requiredFrameWidth - TEXT_FRAME_FILL_EPSILON

    if (!validation.hasWrappedLines && isWideEnough) {
      return nextWidth
    }

    if (nextWidth >= maxShapeWidth - TEXT_FRAME_FILL_EPSILON) {
      return maxShapeWidth
    }

    const nextTargetWidth = validation.hasWrappedLines
      ? Math.max(requiredShapeWidth + 1, nextWidth + 1)
      : requiredFrameWidth

    nextWidth = Math.min(
      maxShapeWidth,
      Math.max(
        nextWidth + 1,
        validation.hasWrappedLines
          ? nextTargetWidth
          : requiredShapeWidth
      )
    )
  }

  return nextWidth
}

/**
 * Возвращает минимальную ширину shape, при которой в текстовом фрейме помещается один символ.
 */
export const resolveMinimumShapeWidthForText = ({
  text,
  padding
}: {
  text: ShapeLayoutInput['text']
  padding?: ShapePadding
}): number => {
  if (!hasShapeTextContent({
    text
  })) return MIN_TEXT_FRAME_SIZE

  const normalizedPadding = normalizeShapePadding({
    padding
  })

  return resolveMinimumTextFrameWidth({ text })
    + normalizedPadding.left
    + normalizedPadding.right
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
  const requestedPadding = normalizeShapePadding({
    padding
  })
  const {
    appliedPadding
  } = resolveAppliedShapePadding({
    text,
    width: safeWidth,
    height: safeHeight,
    padding: requestedPadding,
    expandShapeHeightToFitText: false,
    measureTextboxHeightForFrame,
    resolveMinimumTextFrameWidth
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
  padding
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  padding: ShapePadding
}): number => {
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  if (!hasShapeTextContent({
    text
  })) return safeHeight

  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const normalizedPadding = normalizeShapePadding({
    padding
  })
  const frameWidth = resolveTextFrameWidth({
    width: safeWidth,
    padding: normalizedPadding
  })
  const measuredHeight = measureTextboxHeightForFrame({
    text,
    frameWidth
  })

  return Math.max(
    safeHeight,
    measuredHeight + normalizedPadding.top + normalizedPadding.bottom
  )
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
