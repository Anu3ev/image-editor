import { CanvasOptions, ActiveSelection, FabricObject, Canvas, TPointerEventInfo, TPointerEvent, Textbox } from 'fabric'

import { ImageEditor } from '.'

const HISTORY_SAVE_DEBOUNCE_MS = 300
const STANDARD_WHEEL_DELTA = 100
const WHEEL_LINE_DELTA = 16
const MOUSE_WHEEL_ZOOM_CHANGE_PERCENT = 0.05
const TRACKPAD_PINCH_ZOOM_CHANGE_PERCENT = 0.8
const TRACKPAD_PINCH_DELTA_THRESHOLD = 50
const WEBKIT_GESTURE_ZOOM_GAIN = 1

type CanvasWithTransform = Canvas & {
  _currentTransform?: Record<string, unknown> | null
}

interface CanvasGestureEvent extends Event {
  scale: number
  clientX?: number
  clientY?: number
}

class Listeners {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  editor: ImageEditor

  /**
   * Ссылка на Fabric Canvas.
   */
  canvas: Canvas

  /**
   * Параметры (опции) для слушателей.
   */
  options: Partial<CanvasOptions>

  /**
   * Флаг, что перетаскивание канваса активно.
   * @default false
   */
  private isDragging: boolean = false

  /**
   * Координаты последнего положения мыши по оси X при перетаскивании канваса.
   * Используется для расчёта смещения по горизонтали при перетаскивании.
   * @default 0
   */
  private lastMouseX: number = 0

  /**
   * Координаты последнего положения мыши по оси Y при перетаскивании канваса.
   * Используется для расчёта смещения по вертикали при перетаскивании.
   * @default 0
   */
  private lastMouseY: number = 0

  /**
   * Последний cumulative scale WebKit gesture-события.
   * Нужен только для перевода gesturechange в инкрементальный zoom-step.
   * @default 1
   */
  private lastGestureScale: number = 1

  /**
   * Флаг, что сочетание Ctrl+Z/Ctrl+Y удерживается.
   * Используется для предотвращения множественных вызовов при удерживании клавиш.
   * @default false
   */
  isUndoRedoKeyPressed: boolean = false

  /**
   * Флаг, что пробел удерживается.
   * Используется для активации режима перетаскивания канваса.
   * @default false
   */
  isSpacePressed: boolean = false

  /**
   * Сохраненное выделение перед началом режима перетаскивания канваса.
   * Используется для восстановления выделения после отпускания пробела.
   * @default []
   */
  private savedSelection: FabricObject[] = []

  /**
   * Привязанные обработчики событий.
   * Используются для удаления слушателей при уничтожении экземпляра.
   */
  handleContainerResizeBound: (e: Event) => void

  handleCopyEventBound: (e: KeyboardEvent) => void

  handleCutEventBound: (e: KeyboardEvent) => void

  handleDuplicateEventBound: (e: KeyboardEvent) => void

  handlePasteEventBound: (e: ClipboardEvent) => void

  handleUndoRedoEventBound: (e: KeyboardEvent) => void

  handleUndoRedoKeyUpBound: (e: KeyboardEvent) => void

  handleSelectAllEventBound: (e: KeyboardEvent) => void

  handleDeleteObjectsEventBound: (e: KeyboardEvent) => void

  handleSpaceKeyDownBound: (e: KeyboardEvent) => void

  handleSpaceKeyUpBound: (e: KeyboardEvent) => void

  handleObjectModifiedHistoryBound: ({ target }: { target?: FabricObject }) => void

  handleObjectRotatingHistoryBound: () => void

  handleObjectTransformStartBound: ({ target }: { target?: FabricObject }) => void

  handleObjectTransformEndBound: () => void

  handleObjectAddedHistoryBound: () => void

  handleObjectRemovedHistoryBound: () => void

  handleOverlayUpdateBound: () => void

  handleBackgroundUpdateBound: () => void

  handleCanvasDragStartBound: (options: TPointerEventInfo<TPointerEvent>) => void

  handleCanvasDraggingBound: (options: TPointerEventInfo<TPointerEvent>) => void

  handleCanvasDragEndBound: () => void

  handleCanvasWheelZoomBound: (event: WheelEvent) => void

  handleCanvasGestureStartBound: (event: Event) => void

  handleCanvasGestureChangeBound: (event: Event) => void

  handleCanvasGestureEndBound: (event: Event) => void

  handleResetObjectFitBound: (options: TPointerEventInfo<TPointerEvent>) => void

  /**
   * Опции редактора, которые могут быть изменены пользователем.
   */
  canvasDragging: boolean = false

  mouseWheelZooming: boolean = false

  resetObjectFitByDoubleClick: boolean = false

  copyObjectsByHotkey: boolean = false

  cutObjectsByHotkey: boolean = false

  duplicateObjectsByHotkey: boolean = false

  pasteImageFromClipboard: boolean = false

  undoRedoByHotKeys: boolean = false

