export type DeferredExternalPasteControls = {
  resolve: (importOptions?: object | null) => void
  reject: (error?: unknown) => void
}

/**
 * Subscribes to `editor:external-image-paste-pending` and immediately calls `defer()`,
 * returning access to `resolve/reject` to control the test scenario.
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
