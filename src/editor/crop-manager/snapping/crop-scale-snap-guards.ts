import type { Transform } from 'fabric'
import { english, type Translate } from '../../i18n'
/* eslint-disable no-use-before-define -- Crop rounding calculation precedes internal constraints. */

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

/** Tolerance for holding the crop frame near the guide where the legacy resize began. */
export const SOURCE_SCALED_GUIDE_HOLD_EPSILON = 1

/** Crop rounding in source pixels, accounting for the initial gesture scale. */
interface CropGuardedScalingStepParams extends GuardedScalingStepParams {
  t?: Translate
  target: CropFrame
  transform?: Transform | null
}

/** Tolerance for the current scale near a fractional guide after rounding the bounds. */
const SOURCE_SCALED_RAW_GUIDE_POSITION_EPSILON = 0.5

/** Tolerance for comparing a size in the source image to an integer pixel value. */
const DISPLAY_SIZE_INTEGER_EPSILON = 0.000001

/** Tolerance for size drift after applying a resize plan. */
const SNAP_PLAN_DISPLAY_SIZE_EPSILON = 0.02

/** Tolerance for comparing the source image scale with the canvas scale. */
const SOURCE_DISPLAY_SCALE_EPSILON = 0.000001

/** Parameters for selecting a candidate that preserves the active guides. */
interface GuardedScalingCandidateSelectorParams extends GuardedScalingCandidateMatchParams {
  t?: Translate
  target: CropFrame
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  shouldPreferInsideCandidate: boolean
}

/** Parameters for checking a scale that already holds an edge on a guide. */
interface RetainedGuideScalingCandidateParams {
  t?: Translate
  target: CropFrame
  transform?: Transform | null
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}

/** Best candidates for the mode that prioritizes staying inside the guides. */
interface InsideFirstScalingCandidateSelection {
  insideCandidate: ScalingStepCandidate | null
  onGuideCandidate: ScalingStepCandidate | null
}

/** Result of checking one candidate against the active guides. */
interface ScalingStepCandidateMatchResult {
  candidate: ScalingStepCandidate
  snapMatch: ScalingStepCandidateSnapMatch
}

/**
 * Returns the nearest scale that does not move the held edge past the guide.
 */
