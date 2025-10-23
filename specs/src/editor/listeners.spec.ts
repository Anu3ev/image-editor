import Listeners, { calculateAdaptiveZoomStep } from '../../../src/editor/listeners'
import { createEditorStub } from '../../test-utils/editor-helpers'
import { keyDown, keyUp, mouse, wheel, ptr, fabricPtrWithTarget } from '../../test-utils/events'

// Shared event lists to avoid duplication in assertions
const OPTIONAL_CANVAS_EVENTS = [
  'mouse:down', 'mouse:move', 'mouse:up',
  'mouse:wheel',
  'selection:created', 'selection:updated',
  'mouse:dblclick'
]

const ALWAYS_HISTORY_EVENTS = [
  'object:modified', 'object:rotating', 'object:added', 'object:removed'
]

const ALWAYS_REQUIRED_EVENTS = [
  ...ALWAYS_HISTORY_EVENTS,
  // overlay/locked-selection use selection:created всегда
  'selection:created'
]

const ALL_EXPECTED_CANVAS_EVENTS = [
  ...OPTIONAL_CANVAS_EVENTS,
  ...ALWAYS_HISTORY_EVENTS
]

const DISABLED_OPTIONAL_CANVAS_EVENTS = [
  'mouse:wheel', 'mouse:dblclick', 'mouse:down', 'mouse:move', 'mouse:up'
]

