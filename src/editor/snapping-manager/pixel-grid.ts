/* eslint-disable no-use-before-define -- Публичные pixel-grid функции держим выше private helpers. */
import {
  FabricImage,
  FabricObject,
  Textbox,
  Transform
} from 'fabric'

import {
  resolveGuardedScalingStep,
  type ScalingStepCandidate,
  type ScalingStepPlacementPreserver,
  type ScalingStepSnapGuard
} from './scaling-step-snap-guards'
import { MOVE_SNAP_STEP } from './constants'

export type { ScalingStepSnapGuard } from './scaling-step-snap-guards'

/** Оси scale, которые реально меняются в текущем Fabric transform. */
type ScalingAxisRoundingState = {
  shouldRoundScaleX: boolean
  shouldRoundScaleY: boolean
}

/**
 * Возвращает true, если live-scaling объекта нужно округлять до целого пиксельного размера.
 * Для изображений и текста сохраняем их собственный runtime-контракт без дополнительной квантизации.
 */
export function shouldApplyPixelScalingStep({ target }: { target: FabricObject }): boolean {
  const targetType = typeof target.type === 'string' ? target.type.toLowerCase() : ''
  const isTextTarget = target instanceof Textbox
    || targetType === 'textbox'
    || targetType === 'background-textbox'

  return !(target instanceof FabricImage) && !isTextTarget
}

/**
 * Применяет шаг перемещения, округляя координаты объекта к сетке MOVE_SNAP_STEP.
 */
export function applyMovementStep({
  target,
  transform
}: {
  target: FabricObject
  transform?: Transform | null
}): void {
  const { left = 0, top = 0 } = target
  const snappedLeft = Math.round(left / MOVE_SNAP_STEP) * MOVE_SNAP_STEP
  const snappedTop = Math.round(top / MOVE_SNAP_STEP) * MOVE_SNAP_STEP
  const originalLeft = typeof transform?.original?.left === 'number'
    ? transform.original.left
    : null
  const originalTop = typeof transform?.original?.top === 'number'
    ? transform.original.top
    : null
  const shouldSnapX = originalLeft === null || originalLeft !== left
  const shouldSnapY = originalTop === null || originalTop !== top
  const updates: Partial<Record<'left' | 'top', number>> = {}

  if (shouldSnapX && snappedLeft !== left) {
    updates.left = snappedLeft
  }

  if (shouldSnapY && snappedTop !== top) {
    updates.top = snappedTop
  }

  if (!('left' in updates) && !('top' in updates)) return

  target.set(updates)
  target.setCoords()
}

/**
 * Возвращает эффективные размеры текстового объекта без масштаба.
 */
function resolveTextboxDimensions({ target }: { target: Textbox }): { width: number; height: number } {
  const {
    width = 0,
    height = 0,
    paddingTop = 0,
    paddingRight = 0,
    paddingBottom = 0,
    paddingLeft = 0,
    strokeWidth = 0
  } = target

  return {
    width: width + paddingLeft + paddingRight + strokeWidth,
    height: height + paddingTop + paddingBottom + strokeWidth
  }
}

/**
 * Возвращает базовые размеры из доменного display-size, если объект сам определяет такую геометрию.
 */
function resolveDisplaySizeDimensions({
  target,
  scaleX,
  scaleY
}: {
  target: FabricObject
  scaleX: number
  scaleY: number
}): { width: number; height: number } | null {
  const displaySize = target.getObjectDisplaySize?.()
  if (!displaySize) return null

  const absScaleX = Math.abs(scaleX)
  const absScaleY = Math.abs(scaleY)
  if (absScaleX <= 0 || absScaleY <= 0) return null
  if (!Number.isFinite(displaySize.width) || !Number.isFinite(displaySize.height)) return null
  if (displaySize.width <= 0 || displaySize.height <= 0) return null

  return {
    width: displaySize.width / absScaleX,
    height: displaySize.height / absScaleY
  }
}

/**
 * Возвращает эффективные размеры объекта без масштаба.
 */
function resolveEffectiveDimensions({
  target,
  scaleX,
  scaleY
}: {
  target: FabricObject
  scaleX: number
  scaleY: number
}): { width: number; height: number } {
  const displayDimensions = resolveDisplaySizeDimensions({
    target,
    scaleX,
    scaleY
  })
  if (displayDimensions) return displayDimensions

  if (target instanceof Textbox) {
    return resolveTextboxDimensions({ target })
  }

  const {
    width = 0,
    height = 0,
    strokeWidth = 0,
    strokeUniform = false
  } = target
  const strokeContribution = strokeUniform ? 0 : strokeWidth

  return {
    width: width + strokeContribution,
    height: height + strokeContribution
  }
}

/**
 * Округляет масштаб объекта так, чтобы его измеряемый размер в пикселях был целым числом.
 */
export function applyScalingStep({
  target,
  transform,
  preservePlacement,
  snapGuards = []
}: {
  target: FabricObject
  transform?: Transform | null
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards?: ScalingStepSnapGuard[]
}): void {
  const {
    scaleX: rawScaleX = 1,
    scaleY: rawScaleY = 1
  } = target

  const roundingState = resolveScalingAxisRoundingState({
    transform,
    rawScaleX,
    rawScaleY
  })
  if (!roundingState.shouldRoundScaleX && !roundingState.shouldRoundScaleY) return

  const { width: effectiveWidth, height: effectiveHeight } = resolveEffectiveDimensions({
    target,
    scaleX: rawScaleX,
    scaleY: rawScaleY
  })
  const snappedScale = resolveSnappedScalingStep({
    target,
    transform,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    preservePlacement,
    snapGuards
  })
  const nextScale = resolveScaleForRoundedAxes({
    rawScaleX,
    rawScaleY,
    snappedScale,
    roundingState
  })

  const isAlreadySnapped = nextScale.scaleX === rawScaleX && nextScale.scaleY === rawScaleY

  if (isAlreadySnapped) return

  applyResolvedScalingStep({
    target,
    transform,
    preservePlacement,
    scale: nextScale
  })
}

