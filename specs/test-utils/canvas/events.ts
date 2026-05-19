import type { AnyFn } from '../shared/types'

type CanvasHandlers = {
  __handlers?: Record<string, AnyFn[]>
}

/**
 * Вызывает обработчики canvas события, если они зарегистрированы в __handlers.
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
 * В тестах canvas из `createCanvasStub` хранит подписчиков в `__handlers`,
 * но `fire` по умолчанию их не вызывает. Этот хелпер делает `fire` "настоящим".
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
