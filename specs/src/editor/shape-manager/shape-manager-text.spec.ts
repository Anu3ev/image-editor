import { Textbox } from 'fabric'
import ShapeManager from '../../../../src/editor/shape-manager'
import {
  applyShapeTextLayoutToMockGroup,
  applyTextStyleToShapeText,
  createShapeManagerEditorStub,
  getCanvasEventPayloads,
  getCanvasHandler,
  getRequiredCanvasHandler,
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape-manager-spec-helpers'

jest.mock('../../../../src/editor/shape-manager/shape-factory', () => ({
  createShapeNode: jest.fn(),
  applyShapeStyle: jest.fn(),
  resizeShapeNode: jest.fn()
}))

jest.mock('../../../../src/editor/shape-manager/layout/shape-layout', () => ({
  applyShapeTextLayout: jest.fn(),
  resolveMinimumShapeWidthForText: jest.fn(() => 1),
  resolveRequiredShapeHeightForText: jest.fn(({
    height
  }: {
    height: number
  }) => Math.max(1, height)),
  resolveShapeTextFrameLayout: jest.fn(({
    width,
    padding
  }: {
    width: number
    padding?: {
      left?: number
      right?: number
    }
  }) => ({
    frame: {
      left: padding?.left ?? 0,
      width: Math.max(1, width - (padding?.left ?? 0) - (padding?.right ?? 0))
    },
    splitByGrapheme: false,
    textTop: 0
  })),
  resolveShapeTextFixedWidthLayout: jest.fn(({
    width,
    height
  }: {
    width: number
    height: number
  }) => ({
    width,
    height,
    appliedPadding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    appliedUserPadding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    frame: {
      left: 0,
      top: 0,
      width: Math.max(1, width),
      height: Math.max(1, height)
    },
    splitByGrapheme: false,
    textTop: 0
  })),
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

describe('shape-manager text', () => {
  const mocks = getShapeManagerUnitMocks()
  const {
    applyShapeTextLayoutMock,
    resolveShapeTextAutoExpandWidthForTextMock
  } = mocks

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
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

  it('во время редактирования после перемещения фигуры следующие изменения текста удерживают новую позицию', async() => {
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

    textNode.enterEditing()
    enteredHandler({
      target: textNode
    })

    await manager.update({
      target: group,
      options: {
        left: 320,
        top: 280,
        originX: 'right',
        originY: 'bottom'
      }
    })

    group.left = 470
    group.top = 420

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

    const updatedAnchor = group.getPointByOrigin('right', 'bottom')

    expect(group.originX).toBe('right')
    expect(group.originY).toBe('bottom')
    expect(updatedAnchor.x).toBe(320)
    expect(updatedAnchor.y).toBe(280)
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

  it('эмитит обновление фигуры после выхода из редактирования текста, а не на каждый введённый символ', async() => {
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

    const enteredHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:entered'
    })
    const changedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:changed'
    })
    const exitedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:exited'
    })
    const textNode = manager.getTextNode({
      target: group
    })

    if (!textNode) throw new Error('shape text node should exist')

    const textNodeWithRawText = textNode as Textbox & {
      textCaseRaw?: string
    }
    const canvasFireMock = editor.canvas.fire as jest.Mock

    enteredHandler({
      target: textNode
    })
    textNode.enterEditing()

    canvasFireMock.mockClear()
    textNode.set({
      text: 'updated text'
    })
    textNodeWithRawText.textCaseRaw = 'updated text'

    changedHandler({
      target: textNode
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toHaveLength(0)
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toHaveLength(0)

    exitedHandler({
      target: textNode
    })

    const beforePayloads = getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })
    const updatedPayloads = getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })

    expect(beforePayloads).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-edit',
        target: textNode
      })
    ])
    expect(updatedPayloads).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-edit',
        target: textNode,
        before: expect.objectContaining({
          text: expect.objectContaining({
            text: 'base'
          })
        }),
        after: expect.objectContaining({
          text: expect.objectContaining({
            text: 'updated text'
          })
        })
      })
    ])
  })

  it('эмитит обновление фигуры после программного обновления текста внутри неё', async() => {
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

    const beforeTextUpdatedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'editor:before:text-updated'
    })
    const textUpdatedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'editor:text-updated'
    })
    const textNode = manager.getTextNode({
      target: group
    })

    if (!textNode) throw new Error('shape text node should exist')

    const canvasFireMock = editor.canvas.fire as jest.Mock

    canvasFireMock.mockClear()
    textNode.set({
      fontSize: 120
    })

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

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-update',
        target: textNode,
        withoutSave: true
      })
    ])

    textUpdatedHandler({
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
      },
      before: {},
      after: {}
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-update',
        target: textNode,
        withoutSave: true
      })
    ])
  })

  it('не шлёт обновление фигуры, если текст внутри неё не изменился', async() => {
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

    const enteredHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:entered'
    })
    const exitedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:exited'
    })
    const textNode = manager.getTextNode({
      target: group
    })

    if (!textNode) throw new Error('shape text node should exist')

    const canvasFireMock = editor.canvas.fire as jest.Mock

    enteredHandler({
      target: textNode
    })

    canvasFireMock.mockClear()

    exitedHandler({
      target: textNode
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toHaveLength(0)
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toHaveLength(0)
  })

  it('после программного обновления текста во время редактирования не шлёт второе обновление при выходе', async() => {
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

    const enteredHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:entered'
    })
    const exitedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:exited'
    })
    const beforeTextUpdatedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'editor:before:text-updated'
    })
    const textUpdatedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'editor:text-updated'
    })
    const textNode = manager.getTextNode({
      target: group
    })

    if (!textNode) throw new Error('shape text node should exist')

    const textNodeWithRawText = textNode as Textbox & {
      textCaseRaw?: string
    }
    const canvasFireMock = editor.canvas.fire as jest.Mock

    enteredHandler({
      target: textNode
    })

    canvasFireMock.mockClear()
    textNode.set({
      text: 'updated text'
    })
    textNodeWithRawText.textCaseRaw = 'updated text'

    beforeTextUpdatedHandler({
      textbox: textNode,
      target: textNode,
      style: {},
      options: {
        withoutSave: false,
        skipRender: true
      },
      updates: {
        text: 'updated text'
      }
    })
    textUpdatedHandler({
      textbox: textNode,
      target: textNode,
      style: {},
      options: {
        withoutSave: false,
        skipRender: true
      },
      updates: {
        text: 'updated text'
      },
      before: {},
      after: {}
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-update',
        target: textNode
      })
    ])

    exitedHandler({
      target: textNode
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-update',
        target: textNode
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-update',
        target: textNode
      })
    ])
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

  it('после замены следующий ввод текста не возвращает фигуру к размеру до пересчёта пропорций', async() => {
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

    applyShapeTextLayoutMock.mockImplementationOnce(({
      group: currentGroup,
      shape,
      text,
      alignH,
      alignV,
      padding
    }) => {
      applyShapeTextLayoutToMockGroup({
        group: currentGroup,
        shape,
        text,
        width: 220,
        height: 200,
        alignH,
        alignV,
        padding
      })
    })

    await manager.update({
      target: group,
      presetKey: 'arrow-up'
    })

    const enteredHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:entered'
    })
    const changedHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:changed'
    })
    const textNode = manager.getTextNode({
      target: group
    })

    if (!enteredHandler || !changedHandler || !textNode) {
      throw new Error('shape manager change handlers should be registered')
    }

    applyShapeTextLayoutMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(220)

    enteredHandler({
      target: textNode
    })

    changedHandler({
      target: textNode
    })

    expect(group.shapeManualBaseWidth).toBe(220)
    expect(group.shapeManualBaseHeight).toBe(200)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: 220,
      minimumWidth: 220,
      montageAreaWidth: 400
    }))
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 220,
      height: 200
    }))
  })

  it('при выключенном авторасширении после замены следующий ввод текста не возвращает фигуру к размеру до пересчёта пропорций', async() => {
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

    applyShapeTextLayoutMock.mockImplementationOnce(({
      group: currentGroup,
      shape,
      text,
      alignH,
      alignV,
      padding
    }) => {
      applyShapeTextLayoutToMockGroup({
        group: currentGroup,
        shape,
        text,
        width: 220,
        height: 200,
        alignH,
        alignV,
        padding
      })
    })

    await manager.update({
      target: group,
      presetKey: 'arrow-up'
    })

    const enteredHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:editing:entered'
    })
    const changedHandler = getCanvasHandler({
      canvas: editor.canvas,
      eventName: 'text:changed'
    })
    const textNode = manager.getTextNode({
      target: group
    })

    if (!enteredHandler || !changedHandler || !textNode) {
      throw new Error('shape manager change handlers should be registered')
    }

    applyShapeTextLayoutMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()

    enteredHandler({
      target: textNode
    })

    changedHandler({
      target: textNode
    })

    expect(group.shapeManualBaseWidth).toBe(220)
    expect(group.shapeManualBaseHeight).toBe(200)
    expect(resolveShapeTextAutoExpandWidthForTextMock).not.toHaveBeenCalled()
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 220,
      height: 200
    }))
  })
})
