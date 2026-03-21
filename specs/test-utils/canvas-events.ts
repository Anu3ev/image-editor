import type { AnyFn } from './editor-helpers'

type CanvasHandlers = {
  __handlers?: Record<string, AnyFn[]>
}

/**
 * Вызывает обработчики canvas события, если они зарегистрированы в __handlers.
 * @param params - параметры вызова
 * @param params.canvas - canvas с __handlers
 * @param params.event - имя события
 * @param params.payload - данные события
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
