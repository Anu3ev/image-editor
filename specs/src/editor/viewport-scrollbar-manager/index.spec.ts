import PanConstraintManager from '../../../../src/editor/pan-constraint-manager'
import ViewportScrollbarManager from '../../../../src/editor/ui/viewport-scrollbar-manager'
import { createEditorStub } from '../../../test-utils/editor/editor-stub'

const createEditorForScrollbars = ({
  canvasHeight = 600,
  canvasWidth = 800,
  zoom = 0.5,
  defaultZoom = 0.5,
  montageWidth = 512,
  montageHeight = 512
}: {
  canvasHeight?: number
  canvasWidth?: number
  zoom?: number
  defaultZoom?: number
  montageWidth?: number
  montageHeight?: number
} = {}) => {
  const editor = createEditorStub()
  const wrapper = document.createElement('div')

  wrapper.getBoundingClientRect = jest.fn(() => ({
    bottom: canvasHeight,
    height: canvasHeight,
    left: 0,
    right: canvasWidth,
    top: 0,
    width: canvasWidth,
    x: 0,
    y: 0,
    toJSON: jest.fn()
  }))

  editor.canvas.wrapperEl = wrapper
  editor.canvas.getWidth.mockReturnValue(canvasWidth)
  editor.canvas.getHeight.mockReturnValue(canvasHeight)
  editor.canvas.getZoom.mockReturnValue(zoom)
  editor.zoomManager.defaultZoom = defaultZoom
  editor.montageArea.width = montageWidth
  editor.montageArea.height = montageHeight
  editor.montageArea.left = montageWidth / 2
  editor.montageArea.top = montageHeight / 2
  editor.panConstraintManager = new PanConstraintManager({ editor })

  return editor
}

describe('ViewportScrollbarManager', () => {
  it('скрывает скроллбары, когда монтажная область помещается при default zoom', () => {
    const editor = createEditorForScrollbars()
    const manager = new ViewportScrollbarManager({ editor })

    const state = manager.getState()

    expect(state.horizontal.visible).toBe(false)
    expect(state.vertical.visible).toBe(false)
    expect(editor.canvas.wrapperEl.querySelector('[data-editor-scrollbar="horizontal"]')).not.toBeNull()
    expect(editor.canvas.wrapperEl.querySelector('[data-editor-scrollbar="vertical"]')).not.toBeNull()
  })

  it('не перекрывает pointer-события canvas корневым DOM-слоем', () => {
    const editor = createEditorForScrollbars()
    const manager = new ViewportScrollbarManager({ editor })
    const horizontalTrack = editor.canvas.wrapperEl.querySelector('[data-editor-scrollbar="horizontal"]')

    expect(manager.el.style.pointerEvents).toBe('none')
    expect(horizontalTrack).not.toBeNull()
    expect((horizontalTrack as HTMLElement | null)?.style.pointerEvents).toBe('auto')
  })

  it('показывает скроллбары и уменьшает thumb при увеличении zoom', () => {
    const editor = createEditorForScrollbars({
      defaultZoom: 0.5,
      montageHeight: 900,
      montageWidth: 1200,
      zoom: 1
    })
    const manager = new ViewportScrollbarManager({ editor })

    const initialState = manager.getState()
    editor.canvas.getZoom.mockReturnValue(1.5)
    manager.update()
    const zoomedState = manager.getState()

    expect(initialState.horizontal.visible).toBe(true)
    expect(initialState.vertical.visible).toBe(true)
    expect(initialState.horizontal.thumbSize).toBeLessThan(initialState.horizontal.trackSize)
    expect(initialState.vertical.thumbSize).toBeLessThan(initialState.vertical.trackSize)
    expect(zoomedState.horizontal.thumbSize).toBeLessThan(initialState.horizontal.thumbSize)
    expect(zoomedState.vertical.thumbSize).toBeLessThan(initialState.vertical.thumbSize)
  })

  it('скрывает скроллбары, когда zoom выше default, но монтажная область далеко от краёв viewport', () => {
    const editor = createEditorForScrollbars({
      defaultZoom: 0.5,
      montageHeight: 300,
      montageWidth: 400,
      zoom: 0.75
    })
    const manager = new ViewportScrollbarManager({ editor })

    const state = manager.getState()

    expect(state.horizontal.visible).toBe(false)
    expect(state.vertical.visible).toBe(false)
    expect(state.horizontal.thumbSize).toBe(0)
    expect(state.vertical.thumbSize).toBe(0)
  })

  it('показывает скроллбары около границы viewport и уменьшает thumb при дальнейшем zoom', () => {
    const editor = createEditorForScrollbars({
      canvasHeight: 600,
      canvasWidth: 600,
      defaultZoom: 0.5,
      montageHeight: 512,
      montageWidth: 512,
      zoom: 1
    })
    const manager = new ViewportScrollbarManager({ editor })

    const nearEdgeState = manager.getState()
    editor.canvas.getZoom.mockReturnValue(1.1)
    manager.update()
    const zoomedState = manager.getState()

    expect(nearEdgeState.horizontal.visible).toBe(true)
    expect(nearEdgeState.vertical.visible).toBe(true)
    expect(nearEdgeState.horizontal.thumbSize).toBeLessThan(nearEdgeState.horizontal.trackSize)
    expect(nearEdgeState.vertical.thumbSize).toBeLessThan(nearEdgeState.vertical.trackSize)
    expect(zoomedState.horizontal.thumbSize).toBeLessThan(nearEdgeState.horizontal.thumbSize)
    expect(zoomedState.vertical.thumbSize).toBeLessThan(nearEdgeState.vertical.thumbSize)
  })

  it('передвигает viewport при drag горизонтального скроллбара', () => {
    const editor = createEditorForScrollbars({
      defaultZoom: 0.5,
      montageHeight: 900,
      montageWidth: 1200,
      zoom: 1
    })
    const manager = new ViewportScrollbarManager({ editor })
    const horizontalThumb = editor.canvas.wrapperEl.querySelector('[data-editor-scrollbar-thumb="horizontal"]')

    expect(horizontalThumb).not.toBeNull()

    horizontalThumb?.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 0,
      clientY: 0
    }))
    document.dispatchEvent(new MouseEvent('pointermove', {
      bubbles: true,
      clientX: 800,
      clientY: 0
    }))
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))

    expect(editor.canvas.viewportTransform[4]).toBe(-448)
    expect(editor.canvas.viewportTransform[5]).toBe(0)
    expect(editor.canvas.requestRenderAll).toHaveBeenCalledTimes(1)

    manager.destroy()
  })

  it('передвигает viewport при drag вертикального скроллбара', () => {
    const editor = createEditorForScrollbars({
      defaultZoom: 0.5,
      montageHeight: 900,
      montageWidth: 1200,
      zoom: 1
    })
    const manager = new ViewportScrollbarManager({ editor })
    const verticalThumb = editor.canvas.wrapperEl.querySelector('[data-editor-scrollbar-thumb="vertical"]')

    expect(verticalThumb).not.toBeNull()

    verticalThumb?.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 0,
      clientY: 0
    }))
    document.dispatchEvent(new MouseEvent('pointermove', {
      bubbles: true,
      clientX: 0,
      clientY: 600
    }))
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))

    expect(editor.canvas.viewportTransform[4]).toBe(0)
    expect(editor.canvas.viewportTransform[5]).toBe(-348)
    expect(editor.canvas.requestRenderAll).toHaveBeenCalledTimes(1)

    manager.destroy()
  })
})
