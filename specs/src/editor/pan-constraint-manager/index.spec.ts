import PanConstraintManager from '../../../../src/editor/pan-constraint-manager'
import { createEditorStub } from '../../../test-utils/editor/editor-stub'

describe('PanConstraintManager', () => {
  it('двигает viewport через pan-ограничения', () => {
    const editor = createEditorStub()
    editor.montageArea.left = 400
    editor.montageArea.top = 300
    const manager = new PanConstraintManager({ editor })

    const didHandlePan = manager.applyPanDelta({
      deltaX: 24,
      deltaY: -16
    })

    expect(didHandlePan).toBe(true)
    expect(editor.canvas.viewportTransform[4]).toBe(24)
    expect(editor.canvas.viewportTransform[5]).toBe(-16)
    expect(editor.montageArea.setCoords).toHaveBeenCalledTimes(1)
    expect(editor.canvas.requestRenderAll).toHaveBeenCalledTimes(1)
  })

  it('не двигает viewport, когда pan запрещён текущим zoom', () => {
    const editor = createEditorStub()
    editor.montageArea.left = 400
    editor.montageArea.top = 300
    editor.zoomManager.defaultZoom = 1
    const manager = new PanConstraintManager({ editor })

    const didHandlePan = manager.applyPanDelta({
      deltaX: 24,
      deltaY: -16
    })

    expect(didHandlePan).toBe(false)
    expect(editor.canvas.viewportTransform[4]).toBe(0)
    expect(editor.canvas.viewportTransform[5]).toBe(0)
    expect(editor.montageArea.setCoords).not.toHaveBeenCalled()
    expect(editor.canvas.requestRenderAll).not.toHaveBeenCalled()
  })
})
