export type DeferredExternalPasteControls = {
  resolve: (importOptions?: object | null) => void
  reject: (error?: unknown) => void
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
