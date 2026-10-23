/* eslint-disable no-use-before-define -- The module's public contract is kept above internal calculations. */
import {
  FabricObject,
  Textbox,
  Transform
} from 'fabric'

import type {
  AnchorBuckets,
  Bounds,
  GuideLine
} from '../types'
import type { ScalingStepSnapGuard } from './scaling-snap-guard'

type AxisSnapEdge = 'left' | 'right' | 'top' | 'bottom'

type AxisSnapCandidate = {
  edge: AxisSnapEdge
  position: number
}

type AxisSnapResult = {
  delta: number
  guidePosition: number | null
  candidate: AxisSnapCandidate | null
}

/** Tolerance for comparing uniform scale factors on the axes of one scaling step. */
const UNIFORM_SCALE_FACTOR_EPSILON = 0.000001

export type ScalingAxisState = {
  isCornerHandle: boolean
  shouldSnapX: boolean
  shouldSnapY: boolean
}

export type ScalingTransformState = {
  originX: Transform['originX']
  originY: Transform['originY']
  scaleX: number
  scaleY: number
}

export type ScaleAxisSnapState = {
  verticalSnap: AxisSnapResult
  horizontalSnap: AxisSnapResult
}

export type ScaleUpdatePlan = {
  guides: GuideLine[]
  snapGuards: ScalingStepSnapGuard[]
  nextScaleX: number | null
  nextScaleY: number | null
}

export type TextResizeSnapPlan = {
  guide: GuideLine
  nextWidth: number
}

type ScaleSnapContext = {
  target: FabricObject
  bounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  scaleX: number
  scaleY: number
  verticalSnap: AxisSnapResult
  horizontalSnap: AxisSnapResult
}

/** Inputs to the legacy geometric scale calculation. */
export interface ScaleUpdatePlanParams extends ScaleSnapContext {
  shouldUseUniformScaleSnap: boolean
}

type AxisScaleUpdate = {
  guide: GuideLine
  snapGuard: ScalingStepSnapGuard
  nextScale: number
}

type UniformScaleResult = {
  guide: GuideLine
  snapGuards: ScalingStepSnapGuard[]
  scaleFactor: number
}

type UniformScaleSnap = {
  guide: GuideLine
  snapGuard: ScalingStepSnapGuard
  scaleFactor: number
}

/**
 * Determines active scaling axes from the transform corner and action.
 */
export function resolveScalingAxisState({ transform }: { transform: Transform }): ScalingAxisState {
  const { corner = '', action = '' } = transform
  const isHorizontalHandle = corner === 'ml' || corner === 'mr' || action === 'scaleX'
  const isVerticalHandle = corner === 'mt' || corner === 'mb' || action === 'scaleY'
  const isCornerHandle = corner === 'tl'
    || corner === 'tr'
    || corner === 'bl'
    || corner === 'br'
    || action === 'scale'

  return {
    isCornerHandle,
    shouldSnapX: isHorizontalHandle || isCornerHandle,
    shouldSnapY: isVerticalHandle || isCornerHandle
  }
}

/** Returns active origins and scales from the transform, falling back to target state. */
export function resolveScalingTransformState({
  target,
  transform
}: {
  target: FabricObject
  transform: Transform
}): ScalingTransformState {
  const {
    originX: transformOriginX,
    originY: transformOriginY
  } = transform
  const {
    originX: targetOriginX = 'left',
    originY: targetOriginY = 'top',
    scaleX = 1,
    scaleY = 1
  } = target

  return {
    originX: transformOriginX ?? targetOriginX,
    originY: transformOriginY ?? targetOriginY,
    scaleX,
    scaleY
  }
}

/** Finds active axis-snap candidates for the current scaling step. */
export function resolveScaleAxisSnaps({
  bounds,
  corner,
  originX,
  originY,
  shouldSnapX,
  shouldSnapY,
  threshold,
  anchors
}: {
  bounds: Bounds
  corner?: string
  originX: Transform['originX']
  originY: Transform['originY']
  shouldSnapX: boolean
  shouldSnapY: boolean
  threshold: number
  anchors: AnchorBuckets
}): ScaleAxisSnapState | null {
  const verticalCandidates = collectVerticalSnapCandidates({
    bounds,
    corner,
    originX,
    shouldSnapX
  })
  const horizontalCandidates = collectHorizontalSnapCandidates({
    bounds,
    corner,
    originY,
    shouldSnapY
  })
  const verticalSnap = findAxisSnapCandidate({
    anchors: anchors.vertical,
    candidates: verticalCandidates,
    threshold
  })
  const horizontalSnap = findAxisSnapCandidate({
    anchors: anchors.horizontal,
    candidates: horizontalCandidates,
    threshold
  })

  if (verticalSnap.guidePosition === null && horizontalSnap.guidePosition === null) {
    return null
  }

  return {
    verticalSnap,
    horizontalSnap
  }
}

