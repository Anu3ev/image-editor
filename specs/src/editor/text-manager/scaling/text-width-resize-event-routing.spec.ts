import TextWidthResizeInteractionController from '../../../../../src/editor/text-manager/scaling/text-width-resize-interaction-controller'
import { createTextManagerTestSetup } from '../../../../test-utils/text/manager-setup'

describe('Завершение изменения ширины отдельного текста', () => {
  let setup: ReturnType<typeof createTextManagerTestSetup>

  beforeEach(() => {
    setup = createTextManagerTestSetup()
  })

  afterEach(() => {
    setup.textManager.destroy()
    jest.restoreAllMocks()
  })

  it('передаёт контроллеру начало, изменение и завершение жеста', () => {
    const beginGestureSpy = jest
      .spyOn(TextWidthResizeInteractionController.prototype, 'beginGesture')
      .mockReturnValue(true)
    const handleObjectResizingSpy = jest
      .spyOn(TextWidthResizeInteractionController.prototype, 'handleObjectResizing')
      .mockReturnValue(true)
    const finishGestureSpy = jest
      .spyOn(TextWidthResizeInteractionController.prototype, 'finishGesture')
      .mockReturnValue(true)
    const textbox = setup.textManager.addText({ text: 'Текст' })
    const transform = { target: textbox, action: 'resizing', corner: 'mr' }
    const event = { target: textbox, transform, e: { ctrlKey: false } }

    setup.canvas.fire('mouse:down', event)
    setup.canvas.fire('object:resizing', event)
    setup.canvas.fire('mouse:up', event)

    expect(beginGestureSpy).toHaveBeenCalledWith(event)
    expect(handleObjectResizingSpy).toHaveBeenCalledWith(event)
    expect(finishGestureSpy).toHaveBeenCalledTimes(1)
    expect(setup.editor.snappingManager.applyTextResizingSnap).not.toHaveBeenCalled()
  })

  it('завершает жест при смене или очистке выделения', () => {
    const finishGestureSpy = jest
      .spyOn(TextWidthResizeInteractionController.prototype, 'finishGesture')
      .mockReturnValue(true)

    setup.canvas.fire('selection:created', {})
    setup.canvas.fire('selection:updated', {})
    setup.canvas.fire('selection:cleared', {})

    expect(finishGestureSpy).toHaveBeenCalledTimes(3)
    expect(finishGestureSpy).toHaveNthReturnedWith(1, true)
  })

  it('передаёт удалённый объект контроллеру активного жеста', () => {
    const finishGestureForTargetSpy = jest
      .spyOn(TextWidthResizeInteractionController.prototype, 'finishGestureForTarget')
      .mockReturnValue(false)
    const removed = setup.textManager.addText({ text: 'Удалённый текст' })

    setup.canvas.fire('object:removed', { target: removed })

    expect(finishGestureForTargetSpy).toHaveBeenCalledTimes(1)
    expect(finishGestureForTargetSpy).toHaveBeenCalledWith({ target: removed })
  })

  it('прерывает жест при отмене указателя и потере фокуса', () => {
    const interruptGestureSpy = jest
      .spyOn(TextWidthResizeInteractionController.prototype, 'interruptGesture')
      .mockReturnValue(true)
    const pointerCancelEvent = new Event('pointercancel')
    const touchCancelEvent = new Event('touchcancel')

    window.dispatchEvent(pointerCancelEvent)
    window.dispatchEvent(touchCancelEvent)
    window.dispatchEvent(new Event('blur'))

    expect(interruptGestureSpy).toHaveBeenCalledTimes(3)
    expect(interruptGestureSpy).toHaveBeenNthCalledWith(1, { event: pointerCancelEvent })
    expect(interruptGestureSpy).toHaveBeenNthCalledWith(2, { event: touchCancelEvent })
    expect(interruptGestureSpy).toHaveBeenNthCalledWith(3)
  })

  it('снимает обработчики окна при уничтожении менеджера', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

    setup.textManager.destroy()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function))
  })
})
