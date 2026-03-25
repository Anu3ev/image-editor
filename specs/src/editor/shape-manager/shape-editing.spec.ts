import { Group } from 'fabric'
import ShapeEditingController from '../../../../src/editor/shape-manager/shape-editing'
import * as shapeRuntime from '../../../../src/editor/shape-manager/shape-runtime'
import {
  getShapeNodes,
  isShapeGroup,
  resolveShapeGroupFromTarget
} from '../../../../src/editor/shape-manager/shape-utils'
import {
  createMockCanvas,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'
import { createShapeEditingSetup } from '../../../test-utils/shape-editing-helpers'

jest.mock('../../../../src/editor/shape-manager/shape-utils', () => ({
  getShapeNodes: jest.fn(),
  isShapeGroup: jest.fn(),
  resolveShapeGroupFromTarget: jest.fn()
}))

const isShapeGroupMock = isShapeGroup as jest.Mock

describe('shape-editing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('prepareTextNode переводит текст в базовый режим без интерактивности', () => {
    const {
      text
    } = createShapeEditingSetup({
      getShapeNodesMock: getShapeNodes as jest.Mock,
      isShapeGroupMock,
      resolveShapeGroupFromTargetMock: resolveShapeGroupFromTarget as jest.Mock
    })

    shapeRuntime.prepareShapeTextNode({
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
    } = createShapeEditingSetup({
      getShapeNodesMock: getShapeNodes as jest.Mock,
      isShapeGroupMock,
      resolveShapeGroupFromTargetMock: resolveShapeGroupFromTarget as jest.Mock
    })

    const prepareSpy = jest.spyOn(shapeRuntime, 'prepareShapeTextNode')

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
    } = createShapeEditingSetup({
      getShapeNodesMock: getShapeNodes as jest.Mock,
      isShapeGroupMock,
      resolveShapeGroupFromTargetMock: resolveShapeGroupFromTarget as jest.Mock
    })

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
    } = createShapeEditingSetup({
      getShapeNodesMock: getShapeNodes as jest.Mock,
      isShapeGroupMock,
      resolveShapeGroupFromTargetMock: resolveShapeGroupFromTarget as jest.Mock
    })

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

  it('вне режима редактирования возвращает текущие флаги интерактивности группы', () => {
    const {
      controller,
      group
    } = createShapeEditingSetup({
      getShapeNodesMock: getShapeNodes as jest.Mock,
      isShapeGroupMock,
      resolveShapeGroupFromTargetMock: resolveShapeGroupFromTarget as jest.Mock
    })

    group.selectable = false
    group.evented = false
    group.lockMovementX = true
    group.lockMovementY = false

    const interactionState = controller.resolveGroupInteractionState({
      group
    })

    expect(interactionState).toEqual({
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: false
    })
  })

  it('во время редактирования возвращает исходные флаги интерактивности группы, а не временные', () => {
    const {
      controller,
      group,
      text
    } = createShapeEditingSetup({
      getShapeNodesMock: getShapeNodes as jest.Mock,
      isShapeGroupMock,
      resolveShapeGroupFromTargetMock: resolveShapeGroupFromTarget as jest.Mock
    })

    group.selectable = false
    group.evented = false
    group.lockMovementX = false
    group.lockMovementY = false

    controller.handleTextEditingEntered({
      target: text
    })

    expect(group.evented).toBe(true)
    expect(group.lockMovementY).toBe(true)

    const interactionState = controller.resolveGroupInteractionState({
      group
    })

    expect(interactionState).toEqual({
      selectable: false,
      evented: false,
      lockMovementX: false,
      lockMovementY: false
    })
  })

  it('после выхода из editing восстанавливает интерактивность и возвращает active object на группу', () => {
    const {
      controller,
      canvas,
      group,
      text
    } = createShapeEditingSetup({
      getShapeNodesMock: getShapeNodes as jest.Mock,
      isShapeGroupMock,
      resolveShapeGroupFromTargetMock: resolveShapeGroupFromTarget as jest.Mock
    })

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
