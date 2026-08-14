import type { Transform } from 'fabric'
import type { ObjectBounds } from '../../utils/geometry'
import type {
  ScaleProjectionEdgeInput,
  ScaleSceneEdge
} from '../../snapping-manager/scaling/scale-projection'
import type {
  ScaleProjectionModeInput,
  ScaleStepProjectionInput
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import {
  createRectangularScaleGestureProjection,
  createRectangularScaleProjectionModes,
  resolveRectangularScaleMovingEdges,
  resolveRectangularScalePointerMultipliers,
  type RectangularScaleGestureProjection,
  type RectangularScalePoint
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { EditorTextbox } from '../types'

/** Идентификатор пропорционального режима углового скейлинга отдельного текста. */
export const TEXT_CORNER_SCALE_PROJECTION_MODE = 'uniform'

/** Исходная геометрия углового скейлинга отдельного текста. */
export type TextCornerScaleGestureProjection = Readonly<{
  baselineBounds: ObjectBounds
  fixedAnchor: RectangularScalePoint
  movingEdges: readonly ScaleSceneEdge[]
  projectionMode: ScaleProjectionModeInput
  rectangular: RectangularScaleGestureProjection
}>

/** Измеренная геометрия текста рядом с проверяемым множителем. */
export type TextCornerScaleProjectionSample = Readonly<{
  bounds: ObjectBounds
  scale: number
}>

/** Допуск определения локального участка, на котором грань ещё не меняется. */
const TEXT_CORNER_SCALE_PROJECTION_EPSILON = 0.000000001

/** Проверяет, что исходное преобразование Fabric содержит положительный множитель. */
function resolveOriginalScales({
  transform
}: {
  transform: Transform
}): Readonly<{ x: number; y: number }> | null {
  const scaleX = transform.original?.scaleX
  const scaleY = transform.original?.scaleY
  if (typeof scaleX !== 'number' || !Number.isFinite(scaleX) || scaleX <= 0) return null
  if (typeof scaleY !== 'number' || !Number.isFinite(scaleY) || scaleY <= 0) return null

  return Object.freeze({ x: scaleX, y: scaleY })
}

/** Выбирает единственный пропорциональный режим из общей прямоугольной проекции. */
function resolveUniformProjectionMode({
  projection
}: {
  projection: RectangularScaleGestureProjection
}): ScaleProjectionModeInput | null {
  return createRectangularScaleProjectionModes({ projection })
    .find(({ id }) => id === TEXT_CORNER_SCALE_PROJECTION_MODE) ?? null
}

/** Фиксирует геометрию углового скейлинга текста до первого изменения объекта. */
export function createTextCornerScaleGestureProjection({
  textbox,
  transform,
  pointerStart
}: {
  textbox: EditorTextbox
  transform: Transform
  pointerStart: RectangularScalePoint
}): TextCornerScaleGestureProjection | null {
  const originalScales = resolveOriginalScales({ transform })
  if (!originalScales) return null

  const rectangular = createRectangularScaleGestureProjection({
    transform: Object.freeze({
      target: textbox,
      action: transform.action,
      corner: transform.corner,
      originX: transform.originX,
      originY: transform.originY,
      original: Object.freeze({
        scaleX: originalScales.x,
        scaleY: originalScales.y
      })
    }),
    pointerStart
  })
  if (!rectangular) return null

  const projectionMode = resolveUniformProjectionMode({ projection: rectangular })
  if (!projectionMode) return null

  return Object.freeze({
    baselineBounds: rectangular.baselineBounds,
    fixedAnchor: rectangular.fixedAnchor,
    movingEdges: resolveRectangularScaleMovingEdges({ projectionModes: [projectionMode] }),
    projectionMode,
    rectangular
  })
}

/** Возвращает пропорциональный множитель из положения указателя относительно начала жеста. */
export function resolveTextCornerScalePointerMultiplier({
  gesture,
  pointer
}: {
  gesture: TextCornerScaleGestureProjection
  pointer: RectangularScalePoint
}): number | null {
  const multipliers = resolveRectangularScalePointerMultipliers({
    projection: gesture.rectangular,
    pointer,
    mode: TEXT_CORNER_SCALE_PROJECTION_MODE
  })
  if (!multipliers || !Number.isFinite(multipliers.x) || multipliers.x <= 0) return null

  return multipliers.x
}

/** Возвращает локальный коэффициент одной грани с учётом нелинейной компоновки текста. */
function resolveTextCornerScaleEdgeCoefficient({
  bounds,
  edge,
  samples,
  scale
}: {
  bounds: ObjectBounds
  edge: ScaleSceneEdge
  samples: readonly TextCornerScaleProjectionSample[]
  scale: number
}): number {
  let selectedCoefficient = 0

  for (const sample of samples) {
    const edgeDelta = sample.bounds[edge] - bounds[edge]
    if (Math.abs(edgeDelta) <= TEXT_CORNER_SCALE_PROJECTION_EPSILON) continue

    const coefficient = edgeDelta / (sample.scale - scale)
    if (Math.abs(coefficient) > Math.abs(selectedCoefficient)) {
      selectedCoefficient = coefficient
    }
  }

  return selectedCoefficient
}

/** Создаёт точную локальную проекцию по соседним каноническим измерениям текста. */
export function createTextCornerScaleStepProjection({
  bounds,
  gesture,
  samples,
  scale
}: {
  bounds: ObjectBounds
  gesture: TextCornerScaleGestureProjection
  samples: readonly TextCornerScaleProjectionSample[]
  scale: number
}): ScaleStepProjectionInput | null {
  if (!Number.isFinite(scale) || scale <= 0) return null
  if (samples.length === 0 || samples.length > 2) return null
  const validSamples = samples.every((sample) => {
    return Number.isFinite(sample.scale)
      && sample.scale > 0
      && Math.abs(sample.scale - scale) > Number.EPSILON
  })
  if (!validSamples) return null
  if (samples.length === 2 && Math.abs(samples[0].scale - samples[1].scale) <= Number.EPSILON) return null

  const edges = gesture.projectionMode.projection.edges.map(({ edge }) => {
    return Object.freeze({
      edge,
      coefficients: Object.freeze([resolveTextCornerScaleEdgeCoefficient({
        bounds,
        edge,
        samples,
        scale
      })])
    })
  }) satisfies readonly ScaleProjectionEdgeInput[]

  return Object.freeze({
    bounds: Object.freeze({ ...bounds }),
    projection: Object.freeze({
      variables: gesture.projectionMode.projection.variables,
      baselineValues: Object.freeze([scale]),
      variableSceneWeights: gesture.projectionMode.projection.variableSceneWeights,
      edges: Object.freeze(edges)
    })
  })
}
