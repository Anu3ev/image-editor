import type { Transform } from 'fabric'
import {
  applyFixedWidthShapeTextLayout,
  applyShapeTextLayout,
  measureShapeTextFrameLayout,
  resolveShapeTextFixedWidthLayout,
  resolveRequiredShapeHeightForText
} from '../layout/shape-layout'
import type {
  ResolvedShapeTextLayout
} from '../layout/shape-layout'
import {
  normalizeShapeUserPadding,
  resolveShapeTextContentInset
} from '../layout/shape-padding'
import {
  getShapePreset,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from '../domain/shape-presets'
import type {
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapeScalingProportionalTextConstraintCacheEntry,
  ShapeScalingState,
  ShapeTextWrapPolicy,
  ShapeTextNode,
  ShapeVerticalAlign
} from '../types'
import {
  resolveShapeScaleActionAxes,
  resolveShapeScalingAnchorPoint,
  resolveShapeTransformOriginalNumber,
  resolveShapeTransformOriginXValue,
  resolveShapeTransformOriginYValue
} from './shape-scaling-transform'

/**
 * Минимальный размер shape layout во время скейлинга.
 */
export const SHAPE_SCALING_MIN_SIZE = 1

/**
 * Допуск для сравнения scale-значений во время скейлинга.
 */
export const SHAPE_SCALING_SCALE_EPSILON = 0.0001

/**
 * Допуск для сравнения пиксельных размеров во время скейлинга.
 */
export const SHAPE_SCALING_SIZE_EPSILON = 0.5

/**
 * Pointer event, который может прийти из Fabric transform во время скейлинга.
 */
export type ShapeScalingPointerEvent = Event | MouseEvent | PointerEvent | TouchEvent

/**
 * Стартовые размеры shape-группы, нужные для расчёта live scaling.
 */
export type ShapeScalingStartDimensions = {
  startWidth: number
  startHeight: number
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
}

/**
 * Итоговые размеры shape-группы после commit скейлинга.
 */
export type ShapeScalingCommitDimensions = {
  width: number
  height: number
  hasWidthChange: boolean
  hasDimensionChange: boolean
}

/**
 * Manual base размеры, которые сохраняются после commit скейлинга.
 */
type ShapeScalingManualBaseDimensions = {
  width: number
  height: number
}

/**
 * Полный набор данных для применения scaling layout к shape-группе.
 */
type ShapeScalingLayoutCommit = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode
  width: number
  height: number
  alignH: ShapeHorizontalAlign
  alignV: ShapeVerticalAlign
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
  hasWidthChange: boolean
  wrapPolicy?: ShapeTextWrapPolicy
}

/**
 * Preview размеры shape-группы на live scaling кадре.
 */
type ShapePreviewDimensions = {
  previewWidth: number
  previewHeight: number
}

/**
 * Layout текста, рассчитанный для preview размеров.
 */
type ShapePreviewLayout = ResolvedShapeTextLayout

/**
 * Минимальный proportional scaling constraint для текста внутри фигуры.
 */
export type ShapeScalingProportionalTextConstraint = ShapeScalingProportionalTextConstraintCacheEntry

export function resolveShapeScalingTextWrapPolicy({
  isProportionalScaling
}: {
  isProportionalScaling?: boolean
}): ShapeTextWrapPolicy | undefined {
  if (!isProportionalScaling) return undefined

  return 'words-only'
}

/**
 * Возвращает стабильный cache key для пары scaling размеров.
 */
function resolveShapeScalingSizeCacheKey({
  width,
  height
}: {
  width: number
  height: number
}): string {
  const normalizedWidth = Math.round(Math.max(SHAPE_SCALING_MIN_SIZE, width) * 1_000_000) / 1_000_000
  const normalizedHeight = Math.round(Math.max(SHAPE_SCALING_MIN_SIZE, height) * 1_000_000) / 1_000_000

  return `${normalizedWidth}:${normalizedHeight}`
}

/**
 * Возвращает ширину text frame для scaling расчётов.
 */
function resolveShapeScalingTextFrameWidth({
  width,
  padding
}: {
  width: number
  padding: ShapePadding
}): number {
  return Math.max(
    SHAPE_SCALING_MIN_SIZE,
    width - Math.max(0, padding.left) - Math.max(0, padding.right)
  )
}

/**
 * Возвращает высоту text frame для scaling расчётов.
 */
