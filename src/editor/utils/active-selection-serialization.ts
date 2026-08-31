import {
  ActiveSelection,
  type FabricObject,
  util
} from 'fabric'

/**
 * Выполняет сериализацию дочернего объекта с временно применённым преобразованием ActiveSelection.
 * После завершения сериализации свойства объекта восстанавливаются, а выделение остаётся без изменений.
 */
export function withActiveSelectionTransformForSerialization<T>({
  object,
  selection,
  callback
}: {
  object: FabricObject
  selection: ActiveSelection | null
  callback: () => T
}): T {
  if (!selection || object.group !== selection) return callback()

  const originalTransform = util.saveObjectTransform(object)

  util.addTransformToObject(object, selection.calcOwnMatrix())

  try {
    return callback()
  } finally {
    object.set(originalTransform)
  }
}
