/* eslint-disable no-use-before-define -- The public function appears before internal validation helpers. */
import { english, type Translate } from '../../i18n'
import type { ObjectBounds } from '../../utils/geometry'

/** Movement axis in scene coordinates. */
export type MovementSceneAxis = 'x' | 'y'

/** Named anchor of the moving bounding box. */
export type MovementBoundsAnchor = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'

/** Guide category used to break ties between candidates. */
export type MovementSnapCandidateCategory = 'domain-boundary' | 'edge' | 'center'

/** Object with exact bounds captured at the start of movement. */
export type MovementSnapCandidateSource = Readonly<{
  id: string
  bounds: ObjectBounds
  edgeCategory?: Extract<MovementSnapCandidateCategory, 'domain-boundary' | 'edge'>
  useForSpacing?: boolean
}>

/** Named guide from an immutable target snapshot. */
export type MovementSnapCandidate = Readonly<{
  id: string
  axis: MovementSceneAxis
  position: number
  category: MovementSnapCandidateCategory
  snapshotIndex: number
}>

/** Named exact bounds of one object for an equal-spacing chain snapshot. */
export type MovementSnapSpacingSource = Readonly<{
  id: string
  bounds: ObjectBounds
}>

/** Snap targets and canvas zoom captured for one movement gesture. */
export type MovementSnapEnvironment = Readonly<{
  candidates: readonly MovementSnapCandidate[]
  spacingSources: readonly MovementSnapSpacingSource[]
  zoom: number
}>

/** Named line of one source object. */
type MovementSnapSourceLine = Readonly<{
  key: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  axis: MovementSceneAxis
  position: number
  category: MovementSnapCandidateCategory
}>

/** Tolerance for verifying centers calculated from exact edges. */
const EXACT_BOUNDS_CENTER_EPSILON = 0.000000001

/**
 * Creates an immutable snapshot of regular and equal-spacing targets for one movement gesture.
 */
export function createMovementSnapEnvironment({
  t = english,
  sources,
  zoom
}: {
  t?: Translate
  sources: readonly MovementSnapCandidateSource[]
  zoom: number
}): MovementSnapEnvironment {
  assertEnvironmentInputs({ t, sources, zoom })

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
        bounds: createBoundsSnapshot({ t, bounds: source.bounds })
      }))
    }
  }

  return Object.freeze({
    candidates: Object.freeze(candidates),
    spacingSources: Object.freeze(spacingSources),
    zoom
  })
}

/** Validates zoom, unique identifiers, and exact source geometry. */
function assertEnvironmentInputs({
  t = english,
  sources,
  zoom
}: {
  t?: Translate
  sources: readonly MovementSnapCandidateSource[]
  zoom: number
}): void {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error(t('snapping.movement.zoomMustBePositiveFinite'))
  }

  const sourceIds = new Set<string>()
  for (const source of sources) {
    if (!source.id.trim() || sourceIds.has(source.id)) {
      throw new Error(t('snapping.movement.source.idMustBeUniqueAndNonEmpty', { sourceId: source.id }))
    }

    sourceIds.add(source.id)
    createBoundsSnapshot({ t, bounds: source.bounds })
  }
}

/** Copies and validates the exact bounds of one source. */
function createBoundsSnapshot({ t = english, bounds }: { t?: Translate; bounds: ObjectBounds }): ObjectBounds {
  const { left, right, top, bottom, centerX, centerY } = bounds
  const values = [left, right, top, bottom, centerX, centerY]
  if (!values.every(Number.isFinite) || right < left || bottom < top) {
    throw new Error(t('snapping.movement.source.boundsMustBeFiniteAndOrdered'))
  }

  const expectedCenterX = left + ((right - left) / 2)
  const expectedCenterY = top + ((bottom - top) / 2)
  if (Math.abs(centerX - expectedCenterX) > EXACT_BOUNDS_CENTER_EPSILON
    || Math.abs(centerY - expectedCenterY) > EXACT_BOUNDS_CENTER_EPSILON) {
    throw new Error(t('snapping.movement.source.centersMustMatchEdges'))
  }

  return Object.freeze({ left, right, top, bottom, centerX, centerY })
}

/** Returns source edges and centers in a stable order. */
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