  selectAllByHotkey: boolean = false

  deleteObjectsByHotkey: boolean = false

  adaptCanvasToContainerOnResize: boolean = false

  /**
   * Конструктор принимает редактор и опции.
   * @param params
   * @param params.editor – редактор, содержащий canvas
   * @param params.options — настройки редактора (см. defaults.js)
   * @param params.options.canvasDragging — включить перетаскивание канваса
   * @param params.options.mouseWheelZooming — включить зум колесом мыши
   * @param params.options.copyObjectsByHotkey — копировать объекты по Ctrl+C
   * @param params.options.cutObjectsByHotkey — вырезать объекты по Ctrl+X
   * @param params.options.duplicateObjectsByHotkey — дублировать объекты по Ctrl+D
   * @param params.options.pasteImageFromClipboard — вставлять изображения и объекты из буфера обмена
   * @param params.options.undoRedoByHotKeys — отмена/повтор по Ctrl+Z/Ctrl+Y
   * @param params.options.selectAllByHotkey — выделение всех объектов по Ctrl+A
   * @param params.options.deleteObjectsByHotkey — удаление объектов по Delete
   * @param params.options.resetObjectFitByDoubleClick — сброс фита объекта по двойному клику
   * @param params.options.adaptCanvasToContainerOnResize — адаптировать канвас к размерам контейнера при изменении размеров окна
   */
  constructor({ editor, options = {} }: { editor: ImageEditor; options?: Partial<CanvasOptions> }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.options = options

    // Создаем и сохраняем привязанные обработчики, чтобы потом можно было их снять.
    // Глобальные (DOM) события:
    this.handleContainerResizeBound = Listeners.debounce(this.handleContainerResize.bind(this), 500)
    this.handleCopyEventBound = this.handleCopyEvent.bind(this)
    this.handleCutEventBound = this.handleCutEvent.bind(this)
    this.handleDuplicateEventBound = this.handleDuplicateEvent.bind(this)
    this.handlePasteEventBound = this.handlePasteEvent.bind(this)
    this.handleUndoRedoEventBound = this.handleUndoRedoEvent.bind(this)
    this.handleUndoRedoKeyUpBound = this.handleUndoRedoKeyUp.bind(this)
    this.handleSelectAllEventBound = this.handleSelectAllEvent.bind(this)
    this.handleDeleteObjectsEventBound = this.handleDeleteObjectsEvent.bind(this)
    this.handleSpaceKeyDownBound = this.handleSpaceKeyDown.bind(this)
    this.handleSpaceKeyUpBound = this.handleSpaceKeyUp.bind(this)

    // Canvas (Fabric) события:
    this.handleObjectModifiedHistoryBound = this.handleObjectModifiedHistory.bind(this)
    this.handleObjectRotatingHistoryBound = this.handleObjectRotatingHistory.bind(this)
    this.handleObjectTransformStartBound = this.handleObjectTransformStart.bind(this)
    this.handleObjectTransformEndBound = this.handleObjectTransformEnd.bind(this)
    this.handleObjectAddedHistoryBound = this.handleObjectAddedHistory.bind(this)
    this.handleObjectRemovedHistoryBound = this.handleObjectRemovedHistory.bind(this)
    this.handleOverlayUpdateBound = this.handleOverlayUpdate.bind(this)
    this.handleBackgroundUpdateBound = this.handleBackgroundUpdate.bind(this)
    this.handleCanvasDragStartBound = this.handleCanvasDragStart.bind(this)
    this.handleCanvasDraggingBound = this.handleCanvasDragging.bind(this)
    this.handleCanvasDragEndBound = this.handleCanvasDragEnd.bind(this)
    this.handleCanvasWheelZoomBound = this.handleCanvasWheelZoom.bind(this)
    this.handleCanvasGestureStartBound = this.handleCanvasGestureStart.bind(this)
    this.handleCanvasGestureChangeBound = this.handleCanvasGestureChange.bind(this)
    this.handleCanvasGestureEndBound = this.handleCanvasGestureEnd.bind(this)
    this.handleResetObjectFitBound = this.handleResetObjectFit.bind(this)

    this.init()
  }

  /**
   * Инициализация всех обработчиков согласно опциям.
   */
  init(): void {
    this._bindCanvasInteractionEvents()
    this._bindDomEvents()
    this._bindHistoryEvents()
    this._bindOverlayEvents()
    this._bindBackgroundEvents()
  }

