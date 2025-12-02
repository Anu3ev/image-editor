import { ActiveSelection, type FabricObject } from 'fabric'

import { IGNORED_IDS } from './constants'
import type { AnchorBuckets, Bounds } from './types'

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
