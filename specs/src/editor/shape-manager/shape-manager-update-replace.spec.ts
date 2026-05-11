import '../../../test-utils/shape-manager-module-mocks'
import ShapeManager from '../../../../src/editor/shape-manager'
import {
  getShapeManagerUnitMocks,
  createShapeManagerEditorStub,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape-manager-spec-helpers'

describe('shape-manager update replace', () => {
  const mocks = getShapeManagerUnitMocks()
  const {
    resolveShapeTextAutoExpandWidthForTextMock
  } = mocks

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
  })

  // eslint-disable-next-line max-len
  it('при замене круга на треугольник даёт новой фигуре вырасти под текст, даже если у исходной фигуры выключено авторасширение', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'circle',
      options: {
        text: 'TEST',
        width: 136,
        height: 136,
        shapeTextAutoExpand: false
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const initialWidth = group.shapeBaseWidth
    const initialReplaceBoxWidth = group.shapeReplaceBoxWidth
    const initialReplaceBoxHeight = group.shapeReplaceBoxHeight

    if (
      initialWidth === undefined
      || initialReplaceBoxWidth === undefined
      || initialReplaceBoxHeight === undefined
    ) {
      throw new Error('replace box should exist before preset update')
    }

    resolveShapeTextAutoExpandWidthForTextMock.mockClear()
    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(initialWidth + 36)

    const updatedGroup = await manager.update({
      target: group,
      presetKey: 'triangle'
    })

    if (!updatedGroup) {
      throw new Error('shape group should be updated')
    }

    expect(group.shapeTextAutoExpand).toBe(false)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: initialWidth,
      minimumWidth: initialWidth
    }))
    expect(updatedGroup.shapeBaseWidth).toBeGreaterThan(initialWidth)
    expect(updatedGroup.shapeManualBaseWidth).toBe(updatedGroup.shapeBaseWidth)
    expect(updatedGroup.shapeReplaceBoxWidth).toBe(initialReplaceBoxWidth)
    expect(updatedGroup.shapeReplaceBoxHeight).toBe(initialReplaceBoxHeight)
  })
})
