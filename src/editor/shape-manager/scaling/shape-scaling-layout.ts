import type { Transform } from 'fabric'
import {
  applyShapeTextLayout,
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
} from '../shape-presets'
import type {
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapeScalingState,
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

export const SHAPE_SCALING_MIN_SIZE = 1

export const SHAPE_SCALING_SCALE_EPSILON = 0.0001
export const SHAPE_SCALING_SIZE_EPSILON = 0.5

export type ShapeScalingPointerEvent = Event | MouseEvent | PointerEvent | TouchEvent

export type ShapeScalingStartDimensions = {
  startWidth: number
  startHeight: number
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
}

export type ShapeScalingCommitDimensions = {
  width: number
  height: number
  hasWidthChange: boolean
  hasDimensionChange: boolean
}

type ShapeScalingManualBaseDimensions = {
  width: number
  height: number
}

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
}

type ShapePreviewDimensions = {
  previewWidth: number
  previewHeight: number
}

type ShapePreviewLayout = ResolvedShapeTextLayout

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
 * Возвращает минимальную высоту shape, достаточную для размещения текста при переданной ширине.
 */
export function resolveMinimumTextFitHeight({
  group,
  text,
  width,
  padding
}: {
  group: ShapeGroup
  text: ShapeTextNode
  width: number
  padding: ShapePadding
}): number {
  return resolveRequiredShapeHeightForText({
    text,
    width,
    height: SHAPE_SCALING_MIN_SIZE,
    padding,
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
  minimumHeight
}: {
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  startDimensions: ShapeScalingStartDimensions
  appliedScaleX: number
  appliedScaleY: number
  minimumHeight?: number | null
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

  return resolveShapeTextFixedWidthLayout({
    text,
    width: previewWidth,
    height: initialPreviewHeight,
    alignV: group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
    padding: resolveShapeScalingUserPadding({ group }),
    expandShapeHeightToFitText,
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
  const minimumHeightAtStart = resolveMinimumTextFitHeight({
    group,
    text,
    width: startDimensions.startWidth,
    padding: constraintPadding
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
    lastAllowedTop: startTop
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
  scaleY
}: {
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  startDimensions: ShapeScalingStartDimensions
  scaleX: number
  scaleY: number
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
    appliedScaleY: scaleY
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
  hasWidthChange
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
    // Ручной resize по ширине фиксирует новую ширину как пользовательский контракт.
    group.shapeTextAutoExpand = false
  }

  const userPadding = resolveShapeScalingUserPadding({ group })
  const internalShapeTextInset = resolveShapeScalingInternalTextInset({
    group,
    width,
    height
  })
  const expandShapeHeightToFitText = !canScaleHeight

  applyShapeTextLayout({
    group,
    shape,
    text,
    width,
    height,
    alignH,
    alignV,
    padding: userPadding,
    shapeTextAutoExpandEnabled: group.shapeTextAutoExpand !== false,
    internalShapeTextInset,
    expandShapeHeightToFitText,
    resolveInternalShapeTextInset: ({ width: nextWidth, height: nextHeight }) => {
      return resolveShapeScalingInternalTextInset({
        group,
        width: nextWidth,
        height: nextHeight
      })
    }
  })

  group.shapeReplaceBoxWidth = Math.max(1, group.shapeBaseWidth ?? width)
  group.shapeReplaceBoxHeight = Math.max(1, group.shapeBaseHeight ?? height)

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
