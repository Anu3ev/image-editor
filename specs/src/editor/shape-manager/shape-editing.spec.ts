import { Group } from 'fabric'
import ShapeEditingController from '../../../../src/editor/shape-manager/shape-editing'
import {
  getShapeNodes,
  isShapeGroup,
  resolveShapeGroupFromTarget
} from '../../../../src/editor/shape-manager/shape-utils'
import {
  createMockCanvas,
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'

jest.mock('../../../../src/editor/shape-manager/shape-utils', () => ({
  getShapeNodes: jest.fn(),
  isShapeGroup: jest.fn(),
  resolveShapeGroupFromTarget: jest.fn()
}))

describe('shape-editing', () => {
  const getShapeNodesMock = getShapeNodes as jest.Mock
  const isShapeGroupMock = isShapeGroup as jest.Mock
  const resolveShapeGroupFromTargetMock = resolveShapeGroupFromTarget as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('prepareTextNode переводит текст в базовый режим без интерактивности', () => {
    const {
      controller,
      text
    } = createEditingSetup()

    controller.prepareTextNode({
      text
    })

    expect(text.hasBorders).toBe(false)
    expect(text.hasControls).toBe(false)
    expect(text.evented).toBe(false)
    expect(text.selectable).toBe(false)
    expect(text.editable).toBe(true)
    expect(text.shapeNodeType).toBe('text')
  })

  it('на первом клике только подготавливает текст, на double click включает editing', () => {
    const {
      controller,
      canvas,
      group,
      text
    } = createEditingSetup()

    const prepareSpy = jest.spyOn(controller, 'prepareTextNode')

    controller.handleMouseDown({
      target: group,
      e: new MouseEvent('mousedown', {
        detail: 1
      })
    })

    expect(prepareSpy).toHaveBeenCalledWith({
      text
    })
    expect(text.enterEditing).not.toHaveBeenCalled()

    canvas.setActiveObject(group)

    controller.handleMouseDown({
      target: group,
      e: new MouseEvent('mousedown', {
        detail: 2
      })
    })

    expect(canvas.setActiveObject).toHaveBeenCalledWith(text)
    expect(text.enterEditing).toHaveBeenCalled()
    expect(text.selectAll).toHaveBeenCalled()
  })

  it('если текст уже редактируется, повторный клик не меняет состояние', () => {
    const {
      controller,
      canvas,
      group,
      text
    } = createEditingSetup()

    text.isEditing = true
    canvas.setActiveObject(text)
    const setActiveObjectMock = canvas.setActiveObject as jest.Mock
    setActiveObjectMock.mockClear()

    controller.handleMouseDown({
      target: group,
      e: new MouseEvent('mousedown', {
        detail: 2
      })
    })

    expect(canvas.setActiveObject).not.toHaveBeenCalled()
    expect(text.enterEditing).not.toHaveBeenCalled()
  })

  it('в режиме редактирования текста блокирует drag группы и ставит текстовый курсор', () => {
    const {
      controller,
      canvas,
      group,
      text
    } = createEditingSetup()

    group.selectable = true
    group.evented = true
    group.lockMovementX = false
    group.lockMovementY = false
    group.hoverCursor = 'move'
    group.moveCursor = 'move'
    text.lockMovementX = false
    text.lockMovementY = false

    controller.handleTextEditingEntered({
      target: text
    })

    expect(group.selectable).toBe(false)
    expect(group.lockMovementX).toBe(true)
    expect(group.lockMovementY).toBe(true)
    expect(group.hoverCursor).toBe('text')
    expect(group.moveCursor).toBe('text')
    expect(text.lockMovementX).toBe(true)
    expect(text.lockMovementY).toBe(true)
    expect(canvas.requestRenderAll).toHaveBeenCalled()
  })

  it('после выхода из editing восстанавливает интерактивность и возвращает active object на группу', () => {
    const {
      controller,
      canvas,
      group,
      text
    } = createEditingSetup()

    group.selectable = true
    group.evented = true
    group.lockMovementX = false
    group.lockMovementY = false
    group.hoverCursor = 'move'
    group.moveCursor = 'move'
    text.lockMovementX = false
    text.lockMovementY = false

    controller.handleTextEditingEntered({
      target: text
    })

    canvas.setActiveObject(text)

    controller.handleTextEditingExited({
      target: text
    })

    expect(group.selectable).toBe(true)
    expect(group.evented).toBe(true)
    expect(group.lockMovementX).toBe(false)
    expect(group.lockMovementY).toBe(false)
    expect(group.hoverCursor).toBe('move')
    expect(group.moveCursor).toBe('move')
    expect(text.evented).toBe(false)
    expect(text.selectable).toBe(false)
    expect(canvas.setActiveObject).toHaveBeenCalledWith(group)
  })

  it('игнорирует обычный текстовый объект вне shape-группы', () => {
    const canvas = createMockCanvas()
    const controller = new ShapeEditingController({
      canvas: canvas as never
    })
    const plainText = createMockShapeTextbox({
      text: 'plain text'
    })
    const plainGroup = new Group([plainText], {
      shapeComposite: false
    })
    const plainTextWithGroup = plainText as typeof plainText & {
      group?: Group
    }
    plainTextWithGroup.group = plainGroup

    isShapeGroupMock.mockReturnValue(false)

    controller.handleTextEditingEntered({
      target: plainText
    })
    controller.handleTextEditingExited({
      target: plainText
    })

    expect(canvas.requestRenderAll).not.toHaveBeenCalled()
    expect(plainText.selectable).not.toBe(false)
  })
})

function createEditingSetup(): {
  controller: ShapeEditingController
  canvas: ReturnType<typeof createMockCanvas>
  group: ReturnType<typeof createMockShapeGroup>
  text: ReturnType<typeof createMockShapeTextbox>
} {
  const canvas = createMockCanvas()
  const shape = createMockShapeNode()
  const text = createMockShapeTextbox({
    text: 'shape text'
  })
  const group = createMockShapeGroup({
    shape,
    text
  })
  const groupWithMeta = group as ReturnType<typeof createMockShapeGroup> & {
    hoverCursor?: string
    moveCursor?: string
    lockMovementX?: boolean
    lockMovementY?: boolean
    selectable?: boolean
    evented?: boolean
  }

  const getShapeNodesMock = getShapeNodes as jest.Mock
  const isShapeGroupMock = isShapeGroup as jest.Mock
  const resolveShapeGroupFromTargetMock = resolveShapeGroupFromTarget as jest.Mock

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
