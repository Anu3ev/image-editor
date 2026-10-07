import { Group } from 'fabric'
import ObjectLockManager from '../../../src/editor/object-lock-manager'
import {
  createManagerTestMocks
} from '../editor/manager-test-mocks'
import { createMockFabricObject } from '../fabric/objects'
import {
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../shape/factories'

type ManagerTestMocks = ReturnType<typeof createManagerTestMocks>

export type ObjectLockManagerTestSetup = {
  manager: ObjectLockManager
  canvas: ManagerTestMocks['mockCanvas']
  historyManager: ManagerTestMocks['mockEditor']['historyManager']
}

export type ShapeGroupLockTarget = {
  group: ReturnType<typeof createMockShapeGroup>
  shape: ReturnType<typeof createMockShapeNode>
  text: ReturnType<typeof createMockShapeTextbox>
}

export type NestedLockGroupTarget = {
  rootGroup: Group
  nestedGroup: Group
  outerLeaf: ReturnType<typeof createMockFabricObject>
  innerLeaf: ReturnType<typeof createMockFabricObject>
}

/**
 * Creates a minimal setup for ObjectLockManager unit tests.
 */
export const createObjectLockManagerSetup = (): ObjectLockManagerTestSetup => {
  const {
    mockEditor,
    mockCanvas
  } = createManagerTestMocks()

  return {
    manager: new ObjectLockManager({
      editor: mockEditor as never
    }),
    canvas: mockCanvas,
    historyManager: mockEditor.historyManager
  }
}

/**
 * Creates a shape group with an internal shape node and textbox for lock scenarios.
 */
export const createShapeGroupLockTarget = (): ShapeGroupLockTarget => {
  const shape = createMockShapeNode()
  const text = createMockShapeTextbox({
    text: 'shape text'
  })
  const group = createMockShapeGroup({
    shape,
    text
  })

  return {
    group,
    shape,
    text
  }
}

/**
 * Creates a standard nested group structure for testing recursive lock/unlock.
 */
export const createNestedLockGroupTarget = (): NestedLockGroupTarget => {
  const innerLeaf = createMockFabricObject({
    id: 'inner-leaf'
  })
  const nestedGroup = new Group([innerLeaf], {
    id: 'nested-group'
  })
  const outerLeaf = createMockFabricObject({
    id: 'outer-leaf'
  })
  const rootGroup = new Group([nestedGroup, outerLeaf], {
    id: 'root-group'
  })

  return {
    rootGroup,
    nestedGroup,
    outerLeaf,
    innerLeaf
  }
}