function resolveShapeScalingTextFrameHeight({
  height,
  padding
}: {
  height: number
  padding: ShapePadding
}): number {
  return Math.max(
    SHAPE_SCALING_MIN_SIZE,
    height - Math.max(0, padding.top) - Math.max(0, padding.bottom)
  )
}

/**
 * Возвращает true, если shape text содержит видимый текст.
 */
function hasVisibleShapeTextContent({
  text
}: {
  text: ShapeTextNode
}): boolean {
  const rawText = text.text ?? ''

  return rawText.trim().length > 0
}

/**
 * Возвращает proportional constraint для пустого текста без дополнительного измерения.
 */
function resolveEmptyTextProportionalConstraint({
  height
}: {
  height: number
}): ShapeScalingProportionalTextConstraint {
  return {
    measuredHeight: height,
    renderedLineCount: 0,
    longestLineWidth: 0,
    requiresGraphemeSplit: false,
    isValid: true
  }
}

/**
 * Возвращает пользовательский padding текста из метаданных группы.
 */
export function resolveShapeScalingUserPadding({ group }: { group: ShapeGroup }): ShapePadding {
  return normalizeShapeUserPadding({
    padding: {
      top: group.shapePaddingTop,
      right: group.shapePaddingRight,
      bottom: group.shapePaddingBottom,
      left: group.shapePaddingLeft
    }
  })
}

/**
 * Возвращает полный внутренний inset текста для текущих размеров shape-группы с учетом пресета и обводки.
 */
export function resolveShapeScalingInternalTextInset({
  group,
  width,
  height
}: {
  group: ShapeGroup
  width: number
  height: number
}): ShapePadding {
  const presetKey = group.shapePresetKey ?? ''
  const preset = presetKey
    ? getShapePreset({ presetKey })
    : null
  const presetInset = preset
    ? resolvePresetInternalShapeTextInset({
      preset,
      width,
      height
    })
    : undefined

  return resolveShapeTextContentInset({
    baseInset: presetInset,
    stroke: group.shapeStroke,
    strokeWidth: group.shapeStrokeWidth
  })
}

/**
 * Возвращает padding, который участвует в minimum-constraints во время scaling.
 * Пользовательские отступы здесь игнорируются и при уменьшении шейпа могут быть съедены layout'ом.
 */
export function resolveShapeScalingConstraintPadding({
  group,
  width,
  height
}: {
  group: ShapeGroup
  width?: number
  height?: number
}): ShapePadding {
  const resolvedWidth = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    width ?? group.shapeBaseWidth ?? group.width ?? group.shapeManualBaseWidth ?? SHAPE_SCALING_MIN_SIZE
  )
  const resolvedHeight = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    height ?? group.shapeBaseHeight ?? group.height ?? group.shapeManualBaseHeight ?? SHAPE_SCALING_MIN_SIZE
  )

  return resolveShapeScalingInternalTextInset({
    group,
    width: resolvedWidth,
    height: resolvedHeight
  })
}

/**
 * Валидирует proportional candidate по реальному текущему layout текста.
 * Для этого path переносы по словам допустимы, а fallback на splitByGrapheme — нет.
 */
export function validateShapeTextLayoutForProportionalScaling({
  group,
  text,
  width,
  height,
  measurementCache,
  constraintCache
}: {
  group: ShapeGroup
  text: ShapeTextNode
  width: number
  height: number
  measurementCache?: ShapeScalingState['previewTextMeasurementCache']
  constraintCache?: ShapeScalingState['proportionalTextConstraintCache']
}): ShapeScalingProportionalTextConstraint {
  const safeWidth = Math.max(SHAPE_SCALING_MIN_SIZE, width)
  const safeHeight = Math.max(SHAPE_SCALING_MIN_SIZE, height)
  const constraintCacheKey = resolveShapeScalingSizeCacheKey({
    width: safeWidth,
    height: safeHeight
  })
  const cachedConstraint = constraintCache?.get(constraintCacheKey)

  if (cachedConstraint) return cachedConstraint

  if (!hasVisibleShapeTextContent({ text })) {
    const constraint = resolveEmptyTextProportionalConstraint({
      height: safeHeight
    })

    constraintCache?.set(constraintCacheKey, constraint)

    return constraint
  }

  const constraintPadding = resolveShapeScalingConstraintPadding({
    group,
    width: safeWidth,
    height: safeHeight
  })
  const frameWidth = resolveShapeScalingTextFrameWidth({
    width: safeWidth,
    padding: constraintPadding
  })
  const frameHeight = resolveShapeScalingTextFrameHeight({
    height: safeHeight,
    padding: constraintPadding
  })
  const measurement = measureShapeTextFrameLayout({
    text,
    frameWidth,
    splitByGrapheme: false,
    measurementCache: measurementCache ?? undefined
  })

  const constraint = {
    ...measurement,
    isValid: !measurement.requiresGraphemeSplit
      && measurement.measuredHeight <= frameHeight + SHAPE_SCALING_SIZE_EPSILON
  }

  constraintCache?.set(constraintCacheKey, constraint)

  return constraint
}

