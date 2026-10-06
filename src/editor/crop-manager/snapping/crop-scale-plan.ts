/* eslint-disable no-use-before-define -- Public calculation precedes internal formulas. */
import type { Transform } from 'fabric'

import {
  resolveScaleUpdatePlan,
  type ScaleUpdatePlan,
  type ScaleUpdatePlanParams
} from '../../snapping-manager/scaling/legacy-scale-snapping'
import {
  getBoundsSnapGuardDistance,
  type ScalingStepSnapGuard
} from '../../snapping-manager/scaling/scaling-snap-guard'
import type { Bounds } from '../../snapping-manager/types'
import type { CropFrame } from '../domain/crop-frame'
import { SOURCE_SCALED_GUIDE_HOLD_EPSILON } from './crop-scale-snap-guards'

/** Tolerance for comparing scale multipliers on different axes. */
const UNIFORM_SCALE_FACTOR_EPSILON = 0.000001

/** Crop plan with the initial frame scale for holding a guide. */
interface CropScaleUpdatePlanParams extends ScaleUpdatePlanParams {
  target: CropFrame
  originalScaleX?: number | null
  originalScaleY?: number | null
}

/** Extends the shared geometry plan with legacy crop holding in source pixels. */
export function resolveCropScaleUpdatePlan(params: CropScaleUpdatePlanParams): ScaleUpdatePlan | null {
  const plan = resolveScaleUpdatePlan(params)
  if (!plan || !params.shouldUseUniformScaleSnap) return plan

  const heldFactor = resolveSourceScaledGuideHoldScaleFactor({ ...params, snapGuards: plan.snapGuards })
  if (heldFactor === null) return plan

  return { ...plan, nextScaleX: params.scaleX * heldFactor, nextScaleY: params.scaleY * heldFactor }
}

/** Returns the initial multiplier if the legacy frame remains near all held guides. */
function resolveSourceScaledGuideHoldScaleFactor({
  target,
  bounds,
  originX,
  originY,
  scaleX,
  scaleY,
  originalScaleX,
  originalScaleY,
  snapGuards
}: {
  target: CropFrame
  bounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  scaleX: number
  scaleY: number
  originalScaleX?: number | null
  originalScaleY?: number | null
  snapGuards: ScalingStepSnapGuard[]
}): number | null {
  if (!target.cropSource) return null

  const scaleFactor = resolveOriginalUniformScaleFactor({
    scaleX,
    scaleY,
    originalScaleX,
    originalScaleY,
    snapGuards
  })
  if (scaleFactor === null) return null

  const originalBounds = resolveUniformScaledBounds({
    bounds,
    originX,
    originY,
    scaleFactor
  })
  if (!areBoundsNearSnapGuards({
    bounds: originalBounds,
    snapGuards
  })) return null

  return scaleFactor
}

/** Reconciles the initial multiplier across all axes of the active guides. */
function resolveOriginalUniformScaleFactor({
  scaleX,
  scaleY,
  originalScaleX,
  originalScaleY,
  snapGuards
}: {
  scaleX: number
  scaleY: number
  originalScaleX?: number | null
  originalScaleY?: number | null
  snapGuards: ScalingStepSnapGuard[]
}): number | null {
  const scaleFactors: number[] = []

  for (const snapGuard of snapGuards) {
    const scaleFactor = resolveOriginalScaleFactorForSnapGuard({
      snapGuard,
      scaleX,
      scaleY,
      originalScaleX,
      originalScaleY
    })
    if (scaleFactor === null) return null

    scaleFactors.push(scaleFactor)
  }

  const [scaleFactor] = scaleFactors
  if (scaleFactor === undefined) return null
  if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) return null

  for (const nextScaleFactor of scaleFactors) {
    if (Math.abs(nextScaleFactor - scaleFactor) > UNIFORM_SCALE_FACTOR_EPSILON) return null
  }

  return scaleFactor
}

