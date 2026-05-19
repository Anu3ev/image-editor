export const getCanvasHandler = <TPayload = unknown>({
  canvas,
  eventName
}: {
  canvas: {
    on: jest.Mock
  }
  eventName: string
}): ((payload: TPayload) => void) | null => {
  const calls = canvas.on.mock.calls

  for (let callIndex = 0; callIndex < calls.length; callIndex += 1) {
    const [
      currentEventName,
      handler
    ] = calls[callIndex]

    if (currentEventName === eventName && typeof handler === 'function') {
      return handler as (payload: TPayload) => void
    }
  }

  return null
}

export const getRequiredCanvasHandler = <TPayload = unknown>({
  canvas,
  eventName
}: {
  canvas: {
    on: jest.Mock
  }
  eventName: string
}): ((payload: TPayload) => void) => {
  const handler = getCanvasHandler<TPayload>({
    canvas,
    eventName
  })

  if (!handler) {
    throw new Error(`${eventName} handler should be registered`)
  }

  return handler
}

export const getCanvasEventPayloads = <TPayload = unknown>({
  canvas,
  eventName
}: {
  canvas: {
    fire: jest.Mock
  }
  eventName: string
}): TPayload[] => {
  return canvas.fire.mock.calls
    .filter(([currentEventName]) => currentEventName === eventName)
    .map(([, payload]) => payload as TPayload)
}