/**
 * Возвращает minimum scale для proportional shrink по текущему layout-контракту текста.
 */
export function resolveMinimumProportionalShapeScale({
  group,
  text,
  state
}: {
  group: ShapeGroup
  text: ShapeTextNode
  state: ShapeScalingState
}): {
  scale: number
  minimumHeight: number
} {
  const {
    startHeight,
    startWidth,
    startScaleX,
    startScaleY,
    lastAllowedScaleX,
    lastAllowedScaleY
  } = state
  const lowerBound = Math.max(
    SHAPE_SCALING_MIN_SIZE / startWidth,
    SHAPE_SCALING_MIN_SIZE / startHeight
  )
  const upperBound = Math.max(
    lowerBound,
    startScaleX,
    startScaleY,
    lastAllowedScaleX,
    lastAllowedScaleY
  )
  const evaluateScale = ({ scale }: { scale: number }) => {
    const attemptedWidth = Math.max(SHAPE_SCALING_MIN_SIZE, startWidth * scale)
    const attemptedHeight = Math.max(SHAPE_SCALING_MIN_SIZE, startHeight * scale)
    const candidateConstraint = validateShapeTextLayoutForProportionalScaling({
      group,
      text,
      width: attemptedWidth,
      height: attemptedHeight,
      measurementCache: state.previewTextMeasurementCache,
      constraintCache: state.proportionalTextConstraintCache
    })

    return {
      minimumHeight: candidateConstraint.measuredHeight,
      isValid: candidateConstraint.isValid
    }
  }
  const upperBoundConstraint = evaluateScale({
    scale: upperBound
  })

  if (!upperBoundConstraint.isValid) {
    return {
      scale: upperBound,
      minimumHeight: upperBoundConstraint.minimumHeight
    }
  }

  let low = lowerBound
  let high = upperBound
  let resolvedScale = upperBound
  let resolvedMinimumHeight = upperBoundConstraint.minimumHeight

  for (let index = 0; index < 24; index += 1) {
    const candidateScale = (low + high) / 2
    const candidateConstraint = evaluateScale({
      scale: candidateScale
    })

    if (candidateConstraint.isValid) {
      resolvedScale = candidateScale
      resolvedMinimumHeight = candidateConstraint.minimumHeight
      high = candidateScale
      continue
    }

    low = candidateScale
  }

  return {
    scale: resolvedScale,
    minimumHeight: resolvedMinimumHeight
  }
}

/**
 * Возвращает минимальную высоту shape, достаточную для размещения текста при переданной ширине.
 */
export function resolveMinimumTextFitHeight({
  group,
  text,
  width,
  padding,
  wrapPolicy,
  measurementCache
}: {
  group: ShapeGroup
  text: ShapeTextNode
  width: number
  padding: ShapePadding
  wrapPolicy?: ShapeTextWrapPolicy
  measurementCache?: ShapeScalingState['previewTextMeasurementCache']
}): number {
  return resolveRequiredShapeHeightForText({
    text,
    width,
    height: SHAPE_SCALING_MIN_SIZE,
    padding,
    wrapPolicy,
    measurementCache: measurementCache ?? undefined,
    resolvePaddingForSize: ({ width: nextWidth, height: nextHeight }) => {
      return resolveShapeScalingConstraintPadding({
        group,
        width: nextWidth,
        height: nextHeight
      })
    }
  })
}

/**
 * Возвращает preview-размеры shape для текущего live-scale с учетом переноса текста по строкам.
 */
