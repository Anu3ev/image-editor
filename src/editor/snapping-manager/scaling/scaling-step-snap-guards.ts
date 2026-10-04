/* eslint-disable no-use-before-define -- Публичный resolver держим выше внутренних расчётов. */
import type { FabricObject } from 'fabric'

import { getObjectBounds, type ObjectBounds } from '../../utils/geometry'
import {
  getBoundsSnapGuardDistance,
  isBoundsInsideSnapGuard,
  isBoundsOnSnapGuide,
  type ScalingStepSnapGuard
} from './scaling-snap-guard'

export type { ScalingStepSnapGuard } from './scaling-snap-guard'

/** Выбирает ближайший целый размер, который не переносит удерживаемую грань за направляющую. */
export function resolveGuardedScalingStep(params: GuardedScalingStepParams): ScalingStepCandidate {
  const { target, rawScaleX, rawScaleY, preservePlacement, snapGuards, fallbackScale } = params
  if (shouldKeepCurrentGuideSnap({ target, snapGuards })) return { scaleX: rawScaleX, scaleY: rawScaleY }

  const candidates = collectScalingStepCandidates(params)
  return selectOnGuideFirstScalingCandidate({ target, candidates, preservePlacement, snapGuards }) ?? fallbackScale
}

/** Кандидат scale после округления размера к целому пикселю. */
export type ScalingStepCandidate = {
  scaleX: number
  scaleY: number
}

/** Опорная точка, которую нужно сохранять во время округления scale. */
type ScalingStepPlacement = {
  left: number
  top: number
  originX: FabricObject['originX']
  originY: FabricObject['originY']
}

/** Контракт восстановления опорной точки во время одного шага округления scale. */
export type ScalingStepPlacementPreserver = {
  placement: ScalingStepPlacement
  applyPlacement: (placement: ScalingStepPlacement) => void
}

/** Параметры выбора scale, который сохраняет активные guide. */
export type GuardedScalingStepParams = {
  target: FabricObject
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  fallbackScale: ScalingStepCandidate
  isUniform: boolean
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}

/** Положение кандидата относительно удерживаемого guide. */
type ScalingStepCandidateSnapState = 'on-guide' | 'inside' | 'outside'

/** Проверка кандидата относительно удерживаемого guide. */
export type ScalingStepCandidateSnapMatch = {
  state: ScalingStepCandidateSnapState
  distance: number
}

/** Параметры перебора scale-кандидатов относительно активных guide. */
export interface GuardedScalingCandidateMatchParams {
  target: FabricObject
  candidates: ScalingStepCandidate[]
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}

/**
 * Выбирает первый кандидат прямо на guide, fallback — первый кандидат внутри guide.
 */
export function selectOnGuideFirstScalingCandidate({
  target,
  candidates,
  preservePlacement,
  snapGuards
}: GuardedScalingCandidateMatchParams): ScalingStepCandidate | null {
  let insideCandidate: ScalingStepCandidate | null = null

  for (const candidate of candidates) {
    const snapMatch = resolveScalingStepCandidateSnapMatch({
      target,
      candidate,
      preservePlacement,
      snapGuards
    })

    if (snapMatch.state === 'on-guide') return candidate

    if (snapMatch.state === 'inside' && !insideCandidate) {
      insideCandidate = candidate
    }
  }

  return insideCandidate
}

/**
 * Возвращает true, если текущий scale уже удерживает грань на guide,
 * а размер объекта считается в тех же координатах canvas, что и guide.
 */
export function shouldKeepCurrentGuideSnap({
  target,
  snapGuards
}: {
  target: FabricObject
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  const bounds = getObjectBounds({ object: target })
  if (!bounds) return false

  for (const snapGuard of snapGuards) {
    if (!isBoundsOnSnapGuide({ bounds, snapGuard })) return false
    if (!hasValidRoundedBoundsSize({ bounds, snapGuard })) return false
  }

  return true
}

/**
 * Проверяет, что фактический размер по оси guide можно показать как валидный пиксельный размер.
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
 * Собирает кандидаты округления scale, начиная с ближайших к текущему scale.
 */
export function collectScalingStepCandidates({
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
 * Собирает scale-кандидаты одной оси через текущий размер и соседние пиксельные размеры.
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
 * Добавляет scale-кандидат без дублей от совпадающих пиксельных размеров.
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
 * Проверяет округлённый scale относительно удерживаемого guide.
 */
export function resolveScalingStepCandidateSnapMatch({
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
 * Читает bounds кандидата, временно применяя scale и возвращая target в исходное состояние.
 */
export function readScalingStepCandidateBounds({
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
 * Проверяет bounds кандидата относительно всех активных guide.
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
    if (!isBoundsInsideSnapGuard({ bounds, snapGuard })) {
      return {
        state: 'outside',
        distance: Number.POSITIVE_INFINITY
      }
    }
    if (!isBoundsOnSnapGuide({ bounds, snapGuard })) {
      isOnGuide = false
    }

    distance = Math.max(
      distance,
      getBoundsSnapGuardDistance({
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