  private _bindCanvasInteractionEvents(): void {
    if (this.options.canvasDragging) {
      this.canvas.on('mouse:down', this.handleCanvasDragStartBound)
      this.canvas.on('mouse:move', this.handleCanvasDraggingBound)
      this.canvas.on('mouse:up', this.handleCanvasDragEndBound)

      document.addEventListener('keydown', this.handleSpaceKeyDownBound, { capture: true })
      document.addEventListener('keyup', this.handleSpaceKeyUpBound, { capture: true })
    }

    if (this.options.mouseWheelZooming) {
      this.canvas.wrapperEl.addEventListener('wheel', this.handleCanvasWheelZoomBound, {
        capture: true,
        passive: false
      })
      this.canvas.wrapperEl.addEventListener('gesturestart', this.handleCanvasGestureStartBound, {
        capture: true,
        passive: false
      })
      this.canvas.wrapperEl.addEventListener('gesturechange', this.handleCanvasGestureChangeBound, {
        capture: true,
        passive: false
      })
      this.canvas.wrapperEl.addEventListener('gestureend', this.handleCanvasGestureEndBound, {
        capture: true,
        passive: false
      })
    }

    if (this.options.resetObjectFitByDoubleClick) {
      this.canvas.on('mouse:dblclick', this.handleResetObjectFitBound)
    }
  }

  private _bindDomEvents(): void {
    // Подключаем глобальные DOM-события:
    if (this.options.adaptCanvasToContainerOnResize) {
      window.addEventListener('resize', this.handleContainerResizeBound, { capture: true })
    }

    if (this.options.copyObjectsByHotkey) {
      document.addEventListener('keydown', this.handleCopyEventBound, { capture: true })
    }

    if (this.options.cutObjectsByHotkey) {
      document.addEventListener('keydown', this.handleCutEventBound, { capture: true })
    }

    if (this.options.duplicateObjectsByHotkey) {
      document.addEventListener('keydown', this.handleDuplicateEventBound, { capture: true })
    }

    if (this.options.pasteImageFromClipboard) {
      document.addEventListener('paste', this.handlePasteEventBound, { capture: true })
    }

    if (this.options.undoRedoByHotKeys) {
      document.addEventListener('keydown', this.handleUndoRedoEventBound, { capture: true })

      document.addEventListener('keyup', this.handleUndoRedoKeyUpBound, { capture: true })
    }

    if (this.options.selectAllByHotkey) {
      document.addEventListener('keydown', this.handleSelectAllEventBound, { capture: true })
    }

    if (this.options.deleteObjectsByHotkey) {
      document.addEventListener('keydown', this.handleDeleteObjectsEventBound, { capture: true })
    }
  }

  private _bindHistoryEvents(): void {
    // Инициализация истории редактора
    this.canvas.on('object:modified', this.handleObjectModifiedHistoryBound)
    this.canvas.on('object:rotating', this.handleObjectRotatingHistoryBound)
    this.canvas.on('object:added', this.handleObjectAddedHistoryBound)
    this.canvas.on('object:removed', this.handleObjectRemovedHistoryBound)
    this.canvas.on('object:moving', this.handleObjectTransformStartBound)
    this.canvas.on('object:scaling', this.handleObjectTransformStartBound)
    this.canvas.on('object:rotating', this.handleObjectTransformStartBound)
    this.canvas.on('object:skewing', this.handleObjectTransformStartBound)
    this.canvas.on('object:resizing', this.handleObjectTransformStartBound)
    this.canvas.on('object:modified', this.handleObjectTransformEndBound)
  }

  private _bindOverlayEvents(): void {
    // Инициализация событий для overlayMask
    this.canvas.on('object:added', this.handleOverlayUpdateBound)
    this.canvas.on('selection:created', this.handleOverlayUpdateBound)
  }

  private _bindBackgroundEvents(): void {
    // Инициализация событий для background
    this.canvas.on('object:added', this.handleBackgroundUpdateBound)
    this.canvas.on('selection:created', this.handleBackgroundUpdateBound)
  }

  /**
   * Обработчики для сохранения состояния редактора в истории.
   * Срабатывают при изменении объектов (перемещение, изменение размера и т.д.).
   */
  handleObjectModifiedHistory({ target }: { target?: FabricObject } = {}): void {
    const { historyManager, textManager } = this.editor
    const targetWithNoopTransform = target as (FabricObject & {
      shapeScalingNoopTransform?: boolean
    }) | undefined
    if (targetWithNoopTransform?.shapeScalingNoopTransform) {
      targetWithNoopTransform.shapeScalingNoopTransform = false
      return
    }
    if (historyManager.skipHistory) return
    if (textManager.isTextEditingActive) return

    historyManager.scheduleSaveState({
      delayMs: HISTORY_SAVE_DEBOUNCE_MS,
      reason: 'object-modified'
    })
  }

  handleObjectRotatingHistory(): void {
    const { historyManager, textManager } = this.editor
    if (historyManager.skipHistory) return
    if (textManager.isTextEditingActive) return

    historyManager.scheduleSaveState({
      delayMs: HISTORY_SAVE_DEBOUNCE_MS,
      reason: 'object-rotating'
    })
  }

  /**
   * Фиксирует старт трансформации объекта для корректного undo.
   * @param options - параметры события
   * @param options.target - объект, который трансформируется
   */
  handleObjectTransformStart({ target }: { target?: FabricObject }): void {
    if (!target) return

    this.editor.historyManager.beginAction({ reason: 'object-transform' })
  }