/** Calculates scale updates and corresponding guides for the current scaling step. */
export function resolveScaleUpdatePlan(params: ScaleUpdatePlanParams): ScaleUpdatePlan | null {
  if (params.shouldUseUniformScaleSnap) {
    return resolveUniformScaleUpdatePlan(params)
  }

  return resolveAxisScaleUpdatePlan(params)
}

/** Calculates the legacy snapping plan for horizontal text width resizing. */
export function resolveTextResizeSnapPlan({
  target,
  bounds,
  originX,
  verticalAnchors,
  threshold
}: {
  target: Textbox
  bounds: Bounds
  originX: Transform['originX']
  verticalAnchors: number[]
  threshold: number
}): TextResizeSnapPlan | null {
  const verticalCandidates = collectVerticalSnapCandidates({
    bounds,
    originX,
    shouldSnapX: true
  })
  const verticalSnap = findAxisSnapCandidate({
    anchors: verticalAnchors,
    candidates: verticalCandidates,
    threshold
  })

  const { guidePosition } = verticalSnap
  if (guidePosition === null) return null

  const desiredWidth = resolveDesiredWidth({ bounds, originX, snap: verticalSnap })
  if (desiredWidth === null) return null

  const nextWidth = resolveTextWidthForBounds({ target, boundsWidth: desiredWidth })
  if (nextWidth === null) return null

  return {
    nextWidth,
    guide: {
      type: 'vertical',
      position: guidePosition
    }
  }
}

/** Calculates a uniform scale factor for the selected guides. */
function resolveUniformScaleUpdatePlan({
  bounds, originX, originY, scaleX, scaleY, verticalSnap, horizontalSnap
}: ScaleSnapContext): ScaleUpdatePlan | null {
  const result = resolveUniformScale({ bounds, originX, originY, verticalSnap, horizontalSnap })
  if (!result) return null

  return {
    guides: [result.guide],
    snapGuards: result.snapGuards,
    nextScaleX: scaleX * result.scaleFactor,
    nextScaleY: scaleY * result.scaleFactor
  }
}

function resolveAxisScaleUpdatePlan(params: ScaleSnapContext): ScaleUpdatePlan | null {
  const scaleXUpdate = resolveScaleXUpdate(params)
  const scaleYUpdate = resolveScaleYUpdate(params)

  if (!scaleXUpdate && !scaleYUpdate) return null

  const guides: GuideLine[] = []
  const snapGuards: ScalingStepSnapGuard[] = []
  let nextScaleX: number | null = null
  let nextScaleY: number | null = null

  if (scaleXUpdate) {
    guides.push(scaleXUpdate.guide)
    snapGuards.push(scaleXUpdate.snapGuard)
    nextScaleX = scaleXUpdate.nextScale
  }

  if (scaleYUpdate) {
    guides.push(scaleYUpdate.guide)
    snapGuards.push(scaleYUpdate.snapGuard)
    nextScaleY = scaleYUpdate.nextScale
  }

  return {
    guides,
    snapGuards,
    nextScaleX,
    nextScaleY
  }
}

function resolveScaleXUpdate({
  target,
  bounds,
  originX,
  scaleX,
  scaleY,
  verticalSnap
}: ScaleSnapContext): AxisScaleUpdate | null {
  const { guidePosition } = verticalSnap
  if (guidePosition === null) return null

  const desiredWidth = resolveDesiredWidth({
    bounds,
    originX,
    snap: verticalSnap
  })
  if (desiredWidth === null) return null

  const absNextScaleX = resolveScaleForBoundsSize({
    target,
    axis: 'x',
    desiredSize: desiredWidth,
    scaleX,
    scaleY
  })
  if (absNextScaleX === null) return null

  const snapGuard = createScaleSnapGuard({
    type: 'vertical',
    snap: verticalSnap
  })
  if (!snapGuard) return null

  return {
    nextScale: absNextScaleX * (scaleX < 0 ? -1 : 1),
    snapGuard,
    guide: {
      type: 'vertical',
      position: guidePosition
    }
  }
}

