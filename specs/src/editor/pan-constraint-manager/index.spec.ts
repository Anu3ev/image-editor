import PanConstraintManager from '../../../../src/editor/pan-constraint-manager'
import { createEditorStub } from '../../../test-utils/editor/editor-stub'

describe('PanConstraintManager', () => {
  it('возвращает состояние pan по осям для viewport', () => {
    const editor = createEditorStub()
    editor.montageArea.width = 1200
    editor.montageArea.height = 900
    editor.montageArea.left = 600
    editor.montageArea.top = 450
    editor.zoomManager.defaultZoom = 0.5
    const manager = new PanConstraintManager({ editor })

    const state = manager.getViewportPanState()

    expect(state.canPan).toBe(true)
    expect(state.horizontal.canPan).toBe(true)
    expect(state.horizontal.min).toBe(-448)
    expect(state.horizontal.max).toBe(48)
    expect(state.horizontal.scrollDistance).toBe(496)
    expect(state.vertical.canPan).toBe(true)
    expect(state.vertical.min).toBe(-348)
    expect(state.vertical.max).toBe(48)
    expect(state.vertical.scrollDistance).toBe(396)
  })

  it('двигает viewport к указанной позиции scroll по каждой оси', () => {
    const editor = createEditorStub()
    editor.montageArea.width = 1200
    editor.montageArea.height = 900
    editor.montageArea.left = 600
    editor.montageArea.top = 450
    editor.zoomManager.defaultZoom = 0.5
    const manager = new PanConstraintManager({ editor })

    const didHandlePan = manager.applyPanRatio({
      horizontalRatio: 1,
      verticalRatio: 0.5
    })

    expect(didHandlePan).toBe(true)
    expect(editor.canvas.setViewportTransform).toHaveBeenCalledWith([1, 0, 0, 1, -448, -150])
    expect(editor.canvas.viewportTransform[4]).toBe(-448)
    expect(editor.canvas.viewportTransform[5]).toBe(-150)
    expect(editor.canvas.requestRenderAll).toHaveBeenCalledTimes(1)
  })

  it('увеличивает pan-диапазон по мере приближения монтажной области к краям viewport', () => {
    const editor = createEditorStub()
    editor.canvas.getWidth.mockReturnValue(600)
    editor.canvas.getHeight.mockReturnValue(600)
    editor.montageArea.width = 512
    editor.montageArea.height = 512
    editor.montageArea.left = 256
    editor.montageArea.top = 256
    editor.zoomManager.defaultZoom = 0.5
    const manager = new PanConstraintManager({ editor })

    editor.canvas.getZoom.mockReturnValue(0.9)
    const farFromEdgeState = manager.getViewportPanState()
    editor.canvas.getZoom.mockReturnValue(1)
    const nearEdgeState = manager.getViewportPanState()
    editor.canvas.getZoom.mockReturnValue(1.1)
    const zoomedState = manager.getViewportPanState()

    expect(farFromEdgeState.canPan).toBe(false)
    expect(farFromEdgeState.horizontal.scrollDistance).toBe(0)
    expect(farFromEdgeState.vertical.scrollDistance).toBe(0)
    expect(nearEdgeState.canPan).toBe(true)
    expect(nearEdgeState.horizontal.scrollDistance).toBe(8)
    expect(nearEdgeState.vertical.scrollDistance).toBe(8)
    expect(zoomedState.horizontal.scrollDistance).toBeCloseTo(59.2)
    expect(zoomedState.vertical.scrollDistance).toBeCloseTo(59.2)
  })

  it('не двигает viewport, когда zoom выше default, но монтажная область далеко от краёв viewport', () => {
    const editor = createEditorStub()
    editor.montageArea.left = 200
    editor.montageArea.top = 150
    editor.canvas.viewportTransform[4] = 200
    editor.canvas.viewportTransform[5] = 150
    editor.zoomManager.defaultZoom = 0.8
    const manager = new PanConstraintManager({ editor })

    const didHandlePan = manager.applyPanDelta({
      deltaX: 24,
      deltaY: -16
    })

    expect(didHandlePan).toBe(false)
    expect(editor.canvas.viewportTransform[4]).toBe(200)
    expect(editor.canvas.viewportTransform[5]).toBe(150)
    expect(editor.montageArea.setCoords).not.toHaveBeenCalled()
    expect(editor.canvas.requestRenderAll).not.toHaveBeenCalled()
  })

  it('двигает viewport через pan-ограничения', () => {
    const editor = createEditorStub()
    editor.montageArea.width = 1200
    editor.montageArea.height = 900
    editor.montageArea.left = 600
    editor.montageArea.top = 450
    const manager = new PanConstraintManager({ editor })

    const didHandlePan = manager.applyPanDelta({
      deltaX: -24,
      deltaY: -16
    })

    expect(didHandlePan).toBe(true)
    expect(editor.canvas.setViewportTransform).toHaveBeenCalledWith([1, 0, 0, 1, -24, -16])
    expect(editor.canvas.viewportTransform[4]).toBe(-24)
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