  /**
   * Завершает трансформацию объекта.
   */
  handleObjectTransformEnd(): void {
    this.editor.historyManager.endAction({ reason: 'object-transform' })
  }

  handleObjectAddedHistory(): void {
    if (this.editor.historyManager.skipHistory) return
    if (this.editor.textManager.isTextEditingActive) return
    this.editor.historyManager.saveState()
  }

  handleObjectRemovedHistory(): void {
    if (this.editor.historyManager.skipHistory) return
    if (this.editor.textManager.isTextEditingActive) return
    this.editor.historyManager.saveState()
  }

  /**
   * Обновление overlayMask при добавлении объектов или выделении.
   */
  handleOverlayUpdate(): void {
    const { interactionBlocker } = this.editor

    if (!interactionBlocker.isBlocked || !interactionBlocker.overlayMask) return

    this.editor.interactionBlocker.refresh()
  }

  handleBackgroundUpdate(): void {
    if (this.editor.historyManager.skipHistory) return
    this.editor.backgroundManager.refresh()
  }

  // --- Глобальные DOM-обработчики ---

  /**
   * Обработчик изменения размеров окна браузера.
   * Адаптирует canvas camera-state к размерам контейнера.
   * Derived-слои, завязанные на montageArea и viewport, синхронизируются внутри CanvasManager.
   */
  handleContainerResize(): void {
    this.editor.canvasManager.updateCanvas()
  }

  /**
   * Обработчик для Ctrl+C (копирование).
   * @param event — объект события
   * @param event.ctrlKey — зажата ли клавиша Ctrl
   * @param event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param event.code — код клавиши
   */
  handleCopyEvent(event: KeyboardEvent): void {
    const { ctrlKey, metaKey, code } = event

    if (this._shouldIgnoreKeyboardEvent(event)) return
    if ((!ctrlKey && !metaKey) || code !== 'KeyC') return

    event.preventDefault()
    this.editor.clipboardManager.copy()
  }

  /**
   * Обработчик для Ctrl+X (вырезание).
   * @param event — объект события
   * @param event.ctrlKey — зажата ли клавиша Ctrl
   * @param event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param event.code — код клавиши
   */
  handleCutEvent(event: KeyboardEvent): void {
    const { ctrlKey, metaKey, code } = event

    if (this._shouldIgnoreKeyboardEvent(event)) return
    if ((!ctrlKey && !metaKey) || code !== 'KeyX') return

    event.preventDefault()
    this.editor.clipboardManager.cut()
  }

  /**
   * Обработчик для Ctrl+D (дублирование).
   * @param event — объект события
   * @param event.ctrlKey — зажата ли клавиша Ctrl
   * @param event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param event.code — код клавиши
   */
  handleDuplicateEvent(event: KeyboardEvent): void {
    const { ctrlKey, metaKey, code } = event

    if (this._shouldIgnoreKeyboardEvent(event)) return
    if ((!ctrlKey && !metaKey) || code !== 'KeyD') return

    event.preventDefault()
    this.editor.clipboardManager.copyPaste()
  }

  /**
   * Обработчик вставки объекта или изображения из буфера обмена.
   * @param event — объект события
   */
  handlePasteEvent(event: ClipboardEvent): void {
    if (this._shouldIgnoreKeyboardEvent(event)) return

    this.editor.clipboardManager.handlePasteEvent(event)
  }

  /**
   * Обработчик для отмены/повтора (Ctrl+Z/Ctrl+Y).
   * @param event — объект события
   * @param event.ctrlKey — зажата ли клавиша Ctrl
   * @param event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param event.code — код клавиши
   * При активном interactionBlocker hotkeys не обрабатываются,
   * потому что блокировка редактора должна выключать пользовательскую интерактивность.
   */
  async handleUndoRedoEvent(event:KeyboardEvent): Promise<void> {
    const { ctrlKey, metaKey, code, repeat } = event

    if (this._shouldIgnoreKeyboardEvent(event)) return
    if ((!ctrlKey && !metaKey) || repeat) return
    if (code !== 'KeyZ' && code !== 'KeyY') return

    if (this.editor.interactionBlocker.isBlocked) {
      event.preventDefault()
      this.isUndoRedoKeyPressed = false
      return
    }

    // Если это Mac, то не смотрим на флаг isUndoRedoKeyPressed, потому что macos не даёт эмитить keyup события при удерживании Meta.
    const isMac = /Mac/i.test(navigator.userAgent)
    if (!isMac && this.isUndoRedoKeyPressed) return

    if (code === 'KeyZ') {
      event.preventDefault()
      this.isUndoRedoKeyPressed = true
      await this.editor.historyManager.undo()
    } else if (code === 'KeyY') {
      event.preventDefault()
      this.isUndoRedoKeyPressed = true
      await this.editor.historyManager.redo()
    }
  }