export function resolveShapeScalingPreviewDimensions({
  group,
  text,
  constraintPadding,
  startDimensions,
  appliedScaleX,
  appliedScaleY,
  minimumHeight,
  wrapPolicy,
  measurementCache
}: {
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  startDimensions: ShapeScalingStartDimensions
  appliedScaleX: number
  appliedScaleY: number
  minimumHeight?: number | null
  wrapPolicy?: ShapeTextWrapPolicy
  measurementCache?: ShapeScalingState['previewTextMeasurementCache']
}): ShapePreviewDimensions {
  const previewWidth = startDimensions.canScaleWidth
    ? Math.max(SHAPE_SCALING_MIN_SIZE, startDimensions.startWidth * appliedScaleX)
    : startDimensions.startWidth
  const scaledPreviewHeight = startDimensions.canScaleHeight
    ? Math.max(SHAPE_SCALING_MIN_SIZE, startDimensions.startHeight * appliedScaleY)
    : startDimensions.startManualBaseHeight
  const resolvedMinimumHeight = minimumHeight ?? resolveRequiredShapeHeightForText({
    text,
    width: previewWidth,
    height: scaledPreviewHeight,
    padding: constraintPadding,
    wrapPolicy,
    measurementCache: measurementCache ?? undefined,
    resolvePaddingForSize: ({ width, height }) => resolveShapeScalingConstraintPadding({
      group,
      width,
      height
    })
  })
  const previewHeight = Math.max(
    scaledPreviewHeight,
    resolvedMinimumHeight
  )

  return {
    previewWidth,
    previewHeight
  }
}

/**
 * Возвращает live-preview layout текста для уже выбранной ширины scaling.
 * Width фиксируется текущим drag, а пользовательский padding поджимается по тому же контракту, что и final layout.
 */
export function resolveShapeScalingPreviewLayout({
  group,
  text,
  state,
  appliedScaleX,
  appliedScaleY,
  minimumHeight
}: {
  group: ShapeGroup
  text: ShapeTextNode
  state: ShapeScalingState
  appliedScaleX: number
  appliedScaleY: number
  minimumHeight?: number | null
}): ShapePreviewLayout {
  const previewWidth = state.canScaleWidth
    ? Math.max(SHAPE_SCALING_MIN_SIZE, state.startWidth * appliedScaleX)
    : state.startWidth
  const scaledPreviewHeight = state.canScaleHeight
    ? Math.max(SHAPE_SCALING_MIN_SIZE, state.startHeight * appliedScaleY)
    : state.startManualBaseHeight
  const initialPreviewHeight = minimumHeight === null || minimumHeight === undefined
    ? scaledPreviewHeight
    : Math.max(scaledPreviewHeight, minimumHeight)
  const expandShapeHeightToFitText = !state.canScaleHeight
  const wrapPolicy = resolveShapeScalingTextWrapPolicy({
    isProportionalScaling: state.isProportionalScaling
  })

  return resolveShapeTextFixedWidthLayout({
    text,
    width: previewWidth,
    height: initialPreviewHeight,
    alignV: group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
    padding: resolveShapeScalingUserPadding({ group }),
    wrapPolicy,
    expandShapeHeightToFitText,
    measurementCache: state.previewTextMeasurementCache ?? undefined,
    resolveInternalShapeTextInset: ({ width, height }) => resolveShapeScalingInternalTextInset({
      group,
      width,
      height
    })
  })
}

/**
 * Возвращает стартовые размеры drag-сессии: текущий laid-out размер shape и ручные базовые размеры.
 */
export function resolveShapeScalingStartDimensions({
  group,
  transform
}: {
  group: ShapeGroup
  transform?: Transform | null
}): ShapeScalingStartDimensions {
  const {
    canScaleWidth,
    canScaleHeight
  } = resolveShapeScaleActionAxes({
    transform
  })
  const startWidth = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    group.shapeBaseWidth ?? group.width ?? group.shapeManualBaseWidth ?? SHAPE_SCALING_MIN_SIZE
  )
  const startHeight = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    group.shapeBaseHeight ?? group.height ?? group.shapeManualBaseHeight ?? SHAPE_SCALING_MIN_SIZE
  )
  const startManualBaseWidth = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    group.shapeManualBaseWidth ?? startWidth
  )
  const startManualBaseHeight = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    group.shapeManualBaseHeight ?? startHeight
  )

  return {
    startWidth,
    startHeight,
    startManualBaseWidth,
    startManualBaseHeight,
    canScaleWidth,
    canScaleHeight
  }
}

