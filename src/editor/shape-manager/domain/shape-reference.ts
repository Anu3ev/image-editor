import { FabricObject, Group } from 'fabric'
import { ShapeGroupObject } from './shape-group'
import type { ShapeGroup } from '../types'

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
