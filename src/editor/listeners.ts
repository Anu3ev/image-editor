import { CanvasOptions, ActiveSelection, FabricObject, Canvas, TPointerEventInfo, TPointerEvent } from 'fabric'

import { ImageEditor } from '.'

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
   * Привязанные обработчики событий.
   * Используются для удаления слушателей при уничтожении экземпляра.
   */
  handleContainerResizeBound: (e: Event) => void

  handleCopyEventBound: (e: KeyboardEvent) => void

  handlePasteEventBound: (e: ClipboardEvent) => void

  handleUndoRedoEventBound: (e: KeyboardEvent) => void

  handleUndoRedoKeyUpBound: (e: KeyboardEvent) => void

  handleSelectAllEventBound: (e: KeyboardEvent) => void

  handleDeleteObjectsEventBound: (e: KeyboardEvent) => void

  handleSpaceKeyDownBound: (e: KeyboardEvent) => void

  handleSpaceKeyUpBound: (e: KeyboardEvent) => void

  handleObjectModifiedHistoryBound: () => void

  handleObjectRotatingHistoryBound: () => void

  handleObjectAddedHistoryBound: () => void

  handleObjectRemovedHistoryBound: () => void

  handleOverlayUpdateBound: () => void

  handleCanvasDragStartBound: (options: TPointerEventInfo<TPointerEvent>) => void

  handleCanvasDraggingBound: (options: TPointerEventInfo<TPointerEvent>) => void

  handleCanvasDragEndBound: () => void

  handleMouseWheelZoomBound: (options: TPointerEventInfo<WheelEvent>) => void

  handleBringToFrontBound: ({ selected }: { selected: FabricObject[] }) => void

  handleResetObjectFitBound: (options: TPointerEventInfo<TPointerEvent>) => void

  handleLockedSelectionBound: (options: {
    selected: FabricObject[],
    deselected?: FabricObject[],
    e?: TPointerEvent
  }) => void

  /**
   * Опции редактора, которые могут быть изменены пользователем.
   */
  canvasDragging: boolean = false

  mouseWheelZooming: boolean = false

  bringToFrontOnSelection: boolean = false

  resetObjectFitByDoubleClick: boolean = false

  copyObjectsByHotkey: boolean = false

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
   * @param params.options.bringToFrontOnSelection — поднимать объект на передний план при выборе
   * @param params.options.copyObjectsByHotkey — копировать объекты по Ctrl+C
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
    this.handlePasteEventBound = this.handlePasteEvent.bind(this)
    this.handleUndoRedoEventBound = this.handleUndoRedoEvent.bind(this)
    this.handleUndoRedoKeyUpBound = this.handleUndoRedoKeyUp.bind(this)
    this.handleSelectAllEventBound = this.handleSelectAllEvent.bind(this)
    this.handleDeleteObjectsEventBound = this.handleDeleteObjectsEvent.bind(this)
    this.handleSpaceKeyDownBound = this.handleSpaceKeyDown.bind(this)
    this.handleSpaceKeyUpBound = this.handleSpaceKeyUp.bind(this)

    // Canvas (Fabric) события:
    this.handleObjectModifiedHistoryBound = Listeners.debounce(this.handleObjectModifiedHistory.bind(this), 300)
    this.handleObjectRotatingHistoryBound = Listeners.debounce(this.handleObjectRotatingHistory.bind(this), 300)
    this.handleObjectAddedHistoryBound = this.handleObjectAddedHistory.bind(this)
    this.handleObjectRemovedHistoryBound = this.handleObjectRemovedHistory.bind(this)
    this.handleOverlayUpdateBound = this.handleOverlayUpdate.bind(this)
    this.handleCanvasDragStartBound = this.handleCanvasDragStart.bind(this)
    this.handleCanvasDraggingBound = this.handleCanvasDragging.bind(this)
    this.handleCanvasDragEndBound = this.handleCanvasDragEnd.bind(this)
    this.handleMouseWheelZoomBound = this.handleMouseWheelZoom.bind(this)
    this.handleBringToFrontBound = this.handleBringToFront.bind(this)
    this.handleResetObjectFitBound = this.handleResetObjectFit.bind(this)
    this.handleLockedSelectionBound = this._filterLockedSelection.bind(this)

    this.init()
  }

  /**
   * Инициализация всех обработчиков согласно опциям.
   */
  init(): void {
    const {
      adaptCanvasToContainerOnResize,
      canvasDragging,
      mouseWheelZooming,
      bringToFrontOnSelection,
      copyObjectsByHotkey,
      pasteImageFromClipboard,
      undoRedoByHotKeys,
      selectAllByHotkey,
      deleteObjectsByHotkey,
      resetObjectFitByDoubleClick
    } = this.options

    if (canvasDragging) {
      this.canvas.on('mouse:down', this.handleCanvasDragStartBound)
      this.canvas.on('mouse:move', this.handleCanvasDraggingBound)
      this.canvas.on('mouse:up', this.handleCanvasDragEndBound)

      document.addEventListener('keydown', this.handleSpaceKeyDownBound, { capture: true })
      document.addEventListener('keyup', this.handleSpaceKeyUpBound, { capture: true })
    }

    if (mouseWheelZooming) {
      this.canvas.on('mouse:wheel', this.handleMouseWheelZoomBound)
    }

    if (bringToFrontOnSelection) {
      this.canvas.on('selection:created', this.handleBringToFrontBound)
      this.canvas.on('selection:updated', this.handleBringToFrontBound)
    }

    if (resetObjectFitByDoubleClick) {
      this.canvas.on('mouse:dblclick', this.handleResetObjectFitBound)
    }

    // Подключаем глобальные DOM-события:
    if (adaptCanvasToContainerOnResize) {
      window.addEventListener('resize', this.handleContainerResizeBound, { capture: true })
    }

    if (copyObjectsByHotkey) {
      document.addEventListener('keydown', this.handleCopyEventBound, { capture: true })
    }

    if (pasteImageFromClipboard) {
      document.addEventListener('paste', this.handlePasteEventBound, { capture: true })
    }

    if (undoRedoByHotKeys) {
      document.addEventListener('keydown', this.handleUndoRedoEventBound, { capture: true })

      document.addEventListener('keyup', this.handleUndoRedoKeyUpBound, { capture: true })
    }

    if (selectAllByHotkey) {
      document.addEventListener('keydown', this.handleSelectAllEventBound, { capture: true })
    }

    if (deleteObjectsByHotkey) {
      document.addEventListener('keydown', this.handleDeleteObjectsEventBound, { capture: true })
    }

    // Инициализация истории редактора
    this.canvas.on('object:modified', this.handleObjectModifiedHistoryBound)
    this.canvas.on('object:rotating', this.handleObjectRotatingHistoryBound)
    this.canvas.on('object:added', this.handleObjectAddedHistoryBound)
    this.canvas.on('object:removed', this.handleObjectRemovedHistoryBound)

    // Инициализация событий для overlayMask
    this.canvas.on('object:added', this.handleOverlayUpdateBound)
    this.canvas.on('selection:created', this.handleOverlayUpdateBound)

    this.canvas.on('selection:created', this.handleLockedSelectionBound)
    this.canvas.on('selection:updated', this.handleLockedSelectionBound)
  }

  /**
   * При массовом выделении объектов удаляем из него залоченные.
   * @param params - параметры события
   * @param params.selected - массив выделенных объектов
   * @param params.e - событие указателя (опционально)
   */
  private _filterLockedSelection({ selected, e }: { selected: FabricObject[], e?: TPointerEvent }): void {
    // Если это не событие мыши или если нет выделенных объектов, то ничего не делаем
    if (!selected?.length || !(e instanceof MouseEvent)) return

    //  Если объект один, то просто делаем его активным, не важно залочен он или нет
    if (selected.length === 1) return

    // Если нет залоченных объектов, то ничего не делаем
    const hasLocked = selected.some((obj) => obj.locked)
    if (!hasLocked) return

    // Получаем только те объекты, которые не залочены
    const allowed = selected.filter((obj) => !obj.locked)

    // Если ни одного разрешённого объекта, то снимаем выделение
    if (allowed.length === 0) {
      this.canvas.discardActiveObject()
      return
    }

    // Если только один разрешённый объект, то делаем его активным
    if (allowed.length === 1) {
      this.canvas.setActiveObject(allowed[0])
      return
    }

    // Если несколько разрешённых объектов, то создаём новый ActiveSelection и делаем его активным
    const newSel = new ActiveSelection(allowed, {
      canvas: this.canvas
    })
    this.canvas.setActiveObject(newSel)
    this.canvas.requestRenderAll()
  }

  /**
   * Обработчики для сохранения состояния редактора в истории.
   * Срабатывают при изменении объектов (перемещение, изменение размера и т.д.).
   */
  handleObjectModifiedHistory(): void {
    if (this.editor.historyManager.skipHistory) return
    this.editor.historyManager.saveState()
  }

  handleObjectRotatingHistory(): void {
    if (this.editor.historyManager.skipHistory) return
    this.editor.historyManager.saveState()
  }

  handleObjectAddedHistory(): void {
    if (this.editor.historyManager.skipHistory) return
    this.editor.historyManager.saveState()
  }

  handleObjectRemovedHistory(): void {
    if (this.editor.historyManager.skipHistory) return
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

  // --- Глобальные DOM-обработчики ---

  /**
   * Обработчик изменения размеров окна браузера.
   * Адаптирует канвас к размерам контейнера.
   */
  handleContainerResize(): void {
    this.editor.canvasManager.updateCanvasAndFitObjects()
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

    if ((!ctrlKey && !metaKey) || code !== 'KeyC') return

    event.preventDefault()
    this.editor.clipboardManager.copy()
  }

  /**
   * Обработчик вставки объекта или изображения из буфера обмена.
   * @param event — объект события
   */
  handlePasteEvent(event: ClipboardEvent): void {
    this.editor.clipboardManager.handlePasteEvent(event)
  }

  /**
   * Обработчик для отмены/повтора (Ctrl+Z/Ctrl+Y).
   * @param event — объект события
   * @param event.ctrlKey — зажата ли клавиша Ctrl
   * @param event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param event.code — код клавиши
   */
  async handleUndoRedoEvent(event:KeyboardEvent): Promise<void> {
    const { ctrlKey, metaKey, code, repeat } = event

    if ((!ctrlKey && !metaKey) || repeat) return

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
  handleUndoRedoKeyUp({ code }:KeyboardEvent): void {
    if (!['KeyZ', 'KeyY'].includes(code)) return

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
    const { ctrlKey, metaKey, code } = event
    if ((!ctrlKey && !metaKey) || code !== 'KeyA') return
    event.preventDefault()
    this.editor.selectionManager.selectAll()
  }

  /**
   * Обработчик для удаления объектов (Delete).
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleDeleteObjectsEvent(event:KeyboardEvent): void {
    if (event.code !== 'Delete') return
    event.preventDefault()
    this.editor.deletionManager.deleteSelectedObjects()
  }

  /**
   * Обработчик для нажатия пробела.
   * Отключает выделение объектов и делает курсор "grab" для перетаскивания канваса.
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleSpaceKeyDown(event:KeyboardEvent): void {
    if (event.code !== 'Space') return

    const { canvas, editor, isSpacePressed, isDragging } = this

    if (isSpacePressed || isDragging) return

    this.isSpacePressed = true
    event.preventDefault()

    canvas.set({
      selection: false,
      defaultCursor: 'grab'
    })
    canvas.setCursor('grab')

    editor.canvasManager.getObjects().forEach((obj) => {
      obj.set({
        selectable: false,
        evented: false
      })
    })
  }

  /**
   * Обработчик для отпускания пробела.
   * Завершает перетаскивание канваса, если оно активно.
   * Включает выделение объектов и возвращает курсор в состояние "default".
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleSpaceKeyUp(event:KeyboardEvent): void {
    if (event.code !== 'Space') return

    this.isSpacePressed = false
    // Завершаем перетаскивание при отпускании пробела
    if (this.isDragging) {
      this.handleCanvasDragEnd()
    }

    this.canvas.set({
      defaultCursor: 'default',
      selection: true
    })

    this.canvas.setCursor('default')

    this.editor.canvasManager.getObjects().forEach((obj) => {
      obj.set({
        selectable: true,
        evented: true
      })
    })
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

    this.canvas.setCursor('grabbing')
  }

  /**
   * Перетаскивание канваса (mouse:move).
   * @param options
   * @param options.e — объект события
   *
   * TODO: Надо как-то ограничить область перетаскивания, чтобы канвас не уходил сильно далеко за пределы экрана
   */
  handleCanvasDragging({ e: event }:TPointerEventInfo<TPointerEvent>): void {
    if (!this.isDragging || !this.isSpacePressed || !(event instanceof MouseEvent)) return

    const vpt = this.canvas.viewportTransform
    vpt[4] += event.clientX - this.lastMouseX
    vpt[5] += event.clientY - this.lastMouseY
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
   * Обработчик зума колесиком мыши. Работает при зажатом Ctrl или Cmd.
   * @param options
   * @param options.e - объект события
   */
  handleMouseWheelZoom({ e: event }:TPointerEventInfo<WheelEvent>): void {
    if (!event.ctrlKey && !event.metaKey) return

    const conversionFactor = 0.001
    const scaleAdjustment = -event.deltaY * conversionFactor

    this.editor.transformManager.zoom(scaleAdjustment)

    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Обработчик, поднимающий выделенные объекты на передний план.
   * @param event - объект события выделения
   * @param event.selected - массив выбранных объектов
   */
  handleBringToFront({ selected }: { selected: FabricObject[] }): void {
    if (!selected?.length) return
    selected.forEach((obj) => {
      this.editor.layerManager.bringToFront(obj)
    })
  }

  /**
   * Обработчик сброса объекта по двойному клику.
   * @param options - объект события fabric
   */
  handleResetObjectFit(options: TPointerEventInfo<TPointerEvent>): void {
    const target = options?.target
    if (!target) return
    this.editor.transformManager.resetObject(target)
  }

  /**
   * Метод для удаления всех слушателей
   */
  destroy(): void {
    // Глобальные DOM-обработчики
    window.removeEventListener('resize', this.handleContainerResizeBound, { capture: true })
    document.removeEventListener('keydown', this.handleCopyEventBound, { capture: true })
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
      this.canvas.off('mouse:wheel', this.handleMouseWheelZoomBound)
    }
    if (this.options.bringToFrontOnSelection) {
      this.canvas.off('selection:created', this.handleBringToFrontBound)
      this.canvas.off('selection:updated', this.handleBringToFrontBound)
    }
    if (this.options.resetObjectFitByDoubleClick) {
      this.canvas.off('mouse:dblclick', this.handleResetObjectFitBound)
    }

    this.canvas.off('object:modified', this.handleObjectModifiedHistoryBound)
    this.canvas.off('object:rotating', this.handleObjectRotatingHistoryBound)
    this.canvas.off('object:added', this.handleObjectAddedHistoryBound)
    this.canvas.off('object:removed', this.handleObjectRemovedHistoryBound)

    this.canvas.off('object:added', this.handleOverlayUpdateBound)
    this.canvas.off('selection:created', this.handleOverlayUpdateBound)

    this.canvas.off('selection:created', this.handleLockedSelectionBound)
    this.canvas.off('selection:updated', this.handleLockedSelectionBound)
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
