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
 * Минимальные viewport-координаты touch-точки для unit-событий.
 */
type TouchPointInit = {
  clientX: number
  clientY: number
}

/**
 * Создаёт touch-событие для jsdom, где нативный TouchEvent недоступен стабильно.
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
