import '../../../test-utils/shape-manager-module-mocks'
import { Textbox } from 'fabric'
import ShapeManager from '../../../../src/editor/shape-manager'
import {
  applyShapeTextLayoutToMockGroup,
  applyTextStyleToShapeText,
  createMockShapeNode,
  createShapeManagerEditorStub,
  getCanvasEventPayloads,
  getCanvasHandler,
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape-manager-spec-helpers'

describe('shape-manager update', () => {
  const mocks = getShapeManagerUnitMocks()
  const {
    applyShapeTextLayoutMock,
    createShapeNodeMock,
    resolveShapeTextAutoExpandWidthForTextMock
  } = mocks

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
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

  it('при обновлении roundable шейпа нормализует новое скругление', async() => {
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

    createShapeNodeMock.mockClear()

    const updatedGroup = await manager.update({
      target: group,
      options: {
        rounding: 999999
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapeRounding).toBe(100)
    expect(updatedGroup?.shapeCanRound).toBe(true)
    expect(createShapeNodeMock).toHaveBeenLastCalledWith(expect.objectContaining({
      rounding: 100
    }))
  })

  it('при обновлении скругления с тем же пресетом сохраняет текущий размер фигуры', async() => {
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

    createShapeNodeMock.mockClear()

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'square',
      options: {
        rounding: 28
      }
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapePresetKey).toBe('square')
    expect(updatedGroup?.shapeRounding).toBe(28)
    expect(updatedGroup?.shapeBaseWidth).toBe(260)
    expect(updatedGroup?.shapeBaseHeight).toBe(140)
    expect(updatedGroup?.shapeManualBaseWidth).toBe(260)
    expect(updatedGroup?.shapeManualBaseHeight).toBe(140)
    expect(updatedGroup?.shapeReplaceBoxWidth).toBe(260)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(140)
    expect(createShapeNodeMock).toHaveBeenLastCalledWith(expect.objectContaining({
      width: 260,
      height: 140,
      rounding: 28
    }))
  })

  it('при смене на non-roundable пресет сбрасывает скругление в 0', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        rounding: 50
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    createShapeNodeMock.mockClear()

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'circle'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapeRounding).toBe(0)
    expect(updatedGroup?.shapeCanRound).toBe(false)
    expect(createShapeNodeMock).toHaveBeenLastCalledWith(expect.objectContaining({
      rounding: 0
    }))
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

  it('с preserveCurrentAspectRatio при смене пресета оставляет текущий размер фигуры и не переписывает replace box', async() => {
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

    const initialReplaceBoxWidth = 320
    const initialReplaceBoxHeight = 180

    group.shapeReplaceBoxWidth = initialReplaceBoxWidth
    group.shapeReplaceBoxHeight = initialReplaceBoxHeight

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
    expect(updatedGroup?.shapeReplaceBoxWidth).toBe(initialReplaceBoxWidth)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(initialReplaceBoxHeight)
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

  it('если после замены фигура выросла, новый размер становится базовым, но replace box остаётся исходным', async() => {
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

    // Запоминаем исходный replace box до замены
    const initialReplaceBoxWidth = group.shapeReplaceBoxWidth
    const initialReplaceBoxHeight = group.shapeReplaceBoxHeight

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
    // Фактический размер вырос под текст
    expect(updatedGroup?.shapeBaseWidth).toBe(220)
    expect(updatedGroup?.shapeBaseHeight).toBe(200)
    // Ручная база поднята до финального размера для текущего пресета
    expect(updatedGroup?.shapeManualBaseWidth).toBe(220)
    expect(updatedGroup?.shapeManualBaseHeight).toBe(200)
    // Но replace box остаётся исходным, если не было явных width/height в update
    expect(updatedGroup?.shapeReplaceBoxWidth).toBe(initialReplaceBoxWidth)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(initialReplaceBoxHeight)
  })

  it('после замены с ростом под текст следующая замена использует исходный replace box', async() => {
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

    // Запоминаем исходный replace box
    const initialReplaceBoxWidth = group.shapeReplaceBoxWidth
    const initialReplaceBoxHeight = group.shapeReplaceBoxHeight

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

    // Вторая замена использует исходный replace box, а не выросший размер
    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'arrow-right'
    })

    expect(updatedGroup).not.toBeNull()
    expect(updatedGroup?.shapePresetKey).toBe('arrow-right')

    if (initialReplaceBoxWidth === undefined || initialReplaceBoxHeight === undefined) {
      throw new Error('replace box should exist')
    }

    // Фигура вписывается в исходный replace box
    const nextScale = Math.min(
      initialReplaceBoxWidth / 180,
      initialReplaceBoxHeight / 140
    )
    const expectedWidth = 180 * nextScale
    const expectedHeight = 140 * nextScale
    expect(updatedGroup?.shapeBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(updatedGroup?.shapeBaseHeight).toBeCloseTo(expectedHeight, 4)
    expect(updatedGroup?.shapeManualBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(updatedGroup?.shapeManualBaseHeight).toBeCloseTo(expectedHeight, 4)
    // Replace box остаётся исходным
    expect(updatedGroup?.shapeReplaceBoxWidth).toBe(initialReplaceBoxWidth)
    expect(updatedGroup?.shapeReplaceBoxHeight).toBe(initialReplaceBoxHeight)
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

  it('не заменяет заблокированный шейп при смене пресета на star', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'TEST'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const originalShapeNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'shape')

    if (!originalShapeNode) {
      throw new Error('shape node should exist')
    }

    group.locked = true
    createShapeNodeMock.mockClear()

    await manager.update({
      target: group,
      presetKey: 'star'
    })

    const updatedShapeNode = group.getObjects().find((item) => (item as { shapeNodeType?: string }).shapeNodeType === 'shape')

    expect(group.shapePresetKey).toBe('square')
    expect(updatedShapeNode).toBe(originalShapeNode)
    expect(createShapeNodeMock).not.toHaveBeenCalled()
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([])
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
})
