import { ActiveSelection } from 'fabric'
import Listeners from '../../../src/editor/listeners'
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
    beforeEach(() => {
      Object.defineProperty(document, 'activeElement', {
        value: document.body,
        configurable: true
      })
    })

    it('Space включает режим drag, mouse down/move/up двигает вьюпорт', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { canvasDragging: true } })

      // keydown Space
      const preventDefault = jest.fn()
      const eSpace = keyDown({ code: 'Space' })
      Object.defineProperty(eSpace, 'preventDefault', { value: preventDefault })
      listeners.handleSpaceKeyDown(eSpace)
      expect(preventDefault).toHaveBeenCalled()
      expect(editor.historyManager.saveState).toHaveBeenCalledTimes(1)
      expect(editor.historyManager.suspendHistory).toHaveBeenCalledTimes(1)
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
      expect(editor.historyManager.resumeHistory).toHaveBeenCalledTimes(1)
      expect(editor.canvas.set).toHaveBeenCalledWith(expect.objectContaining({ selection: true, defaultCursor: 'default' }))
      expect(editor.canvas.setCursor).toHaveBeenCalledWith('default')
      const objs = (editor.canvasManager.getObjects as jest.Mock).mock.results[0].value
      expect(objs[0].set).toHaveBeenCalled()
      expect(objs[1].set).toHaveBeenCalled()
    })

    it('Space завершает режим drag даже если фокус в input', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { canvasDragging: true } })

      const preventDefault = jest.fn()
      const eSpaceDown = keyDown({ code: 'Space' })
      Object.defineProperty(eSpaceDown, 'preventDefault', { value: preventDefault })
      listeners.handleSpaceKeyDown(eSpaceDown)
      expect(listeners.isSpacePressed).toBe(true)

      const input = document.createElement('input')
      Object.defineProperty(document, 'activeElement', {
        value: input,
        configurable: true
      })
      const eSpaceUp = keyUp({ code: 'Space' }, input)
      listeners.handleSpaceKeyUp(eSpaceUp)

      expect(editor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(listeners.isSpacePressed).toBe(false)
    })

    it('Space не вызывает saveState когда история уже заблокирована', () => {
      const editor = createEditorStub()
      editor.historyManager.skipHistory = true
      const listeners = new Listeners({ editor, options: { canvasDragging: true } })

      const eSpace = keyDown({ code: 'Space' })
      Object.defineProperty(eSpace, 'preventDefault', { value: jest.fn() })
      listeners.handleSpaceKeyDown(eSpace)

      expect(editor.historyManager.saveState).not.toHaveBeenCalled()
      expect(editor.historyManager.suspendHistory).toHaveBeenCalled()
    })

    it('не включает режим drag, если в момент нажатия пробела идет трансформация объекта', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { canvasDragging: true } })
      const { canvas, canvasManager } = editor

      Object.defineProperty(document, 'activeElement', {
        value: document.body,
        configurable: true
      })

      const canvasWithTransform = canvas as any
      canvasWithTransform._currentTransform = {}

      const preventDefault = jest.fn()
      const eSpace = keyDown({ code: 'Space' })
      Object.defineProperty(eSpace, 'preventDefault', { value: preventDefault })

      listeners.handleSpaceKeyDown(eSpace)

      expect(preventDefault).toHaveBeenCalled()
      expect(listeners.isSpacePressed).toBe(false)
      expect(canvas.set).not.toHaveBeenCalled()
      expect(canvas.setCursor).not.toHaveBeenCalled()
      expect(canvasManager.getObjects).not.toHaveBeenCalled()
    })

    it('восстанавливает заблокированное выделение, если внутри есть заблокированные объекты', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { canvasDragging: true } })

      // Подготовка: создаем объекты, один из которых заблокирован
      const obj1 = { set: jest.fn(), locked: false } as any
      const obj2 = { set: jest.fn(), locked: true } as any
      const objects = [obj1, obj2];

      // Мокаем getObjects, чтобы _restoreSelection считал их валидными (существующими на канвасе)
      (editor.canvasManager.getObjects as jest.Mock).mockReturnValue(objects)

      // Мокаем текущее выделение перед нажатием пробела
      // Используем ActiveSelection из мока fabric, чтобы сработал instanceof в handleSpaceKeyDown
      const activeSelection = new ActiveSelection([], {})
      jest.spyOn(activeSelection, 'getObjects').mockReturnValue(objects);
      (editor.canvas.getActiveObject as jest.Mock).mockReturnValue(activeSelection)

      // 1. Нажимаем пробел (сохранение выделения и переход в режим drag)
      const eSpaceDown = keyDown({ code: 'Space' })
      Object.defineProperty(eSpaceDown, 'preventDefault', { value: jest.fn() })
      listeners.handleSpaceKeyDown(eSpaceDown)

      // Проверяем, что выделение было сброшено
      expect(editor.canvas.discardActiveObject).toHaveBeenCalled()

      // 2. Отпускаем пробел (выход из режима drag и восстановление выделения)
      const eSpaceUp = keyUp({ code: 'Space' })
      listeners.handleSpaceKeyUp(eSpaceUp)

      // Проверяем, что lockObject был вызван для восстановленного выделения,
      // так как один из объектов (obj2) был заблокирован
      expect(editor.objectLockManager.lockObject).toHaveBeenCalledWith(expect.objectContaining({
        skipInnerObjects: true,
        withoutSave: true
      }))

      // Проверяем, что setActiveObject был вызван (выделение восстановлено)
      expect(editor.canvas.setActiveObject).toHaveBeenCalled()
    })
  })

  describe('misc handlers', () => {
    it('mouse wheel zoom вызывает zoomManager.handleMouseWheelZoom', () => {
      const editor = createEditorStub()
      const listeners = new Listeners({ editor, options: { mouseWheelZooming: true } })
      const preventDefault = jest.fn()
      const stopPropagation = jest.fn()
      const evt = wheel({ ctrlKey: true, deltaY: -100 })
      Object.defineProperty(evt, 'preventDefault', { value: preventDefault })
      Object.defineProperty(evt, 'stopPropagation', { value: stopPropagation })

      // Рассчитываем ожидаемое значение через ту же функцию, что и в коде
      const expectedScale = listeners._calculateAdaptiveZoomStep(-100)

      listeners.handleMouseWheelZoom(ptr(evt))

      expect(editor.zoomManager.handleMouseWheelZoom).toHaveBeenCalledWith(expectedScale, evt)
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
      expect(editor.zoomManager.zoom).not.toHaveBeenCalled()
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
      expect(editor.historyManager.saveState).not.toHaveBeenCalled();

      // Проверяем что isTextEditingActive также блокирует сохранение
      (editor.historyManager.saveState as jest.Mock).mockClear()
      editor.historyManager.skipHistory = false
      editor.textManager.isTextEditingActive = true
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

  describe('игнорирование событий paste с select элементом', () => {
    let editor: ReturnType<typeof createEditorStub>
    let listeners: Listeners

    beforeEach(() => {
      editor = createEditorStub()
      listeners = new Listeners({ editor, options: {} })
    })

    const createPasteEvent = (eventTarget: HTMLElement, activeElement: HTMLElement = document.body) => {
      const event = {
        type: 'paste',
        target: eventTarget,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        clipboardData: {
          getData: jest.fn().mockReturnValue(''),
          items: []
        }
      } as any

      Object.defineProperty(document, 'activeElement', {
        value: activeElement,
        configurable: true
      })

      return event
    }

    describe('события paste с элементами ввода (input, textarea, select)', () => {
      const inputTypes = ['input', 'textarea', 'select'] as const

      describe('event.target !== activeElement - событие редактора НЕ игнорируется', () => {
        // Когда event.target и activeElement разные элементы,
        // это означает баг браузера: событие приходит на элемент ввода,
        // но фокус находится на body/canvas. В этом случае событие
        // должно обработаться редактором.

        inputTypes.forEach((elementType) => {
          it(`${elementType} как event.target, но activeElement = body → редактор обрабатывает`, () => {
            const element = document.createElement(elementType)
            const body = document.body

            const event = createPasteEvent(element, body)
            const shouldIgnore = listeners._shouldIgnoreKeyboardEvent(event)

            // События редактора НЕ игнорируются, так как элементы не совпадают
            expect(shouldIgnore).toBe(false)
          })

          it(`${elementType}: clipboardManager.handlePasteEvent вызывается`, () => {
            const element = document.createElement(elementType)
            const body = document.body

            const event = createPasteEvent(element, body)
            listeners.handlePasteEvent(event)

            expect(editor.clipboardManager.handlePasteEvent).toHaveBeenCalledWith(event)
          })
        })
      })

      describe('event.target === activeElement - событие редактора игнорируется', () => {
        // Когда event.target и activeElement это один и тот же элемент,
        // это означает что пользователь действительно работает с полем ввода.
        // В этом случае событие должно игнорироваться редактором,
        // чтобы не мешать нативному поведению браузера.

        inputTypes.forEach((elementType) => {
          it(`${elementType} как event.target И activeElement → редактор игнорирует`, () => {
            const element = document.createElement(elementType)

            const event = createPasteEvent(element, element)
            const shouldIgnore = listeners._shouldIgnoreKeyboardEvent(event)

            // События редактора игнорируются, так как пользователь работает с полем
            expect(shouldIgnore).toBe(true)
          })

          it(`${elementType}: clipboardManager.handlePasteEvent НЕ вызывается`, () => {
            const element = document.createElement(elementType)

            const event = createPasteEvent(element, element)
            listeners.handlePasteEvent(event)

            expect(editor.clipboardManager.handlePasteEvent).not.toHaveBeenCalled()
          })
        })
      })
    })

    describe('событие paste с event.target = body, activeElement = body', () => {
      it('событие НЕ должно игнорироваться', () => {
        const body = document.body

        const event = createPasteEvent(body, body)
        const shouldIgnore = listeners._shouldIgnoreKeyboardEvent(event)

        expect(shouldIgnore).toBe(false)
      })

      it('clipboardManager.handlePasteEvent должен вызваться', () => {
        const body = document.body

        const event = createPasteEvent(body, body)
        listeners.handlePasteEvent(event)

        expect(editor.clipboardManager.handlePasteEvent).toHaveBeenCalledWith(event)
      })
    })

    describe('событие copy/keydown с button в фокусе', () => {
      it('события НЕ должны игнорироваться', () => {
        const button = document.createElement('button')

        Object.defineProperty(document, 'activeElement', {
          value: button,
          configurable: true
        })

        const copyEvent = {
          type: 'keydown',
          key: 'c',
          code: 'KeyC',
          ctrlKey: true,
          metaKey: false,
          target: button,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn()
        } as any

        const shouldIgnore = listeners._shouldIgnoreKeyboardEvent(copyEvent)

        expect(shouldIgnore).toBe(false)
      })

      it('шорткаты редактора должны работать при фокусе на button', () => {
        const button = document.createElement('button')

        Object.defineProperty(document, 'activeElement', {
          value: button,
          configurable: true
        })

        const copyEvent = {
          type: 'keydown',
          key: 'c',
          code: 'KeyC',
          ctrlKey: true,
          metaKey: false,
          target: button,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn()
        } as any

        listeners.handleCopyEvent(copyEvent)

        expect(editor.clipboardManager.copy).toHaveBeenCalled()
      })
    })
  })
})