/**
 * Создает базовое состояние масштабирования для shape-группы.
 */
export function ensureShapeScalingState({
  scalingState,
  group,
  text,
  constraintPadding,
  transform
}: {
  scalingState: WeakMap<ShapeGroup, ShapeScalingState>
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  transform?: Transform | null
}): ShapeScalingState {
  let state = scalingState.get(group)

  if (state) return state

  const startDimensions = resolveShapeScalingStartDimensions({
    group,
    transform
  })
  const originalScaleX = resolveShapeTransformOriginalNumber({
    transform,
    key: 'scaleX'
  })
  const originalScaleY = resolveShapeTransformOriginalNumber({
    transform,
    key: 'scaleY'
  })
  const originalLeft = resolveShapeTransformOriginalNumber({
    transform,
    key: 'left'
  })
  const originalTop = resolveShapeTransformOriginalNumber({
    transform,
    key: 'top'
  })
  const startScaleX = Math.abs(originalScaleX ?? group.scaleX ?? 1) || 1
  const startScaleY = Math.abs(originalScaleY ?? group.scaleY ?? 1) || 1
  const startLeft = originalLeft ?? group.left ?? 0
  const startTop = originalTop ?? group.top ?? 0
  const startTransformOriginX = resolveShapeTransformOriginXValue({
    value: transform?.original?.originX ?? transform?.originX
  })
  const startTransformOriginY = resolveShapeTransformOriginYValue({
    value: transform?.original?.originY ?? transform?.originY
  })
  const startTransformCorner = typeof transform?.corner === 'string'
    ? transform.corner
    : null
  const scalingAnchorPoint = resolveShapeScalingAnchorPoint({
    group,
    originX: startTransformOriginX,
    originY: startTransformOriginY
  })
  const isFixedWidthVerticalScaling = !startDimensions.canScaleWidth && startDimensions.canScaleHeight
  const previewTextMeasurementCache = {
    measurementsByKey: new Map(),
    splitByGraphemeByFrameWidth: new Map(),
    minimumTextFrameWidth: null
  }
  const proportionalTextConstraintCache = new Map<string, ShapeScalingProportionalTextConstraintCacheEntry>()
  const minimumHeightAtStart = resolveMinimumTextFitHeight({
    group,
    text,
    width: startDimensions.startWidth,
    padding: constraintPadding,
    measurementCache: previewTextMeasurementCache
  })

  state = {
    startWidth: startDimensions.startWidth,
    startHeight: startDimensions.startHeight,
    startManualBaseWidth: startDimensions.startManualBaseWidth,
    startManualBaseHeight: startDimensions.startManualBaseHeight,
    canScaleWidth: startDimensions.canScaleWidth,
    canScaleHeight: startDimensions.canScaleHeight,
    cannotScaleDownAtStart: minimumHeightAtStart >= startDimensions.startHeight - SHAPE_SCALING_SCALE_EPSILON,
    isProportionalScaling: false,
    blockedScaleAttempt: false,
    startLeft,
    startTop,
    startScaleX,
    startScaleY,
    startTransformOriginX,
    startTransformOriginY,
    startTransformCorner,
    scalingAnchorX: scalingAnchorPoint?.x ?? null,
    scalingAnchorY: scalingAnchorPoint?.y ?? null,
    scalingAnchorOriginX: startTransformOriginX,
    scalingAnchorOriginY: startTransformOriginY,
    crossedOppositeCorner: false,
    lastAllowedFlipX: Boolean(group.flipX),
    lastAllowedFlipY: Boolean(group.flipY),
    lastAllowedScaleX: startScaleX,
    lastAllowedScaleY: startScaleY,
    lastAllowedLeft: startLeft,
    lastAllowedTop: startTop,
    scaleDirectionX: null,
    scaleDirectionY: null,
    fixedWidthMinimumTextFitHeight: isFixedWidthVerticalScaling ? minimumHeightAtStart : null,
    previewTextMeasurementCache,
    proportionalTextConstraintCache
  }

  scalingState.set(group, state)

  return state
}

/**
 * Возвращает итоговые размеры шага фиксации с учетом осей, которые реально скейлились.
 */
