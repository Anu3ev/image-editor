/* eslint-disable no-use-before-define -- The exported function is declared before internal validation helpers. */
import { english, type Translate } from '../../i18n'
import type {
  ScaleSceneAxis,
  ScaleSceneEdge
} from './scale-projection'
import type {
  ScaleSnapCandidateCategory,
  ScaleSnapCandidateInput
} from './scale-snapping-resolver'
import type { ObjectBounds } from '../../utils/geometry'

/** Object with exact bounds to which the object being resized can snap. */
export type ScaleSnapCandidateSource = Readonly<{
  id: string
  bounds: ObjectBounds
  edgeCategory?: Extract<ScaleSnapCandidateCategory, 'domain-boundary' | 'edge'>
}>

/** Candidates and zoom captured at the start of one scaling gesture. */
export type ScaleSnapEnvironment = Readonly<{
  candidates: readonly ScaleSnapCandidateInput[]
  zoom: number
}>

/** Named line of the source object before associating it with a moving edge. */
type ScaleSnapSourceLine = Readonly<{
  key: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  axis: ScaleSceneAxis
  position: number
  category: Extract<ScaleSnapCandidateCategory, 'domain-boundary' | 'edge' | 'center'>
}>

/**
 * Creates an ordered candidate list for all moving object edges.
 */
export function createScaleSnapCandidates({
  t = english,
  targetEdges,
  sources
}: {
  t?: Translate
  targetEdges: readonly ScaleSceneEdge[]
  sources: readonly ScaleSnapCandidateSource[]
}): readonly ScaleSnapCandidateInput[] {
  assertCandidateInputs({ t, targetEdges, sources })

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

/** Checks identifier uniqueness and validity of the initial geometry. */
function assertCandidateInputs({
  t = english,
  targetEdges,
  sources
}: {
  t?: Translate
  targetEdges: readonly ScaleSceneEdge[]
  sources: readonly ScaleSnapCandidateSource[]
}): void {
  if (!targetEdges.length) {
    throw new Error(t('snapping.scale.targetEdges.edgeRequired'))
  }
  if (new Set(targetEdges).size !== targetEdges.length) {
    throw new Error(t('snapping.scale.targetEdges.mustBeUnique'))
  }

  const sourceIds = new Set<string>()
  for (const source of sources) {
    if (!source.id.trim() || sourceIds.has(source.id)) {
      throw new Error(t('snapping.scale.source.idMustBeUniqueAndNonEmpty', { sourceId: source.id }))
    }
    sourceIds.add(source.id)
    assertSourceBounds({ t, source })
  }
}

/** Validates the exact bounds of one source object. */
function assertSourceBounds({ t = english, source }: { t?: Translate; source: ScaleSnapCandidateSource }): void {
  const { left, right, top, bottom, centerX, centerY } = source.bounds
  const values = [left, right, top, bottom, centerX, centerY]
  if (!values.every(Number.isFinite)) {
    throw new Error(t('snapping.scale.source.boundsMustBeFinite', { sourceId: source.id }))
  }
  if (right < left || bottom < top) {
    throw new Error(t('snapping.scale.source.boundsMustBeOrdered', { sourceId: source.id }))
  }

  const expectedCenterX = left + ((right - left) / 2)
  const expectedCenterY = top + ((bottom - top) / 2)
  if (centerX !== expectedCenterX || centerY !== expectedCenterY) {
    throw new Error(t('snapping.scale.source.centersMustMatchEdges', { sourceId: source.id }))
  }
}

/** Returns the source object's edges and centers in a fixed order. */
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

/** Returns the coordinate axis of the specified edge of the object being resized. */
function resolveEdgeAxis(edge: ScaleSceneEdge): ScaleSceneAxis {
  return edge === 'left' || edge === 'right' ? 'x' : 'y'
}
