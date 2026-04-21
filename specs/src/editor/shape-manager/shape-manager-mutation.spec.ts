import ShapeManager from '../../../../src/editor/shape-manager'
import {
  applyShapeTextLayoutToMockGroup,
  applyTextStyleToShapeText,
  createShapeManagerEditorStub,
  getCanvasEventPayloads,
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

describe('shape-manager mutation', () => {
  const mocks = getShapeManagerUnitMocks()
  const {
    applyShapeStyleMock,
    applyShapeTextLayoutMock,
    resolveShapeTextAutoExpandWidthForTextMock
  } = mocks

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
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

    const canvasFireMock = editor.canvas.fire as jest.Mock

    canvasFireMock.mockClear()

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
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'opacity',
        target: group
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'opacity',
        target: group,
        after: expect.objectContaining({
          opacity: 0.4
        })
      })
    ])
  })

  it('при изменении заливки шлёт обновление фигуры', async() => {
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

    const canvasFireMock = editor.canvas.fire as jest.Mock

    canvasFireMock.mockClear()

    const updatedGroup = manager.setFill({
      target: group,
      fill: '#ff0000'
    })

    expect(updatedGroup).toBe(group)
    expect(group.shapeFill).toBe('#ff0000')
    expect(applyShapeStyleMock).toHaveBeenCalledWith(expect.objectContaining({
      style: {
        fill: '#ff0000'
      }
    }))
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'fill',
        target: group
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'fill',
        target: group,
        after: expect.objectContaining({
          fill: '#ff0000'
        })
      })
    ])
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
    const canvasFireMock = editor.canvas.fire as jest.Mock

    saveStateMock.mockClear()
    applyShapeTextLayoutMock.mockClear()
    canvasFireMock.mockClear()

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
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-style',
        target: group
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-style',
        target: group,
        after: expect.objectContaining({
          text: expect.objectContaining({
            fill: '#ff0000',
            stroke: '#00ff00',
            strokeWidth: 3,
            fontWeight: 'bold',
            textAlign: 'left'
          })
        })
      })
    ])
  })

  it('updateTextStyle поддерживает justify для текста внутри шейпа', async() => {
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
    updateTextMock.mockClear()

    manager.updateTextStyle({
      target: group,
      style: {
        align: 'justify'
      }
    })

    expect(updateTextMock).toHaveBeenCalledWith(expect.objectContaining({
      target: textNode,
      style: expect.objectContaining({
        align: 'justify'
      })
    }))
    expect(textNode.textAlign).toBe('justify')
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      group,
      text: textNode,
      alignH: 'justify'
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

  it('после замены увеличение текста считает минимальную ширину от нового размера фигуры', async() => {
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

    applyShapeTextLayoutMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(220)

    manager.updateTextStyle({
      target: group,
      style: {
        fontSize: 96
      }
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

    const canvasFireMock = editor.canvas.fire as jest.Mock

    saveStateMock.mockClear()
    canvasFireMock.mockClear()

    manager.updateTextStyle({
      target: group,
      style: {
        fill: '#123456'
      },
      withoutSave: true
    })

    expect(saveStateMock).not.toHaveBeenCalled()
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-style',
        target: group,
        withoutSave: true
      })
    ])
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

    const canvasFireMock = editor.canvas.fire as jest.Mock

    saveStateMock.mockClear()
    applyShapeTextLayoutMock.mockClear()
    canvasFireMock.mockClear()

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
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-align',
        target: group
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'text-align',
        target: group,
        after: expect.objectContaining({
          text: expect.objectContaining({
            textAlign: 'right'
          })
        })
      })
    ])
  })

  it('setTextAlign поддерживает justify в horizontal выравнивании', async() => {
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
      horizontal: 'justify',
      vertical: 'bottom'
    })

    expect(textNode.textAlign).toBe('justify')
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      group,
      text: textNode,
      alignH: 'justify',
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

    const groupWithRoundFlag = group as {
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

  it('setRounding меняет скругление и сохраняет текущий размер фигуры', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        width: 260,
        height: 140,
        shapeTextAutoExpand: false
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const result = await manager.setRounding({
      target: group,
      rounding: 28
    })

    expect(result).toBe(group)
    expect(group.shapePresetKey).toBe('square')
    expect(group.shapeRounding).toBe(28)
    expect(group.shapeBaseWidth).toBe(260)
    expect(group.shapeBaseHeight).toBe(140)
    expect(group.shapeManualBaseWidth).toBe(260)
    expect(group.shapeManualBaseHeight).toBe(140)
    expect(group.shapeReplaceBoxWidth).toBe(260)
    expect(group.shapeReplaceBoxHeight).toBe(140)
  })

  it('при изменении обводки пересчитывает layout в текущих размерах шейпа', async() => {
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
    group.shapeBaseHeight = 150
    group.width = 260
    group.height = 150

    applyShapeTextLayoutMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()
    const canvasFireMock = editor.canvas.fire as jest.Mock

    canvasFireMock.mockClear()

    const updatedGroup = manager.setStroke({
      target: group,
      stroke: '#00ff00',
      strokeWidth: 12
    })

    expect(updatedGroup).toBe(group)
    expect(group.shapeStrokeWidth).toBe(12)
    expect(resolveShapeTextAutoExpandWidthForTextMock).not.toHaveBeenCalled()
    expect(applyShapeStyleMock).toHaveBeenCalledWith(expect.objectContaining({
      style: expect.objectContaining({
        stroke: '#00ff00',
        strokeWidth: 12
      })
    }))
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 260,
      height: 150,
      internalShapeTextInset: {
        top: 12,
        right: 12,
        bottom: 12,
        left: 12
      }
    }))
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'stroke',
        target: group
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'stroke',
        target: group,
        after: expect.objectContaining({
          stroke: '#00ff00',
          strokeWidth: 12
        })
      })
    ])
  })
})
