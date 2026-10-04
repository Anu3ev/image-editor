/* eslint-disable no-use-before-define -- Расчёт crop-округления расположен перед внутренними ограничениями. */
import type { Transform } from 'fabric'

import { getObjectBounds, getObjectExactBounds, type ObjectBounds } from '../../utils/geometry'
import {
  collectScalingStepCandidates,
  readScalingStepCandidateBounds,
  resolveScalingStepCandidateSnapMatch,
  selectOnGuideFirstScalingCandidate,
  shouldKeepCurrentGuideSnap,
  type GuardedScalingCandidateMatchParams,
  type GuardedScalingStepParams,
  type ScalingStepCandidate,
  type ScalingStepCandidateSnapMatch,
  type ScalingStepPlacementPreserver
} from '../../snapping-manager/scaling/scaling-step-snap-guards'
import {
  SNAP_GUARD_POSITION_EPSILON,
  getBoundsSnapGuardDistance,
  type ScalingStepSnapGuard
} from '../../snapping-manager/scaling/scaling-snap-guard'
import type { CropFrame } from '../domain/crop-frame'

/** Допуск удержания crop-рамки около направляющей, с которой начался прежний resize. */
export const SOURCE_SCALED_GUIDE_HOLD_EPSILON = 1

/** Округление crop в пикселях источника с учётом исходного масштаба жеста. */
interface CropGuardedScalingStepParams extends GuardedScalingStepParams {
  target: CropFrame
  transform?: Transform | null
}

/** Допуск текущего scale около дробного guide после округления bounds. */
const SOURCE_SCALED_RAW_GUIDE_POSITION_EPSILON = 0.5

/** Допуск сравнения размера в исходном изображении с целым пикселем. */
const DISPLAY_SIZE_INTEGER_EPSILON = 0.000001

/** Допуск дрейфа размера после применения resize-плана. */
const SNAP_PLAN_DISPLAY_SIZE_EPSILON = 0.02

/** Допуск сравнения scale исходного изображения с scale canvas. */
const SOURCE_DISPLAY_SCALE_EPSILON = 0.000001

/** Параметры выбора кандидата, который сохраняет активные guide. */
interface GuardedScalingCandidateSelectorParams extends GuardedScalingCandidateMatchParams {
  target: CropFrame
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  shouldPreferInsideCandidate: boolean
}

/** Параметры проверки scale, который уже удерживает грань на guide. */
interface RetainedGuideScalingCandidateParams {
  target: CropFrame
  transform?: Transform | null
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}

/** Лучшие кандидаты для режима с приоритетом положения внутри guide. */
interface InsideFirstScalingCandidateSelection {
  insideCandidate: ScalingStepCandidate | null
  onGuideCandidate: ScalingStepCandidate | null
}

/** Результат проверки одного кандидата относительно активных guide. */
interface ScalingStepCandidateMatchResult {
  candidate: ScalingStepCandidate
  snapMatch: ScalingStepCandidateSnapMatch
}

/**
 * Возвращает ближайший scale, который не переносит удерживаемую грань за guide.
 */
