/* eslint-disable no-use-before-define, @typescript-eslint/no-use-before-define */
import { resizeShapeNode } from './shape-factory'
import {
  MIN_SHAPE_TEXT_FRAME_SIZE,
  normalizeShapePadding
} from './shape-padding'
import {
  ShapeLayoutInput,
  ShapePadding,
  ShapePaddingChangeMap,
  ShapeVerticalAlign
} from './types'

const MIN_TEXT_FRAME_SIZE = MIN_SHAPE_TEXT_FRAME_SIZE
const TEXT_FRAME_FILL_EPSILON = 0.5
const MAX_WIDTH_RESIZE_ITERATIONS = 8
const MAX_MIN_FRAME_WIDTH_SEARCH_ITERATIONS = 12

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
  textInset,
  allowHeightExpansion = true,
  changedPadding
}: ShapeLayoutInput): void => {
  const requestedUserPadding = normalizeShapePadding({
    padding
  })
  const normalizedTextInset = normalizeShapePadding({
    padding: textInset
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
    padding: appliedPadding,
    userPadding: appliedUserPadding,
    requiredHeight
  } = resolveAppliedShapePadding({
    text,
    width: safeWidth,
    height,
    padding: requestedUserPadding,
    textInset: normalizedTextInset,
    allowHeightExpansion,
    changedPadding
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
    padding: appliedPadding
  } = resolveAppliedShapePadding({
    text,
    width: safeWidth,
    height: safeHeight,
    padding: requestedPadding,
    allowHeightExpansion: false
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
  const horizontalPadding = resolveAppliedHorizontalPadding({
    text,
    width: safeWidth,
    height: safeHeight,
    padding: normalizedPadding,
    textInset: normalizeShapePadding({}),
    allowHeightExpansion: true
  })
  const frameWidth = resolveTextFrameWidth({
    width: safeWidth,
    padding: {
      ...normalizedPadding,
      left: horizontalPadding.padding.left,
      right: horizontalPadding.padding.right,
      top: 0,
      bottom: 0
    }
  })
  const measuredHeight = measureTextboxHeightForFrame({
    text,
    frameWidth
  })

  return Math.max(safeHeight, measuredHeight)
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
 * Возвращает доступную ширину текстового фрейма для переданной ширины шейпа.
 */
function resolveTextFrameWidth({
  width,
  padding
}: {
  width: number
  padding: ShapePadding
}): number {
  const leftPadding = Math.max(0, padding.left)
  const rightPadding = Math.max(0, padding.right)

  return Math.max(MIN_TEXT_FRAME_SIZE, width - leftPadding - rightPadding)
}

/**
 * Возвращает применённый padding для fixed-size или content-fit layout и итоговую высоту shape.
 */
function resolveAppliedShapePadding({
  text,
  width,
  height,
  padding,
  textInset,
  allowHeightExpansion,
  changedPadding
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  padding: ShapePadding
  textInset?: ShapePadding
  allowHeightExpansion: boolean
  changedPadding?: ShapePaddingChangeMap
}): {
  padding: ShapePadding
  userPadding: ShapePadding
  requiredHeight: number
} {
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const normalizedUserPadding = normalizeShapePadding({
    padding
  })
  const normalizedTextInset = normalizeShapePadding({
    padding: textInset
  })
  const horizontalPadding = resolveAppliedHorizontalPadding({
    text,
    width: safeWidth,
    height: safeHeight,
    padding: normalizedUserPadding,
    textInset: normalizedTextInset,
    allowHeightExpansion,
    changedPadding
  })
  const frameWidth = resolveTextFrameWidth({
    width: safeWidth,
    padding: {
      top: 0,
      right: horizontalPadding.padding.right,
      bottom: 0,
      left: horizontalPadding.padding.left
    }
  })
  const measuredHeight = hasShapeTextContent({
    text
  })
    ? measureTextboxHeightForFrame({
      text,
      frameWidth
    })
    : MIN_TEXT_FRAME_SIZE
  const requiredHeight = allowHeightExpansion
    ? Math.max(safeHeight, measuredHeight)
    : safeHeight
  const verticalPadding = resolveAppliedVerticalPadding({
    padding: normalizedUserPadding,
    textInset: normalizedTextInset,
    height: requiredHeight,
    textHeight: measuredHeight,
    changedPadding
  })

  return {
    padding: {
      top: verticalPadding.padding.top,
      right: horizontalPadding.padding.right,
      bottom: verticalPadding.padding.bottom,
      left: horizontalPadding.padding.left
    },
    userPadding: {
      top: verticalPadding.userPadding.top,
      right: horizontalPadding.userPadding.right,
      bottom: verticalPadding.userPadding.bottom,
      left: horizontalPadding.userPadding.left
    },
    requiredHeight
  }
}

/**
 * Подбирает горизонтальные padding таким образом, чтобы они не были причиной расширения shape.
 */
function resolveAppliedHorizontalPadding({
  text,
  width,
  height,
  padding,
  textInset,
  allowHeightExpansion,
  changedPadding
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  padding: ShapePadding
  textInset: ShapePadding
  allowHeightExpansion: boolean
  changedPadding?: ShapePaddingChangeMap
}): {
  padding: Pick<ShapePadding, 'left' | 'right'>
  userPadding: Pick<ShapePadding, 'left' | 'right'>
} {
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const minimumFrameWidth = hasShapeTextContent({
    text
  })
    ? resolveMinimumTextFrameWidth({ text })
    : MIN_TEXT_FRAME_SIZE
  const frameHeight = Math.max(
    MIN_TEXT_FRAME_SIZE,
    safeHeight - textInset.top - textInset.bottom
  )
  const requiredFrameWidth = allowHeightExpansion
    ? minimumFrameWidth
    : resolveMinimumFrameWidthToFitHeight({
      text,
      minFrameWidth: minimumFrameWidth,
      maxFrameWidth: safeWidth,
      frameHeight
    })
  const maxTotalPadding = Math.max(0, safeWidth - requiredFrameWidth)

  const pair = resolveAppliedPaddingPair({
    start: padding.left,
    end: padding.right,
    insetStart: textInset.left,
    insetEnd: textInset.right,
    maxTotalPadding,
    startChanged: Boolean(changedPadding?.left),
    endChanged: Boolean(changedPadding?.right)
  })

  return {
    padding: {
      left: pair.start,
      right: pair.end
    },
    userPadding: {
      left: pair.userStart,
      right: pair.userEnd
    }
  }
}

/**
 * Подбирает вертикальные padding внутри уже вычисленной высоты shape.
 */
function resolveAppliedVerticalPadding({
  padding,
  textInset,
  height,
  textHeight,
  changedPadding
}: {
  padding: ShapePadding
  textInset: ShapePadding
  height: number
  textHeight: number
  changedPadding?: ShapePaddingChangeMap
}): {
  padding: Pick<ShapePadding, 'top' | 'bottom'>
  userPadding: Pick<ShapePadding, 'top' | 'bottom'>
} {
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const safeTextHeight = Math.max(MIN_TEXT_FRAME_SIZE, textHeight)
  const maxTotalPadding = Math.max(0, safeHeight - safeTextHeight)

  const pair = resolveAppliedPaddingPair({
    start: padding.top,
    end: padding.bottom,
    insetStart: textInset.top,
    insetEnd: textInset.bottom,
    maxTotalPadding,
    startChanged: Boolean(changedPadding?.top),
    endChanged: Boolean(changedPadding?.bottom)
  })

  return {
    padding: {
      top: pair.start,
      bottom: pair.end
    },
    userPadding: {
      top: pair.userStart,
      bottom: pair.userEnd
    }
  }
}

/**
 * Применяет clamp к total padding и возвращает отдельно effective и user-составляющие.
 */
function resolveAppliedPaddingPair({
  start,
  end,
  insetStart,
  insetEnd,
  maxTotalPadding,
  startChanged,
  endChanged
}: {
  start: number
  end: number
  insetStart: number
  insetEnd: number
  maxTotalPadding: number
  startChanged: boolean
  endChanged: boolean
}): {
  start: number
  end: number
  userStart: number
  userEnd: number
} {
  const clampedPair = clampPaddingPair({
    start: insetStart + Math.max(0, start),
    end: insetEnd + Math.max(0, end),
    maxTotalPadding,
    startChanged,
    endChanged
  })

  return {
    start: clampedPair.start,
    end: clampedPair.end,
    userStart: Math.max(0, clampedPair.start - insetStart),
    userEnd: Math.max(0, clampedPair.end - insetEnd)
  }
}

/**
 * Возвращает минимальную ширину текстового фрейма, при которой текст ещё помещается в заданную высоту.
 */
function resolveMinimumFrameWidthToFitHeight({
  text,
  minFrameWidth,
  maxFrameWidth,
  frameHeight
}: {
  text: ShapeLayoutInput['text']
  minFrameWidth: number
  maxFrameWidth: number
  frameHeight: number
}): number {
  const safeMinFrameWidth = Math.max(MIN_TEXT_FRAME_SIZE, minFrameWidth)
  const safeMaxFrameWidth = Math.max(safeMinFrameWidth, maxFrameWidth)
  const safeFrameHeight = Math.max(MIN_TEXT_FRAME_SIZE, frameHeight)

  if (!hasShapeTextContent({ text })) return safeMinFrameWidth

  const minFrameHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: safeMinFrameWidth
  })
  if (minFrameHeight <= safeFrameHeight + TEXT_FRAME_FILL_EPSILON) {
    return safeMinFrameWidth
  }

  const maxFrameHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: safeMaxFrameWidth
  })
  if (maxFrameHeight > safeFrameHeight + TEXT_FRAME_FILL_EPSILON) {
    return safeMaxFrameWidth
  }

  let low = safeMinFrameWidth
  let high = safeMaxFrameWidth

  for (let iteration = 0; iteration < MAX_MIN_FRAME_WIDTH_SEARCH_ITERATIONS; iteration += 1) {
    const middle = (low + high) / 2
    const measuredHeight = measureTextboxHeightForFrame({
      text,
      frameWidth: middle
    })

    if (measuredHeight <= safeFrameHeight + TEXT_FRAME_FILL_EPSILON) {
      high = middle
    } else {
      low = middle
    }
  }

  return high
}

/**
 * Ограничивает пару padding по суммарному доступному пространству, не изменяя неизменённую сторону без необходимости.
 */
function clampPaddingPair({
  start,
  end,
  maxTotalPadding,
  startChanged,
  endChanged
}: {
  start: number
  end: number
  maxTotalPadding: number
  startChanged: boolean
  endChanged: boolean
}): {
  start: number
  end: number
} {
  const safeStart = Math.max(0, start)
  const safeEnd = Math.max(0, end)
  const safeMaxTotalPadding = Math.max(0, maxTotalPadding)

  if (safeStart + safeEnd <= safeMaxTotalPadding + TEXT_FRAME_FILL_EPSILON) {
    return {
      start: safeStart,
      end: safeEnd
    }
  }

  if (startChanged && !endChanged) {
    const clampedEnd = Math.min(safeEnd, safeMaxTotalPadding)

    return {
      start: Math.min(safeStart, Math.max(0, safeMaxTotalPadding - clampedEnd)),
      end: clampedEnd
    }
  }

  if (endChanged && !startChanged) {
    const clampedStart = Math.min(safeStart, safeMaxTotalPadding)

    return {
      start: clampedStart,
      end: Math.min(safeEnd, Math.max(0, safeMaxTotalPadding - clampedStart))
    }
  }

  const totalPadding = safeStart + safeEnd
  if (totalPadding <= 0) {
    return {
      start: 0,
      end: 0
    }
  }

  const scale = safeMaxTotalPadding / totalPadding

  return {
    start: safeStart * scale,
    end: safeEnd * scale
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
