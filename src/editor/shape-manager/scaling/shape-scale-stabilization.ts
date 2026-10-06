import {
  type RectangularScaleGestureProjection,
  type RectangularScaleGestureMode,
  type RectangularScaleModeProjection,
  type RectangularScaleMultipliers,
  type RectangularScalePoint,
  type RectangularScaleProjectionVariable,
  type RectangularScaleSceneEdge,
  resolveRectangularScaleModeProjection
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'

/** Data for rounding unconstrained Shape dimensions to whole pixels. */
type ShapeScaleStabilizationOptions = Readonly<{
  projection: RectangularScaleGestureProjection
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  protectedEdges: readonly RectangularScaleSceneEdge[]
}>

/** Scale mode in which width and height can change independently. */
type IndependentRectangularScaleGestureMode = 'horizontal' | 'vertical' | 'free'

/** Tolerance for checking how scale affects an edge's position. */
const SHAPE_SCALE_DEPENDENCY_EPSILON = 0.000000001

/** Checks whether a number is positive and finite. */
function assertPositiveFiniteNumber({
  value,
  name
}: {
  value: number
  name: string
}): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`)
  }
}

/** Returns the length of the Shape's original axis. */
function getInitialAxisLength({
  vector,
  name
}: {
  vector: RectangularScalePoint
  name: string
}): number {
  const length = Math.sqrt((vector.x ** 2) + (vector.y ** 2))

  assertPositiveFiniteNumber({ value: length, name })

  return length
}

/** Returns a valid edge calculation for the selected scale mode. */
function resolveScaleProjection({
  projection,
  mode
}: {
  projection: RectangularScaleGestureProjection
  mode: RectangularScaleGestureMode
}): RectangularScaleModeProjection {
  const modeProjection = resolveRectangularScaleModeProjection({ projection, mode })
  if (!modeProjection) {
    throw new Error(`Shape scale mode "${mode}" is not supported by control "${projection.controlKey}"`)
  }

  const hasInvalidEdge = modeProjection.edges.some(({ coefficients }) => {
    return coefficients.length !== modeProjection.variables.length
      || coefficients.some((coefficient) => !Number.isFinite(coefficient))
  })
  if (hasInvalidEdge) {
    throw new Error('Shape scale mode projection contains invalid edge coefficients')
  }

  return modeProjection
}

/** Returns scale variables locked by active guides. */
function resolveSnappedVariables({
  modeProjection,
  protectedEdges
}: {
  modeProjection: RectangularScaleModeProjection
  protectedEdges: readonly RectangularScaleSceneEdge[]
}): ReadonlySet<RectangularScaleProjectionVariable> {
  const snappedEdgeSet = new Set(protectedEdges)
  const snappedVariables = new Set<RectangularScaleProjectionVariable>()

  modeProjection.edges.forEach(({ edge, coefficients }) => {
    if (!snappedEdgeSet.has(edge)) return

    coefficients.forEach((coefficient, index) => {
      if (Math.abs(coefficient) <= SHAPE_SCALE_DEPENDENCY_EPSILON) return

      snappedVariables.add(modeProjection.variables[index])
    })
  })

  return snappedVariables
}

/** Returns the multiplier for the nearest positive integer dimension. */
function resolveRoundedMultiplier({
  multiplier,
  initialLength
}: {
  multiplier: number
  initialLength: number
}): number {
  const roundedLength = Math.max(1, Math.round(initialLength * multiplier))

  return roundedLength / initialLength
}

/** Selects the proportional multiplier with the smallest rounding error. */
function resolveRoundedUniformMultiplier({
  multiplier,
  width,
  height
}: {
  multiplier: number
  width: number
  height: number
}): number {
  const widthCandidate = resolveRoundedMultiplier({ multiplier, initialLength: width })
  const heightCandidate = resolveRoundedMultiplier({ multiplier, initialLength: height })
  const widthError = Math.abs(widthCandidate - multiplier)
  const heightError = Math.abs(heightCandidate - multiplier)

  return widthError <= heightError ? widthCandidate : heightCandidate
}

/** Creates a pair of Shape multipliers. */
function createMultipliers({
  x,
  y
}: {
  x: number
  y: number
}): RectangularScaleMultipliers {
  return Object.freeze({ x, y })
}

/** Rounds an axis multiplier unless it is locked to a guide. */
function stabilizeAxisMultiplier({
  variable,
  multiplier,
  initialLength,
  snappedVariables
}: {
  variable: 'multiplier-x' | 'multiplier-y'
  multiplier: number
  initialLength: number
  snappedVariables: ReadonlySet<RectangularScaleProjectionVariable>
}): number {
  if (snappedVariables.has(variable)) return multiplier

  return resolveRoundedMultiplier({ multiplier, initialLength })
}

/** Rounds unconstrained width and height for nonproportional scaling. */
function stabilizeIndependentMultipliers({
  mode,
  multipliers,
  width,
  height,
  snappedVariables
}: {
  mode: IndependentRectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  width: number
  height: number
  snappedVariables: ReadonlySet<RectangularScaleProjectionVariable>
}): RectangularScaleMultipliers {
  const x = mode === 'vertical'
    ? 1
    : stabilizeAxisMultiplier({
      variable: 'multiplier-x',
      multiplier: multipliers.x,
      initialLength: width,
      snappedVariables
    })
  const y = mode === 'horizontal'
    ? 1
    : stabilizeAxisMultiplier({
      variable: 'multiplier-y',
      multiplier: multipliers.y,
      initialLength: height,
      snappedVariables
    })

  return createMultipliers({ x, y })
}

/** Rounds the single proportional-scale multiplier. */
function stabilizeUniformMultipliers({
  multipliers,
  width,
  height,
  snappedVariables
}: {
  multipliers: RectangularScaleMultipliers
  width: number
  height: number
  snappedVariables: ReadonlySet<RectangularScaleProjectionVariable>
}): RectangularScaleMultipliers {
  if (multipliers.x !== multipliers.y) {
    throw new Error('Uniform Shape scale requires equal x and y multipliers')
  }

  const multiplier = snappedVariables.has('uniform-multiplier')
    ? multipliers.x
    : resolveRoundedUniformMultiplier({ multiplier: multipliers.x, width, height })

  return createMultipliers({ x: multiplier, y: multiplier })
}

/**
 * Rounds unconstrained Shape dimensions to whole pixels.
 * Dimensions locked by an active guide remain unchanged.
 */
export function stabilizeShapeScaleMultipliers({
  projection,
  mode,
  multipliers,
  protectedEdges
}: ShapeScaleStabilizationOptions): RectangularScaleMultipliers {
  const width = getInitialAxisLength({ vector: projection.u, name: 'Shape scale initial width' })
  const height = getInitialAxisLength({ vector: projection.v, name: 'Shape scale initial height' })
  assertPositiveFiniteNumber({ value: multipliers.x, name: 'Shape scale multiplier x' })
  assertPositiveFiniteNumber({ value: multipliers.y, name: 'Shape scale multiplier y' })

  const modeProjection = resolveScaleProjection({ projection, mode })
  const snappedVariables = resolveSnappedVariables({ modeProjection, protectedEdges })

  if (mode === 'uniform') {
    return stabilizeUniformMultipliers({
      multipliers,
      width,
      height,
      snappedVariables
    })
  }

  return stabilizeIndependentMultipliers({
    mode,
    multipliers,
    width,
    height,
    snappedVariables
  })
}
