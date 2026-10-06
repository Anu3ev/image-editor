/* eslint-disable no-use-before-define -- The public resolver is kept above internal calculations. */
import type { FabricObject } from 'fabric'

import { getObjectBounds, type ObjectBounds } from '../../utils/geometry'
import {
  getBoundsSnapGuardDistance,
  isBoundsInsideSnapGuard,
  isBoundsOnSnapGuide,
  type ScalingStepSnapGuard
} from './scaling-snap-guard'

export type { ScalingStepSnapGuard } from './scaling-snap-guard'

/** Selects the nearest integer size that does not move the held edge past the guide. */
export function resolveGuardedScalingStep(params: GuardedScalingStepParams): ScalingStepCandidate {
  const { target, rawScaleX, rawScaleY, preservePlacement, snapGuards, fallbackScale } = params
  if (shouldKeepCurrentGuideSnap({ target, snapGuards })) return { scaleX: rawScaleX, scaleY: rawScaleY }

  const candidates = collectScalingStepCandidates(params)
  return selectOnGuideFirstScalingCandidate({ target, candidates, preservePlacement, snapGuards }) ?? fallbackScale
}

/** Scale candidate after rounding the size to an integer pixel. */
export type ScalingStepCandidate = {
  scaleX: number
  scaleY: number
}

/** Anchor to preserve while rounding scale. */
type ScalingStepPlacement = {
  left: number
  top: number
  originX: FabricObject['originX']
  originY: FabricObject['originY']
}

/** Contract for restoring the anchor during one scale rounding step. */
export type ScalingStepPlacementPreserver = {
  placement: ScalingStepPlacement
  applyPlacement: (placement: ScalingStepPlacement) => void
}

/** Parameters for selecting a scale that preserves active guides. */
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

/** Candidate position relative to the held guide. */
type ScalingStepCandidateSnapState = 'on-guide' | 'inside' | 'outside'

/** Candidate check against the held guide. */
export type ScalingStepCandidateSnapMatch = {
  state: ScalingStepCandidateSnapState
  distance: number
}

/** Parameters for evaluating scale candidates against active guides. */
export interface GuardedScalingCandidateMatchParams {
  target: FabricObject
  candidates: ScalingStepCandidate[]
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}

/**
 * Selects the first candidate exactly on the guide, falling back to the first candidate inside it.
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
 * Returns true if the current scale already holds the edge on the guide,
 * and the object size is calculated in the same canvas coordinates as the guide.
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
 * Checks that the actual size along the guide axis can be displayed as a valid pixel size.
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
 * Collects scale rounding candidates, starting with those nearest to the current scale.
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
 * Collects scale candidates for one axis using the current size and adjacent pixel sizes.
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
 * Adds a scale candidate without duplicates from matching pixel sizes.
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
 * Collects uniform scale candidates from both axes.
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
 * Collects pairs of scale candidates for independent scaling along each axis.
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
 * Checks the rounded scale against the held guide.
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
 * Reads candidate bounds by temporarily applying scale and restoring the target's original state.
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
 * Checks candidate bounds against all active guides.
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
