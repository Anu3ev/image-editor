import '../../../test-utils/shape/manager-module-mocks'
import { Group } from 'fabric'
import ShapeManager from '../../../../src/editor/shape-manager'
import { getShapePreset } from '../../../../src/editor/shape-manager/domain/shape-presets'
import {
  applyShapeTextLayoutToMockGroup,
  createShapeManagerEditorStub,
  getRequiredCanvasHandler,
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape/manager-spec-helpers'

describe('shape-manager add', () => {
  const mocks = getShapeManagerUnitMocks()
  const {
    applyShapeTextLayoutMock,
    createShapeNodeMock,
    resolveShapeTextAutoExpandWidthForTextMock
  } = mocks

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
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

  it('при добавлении roundable шейпа сохраняет нормализованное скругление', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text',
        rounding: 999999
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    expect(group.shapeRounding).toBe(100)
    expect(group.shapeCanRound).toBe(true)
    expect(createShapeNodeMock).toHaveBeenLastCalledWith(expect.objectContaining({
      rounding: 100
    }))
  })

  it('при добавлении non-roundable шейпа сбрасывает скругление в 0', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'circle',
      options: {
        text: 'shape text',
        rounding: 50
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    expect(group.shapeRounding).toBe(0)
    expect(group.shapeCanRound).toBe(false)
    expect(createShapeNodeMock).toHaveBeenLastCalledWith(expect.objectContaining({
      rounding: 0
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

    const {
      shapeBaseWidth,
      shapeBaseHeight
    } = group

    if (shapeBaseWidth === undefined || shapeBaseHeight === undefined) {
      throw new Error('shape base size should exist')
    }

    expect(shapeBaseHeight / shapeBaseWidth).toBeCloseTo(preset.height / preset.width, 4)
  })

  it('при добавлении с preserveAspectRatio расширяет фигуру под текст, но сохраняет исходный replace box', async() => {
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

    const requestedWidth = 220
    const requestedHeight = 320
    const fittedScale = Math.min(
      requestedWidth / preset.width,
      requestedHeight / preset.height
    )
    const expandedWidth = preset.width * fittedScale * 1.25
    const expandedHeight = preset.height * fittedScale * 1.25

    applyShapeTextLayoutMock.mockImplementationOnce(({
      group,
      shape,
      text,
      alignH,
      alignV,
      padding
    }) => {
      applyShapeTextLayoutToMockGroup({
        group,
        shape,
        text,
        width: expandedWidth,
        height: expandedHeight,
        alignH,
        alignV,
        padding
      })
    })

    const group = await manager.add({
      presetKey: 'arrow-up',
      options: {
        width: requestedWidth,
        height: requestedHeight,
        preserveAspectRatio: true,
        text: 'TEST',
        textStyle: {
          fontSize: 72
        }
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    // Фактический размер вырос под текст
    expect(group.shapeBaseWidth).toBeCloseTo(expandedWidth, 4)
    expect(group.shapeBaseHeight).toBeCloseTo(expandedHeight, 4)
    // Ручная база поднята до финального размера для текущего пресета
    expect(group.shapeManualBaseWidth).toBeCloseTo(expandedWidth, 4)
    expect(group.shapeManualBaseHeight).toBeCloseTo(expandedHeight, 4)
    // Но replace box остаётся исходным (пользовательский контракт)
    expect(group.shapeReplaceBoxWidth).toBe(requestedWidth)
    expect(group.shapeReplaceBoxHeight).toBe(requestedHeight)
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

    const {
      shapeBaseWidth,
      shapeBaseHeight
    } = group

    if (shapeBaseWidth === undefined || shapeBaseHeight === undefined) {
      throw new Error('shape base size should exist')
    }

    expect(shapeBaseHeight / shapeBaseWidth).toBeCloseTo(preset.height / preset.width, 4)
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

  it('после добавления с preserveAspectRatio следующий ввод текста не возвращает фигуру к размеру до initial layout', async() => {
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

    const requestedWidth = 220
    const requestedHeight = 320
    const fittedScale = Math.min(
      requestedWidth / preset.width,
      requestedHeight / preset.height
    )
    const expandedWidth = preset.width * fittedScale * 1.25
    const expandedHeight = preset.height * fittedScale * 1.25

    applyShapeTextLayoutMock.mockImplementationOnce(({
      group,
      shape,
      text,
      alignH,
      alignV,
      padding
    }) => {
      applyShapeTextLayoutToMockGroup({
        group,
        shape,
        text,
        width: expandedWidth,
        height: expandedHeight,
        alignH,
        alignV,
        padding
      })
    })

    const group = await manager.add({
      presetKey: 'arrow-up',
      options: {
        width: requestedWidth,
        height: requestedHeight,
        preserveAspectRatio: true,
        text: 'TEST',
        textStyle: {
          fontSize: 72
        }
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
    const textNode = manager.getTextNode({
      target: group
    })

    if (!textNode) {
      throw new Error('shape text node should exist')
    }

    applyShapeTextLayoutMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(expandedWidth)

    enteredHandler({
      target: textNode
    })

    changedHandler({
      target: textNode
    })

    expect(group.shapeManualBaseWidth).toBeCloseTo(expandedWidth, 4)
    expect(group.shapeManualBaseHeight).toBeCloseTo(expandedHeight, 4)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: expandedWidth,
      minimumWidth: expandedWidth,
      montageAreaWidth: 400
    }))
    expect(applyShapeTextLayoutMock).toHaveBeenCalledWith(expect.objectContaining({
      width: expandedWidth,
      height: expandedHeight
    }))
  })

  it('после добавления с preserveAspectRatio и роста под текст смена фигуры использует исходный replace box', async() => {
    const editor = createShapeManagerEditorStub({
      montageAreaWidth: 400
    })
    const manager = new ShapeManager({
      editor: editor as never
    })
    const sourcePreset = getShapePreset({
      presetKey: 'arrow-up'
    })
    const nextPreset = getShapePreset({
      presetKey: 'arrow-right'
    })

    if (!sourcePreset || !nextPreset) {
      throw new Error('shape presets should exist')
    }

    const requestedWidth = 220
    const requestedHeight = 320
    const fittedScale = Math.min(
      requestedWidth / sourcePreset.width,
      requestedHeight / sourcePreset.height
    )
    const expandedWidth = sourcePreset.width * fittedScale * 1.25
    const expandedHeight = sourcePreset.height * fittedScale * 1.25

    applyShapeTextLayoutMock.mockImplementationOnce(({
      group,
      shape,
      text,
      alignH,
      alignV,
      padding
    }) => {
      applyShapeTextLayoutToMockGroup({
        group,
        shape,
        text,
        width: expandedWidth,
        height: expandedHeight,
        alignH,
        alignV,
        padding
      })
    })

    const createdShape = await manager.add({
      presetKey: 'arrow-up',
      options: {
        width: requestedWidth,
        height: requestedHeight,
        preserveAspectRatio: true,
        text: 'TEST',
        textStyle: {
          fontSize: 72
        }
      }
    })

    if (!createdShape) {
      throw new Error('shape group should be created')
    }

    // При смене фигуры используется исходный replace box, а не выросший размер
    const nextScale = Math.min(
      requestedWidth / nextPreset.width,
      requestedHeight / nextPreset.height
    )
    const expectedWidth = nextPreset.width * nextScale
    const expectedHeight = nextPreset.height * nextScale
    const updatedShape = await manager.update({
      target: createdShape,
      presetKey: 'arrow-right'
    })

    expect(updatedShape).not.toBeNull()
    expect(updatedShape?.shapePresetKey).toBe('arrow-right')
    // Новая фигура вписывается в исходный replace box
    expect(updatedShape?.shapeBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(updatedShape?.shapeBaseHeight).toBeCloseTo(expectedHeight, 4)
    expect(updatedShape?.shapeManualBaseWidth).toBeCloseTo(expectedWidth, 4)
    expect(updatedShape?.shapeManualBaseHeight).toBeCloseTo(expectedHeight, 4)
    // Replace box остаётся исходным (пользовательский контракт)
    expect(updatedShape?.shapeReplaceBoxWidth).toBe(requestedWidth)
    expect(updatedShape?.shapeReplaceBoxHeight).toBe(requestedHeight)
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
})
