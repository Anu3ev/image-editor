import {
  createObjectSizeIndicatorManagerFixture,
  createObjectSizeMouseMoveEvent,
  createObjectSizeTransformEvent,
  getCanvasHandler
} from '../../../../test-utils/ui/indicator-test-utils'
import { OBJECT_SIZE_INDICATOR_CLASS } from '../../../../../src/editor/ui/object-size-indicator/constants'

describe('ObjectSizeIndicatorManager', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('создаёт DOM-индикатор и подписывается на события изменения размера', () => {
    const {
      manager,
      mockCanvas
    } = createObjectSizeIndicatorManagerFixture()

    expect(manager.el.className).toBe(OBJECT_SIZE_INDICATOR_CLASS)
    expect(mockCanvas.wrapperEl.appendChild).toHaveBeenCalledWith(manager.el)
    expect(mockCanvas.on).toHaveBeenCalledWith('object:scaling', expect.any(Function))
    expect(mockCanvas.on).toHaveBeenCalledWith('object:resizing', expect.any(Function))
    expect(mockCanvas.on).toHaveBeenCalledWith('mouse:move', expect.any(Function))
  })

  it('показывает текущие размеры объекта во время object:scaling', () => {
    const {
      manager,
      mockCanvas,
      target
    } = createObjectSizeIndicatorManagerFixture({
      width: 1234.5,
      height: 67.8
    })

    getCanvasHandler(mockCanvas, 'object:scaling')(createObjectSizeTransformEvent({ target }))

    expect(manager.el.style.display).toBe('block')
    expect(manager.el.textContent).toBe('ширина: 1 235 высота: 68')
  })

  it('показывает текущие размеры объекта во время object:resizing', () => {
    const {
      manager,
      mockCanvas,
      target
    } = createObjectSizeIndicatorManagerFixture({
      width: 240,
      height: 120
    })

    getCanvasHandler(mockCanvas, 'object:resizing')(createObjectSizeTransformEvent({ target }))

    expect(manager.el.style.display).toBe('block')
    expect(manager.el.textContent).toBe('ширина: 240 высота: 120')
  })

  it('обновляет индикатор на mouse:move активной scale-трансформации', () => {
    const {
      manager,
      mockCanvas,
      target
    } = createObjectSizeIndicatorManagerFixture({
      width: 181,
      height: 75.6
    })
    mockCanvas._currentTransform = {
      action: 'scale',
      corner: 'br',
      target
    }

    getCanvasHandler(mockCanvas, 'mouse:move')(createObjectSizeMouseMoveEvent())

    expect(manager.el.style.display).toBe('block')
    expect(manager.el.textContent).toBe('ширина: 181 высота: 76')
  })

  it('использует доменный размер объекта, если он отличается от visual bbox', () => {
    const {
      manager,
      mockCanvas,
      target
    } = createObjectSizeIndicatorManagerFixture({
      width: 513,
      height: 513,
      indicatorSize: {
        width: 512,
        height: 512
      }
    })

    getCanvasHandler(mockCanvas, 'object:scaling')(createObjectSizeTransformEvent({ target }))

    expect(manager.el.style.display).toBe('block')
    expect(manager.el.textContent).toBe('ширина: 512 высота: 512')
    expect(target.getObjectDisplaySize).toHaveBeenCalledTimes(1)
    expect(target.getScaledWidth).not.toHaveBeenCalled()
    expect(target.getScaledHeight).not.toHaveBeenCalled()
  })

  it('не показывает индикатор на mouse:move, если активная трансформация не меняет размер', () => {
    const {
      manager,
      mockCanvas,
      target
    } = createObjectSizeIndicatorManagerFixture()
    mockCanvas._currentTransform = {
      action: 'drag',
      corner: 'mtr',
      target
    }

    getCanvasHandler(mockCanvas, 'mouse:move')(createObjectSizeMouseMoveEvent())

    expect(manager.el.style.display).toBe('none')
    expect(manager.el.textContent).toBe('')
  })

  it('не показывает индикатор для монтажной области и заблокированного объекта', () => {
    const {
      manager,
      mockCanvas,
      mockEditor,
      target
    } = createObjectSizeIndicatorManagerFixture()
    target.id = mockEditor.montageArea.id

    getCanvasHandler(mockCanvas, 'object:scaling')(createObjectSizeTransformEvent({ target }))
    expect(manager.el.style.display).toBe('none')

    target.id = 'locked-object'
    target.locked = true
    getCanvasHandler(mockCanvas, 'object:scaling')(createObjectSizeTransformEvent({ target }))
    expect(manager.el.style.display).toBe('none')
  })

  it('не показывает индикатор, если feature flag выключен', () => {
    const {
      manager,
      mockCanvas,
      mockEditor,
      target
    } = createObjectSizeIndicatorManagerFixture()
    mockEditor.options.showObjectSizeOnScale = false

    getCanvasHandler(mockCanvas, 'object:scaling')(createObjectSizeTransformEvent({ target }))

    expect(manager.el.style.display).toBe('none')
    expect(manager.el.textContent).toBe('')
  })

  it('скрывает индикатор после завершения изменения размера', () => {
    const {
      manager,
      mockCanvas,
      target
    } = createObjectSizeIndicatorManagerFixture()

    getCanvasHandler(mockCanvas, 'object:scaling')(createObjectSizeTransformEvent({ target }))
    getCanvasHandler(mockCanvas, 'mouse:up')(createObjectSizeMouseMoveEvent())

    expect(manager.el.style.display).toBe('none')
    expect(manager.el.textContent).toBe('')
  })

  it('отписывается от событий canvas при destroy', () => {
    const {
      manager,
      mockCanvas
    } = createObjectSizeIndicatorManagerFixture()

    manager.destroy()

    expect(mockCanvas.off).toHaveBeenCalledWith('object:scaling', expect.any(Function))
    expect(mockCanvas.off).toHaveBeenCalledWith('object:resizing', expect.any(Function))
    expect(mockCanvas.off).toHaveBeenCalledWith('mouse:move', expect.any(Function))
    expect(mockCanvas.off).toHaveBeenCalledWith('mouse:up', expect.any(Function))
    expect(mockCanvas.off).toHaveBeenCalledWith('object:modified', expect.any(Function))
    expect(mockCanvas.off).toHaveBeenCalledWith('selection:cleared', expect.any(Function))
  })
})
