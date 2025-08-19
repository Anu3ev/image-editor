import Listeners from '../../../src/editor/listeners'

type AnyFn = (...args: any[]) => any

const createCanvasStub = () => {
  const handlers: Record<string, AnyFn[]> = {}
  const canvas = {
    on: jest.fn((evt: string, fn: AnyFn) => {
      handlers[evt] = handlers[evt] || []
      handlers[evt].push(fn)
    }),
    off: jest.fn((evt: string, fn: AnyFn) => {
      if (!handlers[evt]) return
      handlers[evt] = handlers[evt].filter(h => h !== fn)
    }),
    set: jest.fn(),
    setCursor: jest.fn(),
    requestRenderAll: jest.fn(),
    setViewportTransform: jest.fn(),
    discardActiveObject: jest.fn(),
    setActiveObject: jest.fn(),
    viewportTransform: [1, 0, 0, 1, 0, 0] as any,
    __handlers: handlers
  }
  return canvas as any
}

const createEditorStub = () => {
  const canvas = createCanvasStub()
  return {
    canvas,
    historyManager: {
      skipHistory: false,
      saveState: jest.fn(),
      undo: jest.fn().mockResolvedValue(undefined),
      redo: jest.fn().mockResolvedValue(undefined)
    },
    interactionBlocker: {
      isBlocked: false,
      overlayMask: null as any,
      refresh: jest.fn()
    },
    canvasManager: {
      updateCanvas: jest.fn(),
      getObjects: jest.fn().mockReturnValue([
        { set: jest.fn() },
        { set: jest.fn() }
      ])
    },
    transformManager: {
      zoom: jest.fn(),
      resetObject: jest.fn()
    },
    layerManager: { bringToFront: jest.fn() },
    selectionManager: { selectAll: jest.fn() },
    deletionManager: { deleteSelectedObjects: jest.fn() },
    clipboardManager: { copy: jest.fn(), handlePasteEvent: jest.fn() },
    errorManager: { emitWarning: jest.fn() }
  } as any
}

