import { Point } from 'fabric'
import TextCornerScaleInteractionController from '../../../../../src/editor/text-manager/scaling/text-corner-scale-interaction-controller'
import { createTextManagerTestSetup } from '../../../../test-utils/text/manager-setup'
import { createTextScalingTransform } from '../../../../test-utils/text/scaling'

let setup: ReturnType<typeof createTextManagerTestSetup>

beforeEach(() => {
  setup = createTextManagerTestSetup()
})

afterEach(() => {
  setup.textManager.destroy()
  jest.restoreAllMocks()
})

describe('Передача событий углового скейлинга общей логике', () => {
  it('передаёт событие скейлинга контроллеру общей логики', () => {
    const handleObjectScalingSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'handleObjectScaling')
      .mockReturnValue(true)
    const textbox = setup.textManager.addText({ text: 'Текст' })
    const event = {
      e: new MouseEvent('pointermove'),
      pointer: new Point(100, 100),
      target: textbox,
      transform: createTextScalingTransform({ textbox })
    }

    const handled = setup.textManager.handleStandaloneTextCornerScaling(event)

    expect(handled).toBe(true)
    expect(handleObjectScalingSpy).toHaveBeenCalledTimes(1)
    expect(handleObjectScalingSpy).toHaveBeenCalledWith(event)
  })

  it('не запускает прежнюю обработку для обработанного события', () => {
    const handleObjectScalingSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'handleObjectScaling')
      .mockReturnValue(true)
    const handleCanvasMouseMoveSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'handleCanvasMouseMove')
      .mockReturnValue(true)
    const legacyObjectScalingSpy = jest
      .spyOn(setup.textManager['scalingController'], 'handleObjectScaling')
      .mockImplementation(() => {})
    const legacyMouseMoveSpy = jest
      .spyOn(setup.textManager['scalingController'], 'handleMouseMove')
      .mockImplementation(() => {})
    const event = { e: new Event('pointermove') }

    setup.canvas.fire('object:scaling', event)
    setup.canvas.fire('mouse:move', event)

    expect(handleObjectScalingSpy).toHaveBeenCalledWith(event)
    expect(handleCanvasMouseMoveSpy).toHaveBeenCalledWith(event)
    expect(legacyObjectScalingSpy).not.toHaveBeenCalled()
    expect(legacyMouseMoveSpy).not.toHaveBeenCalled()
  })
})

describe('Передача необработанных событий прежней логике', () => {
  it('передаёт каждое событие прежней логике ровно один раз', () => {
    const handleObjectScalingSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'handleObjectScaling')
      .mockReturnValue(false)
    const handleCanvasMouseMoveSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'handleCanvasMouseMove')
      .mockReturnValue(false)
    const legacyObjectScalingSpy = jest
      .spyOn(setup.textManager['scalingController'], 'handleObjectScaling')
      .mockImplementation(() => {})
    const legacyMouseMoveSpy = jest
      .spyOn(setup.textManager['scalingController'], 'handleMouseMove')
      .mockImplementation(() => {})
    const event = { e: new Event('pointermove') }

    setup.canvas.fire('object:scaling', event)
    setup.canvas.fire('mouse:move', event)

    expect(handleObjectScalingSpy).toHaveBeenCalledTimes(1)
    expect(handleCanvasMouseMoveSpy).toHaveBeenCalledTimes(1)
    expect(legacyObjectScalingSpy).toHaveBeenCalledTimes(1)
    expect(legacyObjectScalingSpy).toHaveBeenCalledWith(event)
    expect(legacyMouseMoveSpy).toHaveBeenCalledTimes(1)
    expect(legacyMouseMoveSpy).toHaveBeenCalledWith(event)
  })
})

describe('Начало и обычное завершение углового скейлинга', () => {
  it('передаёт контроллеру начало и завершение жеста', () => {
    const beginGestureSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'beginGesture')
      .mockReturnValue(true)
    const finishGestureSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'finishGesture')
      .mockReturnValue(true)
    const event = { e: new Event('pointerdown') }

    setup.canvas.fire('mouse:down', event)
    setup.canvas.fire('mouse:up', {})

    expect(beginGestureSpy).toHaveBeenCalledTimes(1)
    expect(beginGestureSpy).toHaveBeenCalledWith(event)
    expect(finishGestureSpy).toHaveBeenCalledTimes(1)
  })

  it('завершает жест при смене или очистке выделения', () => {
    const finishGestureSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'finishGesture')
      .mockReturnValue(true)

    setup.canvas.fire('selection:created', {})
    setup.canvas.fire('selection:updated', {})
    setup.canvas.fire('selection:cleared', {})

    expect(finishGestureSpy).toHaveBeenCalledTimes(3)
    expect(finishGestureSpy).toHaveNthReturnedWith(1, true)
    expect(finishGestureSpy).toHaveNthReturnedWith(3, true)
  })
})

describe('Прерывание углового скейлинга', () => {
  it('передаёт удалённый объект контроллеру активного жеста', () => {
    const finishGestureForTargetSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'finishGestureForTarget')
      .mockReturnValue(false)
    const removed = setup.textManager.addText({ text: 'Удалённый текст' })

    setup.canvas.fire('object:removed', { target: removed })

    expect(finishGestureForTargetSpy).toHaveBeenCalledTimes(1)
    expect(finishGestureForTargetSpy).toHaveBeenCalledWith({ target: removed })
  })

  it('прерывает жест при отмене указателя и потере фокуса', () => {
    const interruptGestureSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'interruptGesture')
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
})

describe('Фиксация и уничтожение состояния углового скейлинга', () => {
  it('сохраняет итог скейлинга до очистки временного состояния', () => {
    const handleObjectModifiedSpy = jest
      .spyOn(setup.textManager['scalingController'], 'handleObjectModified')
      .mockImplementation(() => {})
    const finishGestureSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'finishGesture')
      .mockReturnValue(true)
    const event = { target: setup.textManager.addText({ text: 'Текст' }) }

    setup.canvas.fire('object:modified', event)

    expect(handleObjectModifiedSpy).toHaveBeenCalledWith(event)
    expect(finishGestureSpy).toHaveBeenCalledTimes(1)
    expect(handleObjectModifiedSpy.mock.invocationCallOrder[0]).toBeLessThan(
      finishGestureSpy.mock.invocationCallOrder[0]
    )
  })

  it('завершает активный жест при уничтожении TextManager', () => {
    const finishGestureSpy = jest
      .spyOn(TextCornerScaleInteractionController.prototype, 'finishGesture')
      .mockReturnValue(true)

    setup.textManager.destroy()

    expect(finishGestureSpy).toHaveBeenCalledTimes(1)
    expect(setup.canvas.off).toHaveBeenCalledWith('object:scaling', expect.any(Function))
    expect(setup.canvas.off).toHaveBeenCalledWith('mouse:move', expect.any(Function))
  })
})
