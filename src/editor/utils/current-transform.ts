import {
  ActiveSelection,
  type Canvas,
  type FabricObject,
  type Transform
} from 'fabric'

/**
 * Проверяет, затрагивает ли удаление объектов текущее преобразование Fabric.
 * Дочерние объекты учитываются только для временного общего выделения.
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
