import { FabricObject, Group, Textbox } from 'fabric'
import { ShapeGroupObject } from './shape-group'
import { applyShapeGroupInteractivity } from './shape-runtime'
import {
  ShapeGroup,
  ShapeGroupLike,
  ShapeNode,
  ShapeTextNode
} from './types'

/**
 * Проверяет, что объект является shape-группой.
 */
export const isShapeGroup = (
  object?: FabricObject | Group | null
): object is ShapeGroup => object instanceof ShapeGroupObject
  || (object instanceof Group && object.shapeComposite === true)

/**
 * Возвращает shape-группу из target/subTarget.
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
 * Возвращает внутренний shape-объект группы.
 */
export const getShapeNode = ({ group }: { group: ShapeGroupLike }): ShapeNode | null => {
  const objects = group.getObjects() as ShapeNode[]

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    if (object.shapeNodeType === 'shape') {
      return object
    }
  }

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    if (!(object instanceof Textbox)) return object
  }

  return null
}

/**
 * Возвращает внутренний textbox-объект группы.
 */
export const getShapeTextNode = ({ group }: { group: ShapeGroupLike }): ShapeTextNode | null => {
  const objects = group.getObjects() as ShapeNode[]

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    if (object.shapeNodeType === 'text' && object instanceof Textbox) {
      return object as ShapeTextNode
    }
  }

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    if (object instanceof Textbox) {
      return object as ShapeTextNode
    }
  }

  return null
}

/**
 * Возвращает оба внутренних объекта shape-композиции.
 */
export const getShapeNodes = ({ group }: { group: ShapeGroupLike }): {
  shape: ShapeNode | null
  text: ShapeTextNode | null
} => ({
  shape: getShapeNode({ group }),
  text: getShapeTextNode({ group })
})

/**
 * Включает интерактивность группы и sub-target клики.
 */
export const applyGroupInteractivity = ({ group }: { group: ShapeGroupLike }): void => {
  applyShapeGroupInteractivity({ group })
}
