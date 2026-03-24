import ShapeEditingController from '../../src/editor/shape-manager/shape-editing'
import {
  createMockCanvas,
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from './shape-helpers'

export type ShapeEditingTestSetup = {
  controller: ShapeEditingController
  canvas: ReturnType<typeof createMockCanvas>
  group: ReturnType<typeof createMockShapeGroup> & {
    hoverCursor?: string
    moveCursor?: string
    lockMovementX?: boolean
    lockMovementY?: boolean
    selectable?: boolean
    evented?: boolean
  }
  text: ReturnType<typeof createMockShapeTextbox>
}

/**
 * Создаёт базовый набор объектов для тестов контроллера редактирования shape-текста.
 */
export function createShapeEditingSetup({
  getShapeNodesMock,
  isShapeGroupMock,
  resolveShapeGroupFromTargetMock
}: {
  getShapeNodesMock: jest.Mock
  isShapeGroupMock: jest.Mock
  resolveShapeGroupFromTargetMock: jest.Mock
}): ShapeEditingTestSetup {
  const canvas = createMockCanvas()
  const shape = createMockShapeNode()
  const text = createMockShapeTextbox({
    text: 'shape text'
  })
  const group = createMockShapeGroup({
    shape,
    text
  })
  const groupWithMeta = group as ShapeEditingTestSetup['group']

  getShapeNodesMock.mockReturnValue({
    shape,
    text
  })
  isShapeGroupMock.mockImplementation((target: { shapeComposite?: boolean }) => target?.shapeComposite === true)
  resolveShapeGroupFromTargetMock.mockImplementation(() => group)

  const controller = new ShapeEditingController({
    canvas: canvas as never
  })

  return {
    controller,
    canvas,
    group: groupWithMeta,
    text
  }
}
