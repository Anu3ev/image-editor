import {
  FabricObject,
  LayoutManager,
  LayoutStrategy,
  Textbox,
  classRegistry
} from 'fabric'

class MockShapeObject extends FabricObject {
  static type = 'mock-shape'

  constructor(_text = '', options: Record<string, unknown> = {}) {
    super(options)
    this.shapeNodeType = 'shape'
  }
}

export class MockLayoutStrategy extends LayoutStrategy {}

export class MockLayoutManager extends LayoutManager {}

/**
 * Registers test Fabric classes required for shape-group deserialization.
 */
export const registerShapeGroupTestClasses = (): void => {
  classRegistry.setClass(Textbox, 'textbox')
  classRegistry.setClass(MockShapeObject, 'mock-shape')
  classRegistry.setClass(MockLayoutManager, 'layoutManager')
  classRegistry.setClass(MockLayoutManager, 'mock-layout-manager')
  classRegistry.setClass(MockLayoutStrategy, 'mock-layout-strategy')
}

/**
 * Creates a serialized shape-group description for materialization unit tests.
 */
export const createSerializedShapeGroup = (): {
  type: string
  shapePresetKey: string
  objects: Array<Record<string, unknown>>
  layoutManager: {
    type: string
    strategy: string
  }
} => ({
  type: 'shape-group',
  shapePresetKey: 'square',
  objects: [
    {
      type: 'mock-shape',
      width: 180,
      height: 180,
      shapeNodeType: 'shape'
    },
    {
      type: 'textbox',
      text: 'Shape text',
      width: 180,
      shapeNodeType: 'text'
    }
  ],
  layoutManager: {
    type: 'mock-layout-manager',
    strategy: 'mock-layout-strategy'
  }
})
