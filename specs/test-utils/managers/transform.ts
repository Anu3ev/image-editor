import {
  ActiveSelection,
  Rect,
  type FabricObject
} from 'fabric'
import { ShapeGroupObject } from '../../../src/editor/shape-manager/domain/shape-group'
import {
  createMockShapeNode,
  createMockShapeTextbox
} from '../shape/factories'

/**
 * Создаёт обычный canvas-объект для проверки прямого Fabric opacity.
 */
export const createOpacityObjectMock = () => {
  const object = new Rect()
  const setMock = jest.spyOn(object, 'set')

  return {
    object,
    setMock
  }
}

/**
 * Создаёт shape-group с внутренними shape/text узлами.
 */
export const createShapeGroupOpacityTarget = (): {
  group: ShapeGroupObject
  shape: FabricObject
  text: FabricObject
} => {
  const shape = createMockShapeNode()
  const text = createMockShapeTextbox({ text: 'shape text' })
  const group = new ShapeGroupObject([shape as never, text], {
    shapePresetKey: 'square'
  })

  return {
    group,
    shape,
    text
  }
}

/**
 * Создаёт ActiveSelection с явно заданным набором объектов.
 */
export const createOpacityActiveSelection = ({
  objects
}: {
  objects: FabricObject[]
}): ActiveSelection => {
  const selection = new ActiveSelection(objects, {})

  selection.getObjects = jest.fn().mockReturnValue(objects)

  return selection
}