function resolveScaleYUpdate({
  target,
  bounds,
  originY,
  scaleX,
  scaleY,
  horizontalSnap
}: ScaleSnapContext): AxisScaleUpdate | null {
  const { guidePosition } = horizontalSnap
  if (guidePosition === null) return null

  const desiredHeight = resolveDesiredHeight({
    bounds,
    originY,
    snap: horizontalSnap
  })
  if (desiredHeight === null) return null

  const absNextScaleY = resolveScaleForBoundsSize({
    target,
    axis: 'y',
    desiredSize: desiredHeight,
    scaleX,
    scaleY
  })
  if (absNextScaleY === null) return null

  const snapGuard = createScaleSnapGuard({
    type: 'horizontal',
    snap: horizontalSnap
  })
  if (!snapGuard) return null

  return {
    nextScale: absNextScaleY * (scaleY < 0 ? -1 : 1),
    snapGuard,
    guide: {
      type: 'horizontal',
      position: guidePosition
    }
  }
}

/**
 * Collects vertical snapping candidates for the current originX.
 */
function collectVerticalSnapCandidates({
  bounds,
  corner = '',
  originX,
  shouldSnapX
}: {
  bounds: Bounds
  corner?: string
  originX: Transform['originX']
  shouldSnapX: boolean
}): AxisSnapCandidate[] {
  const candidates: AxisSnapCandidate[] = []
  if (!shouldSnapX) return candidates

  const { left, right } = bounds
  let resolvedOriginX: 'left' | 'center' | 'right' = 'left'
  if (originX === 'center' || originX === 'right') {
    resolvedOriginX = originX
  }

  const controlEdge = resolveControlMovingXEdge({ controlKey: corner })
  if (controlEdge && resolvedOriginX !== 'center') {
    candidates.push({
      edge: controlEdge,
      position: controlEdge === 'left' ? left : right
    })

    return candidates
  }

  if (resolvedOriginX === 'left') {
    candidates.push({
      edge: 'right',
      position: right
    })
  }

  if (resolvedOriginX === 'right') {
    candidates.push({
      edge: 'left',
      position: left
    })
  }

  if (resolvedOriginX === 'center') {
    candidates.push({
      edge: 'left',
      position: left
    })
    candidates.push({
      edge: 'right',
      position: right
    })
  }

  return candidates
}

/**
 * Collects horizontal snapping candidates for the current originY.
 */
function collectHorizontalSnapCandidates({
  bounds,
  corner = '',
  originY,
  shouldSnapY
}: {
  bounds: Bounds
  corner?: string
  originY: Transform['originY']
  shouldSnapY: boolean
}): AxisSnapCandidate[] {
  const candidates: AxisSnapCandidate[] = []
  if (!shouldSnapY) return candidates

  const { top, bottom } = bounds
  let resolvedOriginY: 'top' | 'center' | 'bottom' = 'top'
  if (originY === 'center' || originY === 'bottom') {
    resolvedOriginY = originY
  }

  const controlEdge = resolveControlMovingYEdge({ controlKey: corner })
  if (controlEdge && resolvedOriginY !== 'center') {
    candidates.push({
      edge: controlEdge,
      position: controlEdge === 'top' ? top : bottom
    })

    return candidates
  }

  if (resolvedOriginY === 'top') {
    candidates.push({
      edge: 'bottom',
      position: bottom
    })
  }

  if (resolvedOriginY === 'bottom') {
    candidates.push({
      edge: 'top',
      position: top
    })
  }

  if (resolvedOriginY === 'center') {
    candidates.push({
      edge: 'top',
      position: top
    })
    candidates.push({
      edge: 'bottom',
      position: bottom
    })
  }

  return candidates
}

