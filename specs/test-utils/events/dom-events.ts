export const key = (type: 'keydown' | 'keyup', init?: KeyboardEventInit, target?: EventTarget): KeyboardEvent => {
  const e = new KeyboardEvent(type, init)
  if (target) Object.defineProperty(e, 'target', { value: target })
  return e
}

export const keyDown = (init?: KeyboardEventInit, target?: EventTarget) => key('keydown', init, target)
export const keyUp = (init?: KeyboardEventInit, target?: EventTarget) => key('keyup', init, target)

export const mouse = (
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'dblclick',
  init?: MouseEventInit,
  target?: EventTarget
): MouseEvent => {
  const e = new MouseEvent(type, init)
  if (target) Object.defineProperty(e, 'target', { value: target })
  return e
}

export const wheel = (init?: WheelEventInit, target?: EventTarget): WheelEvent => {
  const e = new WheelEvent('wheel', init)
  if (target) Object.defineProperty(e, 'target', { value: target })
  return e
}

// GestureEvent не доступен в jsdom, поэтому для unit-тестов собираем совместимый Event вручную.
export const gesture = (
  type: 'gesturestart' | 'gesturechange' | 'gestureend',
  init?: { scale?: number; clientX?: number; clientY?: number },
  target?: EventTarget
): Event => {
  const e = new Event(type, {
    bubbles: true,
    cancelable: true
  })
  const eventInit = init ?? {}

  if (typeof eventInit.scale === 'number') Object.defineProperty(e, 'scale', { value: eventInit.scale })
  if (typeof eventInit.clientX === 'number') Object.defineProperty(e, 'clientX', { value: eventInit.clientX })
  if (typeof eventInit.clientY === 'number') Object.defineProperty(e, 'clientY', { value: eventInit.clientY })
  if (target) Object.defineProperty(e, 'target', { value: target })

  return e
}
