/** @typedef {import('../../editor').ImageEditor} ImageEditor */
/** @typedef {import('../../main').default} EditorFactory */

const HEADLINE = 'Weekend Makers'
const FONT_FAMILY = 'Sample Sans'

/** Resolve from the document, rather than a root URL, for project-prefix hosting. */
const sampleAsset = (/** @type {string} */ name) => new URL(`./samples/${name}`, document.baseURI).href

/** @param {string} id */
function button(id) {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Missing control: ${id}`)
  return element
}

/** Build the complete sample before enabling any editing actions. */
async function buildScene(/** @type {ImageEditor} */ editor) {
  const { canvas, historyManager } = editor
  const bounds = editor.canvasManager.getMontageAreaSceneBounds()
  historyManager.suspendHistory()
  try {
    editor.backgroundManager.setColorBackground({ color: '#f8f1df' })
    const response = await fetch(sampleAsset('makers-table.png'), { signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error('The sample artwork could not be fetched')
    const artwork = new File([await response.blob()], 'makers-table.png', { type: 'image/png' })
    const result = await editor.imageManager.importImage({
      source: artwork,
      withoutSave: true,
      withoutSelection: true,
      customData: { sampleRole: 'image' }
    })
    if (!result) throw new Error('The sample artwork could not be loaded')
    result.image.set({
      id: 'sample-image',
      left: bounds.left + 32,
      top: bounds.top + 188,
      originX: 'left',
      originY: 'top',
      scaleX: 448 / result.image.width,
      scaleY: 280 / result.image.height
    })
    result.image.setCoords()
    editor.textManager.addText({
      id: 'sample-kicker',
      text: 'A SPACE TO MAKE SOMETHING',
      fontFamily: FONT_FAMILY,
      fontSize: 12,
      color: '#34615c',
      left: bounds.left + 32,
      top: bounds.top + 30,
      width: 448,
      autoExpand: false
    }, { withoutSave: true, withoutSelection: true })
    editor.textManager.addText({
      id: 'sample-headline',
      text: HEADLINE,
      fontFamily: FONT_FAMILY,
      fontSize: 43,
      bold: true,
      color: '#173d38',
      left: bounds.left + 30,
      top: bounds.top + 67,
      width: 450,
      autoExpand: false
    }, { withoutSave: true, withoutSelection: true })
    const badge = await editor.shapeManager.add({
      presetKey: 'square',
      options: {
        id: 'sample-badge',
        width: 205,
        height: 36,
        left: bounds.left + 32,
        top: bounds.top + 139,
        originX: 'left',
        originY: 'top',
        fill: '#edb544',
        strokeWidth: 0,
        text: 'SATURDAY · 10 AM–4 PM',
        textStyle: { fontFamily: FONT_FAMILY, fontSize: 12, color: '#173d38', bold: true },
        shapeTextAutoExpand: false,
        withoutSave: true,
        withoutSelection: true
      }
    })
    if (!badge) throw new Error('The sample badge could not be created')
    canvas.discardActiveObject()
    canvas.renderAll()
  } finally {
    historyManager.resumeHistory()
  }
  // Scene construction is the starting point, not an undoable user edit.
  historyManager.baseState = null
  historyManager.patches = []
  historyManager.currentIndex = 0
  historyManager.totalChangesCount = 0
  historyManager.baseStateChangesCount = 0
  historyManager.saveState()
}

/**
 * Own a single editor and serialize reset/history/export operations. A reset request
 * invalidates older completions immediately; a late load can never become editable.
 * @param {EditorFactory} initEditor
 */
export default function initSampleDemo(initEditor) {
  const root = document.getElementById('sample-demo')
  const status = document.getElementById('sample-status')
  const cropToolbar = document.getElementById('sample-crop-toolbar')
  const headline = document.getElementById('sample-headline')
  const host = document.getElementById('editor')
  if (!root || !status || !cropToolbar || !(headline instanceof HTMLInputElement) || !host) {
    throw new Error('The sample controls are missing')
  }
  const controls = {
    crop: button('sample-crop'),
    apply: button('sample-crop-apply'),
    cancel: button('sample-crop-cancel'),
    undo: button('sample-undo'),
    redo: button('sample-redo'),
    export: button('sample-export'),
    reset: button('sample-reset')
  }
  /** @type {ImageEditor | null} */
  let editor = null
  let ready = false
  let busy = false
  let requestedReset = 0
  let completedReset = 0
  let resetting = false
  /** @type {Promise<void> | null} */
  let fontReady = null
  /** @type {Promise<void>} */
  let operation = Promise.resolve()

  const setStatus = (/** @type {string} */ message, error = false) => {
    status.textContent = message
    status.dataset.error = String(error)
  }

  const sync = () => {
    const cropping = Boolean(editor?.cropManager.isActive)
    const unavailable = !ready || busy || resetting
    const editingUnavailable = unavailable || cropping
    let canUndo = false
    let canRedo = false
    if (editor) {
      const { currentIndex, patches } = editor.historyManager
      canUndo = currentIndex > 0
      canRedo = currentIndex < patches.length
    }
    root.dataset.ready = String(ready && !resetting)
    root.setAttribute('aria-busy', String(busy || resetting))
    headline.disabled = editingUnavailable
    controls.crop.disabled = editingUnavailable
    controls.export.disabled = editingUnavailable
    controls.undo.disabled = editingUnavailable || !canUndo
    controls.redo.disabled = editingUnavailable || !canRedo
    controls.apply.disabled = unavailable || !cropping
    controls.cancel.disabled = unavailable || !cropping
    cropToolbar.hidden = !cropping || resetting
    host.style.pointerEvents = unavailable ? 'none' : ''
    const text = editor?.canvas.getObjects().find((object) => object.id === 'sample-headline')
    if (text && 'text' in text && typeof text.text === 'string' && document.activeElement !== headline) {
      headline.value = text.text
    }
  }

  const ensureFont = () => {
    if (!fontReady) {
      fontReady = fetch(sampleAsset('sample-sans.woff'), { signal: AbortSignal.timeout(15000) })
        .then(async(response) => {
          if (!response.ok) throw new Error('The sample font could not be fetched')
          return new FontFace(FONT_FAMILY, await response.arrayBuffer()).load()
        })
        .then((font) => { document.fonts.add(font) })
        .catch((error) => { fontReady = null; throw error })
    }
    return fontReady
  }

  const reset = async() => {
    requestedReset += 1
    ready = false
    sync()
    if (resetting) return
    resetting = true
    sync()
    // Wait for any export/history restoration before disposing its canvas.
    await operation
    try {
      while (completedReset !== requestedReset) {
        const revision = requestedReset
        setStatus('Loading your sample…')
        if (editor) {
          editor.cropManager.cancel()
          await editor.destroy()
          editor = null
        }
        host.replaceChildren()
        try {
          await ensureFont()
          editor = await initEditor('editor', {
            montageAreaWidth: 512,
            montageAreaHeight: 512,
            editorContainerWidth: '100%',
            editorContainerHeight: '100%',
            fonts: [],
            showToolbar: false,
            showViewportScrollbars: false,
            // Keep history mutations serialized through the visible controls.
            undoRedoByHotKeys: false,
            pasteImageFromClipboard: false
          })
          await buildScene(editor)
          if (revision === requestedReset) {
            editor.canvas.on('editor:history-changed', sync)
            editor.canvas.on('editor:crop:started', sync)
            editor.canvas.on('editor:crop:cancelled', sync)
            editor.canvas.on('editor:crop:applied', sync)
            headline.value = HEADLINE
            ready = true
            setStatus('Your sample is ready. Start with the headline.')
          }
        } catch (error) {
          console.error('[sample demo]', error)
          if (editor) {
            await editor.destroy()
            editor = null
          }
          if (revision === requestedReset) {
            setStatus('The sample could not load. Check your connection and choose Reset sample to try again.', true)
          }
        }
        completedReset = revision
      }
    } finally {
      resetting = false
      sync()
    }
  }

  /** @param {(current: ImageEditor) => Promise<void> | void} action */
  const run = (action) => {
    if (!editor || !ready || busy || resetting) return
    const current = editor
    const revision = requestedReset
    busy = true
    sync()
    operation = (async() => {
      try {
        await action(current)
      } catch (error) {
        console.error('[sample demo]', error)
        if (revision === requestedReset) {
          setStatus('That action could not finish. Please try again or reset the sample.', true)
        }
      } finally {
        busy = false
        sync()
      }
    })()
  }

  headline.addEventListener('focus', () => {
    if (!editor || !ready || busy || resetting || editor.cropManager.isActive) return
    const text = editor.canvas.getObjects().find((object) => object.id === 'sample-headline')
    if (text) {
      editor.canvas.setActiveObject(text)
      editor.canvas.requestRenderAll()
    }
  })
  headline.addEventListener('input', () => {
    if (!editor || !ready || busy || resetting || editor.cropManager.isActive) return
    editor.textManager.updateText({ target: 'sample-headline', style: { text: headline.value } })
    setStatus('Headline updated. Edits stay reversible.')
    sync()
  })
  controls.crop.addEventListener('click', () => run((current) => {
    const image = current.canvas.getObjects().find((object) => object.id === 'sample-image')
    if (!image) throw new Error('The sample image is missing')
    current.canvas.setActiveObject(image)
    const state = current.cropManager.startImageCrop({
      allowFrameOverflow: false,
      showGrid: true,
      showDimmedArea: true,
      preserveAspectRatio: false,
      cancelOnSelectionClear: false,
      size: { width: Math.round(image.width * 0.8), height: Math.round(image.height * 0.8) }
    })
    if (!state) throw new Error('Crop could not start')
    setStatus('Adjust the frame, then Apply crop. Cancel keeps the original.')
  }))
  controls.apply.addEventListener('click', () => run((current) => {
    if (!current.cropManager.apply()) throw new Error('Crop could not be applied')
    setStatus('Crop applied. Try Undo, then Redo.')
  }))
  controls.cancel.addEventListener('click', () => run((current) => {
    current.cropManager.cancel()
    setStatus('Crop canceled. Your composition is unchanged.')
  }))
  controls.undo.addEventListener('click', () => run(async(current) => {
    await current.historyManager.undo()
    setStatus('Undone. You can bring it back with Redo.')
  }))
  controls.redo.addEventListener('click', () => run(async(current) => {
    await current.historyManager.redo()
    setStatus('Redone. Edits stay reversible.')
  }))
  controls.export.addEventListener('click', () => run(async(current) => {
    const revision = requestedReset
    setStatus('Preparing your PNG…')
    const result = await current.imageManager.exportCanvasAsImageFile({
      fileName: 'weekend-makers.png', contentType: 'image/png'
    })
    if (!result || !(result.image instanceof Blob) || !result.image.size) {
      throw new Error('Export did not return a nonempty PNG')
    }
    if (revision !== requestedReset) return
    const url = URL.createObjectURL(result.image)
    const link = document.createElement('a')
    link.href = url
    link.download = 'weekend-makers.png'
    document.body.appendChild(link)
    try {
      link.click()
      setStatus('Your PNG is ready. Download started.')
    } finally {
      link.remove()
      // Give the browser time to consume the download URL before releasing it.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }))
  controls.reset.addEventListener('click', () => { reset() })
  reset()
}
