import {
  ActiveSelection,
  type Canvas,
  type FabricObject,
  type Transform
} from 'fabric'

/**
 * Checks whether deleting objects affects the current Fabric transformation.
 * Child objects are considered only for a temporary active selection.
 */
export function isCurrentTransformAffectedByRemoval({
  canvas,
  objects
}: {
  canvas: Canvas
  objects: readonly FabricObject[]
}): boolean {
  const transform = Reflect.get(canvas, '_currentTransform') as Transform | null | undefined
  if (!transform) return false
  if (objects.includes(transform.target)) return true
  if (!(transform.target instanceof ActiveSelection)) return false

  const selectedObjects = transform.target.getObjects()

  return objects.some((object) => selectedObjects.includes(object))
}