  /**
   * Обработчик для отпускания клавиш Ctrl+Z/Ctrl+Y.
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleUndoRedoKeyUp(event: KeyboardEvent): void {
    if (this._shouldIgnoreKeyboardEvent(event)) return
    if (!['KeyZ', 'KeyY'].includes(event.code)) return

    this.isUndoRedoKeyPressed = false
  }

  /**
   * Обработчик для выделения всех объектов (Ctrl+A).
   * @param event — объект события
   * @param event.ctrlKey — зажата ли клавиша Ctrl
   * @param event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param event.code — код клавиши
   */
  handleSelectAllEvent(event:KeyboardEvent): void {
    if (this._shouldIgnoreKeyboardEvent(event)) return

    const { ctrlKey, metaKey, code } = event
    if ((!ctrlKey && !metaKey) || code !== 'KeyA') return
    event.preventDefault()
    this.editor.selectionManager.selectAll()
  }

  /**
   * Обработчик для удаления объектов (Delete или Backspace).
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleDeleteObjectsEvent(event:KeyboardEvent): void {
    if (this._shouldIgnoreKeyboardEvent(event)) return
    if (event.code !== 'Delete' && event.code !== 'Backspace') return
    event.preventDefault()
    this.editor.deletionManager.deleteSelectedObjects()
  }

  /**
   * Обработчик для нажатия пробела.
   * Отключает взаимодействие с объектами и делает курсор "grab" для перетаскивания канваса.
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleSpaceKeyDown(event:KeyboardEvent): void {
    const { code } = event
    if (code !== 'Space') return

    if (this._shouldIgnoreKeyboardEvent(event)) return

    if (this._isObjectTransforming()) {
      event.preventDefault()
      return
    }

    const { canvas, editor, isSpacePressed, isDragging } = this

    if (isSpacePressed || isDragging) return

    // Фиксируем все изменения до входа в режим панорамирования,
    // чтобы временные selectable/evented не попадали в историю.
    if (!editor.historyManager.skipHistory) {
      editor.historyManager.saveState()
    }

    editor.historyManager.suspendHistory()

    this.isSpacePressed = true
    event.preventDefault()

    // Сохраняем текущее выделение
    const activeObject = canvas.getActiveObject() || null

    if (activeObject instanceof ActiveSelection) {
      this.savedSelection = activeObject.getObjects().slice()
    } else if (activeObject) {
      this.savedSelection = [activeObject]
    }

    // Сбрасываем выделение сразу при нажатии пробела
    canvas.discardActiveObject()

    // Устанавливаем курсор grab для всего канваса
    canvas.set({
      selection: false,
      defaultCursor: 'grab'
    })
    canvas.setCursor('grab')

    // Отключаем интерактивность объектов
    editor.canvasManager.getObjects().forEach((obj) => {
      obj.set({
        selectable: false,
        evented: false
      })
    })

    canvas.requestRenderAll()
  }

  /**
   * Обработчик для отпускания пробела.
   * Завершает перетаскивание канваса, если оно активно.
   * Восстанавливает нормальное взаимодействие с объектами.
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleSpaceKeyUp(event:KeyboardEvent): void {
    const { code } = event
    if (code !== 'Space') return
    if (this._shouldIgnoreKeyboardEvent(event) && !this.isSpacePressed) return

    if (!this.isSpacePressed) return

    this.isSpacePressed = false

    // Завершаем перетаскивание при отпускании пробела
    if (this.isDragging) {
      this.handleCanvasDragEnd()
    }

    // Восстанавливаем нормальное поведение канваса
    this.canvas.set({
      defaultCursor: 'default',
      selection: true
    })
    this.canvas.setCursor('default')

    // Восстанавливаем интерактивность объектов и их курсоры
    this.editor.canvasManager.getObjects().forEach((obj) => {
      obj.set({
        selectable: true,
        evented: true
      })
    })

    // Восстанавливаем сохраненное выделение
    this._restoreSelection(this.savedSelection)
    this.savedSelection = []

    this.editor.historyManager.resumeHistory()

    this.canvas.requestRenderAll()
  }

  /**
   * Восстанавливает выделение с проверкой корректности объектов
   * @param selection - объекты для восстановления выделения
   */
  private _restoreSelection(selection: FabricObject[]): void {
    const { canvas, editor } = this

    // Если нет валидных объектов, ничего не восстанавливаем
    if (selection.length === 0) return

    // Если остался только один объект, выделяем его напрямую
    if (selection.length === 1) {
      canvas.setActiveObject(selection[0])
      return
    }

    // Фильтруем только те объекты, которые все еще существуют на канвасе
    const validObjects = selection.filter((obj) => editor.canvasManager.getObjects().includes(obj))

    // Создаем новый ActiveSelection с валидными объектами
    const newSelection = new ActiveSelection(validObjects, { canvas })

    // Если хотя бы один объект заблокирован, блокируем и само выделение
    if (validObjects.some((obj) => obj.locked)) {
      editor.objectLockManager.lockObject({
        object: newSelection,
        skipInnerObjects: true,
        withoutSave: true
      })
    }

    canvas.setActiveObject(newSelection)
  }

