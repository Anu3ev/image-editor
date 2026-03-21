import type { AnyFn } from './editor-helpers'

export type DeferredExternalPasteControls = {
  resolve: (importOptions?: object | null) => void
  reject: (error?: unknown) => void
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

/**
 * Подписывается на `editor:external-image-paste-pending` и сразу вызывает `defer()`,
 * возвращая доступ к `resolve/reject` для управления сценарием в тесте.
 */
export const installExternalImagePastePendingDefer = (canvas: any) => {
  let lastImageSource: string | File | undefined
  let controls: DeferredExternalPasteControls | null = null

  canvas.on('editor:external-image-paste-pending', ({ imageSource, defer }: any) => {
    lastImageSource = imageSource
    controls = defer()
  })

  return {
    getImageSource: () => lastImageSource,
    getControls: () => controls
  }
}
