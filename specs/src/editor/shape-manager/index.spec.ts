import { Group, Textbox } from 'fabric'
import ShapeManager from '../../../../src/editor/shape-manager'
import {
  applyShapeStyle,
  createShapeNode
} from '../../../../src/editor/shape-manager/shape-factory'
import {
  applyShapeTextLayout,
  resolveShapeTextAutoExpandWidthForText
} from '../../../../src/editor/shape-manager/shape-layout'
import {
  applyTextStyleToShapeText,
  createShapeManagerEditorStub,
  createMockShapeNode,
  getCanvasHandler
} from '../../../test-utils/shape-helpers'

jest.mock('../../../../src/editor/shape-manager/shape-factory', () => ({
  createShapeNode: jest.fn(),
  applyShapeStyle: jest.fn(),
  resizeShapeNode: jest.fn()
}))

jest.mock('../../../../src/editor/shape-manager/shape-layout', () => ({
  applyShapeTextLayout: jest.fn(),
  resolveShapeTextAutoExpandWidthForText: jest.fn(({
    currentWidth,
    minimumWidth
  }: {
    currentWidth: number
    minimumWidth: number
  }) => Math.max(currentWidth, minimumWidth)),
  resolveGroupCenterPoint: jest.fn(({
    left,
    top,
    canvasCenter
  }: {
    left?: number
    top?: number
    canvasCenter: { x: number; y: number }
  }) => {
    if (typeof left === 'number' && typeof top === 'number') {
      return {
        x: left,
        y: top
      }
    }

    return canvasCenter
  })
}))