/** Returns the X edge moved by the user with the current resize control. */
function resolveControlMovingXEdge({ controlKey }: { controlKey: string }): 'left' | 'right' | null {
  if (controlKey === 'tl' || controlKey === 'bl' || controlKey === 'ml') return 'left'
  if (controlKey === 'tr' || controlKey === 'br' || controlKey === 'mr') return 'right'

  return null
}

/** Returns the Y edge moved by the user with the current resize control. */
function resolveControlMovingYEdge({ controlKey }: { controlKey: string }): 'top' | 'bottom' | null {
  if (controlKey === 'tl' || controlKey === 'tr' || controlKey === 'mt') return 'top'
  if (controlKey === 'bl' || controlKey === 'br' || controlKey === 'mb') return 'bottom'

  return null
}

/**
 * Finds the nearest snap candidate within the threshold and returns the delta.
 */
function findAxisSnapCandidate({
  anchors,
  candidates,
  threshold
}: {
  anchors: number[]
  candidates: AxisSnapCandidate[]
  threshold: number
}): AxisSnapResult {
  let nearestDelta = 0
  let nearestDistance = threshold + 1
  let guidePosition: number | null = null
  let candidate: AxisSnapCandidate | null = null

  for (const snapCandidate of candidates) {
    const { position } = snapCandidate

    for (const anchor of anchors) {
      const distance = Math.abs(anchor - position)
      if (distance > threshold || distance >= nearestDistance) continue

      nearestDelta = anchor - position
      nearestDistance = distance
      guidePosition = anchor
      candidate = snapCandidate
    }
  }

  return {
    delta: nearestDelta,
    guidePosition,
    candidate
  }
}

/**
 * Calculates the uniform scale factor and corresponding guide.
 */
function resolveUniformScale({
  bounds,
  originX,
  originY,
  verticalSnap,
  horizontalSnap
}: {
  bounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  verticalSnap: AxisSnapResult
  horizontalSnap: AxisSnapResult
}): UniformScaleResult | null {
  const scaleFactorX = resolveUniformScaleFactorForWidth({
    bounds,
    originX,
    snap: verticalSnap
  })
  const scaleFactorY = resolveUniformScaleFactorForHeight({
    bounds,
    originY,
    snap: horizontalSnap
  })
  const chosenAxis = chooseUniformScaleAxis({
    scaleFactorX,
    scaleFactorY,
    verticalSnap,
    horizontalSnap
  })
  let primarySnap: UniformScaleSnap | null = null

  if (chosenAxis === 'x') {
    primarySnap = createUniformScaleSnap({
      type: 'vertical',
      scaleFactor: scaleFactorX,
      snap: verticalSnap
    })
  }

  if (chosenAxis === 'y') {
    primarySnap = createUniformScaleSnap({
      type: 'horizontal',
      scaleFactor: scaleFactorY,
      snap: horizontalSnap
    })
  }

  if (!primarySnap) return null

  const snapGuards = collectMatchingUniformScaleSnapGuards({
    scaleFactor: primarySnap.scaleFactor,
    scaleFactorX,
    scaleFactorY,
    verticalSnap,
    horizontalSnap
  })
  if (snapGuards.length === 0) return null

  return {
    guide: primarySnap.guide,
    snapGuards,
    scaleFactor: primarySnap.scaleFactor
  }
}

/**
 * Creates a snap result for one axis of uniform scaling.
 */
function createUniformScaleSnap({
  type,
  scaleFactor,
  snap
}: {
  type: GuideLine['type']
  scaleFactor: number | null
  snap: AxisSnapResult
}): UniformScaleSnap | null {
  const { guidePosition } = snap
  if (scaleFactor === null || guidePosition === null) return null

  const snapGuard = createScaleSnapGuard({
    type,
    snap
  })
  if (!snapGuard) return null

  return {
    scaleFactor,
    snapGuard,
    guide: {
      type,
      position: guidePosition
    }
  }
}

/**
 * Collects guards for axes matching the selected uniform scale factor.
 */