/**
 * Возвращает оси, которые можно округлять в текущем scaling-step.
 */
function resolveScalingAxisRoundingState({
  transform,
  rawScaleX,
  rawScaleY
}: {
  transform?: Transform | null
  rawScaleX: number
  rawScaleY: number
}): ScalingAxisRoundingState {
  return {
    shouldRoundScaleX: shouldRoundScalingAxis({
      transform,
      axis: 'x',
      rawScale: rawScaleX
    }),
    shouldRoundScaleY: shouldRoundScalingAxis({
      transform,
      axis: 'y',
      rawScale: rawScaleY
    })
  }
}

/**
 * Оставляет raw scale на осях, которые Fabric transform не менял в этом шаге.
 */
function resolveScaleForRoundedAxes({
  rawScaleX,
  rawScaleY,
  snappedScale,
  roundingState
}: {
  rawScaleX: number
  rawScaleY: number
  snappedScale: ScalingStepCandidate
  roundingState: ScalingAxisRoundingState
}): ScalingStepCandidate {
  const nextScale = {
    ...snappedScale
  }

  if (!roundingState.shouldRoundScaleX) {
    nextScale.scaleX = rawScaleX
  }
  if (!roundingState.shouldRoundScaleY) {
    nextScale.scaleY = rawScaleY
  }

  return nextScale
}

/**
 * Применяет округлённый scale к Fabric target, transform и fixed placement.
 */
function applyResolvedScalingStep({
  target,
  transform,
  preservePlacement,
  scale
}: {
  target: FabricObject
  transform?: Transform | null
  preservePlacement?: ScalingStepPlacementPreserver
  scale: ScalingStepCandidate
}): void {
  target.set({
    scaleX: scale.scaleX,
    scaleY: scale.scaleY
  })

  if (preservePlacement) {
    preservePlacement.applyPlacement(preservePlacement.placement)
  }

  if (transform) {
    transform.scaleX = scale.scaleX
    transform.scaleY = scale.scaleY
  }

  target.setCoords()
}

/**
 * Возвращает true, если scale по оси реально изменился в текущем Fabric transform.
 */
function shouldRoundScalingAxis({
  transform,
  axis,
  rawScale
}: {
  transform?: Transform | null
  axis: 'x' | 'y'
  rawScale: number
}): boolean {
  if (!transform) return true

  const originalScale = axis === 'x'
    ? transform.original?.scaleX
    : transform.original?.scaleY
  if (typeof originalScale !== 'number') return true

  return originalScale !== rawScale
}

/**
 * Возвращает итоговый scale после pixel-rounding и ограничений активных snap-guide.
 */
function resolveSnappedScalingStep({
  target,
  transform,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  preservePlacement,
  snapGuards
}: {
  target: FabricObject
  transform?: Transform | null
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}): ScalingStepCandidate {
  const roundedScale = resolveRoundedScalingStep({
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight
  })

  if (snapGuards.length === 0) return roundedScale

  return resolveGuardedScalingStep({
    target,
    transform,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    fallbackScale: roundedScale,
    isUniform: rawScaleX === rawScaleY,
    preservePlacement,
    snapGuards
  })
}

/**
 * Возвращает ближайший scale, при котором display-size объекта становится целым.
 */
function resolveRoundedScalingStep({
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight
}: {
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
}): ScalingStepCandidate {
  if (rawScaleX === rawScaleY) {
    return resolveRoundedUniformScalingStep({
      rawScale: rawScaleX,
      effectiveWidth,
      effectiveHeight
    })
  }

  return {
    scaleX: resolveRoundedAxisScale({
      rawScale: rawScaleX,
      effectiveSize: effectiveWidth
    }),
    scaleY: resolveRoundedAxisScale({
      rawScale: rawScaleY,
      effectiveSize: effectiveHeight
    })
  }
}

/**
 * Возвращает uniform scale по той оси, где округление меньше двигает текущий scale.
 */
function resolveRoundedUniformScalingStep({
  rawScale,
  effectiveWidth,
  effectiveHeight
}: {
  rawScale: number
  effectiveWidth: number
  effectiveHeight: number
}): ScalingStepCandidate {
  const candidateFromWidth = resolveRoundedAxisScale({
    rawScale,
    effectiveSize: effectiveWidth
  })
  const candidateFromHeight = resolveRoundedAxisScale({
    rawScale,
    effectiveSize: effectiveHeight
  })
  const widthError = Math.abs(candidateFromWidth - rawScale)
  const heightError = Math.abs(candidateFromHeight - rawScale)
  const scale = widthError <= heightError ? candidateFromWidth : candidateFromHeight

  return {
    scaleX: scale,
    scaleY: scale
  }
}

/**
 * Возвращает scale одной оси для ближайшего целого display-size.
 */
function resolveRoundedAxisScale({
  rawScale,
  effectiveSize
}: {
  rawScale: number
  effectiveSize: number
}): number {
  if (effectiveSize <= 0) return rawScale

  return Math.max(1, Math.round(effectiveSize * rawScale)) / effectiveSize
}
