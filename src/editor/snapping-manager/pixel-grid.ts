/* eslint-disable no-use-before-define -- Публичные pixel-grid функции держим выше private helpers. */
import {
  FabricImage,
  FabricObject,
  Textbox,
  Transform
} from 'fabric'

import {
  getObjectBounds,
  type ObjectBounds
} from '../utils/geometry'
import { MOVE_SNAP_STEP } from './constants'

/** Допуск сравнения guide с целой пиксельной координатой. */
const SNAP_GUARD_INTEGER_POSITION_EPSILON = 0.01

/** Допуск subpixel-дрейфа active edge вокруг guide после Fabric resize. */
const SNAP_GUARD_POSITION_EPSILON = 0.1

/** Допуск сравнения source display-size с целым пикселем. */
const DISPLAY_SIZE_INTEGER_EPSILON = 0.000001

/** Допуск materialization-дрейфа display-size после snap-плана. */
const SNAP_PLAN_DISPLAY_SIZE_EPSILON = 0.02

/** Допуск сравнения scale source-плоскости с scene-плоскостью. */
const SOURCE_DISPLAY_SCALE_EPSILON = 0.000001

/** Допуск удержания source-scaled crop frame около внутреннего guide после pixel-grid movement. */
const SOURCE_SCALED_GUIDE_HOLD_EPSILON = 1

/** Активное ребро, которое уже было приклеено к guide текущим scaling snap. */
export type ScalingStepSnapGuard = {
  type: 'vertical' | 'horizontal'
  edge: 'left' | 'right' | 'top' | 'bottom'
  position: number
}

/** Кандидат scale после округления display-size к целому пикселю. */
type ScalingStepCandidate = {
  scaleX: number
  scaleY: number
}

/** Положение кандидата относительно snapped guide. */
type ScalingStepCandidateSnapState = 'on-guide' | 'inside' | 'outside'

/** Проверка кандидата относительно snapped guide. */
type ScalingStepCandidateSnapMatch = {
  state: ScalingStepCandidateSnapState
  distance: number
}

/** Fixed anchor, который нужно сохранять во время post-snap округления scale. */
type ScalingStepPlacement = {
  left: number
  top: number
  originX: FabricObject['originX']
  originY: FabricObject['originY']
}

/** Контракт восстановления fixed anchor во время одного шага pixel-grid округления. */
type ScalingStepPlacementPreserver = {
  placement: ScalingStepPlacement
  applyPlacement: (placement: ScalingStepPlacement) => void
}

/** Параметры выбора pixel-scale, который сохраняет активные snap guards. */
type GuardedScalingStepParams = {
  target: FabricObject
  transform?: Transform | null
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  fallbackScale: ScalingStepCandidate
  isUniform: boolean
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}

/** Параметры выбора candidate, который сохраняет active snap guards. */
type GuardedScalingCandidateSelectorParams = {
  target: FabricObject
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  candidates: ScalingStepCandidate[]
  preservePlacement?: ScalingStepPlacementPreserver
  shouldPreferInsideCandidate: boolean
  snapGuards: ScalingStepSnapGuard[]
}

/** Оси scale, которые реально меняются в текущем Fabric transform. */
type ScalingAxisRoundingState = {
  shouldRoundScaleX: boolean
  shouldRoundScaleY: boolean
}