function collectMatchingUniformScaleSnapGuards({
  scaleFactor,
  scaleFactorX,
  scaleFactorY,
  verticalSnap,
  horizontalSnap
}: {
  scaleFactor: number
  scaleFactorX: number | null
  scaleFactorY: number | null
  verticalSnap: AxisSnapResult
  horizontalSnap: AxisSnapResult
}): ScalingStepSnapGuard[] {
  const snapGuards: ScalingStepSnapGuard[] = []

  addUniformScaleSnapGuardIfMatching({
    snapGuards,
    scaleFactor,
    axisScaleFactor: scaleFactorX,
    type: 'vertical',
    snap: verticalSnap
  })
  addUniformScaleSnapGuardIfMatching({
    snapGuards,
    scaleFactor,
    axisScaleFactor: scaleFactorY,
    type: 'horizontal',
    snap: horizontalSnap
  })

  return snapGuards
}

/**
 * Adds a guard only if the axis actually matches the selected uniform scale.
 */
function addUniformScaleSnapGuardIfMatching({
  snapGuards,
  scaleFactor,
  axisScaleFactor,
  type,
  snap
}: {
  snapGuards: ScalingStepSnapGuard[]
  scaleFactor: number
  axisScaleFactor: number | null
  type: GuideLine['type']
  snap: AxisSnapResult
}): void {
  if (axisScaleFactor === null) return
  if (Math.abs(axisScaleFactor - scaleFactor) > UNIFORM_SCALE_FACTOR_EPSILON) return

  const snapGuard = createScaleSnapGuard({
    type,
    snap
  })
  if (!snapGuard) return

  snapGuards.push(snapGuard)
}

/**
 * Creates a guard for subsequent pixel-grid rounding of an already held edge.
 */
function createScaleSnapGuard({
  type,
  snap
}: {
  type: GuideLine['type']
  snap: AxisSnapResult
}): ScalingStepSnapGuard | null {
  const { candidate, guidePosition } = snap
  if (!candidate || guidePosition === null) return null

  return {
    type,
    edge: candidate.edge,
    position: guidePosition
  }
}

function resolveUniformScaleFactorForWidth({
  bounds,
  originX,
  snap
}: {
  bounds: Bounds
  originX: Transform['originX']
  snap: AxisSnapResult
}): number | null {
  const { left, right } = bounds
  const currentWidth = right - left
  if (snap.guidePosition === null || currentWidth <= 0) return null

  const desiredWidth = resolveDesiredWidth({ bounds, originX, snap })
  if (desiredWidth === null) return null

  const factor = desiredWidth / currentWidth
  if (!Number.isFinite(factor) || factor <= 0) return null

  return factor
}

function resolveUniformScaleFactorForHeight({
  bounds,
  originY,
  snap
}: {
  bounds: Bounds
  originY: Transform['originY']
  snap: AxisSnapResult
}): number | null {
  const { top, bottom } = bounds
  const currentHeight = bottom - top
  if (snap.guidePosition === null || currentHeight <= 0) return null

  const desiredHeight = resolveDesiredHeight({ bounds, originY, snap })
  if (desiredHeight === null) return null

  const factor = desiredHeight / currentHeight
  if (!Number.isFinite(factor) || factor <= 0) return null

  return factor
}

function chooseUniformScaleAxis({
  scaleFactorX,
  scaleFactorY,
  verticalSnap,
  horizontalSnap
}: {
  scaleFactorX: number | null
  scaleFactorY: number | null
  verticalSnap: AxisSnapResult
  horizontalSnap: AxisSnapResult
}): 'x' | 'y' | null {
  if (scaleFactorX !== null && scaleFactorY === null) return 'x'
  if (scaleFactorY !== null && scaleFactorX === null) return 'y'
  if (scaleFactorX === null || scaleFactorY === null) return null

  const absVerticalDelta = Math.abs(verticalSnap.delta)
  const absHorizontalDelta = Math.abs(horizontalSnap.delta)

  if (absVerticalDelta <= absHorizontalDelta) return 'x'

  return 'y'
}

/**
 * Calculates the bounding box width required for snapping on X.
 */
