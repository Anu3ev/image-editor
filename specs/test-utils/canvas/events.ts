import type { AnyFn } from '../shared/types'

type CanvasHandlers = {
  __handlers?: Record<string, AnyFn[]>
}

/**
 * Invokes canvas event handlers if they are registered in __handlers.
 */
export const emitCanvasEvent = ({
  canvas,
  event,
  payload
}: {
  canvas: CanvasHandlers
  event: string
  payload?: unknown
}): void => {
  const { __handlers } = canvas
  if (!__handlers) return

  const handlers = __handlers[event]
  if (!handlers || handlers.length === 0) return

  for (let index = 0; index < handlers.length; index += 1) {
    const handler = handlers[index]
    handler(payload)
  }
}

/**
 * In tests, the canvas from `createCanvasStub` stores subscribers in `__handlers`,
 * but `fire` does not call them by default. This helper makes `fire` "real".
 */
export const enableCanvasFireHandlers = (canvas: any) => {
  const fireSpy = jest.fn((eventName: string, payload?: any) => {
    const handlers: AnyFn[] = canvas.__handlers?.[eventName] ?? []
    for (let index = 0; index < handlers.length; index += 1) {
      handlers[index](payload)
    }
  })

  canvas.fire = fireSpy

  return fireSpy
}