export function resolveCropGuardedScalingStep({
  t = english,
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
    t,
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
    t,
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
 * Returns the scale if the current resize already holds the required edge on the guide.
 */
function resolveRetainedGuideScalingCandidate({
  t = english,
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
    t,
    target,
    effectiveWidth,
    effectiveHeight,
    transform,
    preservePlacement,
    snapGuards
  })
  if (heldSourceCandidate) return heldSourceCandidate

  return resolveSourceScaledRawGuideCandidate({
    t,
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
 * Returns the current scale if the resize plan has already placed the crop frame on an internal guide.
 * At the outer source boundary, the current scale is unsuitable: a candidate exactly on the guide takes priority.
 */
function resolveSourceScaledRawGuideCandidate({
  t = english,
  target,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  preservePlacement,
  snapGuards
}: {
  t?: Translate
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
    t,
    target,
    candidate,
    effectiveWidth,
    effectiveHeight,
    snapGuards
  })) return null

  return candidate
}

/**
 * Returns the scale from the start of the Fabric transform if the crop frame was already held near an internal source guide.
 */
function resolveSourceScaledGuideHoldCandidate({
  t = english,
  target,
  transform,
  effectiveWidth,
  effectiveHeight,
  preservePlacement,
  snapGuards
}: {
  t?: Translate
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
    t,
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
 * Checks that the candidate stays near the guide where the scale was already held.
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
 * Checks that the held size does not exceed the part of the source on the inner side of the guide.
 */
function isScalingCandidateInsideSourceGuideDisplayLimits({
  t = english,
  target,
  candidate,
  effectiveWidth,
  effectiveHeight,
  snapGuards
}: {
  t?: Translate
  target: CropFrame
  candidate: ScalingStepCandidate
  effectiveWidth: number
  effectiveHeight: number
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  return isScalingCandidateInsideSourceGuideLimits({
    t,
    target,
    candidate,
    effectiveWidth,
    effectiveHeight,
    snapGuards,
    shouldRoundSourceLimit: false
  })
}

/**
 * Checks that the rounded size near the guide does not exceed the rounded portion of the source.
 */
function isScalingCandidateInsideRoundedSourceGuideDisplayLimits({
  t = english,
  target,
  candidate,
  effectiveWidth,
  effectiveHeight,
  snapGuards
}: {
  t?: Translate
  target: CropFrame
  candidate: ScalingStepCandidate
  effectiveWidth: number
  effectiveHeight: number
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  return isScalingCandidateInsideSourceGuideLimits({
    t,
    target,
    candidate,
    effectiveWidth,
    effectiveHeight,
    snapGuards,
    shouldRoundSourceLimit: true
  })
}

/**
 * Checks the candidate size along each axis held by a guide.
 */
function isScalingCandidateInsideSourceGuideLimits({
  t = english,
  target,
  candidate,
  effectiveWidth,
  effectiveHeight,
  snapGuards,
  shouldRoundSourceLimit
}: {
  t?: Translate
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
        t,
        target,
        displaySize,
        snapGuard
      })
      : isInsideSourceGuideDisplayLimit({
        t,
        target,
        displaySize,
        snapGuard
      })

    if (!isInsideLimit) return false
  }

  return true
}

/**
 * Returns the candidate size along the axis held by the guide.
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
 * Returns the size for the current movement along the axis held by the guide.
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
 * Checks the rounded size against the part of the source on the inner side of the guide.
 */
function isInsideRoundedSourceGuideDisplayLimit({
  t = english,
  target,
  displaySize,
  snapGuard
}: {
  t?: Translate
  target: CropFrame
  displaySize: number
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const sourceDisplayLength = resolveSourceGuideDisplayLength({
    t,
    target,
    snapGuard
  })
  if (sourceDisplayLength === null) return false

  const roundedSourceDisplayLimit = Math.round(sourceDisplayLength + DISPLAY_SIZE_INTEGER_EPSILON)

  return Math.round(displaySize) <= roundedSourceDisplayLimit
}

/**
 * Selects a candidate that stays inside the active guides.
 */
function selectGuardedScalingCandidate({
  t = english,
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
    t,
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
 * Best candidates for the mode that favors staying inside the guides over landing exactly on them.
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
 * Returns the first candidate that lies exactly on all guides.
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
 * Returns the nearest candidate that stays inside all guides.
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
 * Keeps the candidate on the guide if the active axes already align to whole source pixels.
 */
function shouldKeepOnGuideScalingCandidate({
  t = english,
  target,
  candidate,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  snapGuards
}: {
  t?: Translate
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
      t,
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
 * Checks one guide for a candidate that lies exactly on the guide.
 */
function shouldKeepOnGuideSnapGuardCandidate({
  t = english,
  target,
  candidate,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  snapGuard
}: {
  t?: Translate
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
    t,
    target,
    displaySize,
    snapGuard
  })
}

/**
 * Checks that the size already matches a whole-pixel value.
 */
function isIntegerDisplaySize({ displaySize }: { displaySize: number }): boolean {
  const integerSize = Math.round(displaySize)

  return Math.abs(displaySize - integerSize) <= DISPLAY_SIZE_INTEGER_EPSILON
}

/**
 * Checks that the candidate on the guide only removes floating-point drift without increasing the size.
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
 * Checks that the candidate on the guide does not exceed the part of the source containing the crop frame.
 */
function isInsideSourceGuideDisplayLimit({
  t = english,
  target,
  displaySize,
  snapGuard
}: {
  t?: Translate
  target: CropFrame
  displaySize: number
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const sourceDisplayLimit = resolveSourceGuideDisplayLimit({
    t,
    target,
    snapGuard
  })
  if (sourceDisplayLimit === null) return false

  return Math.round(displaySize) <= sourceDisplayLimit
}

/**
 * Returns the size of the part of the source on the inner side of the guide.
 */
function resolveSourceGuideDisplayLimit({
  t = english,
  target,
  snapGuard
}: {
  t?: Translate
  target: CropFrame
  snapGuard: ScalingStepSnapGuard
}): number | null {
  const sourceDisplayLength = resolveSourceGuideDisplayLength({
    t,
    target,
    snapGuard
  })
  if (sourceDisplayLength === null) return null

  return Math.round(sourceDisplayLength + DISPLAY_SIZE_INTEGER_EPSILON)
}

/**
 * Returns the length of the part of the source on the inner side of the guide.
 */
function resolveSourceGuideDisplayLength({
  t = english,
  target,
  snapGuard
}: {
  t?: Translate
  target: CropFrame
  snapGuard: ScalingStepSnapGuard
}): number | null {
  const { cropSource } = target
  if (!cropSource) return null

  const sourceBounds = getObjectExactBounds({ t, object: cropSource })
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
 * Returns the canvas distance between the internal guide and the outer source boundary.
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
 * Returns true if the size in source pixels must stay inside the guide when rounding.
 * At the outer source boundary, the candidate on the guide retains priority so that snapping does not lose 1px.
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
 * Returns true if the active guide axis represents a size in source pixels with a separate scale.
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
 * Returns true if at least one active guide is snapped to the outer source boundary.
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
 * Checks whether the guide coincides with the corresponding outer source boundary.
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
 * Compares the guide with the source boundary in canvas coordinates.
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
 * Returns true if the size axis coincides with the canvas pixel axis.
 */
function isSceneDisplayScale({ scale }: { scale?: number }): boolean {
  const safeScale = Math.abs(scale ?? 1)

  return Math.abs(safeScale - 1) <= SOURCE_DISPLAY_SCALE_EPSILON
}
