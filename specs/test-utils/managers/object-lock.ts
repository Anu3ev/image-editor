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
 * Создаёт минимальный setup для unit-тестов ObjectLockManager.
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
 * Создаёт shape-group с внутренним shape-узлом и textbox для lock-сценариев.
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
 * Создаёт обычную вложенную group-структуру для проверки рекурсивного lock/unlock.
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
