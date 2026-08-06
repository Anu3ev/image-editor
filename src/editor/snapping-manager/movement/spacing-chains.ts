import { resolveDisplayDistance } from '../../utils/distance'
import type { Bounds, SpacingGuide, SpacingPattern } from '../types'
import {
  buildAxisSpacingPatternEntries,
  type SpacingPatternEntry,
  type SpacingPatternSource
} from './spacing-patterns'

/** Допуск на погрешность вычислений и сериализации точных интервалов. */
const SPACING_CHAIN_DISTANCE_TOLERANCE = 0.001

/** Идентификатор активного объекта внутри полного снимка цепочек. */
export const ACTIVE_MOVEMENT_SPACING_SOURCE_ID = 'movement-active-target'

/** Точный соседний интервал из снимка, сделанного в начале перемещения. */
export type MovementSpacingInterval = Readonly<{
  id: string
  type: SpacingPattern['type']
  axis: number
  beforeId: string
  afterId: string
  start: number
  end: number
  exactDistance: number
}>

/** Непрерывная цепочка равных интервалов с допуском на погрешность вычислений. */
export type MovementSpacingChain = Readonly<{
  id: string
  type: SpacingPattern['type']
  axis: number
  intervals: readonly MovementSpacingInterval[]
  exactRepresentative: number
  displayDistance: number
}>

/** Цепочки полного снимка для обеих осей. */
export type MovementSpacingChains = Readonly<{
  vertical: readonly MovementSpacingChain[]
  horizontal: readonly MovementSpacingChain[]
}>

/** Преобразует найденный интервал в неизменяемую доменную модель. */
function createMovementSpacingInterval({
  entry
}: {
  entry: SpacingPatternEntry
}): MovementSpacingInterval {
  const { pattern, beforeId, afterId } = entry

  return Object.freeze({
    id: `${pattern.type}:${beforeId}:${afterId}`,
    type: pattern.type,
    axis: pattern.axis,
    beforeId,
    afterId,
    start: pattern.start,
    end: pattern.end,
    exactDistance: pattern.distance
  })
}

/** Создаёт общую цепочку, если в последовательности есть минимум два интервала. */
function createMovementSpacingChain({
  entries,
  type
}: {
  entries: SpacingPatternEntry[]
  type: SpacingPattern['type']
}): MovementSpacingChain | null {
  if (entries.length < 2) return null

  const intervals = entries.map((entry) => createMovementSpacingInterval({ entry }))
  const distanceSum = intervals.reduce((sum, interval) => sum + interval.exactDistance, 0)
  const exactRepresentative = distanceSum / intervals.length
  const first = intervals[0]
  const last = intervals[intervals.length - 1]
  let commonCrossStart = entries[0].crossStart
  let commonCrossEnd = entries[0].crossEnd

  for (let index = 1; index < entries.length; index += 1) {
    commonCrossStart = Math.max(commonCrossStart, entries[index].crossStart)
    commonCrossEnd = Math.min(commonCrossEnd, entries[index].crossEnd)
  }

  return Object.freeze({
    id: `${type}:${first.beforeId}:${last.afterId}`,
    type,
    axis: (commonCrossStart + commonCrossEnd) / 2,
    intervals: Object.freeze(intervals),
    exactRepresentative,
    displayDistance: resolveDisplayDistance({ distance: exactRepresentative })
  })
}

/** Делит связанную последовательность по максимальному разбросу точных расстояний. */
function createConnectedSpacingChains({
  entries,
  type
}: {
  entries: SpacingPatternEntry[]
  type: SpacingPattern['type']
}): MovementSpacingChain[] {
  const chains: MovementSpacingChain[] = []
  let chainStart = 0

  while (chainStart < entries.length) {
    let chainEnd = chainStart + 1
    let minimumDistance = entries[chainStart].pattern.distance
    let maximumDistance = minimumDistance
    const displayDistance = resolveDisplayDistance({ distance: minimumDistance })
    let commonCrossStart = entries[chainStart].crossStart
    let commonCrossEnd = entries[chainStart].crossEnd

    while (chainEnd < entries.length) {
      const nextEntry = entries[chainEnd]
      const { distance } = nextEntry.pattern
      const nextMinimum = Math.min(minimumDistance, distance)
      const nextMaximum = Math.max(maximumDistance, distance)
      const nextCrossStart = Math.max(commonCrossStart, nextEntry.crossStart)
      const nextCrossEnd = Math.min(commonCrossEnd, nextEntry.crossEnd)
      if (nextMaximum - nextMinimum > SPACING_CHAIN_DISTANCE_TOLERANCE) break
      if (resolveDisplayDistance({ distance }) !== displayDistance) break
      if (nextCrossEnd < nextCrossStart) break

      minimumDistance = nextMinimum
      maximumDistance = nextMaximum
      commonCrossStart = nextCrossStart
      commonCrossEnd = nextCrossEnd
      chainEnd += 1
    }

    const chain = createMovementSpacingChain({
      entries: entries.slice(chainStart, chainEnd),
      type
    })
    if (chain) chains.push(chain)
    chainStart = chainEnd
  }

  return chains
}

