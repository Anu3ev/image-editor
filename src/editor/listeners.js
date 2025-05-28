import { ActiveSelection } from 'fabric'

class Listeners {
  /**
   * Конструктор принимает редактор и опции.
   * @param {Object} params
   * @param {ImageEditor} params.editor – редактор, содержащий canvas
   * @param {Object} params.options — настройки редактора (см. defaults.js)
   * @param {Boolean} [params.options.canvasDragging] — включить перетаскивание канваса
   * @param {Boolean} [params.options.mouseWheelZooming] — включить зум колесом мыши
   * @param {Boolean} [params.options.bringToFrontOnSelection] — поднимать объект на передний план при выборе
   * @param {Boolean} [params.options.copyObjectsByHotkey] — копировать объекты по Ctrl+C
   * @param {Boolean} [params.options.pasteImageFromClipboard] — вставлять изображения и объекты из буфера обмена
   * @param {Boolean} [params.options.undoRedoByHotKeys] — отмена/повтор по Ctrl+Z/Ctrl+Y
   * @param {Boolean} [params.options.selectAllByHotkey] — выделение всех объектов по Ctrl+A
   * @param {Boolean} [params.options.deleteObjectsByHotkey] — удаление объектов по Delete
   * @param {Boolean} [params.options.resetObjectFitByDoubleClick] — сброс фита объекта по двойному клику
   */
  constructor({ editor, options = {} }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.options = options

    this.isUndoRedoKeyPressed = false

    // Создаем и сохраняем привязанные обработчики, чтобы потом можно было их снять.
    // Глобальные (DOM) события:
    this.handleAdaptCanvasToContainerBound = Listeners.debounce(this.handleAdaptCanvasToContainer.bind(this), 500)
    this.handleCopyEventBound = this.handleCopyEvent.bind(this)
    this.handlePasteEventBound = this.handlePasteEvent.bind(this)
    this.handleUndoRedoEventBound = this.handleUndoRedoEvent.bind(this)
    this.handleUndoRedoKeyUpBound = this.handleUndoRedoKeyUp.bind(this)
    this.handleSelectAllEventBound = this.handleSelectAllEvent.bind(this)
    this.handleDeleteObjectsEventBound = this.handleDeleteObjectsEvent.bind(this)

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
  init() {
    const {
      adaptCanvasToContainer,
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
    if (adaptCanvasToContainer) {
      window.addEventListener('resize', this.handleAdaptCanvasToContainerBound, { capture: true })
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

    this.canvas.on('selection:created', this.handleLockedSelectionBound.bind(this))
    this.canvas.on('selection:updated', this.handleLockedSelectionBound.bind(this))
  }

  /**
   * При массовом выделении объектов удаляем из него залоченные.
   */
  _filterLockedSelection({ selected, e }) {
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
  handleObjectModifiedHistory() {
    if (this.editor.historyManager.skipHistory) return
    this.editor.historyManager.saveState()
  }

  handleObjectRotatingHistory() {
    if (this.editor.historyManager.skipHistory) return
    this.editor.historyManager.saveState()
  }

  handleObjectAddedHistory() {
    if (this.editor.historyManager.skipHistory) return
    this.editor.historyManager.saveState()
  }

  handleObjectRemovedHistory() {
    if (this.editor.historyManager.skipHistory) return
    this.editor.historyManager.saveState()
  }

  /**
   * Обновление overlayMask при добавлении объектов или выделении.
   */
  handleOverlayUpdate() {
    const { interactionBlocker } = this.editor

    if (!interactionBlocker.isBlocked || !interactionBlocker.overlayMask) return

    this.editor.interactionBlocker.refresh()
  }

  // --- Глобальные DOM-обработчики ---

  /**
   * Обработчик изменения размеров окна браузера.
   * Адаптирует канвас к размерам контейнера.
   */
  handleAdaptCanvasToContainer() {
    const { width, height } = this.editor.montageArea

    // Заново адаптируем канвас к контейнеру
    this.editor.canvasManager.setResolutionWidth(width, { adaptCanvasToContainer: true, withoutSave: true })
    this.editor.canvasManager.setResolutionHeight(height, { adaptCanvasToContainer: true, withoutSave: true })

    // Центрируем монтажную область
    this.editor.canvasManager.centerMontageArea()

    // Вписываем объекты в монтажную область
    this.editor.selectionManager.selectAll()
    this.editor.transformManager.fitObject({ fitAsOneObject: true, withoutSave: true })
  }

  /**
   * Обработчик для Ctrl+C (копирование).
   * @param {Object} event — объект события
   * @param {Boolean} event.ctrlKey — зажата ли клавиша Ctrl
   * @param {Boolean} event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param {String} event.code — код клавиши
   */
  handleCopyEvent(event) {
    const { ctrlKey, metaKey, code } = event

    if ((!ctrlKey && !metaKey) || code !== 'KeyC') return

    event.preventDefault()
    this.editor.clipboardManager.copy()
  }

  /**
   * Обработчик вставки объекта или изображения из буфера обмена.
   * @param {Object} event — объект события
   * @param {Object} event.clipboardData — данные из буфера обмена
   * @param {Array} event.clipboardData.items — элементы буфера обмена
   */
  handlePasteEvent({ clipboardData }) {
    if (!clipboardData?.items?.length) return

    const { items } = clipboardData
    const lastItem = items[items.length - 1]

    // Если в буфере обмена есть изображение, то получаем и вставляем его
    if (lastItem.type.indexOf('image') !== -1) {
      const blob = lastItem.getAsFile()
      if (!blob) return

      const reader = new FileReader()
      reader.onload = (f) => {
        this.editor.imageManager.importImage({ source: f.target.result })
      }

      reader.readAsDataURL(blob)
      return
    }

    // Если в буфере text/html c тегом img, то получаем и вставляем его
    const htmlData = clipboardData.getData('text/html')

    if (htmlData) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlData, 'text/html')
      const img = doc.querySelector('img')

      if (img?.src) {
        this.editor.imageManager.importImage({ source: img.src })
        return
      }
    }

    this.editor.clipboardManager.paste()
  }

  /**
   * Обработчик для отмены/повтора (Ctrl+Z/Ctrl+Y).
   *  @param {Object} event — объект события
   * @param {Boolean} event.ctrlKey — зажата ли клавиша Ctrl
   * @param {Boolean} event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param {String} event.code — код клавиши
   */
  async handleUndoRedoEvent(event) {
    const { ctrlKey, metaKey, code, repeat } = event

    if ((!ctrlKey && !metaKey) || repeat) return

    if (this.isUndoRedoKeyPressed) return

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
   * @param {Object} event — объект события
   * @param {String} event.code — код клавиши
   */
  handleUndoRedoKeyUp({ code }) {
    if (code === 'KeyZ' || code === 'KeyY') {
      this.isUndoRedoKeyPressed = false
    }
  }

  /**
   * Обработчик для выделения всех объектов (Ctrl+A).
   * @param {Object} event — объект события
   * @param {Boolean} event.ctrlKey — зажата ли клавиша Ctrl
   * @param {Boolean} event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param {String} event.code — код клавиши
   */
  handleSelectAllEvent(event) {
    const { ctrlKey, metaKey, code } = event
    if ((!ctrlKey && !metaKey) || code !== 'KeyA') return
    event.preventDefault()
    this.editor.selectionManager.selectAll()
  }

  /**
   * Обработчик для удаления объектов (Delete).
   * @param {Object} event — объект события
   * @param {String} event.code — код клавиши
   */
  handleDeleteObjectsEvent(event) {
    if (event.code !== 'Delete') return
    event.preventDefault()
    this.editor.deletionManager.deleteSelectedObjects()
  }

  // --- Обработчики для событий canvas (Fabric) ---

  /**
   * Начало перетаскивания канваса (срабатывает при mouse:down).
   * @param {Object} options
   * @param {Object} options.e — объект события
   */
  handleCanvasDragStart({ e: event }) {
    // перетаскивание происходит только при зажатом Alt
    if (!event.altKey) return
    this.canvas.isDragging = true
    this.canvas.selection = false
    this.canvas.lastPosX = event.clientX
    this.canvas.lastPosY = event.clientY
  }

  /**
   * Перетаскивание канваса (mouse:move).
   * @param {Object} options
   * @param {Object} options.e — объект события
   *
   * TODO: Надо как-то ограничить область перетаскивания, чтобы канвас не уходил сильно далеко за пределы экрана
   */
  handleCanvasDragging({ e: event }) {
    if (!this.canvas.isDragging) return
    const vpt = this.canvas.viewportTransform
    vpt[4] += event.clientX - this.canvas.lastPosX
    vpt[5] += event.clientY - this.canvas.lastPosY
    this.canvas.requestRenderAll()
    this.canvas.lastPosX = event.clientX
    this.canvas.lastPosY = event.clientY
  }

  /**
   * Завершение перетаскивания канваса (mouse:up).
   * Сохраняет новое положение канваса.
   */
  handleCanvasDragEnd() {
    this.canvas.setViewportTransform(this.canvas.viewportTransform)
    this.canvas.isDragging = false
    this.canvas.selection = true
  }

  /**
   * Обработчик зума колесиком мыши.
   * @param {Object} options
   * @param {Object} options.e — объект события
   */
  handleMouseWheelZoom({ e: event }) {
    const conversionFactor = 0.001
    const scaleAdjustment = -event.deltaY * conversionFactor

    this.editor.transformManager.zoom(scaleAdjustment)

    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Обработчик, поднимающий выделенные объекты на передний план.
   * @param {Object} event - объект события Fabric
   * @param {Array} event.selected - массив выбранных объектов
   */
  handleBringToFront({ selected }) {
    if (!selected?.length) return
    selected.forEach((obj) => {
      this.editor.layerManager.bringToFront(obj)
    })
  }

  /**
   * Обработчик сброса объекта по двойному клику.
   */
  handleResetObjectFit({ target }) {
    if (!target) return
    this.editor.transformManager.resetObject(target)
  }

  /**
   * Метод для удаления всех слушателей
   */
  destroy() {
    // Глобальные DOM-обработчики
    window.removeEventListener('resize', this.handleAdaptCanvasToContainerBound, { capture: true })
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

    this.canvas.off('selection:created', this.handleLockedSelectionBound.bind(this))
    this.canvas.off('selection:updated', this.handleLockedSelectionBound.bind(this))
  }

  // Дебаунс для снижения частоты сохранения состояния
  static debounce(fn, delay) {
    let timer = null

    return function(...args) {
      const context = this
      clearTimeout(timer)
      timer = setTimeout(() => {
        fn.apply(context, args)
      }, delay)
    }
  }
}

export default Listeners
