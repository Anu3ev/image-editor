import {
  resolveShapeScaleModeProjection,
  type ShapeScaleGestureMode,
  type ShapeScaleGestureProjection,
  type ShapeScaleModeProjection,
  type ShapeScaleMultipliers,
  type ShapeScaleProjectionVariable,
  type ShapeScaleSceneEdge,
  type ShapeScalePoint
} from './shape-scale-projection'

/** Данные для округления свободных размеров Shape до целых пикселей. */
type ShapeScaleStabilizationOptions = Readonly<{
  projection: ShapeScaleGestureProjection
  mode: ShapeScaleGestureMode
  multipliers: ShapeScaleMultipliers
  protectedEdges: readonly ShapeScaleSceneEdge[]
}>

/** Режим scale, в котором ширину и высоту можно менять независимо. */
type IndependentShapeScaleGestureMode = 'horizontal' | 'vertical' | 'free'

/** Допуск при проверке влияния scale на положение грани. */
const SHAPE_SCALE_DEPENDENCY_EPSILON = 0.000000001

/** Проверяет, что число является положительным и конечным. */
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

/** Возвращает длину исходной оси Shape. */
function getInitialAxisLength({
  vector,
  name
}: {
  vector: ShapeScalePoint
  name: string
}): number {
  const length = Math.sqrt((vector.x ** 2) + (vector.y ** 2))

  assertPositiveFiniteNumber({ value: length, name })

  return length
}

/** Возвращает корректный расчёт граней для выбранного режима scale. */
function resolveScaleProjection({
  projection,
  mode
}: {
  projection: ShapeScaleGestureProjection
  mode: ShapeScaleGestureMode
}): ShapeScaleModeProjection {
  const modeProjection = resolveShapeScaleModeProjection({ projection, mode })
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

/** Возвращает переменные scale, зафиксированные активными guide. */
function resolveSnappedVariables({
  modeProjection,
  protectedEdges
}: {
  modeProjection: ShapeScaleModeProjection
  protectedEdges: readonly ShapeScaleSceneEdge[]
}): ReadonlySet<ShapeScaleProjectionVariable> {
  const snappedEdgeSet = new Set(protectedEdges)
  const snappedVariables = new Set<ShapeScaleProjectionVariable>()

  modeProjection.edges.forEach(({ edge, coefficients }) => {
    if (!snappedEdgeSet.has(edge)) return

    coefficients.forEach((coefficient, index) => {
      if (Math.abs(coefficient) <= SHAPE_SCALE_DEPENDENCY_EPSILON) return

      snappedVariables.add(modeProjection.variables[index])
    })
  })

  return snappedVariables
}

/** Возвращает множитель для ближайшего положительного целого размера. */
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

/** Выбирает пропорциональный множитель с наименьшей ошибкой округления. */
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

/** Создаёт пару множителей Shape. */
function createMultipliers({
  x,
  y
}: {
  x: number
  y: number
}): ShapeScaleMultipliers {
  return Object.freeze({ x, y })
}

/** Округляет множитель оси, если она не зафиксирована на guide. */
function stabilizeAxisMultiplier({
  variable,
  multiplier,
  initialLength,
  snappedVariables
}: {
  variable: 'multiplier-x' | 'multiplier-y'
  multiplier: number
  initialLength: number
  snappedVariables: ReadonlySet<ShapeScaleProjectionVariable>
}): number {
  if (snappedVariables.has(variable)) return multiplier

  return resolveRoundedMultiplier({ multiplier, initialLength })
}

/** Округляет свободные ширину и высоту для непропорционального scale. */
function stabilizeIndependentMultipliers({
  mode,
  multipliers,
  width,
  height,
  snappedVariables
}: {
  mode: IndependentShapeScaleGestureMode
  multipliers: ShapeScaleMultipliers
  width: number
  height: number
  snappedVariables: ReadonlySet<ShapeScaleProjectionVariable>
}): ShapeScaleMultipliers {
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

/** Округляет единый множитель пропорционального scale. */
function stabilizeUniformMultipliers({
  multipliers,
  width,
  height,
  snappedVariables
}: {
  multipliers: ShapeScaleMultipliers
  width: number
  height: number
  snappedVariables: ReadonlySet<ShapeScaleProjectionVariable>
}): ShapeScaleMultipliers {
  if (multipliers.x !== multipliers.y) {
    throw new Error('Uniform Shape scale requires equal x and y multipliers')
  }

  const multiplier = snappedVariables.has('uniform-multiplier')
    ? multipliers.x
    : resolveRoundedUniformMultiplier({ multiplier: multipliers.x, width, height })

  return createMultipliers({ x: multiplier, y: multiplier })
}

/**
 * Округляет свободные размеры Shape до целых пикселей.
 * Размеры, зафиксированные активной guide, остаются без изменений.
 */
export function stabilizeShapeScaleMultipliers({
  projection,
  mode,
  multipliers,
  protectedEdges
}: ShapeScaleStabilizationOptions): ShapeScaleMultipliers {
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