/** Converts the initial scale on one axis to the current step multiplier. */
function resolveOriginalScaleFactorForSnapGuard({
  snapGuard,
  scaleX,
  scaleY,
  originalScaleX,
  originalScaleY
}: {
  snapGuard: ScalingStepSnapGuard
  scaleX: number
  scaleY: number
  originalScaleX?: number | null
  originalScaleY?: number | null
}): number | null {
  const currentScale = snapGuard.type === 'vertical' ? scaleX : scaleY
  const originalScale = snapGuard.type === 'vertical' ? originalScaleX : originalScaleY

  if (typeof originalScale !== 'number') return null
  if (!Number.isFinite(originalScale) || !Number.isFinite(currentScale)) return null
  if (Math.abs(currentScale) <= UNIFORM_SCALE_FACTOR_EPSILON) return null

  return originalScale / currentScale
}

/** Calculates the rectangle after a proportional resize relative to the fixed sides. */
function resolveUniformScaledBounds({
  bounds,
  originX,
  originY,
  scaleFactor
}: {
  bounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  scaleFactor: number
}): Bounds {
  const horizontalBounds = resolveUniformScaledHorizontalBounds({
    bounds,
    originX,
    scaleFactor
  })
  const verticalBounds = resolveUniformScaledVerticalBounds({
    bounds,
    originY,
    scaleFactor
  })

  return {
    ...horizontalBounds,
    ...verticalBounds,
    centerX: horizontalBounds.left + ((horizontalBounds.right - horizontalBounds.left) / 2),
    centerY: verticalBounds.top + ((verticalBounds.bottom - verticalBounds.top) / 2)
  }
}

/** Preserves the horizontal anchor of the legacy guide calculation. */
function resolveUniformScaledHorizontalBounds({
  bounds,
  originX,
  scaleFactor
}: {
  bounds: Bounds
  originX: Transform['originX']
  scaleFactor: number
}): Pick<Bounds, 'left' | 'right'> {
  const {
    left,
    right,
    centerX
  } = bounds
  const width = (right - left) * scaleFactor
  const resolvedOriginX = resolveScaleOriginX({ originX })

  if (resolvedOriginX === 'right') {
    return {
      left: right - width,
      right
    }
  }
  if (resolvedOriginX === 'center') {
    return {
      left: centerX - (width / 2),
      right: centerX + (width / 2)
    }
  }

  return {
    left,
    right: left + width
  }
}

/** Preserves the vertical anchor of the legacy guide calculation. */
function resolveUniformScaledVerticalBounds({
  bounds,
  originY,
  scaleFactor
}: {
  bounds: Bounds
  originY: Transform['originY']
  scaleFactor: number
}): Pick<Bounds, 'top' | 'bottom'> {
  const {
    top,
    bottom,
    centerY
  } = bounds
  const height = (bottom - top) * scaleFactor
  const resolvedOriginY = resolveScaleOriginY({ originY })

  if (resolvedOriginY === 'bottom') {
    return {
      top: bottom - height,
      bottom
    }
  }
  if (resolvedOriginY === 'center') {
    return {
      top: centerY - (height / 2),
      bottom: centerY + (height / 2)
    }
  }

  return {
    top,
    bottom: top + height
  }
}

/** Returns the named horizontal anchor of the legacy resize. */
function resolveScaleOriginX({ originX }: { originX: Transform['originX'] }): 'left' | 'center' | 'right' {
  if (originX === 'center' || originX === 'right') return originX

  return 'left'
}

/** Returns the named vertical anchor of the legacy resize. */
function resolveScaleOriginY({ originY }: { originY: Transform['originY'] }): 'top' | 'center' | 'bottom' {
  if (originY === 'center' || originY === 'bottom') return originY

  return 'top'
}

/** Checks the allowed deviation of the frame from all active guides. */
function areBoundsNearSnapGuards({
  bounds,
  snapGuards
}: {
  bounds: Bounds
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  for (const snapGuard of snapGuards) {
    const distance = getBoundsSnapGuardDistance({
      bounds,
      snapGuard
    })
    if (distance > SOURCE_SCALED_GUIDE_HOLD_EPSILON) return false
  }

  return true
}
