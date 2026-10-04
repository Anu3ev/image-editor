import { Group } from 'fabric'

import { createCropScaleHarness } from '../../../test-utils/crop/scale'
import { ScaleSnappingRuntime } from '../../../../src/editor/snapping-manager/scaling/scale-snapping-runtime'

it('один native-шаг применяется один раз до canvas-события скейлинга', () => {
  const harness = createCropScaleHarness()
  harness.start()
  const event = new MouseEvent('mousemove')

  expect(harness.step({ x: 0, y: 0, event })).toBe(true)
  expect(harness.frame.scaleX).toBeCloseTo(0.25, 9)
  const mutationCount = harness.set.mock.calls.length
  const publicationCount = harness.publish.mock.calls.length

  expect(harness.step({ x: 0, y: 0, event })).toBe(false)
  expect(harness.set).toHaveBeenCalledTimes(mutationCount)
  expect(harness.publish).toHaveBeenCalledTimes(publicationCount)
  expect(harness.markHandled).toHaveBeenCalledTimes(1)
  expect(harness.controller.ownsTransform(harness.transform)).toBe(true)
  harness.controller.destroy()
})

it('изменение Ctrl при тех же координатах создаёт новый шаг и очищает направляющие', () => {
  const harness = createCropScaleHarness()
  harness.start()

  expect(harness.step({ x: 0, y: 0 })).toBe(true)
  expect(harness.publish.mock.calls[0][0].guides).toHaveLength(2)
  expect(harness.step({ x: 0, y: 0, event: new MouseEvent('mousemove', { ctrlKey: true }) })).toBe(true)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [] })
  expect(harness.markHandled).toHaveBeenCalledTimes(2)
  harness.controller.destroy()
})

it('ограничивает размер источником даже при отключённом прилипании', () => {
  const harness = createCropScaleHarness()
  harness.start()

  expect(harness.step({ x: 900, y: -700, event: new MouseEvent('mousemove', { ctrlKey: true }) })).toBe(true)
  expect(harness.frame.getObjectDisplaySize()).toEqual({ width: 1000, height: 667 })
  expect(harness.frame.left).toBe(0)
  expect(harness.frame.top).toBe(0)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [] })
  harness.controller.destroy()
})

it('завершает transform и восстанавливает ручки при закрытии crop', () => {
  const harness = createCropScaleHarness()
  harness.start()
  expect(harness.step({ x: 0, y: 0 })).toBe(true)

  harness.controller.destroy()

  expect(harness.endTransform).toHaveBeenCalledTimes(1)
  expect(harness.frame.controls).toBe(harness.originalControls)
  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [] })
})

it('после ошибки применения возвращает последнее подтверждённое состояние и завершает жест', () => {
  const harness = createCropScaleHarness()
  harness.start()
  expect(harness.step({ x: 0, y: 0 })).toBe(true)
  const before = harness.frame.getObjectSnappingBounds()
  const error = new Error('Невозможно применить положение crop')
  const place = jest.spyOn(harness.frame, 'setPositionByOrigin').mockImplementationOnce(() => { throw error })

  expect(() => harness.step({ x: 120, y: -80 })).toThrow(error)
  expect(harness.frame.getObjectSnappingBounds()).toEqual(before)
  expect(harness.endTransform).toHaveBeenCalledTimes(1)
  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  place.mockRestore()
  harness.controller.destroy()
})

it('не начинает скейлинг при наклоне боковой ручкой', () => {
  const harness = createCropScaleHarness()
  harness.transform.corner = 'ml'
  harness.transform.action = 'skewY'
  harness.start()

  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.capture).not.toHaveBeenCalled()
  expect(harness.step({ x: 0, y: 0 })).toBe(false)
  harness.controller.destroy()
})

it.each([
  { property: 'skewX', value: 12 },
  { property: 'skewY', value: -8 },
  { property: 'flipX', value: true },
  { property: 'flipY', value: true },
  { property: 'lockScalingX', value: true },
  { property: 'lockScalingY', value: true },
  { property: 'angle', value: 25 }
] as const)('сохраняет прежнюю ручку для рамки с $property', ({ property, value }) => {
  const harness = createCropScaleHarness()
  harness.frame.set({ [property]: value })
  harness.start()

  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.capture).not.toHaveBeenCalled()
  expect(harness.step({ x: 30, y: -20 })).toBe(false)
  expect(harness.originalControls.tr.actionHandler).toHaveBeenCalledTimes(1)
  harness.controller.destroy()
})

it.each(['skewX', 'skewY', 'group'] as const)('сохраняет прежнюю ручку для источника с $property', (property) => {
  const harness = createCropScaleHarness()
  const source = harness.frame.cropSource
  if (!source) throw new Error('У crop-рамки должен быть источник')
  source.set({ [property]: property === 'group' ? new Group([]) : 12 })
  harness.start()

  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.capture).not.toHaveBeenCalled()
  expect(harness.step({ x: 30, y: -20 })).toBe(false)
  expect(harness.originalControls.tr.actionHandler).toHaveBeenCalledTimes(1)
  harness.controller.destroy()
})

it('после ошибки расчёта сохраняет crop и очищает удержание', () => {
  const harness = createCropScaleHarness()
  harness.start()
  expect(harness.step({ x: 0, y: 0 })).toBe(true)
  const before = harness.frame.getObjectSnappingBounds()
  const error = new Error('Невозможно рассчитать прилипание')
  const resolve = jest.spyOn(ScaleSnappingRuntime.prototype, 'resolveScalePlan')
    .mockImplementationOnce(() => { throw error })

  expect(() => harness.step({ x: 120, y: -80 })).toThrow(error)
  expect(harness.frame.getObjectSnappingBounds()).toEqual(before)
  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [] })
  resolve.mockRestore()
  harness.controller.destroy()
})

it('завершает скейлинг crop даже если восстановление рамки тоже завершилось ошибкой', () => {
  const harness = createCropScaleHarness()
  harness.start()
  const failure = new Error('Ошибка скейлинга')
  harness.set.mockImplementationOnce(() => { throw failure })
    .mockImplementationOnce(() => { throw new Error('Ошибка восстановления') })

  expect(() => harness.step({ x: 0, y: 0 })).toThrow(failure)
  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.endTransform).toHaveBeenCalledTimes(1)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [] })
  harness.controller.destroy()
})

it.each(['pointercancel', 'touchcancel', 'blur'])('завершает crop-жест при событии %s', (eventName) => {
  const harness = createCropScaleHarness()
  harness.start()
  expect(harness.step({ x: 0, y: 0 })).toBe(true)
  const before = harness.frame.getObjectSnappingBounds()

  window.dispatchEvent(new Event(eventName))

  expect(harness.endTransform).toHaveBeenCalledTimes(1)
  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.frame.getObjectSnappingBounds()).toEqual(before)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [] })
  harness.controller.destroy()
})

it.each(['frame', 'source'] as const)('при удалении %s очищает активный скейлинг crop', (target) => {
  const harness = createCropScaleHarness()
  harness.start()
  expect(harness.step({ x: 0, y: 0 })).toBe(true)
  const removed = target === 'frame' ? harness.frame : harness.frame.cropSource
  if (!removed) throw new Error('У тестовой crop-области должен быть источник')

  harness.remove(removed)

  expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
  expect(harness.endTransform).toHaveBeenCalledTimes(1)
  expect(harness.publish).toHaveBeenLastCalledWith({ guides: [] })
  harness.controller.destroy()
})
