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

/**
 * Minimal viewport coordinates of a touch point for unit-test events.
 */
type TouchPointInit = {
  clientX: number
  clientY: number
}

/**
 * Creates a touch event for jsdom, where native TouchEvent support is unreliable.
 */
export const touch = (
  type: 'touchstart' | 'touchmove' | 'touchend',
  points: TouchPointInit[],
  target?: EventTarget
): TouchEvent => {
  const e = new Event(type, {
    bubbles: true,
    cancelable: true
  })

  Object.defineProperty(e, 'touches', { value: points })
  Object.defineProperty(e, 'changedTouches', { value: points })
  if (target) Object.defineProperty(e, 'target', { value: target })

  return e as TouchEvent
}

// GestureEvent is unavailable in jsdom, so build a compatible Event manually for unit tests.
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
