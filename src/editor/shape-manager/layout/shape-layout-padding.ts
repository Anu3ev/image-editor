import {
  MIN_SHAPE_TEXT_FRAME_SIZE,
  normalizeShapeLayoutPadding
} from './shape-padding'
import {
  ShapePadding,
  ShapePaddingChangeMap
} from '../types'

const TEXT_FRAME_FILL_EPSILON = 0.5
const MAX_MIN_FRAME_WIDTH_SEARCH_ITERATIONS = 12

/**
 * Минимальный контракт текста для расчёта фрейма внутри shape.
 */
type ShapeLayoutText = {
  text?: string | null
}

/**
 * Аргументы измерения высоты textbox при заданной ширине фрейма.
 */
type TextboxFrameMeasureParams<TText extends ShapeLayoutText> = {
  text: TText
  frameWidth: number
}

/**
 * Функция измерения высоты textbox внутри текстового фрейма.
 */
type MeasureTextboxHeightForFrame<TText extends ShapeLayoutText> = ({
  text,
  frameWidth
}: TextboxFrameMeasureParams<TText>) => number

/**
 * Аргументы расчета минимальной ширины текстового фрейма.
 */
type MinimumTextFrameWidthParams<TText extends ShapeLayoutText> = {
  text: TText
}

/**
 * Функция расчета минимальной ширины текстового фрейма.
 */
type ResolveMinimumTextFrameWidth<TText extends ShapeLayoutText> = ({
  text
}: MinimumTextFrameWidthParams<TText>) => number

/**
 * Аргументы ограничения пары padding по суммарному доступному пространству.
 */
type ClampPaddingPairParams = {
  start: number
  end: number
  maxTotalPadding: number
  startChanged: boolean
  endChanged: boolean
}

/**
 * Пара padding-значений для противоположных сторон.
 */
type PaddingPair = {
  start: number
  end: number
}

/**
 * Аргументы расчета итоговой пары padding с учетом internal inset.
 */
type ResolveAppliedPaddingPairParams = {
  start: number
  end: number
  insetStart: number
  insetEnd: number
  maxTotalPadding: number
  startChanged: boolean
  endChanged: boolean
}

/**
 * Итог пары padding: effective значения и отдельно пользовательская часть.
 */
type AppliedPaddingPair = {
  appliedPaddingStart: number
  appliedPaddingEnd: number
  appliedUserPaddingStart: number
  appliedUserPaddingEnd: number
}

/**
 * Аргументы подбора минимальной ширины фрейма под заданную высоту.
 */
type ResolveMinimumFrameWidthToFitHeightParams<TText extends ShapeLayoutText> = {
  text: TText
  minFrameWidth: number
  maxFrameWidth: number
  frameHeight: number
  measureTextboxHeightForFrame: MeasureTextboxHeightForFrame<TText>
}

/**
 * Итог применения горизонтального padding и минимальной нужной ширины шейпа.
 */
type ResolvedHorizontalPadding = {
  appliedPadding: Pick<ShapePadding, 'left' | 'right'>
  appliedUserPadding: Pick<ShapePadding, 'left' | 'right'>
  requiredWidth: number
}

/**
 * Аргументы применения горизонтального padding.
 */
type ResolveAppliedHorizontalPaddingParams<TText extends ShapeLayoutText> = {
  text: TText
  width: number
  availableTextFrameHeight: number
  padding: ShapePadding
  internalShapeTextInset: ShapePadding
  expandShapeHeightToFitText: boolean
  changedPadding?: ShapePaddingChangeMap
  measureTextboxHeightForFrame: MeasureTextboxHeightForFrame<TText>
  resolveMinimumTextFrameWidth: ResolveMinimumTextFrameWidth<TText>
}

/**
 * Итог применения вертикального padding.
 */
type ResolvedVerticalPadding = {
  appliedPadding: Pick<ShapePadding, 'top' | 'bottom'>
  appliedUserPadding: Pick<ShapePadding, 'top' | 'bottom'>
}

/**
 * Аргументы применения вертикального padding.
 */
type ResolveAppliedVerticalPaddingParams = {
  padding: ShapePadding
  internalShapeTextInset: ShapePadding
  height: number
  textHeight: number
  changedPadding?: ShapePaddingChangeMap
}

/**
 * Полный набор аргументов расчета applied padding для shape.
 */
type ResolveAppliedShapePaddingParams<TText extends ShapeLayoutText> = {
  text: TText
  width: number
  height: number
  padding: ShapePadding
  internalShapeTextInset?: ShapePadding
  expandShapeHeightToFitText: boolean
  changedPadding?: ShapePaddingChangeMap
  measureTextboxHeightForFrame: MeasureTextboxHeightForFrame<TText>
  resolveMinimumTextFrameWidth: ResolveMinimumTextFrameWidth<TText>
}

/**
 * Итог расчета applied padding и минимальных размеров shape для выбранного layout.
 */
type ResolvedShapePadding = {
  appliedPadding: ShapePadding
  appliedUserPadding: ShapePadding
  requiredWidth: number
  requiredHeight: number
}