function resolveDesiredWidth({
  bounds,
  originX,
  snap
}: {
  bounds: Bounds
  originX: Transform['originX']
  snap: AxisSnapResult
}): number | null {
  const { left, right, centerX } = bounds
  const { candidate, guidePosition } = snap
  if (!candidate || guidePosition === null) return null

  let resolvedOriginX: 'left' | 'center' | 'right' = 'left'
  if (originX === 'center' || originX === 'right') {
    resolvedOriginX = originX
  }

  const { edge } = candidate
  let desiredWidth: number | null = null

  if (resolvedOriginX !== 'center' && edge === 'left') {
    desiredWidth = right - guidePosition
  }
  if (resolvedOriginX !== 'center' && edge === 'right') {
    desiredWidth = guidePosition - left
  }
  if (resolvedOriginX === 'center' && edge === 'left') {
    desiredWidth = (centerX - guidePosition) * 2
  }
  if (resolvedOriginX === 'center' && edge === 'right') {
    desiredWidth = (guidePosition - centerX) * 2
  }

  if (desiredWidth === null) return null
  if (!Number.isFinite(desiredWidth) || desiredWidth <= 0) return null

  return desiredWidth
}

/**
 * Calculates the bounding box height required for snapping on Y.
 */
function resolveDesiredHeight({
  bounds,
  originY,
  snap
}: {
  bounds: Bounds
  originY: Transform['originY']
  snap: AxisSnapResult
}): number | null {
  const { top, bottom, centerY } = bounds
  const { candidate, guidePosition } = snap
  if (!candidate || guidePosition === null) return null

  let resolvedOriginY: 'top' | 'center' | 'bottom' = 'top'
  if (originY === 'center' || originY === 'bottom') {
    resolvedOriginY = originY
  }

  const { edge } = candidate
  let desiredHeight: number | null = null

  if (resolvedOriginY !== 'center' && edge === 'top') {
    desiredHeight = bottom - guidePosition
  }
  if (resolvedOriginY !== 'center' && edge === 'bottom') {
    desiredHeight = guidePosition - top
  }
  if (resolvedOriginY === 'center' && edge === 'top') {
    desiredHeight = (centerY - guidePosition) * 2
  }
  if (resolvedOriginY === 'center' && edge === 'bottom') {
    desiredHeight = (guidePosition - centerY) * 2
  }

  if (desiredHeight === null) return null
  if (!Number.isFinite(desiredHeight) || desiredHeight <= 0) return null

  return desiredHeight
}

/**
 * Returns the unscaled base object dimensions, including text padding.
 */
function resolveBaseDimensions({ target }: { target: FabricObject }): { width: number; height: number } {
  const {
    width: rawWidth = 0,
    height: rawHeight = 0
  } = target
  let width = rawWidth
  let height = rawHeight

  if (target instanceof Textbox) {
    const {
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      strokeWidth = 0
    } = target
    width = rawWidth + paddingLeft + paddingRight + strokeWidth
    height = rawHeight + paddingTop + paddingBottom + strokeWidth
  }

  return {
    width,
    height
  }
}

/** Linear part of the object transform: how each local axis contributes to scene X and Y. */
type LinearTransform = {
  xFromX: number
  xFromY: number
  yFromX: number
  yFromY: number
}

/** One term `|slope * scale + offset|` of a bounds size that is linear in the scale being solved. */
type BoundsSizeTerm = {
  slope: number
  offset: number
}

/** Slope below which a bounds size term does not depend on the scale. */
const BOUNDS_SLOPE_EPSILON = 0.000000001

/**
 * Calculates the scale on one axis that gives the object bounds the desired size on that axis.
 * The bounds width is `|xFromX| * width + |xFromY| * height`, and every entry of the rotation, scale and skew
 * matrix is linear in the scale being solved, so the size is a sum of absolute linear terms. Skew adds the other
 * axis to the bounds, so a formula that only accounts for rotation overshoots the guide on a skewed object.
 * Of the scales that reach the size, the one closest to the current scale wins.
 */
function resolveScaleForBoundsSize({
  target,
  axis,
  desiredSize,
  scaleX,
  scaleY
}: {
  target: FabricObject
  axis: 'x' | 'y'
  desiredSize: number
  scaleX: number
  scaleY: number
}): number | null {
  const { width, height } = resolveBaseDimensions({ target })
  const fixedScaleX = Math.abs(scaleX) || 1
  const fixedScaleY = Math.abs(scaleY) || 1
  const transformAt = (scale: number): LinearTransform => getLinearTransform({
    target,
    scaleX: axis === 'x' ? scale : fixedScaleX,
    scaleY: axis === 'y' ? scale : fixedScaleY
  })
  const atZero = transformAt(0)
  const atOne = transformAt(1)
  const terms = axis === 'x'
    ? [
      { slope: (atOne.xFromX - atZero.xFromX) * width, offset: atZero.xFromX * width },
      { slope: (atOne.xFromY - atZero.xFromY) * height, offset: atZero.xFromY * height }
    ]
    : [
      { slope: (atOne.yFromX - atZero.yFromX) * width, offset: atZero.yFromX * width },
      { slope: (atOne.yFromY - atZero.yFromY) * height, offset: atZero.yFromY * height }
    ]

  return solveAbsoluteSum({
    terms,
    value: desiredSize,
    closestTo: axis === 'x' ? fixedScaleX : fixedScaleY
  })
}

