import '../../../test-utils/shape/manager-module-mocks'
import ShapeManager from '../../../../src/editor/shape-manager'
import {
  createShapeManagerEditorStub,
  createShapeRehydrationTarget,
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape/manager-spec-helpers'

describe('восстановленная фигура', () => {
  const mocks = getShapeManagerUnitMocks()
  const {
    applyShapeTextLayoutMock,
    resolveShapeTextAutoExpandWidthForTextMock
  } = mocks

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
  })

  it('при включённом авторасширении заново вычисляет ширину через общий materialization-контракт', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const { group } = createShapeRehydrationTarget({
      width: 200,
      height: 100,
      scaleX: 1.5,
      scaleY: 2,
      manualWidth: 180,
      manualHeight: 90,
      replaceBoxWidth: 210,
      replaceBoxHeight: 120
    })

    resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(360)

    const result = manager.commitRehydratedShapeLayout({
      target: group
    })
    const layoutCallCalls = applyShapeTextLayoutMock.mock.calls
    const layoutCall = layoutCallCalls[layoutCallCalls.length - 1]?.[0]

    expect(result).toBe(true)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: 300,
      minimumWidth: 270
    }))
    expect(layoutCall).toEqual(expect.objectContaining({
      group,
      width: 360,
      height: 200
    }))
    expect(group.shapeBaseWidth).toBe(360)
    expect(group.shapeBaseHeight).toBe(200)
    expect(group.shapeManualBaseWidth).toBe(270)
    expect(group.shapeManualBaseHeight).toBe(180)
    expect(group.shapeReplaceBoxWidth).toBe(315)
    expect(group.shapeReplaceBoxHeight).toBe(240)
    expect(group.scaleX).toBe(1)
    expect(group.scaleY).toBe(1)
  })

  it('текст внутри восстановленной фигуры масштабируется вместе с шаблоном', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const { group, text } = createShapeRehydrationTarget()

    text.set({
      fontSize: 20,
      paddingTop: 2,
      paddingRight: 3,
      paddingBottom: 4,
      paddingLeft: 5,
      radiusTopLeft: 6,
      radiusTopRight: 7,
      radiusBottomRight: 8,
      radiusBottomLeft: 9
    })
    text.lineFontDefaults = {
      0: {
        fontSize: 10
      }
    }
    group.shapePaddingTop = 3
    group.shapePaddingRight = 4
    group.shapePaddingBottom = 5
    group.shapePaddingLeft = 6

    const result = manager.commitRehydratedShapeLayout({
      target: group,
      textScale: 2
    })

    expect(result).toBe(true)
    expect(text.fontSize).toBe(40)
    expect(text.lineFontDefaults?.[0]?.fontSize).toBe(20)
    expect(text.paddingTop).toBe(4)
    expect(text.paddingRight).toBe(6)
    expect(text.paddingBottom).toBe(8)
    expect(text.paddingLeft).toBe(10)
    expect(text.radiusTopLeft).toBe(12)
    expect(text.radiusTopRight).toBe(14)
    expect(text.radiusBottomRight).toBe(16)
    expect(text.radiusBottomLeft).toBe(18)
    expect(group.shapePaddingTop).toBe(6)
    expect(group.shapePaddingRight).toBe(8)
    expect(group.shapePaddingBottom).toBe(10)
    expect(group.shapePaddingLeft).toBe(12)
  })

  it('при обычном восстановлении не меняет визуальный размер текста', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const { group, text } = createShapeRehydrationTarget({
      width: 200,
      height: 100,
      scaleX: 1.25,
      scaleY: 1.5
    })

    text.set({
      fontSize: 24,
      paddingTop: 3,
      radiusTopLeft: 5
    })
    group.shapePaddingTop = 7

    const result = manager.commitRehydratedShapeLayout({
      target: group
    })
    const layoutCallCalls = applyShapeTextLayoutMock.mock.calls
    const layoutCall = layoutCallCalls[layoutCallCalls.length - 1]?.[0]

    expect(result).toBe(true)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: 250,
      minimumWidth: 250
    }))
    expect(layoutCall).toEqual(expect.objectContaining({
      width: 250,
      height: 150
    }))
    expect(text.fontSize).toBe(24)
    expect(text.paddingTop).toBe(3)
    expect(text.radiusTopLeft).toBe(5)
    expect(group.shapePaddingTop).toBe(7)
  })

  it('восстановление игнорирует устаревшую wrap policy после proportional scaling', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const { group } = createShapeRehydrationTarget({
      width: 120,
      height: 120,
      scaleX: 1,
      scaleY: 1,
      manualWidth: 120,
      manualHeight: 120
    })
    const legacyGroup = group as typeof group & {
      shapeTextWrapPolicy?: 'words-only'
    }

    legacyGroup.shapeTextWrapPolicy = 'words-only'

    const result = manager.commitRehydratedShapeLayout({
      target: group
    })
    const layoutCallCalls = applyShapeTextLayoutMock.mock.calls
    const layoutCall = layoutCallCalls[layoutCallCalls.length - 1]?.[0]

    expect(result).toBe(true)
    expect(layoutCall?.wrapPolicy).toBeUndefined()
  })

  it('при явном отключении авторасширения передаёт этот режим в layout во время materialization', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const { group } = createShapeRehydrationTarget({
      width: 200,
      height: 100,
      scaleX: 1.25,
      scaleY: 1.5,
      manualWidth: 200,
      manualHeight: 100
    })

    group.shapeTextAutoExpand = true

    const result = manager.commitRehydratedShapeLayout({
      target: group,
      shapeTextAutoExpand: false
    })
    const layoutCallCalls = applyShapeTextLayoutMock.mock.calls
    const layoutCall = layoutCallCalls[layoutCallCalls.length - 1]?.[0]

    expect(result).toBe(true)
    expect(resolveShapeTextAutoExpandWidthForTextMock).not.toHaveBeenCalled()
    expect(layoutCall).toEqual(expect.objectContaining({
      width: 250,
      height: 150,
      shapeTextAutoExpandEnabled: false
    }))
    expect(group.shapeTextAutoExpand).toBe(false)
  })

  it('без override сохраняет текущий режим авторасширения при materialization', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const { group } = createShapeRehydrationTarget({
      width: 200,
      height: 100,
      scaleX: 1.25,
      scaleY: 1.5,
      manualWidth: 200,
      manualHeight: 100
    })

    group.shapeTextAutoExpand = true

    const result = manager.commitRehydratedShapeLayout({
      target: group
    })
    const layoutCallCalls = applyShapeTextLayoutMock.mock.calls
    const layoutCall = layoutCallCalls[layoutCallCalls.length - 1]?.[0]

    expect(result).toBe(true)
    expect(resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      currentWidth: 250,
      minimumWidth: 250
    }))
    expect(layoutCall).toEqual(expect.objectContaining({
      width: 250,
      height: 150,
      shapeTextAutoExpandEnabled: true
    }))
    expect(group.shapeTextAutoExpand).toBe(true)
  })
})
