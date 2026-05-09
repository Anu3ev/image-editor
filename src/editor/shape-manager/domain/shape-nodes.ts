import { Textbox } from 'fabric'
import type {
  ShapeGroupLike,
  ShapeNode,
  ShapeTextNode
} from '../types'

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
