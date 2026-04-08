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

  it('не переводит locked shape-группу в режим редактирования текста по double click', () => {
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

    group.locked = true
    group.selectable = true
    group.evented = true
    group.lockMovementX = false
    group.lockMovementY = false
    canvas.setActiveObject(group)
    const setActiveObjectMock = canvas.setActiveObject as jest.Mock

    setActiveObjectMock.mockClear()

    controller.handleMouseDown({
      target: group,
      e: new MouseEvent('mousedown', {
        detail: 2
      })
    })

    expect(prepareSpy).toHaveBeenCalledWith({
      text
    })
    expect(text.enterEditing).not.toHaveBeenCalled()
    expect(text.selectAll).not.toHaveBeenCalled()
    expect(canvas.setActiveObject).not.toHaveBeenCalled()
    expect(group.selectable).toBe(true)
    expect(group.evented).toBe(true)
    expect(group.lockMovementX).toBe(false)
    expect(group.lockMovementY).toBe(false)
    expect(text.editable).toBe(false)
    expect(canvas.requestRenderAll).toHaveBeenCalled()
  })

  it('не переводит locked внутренний textbox в режим редактирования текста по double click', () => {
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

    text.locked = true
    group.selectable = true
    group.evented = true
    group.lockMovementX = false
    group.lockMovementY = false
    canvas.setActiveObject(group)
    const setActiveObjectMock = canvas.setActiveObject as jest.Mock

    setActiveObjectMock.mockClear()

    controller.handleMouseDown({
      target: group,
      e: new MouseEvent('mousedown', {
        detail: 2
      })
    })

    expect(prepareSpy).toHaveBeenCalledWith({
      text
    })
    expect(text.enterEditing).not.toHaveBeenCalled()
    expect(text.selectAll).not.toHaveBeenCalled()
    expect(canvas.setActiveObject).not.toHaveBeenCalled()
    expect(group.selectable).toBe(true)
    expect(group.evented).toBe(true)
    expect(group.lockMovementX).toBe(false)
    expect(group.lockMovementY).toBe(false)
    expect(text.editable).toBe(false)
    expect(canvas.requestRenderAll).toHaveBeenCalled()
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

  it('после выхода из редактирования возвращает исходные ограничения группы, а не временный текстовый режим', () => {
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
    group.hoverCursor = 'move'
    group.moveCursor = 'move'
    text.lockMovementX = false
    text.lockMovementY = false

    controller.handleTextEditingEntered({
      target: text
    })

    expect(group.evented).toBe(true)
    expect(group.lockMovementY).toBe(true)

    controller.handleTextEditingExited({
      target: text
    })

    expect(group.selectable).toBe(false)
    expect(group.evented).toBe(false)
    expect(group.lockMovementX).toBe(false)
    expect(group.lockMovementY).toBe(false)
    expect(group.hoverCursor).toBe('move')
    expect(group.moveCursor).toBe('move')
    expect(text.lockMovementX).toBe(false)
    expect(text.lockMovementY).toBe(false)
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

  it('во время редактирования клик внутри текущего шейпа остаётся на текстовом узле', () => {
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

    const originalFindTarget = canvas.findTarget as jest.Mock

    originalFindTarget.mockReturnValue({
      target: group,
      subTargets: []
    })

    controller.handleTextEditingEntered({
      target: text
    })

    text.isEditing = true
    canvas.setActiveObject(text)

    const targetInfo = canvas.findTarget(new MouseEvent('mousedown'))

    expect(targetInfo.target).toBe(text)
    expect(targetInfo.currentTarget).toBe(text)
    expect(targetInfo.subTargets).toContain(text)
    expect(targetInfo.currentSubTargets).toContain(text)
  })

  it('во время редактирования клик по другому target не подменяется на текст текущего шейпа', () => {
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

    const otherTarget = new Group()
    const originalFindTarget = canvas.findTarget as jest.Mock
    const resolveShapeGroupFromTargetMock = resolveShapeGroupFromTarget as jest.Mock

    resolveShapeGroupFromTargetMock.mockImplementation(({
      target
    }: {
      target?: unknown
    }) => (target === group ? group : null))

    originalFindTarget.mockReturnValue({
      target: otherTarget,
      subTargets: []
    })

    controller.handleTextEditingEntered({
      target: text
    })

    text.isEditing = true
    canvas.setActiveObject(text)

    const targetInfo = canvas.findTarget(new MouseEvent('mousedown'))

    expect(targetInfo.target).toBe(otherTarget)
    expect(targetInfo.currentTarget).toBeUndefined()
    expect(targetInfo.subTargets).toEqual([])
  })

  it('после выхода из редактирования клик внутри шейпа снова резолвится как обычный target canvas', () => {
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

    const originalFindTarget = canvas.findTarget as jest.Mock

    originalFindTarget.mockReturnValue({
      target: group,
      subTargets: []
    })

    controller.handleTextEditingEntered({
      target: text
    })

    controller.handleTextEditingExited({
      target: text
    })

    const targetInfo = canvas.findTarget(new MouseEvent('mousedown'))

    expect(targetInfo.target).toBe(group)
    expect(targetInfo.subTargets).toEqual([])
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