/**
 * Возвращает доступную ширину текстового фрейма для переданной ширины шейпа.
 */
export function resolveTextFrameWidth({
  width,
  padding
}: {
  width: number
  padding: ShapePadding
}): number {
  const leftPadding = Math.max(0, padding.left)
  const rightPadding = Math.max(0, padding.right)

  return Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, width - leftPadding - rightPadding)
}

/**
 * Проверяет, содержит ли textbox видимый текст.
 */
function hasShapeTextContent({
  text
}: {
  text: ShapeLayoutText
}): boolean {
  const rawText = text.text ?? ''

  return rawText.trim().length > 0
}

/**
 * Ограничивает пару padding по суммарному доступному пространству.
 * Если изменилась только одна сторона, старается сохранить вторую без лишних изменений.
 */
function clampPaddingPair({
  start,
  end,
  maxTotalPadding,
  startChanged,
  endChanged
}: ClampPaddingPairParams): PaddingPair {
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
 * Возвращает итоговый padding пары сторон и отдельно пользовательскую часть без internal inset.
 * Internal inset не ужимается: при нехватке места съедается только пользовательский padding.
 */
function resolveAppliedPaddingPair({
  start,
  end,
  insetStart,
  insetEnd,
  maxTotalPadding,
  startChanged,
  endChanged
}: ResolveAppliedPaddingPairParams): AppliedPaddingPair {
  const safeInsetStart = Math.max(0, insetStart)
  const safeInsetEnd = Math.max(0, insetEnd)
  const maxTotalUserPadding = Math.max(
    0,
    maxTotalPadding - safeInsetStart - safeInsetEnd
  )
  const clampedUserPadding = clampPaddingPair({
    start: Math.max(0, start),
    end: Math.max(0, end),
    maxTotalPadding: maxTotalUserPadding,
    startChanged,
    endChanged
  })
  const appliedUserPaddingStart = Math.max(0, Math.floor(clampedUserPadding.start))
  const appliedUserPaddingEnd = Math.max(0, Math.floor(clampedUserPadding.end))

  return {
    appliedPaddingStart: safeInsetStart + appliedUserPaddingStart,
    appliedPaddingEnd: safeInsetEnd + appliedUserPaddingEnd,
    appliedUserPaddingStart,
    appliedUserPaddingEnd
  }
}

/**
 * Возвращает минимальную ширину текстового фрейма, при которой текст ещё помещается
 * в заданную высоту.
 */
function resolveMinimumFrameWidthToFitHeight<TText extends ShapeLayoutText>({
  text,
  minFrameWidth,
  maxFrameWidth,
  frameHeight,
  measureTextboxHeightForFrame
}: ResolveMinimumFrameWidthToFitHeightParams<TText>): number {
  const safeMinFrameWidth = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, minFrameWidth)
  const safeMaxFrameWidth = Math.max(safeMinFrameWidth, maxFrameWidth)
  const safeFrameHeight = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, frameHeight)

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
      continue
    }

    low = middle
  }

  return high
}

/**
 * Подбирает горизонтальные padding так, чтобы они не требовали расширять шейп сверх выбранной политики layout.
 */
function resolveAppliedHorizontalPadding<TText extends ShapeLayoutText>({
  text,
  width,
  availableTextFrameHeight,
  padding,
  internalShapeTextInset,
  expandShapeHeightToFitText,
  changedPadding,
  measureTextboxHeightForFrame,
  resolveMinimumTextFrameWidth
}: ResolveAppliedHorizontalPaddingParams<TText>): ResolvedHorizontalPadding {
  const safeWidth = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, width)
  const safeAvailableTextFrameHeight = Math.max(
    MIN_SHAPE_TEXT_FRAME_SIZE,
    availableTextFrameHeight
  )

  const hasTextContent = hasShapeTextContent({ text })
  const minimumFrameWidth = hasTextContent
    ? resolveMinimumTextFrameWidth({ text })
    : MIN_SHAPE_TEXT_FRAME_SIZE

  let requiredFrameWidth = minimumFrameWidth

  if (!expandShapeHeightToFitText) {
    requiredFrameWidth = resolveMinimumFrameWidthToFitHeight({
      text,
      minFrameWidth: minimumFrameWidth,
      maxFrameWidth: safeWidth,
      frameHeight: safeAvailableTextFrameHeight,
      measureTextboxHeightForFrame
    })
  }

  const requiredWidth = requiredFrameWidth
    + internalShapeTextInset.left
    + internalShapeTextInset.right

  const maxTotalPadding = Math.max(0, safeWidth - requiredFrameWidth)
  const pair = resolveAppliedPaddingPair({
    start: padding.left,
    end: padding.right,
    insetStart: internalShapeTextInset.left,
    insetEnd: internalShapeTextInset.right,
    maxTotalPadding,
    startChanged: Boolean(changedPadding?.left),
    endChanged: Boolean(changedPadding?.right)
  })

  return {
    appliedPadding: {
      left: pair.appliedPaddingStart,
      right: pair.appliedPaddingEnd
    },
    appliedUserPadding: {
      left: pair.appliedUserPaddingStart,
      right: pair.appliedUserPaddingEnd
    },
    requiredWidth
  }
}

