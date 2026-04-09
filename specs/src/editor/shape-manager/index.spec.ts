import { Group, Textbox } from 'fabric'
import ShapeManager from '../../../../src/editor/shape-manager'
import {
  applyShapeStyle,
  createShapeNode
} from '../../../../src/editor/shape-manager/shape-factory'
import {
  applyShapeTextLayout,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText,
  resolveShapeTextFixedWidthLayout,
  resolveShapeTextFrameLayout,
  resolveShapeTextAutoExpandWidthForText
} from '../../../../src/editor/shape-manager/layout/shape-layout'
import { getShapePreset } from '../../../../src/editor/shape-manager/shape-presets'
import {
  applyShapeTextLayoutToMockGroup,
  applyTextStyleToShapeText,
  getCanvasEventPayloads,
  createShapeManagerEditorStub,
  createMockShapeNode,
  getCanvasHandler,
  getRequiredCanvasHandler
} from '../../../test-utils/shape-helpers'

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

describe('shape-manager', () => {
  const createShapeNodeMock = createShapeNode as jest.Mock
  const applyShapeStyleMock = applyShapeStyle as jest.Mock
  const applyShapeTextLayoutMock = applyShapeTextLayout as jest.Mock
  const resolveMinimumShapeWidthForTextMock = resolveMinimumShapeWidthForText as jest.Mock
  const resolveRequiredShapeHeightForTextMock = resolveRequiredShapeHeightForText as jest.Mock
  const resolveShapeTextFixedWidthLayoutMock = resolveShapeTextFixedWidthLayout as jest.Mock
  const resolveShapeTextFrameLayoutMock = resolveShapeTextFrameLayout as jest.Mock
  const resolveShapeTextAutoExpandWidthForTextMock = resolveShapeTextAutoExpandWidthForText as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    createShapeNodeMock.mockImplementation(async() => createMockShapeNode())
    applyShapeTextLayoutMock.mockImplementation(applyShapeTextLayoutToMockGroup)
    resolveMinimumShapeWidthForTextMock.mockImplementation(() => 1)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({
      height
    }: {
      height: number
    }) => Math.max(1, height))
    resolveShapeTextFrameLayoutMock.mockImplementation(({
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
    }))
    resolveShapeTextFixedWidthLayoutMock.mockImplementation(({
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
    }))
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
      'mouse:up',
      'text:editing:entered',
      'text:editing:exited',
      'text:changed',
      'editor:before:text-updated',
      'editor:text-updated'
    ]))

    manager.destroy()

    const offEvents = (editor.canvas.off as jest.Mock).mock.calls.map((call) => call[0])
    expect(offEvents).toEqual(expect.arrayContaining([
      'object:scaling',
      'object:modified',
      'mouse:down',
      'mouse:up',
      'text:editing:entered',
      'text:editing:exited',
      'text:changed',
      'editor:before:text-updated',
      'editor:text-updated'
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

  it('add поддерживает justify через textStyle.align', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        textStyle: {
          align: 'justify'
        }
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

    expect(group.shapeAlignHorizontal).toBe('justify')
    expect(textNode.textAlign).toBe('justify')
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      group,
      text: textNode,
      alignH: 'justify'
    }))
  })

  it('ставит шейп в переданную точку и не тянет его в центр', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        left: 320,
        top: 280,
        originX: 'right',
        originY: 'bottom'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const anchor = group.getPointByOrigin('right', 'bottom')

    expect(group.originX).toBe('right')
    expect(group.originY).toBe('bottom')
    expect(anchor.x).toBe(320)
    expect(anchor.y).toBe(280)
    expect(editor.canvasManager.centerObjectToMontageArea).not.toHaveBeenCalled()
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

  it('при добавлении шейпа без отступов сохраняет нули по всем сторонам', async() => {
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

    expect(group.shapePaddingTop).toBe(0)
    expect(group.shapePaddingRight).toBe(0)
    expect(group.shapePaddingBottom).toBe(0)
    expect(group.shapePaddingLeft).toBe(0)
  })

  it('при добавлении фигуры учитывает обводку во внутреннем отступе текста', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        stroke: '#00ff00',
        strokeWidth: 8
      }
    })

    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      internalShapeTextInset: {
        top: 8,
        right: 8,
        bottom: 8,
        left: 8
      }
    }))
  })

  it('при добавлении шейпа нормализует пользовательские отступы до целых неотрицательных пикселей', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        textPadding: {
          top: 10.9,
          right: -3,
          bottom: 4.2,
          left: 7.8
        }
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    expect(group.shapePaddingTop).toBe(10)
    expect(group.shapePaddingRight).toBe(0)
    expect(group.shapePaddingBottom).toBe(4)
    expect(group.shapePaddingLeft).toBe(7)
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

  it('при добавлении без preserveAspectRatio оставляет заданные width и height у не-квадратной фигуры', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'arrow-up',
      options: {
        width: 200,
        height: 200
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    expect(group.shapeBaseWidth).toBe(200)
    expect(group.shapeBaseHeight).toBe(200)
    expect(group.shapeManualBaseWidth).toBe(200)
    expect(group.shapeManualBaseHeight).toBe(200)
    expect(group.shapeReplaceBoxWidth).toBe(200)
    expect(group.shapeReplaceBoxHeight).toBe(200)
    expect(createShapeNodeMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 200,
      height: 200
    }))
  })

  it('при добавлении с preserveAspectRatio вписывает фигуру в заданный box и сохраняет его для последующей замены', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const preset = getShapePreset({
      presetKey: 'arrow-up'
    })

    if (!preset) {
      throw new Error('shape preset should exist')
    }

    const scale = Math.min(200 / preset.width, 200 / preset.height)
    const expectedWidth = preset.width * scale
    const expectedHeight = preset.height * scale
    const group = await manager.add({
      presetKey: 'arrow-up',
      options: {
        width: 200,
        height: 200,
        preserveAspectRatio: true
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    expect(group.shapeBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(group.shapeBaseHeight).toBeCloseTo(expectedHeight, 4)
    expect(group.shapeManualBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(group.shapeManualBaseHeight).toBeCloseTo(expectedHeight, 4)
    expect(group.shapeReplaceBoxWidth).toBe(200)
    expect(group.shapeReplaceBoxHeight).toBe(200)
    expect(group.shapeBaseWidth).toBeLessThanOrEqual(200)
    expect(group.shapeBaseHeight).toBeLessThanOrEqual(200)
    expect(group.shapeBaseHeight / group.shapeBaseWidth).toBeCloseTo(preset.height / preset.width, 4)
  })

  it('при добавлении с preserveAspectRatio и одной заданной осью вычисляет вторую по пропорциям пресета', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const preset = getShapePreset({
      presetKey: 'arrow-up'
    })

    if (!preset) {
      throw new Error('shape preset should exist')
    }

    const expectedWidth = 280
    const expectedHeight = preset.height * (expectedWidth / preset.width)
    const group = await manager.add({
      presetKey: 'arrow-up',
      options: {
        width: expectedWidth,
        preserveAspectRatio: true
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    expect(group.shapeBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(group.shapeBaseHeight).toBeCloseTo(expectedHeight, 4)
    expect(group.shapeManualBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(group.shapeManualBaseHeight).toBeCloseTo(expectedHeight, 4)
    expect(group.shapeReplaceBoxWidth).toBeCloseTo(expectedWidth, 4)
    expect(group.shapeReplaceBoxHeight).toBeCloseTo(expectedHeight, 4)
    expect(group.shapeBaseHeight / group.shapeBaseWidth).toBeCloseTo(preset.height / preset.width, 4)
  })

  it('после добавления с preserveAspectRatio смена фигуры использует исходный box добавления', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const createdShape = await manager.add({
      presetKey: 'arrow-up',
      options: {
        width: 220,
        height: 200,
        preserveAspectRatio: true
      }
    })
    const nextPreset = getShapePreset({
      presetKey: 'arrow-right'
    })

    if (!createdShape || !nextPreset) {
      throw new Error('shape and preset should exist')
    }

    const updatedShape = await manager.update({
      target: createdShape,
      presetKey: 'arrow-right'
    })
    const scale = Math.min(220 / nextPreset.width, 200 / nextPreset.height)
    const expectedWidth = nextPreset.width * scale
    const expectedHeight = nextPreset.height * scale

    expect(updatedShape).not.toBeNull()
    expect(updatedShape?.shapePresetKey).toBe('arrow-right')
    expect(updatedShape?.shapeBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(updatedShape?.shapeBaseHeight).toBeCloseTo(expectedHeight, 4)
    expect(updatedShape?.shapeManualBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(updatedShape?.shapeManualBaseHeight).toBeCloseTo(expectedHeight, 4)
    expect(updatedShape?.shapeReplaceBoxWidth).toBeCloseTo(220, 4)
    expect(updatedShape?.shapeReplaceBoxHeight).toBeCloseTo(200, 4)
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

  it('update сохраняет тот же instance фигуры и существующий текстовый узел', async() => {
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
    const canvasFireMock = editor.canvas.fire as jest.Mock

    editor.canvas.add.mockClear()
    editor.canvas.remove.mockClear()
    canvasFireMock.mockClear()

    const updatedGroup = await manager.update({
      target: originalGroup,
      presetKey: 'circle'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup).toBe(originalGroup)
    expect(editor.canvas.remove).not.toHaveBeenCalledWith(originalGroup)
    expect(editor.canvas.add).not.toHaveBeenCalledWith(updatedGroup)

    const updatedShapeNode = updatedGroup?.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'shape')
    const updatedTextNode = updatedGroup?.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')
    expect(updatedShapeNode).toBe(secondShape)
    expect(updatedTextNode).toBe(originalTextNode)
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: originalGroup,
        source: 'update',
        target: originalGroup,
        presetKey: 'circle'
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: originalGroup,
        source: 'update',
        target: originalGroup,
        presetKey: 'circle',
        after: expect.objectContaining({
          presetKey: 'circle'
        })
      })
    ])
  })

  it('при смене пресета вписывает новую фигуру в исходный бокс замены', async() => {
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

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'arrow-up'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapePresetKey).toBe('arrow-up')
    expect(updatedGroup?.shapeBaseWidth).toBe(140)
    expect(updatedGroup?.shapeBaseHeight).toBe(180)
    expect(updatedGroup?.shapeManualBaseWidth).toBe(140)
    expect(updatedGroup?.shapeManualBaseHeight).toBe(180)
    expect(updatedGroup?.shapeReplaceBoxWidth).toBe(180)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(180)
  })

  it('с preserveCurrentAspectRatio при смене пресета оставляет текущий размер фигуры', async() => {
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

    group.shapeReplaceBoxWidth = 320
    group.shapeReplaceBoxHeight = 180

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'arrow-up',
      options: {
        preserveCurrentAspectRatio: true
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapePresetKey).toBe('arrow-up')
    expect(updatedGroup?.shapeBaseWidth).toBe(180)
    expect(updatedGroup?.shapeBaseHeight).toBe(180)
    expect(updatedGroup?.shapeManualBaseWidth).toBe(180)
    expect(updatedGroup?.shapeManualBaseHeight).toBe(180)
    expect(updatedGroup?.shapeReplaceBoxWidth).toBe(180)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(180)
  })

  it('при повторной замене не сужает фигуру относительно исходного бокса замены', async() => {
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

    await manager.update({
      target: group,
      presetKey: 'arrow-up'
    })

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'arrow-right'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapePresetKey).toBe('arrow-right')
    expect(updatedGroup?.shapeBaseWidth).toBe(180)
    expect(updatedGroup?.shapeBaseHeight).toBe(140)
    expect(updatedGroup?.shapeManualBaseWidth).toBe(180)
    expect(updatedGroup?.shapeManualBaseHeight).toBe(140)
    expect(updatedGroup?.shapeReplaceBoxWidth).toBe(180)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(180)
  })

  it('для старой фигуры без replacement box использует текущий размер как fallback при замене', async() => {
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

    group.shapeBaseWidth = 260
    group.shapeBaseHeight = 140
    group.shapeManualBaseWidth = 180
    group.shapeManualBaseHeight = 180
    group.width = 260
    group.height = 140

    delete (group as typeof group & {
      shapeReplaceBoxWidth?: number
      shapeReplaceBoxHeight?: number
    }).shapeReplaceBoxWidth
    delete (group as typeof group & {
      shapeReplaceBoxWidth?: number
      shapeReplaceBoxHeight?: number
    }).shapeReplaceBoxHeight

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'arrow-up'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapeBaseWidth).toBeCloseTo(108.8889, 4)
    expect(updatedGroup?.shapeBaseHeight).toBe(140)
    expect(updatedGroup?.shapeManualBaseWidth).toBeCloseTo(108.8889, 4)
    expect(updatedGroup?.shapeManualBaseHeight).toBe(140)
    expect(updatedGroup?.shapeReplaceBoxWidth).toBe(260)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(140)
  })

  it('если после замены фигура выросла, новый размер становится базовым и сохраняется в replacement box', async() => {
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

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'arrow-up'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapeBaseWidth).toBe(220)
    expect(updatedGroup?.shapeBaseHeight).toBe(200)
    expect(updatedGroup?.shapeManualBaseWidth).toBe(220)
    expect(updatedGroup?.shapeManualBaseHeight).toBe(200)
    expect(updatedGroup?.shapeReplaceBoxWidth).toBeCloseTo(220, 4)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(200)
  })

  it('после замены на выросшей фигуре следующая замена берёт уже новый бокс замены', async() => {
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

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'arrow-right'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapePresetKey).toBe('arrow-right')
    expect(updatedGroup?.shapeBaseWidth).toBeCloseTo(220, 4)
    expect(updatedGroup?.shapeBaseHeight).toBeCloseTo(171.1111, 4)
    expect(updatedGroup?.shapeManualBaseWidth).toBeCloseTo(220, 4)
    expect(updatedGroup?.shapeManualBaseHeight).toBeCloseTo(171.1111, 4)
    expect(updatedGroup?.shapeReplaceBoxWidth).toBeCloseTo(220, 4)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(200)
  })

  it('update с withoutSave передаёт этот флаг в payload обновления фигуры', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const saveStateMock = editor.historyManager.saveState as jest.Mock
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

    await manager.update({
      target: group,
      presetKey: 'circle',
      options: {
        withoutSave: true
      }
    })

    expect(saveStateMock).not.toHaveBeenCalled()
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'update',
        target: group,
        presetKey: 'circle',
        withoutSave: true
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'update',
        target: group,
        presetKey: 'circle',
        withoutSave: true
      })
    ])
  })

  it('обновление ещё не добавленной фигуры не трогает canvas и историю', async() => {
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

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        withoutAdding: true
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const originalTextNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')
    editor.canvas.add.mockClear()
    editor.canvas.remove.mockClear()
    editor.canvas.setActiveObject.mockClear()
    editor.canvas.requestRenderAll.mockClear()
    editor.historyManager.suspendHistory.mockClear()
    editor.historyManager.resumeHistory.mockClear()
    editor.historyManager.saveState.mockClear()

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'circle'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup).toBe(group)
    expect(updatedGroup?.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'shape')).toBe(secondShape)
    expect(updatedGroup?.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')).toBe(originalTextNode)
    expect(editor.canvas.add).not.toHaveBeenCalled()
    expect(editor.canvas.remove).not.toHaveBeenCalled()
    expect(editor.canvas.setActiveObject).not.toHaveBeenCalled()
    expect(editor.canvas.requestRenderAll).not.toHaveBeenCalled()
    expect(editor.historyManager.suspendHistory).not.toHaveBeenCalled()
    expect(editor.historyManager.resumeHistory).not.toHaveBeenCalled()
    expect(editor.historyManager.saveState).not.toHaveBeenCalled()
  })

  it('если обновление не удалось, фигура остаётся в исходном состоянии', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const updateTextMock = editor.textManager.updateText as jest.Mock
    const firstShape = createMockShapeNode({
      width: 180,
      height: 180
    })
    const updateError = new Error('shape update failed')

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
    })

    createShapeNodeMock
      .mockResolvedValueOnce(firstShape)
      .mockRejectedValueOnce(updateError)

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const originalShapeNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'shape')
    const originalTextNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')
    const originalText = (originalTextNode as Textbox | undefined)?.text
    const originalPresetKey = group.shapePresetKey
    const originalManualBaseWidth = group.shapeManualBaseWidth

    editor.canvas.add.mockClear()
    editor.canvas.remove.mockClear()
    editor.canvas.requestRenderAll.mockClear()
    editor.historyManager.suspendHistory.mockClear()
    editor.historyManager.resumeHistory.mockClear()
    editor.historyManager.saveState.mockClear()
    updateTextMock.mockClear()

    await expect(manager.update({
      target: group,
      presetKey: 'circle',
      options: {
        text: 'updated shape text',
        width: 260
      }
    })).rejects.toThrow(updateError)

    expect(group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'shape')).toBe(originalShapeNode)
    expect(group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'text')).toBe(originalTextNode)
    expect((originalTextNode as Textbox | undefined)?.text).toBe(originalText)
    expect(group.shapePresetKey).toBe(originalPresetKey)
    expect(group.shapeManualBaseWidth).toBe(originalManualBaseWidth)
    expect(editor.canvas.add).not.toHaveBeenCalled()
    expect(editor.canvas.remove).not.toHaveBeenCalled()
    expect(editor.canvas.requestRenderAll).not.toHaveBeenCalled()
    expect(editor.historyManager.suspendHistory).not.toHaveBeenCalled()
    expect(editor.historyManager.resumeHistory).not.toHaveBeenCalled()
    expect(editor.historyManager.saveState).not.toHaveBeenCalled()
    expect(updateTextMock).toHaveBeenCalledTimes(1)
  })

  it('после обновления шейп остаётся на той же точке позиционирования', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        width: 180,
        left: 320,
        top: 280,
        originX: 'right',
        originY: 'bottom'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const anchorBefore = group.getPointByOrigin('right', 'bottom')
    const updatedGroup = await manager.update({
      target: group,
      options: {
        width: 260
      }
    })

    if (!updatedGroup) {
      throw new Error('shape group should be updated')
    }

    const anchorAfter = updatedGroup.getPointByOrigin('right', 'bottom')

    expect(updatedGroup.originX).toBe('right')
    expect(updatedGroup.originY).toBe('bottom')
    expect(anchorAfter.x).toBe(anchorBefore.x)
    expect(anchorAfter.y).toBe(anchorBefore.y)
  })

  it('update поддерживает justify через alignH', async() => {
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

    applyShapeTextLayoutMock.mockClear()

    const updatedGroup = await manager.update({
      target: group,
      options: {
        alignH: 'justify'
      }
    })

    if (!updatedGroup) {
      throw new Error('shape group should be updated')
    }

    const textNode = manager.getTextNode({
      target: updatedGroup
    })

    if (!textNode) {
      throw new Error('shape text node should exist')
    }

    expect(textNode.textAlign).toBe('justify')
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      group: updatedGroup,
      text: textNode,
      alignH: 'justify'
    }))
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
      currentWidth: 260,
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

  it('при изменении одной стороны оставляет остальные отступы как были', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        textPadding: {
          top: 2,
          right: 4,
          bottom: 6,
          left: 8
        }
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const updatedGroup = await manager.update({
      target: group,
      options: {
        textPadding: {
          right: 19.7
        }
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapePaddingTop).toBe(2)
    expect(updatedGroup?.shapePaddingRight).toBe(19)
    expect(updatedGroup?.shapePaddingBottom).toBe(6)
    expect(updatedGroup?.shapePaddingLeft).toBe(8)
  })

  it('при изменении только отступов не пересчитывает размер шейпа заново', async() => {
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
        textPadding: {
          top: 2,
          right: 4,
          bottom: 6,
          left: 8
        }
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    group.shapeBaseWidth = 240
    group.shapeBaseHeight = 140
    group.width = 240
    group.height = 140

    applyShapeTextLayoutMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()

    const updatedGroup = await manager.update({
      target: group,
      options: {
        textPadding: {
          right: 20
        }
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(resolveShapeTextAutoExpandWidthForTextMock).not.toHaveBeenCalled()
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 240,
      height: 140,
      expandShapeHeightToFitText: false,
      changedPadding: {
        right: true
      }
    }))
  })

  it('при изменении только обводки сохраняет текущую ширину и пересчитывает layout в этих размерах', async() => {
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

    group.shapeBaseWidth = 240
    group.shapeBaseHeight = 140
    group.width = 240
    group.height = 140

    applyShapeTextLayoutMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()

    const updatedGroup = await manager.update({
      target: group,
      options: {
        stroke: '#00ff00',
        strokeWidth: 10
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(resolveShapeTextAutoExpandWidthForTextMock).not.toHaveBeenCalled()
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 240,
      height: 140,
      internalShapeTextInset: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
      }
    }))
  })

  it('при смене пресета сохраняет пользовательские отступы', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        textPadding: {
          top: 2,
          right: 4,
          bottom: 6,
          left: 8
        }
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'circle'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapePaddingTop).toBe(2)
    expect(updatedGroup?.shapePaddingRight).toBe(4)
    expect(updatedGroup?.shapePaddingBottom).toBe(6)
    expect(updatedGroup?.shapePaddingLeft).toBe(8)
  })

  it('обновление шейпа во время редактирования оставляет фигуру в режиме редактирования текста', async() => {
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
    expect(updatedGroup?.selectable).toBe(false)
    expect(updatedGroup?.evented).toBe(true)
    expect(updatedGroup?.lockMovementX).toBe(true)
    expect(updatedGroup?.lockMovementY).toBe(true)
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
    expect(updatedGroup?.evented).toBe(true)
    expect(updatedGroup?.lockMovementX).toBe(true)
    expect(updatedGroup?.lockMovementY).toBe(true)
  })

  it('с флагом withoutSelection обновление не перехватывает текущее выделение', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const firstGroup = await manager.add({
      presetKey: 'square',
      options: {
        text: 'first shape'
      }
    })
    const secondGroup = await manager.add({
      presetKey: 'square',
      options: {
        text: 'second shape'
      }
    })

    if (!firstGroup || !secondGroup) {
      throw new Error('shape groups should be created')
    }

    const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
    setActiveObjectMock.mockClear()

    const updatedGroup = await manager.update({
      target: firstGroup,
      options: {
        width: 260,
        withoutSelection: true
      }
    })

    expect(updatedGroup).toBe(firstGroup)
    expect(editor.canvas.getActiveObject()).toBe(secondGroup)
    expect(setActiveObjectMock).not.toHaveBeenCalledWith(firstGroup)
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

  it('эмитит обновление фигуры после завершения изменения размера, а не во время перетягивания', async() => {
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

    group.originX = 'right'
    group.originY = 'bottom'
    group.flipX = true
    group.flipY = true

    const scalingController = (manager as unknown as {
      scalingController: {
        handleObjectScaling: (event: unknown) => void
        handleObjectModified: (event: unknown) => void
      }
    }).scalingController
    const mouseDownHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'mouse:down'
    })
    const objectScalingHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:scaling'
    })
    const objectModifiedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:modified'
    })
    const scalingTransform = {
      action: 'scaleX',
      corner: 'mr',
      target: group,
      original: {
        scaleX: 1,
        scaleY: 1,
        left: group.left ?? 0,
        top: group.top ?? 0,
        originX: group.originX ?? 'center',
        originY: group.originY ?? 'center'
      }
    } as never
    const canvasFireMock = editor.canvas.fire as jest.Mock

    jest.spyOn(scalingController, 'handleObjectScaling').mockImplementation(() => {})
    jest.spyOn(scalingController, 'handleObjectModified').mockImplementation(() => {
      group.shapeBaseWidth = 270
      group.shapeManualBaseWidth = 270
      group.width = 270
      group.left = 155
      group.scaleX = 1
      group.setCoords()
    })

    mouseDownHandler({
      target: group
    })

    canvasFireMock.mockClear()

    objectScalingHandler({
      target: group,
      transform: scalingTransform
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toHaveLength(0)
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toHaveLength(0)

    objectModifiedHandler({
      target: group,
      transform: scalingTransform
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'resize',
        target: group
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'resize',
        target: group,
        before: expect.objectContaining({
          currentWidth: 180,
          originX: 'right',
          originY: 'bottom',
          flipX: true,
          flipY: true
        }),
        after: expect.objectContaining({
          currentWidth: 270,
          originX: 'right',
          originY: 'bottom',
          flipX: true,
          flipY: true
        })
      })
    ])
  })

  it('не шлёт обновление фигуры, если изменение размера не поменяло итоговый размер', async() => {
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

    const scalingController = (manager as unknown as {
      scalingController: {
        handleObjectScaling: (event: unknown) => void
        handleObjectModified: (event: unknown) => void
      }
    }).scalingController
    const mouseDownHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'mouse:down'
    })
    const objectScalingHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:scaling'
    })
    const objectModifiedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:modified'
    })
    const scalingTransform = {
      action: 'scaleX',
      corner: 'mr',
      target: group,
      original: {
        scaleX: 1,
        scaleY: 1,
        left: group.left ?? 0,
        top: group.top ?? 0,
        originX: group.originX ?? 'center',
        originY: group.originY ?? 'center'
      }
    } as never
    const canvasFireMock = editor.canvas.fire as jest.Mock

    jest.spyOn(scalingController, 'handleObjectScaling').mockImplementation(() => {})
    jest.spyOn(scalingController, 'handleObjectModified').mockImplementation(() => {})

    mouseDownHandler({
      target: group
    })

    canvasFireMock.mockClear()

    objectScalingHandler({
      target: group,
      transform: scalingTransform
    })
    objectModifiedHandler({
      target: group,
      transform: scalingTransform
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