export function resolveShapeScalingCommitDimensions({
  group,
  text,
  constraintPadding,
  startDimensions,
  scaleX,
  scaleY,
  wrapPolicy
}: {
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  startDimensions: ShapeScalingStartDimensions
  scaleX: number
  scaleY: number
  wrapPolicy?: ShapeTextWrapPolicy
}): ShapeScalingCommitDimensions {
  const {
    previewWidth,
    previewHeight
  } = resolveShapeScalingPreviewDimensions({
    group,
    text,
    constraintPadding,
    startDimensions,
    appliedScaleX: scaleX,
    appliedScaleY: scaleY,
    wrapPolicy
  })
  const {
    startWidth,
    startHeight
  } = startDimensions
  const hasWidthChange = Math.abs(previewWidth - startWidth) > SHAPE_SCALING_SIZE_EPSILON
  const hasHeightChange = Math.abs(previewHeight - startHeight) > SHAPE_SCALING_SIZE_EPSILON

  return {
    width: previewWidth,
    height: previewHeight,
    hasWidthChange,
    hasDimensionChange: hasWidthChange || hasHeightChange
  }
}

/**
 * Возвращает, какие ручные базовые размеры нужно сохранить после завершения скейлинга.
 */
function resolveNextManualBaseDimensionsAfterScaling({
  startManualBaseWidth,
  startManualBaseHeight,
  canScaleWidth,
  canScaleHeight,
  finalWidth,
  finalHeight
}: {
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
  finalWidth: number
  finalHeight: number
}): ShapeScalingManualBaseDimensions {
  let nextManualBaseWidth = startManualBaseWidth
  if (canScaleWidth) {
    nextManualBaseWidth = finalWidth
  }

  let nextManualBaseHeight = startManualBaseHeight
  if (canScaleHeight) {
    nextManualBaseHeight = finalHeight
  }

  return {
    width: nextManualBaseWidth,
    height: nextManualBaseHeight
  }
}

/**
 * Применяет уже выбранные resize-размеры к layout шейпа и сбрасывает временный scale.
 */
export function commitResolvedShapeScalingLayout({
  group,
  shape,
  text,
  width,
  height,
  alignH,
  alignV,
  startManualBaseWidth,
  startManualBaseHeight,
  canScaleWidth,
  canScaleHeight,
  hasWidthChange,
  wrapPolicy
}: ShapeScalingLayoutCommit): void {
  const nextManualBaseDimensions = resolveNextManualBaseDimensionsAfterScaling({
    startManualBaseWidth,
    startManualBaseHeight,
    canScaleWidth,
    canScaleHeight,
    finalWidth: width,
    finalHeight: height
  })

  group.shapeManualBaseWidth = nextManualBaseDimensions.width
  group.shapeManualBaseHeight = nextManualBaseDimensions.height

  if (canScaleWidth && hasWidthChange) {
    // Зафиксированное изменение ширины переводит shape в manual width contract.
    group.shapeTextAutoExpand = false
  }

  const userPadding = resolveShapeScalingUserPadding({ group })
  const internalShapeTextInset = resolveShapeScalingInternalTextInset({
    group,
    width,
    height
  })
  const expandShapeHeightToFitText = !canScaleHeight
  const resolveInternalShapeTextInsetForSize = ({ width: nextWidth, height: nextHeight }: {
    width: number
    height: number
  }) => {
    return resolveShapeScalingInternalTextInset({
      group,
      width: nextWidth,
      height: nextHeight
    })
  }

  if (!canScaleWidth && canScaleHeight) {
    applyFixedWidthShapeTextLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      padding: userPadding,
      wrapPolicy,
      internalShapeTextInset,
      expandShapeHeightToFitText,
      resolveInternalShapeTextInset: resolveInternalShapeTextInsetForSize
    })
  } else {
    applyShapeTextLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      padding: userPadding,
      wrapPolicy,
      shapeTextAutoExpandEnabled: group.shapeTextAutoExpand !== false,
      internalShapeTextInset,
      expandShapeHeightToFitText,
      resolveInternalShapeTextInset: resolveInternalShapeTextInsetForSize
    })
  }

  group.shapeReplaceBoxWidth = Math.max(1, width)
  group.shapeReplaceBoxHeight = Math.max(1, height)

  text.set({
    scaleX: 1,
    scaleY: 1
  })

  group.set({
    scaleX: 1,
    scaleY: 1
  })

  group.setCoords()
  text.setCoords()
  shape.setCoords()
}