export function resolveCropGuardedScalingStep({
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
}: CropGuardedScalingStepParams): ScalingStepCandidate {
  const retainedGuideCandidate = resolveRetainedGuideScalingCandidate({
    target,
    transform,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    preservePlacement,
    snapGuards
  })
  if (retainedGuideCandidate) return retainedGuideCandidate

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
 * Возвращает scale, если текущий resize уже удерживает нужную грань на guide.
 */
function resolveRetainedGuideScalingCandidate({
  target,
  transform,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  preservePlacement,
  snapGuards
}: RetainedGuideScalingCandidateParams): ScalingStepCandidate | null {
  if (!usesScaledDisplaySizeForSnapGuards({ target, snapGuards }) && shouldKeepCurrentGuideSnap({
    target,
    snapGuards
  })) {
    return {
      scaleX: rawScaleX,
      scaleY: rawScaleY
    }
  }

  const heldSourceCandidate = resolveSourceScaledGuideHoldCandidate({
    target,
    effectiveWidth,
    effectiveHeight,
    transform,
    preservePlacement,
    snapGuards
  })
  if (heldSourceCandidate) return heldSourceCandidate

  return resolveSourceScaledRawGuideCandidate({
    target,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    preservePlacement,
    snapGuards
  })
}

/**
 * Возвращает текущий scale, если resize-план уже поставил crop frame на внутренний guide.
 * Для внешней границы исходника текущий scale не подходит: там приоритет у кандидата точно на guide.
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
  target: CropFrame
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
  target: CropFrame
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
 * Проверяет, что кандидат остаётся около guide, от которого уже удерживался scale.
 */
function isScalingCandidateNearSnapGuards({
  target,
  candidate,
  preservePlacement,
  maxDistance = SOURCE_SCALED_GUIDE_HOLD_EPSILON,
  snapGuards
}: {
  target: CropFrame
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
    const distance = getBoundsSnapGuardDistance({
      bounds,
      snapGuard
    })
    if (distance > maxDistance) return false
  }

  return true
}

/**
 * Проверяет, что удерживаемый размер не выходит за часть исходника по внутреннюю сторону guide.
 */
function isScalingCandidateInsideSourceGuideDisplayLimits({
  target,
  candidate,
  effectiveWidth,
  effectiveHeight,
  snapGuards
}: {
  target: CropFrame
  candidate: ScalingStepCandidate
  effectiveWidth: number
  effectiveHeight: number
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  return isScalingCandidateInsideSourceGuideLimits({
    target,
    candidate,
    effectiveWidth,
    effectiveHeight,
    snapGuards,
    shouldRoundSourceLimit: false
  })
}

/**
 * Проверяет, что округлённый размер около guide не больше округлённой части исходника.
 */
function isScalingCandidateInsideRoundedSourceGuideDisplayLimits({
  target,
  candidate,
  effectiveWidth,
  effectiveHeight,
  snapGuards
}: {
  target: CropFrame
  candidate: ScalingStepCandidate
  effectiveWidth: number
  effectiveHeight: number
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  return isScalingCandidateInsideSourceGuideLimits({
    target,
    candidate,
    effectiveWidth,
    effectiveHeight,
    snapGuards,
    shouldRoundSourceLimit: true
  })
}

/**
 * Проверяет размер кандидата по каждой оси, которую удерживает guide.
 */
function isScalingCandidateInsideSourceGuideLimits({
  target,
  candidate,
  effectiveWidth,
  effectiveHeight,
  snapGuards,
  shouldRoundSourceLimit
}: {
  target: CropFrame
  candidate: ScalingStepCandidate
  effectiveWidth: number
  effectiveHeight: number
  snapGuards: ScalingStepSnapGuard[]
  shouldRoundSourceLimit: boolean
}): boolean {
  for (const snapGuard of snapGuards) {
    const displaySize = getCandidateDisplaySizeForSnapGuard({
      candidate,
      effectiveWidth,
      effectiveHeight,
      snapGuard
    })
    const isInsideLimit = shouldRoundSourceLimit
      ? isInsideRoundedSourceGuideDisplayLimit({
        target,
        displaySize,
        snapGuard
      })
      : isInsideSourceGuideDisplayLimit({
        target,
        displaySize,
        snapGuard
      })

    if (!isInsideLimit) return false
  }

  return true
}

/**
 * Возвращает размер кандидата по оси, которую удерживает guide.
 */
function getCandidateDisplaySizeForSnapGuard({
  candidate,
  effectiveWidth,
  effectiveHeight,
  snapGuard
}: {
  candidate: ScalingStepCandidate
  effectiveWidth: number
  effectiveHeight: number
  snapGuard: ScalingStepSnapGuard
}): number {
  return snapGuard.type === 'vertical'
    ? Math.abs(candidate.scaleX) * effectiveWidth
    : Math.abs(candidate.scaleY) * effectiveHeight
}

/**
 * Возвращает размер текущего движения по оси, которую удерживает guide.
 */
function getRawDisplaySizeForSnapGuard({
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  snapGuard
}: {
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  snapGuard: ScalingStepSnapGuard
}): number {
  return snapGuard.type === 'vertical'
    ? Math.abs(rawScaleX) * effectiveWidth
    : Math.abs(rawScaleY) * effectiveHeight
}

/**
 * Проверяет округлённый размер относительно части исходника по внутреннюю сторону guide.
 */
function isInsideRoundedSourceGuideDisplayLimit({
  target,
  displaySize,
  snapGuard
}: {
  target: CropFrame
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
 * Выбирает кандидата, который остаётся внутри активных guide.
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
  if (!shouldPreferInsideCandidate) {
    return selectOnGuideFirstScalingCandidate({
      target,
      candidates,
      preservePlacement,
      snapGuards
    })
  }

  const {
    insideCandidate,
    onGuideCandidate
  } = selectInsideFirstScalingCandidates({
    target,
    candidates,
    preservePlacement,
    snapGuards
  })

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
 * Лучшие кандидаты для режима, где положение внутри guide предпочтительнее точного попадания на guide.
 */
function selectInsideFirstScalingCandidates({
  target,
  candidates,
  preservePlacement,
  snapGuards
}: GuardedScalingCandidateMatchParams): InsideFirstScalingCandidateSelection {
  const matches = candidates.map((candidate) => {
    return {
      candidate,
      snapMatch: resolveScalingStepCandidateSnapMatch({
        target,
        candidate,
        preservePlacement,
        snapGuards
      })
    }
  })

  return {
    insideCandidate: findClosestInsideScalingCandidate({ matches }),
    onGuideCandidate: findFirstOnGuideScalingCandidate({ matches })
  }
}

/**
 * Возвращает первого кандидата, который стоит точно на всех guide.
 */
function findFirstOnGuideScalingCandidate({
  matches
}: {
  matches: ScalingStepCandidateMatchResult[]
}): ScalingStepCandidate | null {
  const match = matches.find((candidateMatch) => {
    return candidateMatch.snapMatch.state === 'on-guide'
  })

  return match?.candidate ?? null
}

/**
 * Возвращает ближайшего кандидата, который остаётся внутри всех guide.
 */
function findClosestInsideScalingCandidate({
  matches
}: {
  matches: ScalingStepCandidateMatchResult[]
}): ScalingStepCandidate | null {
  let closestCandidate: ScalingStepCandidate | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const { candidate, snapMatch } of matches) {
    if (snapMatch.state !== 'inside') continue
    if (snapMatch.distance >= closestDistance) continue

    closestCandidate = candidate
    closestDistance = snapMatch.distance
  }

  return closestCandidate
}

/**
 * Оставляет кандидата на guide, если активные оси уже попали в целый пиксель исходника.
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
  target: CropFrame
  candidate: ScalingStepCandidate
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  for (const snapGuard of snapGuards) {
    if (!shouldKeepOnGuideSnapGuardCandidate({
      target,
      candidate,
      rawScaleX,
      rawScaleY,
      effectiveWidth,
      effectiveHeight,
      snapGuard
    })) return false
  }

  return true
}

/**
 * Проверяет один guide для кандидата, который стоит точно на guide.
 */
function shouldKeepOnGuideSnapGuardCandidate({
  target,
  candidate,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  snapGuard
}: {
  target: CropFrame
  candidate: ScalingStepCandidate
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const displaySize = getCandidateDisplaySizeForSnapGuard({
    candidate,
    effectiveWidth,
    effectiveHeight,
    snapGuard
  })
  const rawDisplaySize = getRawDisplaySizeForSnapGuard({
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    snapGuard
  })

  if (!isIntegerDisplaySize({ displaySize })) return false
  if (!isSameSnappedDisplaySize({
    displaySize,
    rawDisplaySize
  })) return false

  return isInsideSourceGuideDisplayLimit({
    target,
    displaySize,
    snapGuard
  })
}

/**
 * Проверяет, что размер уже совпадает с целым пикселем.
 */
function isIntegerDisplaySize({ displaySize }: { displaySize: number }): boolean {
  const integerSize = Math.round(displaySize)

  return Math.abs(displaySize - integerSize) <= DISPLAY_SIZE_INTEGER_EPSILON
}

/**
 * Проверяет, что кандидат на guide не увеличивает размер, а только убирает float-дрейф.
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
 * Проверяет, что кандидат на guide не стал больше части исходника, внутри которой удерживается crop frame.
 */
function isInsideSourceGuideDisplayLimit({
  target,
  displaySize,
  snapGuard
}: {
  target: CropFrame
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
 * Возвращает размер части исходника по внутреннюю сторону guide.
 */
function resolveSourceGuideDisplayLimit({
  target,
  snapGuard
}: {
  target: CropFrame
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
 * Возвращает длину части исходника по внутреннюю сторону guide.
 */
function resolveSourceGuideDisplayLength({
  target,
  snapGuard
}: {
  target: CropFrame
  snapGuard: ScalingStepSnapGuard
}): number | null {
  const { cropSource } = target
  if (!cropSource) return null

  const sourceBounds = getObjectExactBounds({ object: cropSource })
  if (!sourceBounds) return null

  const sourceScale = snapGuard.type === 'vertical'
    ? Math.abs(target.cropSourceScaleX ?? 1)
    : Math.abs(target.cropSourceScaleY ?? 1)
  if (!Number.isFinite(sourceScale) || sourceScale <= 0) return null

  const sceneLength = getSourceGuideSceneLength({
    sourceBounds,
    snapGuard
  })
  if (!Number.isFinite(sceneLength) || sceneLength <= 0) return null

  return sceneLength / sourceScale
}

/**
 * Возвращает длину на canvas между внутренним guide и внешней границей исходника.
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
 * Возвращает true, если размер в пикселях исходника нужно удерживать внутри guide при округлении.
 * Для внешней границы исходника приоритет остаётся у кандидата на guide, чтобы snap не съедал 1px.
 */
function shouldPreferInsideScalingCandidate({
  target,
  snapGuards
}: {
  target: CropFrame
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  if (!usesScaledDisplaySizeForSnapGuards({ target, snapGuards })) return false

  return !usesSourceBoundarySnapGuards({ target, snapGuards })
}

/**
 * Возвращает true, если активная ось guide показывает размер в пикселях исходника с отдельным scale.
 */
function usesScaledDisplaySizeForSnapGuards({
  target,
  snapGuards
}: {
  target: CropFrame
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  const usesScaledX = snapGuards.some((snapGuard) => {
    return snapGuard.type === 'vertical' && !isSceneDisplayScale({
      scale: target.cropSourceScaleX
    })
  })
  const usesScaledY = snapGuards.some((snapGuard) => {
    return snapGuard.type === 'horizontal' && !isSceneDisplayScale({
      scale: target.cropSourceScaleY
    })
  })

  return usesScaledX || usesScaledY
}

/**
 * Возвращает true, если хотя бы один активный guide приклеен к внешней границе исходника.
 */
function usesSourceBoundarySnapGuards({
  target,
  snapGuards
}: {
  target: CropFrame
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  const { cropSource } = target
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
 * Проверяет, совпадает ли guide с соответствующей внешней границей исходника.
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
 * Сравнивает guide с границей исходника в координатах canvas.
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
 * Возвращает true, если ось размера совпадает с пиксельной осью canvas.
 */
function isSceneDisplayScale({ scale }: { scale?: number }): boolean {
  const safeScale = Math.abs(scale ?? 1)

  return Math.abs(safeScale - 1) <= SOURCE_DISPLAY_SCALE_EPSILON
}