describe('shape-manager', () => {
  const createShapeNodeMock = createShapeNode as jest.Mock
  const applyShapeStyleMock = applyShapeStyle as jest.Mock
  const applyShapeTextLayoutMock = applyShapeTextLayout as jest.Mock
  const resolveShapeTextAutoExpandWidthForTextMock = resolveShapeTextAutoExpandWidthForText as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    createShapeNodeMock.mockImplementation(async() => createMockShapeNode())
    resolveShapeTextAutoExpandWidthForTextMock.mockImplementation(({
      currentWidth,
      minimumWidth
    }: {
      currentWidth: number
      minimumWidth: number
    }) => Math.max(currentWidth, minimumWidth))
  })

  it('подписывается на canvas-события при создании и снимает подписки при destroy', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const onEvents = (editor.canvas.on as jest.Mock).mock.calls.map((call) => call[0])
    expect(onEvents).toEqual(expect.arrayContaining([
      'object:scaling',
      'object:modified',
      'mouse:down',
      'text:editing:entered',
      'text:editing:exited',
      'text:changed',
      'editor:before:text-updated'
    ]))

    manager.destroy()

    const offEvents = (editor.canvas.off as jest.Mock).mock.calls.map((call) => call[0])
    expect(offEvents).toEqual(expect.arrayContaining([
      'object:scaling',
      'object:modified',
      'mouse:down',
      'text:editing:entered',
      'text:editing:exited',
      'text:changed',
      'editor:before:text-updated'
    ]))
  })

  it('add возвращает null для неизвестного presetKey', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const result = await manager.add({
      presetKey: 'unknown-shape'
    })

    expect(result).toBeNull()
    expect(editor.canvas.add).not.toHaveBeenCalled()
  })

  it('add добавляет shape-группу на canvas и сохраняет историю', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    expect(group).toBeInstanceOf(Group)
    expect(editor.canvas.add).toHaveBeenCalledWith(group)
    expect(editor.canvas.setActiveObject).toHaveBeenCalledWith(group)
    expect(editor.historyManager.suspendHistory).toHaveBeenCalledTimes(1)
    expect(editor.historyManager.resumeHistory).toHaveBeenCalledTimes(1)
    expect(editor.historyManager.saveState).toHaveBeenCalledTimes(1)
  })

  it('при добавлении шейпа режим авторасширения текста включён по умолчанию', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    expect(group.shapeTextAutoExpand).toBe(true)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      minimumWidth: group.shapeManualBaseWidth,
      montageAreaWidth: 400
    }))
  })

  it('при добавлении шейпа с явной шириной считает её ручной базовой шириной и сразу расширяет объект по тексту', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })

    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(280)

    const group = await manager.add({
      presetKey: 'square',
      options: {
        width: 220,
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    expect(group.shapeTextAutoExpand).toBe(true)
    expect(group.shapeManualBaseWidth).toBe(220)
    expect(group.shapeBaseWidth).toBe(280)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: 220,
      minimumWidth: 220,
      montageAreaWidth: 400
    }))
  })

  it('при добавлении шейпа сохраняет выключенный режим авторасширения, если он передан явно', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        shapeTextAutoExpand: false
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    expect(group.shapeTextAutoExpand).toBe(false)
    expect(resolveShapeTextAutoExpandWidthForTextMock).not.toHaveBeenCalled()
  })

  it('add с withoutAdding не добавляет объект на canvas и не трогает историю', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        withoutAdding: true
      }
    })

    expect(group).toBeInstanceOf(Group)
    expect(editor.canvas.add).not.toHaveBeenCalled()
    expect(editor.historyManager.suspendHistory).not.toHaveBeenCalled()
    expect(editor.historyManager.saveState).not.toHaveBeenCalled()
  })

  it('setOpacity применяет opacity и к shape, и к text', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const updatedGroup = manager.setOpacity({
      target: group,
      opacity: 0.4
    })

    expect(updatedGroup).toBe(group)
    expect(applyShapeStyleMock).toHaveBeenCalledWith(expect.objectContaining({
      style: {
        opacity: 0.4
      }
    }))

    const textNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text') as {
      opacity?: number
    } | undefined

    expect(textNode?.opacity).toBe(0.4)
    expect((group as { shapeOpacity?: number }).shapeOpacity).toBe(0.4)
  })

  it('getTextNode возвращает текстовый узел shape-группы по прямому target', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const expectedTextNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')
    const resolvedTextNode = manager.getTextNode({
      target: group
    })

    expect(resolvedTextNode).toBe(expectedTextNode)
  })

  it('getTextNode находит shape-группу по активному дочернему тексту', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const textNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')

    if (!textNode) {
      throw new Error('shape text node should exist')
    }

    editor.canvas.setActiveObject(textNode)

    const resolvedTextNode = manager.getTextNode()

    expect(resolvedTextNode).toBe(textNode)
  })

  it('updateTextStyle применяет стиль к тексту внутри шейпа и не меняет shape style path', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const updateTextMock = editor.textManager.updateText as jest.Mock

    updateTextMock.mockImplementation(applyTextStyleToShapeText)

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const textNode = manager.getTextNode({
      target: group
    })
    const saveStateMock = editor.historyManager.saveState as jest.Mock

    if (!textNode) {
      throw new Error('shape text node should exist')
    }

    const initialShapeStyleCalls = applyShapeStyleMock.mock.calls.length

    saveStateMock.mockClear()
    applyShapeTextLayoutMock.mockClear()

    manager.updateTextStyle({
      target: group,
      style: {
        fill: '#ff0000',
        stroke: '#00ff00',
        strokeWidth: 3,
        fontWeight: 'bold',
        align: 'left'
      }
    })

    expect(updateTextMock).toHaveBeenCalledWith(expect.objectContaining({
      target: textNode,
      style: expect.objectContaining({
        fill: '#ff0000',
        stroke: '#00ff00',
        strokeWidth: 3,
        fontWeight: 'bold',
        align: 'left'
      })
    }))
    expect(textNode.fill).toBe('#ff0000')
    expect(textNode.stroke).toBe('#00ff00')
    expect(textNode.strokeWidth).toBe(3)
    expect(textNode.fontWeight).toBe('bold')
    expect(textNode.textAlign).toBe('left')
    expect(applyShapeStyleMock).toHaveBeenCalledTimes(initialShapeStyleCalls)
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      group,
      text: textNode,
      alignH: 'left'
    }))
    expect(saveStateMock).toHaveBeenCalledTimes(1)
  })

  it('изменение стиля текста не переключает режим авторасширения шейпа', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const updateTextMock = editor.textManager.updateText as jest.Mock

    updateTextMock.mockImplementation(applyTextStyleToShapeText)

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        shapeTextAutoExpand: false
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    resolveShapeTextAutoExpandWidthForTextMock.mockClear()

    manager.updateTextStyle({
      target: group,
      style: {
        fill: '#ff0000'
      }
    })

    expect(group.shapeTextAutoExpand).toBe(false)
    expect(resolveShapeTextAutoExpandWidthForTextMock).not.toHaveBeenCalled()
  })

  it('изменение стиля текста при авторасширении берёт нижнюю границу из ручной базовой ширины', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const updateTextMock = editor.textManager.updateText as jest.Mock

    updateTextMock.mockImplementation(applyTextStyleToShapeText)

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    group.shapeBaseWidth = 240
    group.width = 240
    group.shapeManualBaseWidth = 180
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(220)

    manager.updateTextStyle({
      target: group,
      style: {
        fontSize: 96
      }
    })

    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: 240,
      minimumWidth: 180,
      montageAreaWidth: 400
    }))
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 220
    }))
  })

  it('updateTextStyle с withoutSave не сохраняет history state', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const updateTextMock = editor.textManager.updateText as jest.Mock
    const saveStateMock = editor.historyManager.saveState as jest.Mock

    updateTextMock.mockImplementation(applyTextStyleToShapeText)

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    saveStateMock.mockClear()

    manager.updateTextStyle({
      target: group,
      style: {
        fill: '#123456'
      },
      withoutSave: true
    })

    expect(saveStateMock).not.toHaveBeenCalled()
  })

  it('setTextAlign обновляет textAlign и передаёт layout новые horizontal и vertical значения', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const updateTextMock = editor.textManager.updateText as jest.Mock
    const saveStateMock = editor.historyManager.saveState as jest.Mock

    updateTextMock.mockImplementation(applyTextStyleToShapeText)

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const textNode = manager.getTextNode({
      target: group
    })

    if (!textNode) {
      throw new Error('shape text node should exist')
    }

    saveStateMock.mockClear()
    applyShapeTextLayoutMock.mockClear()

    manager.setTextAlign({
      target: group,
      horizontal: 'right',
      vertical: 'bottom'
    })

    expect(textNode.textAlign).toBe('right')
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      group,
      text: textNode,
      alignH: 'right',
      alignV: 'bottom'
    }))
    expect(saveStateMock).toHaveBeenCalledTimes(1)
  })

  it('setRounding не вызывает update для non-roundable шейпа', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'circle',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const groupWithRoundFlag = group as Group & {
      shapeCanRound?: boolean
    }
    groupWithRoundFlag.shapeCanRound = false

    const updateSpy = jest.spyOn(manager, 'update')

    const result = await manager.setRounding({
      target: groupWithRoundFlag,
      rounding: 12
    })

    expect(result).toBe(groupWithRoundFlag)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('update пересобирает shape и сохраняет существующий текстовый узел', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const firstShape = createMockShapeNode({
      width: 180,
      height: 180
    })
    const secondShape = createMockShapeNode({
      width: 220,
      height: 220
    })

    createShapeNodeMock
      .mockResolvedValueOnce(firstShape)
      .mockResolvedValueOnce(secondShape)

    const originalGroup = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!originalGroup) {
      throw new Error('shape group should be created')
    }

    const originalTextNode = originalGroup.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')

    const updatedGroup = await manager.update({
      target: originalGroup,
      presetKey: 'circle'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup).not.toBe(originalGroup)
    expect(editor.canvas.remove).toHaveBeenCalledWith(originalGroup)
    expect(editor.canvas.add).toHaveBeenCalledWith(updatedGroup)

    const updatedTextNode = updatedGroup?.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')
    expect(updatedTextNode).toBe(originalTextNode)
  })

  it('явное изменение ширины обновляет ручную базовую ширину и сразу пересчитывает текущую ширину по тексту', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const initialWidth = group.shapeBaseWidth

    resolveShapeTextAutoExpandWidthForTextMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(320)

    const updatedGroup = await manager.update({
      target: group,
      options: {
        width: 260
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapeTextAutoExpand).toBe(true)
    expect(updatedGroup?.shapeManualBaseWidth).toBe(260)
    expect(updatedGroup?.shapeBaseWidth).toBe(320)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: initialWidth,
      minimumWidth: 260,
      montageAreaWidth: 400
    }))
  })

  it('при выключении авторасширения без явной ширины фиксирует текущую ширину шейпа', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    group.shapeBaseWidth = 260
    group.width = 260
    group.shapeManualBaseWidth = 180

    const updatedGroup = await manager.update({
      target: group,
      options: {
        shapeTextAutoExpand: false
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapeTextAutoExpand).toBe(false)
    expect(updatedGroup?.shapeManualBaseWidth).toBe(260)
    expect(updatedGroup?.shapeBaseWidth).toBe(260)
  })

  it('при повторном включении авторасширения пересчитывает ширину по тексту, но не опускается ниже ручной базы', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        shapeTextAutoExpand: false
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    group.shapeBaseWidth = 220
    group.width = 220
    group.shapeManualBaseWidth = 180
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(240)

    const updatedGroup = await manager.update({
      target: group,
      options: {
        shapeTextAutoExpand: true
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapeTextAutoExpand).toBe(true)
    expect(updatedGroup?.shapeManualBaseWidth).toBe(180)
    expect(updatedGroup?.shapeBaseWidth).toBe(240)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: 220,
      minimumWidth: 180,
      montageAreaWidth: 400
    }))
  })

  it('обновление шейпа во время редактирования текста не делает его невыделяемым', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const enteredHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:entered'
    })
    const textNode = manager.getTextNode({
      target: group
    })

    if (!enteredHandler || !textNode) {
      throw new Error('shape manager editing handler should be registered')
    }

    group.selectable = true
    group.evented = true
    group.lockMovementX = false
    group.lockMovementY = false

    enteredHandler({
      target: textNode
    })

    const updatedGroup = await manager.update({
      target: group,
      options: {
        shapeTextAutoExpand: false
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.selectable).toBe(true)
    expect(updatedGroup?.evented).toBe(true)
    expect(updatedGroup?.lockMovementX).toBe(false)
    expect(updatedGroup?.lockMovementY).toBe(false)
  })

  it('обновление шейпа во время редактирования сохраняет реальные ограничения перемещения и выделения', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const enteredHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:entered'
    })
    const textNode = manager.getTextNode({
      target: group
    })

    if (!enteredHandler || !textNode) {
      throw new Error('shape manager editing handler should be registered')
    }

    group.selectable = false
    group.evented = false
    group.lockMovementX = true
    group.lockMovementY = false

    enteredHandler({
      target: textNode
    })

    const updatedGroup = await manager.update({
      target: group,
      options: {
        shapeTextAutoExpand: false
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.selectable).toBe(false)
    expect(updatedGroup?.evented).toBe(false)
    expect(updatedGroup?.lockMovementX).toBe(true)
    expect(updatedGroup?.lockMovementY).toBe(false)
  })

  it('remove удаляет shape-группу и сохраняет history state', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const result = manager.remove({
      target: group
    })

    expect(result).toBe(true)
    expect(editor.canvas.remove).toHaveBeenCalledWith(group)
    expect(editor.historyManager.saveState).toHaveBeenCalled()
  })

  it('при программном изменении текста внутри фигуры сохраняет её положение во время редактирования', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'base'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const enteredHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:entered'
    })
    const beforeTextUpdatedHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'editor:before:text-updated'
    })
    const textNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')

    if (!enteredHandler || !beforeTextUpdatedHandler || !textNode) {
      throw new Error('shape manager handlers should be registered')
    }

    group.left = 459
    group.top = 412

    enteredHandler({
      target: textNode
    })

    group.left = 489
    group.top = 430

    applyShapeTextLayoutMock.mockClear()
    const requestRenderAllMock = editor.canvas.requestRenderAll as jest.Mock
    requestRenderAllMock.mockClear()

    beforeTextUpdatedHandler({
      textbox: textNode,
      target: textNode,
      style: {
        fontSize: 120
      },
      options: {
        withoutSave: true,
        skipRender: true
      },
      updates: {
        fontSize: 120
      }
    })

    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      group,
      text: textNode
    }))
    expect(group.left).toBe(459)
    expect(group.top).toBe(412)
    expect(requestRenderAllMock).not.toHaveBeenCalled()
  })

  it('не перестраивает фигуру при программном изменении обычного текста', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const beforeTextUpdatedHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'editor:before:text-updated'
    })

    if (!beforeTextUpdatedHandler) {
      throw new Error('shape manager before update handler should be registered')
    }

    const textbox = new Textbox('plain text', {
      fontSize: 32
    })

    beforeTextUpdatedHandler({
      textbox,
      target: textbox,
      style: {
        fontSize: 64
      },
      options: {
        withoutSave: true,
        skipRender: true
      },
      updates: {
        fontSize: 64
      }
    })

    expect(applyShapeTextLayoutMock).not.toHaveBeenCalled()
    expect(editor.canvas.requestRenderAll).not.toHaveBeenCalled()
    expect(manager).toBeInstanceOf(ShapeManager)
  })

  it('при обновлении текста через фигуру пересчитывает её layout один раз', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const updateTextMock = editor.textManager.updateText as jest.Mock

    updateTextMock.mockImplementation(({
      target,
      style
    }: {
      target: {
        set: (updates: Record<string, unknown>) => void
        autoExpand?: boolean
      }
      style: Record<string, unknown>
    }) => {
      applyTextStyleToShapeText({
        target,
        style
      })

      const beforeTextUpdatedHandler = getCanvasHandler({
        canvas: editor.canvas,
        eventName: 'editor:before:text-updated'
      })

      if (!beforeTextUpdatedHandler) {
        throw new Error('shape manager before update handler should be registered')
      }

      beforeTextUpdatedHandler({
        textbox: target,
        target,
        style,
        options: {
          withoutSave: true,
          skipRender: true
        },
        updates: style
      })
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    applyShapeTextLayoutMock.mockClear()

    manager.updateTextStyle({
      target: group,
      style: {
        fontSize: 96
      }
    })

    expect(updateTextMock).toHaveBeenCalledTimes(1)
    expect(applyShapeTextLayoutMock).toHaveBeenCalledTimes(1)
  })

  it('text:changed пересчитывает layout, сохраняя стабильный центр группы', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'base'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const enteredHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:entered'
    })
    const changedHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:changed'
    })
    const textNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')

    if (!enteredHandler || !changedHandler || !textNode) {
      throw new Error('shape manager handlers should be registered')
    }

    group.left = 459
    group.top = 412

    enteredHandler({
      target: textNode
    })

    group.left = 489
    group.top = 430

    changedHandler({
      target: textNode
    })

    expect(applyShapeTextLayoutMock).toHaveBeenCalled()
    expect(group.left).toBe(459)
    expect(group.top).toBe(412)
  })

  it('при вводе текста не сужает шейп уже ширины, с которой он был добавлен', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const changedHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:changed'
    })
    const textNode = manager.getTextNode({
      target: group
    })

    if (!changedHandler || !textNode) {
      throw new Error('shape manager change handler should be registered')
    }

    group.shapeBaseWidth = 260
    group.width = 260
    group.shapeManualBaseWidth = 180
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(210)

    changedHandler({
      target: textNode
    })

    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: 260,
      minimumWidth: 180,
      montageAreaWidth: 400
    }))
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 210
    }))
  })
})
