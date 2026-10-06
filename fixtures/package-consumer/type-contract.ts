import initEditor, { type ImageEditor, type EditorOptions, type HistoryChangedPayload } from '@anu3ev/fabric-image-editor'

type NotAny<T> = 0 extends (1 & T) ? never : true
const typedFactory: NotAny<Awaited<ReturnType<typeof initEditor>>> = true
const typedPayload: NotAny<HistoryChangedPayload> = true
void typedFactory
void typedPayload
const options: Partial<EditorOptions> = { montageAreaWidth: 128 }
// @ts-expect-error The public option must remain numeric.
options.montageAreaWidth = '128'

async function contract() {
  const editor: ImageEditor = await initEditor('editor', options)
  void editor.imageManager.importImage
  // @ts-expect-error Unknown managers must not become any.
  editor.nonexistentManager()
  editor.canvas.on('editor:history-changed', (event) => {
    const typedEvent: NotAny<typeof event> = true
    const canUndo: boolean = event.canUndo
    // @ts-expect-error Event payloads must stay typed.
    const wrong: number = event.canUndo
    void [typedEvent, canUndo, wrong]
  })
  editor.destroy()
}
void contract
