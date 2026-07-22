/* eslint-disable no-use-before-define -- экспортируемая функция объявлена перед внутренними проверками. */
import type {
  ScaleSceneAxis,
  ScaleSceneEdge
} from './scale-projection'
import type {
  ScaleSnapCandidateCategory,
  ScaleSnapCandidateInput
} from './scale-snapping-resolver'
import type { ObjectBounds } from '../utils/geometry'

/** Объект с точными границами, к которым может прилипнуть изменяемый объект. */
export type ScaleSnapCandidateSource = Readonly<{
  id: string
  bounds: ObjectBounds
  edgeCategory?: Extract<ScaleSnapCandidateCategory, 'domain-boundary' | 'edge'>
}>

/** Кандидаты и zoom, зафиксированные в начале одного scale-жеста. */
export type ScaleSnapEnvironment = Readonly<{
  candidates: readonly ScaleSnapCandidateInput[]
  zoom: number
}>

/** Именованная линия исходного объекта до связывания с движущейся гранью. */
type ScaleSnapSourceLine = Readonly<{
  key: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  axis: ScaleSceneAxis
  position: number
  category: Extract<ScaleSnapCandidateCategory, 'domain-boundary' | 'edge' | 'center'>
}>

/**
 * Создаёт упорядоченный список кандидатов для всех движущихся граней объекта.
 */
export function createScaleSnapCandidates({
  targetEdges,
  sources
}: {
  targetEdges: readonly ScaleSceneEdge[]
  sources: readonly ScaleSnapCandidateSource[]
}): readonly ScaleSnapCandidateInput[] {
  assertCandidateInputs({ targetEdges, sources })

  const candidates: ScaleSnapCandidateInput[] = []
  for (const source of sources) {
    const sourceLines = createSourceLines({ source })
    for (const sourceLine of sourceLines) {
      for (const targetEdge of targetEdges) {
        if (resolveEdgeAxis(targetEdge) !== sourceLine.axis) continue

        candidates.push(Object.freeze({
          id: `${source.id}:${sourceLine.key}->${targetEdge}`,
          axis: sourceLine.axis,
          edge: targetEdge,
          position: sourceLine.position,
          category: sourceLine.category
        }))
      }
    }
  }

  return Object.freeze(candidates)
}

/** Проверяет уникальность идентификаторов и корректность исходной геометрии. */
function assertCandidateInputs({
  targetEdges,
  sources
}: {
  targetEdges: readonly ScaleSceneEdge[]
  sources: readonly ScaleSnapCandidateSource[]
}): void {
  if (!targetEdges.length) {
    throw new Error('Scale snap target edges must contain at least one edge')
  }
  if (new Set(targetEdges).size !== targetEdges.length) {
    throw new Error('Scale snap target edges must be unique')
  }

  const sourceIds = new Set<string>()
  for (const source of sources) {
    if (!source.id.trim() || sourceIds.has(source.id)) {
      throw new Error(`Scale snap source id "${source.id}" must be non-empty and unique`)
    }
    sourceIds.add(source.id)
    assertSourceBounds({ source })
  }
}

/** Проверяет точные границы одного исходного объекта. */
function assertSourceBounds({ source }: { source: ScaleSnapCandidateSource }): void {
  const { left, right, top, bottom, centerX, centerY } = source.bounds
  const values = [left, right, top, bottom, centerX, centerY]
  if (!values.every(Number.isFinite)) {
    throw new Error(`Scale snap source "${source.id}" bounds must be finite`)
  }
  if (right < left || bottom < top) {
    throw new Error(`Scale snap source "${source.id}" bounds must be ordered`)
  }

  const expectedCenterX = left + ((right - left) / 2)
  const expectedCenterY = top + ((bottom - top) / 2)
  if (centerX !== expectedCenterX || centerY !== expectedCenterY) {
    throw new Error(`Scale snap source "${source.id}" centers must be derived from its edges`)
  }
}

/** Возвращает грани и центры исходного объекта в постоянном порядке. */
function createSourceLines({
  source
}: {
  source: ScaleSnapCandidateSource
}): readonly ScaleSnapSourceLine[] {
  const { bounds, edgeCategory = 'edge' } = source

  return Object.freeze([
    { key: 'left', axis: 'x', position: bounds.left, category: edgeCategory },
    { key: 'center-x', axis: 'x', position: bounds.centerX, category: 'center' },
    { key: 'right', axis: 'x', position: bounds.right, category: edgeCategory },
    { key: 'top', axis: 'y', position: bounds.top, category: edgeCategory },
    { key: 'center-y', axis: 'y', position: bounds.centerY, category: 'center' },
    { key: 'bottom', axis: 'y', position: bounds.bottom, category: edgeCategory }
  ])
}

/** Возвращает ось координат указанной грани изменяемого объекта. */
function resolveEdgeAxis(edge: ScaleSceneEdge): ScaleSceneAxis {
  return edge === 'left' || edge === 'right' ? 'x' : 'y'
}