  /**
   * Проверяет, идет ли трансформация объекта на канвасе прямо сейчас.
   */
  private _isObjectTransforming(): boolean {
    const { canvas } = this
    const { _currentTransform } = canvas as CanvasWithTransform

    return Boolean(_currentTransform)
  }

  // --- Обработчики для событий canvas (Fabric) ---

  /**
   * Начало перетаскивания канваса (срабатывает при mouse:down и зажатом пробеле).
   * @param options - событие указателя
   * @param options.e — объект события (MouseEvent или TouchEvent)
   */
  handleCanvasDragStart({ e: event }:TPointerEventInfo<TPointerEvent>): void {
    if (!this.isSpacePressed || !(event instanceof MouseEvent)) return

    this.isDragging = true
    this.lastMouseX = event.clientX
    this.lastMouseY = event.clientY

    this.canvas.set('defaultCursor', 'grabbing')
    this.canvas.setCursor('grabbing')
  }

  /**
   * Перетаскивание канваса (mouse:move).
   * Проверяет, разрешено ли перетаскивание при текущем зуме и применяет ограничения на панорамирование с помощью panConstraintManager.
   * @param options
   * @param options.e — объект события
   */
  handleCanvasDragging({ e: event }:TPointerEventInfo<TPointerEvent>): void {
    if (!this.isDragging || !this.isSpacePressed || !(event instanceof MouseEvent)) return

    const { panConstraintManager, montageArea } = this.editor

    // Проверяем, разрешено ли перетаскивание при текущем зуме
    if (!panConstraintManager.isPanAllowed()) {
      return
    }

    const vpt = this.canvas.viewportTransform
    const newVptX = vpt[4] + (event.clientX - this.lastMouseX)
    const newVptY = vpt[5] + (event.clientY - this.lastMouseY)

    // Применяем ограничения к координатам
    const constrained = panConstraintManager.constrainPan(newVptX, newVptY)

    vpt[4] = constrained.x
    vpt[5] = constrained.y

    // Принудительно пересчитываем координаты монтажной области перед рендерингом
    montageArea.setCoords()

    this.canvas.requestRenderAll()

    this.lastMouseX = event.clientX
    this.lastMouseY = event.clientY
  }

  /**
   * Завершение перетаскивания канваса (mouse:up).
   * Сохраняет новое положение канваса.
   */
  handleCanvasDragEnd(): void {
    if (!this.isDragging) return

    this.canvas.setViewportTransform(this.canvas.viewportTransform)
    this.isDragging = false

    if (this.isSpacePressed) {
      this.canvas.set('defaultCursor', 'grab')
      this.canvas.setCursor('grab')
    }
  }

  /**
   * Рассчитывает шаг зума на основе текущего масштаба канваса и типа wheel-события.
   * Обычное колесо остаётся спокойным, а мелкое pixel-wheel событие тачпада получает отдельный gain.
   * @param event - Событие wheel
   * @returns Шаг изменения зума
   */
  private _calculateAdaptiveZoomStep(event: WheelEvent): number {
    const currentZoom = this.canvas.getZoom()
    const normalizedDeltaY = this._normalizeWheelDeltaY(event)
    const zoomChangePercent = this._isTrackpadPinchWheel(event)
      ? TRACKPAD_PINCH_ZOOM_CHANGE_PERCENT
      : MOUSE_WHEEL_ZOOM_CHANGE_PERCENT
    const scrollSteps = normalizedDeltaY / STANDARD_WHEEL_DELTA
    const zoomDelta = currentZoom * zoomChangePercent * scrollSteps

    return -zoomDelta
  }

  /**
   * Приводит deltaY к одной шкале, чтобы pixel/line/page wheel считались одинаково.
   * @param event - Событие wheel
   * @returns Нормализованное deltaY
   */
  private _normalizeWheelDeltaY(event: WheelEvent): number {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return event.deltaY * WHEEL_LINE_DELTA
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return event.deltaY * this.canvas.getHeight()
    }

