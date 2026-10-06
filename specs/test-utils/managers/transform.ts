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
 * Creates a standard canvas object for testing direct Fabric opacity.
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
 * Creates a shape group with internal shape/text nodes.
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
 * Creates an ActiveSelection with an explicitly specified set of objects.
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
