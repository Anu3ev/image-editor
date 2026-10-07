import {
  ActiveSelection,
  type FabricObject,
  util
} from 'fabric'

/**
 * Serializes a child object with the ActiveSelection transformation temporarily applied.
 * After serialization, the object's properties are restored and the selection remains unchanged.
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