/**
 * Returns the linear part of Fabric's object transform: rotation of the signed scale, skewX and skewY.
 * A flip or a negative scale mirrors an axis before skew and rotation mix the axes, so the sign changes the bounds
 * of a rotated skewed object even though the scale passed in is a magnitude.
 */
function getLinearTransform({
  target,
  scaleX,
  scaleY
}: {
  target: FabricObject
  scaleX: number
  scaleY: number
}): LinearTransform {
  const {
    angle = 0,
    skewX = 0,
    skewY = 0,
    flipX = false,
    flipY = false,
    scaleX: targetScaleX = 1,
    scaleY: targetScaleY = 1
  } = target
  const radians = (angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const tanX = Math.tan((skewX * Math.PI) / 180)
  const tanY = Math.tan((skewY * Math.PI) / 180)
  const signedScaleX = scaleX * Math.sign(targetScaleX || 1) * (flipX ? -1 : 1)
  const signedScaleY = scaleY * Math.sign(targetScaleY || 1) * (flipY ? -1 : 1)
  const scaledXFromX = signedScaleX * (1 + (tanX * tanY))
  const scaledXFromY = signedScaleX * tanX
  const scaledYFromX = signedScaleY * tanY

  return {
    xFromX: (cos * scaledXFromX) - (sin * scaledYFromX),
    xFromY: (cos * scaledXFromY) - (sin * signedScaleY),
    yFromX: (sin * scaledXFromX) + (cos * scaledYFromX),
    yFromY: (sin * scaledXFromY) + (cos * signedScaleY)
  }
}

/**
 * Solves `sum(|slope * scale + offset|) = value` for a positive scale and returns the solution closest to
 * `closestTo`, or null when the value is unreachable. The sum is linear between the points where a term changes
 * sign, so each such segment is solved directly.
 */
function solveAbsoluteSum({
  terms,
  value,
  closestTo
}: {
  terms: BoundsSizeTerm[]
  value: number
  closestTo: number
}): number | null {
  const signChanges = terms
    .filter(({ slope }) => Math.abs(slope) > BOUNDS_SLOPE_EPSILON)
    .map(({ slope, offset }) => -offset / slope)
    .filter((point) => point > 0)
  const segmentStarts = [0, ...signChanges].sort((first, second) => first - second)
  const solutions = segmentStarts.flatMap((start, index) => {
    const end = segmentStarts[index + 1] ?? Infinity
    const probe = Number.isFinite(end) ? (start + end) / 2 : start + 1
    const { slope, offset } = terms.reduce((sum, term) => {
      const sign = (term.slope * probe) + term.offset < 0 ? -1 : 1

      return { slope: sum.slope + (sign * term.slope), offset: sum.offset + (sign * term.offset) }
    }, { slope: 0, offset: 0 })
    if (Math.abs(slope) <= BOUNDS_SLOPE_EPSILON) return []

    const scale = (value - offset) / slope
    return scale > 0 && scale >= start && scale <= end ? [scale] : []
  })
  if (!solutions.length) return null

  return solutions.reduce((best, scale) => {
    return Math.abs(scale - closestTo) < Math.abs(best - closestTo) ? scale : best
  })
}

/** Converts the text frame width to its canonical width. */
function resolveTextWidthForBounds({
  target,
  boundsWidth
}: {
  target: Textbox
  boundsWidth: number
}): number | null {
  const {
    paddingLeft = 0,
    paddingRight = 0,
    strokeWidth = 0
  } = target
  const rawWidth = boundsWidth - paddingLeft - paddingRight - strokeWidth
  if (!Number.isFinite(rawWidth) || rawWidth <= 0) return null

  return Math.max(1, Math.round(rawWidth))
}