/** Объект, у которого display-size может жить в source-пикселях, а не в scene-пикселях. */
type SourceDisplaySizeTarget = FabricObject & {
  cropSource?: FabricObject | null
  cropSourceScaleX?: number
  cropSourceScaleY?: number
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

/**
 * Возвращает ближайший pixel-scale, который не переносит snapped edge за его guide.
 */
function resolveGuardedScalingStep({
  target,
  transform,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  fallbackScale,
  isUniform,
  preservePlacement,
  snapGuards
}: GuardedScalingStepParams): ScalingStepCandidate {
  if (shouldKeepCurrentIntegerGuideSnap({
    target,
    snapGuards
  })) {
    return {
      scaleX: rawScaleX,
      scaleY: rawScaleY
    }
  }

  const sourceScaledGuideHoldCandidate = resolveSourceScaledGuideHoldCandidate({
    target,
    transform,
    effectiveWidth,
    effectiveHeight,
    preservePlacement,
    snapGuards
  })
  if (sourceScaledGuideHoldCandidate) return sourceScaledGuideHoldCandidate

  const candidates = collectScalingStepCandidates({
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    isUniform
  })
  const shouldPreferInsideCandidate = shouldPreferInsideScalingCandidate({
    target,
    snapGuards
  })

  const guardedCandidate = selectGuardedScalingCandidate({
    target,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    candidates,
    preservePlacement,
    shouldPreferInsideCandidate,
    snapGuards
  })

  return guardedCandidate ?? fallbackScale
}

/**
 * Возвращает scale со старта Fabric transform, если crop frame уже удерживался у внутреннего source guide.
 */
function resolveSourceScaledGuideHoldCandidate({
  target,
  transform,
  effectiveWidth,
  effectiveHeight,
  preservePlacement,
  snapGuards
}: {
  target: FabricObject
  transform?: Transform | null
  effectiveWidth: number
  effectiveHeight: number
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}): ScalingStepCandidate | null {
  if (!shouldPreferInsideScalingCandidate({ target, snapGuards })) return null

  const {
    scaleX,
    scaleY
  } = transform?.original ?? {}
  if (typeof scaleX !== 'number' || typeof scaleY !== 'number') return null
  if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return null

  const candidate = {
    scaleX,
    scaleY
  }
  const isNearGuide = isScalingCandidateNearSnapGuards({
    target,
    candidate,
    preservePlacement,
    snapGuards
  })
  const isInsideSourceGuideLimit = isScalingCandidateInsideSourceGuideDisplayLimits({
    target,
    candidate,
    effectiveWidth,
    effectiveHeight,
    snapGuards
  })

  if (!isNearGuide) return null
  if (!isInsideSourceGuideLimit) return null

  return candidate
}

/**
 * Проверяет, что candidate остаётся около guide, от которого уже удерживался scale.
 */
function isScalingCandidateNearSnapGuards({
  target,
  candidate,
  preservePlacement,
  snapGuards
}: {
  target: FabricObject
  candidate: ScalingStepCandidate
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  const bounds = readScalingStepCandidateBounds({
    target,
    candidate,
    preservePlacement
  })
  if (!bounds) return false

  for (const snapGuard of snapGuards) {
    const distance = getObjectBoundsSnapGuardDistance({
      bounds,
      snapGuard
    })
    if (distance > SOURCE_SCALED_GUIDE_HOLD_EPSILON) return false
  }

  return true
}

/**
 * Проверяет, что удерживаемый display-size не выходит за source-часть по внутреннюю сторону guide.
 */
function isScalingCandidateInsideSourceGuideDisplayLimits({
  target,
  candidate,
  effectiveWidth,
  effectiveHeight,
  snapGuards
}: {
  target: FabricObject
  candidate: ScalingStepCandidate
  effectiveWidth: number
  effectiveHeight: number
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  for (const snapGuard of snapGuards) {
    const displaySize = snapGuard.type === 'vertical'
      ? Math.abs(candidate.scaleX) * effectiveWidth
      : Math.abs(candidate.scaleY) * effectiveHeight
    if (!isInsideSourceGuideDisplayLimit({
      target,
      displaySize,
      snapGuard
    })) return false
  }

  return true
}

/**
 * Выбирает candidate, который остаётся внутри active snap guards.
 */
function selectGuardedScalingCandidate({
  target,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  candidates,
  preservePlacement,
  shouldPreferInsideCandidate,
  snapGuards
}: GuardedScalingCandidateSelectorParams): ScalingStepCandidate | null {
  let onGuideCandidate: ScalingStepCandidate | null = null
  let insideCandidate: ScalingStepCandidate | null = null
  let insideCandidateDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const snapMatch = resolveScalingStepCandidateSnapMatch({
      target,
      candidate,
      preservePlacement,
      snapGuards
    })

    if (snapMatch.state === 'on-guide') {
      if (!shouldPreferInsideCandidate) return candidate

      if (!onGuideCandidate) {
        onGuideCandidate = candidate
      }
    }
    if (snapMatch.state === 'inside') {
      if (!shouldPreferInsideCandidate && !insideCandidate) {
        insideCandidate = candidate
      }
      if (shouldPreferInsideCandidate && snapMatch.distance < insideCandidateDistance) {
        insideCandidate = candidate
        insideCandidateDistance = snapMatch.distance
      }
    }
  }

  if (onGuideCandidate && shouldKeepOnGuideScalingCandidate({
    target,
    candidate: onGuideCandidate,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    snapGuards
  })) return onGuideCandidate

  if (insideCandidate) return insideCandidate
  if (onGuideCandidate) return onGuideCandidate

  return null
}

/**
 * Оставляет on-guide candidate, если активные source display-оси уже попали в целый пиксель.
 */
function shouldKeepOnGuideScalingCandidate({
  target,
  candidate,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  snapGuards
}: {
  target: FabricObject
  candidate: ScalingStepCandidate
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  for (const snapGuard of snapGuards) {
    const displaySize = snapGuard.type === 'vertical'
      ? Math.abs(candidate.scaleX) * effectiveWidth
      : Math.abs(candidate.scaleY) * effectiveHeight
    const rawDisplaySize = snapGuard.type === 'vertical'
      ? Math.abs(rawScaleX) * effectiveWidth
      : Math.abs(rawScaleY) * effectiveHeight

    if (!isIntegerDisplaySize({ displaySize })) return false
    if (!isSameSnappedDisplaySize({
      displaySize,
      rawDisplaySize
    })) return false
    if (!isInsideSourceGuideDisplayLimit({
      target,
      displaySize,
      snapGuard
    })) return false
  }

  return true
}

/**
 * Проверяет, что source display-size уже совпадает с целым пикселем.
 */
function isIntegerDisplaySize({ displaySize }: { displaySize: number }): boolean {
  const integerSize = Math.round(displaySize)

  return Math.abs(displaySize - integerSize) <= DISPLAY_SIZE_INTEGER_EPSILON
}

/**
 * Проверяет, что on-guide candidate не увеличивает source display-size, а только убирает float-дрейф.
 */
function isSameSnappedDisplaySize({
  displaySize,
  rawDisplaySize
}: {
  displaySize: number
  rawDisplaySize: number
}): boolean {
  return Math.abs(displaySize - rawDisplaySize) <= SNAP_PLAN_DISPLAY_SIZE_EPSILON
}

/**
 * Проверяет, что on-guide candidate не стал больше source-части, внутри которой удерживается crop frame.
 */
function isInsideSourceGuideDisplayLimit({
  target,
  displaySize,
  snapGuard
}: {
  target: FabricObject
  displaySize: number
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const sourceDisplayLimit = resolveSourceGuideDisplayLimit({
    target,
    snapGuard
  })
  if (sourceDisplayLimit === null) return false

  return Math.round(displaySize) <= sourceDisplayLimit
}

/**
 * Возвращает максимальный source display-size для части source по внутреннюю сторону guide.
 */
function resolveSourceGuideDisplayLimit({
  target,
  snapGuard
}: {
  target: FabricObject
  snapGuard: ScalingStepSnapGuard
}): number | null {
  const displayTarget = target as SourceDisplaySizeTarget
  const { cropSource } = displayTarget
  if (!cropSource) return null

  const sourceBounds = getObjectBounds({ object: cropSource })
  if (!sourceBounds) return null

  const sourceScale = snapGuard.type === 'vertical'
    ? Math.abs(displayTarget.cropSourceScaleX ?? 1)
    : Math.abs(displayTarget.cropSourceScaleY ?? 1)
  if (!Number.isFinite(sourceScale) || sourceScale <= 0) return null

  const sceneLength = getSourceGuideSceneLength({
    sourceBounds,
    snapGuard
  })
  if (!Number.isFinite(sceneLength) || sceneLength <= 0) return null

  return Math.floor((sceneLength / sourceScale) + DISPLAY_SIZE_INTEGER_EPSILON)
}

/**
 * Возвращает scene-длину между внутренним guide и внешней границей source по стороне crop frame.
 */
function getSourceGuideSceneLength({
  sourceBounds,
  snapGuard
}: {
  sourceBounds: ObjectBounds
  snapGuard: ScalingStepSnapGuard
}): number {
  const { edge, position } = snapGuard

  if (edge === 'left') return sourceBounds.right - position
  if (edge === 'right') return position - sourceBounds.left
  if (edge === 'top') return sourceBounds.bottom - position

  return position - sourceBounds.top
}

/**
 * Возвращает true, если source-scaled display-size нужно удерживать внутри guide при округлении.
 * Для внешней границы source приоритет остаётся у on-guide candidate, чтобы snap не съедал 1px.
 */
function shouldPreferInsideScalingCandidate({
  target,
  snapGuards
}: {
  target: FabricObject
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  if (!usesScaledDisplaySizeForSnapGuards({ target, snapGuards })) return false

  return !usesSourceBoundarySnapGuards({ target, snapGuards })
}

/**
 * Возвращает true, если raw scale уже удерживает edge на integer guide
 * и display-size объекта живёт в той же pixel-плоскости, что и сам guide.
 */
function shouldKeepCurrentIntegerGuideSnap({
  target,
  snapGuards
}: {
  target: FabricObject
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  if (usesScaledDisplaySizeForSnapGuards({ target, snapGuards })) return false

  const bounds = getObjectBounds({ object: target })
  if (!bounds) return false

  for (const snapGuard of snapGuards) {
    if (!isSnapGuardPositionPixelAligned({ snapGuard })) return false
    if (!isObjectBoundsOnSnapGuide({ bounds, snapGuard })) return false
    if (!hasValidRoundedBoundsSize({ bounds, snapGuard })) return false
  }

  return true
}

/**
 * Возвращает true, если active snap axis показывает размер в source-пикселях с отдельным scale.
 */
function usesScaledDisplaySizeForSnapGuards({
  target,
  snapGuards
}: {
  target: FabricObject
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  if (typeof target.getObjectDisplaySize !== 'function') return false

  const displayTarget = target as SourceDisplaySizeTarget
  const usesScaledX = snapGuards.some((snapGuard) => {
    return snapGuard.type === 'vertical' && !isSceneDisplayScale({
      scale: displayTarget.cropSourceScaleX
    })
  })
  const usesScaledY = snapGuards.some((snapGuard) => {
    return snapGuard.type === 'horizontal' && !isSceneDisplayScale({
      scale: displayTarget.cropSourceScaleY
    })
  })

  return usesScaledX || usesScaledY
}

/**
 * Возвращает true, если хотя бы один active snap guard приклеен к внешней границе crop source.
 */
function usesSourceBoundarySnapGuards({
  target,
  snapGuards
}: {
  target: FabricObject
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  const displayTarget = target as SourceDisplaySizeTarget
  const { cropSource } = displayTarget
  if (!cropSource) return false

  const sourceBounds = getObjectBounds({ object: cropSource })
  if (!sourceBounds) return false

  return snapGuards.some((snapGuard) => {
    return isSnapGuardAtSourceBoundary({
      snapGuard,
      sourceBounds
    })
  })
}

/**
 * Проверяет, совпадает ли snap guard с соответствующей внешней границей crop source.
 */
function isSnapGuardAtSourceBoundary({
  snapGuard,
  sourceBounds
}: {
  snapGuard: ScalingStepSnapGuard
  sourceBounds: ObjectBounds
}): boolean {
  const { edge, position } = snapGuard
  let boundary = sourceBounds.bottom

  if (edge === 'left') boundary = sourceBounds.left
  if (edge === 'right') boundary = sourceBounds.right
  if (edge === 'top') boundary = sourceBounds.top

  return isCloseToSourceBoundary({
    position,
    boundary
  })
}

/**
 * Сравнивает guide с source-boundary в той же scene-плоскости.
 */
function isCloseToSourceBoundary({
  position,
  boundary
}: {
  position: number
  boundary: number
}): boolean {
  return Math.abs(position - boundary) <= SNAP_GUARD_POSITION_EPSILON
}

/**
 * Возвращает true, если display-size axis совпадает со scene pixel axis.
 */
function isSceneDisplayScale({ scale }: { scale?: number }): boolean {
  const safeScale = Math.abs(scale ?? 1)

  return Math.abs(safeScale - 1) <= SOURCE_DISPLAY_SCALE_EPSILON
}

/**
 * Проверяет, что guide находится на целой пиксельной координате.
 */
function isSnapGuardPositionPixelAligned({
  snapGuard
}: {
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const integerPosition = Math.round(snapGuard.position)

  return Math.abs(snapGuard.position - integerPosition) <= SNAP_GUARD_INTEGER_POSITION_EPSILON
}

/**
 * Проверяет, что фактический bounds-size по оси snapped edge можно показать как валидный пиксельный размер.
 */
function hasValidRoundedBoundsSize({
  bounds,
  snapGuard
}: {
  bounds: ObjectBounds
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const boundsSize = snapGuard.type === 'vertical'
    ? bounds.right - bounds.left
    : bounds.bottom - bounds.top

  if (!Number.isFinite(boundsSize) || boundsSize <= 0) return false

  return Math.round(boundsSize) > 0
}

/**
 * Собирает кандидаты округления scale, начиная с ближайших к текущему raw-scale.
 */
function collectScalingStepCandidates({
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  isUniform
}: {
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  isUniform: boolean
}): ScalingStepCandidate[] {
  const scaleXCandidates = collectAxisScaleCandidates({
    rawScale: rawScaleX,
    effectiveSize: effectiveWidth
  })
  const scaleYCandidates = collectAxisScaleCandidates({
    rawScale: rawScaleY,
    effectiveSize: effectiveHeight
  })

  if (isUniform) {
    return collectUniformScaleCandidates({
      scaleXCandidates,
      scaleYCandidates,
      rawScale: rawScaleX
    })
  }

  return collectAxisScaleCandidatePairs({
    scaleXCandidates,
    scaleYCandidates,
    rawScaleX,
    rawScaleY
  })
}

/**
 * Собирает scale-кандидаты одной оси через текущий display-size и соседние пиксельные размеры.
 */
function collectAxisScaleCandidates({
  rawScale,
  effectiveSize
}: {
  rawScale: number
  effectiveSize: number
}): number[] {
  if (effectiveSize <= 0) return [rawScale]

  const scaleSign = rawScale < 0 ? -1 : 1
  const rawDisplaySize = Math.abs(rawScale) * effectiveSize
  const roundedDisplaySize = Math.round(rawDisplaySize)
  const floorDisplaySize = Math.floor(rawDisplaySize)
  const ceilDisplaySize = Math.ceil(rawDisplaySize)
  const displaySizes = [
    roundedDisplaySize,
    floorDisplaySize,
    ceilDisplaySize,
    floorDisplaySize - 1,
    ceilDisplaySize + 1
  ]
  const candidates: number[] = []

  for (const displaySize of displaySizes) {
    const safeDisplaySize = Math.max(1, displaySize)
    addUniqueScaleCandidate({
      candidates,
      scale: (safeDisplaySize / effectiveSize) * scaleSign
    })
  }

  candidates.sort((first, second) => {
    return Math.abs(first - rawScale) - Math.abs(second - rawScale)
  })

  return candidates
}

/**
 * Добавляет scale-кандидат без дублей от совпадающих display-size кандидатов.
 */
function addUniqueScaleCandidate({
  candidates,
  scale
}: {
  candidates: number[]
  scale: number
}): void {
  if (!Number.isFinite(scale)) return
  if (candidates.includes(scale)) return

  candidates.push(scale)
}

/**
 * Собирает uniform scale-кандидаты из обеих осей.
 */
function collectUniformScaleCandidates({
  scaleXCandidates,
  scaleYCandidates,
  rawScale
}: {
  scaleXCandidates: number[]
  scaleYCandidates: number[]
  rawScale: number
}): ScalingStepCandidate[] {
  const scaleCandidates = [...scaleXCandidates]

  for (const scale of scaleYCandidates) {
    addUniqueScaleCandidate({
      candidates: scaleCandidates,
      scale
    })
  }

  scaleCandidates.sort((first, second) => {
    return Math.abs(first - rawScale) - Math.abs(second - rawScale)
  })

  return scaleCandidates.map((scale) => ({
    scaleX: scale,
    scaleY: scale
  }))
}

/**
 * Собирает пары scale-кандидатов для независимого scaling по осям.
 */
function collectAxisScaleCandidatePairs({
  scaleXCandidates,
  scaleYCandidates,
  rawScaleX,
  rawScaleY
}: {
  scaleXCandidates: number[]
  scaleYCandidates: number[]
  rawScaleX: number
  rawScaleY: number
}): ScalingStepCandidate[] {
  const candidates: ScalingStepCandidate[] = []

  for (const scaleX of scaleXCandidates) {
    for (const scaleY of scaleYCandidates) {
      candidates.push({ scaleX, scaleY })
    }
  }

  candidates.sort((first, second) => {
    const firstError = Math.abs(first.scaleX - rawScaleX) + Math.abs(first.scaleY - rawScaleY)
    const secondError = Math.abs(second.scaleX - rawScaleX) + Math.abs(second.scaleY - rawScaleY)

    return firstError - secondError
  })

  return candidates
}

/**
 * Проверяет rounded scale относительно snapped guide.
 */
function resolveScalingStepCandidateSnapMatch({
  target,
  candidate,
  preservePlacement,
  snapGuards
}: {
  target: FabricObject
  candidate: ScalingStepCandidate
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}): ScalingStepCandidateSnapMatch {
  const bounds = readScalingStepCandidateBounds({
    target,
    candidate,
    preservePlacement
  })

  if (!bounds) {
    return {
      state: 'outside',
      distance: Number.POSITIVE_INFINITY
    }
  }

  return resolveBoundsSnapMatch({
    bounds,
    snapGuards
  })
}

/**
 * Читает bounds candidate, временно применяя scale и возвращая target в исходное состояние.
 */
function readScalingStepCandidateBounds({
  target,
  candidate,
  preservePlacement
}: {
  target: FabricObject
  candidate: ScalingStepCandidate
  preservePlacement?: ScalingStepPlacementPreserver
}): ObjectBounds | null {
  const originalScaleX = target.scaleX ?? 1
  const originalScaleY = target.scaleY ?? 1
  let bounds: ObjectBounds | null = null

  try {
    target.set({
      scaleX: candidate.scaleX,
      scaleY: candidate.scaleY
    })

    if (preservePlacement) {
      preservePlacement.applyPlacement(preservePlacement.placement)
    } else {
      target.setCoords()
    }

    bounds = getObjectBounds({ object: target })
  } finally {
    target.set({
      scaleX: originalScaleX,
      scaleY: originalScaleY
    })

    if (preservePlacement) {
      preservePlacement.applyPlacement(preservePlacement.placement)
    } else {
      target.setCoords()
    }
  }

  return bounds
}

/**
 * Проверяет candidate bounds относительно всех active snap guards.
 */
function resolveBoundsSnapMatch({
  bounds,
  snapGuards
}: {
  bounds: ObjectBounds
  snapGuards: ScalingStepSnapGuard[]
}): ScalingStepCandidateSnapMatch {
  let isOnGuide = true
  let distance = 0
  for (const snapGuard of snapGuards) {
    if (!isObjectBoundsInsideSnapGuard({ bounds, snapGuard })) {
      return {
        state: 'outside',
        distance: Number.POSITIVE_INFINITY
      }
    }
    if (!isObjectBoundsOnSnapGuide({ bounds, snapGuard })) {
      isOnGuide = false
    }

    distance = Math.max(
      distance,
      getObjectBoundsSnapGuardDistance({
        bounds,
        snapGuard
      })
    )
  }

  return {
    state: isOnGuide ? 'on-guide' : 'inside',
    distance
  }
}

/**
 * Возвращает расстояние active edge кандидата до guide.
 */
function getObjectBoundsSnapGuardDistance({
  bounds,
  snapGuard
}: {
  bounds: ObjectBounds
  snapGuard: ScalingStepSnapGuard
}): number {
  const { edge, position } = snapGuard

  if (edge === 'left') return Math.abs(bounds.left - position)
  if (edge === 'right') return Math.abs(bounds.right - position)
  if (edge === 'top') return Math.abs(bounds.top - position)

  return Math.abs(bounds.bottom - position)
}

/**
 * Проверяет одно активное ребро относительно guide после округления.
 */
function isObjectBoundsInsideSnapGuard({
  bounds,
  snapGuard
}: {
  bounds: ObjectBounds
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const { edge, position } = snapGuard

  if (edge === 'left') return bounds.left >= position - SNAP_GUARD_POSITION_EPSILON
  if (edge === 'right') return bounds.right <= position + SNAP_GUARD_POSITION_EPSILON
  if (edge === 'top') return bounds.top >= position - SNAP_GUARD_POSITION_EPSILON

  return bounds.bottom <= position + SNAP_GUARD_POSITION_EPSILON
}

/**
 * Проверяет, стоит ли active edge ровно на guide после округления.
 */
function isObjectBoundsOnSnapGuide({
  bounds,
  snapGuard
}: {
  bounds: ObjectBounds
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const { edge, position } = snapGuard

  if (edge === 'left') return Math.abs(bounds.left - position) <= SNAP_GUARD_POSITION_EPSILON
  if (edge === 'right') return Math.abs(bounds.right - position) <= SNAP_GUARD_POSITION_EPSILON
  if (edge === 'top') return Math.abs(bounds.top - position) <= SNAP_GUARD_POSITION_EPSILON

  return Math.abs(bounds.bottom - position) <= SNAP_GUARD_POSITION_EPSILON
}
