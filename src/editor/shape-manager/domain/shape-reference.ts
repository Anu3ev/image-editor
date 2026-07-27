import {
  FabricObject,
  Group
} from 'fabric'
import type { Canvas } from 'fabric'
import { ShapeGroupObject } from './shape-group'
import type { ShapeGroup, ShapeReference } from '../types'

/**
 * Проверяет, что объект является shape-группой.
 */
export const isShapeGroup = (
  object?: FabricObject | Group | null
): object is ShapeGroup => object instanceof ShapeGroupObject
  || (object instanceof Group && object.shapeComposite === true)

/**
 * Разрешает shape-группу из target, subTarget или внутреннего узла shape-композиции.
 */
export const resolveShapeGroupFromTarget = ({
  target,
  subTargets = []
}: {
  target?: FabricObject | null
  subTargets?: FabricObject[]
}): ShapeGroup | null => {
  if (isShapeGroup(target)) return target

  if (target?.group && isShapeGroup(target.group)) return target.group

  for (let index = 0; index < subTargets.length; index += 1) {
    const subTarget = subTargets[index]
    if (isShapeGroup(subTarget)) return subTarget

    const { group } = subTarget
    if (group && isShapeGroup(group)) return group
  }

  return null
}

/**
 * Возвращает shape-группу из активного объекта canvas.
 */
const resolveActiveShapeGroup = ({ canvas }: { canvas: Canvas }): ShapeGroup | null => {
  return resolveShapeGroupFromTarget({
    target: canvas.getActiveObject()
  })
}

/**
 * Возвращает shape-группу по её стабильному идентификатору на canvas.
 */
const resolveShapeGroupById = ({
  canvas,
  id
}: {
  canvas: Canvas
  id: string
}): ShapeGroup | null => {
  const objects = canvas.getObjects()

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    const objectWithId = object as FabricObject & {
      id?: string
    }

    if (objectWithId.id === id && isShapeGroup(object)) return object
  }

  return null
}

/**
 * Разрешает shape-группу из активного объекта, id или вложенного узла композиции.
 */
export const resolveShapeGroup = ({
  canvas,
  target
}: {
  canvas: Canvas
  target?: ShapeReference
}): ShapeGroup | null => {
  if (!target) return resolveActiveShapeGroup({ canvas })

  if (typeof target === 'string') {
    return resolveShapeGroupById({
      canvas,
      id: target
    })
  }

  return resolveShapeGroupFromTarget({ target })
}