/** Собирает связанные последовательности интервалов одной оси без рекурсии. */
function createAxisSpacingChains({
  entries,
  type
}: {
  entries: SpacingPatternEntry[]
  type: SpacingPattern['type']
}): MovementSpacingChain[] {
  const entryByBeforeId = new Map<string, SpacingPatternEntry>()
  const sourceIdsWithIncomingInterval = new Set<string>()
  const chains: MovementSpacingChain[] = []

  for (const entry of entries) {
    entryByBeforeId.set(entry.beforeId, entry)
    sourceIdsWithIncomingInterval.add(entry.afterId)
  }

  for (const firstEntry of entries) {
    if (sourceIdsWithIncomingInterval.has(firstEntry.beforeId)) continue

    const connected: SpacingPatternEntry[] = []
    let current: SpacingPatternEntry | undefined = firstEntry
    for (let step = 0; current && step < entries.length; step += 1) {
      connected.push(current)
      current = entryByBeforeId.get(current.afterId)
    }

    chains.push(...createConnectedSpacingChains({ entries: connected, type }))
  }

  return chains
}

/** Строит неизменяемые цепочки из полного снимка, включая активный объект. */
export function createMovementSpacingChains({
  sources
}: {
  sources: SpacingPatternSource[]
}): MovementSpacingChains {
  const verticalEntries = buildAxisSpacingPatternEntries({
    sources,
    type: 'vertical',
    primaryStart: 'top',
    primaryEnd: 'bottom'
  })
  const horizontalEntries = buildAxisSpacingPatternEntries({
    sources,
    type: 'horizontal',
    primaryStart: 'left',
    primaryEnd: 'right'
  })

  return Object.freeze({
    vertical: Object.freeze(createAxisSpacingChains({ entries: verticalEntries, type: 'vertical' })),
    horizontal: Object.freeze(createAxisSpacingChains({ entries: horizontalEntries, type: 'horizontal' }))
  })
}

/** Проверяет принадлежность точного интервала заданной цепочке. */
export function movementSpacingChainIncludesPattern({
  chain,
  pattern
}: {
  chain: MovementSpacingChain
  pattern: SpacingPattern | null
}): boolean {
  if (!pattern) return false

  return chain.intervals.some((interval) => {
    return interval.type === pattern.type
      && interval.axis === pattern.axis
      && interval.start === pattern.start
      && interval.end === pattern.end
      && interval.exactDistance === pattern.distance
  })
}

/** Проверяет, что объект входит хотя бы в один интервал цепочки. */
export function movementSpacingChainIncludesSource({
  chain,
  sourceId
}: {
  chain: MovementSpacingChain
  sourceId: string
}): boolean {
  return chain.intervals.some((interval) => {
    return interval.beforeId === sourceId || interval.afterId === sourceId
  })
}

/** Возвращает цепочку из неизменяемого снимка по её стабильному идентификатору. */
export function findMovementSpacingChainById({
  chains,
  chainId
}: {
  chains: MovementSpacingChains
  chainId: string | null
}): MovementSpacingChain | null {
  if (!chainId) return null

  for (const chain of [...chains.horizontal, ...chains.vertical]) {
    if (chain.id === chainId) return chain
  }

  return null
}

/** Подставляет итоговые границы активного объекта в один интервал. */
function materializeMovementSpacingInterval({
  interval,
  activeSourceId,
  activeBounds
}: {
  interval: MovementSpacingInterval
  activeSourceId: string
  activeBounds: Bounds
}): { start: number; end: number } {
  const isHorizontal = interval.type === 'horizontal'
  const activeStart = isHorizontal ? activeBounds.left : activeBounds.top
  const activeEnd = isHorizontal ? activeBounds.right : activeBounds.bottom

  return {
    start: interval.beforeId === activeSourceId ? activeEnd : interval.start,
    end: interval.afterId === activeSourceId ? activeStart : interval.end
  }
}

/** Создаёт направляющие, которые вместе показывают каждый интервал проверенной цепочки. */
export function createMovementSpacingChainGuides({
  chain,
  activeSourceId,
  activeBounds
}: {
  chain: MovementSpacingChain
  activeSourceId: string
  activeBounds: Bounds
}): SpacingGuide[] {
  const includesActive = movementSpacingChainIncludesSource({ chain, sourceId: activeSourceId })
  if (!includesActive) return []
  const activeCrossStart = chain.type === 'horizontal' ? activeBounds.top : activeBounds.left
  const activeCrossEnd = chain.type === 'horizontal' ? activeBounds.bottom : activeBounds.right
  if (chain.axis < activeCrossStart || chain.axis > activeCrossEnd) return []

  const intervals = chain.intervals.map((interval) => {
    return materializeMovementSpacingInterval({ interval, activeSourceId, activeBounds })
  })
  const guides: SpacingGuide[] = []

  for (let index = 1; index < intervals.length; index += 1) {
    const reference = intervals[index - 1]
    const active = intervals[index]
    guides.push({
      type: chain.type,
      axis: chain.axis,
      refStart: reference.start,
      refEnd: reference.end,
      activeStart: active.start,
      activeEnd: active.end,
      distance: chain.displayDistance
    })
  }

  return guides
}
