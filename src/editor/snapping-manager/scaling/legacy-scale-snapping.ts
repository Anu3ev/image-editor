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
import { resolveOriginOffset } from '../../utils/geometry'

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
  originY,
  scaleX,
  scaleY,
  verticalSnap
}: ScaleSnapContext): AxisScaleUpdate | null {
  const { candidate, guidePosition } = verticalSnap
  if (guidePosition === null || !candidate) return null

  const absNextScaleX = resolveScaleForEdgePosition({
    target,
    axis: 'x',
    edge: candidate.edge,
    edgePosition: guidePosition,
    bounds,
    originX,
    originY,
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
  originX,
  originY,
  scaleX,
  scaleY,
  horizontalSnap
}: ScaleSnapContext): AxisScaleUpdate | null {
  const { candidate, guidePosition } = horizontalSnap
  if (guidePosition === null || !candidate) return null

  const absNextScaleY = resolveScaleForEdgePosition({
    target,
    axis: 'y',
    edge: candidate.edge,
    edgePosition: guidePosition,
    bounds,
    originX,
    originY,
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

/** Position of one object corner relative to the fixed point on one scene axis: `slope * scale + offset`. */
type CornerOffsetTerm = {
  slope: number
  offset: number
}

/** Slope below which a corner offset does not depend on the scale. */
const CORNER_SLOPE_EPSILON = 0.000000001

/** Relative tolerance for checking that a solved scale puts the moving edge on the guide. */
const EDGE_POSITION_EPSILON = 0.000001

/**
 * Calculates the scale on one axis that puts the moving bounds edge of the object on the guide.
 * The fixed point of the transform stays in place, and every corner offset from it is linear in the scale being
 * solved, so the moving edge is the largest or smallest of those offsets. Rotation combined with skew also moves
 * the opposite bounds edge, which is why the edge itself is solved rather than the bounds size. Without rotation
 * and skew this is `(guide - fixed edge) / size`. Of the scales that reach the guide, the closest to the current
 * scale wins.
 */
function resolveScaleForEdgePosition({
  target,
  axis,
  edge,
  edgePosition,
  bounds,
  originX,
  originY,
  scaleX,
  scaleY
}: {
  target: FabricObject
  axis: 'x' | 'y'
  edge: AxisSnapEdge
  edgePosition: number
  bounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  scaleX: number
  scaleY: number
}): number | null {
  const terms = getCornerOffsetTerms({ target, axis, originX, originY, scaleX, scaleY })
  const currentScale = axis === 'x' ? Math.abs(scaleX) || 1 : Math.abs(scaleY) || 1
  const offsetAt = ({ scale, extreme }: { scale: number, extreme: 'min' | 'max' }): number => {
    return Math[extreme](...terms.map(({ slope, offset }) => (slope * scale) + offset))
  }
  // The bounds start edge holds the smallest corner offset, which gives the fixed point in scene coordinates.
  const fixedPosition = (axis === 'x' ? bounds.left : bounds.top) - offsetAt({ scale: currentScale, extreme: 'min' })
  const movingExtreme = edge === 'right' || edge === 'bottom' ? 'max' : 'min'
  const targetOffset = edgePosition - fixedPosition
  const tolerance = EDGE_POSITION_EPSILON * Math.max(1, Math.abs(targetOffset))
  const solutions = terms
    .filter(({ slope }) => Math.abs(slope) > CORNER_SLOPE_EPSILON)
    .map(({ slope, offset }) => (targetOffset - offset) / slope)
    .filter((scale) => {
      return scale > 0 && Math.abs(offsetAt({ scale, extreme: movingExtreme }) - targetOffset) <= tolerance
    })
  if (!solutions.length) return null

  return solutions.reduce((best, scale) => {
    return Math.abs(scale - currentScale) < Math.abs(best - currentScale) ? scale : best
  })
}

/**
 * Returns how far each corner of the object bounds box lies from the fixed point of the transform on one scene
 * axis, as a linear function of the scale on the matching object axis.
 * Fabric measures a skewed object by the box around its skewed shape before rotation: its bounds and selection
 * frame are that box rotated, and the origin point of that box stays fixed while scaling. Fabric adds a regular
 * stroke to the shape before scaling and skew and a uniform stroke to the box after them, so each box side is
 * `growth * scale + fixed`, and only the solved axis grows with the scale being solved. That keeps every corner
 * offset linear in it. The box is symmetric, so flips do not change it.
 */
function getCornerOffsetTerms({
  target,
  axis,
  originX,
  originY,
  scaleX,
  scaleY
}: {
  target: FabricObject
  axis: 'x' | 'y'
  originX: Transform['originX']
  originY: Transform['originY']
  scaleX: number
  scaleY: number
}): CornerOffsetTerm[] {
  const { width, height } = resolveBaseDimensions({ target })
  const { angle = 0, strokeWidth = 0, strokeUniform = false } = target
  // Text already counts its stroke in the base dimensions.
  const isText = target instanceof Textbox
  const preScaleStroke = isText || strokeUniform ? 0 : strokeWidth
  const postScaleStroke = !isText && strokeUniform ? strokeWidth : 0
  const radians = (angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const skewedCorners = getSkewedCorners({ target, width: width + preScaleStroke, height: height + preScaleStroke })
  const boxX = getBoxSideTerm({
    range: getRange(skewedCorners.map(({ x }) => x)),
    scale: scaleX,
    isSolved: axis === 'x',
    postScaleStroke
  })
  const boxY = getBoxSideTerm({
    range: getRange(skewedCorners.map(({ y }) => y)),
    scale: scaleY,
    isSolved: axis === 'y',
    postScaleStroke
  })

  // After rotation, scene X is `cos * x - sin * y` and scene Y is `sin * x + cos * y`.
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([cornerX, cornerY]) => {
    const shareX = (cornerX / 2) - resolveOriginOffset({ origin: originX })
    const shareY = (cornerY / 2) - resolveOriginOffset({ origin: originY })
    const [rotateX, rotateY] = axis === 'x' ? [cos, -sin] : [sin, cos]

    return {
      slope: (rotateX * shareX * boxX.growth) + (rotateY * shareY * boxY.growth),
      offset: (rotateX * shareX * boxX.fixed) + (rotateY * shareY * boxY.fixed)
    }
  })
}

/** One side of the object bounds box before rotation: `growth * scale + fixed`. */
type BoxSideTerm = {
  growth: number
  fixed: number
}

/**
 * Returns one box side as a function of the solved scale. A side on the other axis keeps its current scale.
 */
function getBoxSideTerm({
  range,
  scale,
  isSolved,
  postScaleStroke
}: {
  range: number
  scale: number
  isSolved: boolean
  postScaleStroke: number
}): BoxSideTerm {
  if (isSolved) return { growth: range, fixed: postScaleStroke }

  return { growth: 0, fixed: (range * (Math.abs(scale) || 1)) + postScaleStroke }
}

/**
 * Returns the corners of a shape of the given size after Fabric's skewX, then skewY, at scale 1 and before rotation.
 */
function getSkewedCorners({
  target,
  width,
  height
}: {
  target: FabricObject
  width: number
  height: number
}): Array<{ x: number, y: number }> {
  const { skewX = 0, skewY = 0 } = target
  const tanX = Math.tan((skewX * Math.PI) / 180)
  const tanY = Math.tan((skewY * Math.PI) / 180)

  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([cornerX, cornerY]) => {
    const x = cornerX * (width / 2)
    const y = cornerY * (height / 2)

    return { x: ((1 + (tanX * tanY)) * x) + (tanX * y), y: (tanY * x) + y }
  })
}

/**
 * Returns the distance between the smallest and the largest value.
 */
function getRange(values: number[]): number {
  return Math.max(...values) - Math.min(...values)
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
