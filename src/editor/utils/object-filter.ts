import { ActiveSelection, type FabricObject } from 'fabric'

export const IGNORED_IDS = ['montage-area', 'background', 'interaction-blocker']

/**
 * Собирает множество объектов, которые нужно исключить из обработки.
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
 * Проверяет, нужно ли исключить объект из целей взаимодействия.
 */
export const shouldIgnoreObject = ({
  object,
  excluded,
  ignoredIds = IGNORED_IDS
}: {
  object: FabricObject
  excluded: Set<FabricObject>
  ignoredIds?: string[]
}): boolean => {
  if (excluded.has(object)) return true

  const { visible = true } = object
  if (!visible) return true

  const { id } = object as FabricObject & { id?: string }
  if (id && ignoredIds.includes(id)) return true

  return false
}
