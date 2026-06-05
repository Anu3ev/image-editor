/* eslint-disable no-use-before-define -- Публичный resolver держим выше внутренних расчётов. */
import {
  FabricObject,
  Transform
} from 'fabric'

import {
  getObjectBounds,
  getObjectExactBounds,
  type ObjectBounds
} from '../utils/geometry'

/** Допуск сравнения guide с целой пиксельной координатой. */
const SNAP_GUARD_INTEGER_POSITION_EPSILON = 0.01

/** Допуск subpixel-дрейфа active edge вокруг guide после Fabric resize. */
const SNAP_GUARD_POSITION_EPSILON = 0.1

/** Допуск raw source-scaled candidate около дробного guide после округления target bounds. */
const SOURCE_SCALED_RAW_GUIDE_POSITION_EPSILON = 0.5

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
export type ScalingStepCandidate = {
  scaleX: number
  scaleY: number
}

/** Fixed anchor, который нужно сохранять во время post-snap округления scale. */
type ScalingStepPlacement = {
  left: number
  top: number
  originX: FabricObject['originX']
  originY: FabricObject['originY']
}

/** Контракт восстановления fixed anchor во время одного шага pixel-grid округления. */
export type ScalingStepPlacementPreserver = {
  placement: ScalingStepPlacement
  applyPlacement: (placement: ScalingStepPlacement) => void
}

/** Параметры выбора pixel-scale, который сохраняет активные snap guards. */
export type GuardedScalingStepParams = {
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

/** Положение кандидата относительно snapped guide. */
type ScalingStepCandidateSnapState = 'on-guide' | 'inside' | 'outside'

/** Проверка кандидата относительно snapped guide. */
type ScalingStepCandidateSnapMatch = {
  state: ScalingStepCandidateSnapState
  distance: number
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

/** Объект, у которого display-size может жить в source-пикселях, а не в scene-пикселях. */
type SourceDisplaySizeTarget = FabricObject & {
  cropSource?: FabricObject | null
  cropSourceScaleX?: number
  cropSourceScaleY?: number
}

/**
 * Возвращает ближайший pixel-scale, который не переносит snapped edge за его guide.
 */
export function resolveGuardedScalingStep({
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
    effectiveWidth,
    effectiveHeight,
    transform,
    preservePlacement,
    snapGuards
  })
  if (sourceScaledGuideHoldCandidate) return sourceScaledGuideHoldCandidate

  const sourceScaledRawGuideCandidate = resolveSourceScaledRawGuideCandidate({
    target,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    preservePlacement,
    snapGuards
  })
  if (sourceScaledRawGuideCandidate) return sourceScaledRawGuideCandidate

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
 * Возвращает текущий raw scale, если snap-plan уже поставил source-scaled crop frame на внутренний guide.
 * Для внешней source-границы raw scale не подходит: там приоритет у on-guide candidate.
 */
function resolveSourceScaledRawGuideCandidate({
  target,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  preservePlacement,
  snapGuards
}: {
  target: FabricObject
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}): ScalingStepCandidate | null {
  if (!usesScaledDisplaySizeForSnapGuards({ target, snapGuards })) return null
  if (usesSourceBoundarySnapGuards({ target, snapGuards })) return null

  const candidate = {
    scaleX: rawScaleX,
    scaleY: rawScaleY
  }
  const isNearGuide = isScalingCandidateNearSnapGuards({
    target,
    candidate,
    preservePlacement,
    maxDistance: SOURCE_SCALED_RAW_GUIDE_POSITION_EPSILON,
    snapGuards
  })
  if (!isNearGuide) return null
  if (!isScalingCandidateInsideRoundedSourceGuideDisplayLimits({
    target,
    candidate,
    effectiveWidth,
    effectiveHeight,
    snapGuards
  })) return null

  return candidate
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
  maxDistance = SOURCE_SCALED_GUIDE_HOLD_EPSILON,
  snapGuards
}: {
  target: FabricObject
  candidate: ScalingStepCandidate
  preservePlacement?: ScalingStepPlacementPreserver
  maxDistance?: number
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
    if (distance > maxDistance) return false
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
 * Проверяет, что округлённый display-size raw guide не больше округлённой source-части.
 */
function isScalingCandidateInsideRoundedSourceGuideDisplayLimits({
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
    if (!isInsideRoundedSourceGuideDisplayLimit({
      target,
      displaySize,
      snapGuard
    })) return false
  }

  return true
}

/**
 * Проверяет rounded display-size относительно source-части по внутреннюю сторону guide.
 */
function isInsideRoundedSourceGuideDisplayLimit({
  target,
  displaySize,
  snapGuard
}: {
  target: FabricObject
  displaySize: number
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const sourceDisplayLength = resolveSourceGuideDisplayLength({
    target,
    snapGuard
  })
  if (sourceDisplayLength === null) return false

  const roundedSourceDisplayLimit = Math.round(sourceDisplayLength + DISPLAY_SIZE_INTEGER_EPSILON)

  return Math.round(displaySize) <= roundedSourceDisplayLimit
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
 * Возвращает отображаемый source display-size для части source по внутреннюю сторону guide.
 */
function resolveSourceGuideDisplayLimit({
  target,
  snapGuard
}: {
  target: FabricObject
  snapGuard: ScalingStepSnapGuard
}): number | null {
  const sourceDisplayLength = resolveSourceGuideDisplayLength({
    target,
    snapGuard
  })
  if (sourceDisplayLength === null) return null

  return Math.round(sourceDisplayLength + DISPLAY_SIZE_INTEGER_EPSILON)
}

/**
 * Возвращает source display-length для части source по внутреннюю сторону guide.
 */
function resolveSourceGuideDisplayLength({
  target,
  snapGuard
}: {
  target: FabricObject
  snapGuard: ScalingStepSnapGuard
}): number | null {
  const displayTarget = target as SourceDisplaySizeTarget
  const { cropSource } = displayTarget
  if (!cropSource) return null

  const sourceBounds = getObjectExactBounds({ object: cropSource })
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

  return sceneLength / sourceScale
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
