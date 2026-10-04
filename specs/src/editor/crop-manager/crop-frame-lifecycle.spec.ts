import { createCropMovementHarness } from '../../../test-utils/crop/movement'
import { createCropScaleHarness } from '../../../test-utils/crop/scale'

it.each([
  { action: 'скейлинга', create: createCropScaleHarness },
  { action: 'перемещения', create: createCropMovementHarness }
])('снимает временные ручки и подписки даже при ошибке завершения $action crop', ({ create }) => {
  const harness = create()
  const activeControls = harness.frame.controls
  const off = jest.spyOn(harness.canvas, 'off')
  const removeListener = jest.spyOn(window, 'removeEventListener')
  const failure = new Error('Ошибка завершения Fabric transform')
  harness.start()
  harness.endTransform.mockImplementationOnce(() => { throw failure })

  try {
    expect(() => harness.controller.destroy()).toThrow(failure)
    expect(harness.controller.ownsTransform(harness.transform)).toBe(false)
    expect(harness.frame.controls).not.toBe(activeControls)

    for (const name of ['mouse:down', 'mouse:up', 'object:removed', 'selection:created', 'selection:cleared', 'selection:updated']) {
      expect(off).toHaveBeenCalledWith(name, expect.any(Function))
    }
    for (const name of ['blur', 'pointercancel', 'touchcancel']) {
      expect(removeListener).toHaveBeenCalledWith(name, expect.any(Function))
    }
  } finally {
    harness.controller.destroy()
    removeListener.mockRestore()
    off.mockRestore()
  }
})