/**
 * Подбирает вертикальные padding внутри уже вычисленной высоты shape.
 */
function resolveAppliedVerticalPadding({
  padding,
  internalShapeTextInset,
  height,
  textHeight,
  changedPadding
}: ResolveAppliedVerticalPaddingParams): ResolvedVerticalPadding {
  const safeHeight = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, height)
  const safeTextHeight = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, textHeight)
  const maxTotalPadding = Math.max(0, safeHeight - safeTextHeight)

  const pair = resolveAppliedPaddingPair({
    start: padding.top,
    end: padding.bottom,
    insetStart: internalShapeTextInset.top,
    insetEnd: internalShapeTextInset.bottom,
    maxTotalPadding,
    startChanged: Boolean(changedPadding?.top),
    endChanged: Boolean(changedPadding?.bottom)
  })

  return {
    appliedPadding: {
      top: pair.appliedPaddingStart,
      bottom: pair.appliedPaddingEnd
    },
    appliedUserPadding: {
      top: pair.appliedUserPaddingStart,
      bottom: pair.appliedUserPaddingEnd
    }
  }
}

/**
 * Применяет padding внутри переданных размеров шейпа и возвращает итоговые effective/user-значения
 * вместе с минимальными required width/height для non-removable internal inset.
 */
export function resolveAppliedShapePadding<TText extends ShapeLayoutText>({
  text,
  width,
  height,
  padding,
  internalShapeTextInset,
  expandShapeHeightToFitText,
  changedPadding,
  measureTextboxHeightForFrame,
  resolveMinimumTextFrameWidth
}: ResolveAppliedShapePaddingParams<TText>): ResolvedShapePadding {
  const safeWidth = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, width)
  const safeHeight = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, height)

  const normalizedPadding = normalizeShapeLayoutPadding({
    padding
  })
  const normalizedInternalShapeTextInset = normalizeShapeLayoutPadding({
    padding: internalShapeTextInset
  })

  const hasHorizontalPaddingChange = Boolean(changedPadding?.left)
    || Boolean(changedPadding?.right)
  const hasVerticalPaddingChange = Boolean(changedPadding?.top)
    || Boolean(changedPadding?.bottom)
  const shouldPreserveVerticalPadding = !expandShapeHeightToFitText
    && hasHorizontalPaddingChange
    && !hasVerticalPaddingChange

  const verticalInset = normalizedInternalShapeTextInset.top
    + normalizedInternalShapeTextInset.bottom
  const preservedVerticalUserPadding = shouldPreserveVerticalPadding
    ? normalizedPadding.top + normalizedPadding.bottom
    : 0
  const reservedVerticalPadding = verticalInset + preservedVerticalUserPadding
  const availableTextFrameHeightForHorizontalFit = Math.max(
    MIN_SHAPE_TEXT_FRAME_SIZE,
    safeHeight - reservedVerticalPadding
  )

  const horizontalPadding = resolveAppliedHorizontalPadding({
    text,
    width: safeWidth,
    availableTextFrameHeight: availableTextFrameHeightForHorizontalFit,
    padding: normalizedPadding,
    internalShapeTextInset: normalizedInternalShapeTextInset,
    expandShapeHeightToFitText,
    changedPadding,
    measureTextboxHeightForFrame,
    resolveMinimumTextFrameWidth
  })

  const horizontalFramePadding = {
    top: 0,
    right: horizontalPadding.appliedPadding.right,
    bottom: 0,
    left: horizontalPadding.appliedPadding.left
  }
  const frameWidth = resolveTextFrameWidth({
    width: safeWidth,
    padding: horizontalFramePadding
  })

  const hasTextContent = hasShapeTextContent({ text })
  const measuredHeight = hasTextContent
    ? measureTextboxHeightForFrame({
      text,
      frameWidth
    })
    : MIN_SHAPE_TEXT_FRAME_SIZE
  const requestedVerticalUserPadding = normalizedPadding.top
    + normalizedPadding.bottom

  const requiredHeight = expandShapeHeightToFitText
    ? Math.max(
      safeHeight,
      measuredHeight + verticalInset + requestedVerticalUserPadding
    )
    : safeHeight

  const verticalPadding = resolveAppliedVerticalPadding({
    padding: normalizedPadding,
    internalShapeTextInset: normalizedInternalShapeTextInset,
    height: requiredHeight,
    textHeight: measuredHeight,
    changedPadding
  })

  return {
    appliedPadding: {
      top: verticalPadding.appliedPadding.top,
      right: horizontalPadding.appliedPadding.right,
      bottom: verticalPadding.appliedPadding.bottom,
      left: horizontalPadding.appliedPadding.left
    },
    appliedUserPadding: {
      top: verticalPadding.appliedUserPadding.top,
      right: horizontalPadding.appliedUserPadding.right,
      bottom: verticalPadding.appliedUserPadding.bottom,
      left: horizontalPadding.appliedUserPadding.left
    },
    requiredWidth: horizontalPadding.requiredWidth,
    requiredHeight
  }
}
