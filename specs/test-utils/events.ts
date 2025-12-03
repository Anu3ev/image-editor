import type { TPointerEventInfo, TPointerEvent } from 'fabric'

// Keyboard events
export const key = (type: 'keydown' | 'keyup', init?: KeyboardEventInit, target?: EventTarget): KeyboardEvent => {
  const e = new KeyboardEvent(type, init)
  if (target) Object.defineProperty(e, 'target', { value: target })
  return e
}

export const keyDown = (init?: KeyboardEventInit, target?: EventTarget) => key('keydown', init, target)
export const keyUp = (init?: KeyboardEventInit, target?: EventTarget) => key('keyup', init, target)

// Mouse events
export const mouse = (
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'dblclick',
  init?: MouseEventInit,
  target?: EventTarget
): MouseEvent => {
  const e = new MouseEvent(type, init)
  if (target) Object.defineProperty(e, 'target', { value: target })
  return e
}

// Wheel events
export const wheel = (init?: WheelEventInit, target?: EventTarget): WheelEvent => {
  const e = new WheelEvent('wheel', init)
  if (target) Object.defineProperty(e, 'target', { value: target })
  return e
}

// Fabric pointer wrapper: { e }
export const ptr = <T extends TPointerEvent>(e: T): TPointerEventInfo<T> => ({ e } as unknown as TPointerEventInfo<T>)

// Fabric pointer wrapper that also carries a fabric-like "target" for handlers expecting options.target
export const fabricPtrWithTarget = (target: unknown, e: Event = new Event('dummy')): TPointerEventInfo<TPointerEvent> => (
  { e, target } as unknown as TPointerEventInfo<TPointerEvent>
)

export const mockRaf = () => {
  const originalRequest = window.requestAnimationFrame
  const originalCancel = window.cancelAnimationFrame
  const rafMock = jest.fn((cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  const cancelMock = jest.fn()
  window.requestAnimationFrame = rafMock
  window.cancelAnimationFrame = cancelMock

  const restore = () => {
    window.requestAnimationFrame = originalRequest
    window.cancelAnimationFrame = originalCancel
  }

  return { rafMock, cancelMock, restore }
}