const getOnEvents = (editor: ReturnType<typeof createEditorStub>) => (editor.canvas.on as jest.Mock).mock.calls.map((c) => c[0])

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
      const onCalls = getOnEvents(editor)
      expect(onCalls).toEqual(expect.arrayContaining(ALL_EXPECTED_CANVAS_EVENTS))

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
      // eslint-disable-next-line no-new
      new Listeners({ editor, options: {} })
      const onCalls = getOnEvents(editor)
      expect(onCalls).toEqual(expect.arrayContaining(ALWAYS_REQUIRED_EVENTS))
    })

    it('не вешает DOM/canvas подписки при выключенных опциях', () => {
      const editor = createEditorStub()
      const addWin = jest.spyOn(window, 'addEventListener')
      const addDoc = jest.spyOn(document, 'addEventListener')

      const listeners = new Listeners({ editor, options: {} })

      // canvas.on не должен содержать события, зависящие от опций
      const onEvents = getOnEvents(editor)
      for (const ev of DISABLED_OPTIONAL_CANVAS_EVENTS) {
        expect(onEvents).not.toContain(ev)
      }

      // DOM addEventListener не должен быть вызван для опциональных обработчиков
      expect(addWin).not.toHaveBeenCalledWith('resize', listeners.handleContainerResizeBound, { capture: true })
      expect(addDoc).not.toHaveBeenCalledWith('keydown', listeners.handleCopyEventBound, { capture: true })
      expect(addDoc).not.toHaveBeenCalledWith('paste', listeners.handlePasteEventBound, { capture: true })
      expect(addDoc).not.toHaveBeenCalledWith('keydown', listeners.handleUndoRedoEventBound, { capture: true })
      expect(addDoc).not.toHaveBeenCalledWith('keyup', listeners.handleUndoRedoKeyUpBound, { capture: true })
      expect(addDoc).not.toHaveBeenCalledWith('keydown', listeners.handleSelectAllEventBound, { capture: true })
      expect(addDoc).not.toHaveBeenCalledWith('keydown', listeners.handleDeleteObjectsEventBound, { capture: true })
      expect(addDoc).not.toHaveBeenCalledWith('keydown', listeners.handleSpaceKeyDownBound, { capture: true })
      expect(addDoc).not.toHaveBeenCalledWith('keyup', listeners.handleSpaceKeyUpBound, { capture: true })
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
      const eCopy = keyDown({ ctrlKey: true, metaKey: false, code: 'KeyC' })
      Object.defineProperty(eCopy, 'preventDefault', { value: preventDefault })
      listeners.handleCopyEvent(eCopy)
      expect(preventDefault).toHaveBeenCalled()
      expect(editor.clipboardManager.copy).toHaveBeenCalled()

      const eSelAll = keyDown({ ctrlKey: true, metaKey: false, code: 'KeyA' })
      Object.defineProperty(eSelAll, 'preventDefault', { value: preventDefault })
      listeners.handleSelectAllEvent(eSelAll)
      expect(preventDefault).toHaveBeenCalled()
      expect(editor.selectionManager.selectAll).toHaveBeenCalled()

      const eDelete = keyDown({ code: 'Delete' })
      Object.defineProperty(eDelete, 'preventDefault', { value: preventDefault })
      listeners.handleDeleteObjectsEvent(eDelete)
      expect(preventDefault).toHaveBeenCalled()
      expect(editor.deletionManager.deleteSelectedObjects).toHaveBeenCalled()
    })

    it('undo/redo и сброс флага на keyup', async() => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { undoRedoByHotKeys: true } })
      const preventDefault = jest.fn()

      Object.defineProperty(window.navigator, 'userAgent', { value: 'Windows', configurable: true })
      const eUndo = keyDown({ ctrlKey: true, metaKey: false, code: 'KeyZ', repeat: false })
      Object.defineProperty(eUndo, 'preventDefault', { value: preventDefault })
      await listeners.handleUndoRedoEvent(eUndo)
      expect(preventDefault).toHaveBeenCalled()
      expect(listeners.isUndoRedoKeyPressed).toBe(true)
      expect(editor.historyManager.undo).toHaveBeenCalled()

      listeners.handleUndoRedoKeyUp(keyUp({ code: 'KeyZ' }))
      expect(listeners.isUndoRedoKeyPressed).toBe(false)

      const eRedo = keyDown({ ctrlKey: true, metaKey: false, code: 'KeyY', repeat: false })
      Object.defineProperty(eRedo, 'preventDefault', { value: preventDefault })
      await listeners.handleUndoRedoEvent(eRedo)
      expect(editor.historyManager.redo).toHaveBeenCalled()
    })
  })

  describe('space & drag', () => {
    it('Space включает режим drag, mouse down/move/up двигает вьюпорт', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { canvasDragging: true } })

      // keydown Space
      const preventDefault = jest.fn()
      const eSpace = keyDown({ code: 'Space' })
      Object.defineProperty(eSpace, 'preventDefault', { value: preventDefault })
      listeners.handleSpaceKeyDown(eSpace)
      expect(preventDefault).toHaveBeenCalled()
      expect(editor.canvas.set).toHaveBeenCalledWith(expect.objectContaining({ selection: false, defaultCursor: 'grab' }))
      expect(editor.canvas.setCursor).toHaveBeenCalledWith('grab')

      // start drag
      const md = mouse('mousedown', { clientX: 10, clientY: 20 })
      listeners.handleCanvasDragStart(ptr(md))
      expect((editor.canvas.setCursor as jest.Mock)).toHaveBeenCalledWith('grabbing')
      expect(editor.canvas.set).toHaveBeenCalledWith('defaultCursor', 'grabbing')

      // move drag
      const mm = mouse('mousemove', { clientX: 20, clientY: 30 })
      listeners.handleCanvasDragging(ptr(mm))
      expect(editor.canvas.requestRenderAll).toHaveBeenCalled()
      expect(editor.canvas.viewportTransform[4]).toBe(10)
      expect(editor.canvas.viewportTransform[5]).toBe(10)

      // end drag keeps grab cursor while Space pressed
      listeners.handleCanvasDragEnd()
      expect(editor.canvas.setViewportTransform).toHaveBeenCalled()
      expect(editor.canvas.set).toHaveBeenCalledWith(expect.objectContaining({ defaultCursor: 'grab' }))
      expect(editor.canvas.setCursor).toHaveBeenCalledWith('grab')

      // keyup Space restores selection and flags
      listeners.handleSpaceKeyUp(keyUp({ code: 'Space' }))
      expect(editor.canvas.set).toHaveBeenCalledWith(expect.objectContaining({ selection: true, defaultCursor: 'default' }))
      expect(editor.canvas.setCursor).toHaveBeenCalledWith('default')
      const objs = (editor.canvasManager.getObjects as jest.Mock).mock.results[0].value
      expect(objs[0].set).toHaveBeenCalled()
      expect(objs[1].set).toHaveBeenCalled()
    })
  })

  describe('misc handlers', () => {
    it('mouse wheel zoom вызывает transformManager.handleMouseWheelZoom', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { mouseWheelZooming: true } })
      const preventDefault = jest.fn()
      const stopPropagation = jest.fn()
      const evt = wheel({ ctrlKey: true, deltaY: -100 })
      Object.defineProperty(evt, 'preventDefault', { value: preventDefault })
      Object.defineProperty(evt, 'stopPropagation', { value: stopPropagation })

      // Рассчитываем ожидаемое значение через ту же функцию, что и в коде
      const expectedScale = calculateAdaptiveZoomStep(
        editor.montageArea.width,  // 400
        editor.montageArea.height, // 300
        -100                       // deltaY
      )

      listeners.handleMouseWheelZoom(ptr(evt))

      expect(editor.transformManager.handleMouseWheelZoom).toHaveBeenCalledWith(expectedScale, evt)
      expect(preventDefault).toHaveBeenCalled()
      expect(stopPropagation).toHaveBeenCalled()
    })

    it('mouse wheel не зумит без ctrl/meta', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { mouseWheelZooming: true } })
      const preventDefault = jest.fn()
      const stopPropagation = jest.fn()
      const evt = wheel({ ctrlKey: false, deltaY: -100 })
      Object.defineProperty(evt, 'preventDefault', { value: preventDefault })
      Object.defineProperty(evt, 'stopPropagation', { value: stopPropagation })
      listeners.handleMouseWheelZoom(ptr(evt))
      expect(editor.transformManager.zoom).not.toHaveBeenCalled()
      expect(preventDefault).not.toHaveBeenCalled()
      expect(stopPropagation).not.toHaveBeenCalled()
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
      listeners.handleResetObjectFit(fabricPtrWithTarget(target))
      expect(editor.transformManager.resetObject).toHaveBeenCalledWith({ object: target })
    })

    it('history save handlers учитывают skipHistory', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: {} })
      listeners.handleObjectModifiedHistory()
      listeners.handleObjectRotatingHistory()
      listeners.handleObjectAddedHistory()
      listeners.handleObjectRemovedHistory()
      expect(editor.historyManager.saveState).toHaveBeenCalledTimes(4);

      (editor.historyManager.saveState as jest.Mock).mockClear()
      editor.historyManager.skipHistory = true
      listeners.handleObjectModifiedHistory()
      expect(editor.historyManager.saveState).not.toHaveBeenCalled()
    })

    it('_shouldIgnoreKeyboardEvent учитывает inputs, contenteditable и селекторы', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { keyboardIgnoreSelectors: ['.ignore-me'] } })

      // Тест для input - должен работать через event.target
      const input = document.createElement('input')
      expect(listeners._shouldIgnoreKeyboardEvent(keyDown({}, input))).toBe(true)

      // Тест для contenteditable - должен работать через event.target
      const div = document.createElement('div')
      div.contentEditable = 'true'
      expect(listeners._shouldIgnoreKeyboardEvent(keyDown({}, div))).toBe(true)

      // Селекторы теперь работают через Selection API - создаём выделение текста
      const wrap = document.createElement('div')
      wrap.className = 'ignore-me'
      wrap.innerHTML = 'Test text content'
      const child = document.createElement('span')
      child.innerHTML = 'Child text'
      wrap.appendChild(child)
      document.body.appendChild(wrap)

      // Имитируем выделение текста в элементе
      const range = document.createRange()
      range.selectNodeContents(child)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)

      expect(listeners._shouldIgnoreKeyboardEvent(keyDown({}, wrap))).toBe(true)

      // Очищаем выделение и DOM
      selection?.removeAllRanges()
      document.body.removeChild(wrap)

      // Тест без выделенного текста - селекторы не должны срабатывать
      const listeners2 = new Listeners({ editor: createEditorStub(), options: { keyboardIgnoreSelectors: ['.ignore-me'] } })
      const span = document.createElement('span')
      expect(listeners2._shouldIgnoreKeyboardEvent(keyDown({}, span))).toBe(false)
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
      const offCalls = (editor.canvas.off as jest.Mock).mock.calls.map((c) => c[0])
      expect(offCalls).toEqual(expect.arrayContaining(ALL_EXPECTED_CANVAS_EVENTS))

      expect(remDoc).toHaveBeenCalled()
      expect(remWin).toHaveBeenCalled()
    })
  })
})