    return event.deltaY
  }

  /**
   * Отличает pinch-жест тачпада от обычного колеса по мелкому pixel-delta.
   * @param event - Событие wheel
   * @returns true, если событие похоже на pinch тачпада
   */
  private _isTrackpadPinchWheel(event: WheelEvent): boolean {
    const normalizedDeltaY = Math.abs(this._normalizeWheelDeltaY(event))

    return event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && normalizedDeltaY < TRACKPAD_PINCH_DELTA_THRESHOLD
  }

  /**
   * Переводит cumulative scale из gesturechange в инкрементальный шаг зума.
   * @param scale - Текущее cumulative scale из WebKit gesture
   * @returns Шаг изменения зума
   */
  private _calculateGestureZoomStep(scale: number): number {
    const currentZoom = this.canvas.getZoom()
    const relativeScale = scale / this.lastGestureScale

    if (!Number.isFinite(relativeScale) || relativeScale <= 0) return 0

    return currentZoom * (relativeScale - 1) * WEBKIT_GESTURE_ZOOM_GAIN
  }

  /**
   * Проверяет, что DOM-событие действительно несёт WebKit gesture scale.
   * @param event - DOM-событие
   * @returns true, если событие можно трактовать как CanvasGestureEvent
   */
  private _isCanvasGestureEvent(event: Event): event is CanvasGestureEvent {
    return 'scale' in event && typeof event.scale === 'number'
  }

  /**
   * Возвращает DOM-координаты gesture-события.
   * Если браузер не прислал clientX/clientY, используется центр wrapper-элемента canvas.
   * @param event - WebKit gesture-событие
   * @returns DOM-координаты для pointer-zoom
   */
  private _getGesturePointer(event: CanvasGestureEvent): { clientX: number; clientY: number } {
    const {
      clientX,
      clientY
    } = event

    if (typeof clientX === 'number' && typeof clientY === 'number') {
      return {
        clientX,
        clientY
      }
    }

    const rect = this.canvas.wrapperEl.getBoundingClientRect()

    return {
      clientX: rect.left + (rect.width / 2),
      clientY: rect.top + (rect.height / 2)
    }
  }

  /**
   * Обработчик `Ctrl/Cmd + wheel` на DOM-границе канваса.
   * Здесь событие отменяется до всплытия в браузер, чтобы page zoom
   * не перехватывал управление у редактора.
   */
  handleCanvasWheelZoom(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) return

    event.preventDefault()
    event.stopPropagation()

    const scaleAdjustment = this._calculateAdaptiveZoomStep(event)

    this.editor.zoomManager.handlePointerZoom(scaleAdjustment, event)
  }

  /**
   * Начало WebKit gesture-события.
   * Это резервный путь для Safari/macOS, где pinch может приходить не через wheel.
   * @param event - DOM-событие gesturestart
   */
  handleCanvasGestureStart(event: Event): void {
    if (!this._isCanvasGestureEvent(event)) return

    event.preventDefault()
    event.stopPropagation()

    this.lastGestureScale = event.scale > 0 ? event.scale : 1
  }

  /**
   * Обработчик WebKit gesturechange.
   * GestureEvent.scale является cumulative, поэтому здесь он переводится в инкрементальный zoom-step.
   * @param event - DOM-событие gesturechange
   */
  handleCanvasGestureChange(event: Event): void {
    if (!this._isCanvasGestureEvent(event)) return

    event.preventDefault()
    event.stopPropagation()

    const scaleAdjustment = this._calculateGestureZoomStep(event.scale)
    this.lastGestureScale = event.scale

    if (!scaleAdjustment) return

    const pointer = this._getGesturePointer(event)

    this.editor.zoomManager.handlePointerZoom(scaleAdjustment, pointer)
  }

  /**
   * Завершение WebKit gesture-события.
   */
  handleCanvasGestureEnd(event: Event): void {
    if (this._isCanvasGestureEvent(event)) {
      event.preventDefault()
      event.stopPropagation()
    }

    this.lastGestureScale = 1
  }

  /**
   * Обработчик сброса объекта по двойному клику.
   * @param options - объект события fabric
   */
  handleResetObjectFit(options: TPointerEventInfo<TPointerEvent>): void {
    const { target, e } = options
    const isCtrlPressed = Boolean(e && (e.ctrlKey || e.metaKey))

    if (isCtrlPressed) return
    if (!target || target instanceof Textbox || Boolean(target.shapeComposite)) return
    this.editor.transformManager.resetObject({ object: target })
  }

  /**
   * Проверяет, должно ли событие клавиатуры быть проигнорировано
   * Возвращает true если фокус находится в поле ввода или элементе из списка игнорируемых селекторов
   * @param event - Событие клавиатуры
   * @returns true если событие должно быть проигнорировано
   */
  _shouldIgnoreKeyboardEvent(event: KeyboardEvent | ClipboardEvent): boolean {
    // Используем document.activeElement как основной способ определения текущего элемента
    // так как event.target может указывать на корневой элемент диалога
    const activeElement = document.activeElement as HTMLElement
    const eventTarget = event.target as HTMLElement

    // Проверяем базовые элементы ввода для обоих элементов
    const inputTypes = ['input', 'textarea', 'select']

    // Проверяем eventTarget
    if (eventTarget) {
      const eventTagName = eventTarget.tagName.toLowerCase()

      // Для события paste: если eventTarget - это input/select/textarea,
      // дополнительно проверяем activeElement
      if (event.type === 'paste' && inputTypes.includes(eventTagName)) {
        // Если activeElement - это тоже input/select/textarea, то игнорируем
        // Если activeElement - это body/canvas, то НЕ игнорируем
        const activeTagName = activeElement?.tagName.toLowerCase()
        if (activeTagName && inputTypes.includes(activeTagName)) return true
        return false
      }

      // Для других событий (не paste) проверяем как обычно
      if (inputTypes.includes(eventTagName)) {
        return true
      }
      if (eventTarget.contentEditable === 'true') {
        return true
      }
    }

    // Проверяем activeElement если он отличается от eventTarget
    if (activeElement && activeElement !== eventTarget) {
      const activeTagName = activeElement.tagName.toLowerCase()
      if (inputTypes.includes(activeTagName)) return true
      if (activeElement.contentEditable === 'true') return true
    }

    // Проверяем выделение текста - если есть выделенный текст, проверяем его контекст
    const selection = window.getSelection()

    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const commonAncestor = range.commonAncestorContainer

      // Получаем элемент-контейнер выделенного текста
      let selectionContainer: Node | null = commonAncestor
      if (selectionContainer.nodeType === Node.TEXT_NODE) {
        selectionContainer = selectionContainer.parentElement
      }

      // Проверяем, находится ли выделенный текст в игнорируемых селекторах
      const { keyboardIgnoreSelectors } = this.options
      if (keyboardIgnoreSelectors?.length && selectionContainer) {
        for (const selector of keyboardIgnoreSelectors) {
          try {
            const element = selectionContainer as HTMLElement
            if (element.matches && element.matches(selector)) {
              return true
            }

            if (element.closest && element.closest(selector)) {
              return true
            }
          } catch (error) {
            console.warn(`Error checking selection container with selector "${selector}":`, error)
          }
        }
      }
    }

    return false
  }

  /**
   * Метод для удаления всех слушателей
   */
  destroy(): void {
    // Глобальные DOM-обработчики
    window.removeEventListener('resize', this.handleContainerResizeBound, { capture: true })
    document.removeEventListener('keydown', this.handleCopyEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleCutEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleDuplicateEventBound, { capture: true })
    document.removeEventListener('paste', this.handlePasteEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleUndoRedoEventBound, { capture: true })
    document.removeEventListener('keyup', this.handleUndoRedoKeyUpBound, { capture: true })
    document.removeEventListener('keydown', this.handleSelectAllEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleDeleteObjectsEventBound, { capture: true })

    // Обработчики canvas (Fabric):
    if (this.options.canvasDragging) {
      this.canvas.off('mouse:down', this.handleCanvasDragStartBound)
      this.canvas.off('mouse:move', this.handleCanvasDraggingBound)
      this.canvas.off('mouse:up', this.handleCanvasDragEndBound)

      document.removeEventListener('keydown', this.handleSpaceKeyDownBound, { capture: true })
      document.removeEventListener('keyup', this.handleSpaceKeyUpBound, { capture: true })
    }
    if (this.options.mouseWheelZooming) {
      this.canvas.wrapperEl.removeEventListener('wheel', this.handleCanvasWheelZoomBound, {
        capture: true
      })
      this.canvas.wrapperEl.removeEventListener('gesturestart', this.handleCanvasGestureStartBound, {
        capture: true
      })
      this.canvas.wrapperEl.removeEventListener('gesturechange', this.handleCanvasGestureChangeBound, {
        capture: true
      })
      this.canvas.wrapperEl.removeEventListener('gestureend', this.handleCanvasGestureEndBound, {
        capture: true
      })
    }
    if (this.options.resetObjectFitByDoubleClick) {
      this.canvas.off('mouse:dblclick', this.handleResetObjectFitBound)
    }

    this.canvas.off('object:modified', this.handleObjectModifiedHistoryBound)
    this.canvas.off('object:rotating', this.handleObjectRotatingHistoryBound)
    this.canvas.off('object:added', this.handleObjectAddedHistoryBound)
    this.canvas.off('object:removed', this.handleObjectRemovedHistoryBound)
    this.canvas.off('object:moving', this.handleObjectTransformStartBound)
    this.canvas.off('object:scaling', this.handleObjectTransformStartBound)
    this.canvas.off('object:rotating', this.handleObjectTransformStartBound)
    this.canvas.off('object:skewing', this.handleObjectTransformStartBound)
    this.canvas.off('object:resizing', this.handleObjectTransformStartBound)
    this.canvas.off('object:modified', this.handleObjectTransformEndBound)

    this.canvas.off('object:added', this.handleOverlayUpdateBound)
    this.canvas.off('selection:created', this.handleOverlayUpdateBound)

    this.canvas.off('object:added', this.handleBackgroundUpdateBound)
    this.canvas.off('selection:created', this.handleBackgroundUpdateBound)
  }

  /**
   * Дебаунс для снижения частоты вызова функции.
   * @param fn — функция-обработчик
   * @param delay — задержка в миллисекундах
   * @returns новую обёртку-обработчик
   */
  static debounce<T extends(...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null

    return function(this: ThisParameterType<T>, ...args: Parameters<T>): void {
      if (timer !== null) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        fn.apply(this, args)
      }, delay)
    }
  }
}

export default Listeners
