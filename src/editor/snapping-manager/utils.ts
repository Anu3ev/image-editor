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
 * Группирует объекты по оси и собирает интервалы между соседними элементами.
 */
const buildAxisSpacingPatterns = ({
  bounds,
  axis,
  type,
  primaryStart,
  primaryEnd
}: {
  bounds: Bounds[]
  axis: 'centerX' | 'centerY'
  type: SpacingPattern['type']
  primaryStart: 'top' | 'left'
  primaryEnd: 'bottom' | 'right'
}): SpacingPattern[] => {
  const groups = new Map<number, Bounds[]>()

  for (const item of bounds) {
    const axisValue = item[axis]
    const key = Math.round(axisValue * 1000)
    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }

  const patterns: SpacingPattern[] = []

  groups.forEach((groupItems) => {
    if (groupItems.length < 2) return

    const sorted = [...groupItems].sort((a, b) => a[primaryStart] - b[primaryStart])
    const axisValue = sorted.reduce((sum, item) => sum + item[axis], 0) / sorted.length

    for (let index = 0; index < sorted.length - 1; index += 1) {
      const current = sorted[index]
      const next = sorted[index + 1]
      const start = current[primaryEnd]
      const end = next[primaryStart]
      const distance = end - start

      if (distance < 0) continue

      patterns.push({
        type,
        axis: axisValue,
        start,
        end,
        distance
      })
    }
  })

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
