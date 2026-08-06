/* eslint-disable no-use-before-define -- Публичная функция расположена перед внутренними проверками. */
import type { ObjectBounds } from '../../utils/geometry'

/** Ось перемещения в координатах сцены. */
export type MovementSceneAxis = 'x' | 'y'

/** Именованная опорная точка перемещаемого bounding box. */
export type MovementBoundsAnchor = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'

/** Категория направляющей для разрешения равных кандидатов. */
export type MovementSnapCandidateCategory = 'domain-boundary' | 'edge' | 'center'

/** Объект с точными границами, сохранёнными в начале перемещения. */
export type MovementSnapCandidateSource = Readonly<{
  id: string
  bounds: ObjectBounds
  edgeCategory?: Extract<MovementSnapCandidateCategory, 'domain-boundary' | 'edge'>
  useForSpacing?: boolean
}>

/** Именованная направляющая из неизменяемого снимка целей. */
export type MovementSnapCandidate = Readonly<{
  id: string
  axis: MovementSceneAxis
  position: number
  category: MovementSnapCandidateCategory
  snapshotIndex: number
}>

/** Именованные точные границы одного объекта для снимка равноудалённых цепочек. */
export type MovementSnapSpacingSource = Readonly<{
  id: string
  bounds: ObjectBounds
}>

/** Цели прилипания и масштаб холста, сохранённые на одно перемещение. */
export type MovementSnapEnvironment = Readonly<{
  candidates: readonly MovementSnapCandidate[]
  spacingSources: readonly MovementSnapSpacingSource[]
  zoom: number
}>

/** Именованная линия одного исходного объекта. */
type MovementSnapSourceLine = Readonly<{
  key: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  axis: MovementSceneAxis
  position: number
  category: MovementSnapCandidateCategory
}>

/** Допуск проверки центров, рассчитанных из точных граней. */
const EXACT_BOUNDS_CENTER_EPSILON = 0.000000001

/**
 * Создаёт неизменяемый снимок обычных целей и целей равноудалённости для одного перемещения.
 */
export function createMovementSnapEnvironment({
  sources,
  zoom
}: {
  sources: readonly MovementSnapCandidateSource[]
  zoom: number
}): MovementSnapEnvironment {
  assertEnvironmentInputs({ sources, zoom })

  const candidates: MovementSnapCandidate[] = []
  const spacingSources: MovementSnapSpacingSource[] = []

  for (const source of sources) {
    for (const line of createSourceLines({ source })) {
      candidates.push(Object.freeze({
        id: `${source.id}:${line.key}`,
        axis: line.axis,
        position: line.position,
        category: line.category,
        snapshotIndex: candidates.length
      }))
    }

    if (source.useForSpacing) {
      spacingSources.push(Object.freeze({
        id: source.id,
        bounds: createBoundsSnapshot({ bounds: source.bounds })
      }))
    }
  }

  return Object.freeze({
    candidates: Object.freeze(candidates),
    spacingSources: Object.freeze(spacingSources),
    zoom
  })
}

/** Проверяет масштаб, уникальность идентификаторов и точную геометрию источников. */
function assertEnvironmentInputs({
  sources,
  zoom
}: {
  sources: readonly MovementSnapCandidateSource[]
  zoom: number
}): void {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error('Movement snapping zoom must be a finite positive number')
  }

  const sourceIds = new Set<string>()
  for (const source of sources) {
    if (!source.id.trim() || sourceIds.has(source.id)) {
      throw new Error(`Movement snap source id "${source.id}" must be non-empty and unique`)
    }

    sourceIds.add(source.id)
    createBoundsSnapshot({ bounds: source.bounds })
  }
}

/** Копирует и проверяет точные границы одного источника. */
function createBoundsSnapshot({ bounds }: { bounds: ObjectBounds }): ObjectBounds {
  const { left, right, top, bottom, centerX, centerY } = bounds
  const values = [left, right, top, bottom, centerX, centerY]
  if (!values.every(Number.isFinite) || right < left || bottom < top) {
    throw new Error('Movement snap source bounds must contain finite ordered values')
  }

  const expectedCenterX = left + ((right - left) / 2)
  const expectedCenterY = top + ((bottom - top) / 2)
  if (Math.abs(centerX - expectedCenterX) > EXACT_BOUNDS_CENTER_EPSILON
    || Math.abs(centerY - expectedCenterY) > EXACT_BOUNDS_CENTER_EPSILON) {
    throw new Error('Movement snap source centers must be derived from its edges')
  }

  return Object.freeze({ left, right, top, bottom, centerX, centerY })
}

/** Возвращает грани и центры источника в стабильном порядке. */
function createSourceLines({
  source
}: {
  source: MovementSnapCandidateSource
}): readonly MovementSnapSourceLine[] {
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
