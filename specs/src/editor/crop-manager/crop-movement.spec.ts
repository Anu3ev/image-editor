import { createCropMovementHarness } from '../../../test-utils/crop/movement'
import { MovementSnappingRuntime } from '../../../../src/editor/snapping-manager/movement/movement-snapping-runtime'

it('применяет одно перемещение crop ровно один раз и фиксирует цели только в начале', () => {
  const harness = createCropMovementHarness()
  harness.start()
  const event = new MouseEvent('mousemove')

  expect(harness.step({ x: 2, y: -2, event })).toBe(true)
  expect(harness.frame.left).toBe(0)
  expect(harness.frame.top).toBe(0)
  expect(harness.set).toHaveBeenCalledTimes(1)
  expect(harness.publish).toHaveBeenCalledTimes(1)
  expect(harness.step({ x: 2, y: -2, event })).toBe(false)
  expect(harness.set).toHaveBeenCalledTimes(1)
  expect(harness.markHandled).toHaveBeenCalledTimes(1)
  expect(harness.capture).toHaveBeenCalledTimes(1)
  harness.controller.destroy()
})

it('не показывает направляющие на неподвижной оси при ограничении источником', () => {
  const harness = createCropMovementHarness()
  harness.start()

  expect(harness.step({ x: 300, y: 0 })).toBe(true)
  expect(harness.frame.left).toBe(200)
  expect(harness.frame.top).toBe(0)
  expect(harness.frame.getObjectDisplaySize()).toEqual({ width: 200, height: 150 })
  expect(harness.publish).toHaveBeenLastCalledWith(expect.objectContaining({ guides: [], spacingGuides: [] }))
  harness.controller.destroy()
})

it('Ctrl меняет прилипание при тех же координатах, но не отключает границу изображения', () => {
  const harness = createCropMovementHarness()
  harness.start()
  expect(harness.step({ x: 2, y: 2 })).toBe(true)
  expect(harness.frame.left).toBe(0)
  expect(harness.step({ x: 2, y: 2, event: new MouseEvent('mousemove', { ctrlKey: true }) })).toBe(true)
  expect(harness.frame.left).toBe(2)
  expect(harness.frame.top).toBe(2)
  expect(harness.publish).toHaveBeenLastCalledWith(expect.objectContaining({ guides: [] }))
  expect(harness.step({ x: 400, y: 0, event: new MouseEvent('mousemove', { ctrlKey: true }) })).toBe(true)
  expect(harness.frame.left).toBe(200)
  harness.controller.destroy()
})

it('при разрешённом выходе за источник не ограничивает позицию и сохраняет размер', () => {
  const harness = createCropMovementHarness({ allowFrameOverflow: true })
  harness.start()

  expect(harness.step({ x: 380, y: 240 })).toBe(true)
  expect(harness.frame.left).toBe(380)
  expect(harness.frame.top).toBe(240)
  expect(harness.frame.getObjectDisplaySize()).toEqual({ width: 200, height: 150 })
  harness.controller.destroy()
})

it('при ошибке проверки crop возвращается к последней подтверждённой позиции', () => {
  const harness = createCropMovementHarness()
  harness.start()
  expect(harness.step({ x: 70, y: 60 })).toBe(true)
  const before = harness.frame.getObjectSnappingBounds()
  const error = new Error('Не удалось проверить позицию crop')
  const verify = jest.spyOn(MovementSnappingRuntime.prototype, 'verifyMovementPlan')
    .mockImplementationOnce(() => { throw error })

  expect(() => harness.step({ x: 100, y: 80 })).toThrow(error)
  expect(harness.frame.getObjectSnappingBounds()).toEqual(before)
  expect(harness.endTransform).toHaveBeenCalledTimes(1)
  expect(harness.transform.actionHandler).toBe(harness.originalHandler)
  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  verify.mockRestore()
  harness.controller.destroy()
})

it.each(['pointercancel', 'touchcancel', 'blur'])('при %s завершает перемещение crop и восстанавливает действие Fabric', (name) => {
  const harness = createCropMovementHarness()
  harness.start()
  expect(harness.step({ x: 2, y: 2 })).toBe(true)
  const before = harness.frame.getObjectSnappingBounds()
  window.dispatchEvent(new Event(name))

  expect(harness.endTransform).toHaveBeenCalledTimes(1)
  expect(harness.frame.getObjectSnappingBounds()).toEqual(before)
  expect(harness.transform.actionHandler).toBe(harness.originalHandler)
  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [], spacingGuides: [] })
  harness.controller.destroy()
  expect(harness.endTransform).toHaveBeenCalledTimes(1)
})

it('не перехватывает действие скейлинга crop', () => {
  const harness = createCropMovementHarness()
  harness.transform.action = 'scale'
  harness.start()

  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.transform.actionHandler).toBe(harness.originalHandler)
  expect(harness.capture).not.toHaveBeenCalled()
  harness.controller.destroy()
})

it('завершает перемещение crop даже если восстановление рамки тоже завершилось ошибкой', () => {
  const harness = createCropMovementHarness()
  harness.start()
  const failure = new Error('Ошибка перемещения')
  harness.set.mockImplementationOnce(() => { throw failure })
    .mockImplementationOnce(() => { throw new Error('Ошибка восстановления') })

  expect(() => harness.step({ x: 80, y: 60 })).toThrow(failure)
  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.endTransform).toHaveBeenCalledTimes(1)
  expect(harness.transform.actionHandler).toBe(harness.originalHandler)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [], spacingGuides: [] })
  harness.controller.destroy()
})

it.each(['frame', 'source'] as const)('при удалении %s очищает активное перемещение crop', (target) => {
  const harness = createCropMovementHarness()
  harness.start()
  expect(harness.step({ x: 2, y: 2 })).toBe(true)
  const removed = target === 'frame' ? harness.frame : harness.frame.cropSource
  if (!removed) throw new Error('У тестовой crop-области должен быть источник')

  harness.remove(removed)

  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.endTransform).toHaveBeenCalledTimes(1)
  expect(harness.transform.actionHandler).toBe(harness.originalHandler)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [], spacingGuides: [] })
  harness.controller.destroy()
})
