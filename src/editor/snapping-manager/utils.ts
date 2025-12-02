import { ActiveSelection, type FabricObject } from 'fabric'

import { IGNORED_IDS } from './constants'
import type { AnchorBuckets, Bounds, SpacingPattern } from './types'

/**
 * Собирает множество объектов, которые нужно исключить из поиска опорных линий.
 */
export const collectExcludedObjects = ({
  activeObject
}: {
  activeObject?: FabricObject | null
}): Set<FabricObject> => {
  const excluded = new Set<FabricObject>()

  if (!activeObject) return excluded

  excluded.add(activeObject)

  if (activeObject instanceof ActiveSelection) {
    activeObject.getObjects().forEach((object) => excluded.add(object))
  }

  return excluded
}

/**
 * Проверяет, нужно ли исключить объект из списка целей для прилипания.
 */
export const shouldIgnoreObject = ({
  object,
  excluded
}: {
  object: FabricObject
  excluded: Set<FabricObject>
}): boolean => {
  if (excluded.has(object)) return true

  const { visible = true } = object
  if (!visible) return true

  const { id } = object as FabricObject & { id?: string }
  if (id && IGNORED_IDS.includes(id)) return true

  return false
}

/**
 * Добавляет линии для прилипания, рассчитанные из границ объекта.
 */
export const pushBoundsToAnchors = ({
  anchors,
  bounds
}: {
  anchors: AnchorBuckets
  bounds: Bounds
}): void => {
  const {
    left,
    right,
    centerX,
    top,
    bottom,
    centerY
  } = bounds

  anchors.vertical.push(left, centerX, right)
  anchors.horizontal.push(top, centerY, bottom)
}

/**
 * Группирует объекты по оси и собирает интервалы между ближайшими соседями с пересечением по перпендикулярной оси.
 */
const buildAxisSpacingPatterns = ({
  bounds,
  type,
  primaryStart,
  primaryEnd
}: {
  bounds: Bounds[]
  type: SpacingPattern['type']
  primaryStart: 'top' | 'left'
  primaryEnd: 'bottom' | 'right'
}): SpacingPattern[] => {
  const patterns: SpacingPattern[] = []
  const perpendicularStart = primaryStart === 'top' ? 'left' : 'top'
  const perpendicularEnd = primaryEnd === 'bottom' ? 'right' : 'bottom'
  const sorted = [...bounds].sort((a, b) => a[primaryStart] - b[primaryStart])

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index]
    let closest: Bounds | null = null
    let minDistance = Number.POSITIVE_INFINITY

    for (let nextIndex = index + 1; nextIndex < sorted.length; nextIndex += 1) {
      const next = sorted[nextIndex]
      const overlap = Math.min(current[perpendicularEnd], next[perpendicularEnd])
        - Math.max(current[perpendicularStart], next[perpendicularStart])

      if (overlap < 0) continue

      const distance = next[primaryStart] - current[primaryEnd]
      if (distance < 0) continue

      if (distance < minDistance) {
        minDistance = distance
        closest = next
      }
    }

    if (!closest || minDistance === Number.POSITIVE_INFINITY) continue

    const overlapStart = Math.max(current[perpendicularStart], closest[perpendicularStart])
    const overlapEnd = Math.min(current[perpendicularEnd], closest[perpendicularEnd])
    const overlapAxis = (overlapStart + overlapEnd) / 2

    patterns.push({
      type,
      axis: overlapAxis,
      start: current[primaryEnd],
      end: closest[primaryStart],
      distance: closest[primaryStart] - current[primaryEnd]
    })
  }

  return patterns
}

/**
 * Формирует паттерны расстояний между всеми соседними объектами по вертикали и горизонтали.
 */
export const buildSpacingPatterns = ({
  bounds
}: {
  bounds: Bounds[]
}): { vertical: SpacingPattern[]; horizontal: SpacingPattern[] } => {
  const vertical = buildAxisSpacingPatterns({
    bounds,
    axis: 'centerX',
    type: 'vertical',
    primaryStart: 'top',
    primaryEnd: 'bottom'
  })
  const horizontal = buildAxisSpacingPatterns({
    bounds,
    axis: 'centerY',
    type: 'horizontal',
    primaryStart: 'left',
    primaryEnd: 'right'
  })

  return { vertical, horizontal }
}
