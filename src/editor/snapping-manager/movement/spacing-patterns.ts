import type { Bounds, SpacingPattern } from '../types'

/** Именованный объект, участвующий в поиске соседних интервалов. */
export type SpacingPatternSource = Readonly<{
  id: string
  bounds: Bounds
}>

/** Точный интервал вместе с идентификаторами ограничивающих его объектов. */
export type SpacingPatternEntry = Readonly<{
  pattern: SpacingPattern
  beforeId: string
  afterId: string
  crossStart: number
  crossEnd: number
}>

/** Результат поиска ближайшего следующего объекта и положения общей направляющей. */
type FollowingSpacingSource = Readonly<{
  source: SpacingPatternSource
  distance: number
  crossStart: number
  crossEnd: number
}>

/** Ищет ближайший непересекающийся объект с пересечением по второй оси. */
function findFollowingSpacingSource({
  sources,
  sourceIndex,
  primaryStart,
  primaryEnd
}: {
  sources: SpacingPatternSource[]
  sourceIndex: number
  primaryStart: 'top' | 'left'
  primaryEnd: 'bottom' | 'right'
}): FollowingSpacingSource | null {
  const current = sources[sourceIndex]
  const perpendicularStart = primaryStart === 'top' ? 'left' : 'top'
  const perpendicularEnd = primaryEnd === 'bottom' ? 'right' : 'bottom'
  let closest: FollowingSpacingSource | null = null

  for (let nextIndex = sourceIndex + 1; nextIndex < sources.length; nextIndex += 1) {
    const next = sources[nextIndex]
    const overlapStart = Math.max(current.bounds[perpendicularStart], next.bounds[perpendicularStart])
    const overlapEnd = Math.min(current.bounds[perpendicularEnd], next.bounds[perpendicularEnd])
    const distance = next.bounds[primaryStart] - current.bounds[primaryEnd]
    if (overlapEnd < overlapStart || distance < 0) continue
    if (closest && distance >= closest.distance) continue

    closest = {
      source: next,
      distance,
      crossStart: overlapStart,
      crossEnd: overlapEnd
    }
  }

  return closest
}

/** Создаёт точные соседние интервалы одной оси с идентификаторами объектов. */
export function buildAxisSpacingPatternEntries({
  sources,
  type,
  primaryStart,
  primaryEnd
}: {
  sources: SpacingPatternSource[]
  type: SpacingPattern['type']
  primaryStart: 'top' | 'left'
  primaryEnd: 'bottom' | 'right'
}): SpacingPatternEntry[] {
  const sorted = [...sources].sort((first, second) => {
    const positionDifference = first.bounds[primaryStart] - second.bounds[primaryStart]
    return positionDifference || first.id.localeCompare(second.id)
  })
  const entries: SpacingPatternEntry[] = []

  for (let index = 0; index < sorted.length; index += 1) {
    const before = sorted[index]
    const following = findFollowingSpacingSource({
      sources: sorted,
      sourceIndex: index,
      primaryStart,
      primaryEnd
    })
    if (!following) continue

    entries.push({
      beforeId: before.id,
      afterId: following.source.id,
      crossStart: following.crossStart,
      crossEnd: following.crossEnd,
      pattern: {
        type,
        axis: (following.crossStart + following.crossEnd) / 2,
        start: before.bounds[primaryEnd],
        end: following.source.bounds[primaryStart],
        distance: following.distance
      }
    })
  }

  return entries
}

/** Формирует интервалы между всеми соседними объектами по вертикали и горизонтали. */
export function buildSpacingPatterns({
  bounds
}: {
  bounds: Bounds[]
}): { vertical: SpacingPattern[]; horizontal: SpacingPattern[] } {
  const sources = bounds.map((candidateBounds, index) => ({
    id: `bounds:${index}`,
    bounds: candidateBounds
  }))
  const vertical = buildAxisSpacingPatternEntries({
    sources,
    type: 'vertical',
    primaryStart: 'top',
    primaryEnd: 'bottom'
  }).map(({ pattern }) => pattern)
  const horizontal = buildAxisSpacingPatternEntries({
    sources,
    type: 'horizontal',
    primaryStart: 'left',
    primaryEnd: 'right'
  }).map(({ pattern }) => pattern)

  return { vertical, horizontal }
}
