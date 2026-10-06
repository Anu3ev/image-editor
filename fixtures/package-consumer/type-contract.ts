/* eslint-disable no-void -- Compile-time assertions only reference values. */
import type { CanvasOptions } from 'fabric'
import initEditor, {
  type EditorOptions,
  type HistoryChangedPayload,
  type ImageEditor,
  type ImportImageOptions,
  type ToolbarConfig
} from '@anu3ev/fabric-image-editor'
import legacyInitEditor from '@anu3ev/fabric-image-editor/dist/main.js'

type NotAny<T> = 0 extends (1 & T) ? never : true
const typedFactory: NotAny<Awaited<ReturnType<typeof initEditor>>> = true
const typedPayload: NotAny<HistoryChangedPayload> = true
const fabricOptions: Pick<CanvasOptions, 'montageAreaWidth' | 'showToolbar' | 'maxHistoryLength'> = {}
const legacyFactory: typeof initEditor = legacyInitEditor
void [typedFactory, typedPayload, fabricOptions, legacyFactory]

const file = new File(['image'], 'sample.png', { type: 'image/png' })
const initialImages: ImportImageOptions[] = [
  { source: '/sample.png', scale: 'image-contain' },
  { source: file, scale: 'image-cover' },
  { source: file, scale: 'scale-montage', withoutSave: true, customData: { id: 1 } }
]
const toolbar: ToolbarConfig = {
  actions: [{ name: 'Custom', handle: 'custom' }],
  handlers: {
    custom(editor, target) {
      const typedEditor: NotAny<typeof editor> = true
      editor.canvas.renderAll()
      target?.set({ opacity: 0.5 })
      void typedEditor
    }
  },
  style: { background: '#fff', zIndex: 1 },
  btnStyle: { padding: '4px' },
  btnHover: { opacity: 0.5 },
  icons: { custom: 'data:image/svg+xml,<svg/>' },
  offsetTop: 12
}
const options: Partial<EditorOptions> = {
  montageAreaWidth: 128,
  initialImage: initialImages[0],
  toolbar
}
for (const initialImage of initialImages) {
  const supported: Partial<EditorOptions> = { initialImage }
  void supported
}
const partialToolbar: Partial<EditorOptions> = { toolbar: { offsetTop: 4 } }
void partialToolbar
// @ts-expect-error The public option must remain numeric.
options.montageAreaWidth = '128'
// @ts-expect-error Import scaling uses the canonical image-prefixed values.
options.initialImage = { source: file, scale: 'contain' }
// @ts-expect-error Initial images must contain an actual supported source.
options.initialImage = { source: 12 }
// @ts-expect-error Toolbar handlers must be callable.
options.toolbar = { handlers: { custom: 'custom' } }
// @ts-expect-error ImageEditor is exported only as a type, not a runtime constructor.
void ImageEditor

async function contract() {
  const editor: ImageEditor = await initEditor('editor', options)
  void editor.imageManager.importImage
  // @ts-expect-error Unknown managers must not become any.
  editor.nonexistentManager()
  editor.canvas.on('editor:history-changed', (event) => {
    const typedEvent: NotAny<typeof event> = true
    const { canUndo } = event
    // @ts-expect-error Event payloads must stay typed.
    const wrong: number = event.canUndo
    void [typedEvent, canUndo, wrong]
  })
}
void contract