describe('Listeners', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('init', () => {
    it('подписывается на ключевые события canvas и DOM по опциям', () => {
      const editor = createEditorStub()
      const addWin = jest.spyOn(window, 'addEventListener')
      const addDoc = jest.spyOn(document, 'addEventListener')

      const listeners = new Listeners({
        editor,
        options: {
          canvasDragging: true,
          mouseWheelZooming: true,
          bringToFrontOnSelection: true,
          resetObjectFitByDoubleClick: true,
          adaptCanvasToContainerOnResize: true,
          copyObjectsByHotkey: true,
          pasteImageFromClipboard: true,
          undoRedoByHotKeys: true,
          selectAllByHotkey: true,
          deleteObjectsByHotkey: true
        }
      })

      // canvas .on bindings
      const onCalls = (editor.canvas.on as jest.Mock).mock.calls.map(c => c[0])
      expect(onCalls).toEqual(expect.arrayContaining([
        'mouse:down', 'mouse:move', 'mouse:up',
        'mouse:wheel',
        'selection:created', 'selection:updated',
        'mouse:dblclick',
        'object:modified', 'object:rotating', 'object:added', 'object:removed'
      ]))

      // DOM bindings
      expect(addWin).toHaveBeenCalledWith('resize', listeners.handleContainerResizeBound, { capture: true })
      expect(addDoc).toHaveBeenCalledWith('keydown', listeners.handleCopyEventBound, { capture: true })
      expect(addDoc).toHaveBeenCalledWith('paste', listeners.handlePasteEventBound, { capture: true })
      expect(addDoc).toHaveBeenCalledWith('keydown', listeners.handleUndoRedoEventBound, { capture: true })
      expect(addDoc).toHaveBeenCalledWith('keyup', listeners.handleUndoRedoKeyUpBound, { capture: true })
      expect(addDoc).toHaveBeenCalledWith('keydown', listeners.handleSelectAllEventBound, { capture: true })
      expect(addDoc).toHaveBeenCalledWith('keydown', listeners.handleDeleteObjectsEventBound, { capture: true })
    })

    it('всегда подписывается на историю и overlay события', () => {
      const editor = createEditorStub()
      // Без опций — только обязательные подписки
      new Listeners({ editor, options: {} })
      const onCalls = (editor.canvas.on as jest.Mock).mock.calls.map(c => c[0])
      expect(onCalls).toEqual(expect.arrayContaining([
        'object:modified', 'object:rotating', 'object:added', 'object:removed',
        'selection:created'
      ]))
    })
  })

  describe('keyboard handlers', () => {
    it('copy/selectAll/delete по хоткеям', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({
        editor,
        options: { copyObjectsByHotkey: true, selectAllByHotkey: true, deleteObjectsByHotkey: true }
      })

      const preventDefault = jest.fn()

      listeners.handleCopyEvent({ ctrlKey: true, metaKey: false, code: 'KeyC', preventDefault } as any)
      expect(preventDefault).toHaveBeenCalled()
      expect(editor.clipboardManager.copy).toHaveBeenCalled()

      listeners.handleSelectAllEvent({ ctrlKey: true, metaKey: false, code: 'KeyA', preventDefault } as any)
      expect(preventDefault).toHaveBeenCalled()
      expect(editor.selectionManager.selectAll).toHaveBeenCalled()

      listeners.handleDeleteObjectsEvent({ code: 'Delete', preventDefault } as any)
      expect(preventDefault).toHaveBeenCalled()
      expect(editor.deletionManager.deleteSelectedObjects).toHaveBeenCalled()
    })

    it('undo/redo и сброс флага на keyup', async () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { undoRedoByHotKeys: true } })
      const preventDefault = jest.fn()

      Object.defineProperty(window.navigator, 'userAgent', { value: 'Windows', configurable: true })

      await listeners.handleUndoRedoEvent({ ctrlKey: true, metaKey: false, code: 'KeyZ', repeat: false, preventDefault } as any)
      expect(preventDefault).toHaveBeenCalled()
      expect(listeners.isUndoRedoKeyPressed).toBe(true)
      expect(editor.historyManager.undo).toHaveBeenCalled()

      listeners.handleUndoRedoKeyUp({ code: 'KeyZ' } as any)
      expect(listeners.isUndoRedoKeyPressed).toBe(false)

      await listeners.handleUndoRedoEvent({ ctrlKey: true, metaKey: false, code: 'KeyY', repeat: false, preventDefault } as any)
      expect(editor.historyManager.redo).toHaveBeenCalled()
    })
  })

  describe('space & drag', () => {
    it('Space включает режим drag, mouse down/move/up двигает вьюпорт', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { canvasDragging: true } })

      // keydown Space
      const preventDefault = jest.fn()
      listeners.handleSpaceKeyDown({ code: 'Space', preventDefault } as any)
      expect(preventDefault).toHaveBeenCalled()
      expect(editor.canvas.set).toHaveBeenCalledWith(expect.objectContaining({ selection: false, defaultCursor: 'grab' }))
      expect(editor.canvas.setCursor).toHaveBeenCalledWith('grab')

      // start drag
      const md = new MouseEvent('mousedown', { clientX: 10, clientY: 20 })
      listeners.handleCanvasDragStart({ e: md } as any)
      expect((editor.canvas.setCursor as jest.Mock)).toHaveBeenCalledWith('grabbing')

      // move drag
      const mm = new MouseEvent('mousemove', { clientX: 20, clientY: 30 })
      listeners.handleCanvasDragging({ e: mm } as any)
      expect(editor.canvas.requestRenderAll).toHaveBeenCalled()
      expect(editor.canvas.viewportTransform[4]).toBe(10)
      expect(editor.canvas.viewportTransform[5]).toBe(10)

      // end drag keeps grab cursor while Space pressed
      listeners.handleCanvasDragEnd()
      expect(editor.canvas.setViewportTransform).toHaveBeenCalled()
      expect(editor.canvas.set).toHaveBeenCalledWith(expect.objectContaining({ defaultCursor: 'grab' }))
      expect(editor.canvas.setCursor).toHaveBeenCalledWith('grab')

      // keyup Space restores selection and flags
      listeners.handleSpaceKeyUp({ code: 'Space' } as any)
      expect(editor.canvas.set).toHaveBeenCalledWith(expect.objectContaining({ selection: true, defaultCursor: 'default' }))
      expect(editor.canvas.setCursor).toHaveBeenCalledWith('default')
      const objs = (editor.canvasManager.getObjects as jest.Mock).mock.results[0].value
      expect(objs[0].set).toHaveBeenCalled()
      expect(objs[1].set).toHaveBeenCalled()
    })
  })

  describe('misc handlers', () => {
    it('mouse wheel zoom вызывает transformManager.zoom', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { mouseWheelZooming: true } })
      const preventDefault = jest.fn()
      const stopPropagation = jest.fn()
      const evt = { ctrlKey: true, metaKey: false, deltaY: -100, preventDefault, stopPropagation } as any
      listeners.handleMouseWheelZoom({ e: evt } as any)
      expect(editor.transformManager.zoom).toHaveBeenCalledWith(0.1)
      expect(preventDefault).toHaveBeenCalled()
      expect(stopPropagation).toHaveBeenCalled()
    })

    it('overlay update refresh при заблокированном состоянии', () => {
      const editor = createEditorStub()
      editor.interactionBlocker.isBlocked = true
      editor.interactionBlocker.overlayMask = {}
      const listeners = new Listeners({ editor, options: {} })
      listeners.handleOverlayUpdate()
      expect(editor.interactionBlocker.refresh).toHaveBeenCalled()
    })

    it('bringToFront и resetObject работают', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: {} })
      listeners.handleBringToFront({ selected: [{}, {}] as any })
      expect(editor.layerManager.bringToFront).toHaveBeenCalledTimes(2)

      const target = {}
      listeners.handleResetObjectFit({ target } as any)
      expect(editor.transformManager.resetObject).toHaveBeenCalledWith(target)
    })

    it('history save handlers учитывают skipHistory', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: {} })
      listeners.handleObjectModifiedHistory()
      listeners.handleObjectRotatingHistory()
      listeners.handleObjectAddedHistory()
      listeners.handleObjectRemovedHistory()
      expect(editor.historyManager.saveState).toHaveBeenCalledTimes(4)

      ;(editor.historyManager.saveState as jest.Mock).mockClear()
      editor.historyManager.skipHistory = true
      listeners.handleObjectModifiedHistory()
      expect(editor.historyManager.saveState).not.toHaveBeenCalled()
    })

    it('_shouldIgnoreKeyboardEvent учитывает inputs, contenteditable и селекторы', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { keyboardIgnoreSelectors: ['.ignore-me'] } })

      const input = document.createElement('input')
      expect(listeners._shouldIgnoreKeyboardEvent({ target: input } as any)).toBe(true)

      const div = document.createElement('div')
      div.contentEditable = 'true'
      expect(listeners._shouldIgnoreKeyboardEvent({ target: div } as any)).toBe(true)

      const wrap = document.createElement('div')
      wrap.className = 'ignore-me'
      const child = document.createElement('span')
      wrap.appendChild(child)
      expect(listeners._shouldIgnoreKeyboardEvent({ target: child } as any)).toBe(true)

      // invalid selector triggers warning
      const listeners2 = new Listeners({ editor: createEditorStub(), options: { keyboardIgnoreSelectors: ['::invalid'] } })
      const span = document.createElement('span')
      expect(listeners2._shouldIgnoreKeyboardEvent({ target: span } as any)).toBe(false)
      expect(listeners2.editor.errorManager.emitWarning).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('снимает обработчики canvas и DOM', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({
        editor,
        options: {
          canvasDragging: true,
          mouseWheelZooming: true,
          bringToFrontOnSelection: true,
          resetObjectFitByDoubleClick: true
        }
      })

      const remWin = jest.spyOn(window, 'removeEventListener')
      const remDoc = jest.spyOn(document, 'removeEventListener')

      listeners.destroy()

      // canvas .off for main groups
      const offCalls = (editor.canvas.off as jest.Mock).mock.calls.map(c => c[0])
      expect(offCalls).toEqual(expect.arrayContaining([
        'mouse:down', 'mouse:move', 'mouse:up',
        'mouse:wheel',
        'selection:created', 'selection:updated',
        'mouse:dblclick',
        'object:modified', 'object:rotating', 'object:added', 'object:removed'
      ]))

      expect(remDoc).toHaveBeenCalled()
      expect(remWin).toHaveBeenCalled()
    })
  })
})
