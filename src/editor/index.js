import { Canvas, Pattern } from 'fabric'

import { nanoid } from 'nanoid'
import Listeners from './listeners'
import ModuleLoader from './module-loader'
import WorkerManager from './worker-manager'
import CustomizedControls from './customized-controls'
import ToolbarManager from './ui/toolbar-manager'
import HistoryManager from './history-manager'
import ImageManager from './image-manager'
import CanvasManager from './canvas-manager'
import TransformManager from './transform-manager'
import InteractionBlocker from './interaction-blocker'
import LayerManager from './layer-manager'
import ShapeManager from './shape-manager'
import ClipboardManager from './clipboard-manager'
import ObjectLockManager from './object-lock-manager'
import GroupingManager from './grouping-manager'
import SelectionManager from './selection-manager'
import DeletionManager from './deletion-manager'

import {
  MIN_ZOOM,
  MAX_ZOOM
} from './constants'

// TODO: Режим рисования
// TODO: Добавление текста
// TODO: Сделать снэп (прилипание к краям и центру)
// TODO: Подумать как работать с переводами в редакторе

/**
 * Класс редактора изображений.
 * @class
 * @param {string} canvasId - идентификатор канваса
 * @param {object} options - опции и настройки
 *
 * @fires {object} editor:render-complete - событие, которое срабатывает после завершения рендеринга редактора
 */
export class ImageEditor {
  constructor(canvasId, options = {}) {
    this.options = options

    const { defaultScale, minZoom, maxZoom } = options

    this.containerId = canvasId
    this.editorId = `${canvasId}-${nanoid()}`
    this.clipboard = null

    this.defaultZoom = defaultScale

    this.minZoom = minZoom || MIN_ZOOM
    this.maxZoom = maxZoom || MAX_ZOOM

    this.init()
  }

  async init() {
    const {
      editorContainerWidth,
      editorContainerHeight,
      canvasWrapperWidth,
      canvasWrapperHeight,
      canvasCSSWidth,
      canvasCSSHeight,
      initialImage,
      initialStateJSON,
      scaleType,
      _onReadyCallback
    } = this.options

    CustomizedControls.apply()

    this.canvas = new Canvas(this.containerId, this.options)
    this.moduleLoader = new ModuleLoader()
    this.workerManager = new WorkerManager()
    this.historyManager = new HistoryManager({ editor: this })
    this.toolbar = new ToolbarManager({ editor: this })
    this.transformManager = new TransformManager({ editor: this })
    this.canvasManager = new CanvasManager({ editor: this })
    this.imageManager = new ImageManager({ editor: this })
    this.layerManager = new LayerManager({ editor: this })
    this.shapeManager = new ShapeManager({ editor: this })
    this.interactionBlocker = new InteractionBlocker({ editor: this })
    this.clipboardManager = new ClipboardManager({ editor: this })
    this.objectLockManager = new ObjectLockManager({ editor: this })
    this.groupingManager = new GroupingManager({ editor: this })
    this.selectionManager = new SelectionManager({ editor: this })
    this.deletionManager = new DeletionManager({ editor: this })

    this._createMonageArea()
    this._createClippingArea()

    this.listeners = new Listeners({ editor: this, options: this.options })

    this.canvasManager.setEditorContainerWidth(editorContainerWidth)
    this.canvasManager.setEditorContainerHeight(editorContainerHeight)
    this.canvasManager.setCanvasWrapperWidth(canvasWrapperWidth)
    this.canvasManager.setCanvasWrapperHeight(canvasWrapperHeight)
    this.canvasManager.setCanvasCSSWidth(canvasCSSWidth)
    this.canvasManager.setCanvasCSSHeight(canvasCSSHeight)

    if (initialImage?.source) {
      const {
        source,
        scale = `image-${scaleType}`,
        withoutSave = true,
        contentType
      } = initialImage

      await this.imageManager.importImage({ source, scale, withoutSave, contentType })
    } else {
      this.canvasManager.setDefaultScale({ withoutSave: true })
    }

    if (initialStateJSON) {
      this.historyManager.loadStateFromFullState(initialStateJSON)
    }

    this.historyManager.saveState()

    console.log('editor:ready')
    this.canvas.fire('editor:ready', this)

    // вызываем колбэк если он есть
    if (typeof _onReadyCallback === 'function') {
      _onReadyCallback(this)
    }
  }

  /**
   * Создаёт монтажную область
   * @private
   * @returns {void}
   */
  _createMonageArea() {
    const {
      montageAreaWidth,
      montageAreaHeight
    } = this.options

    this.montageArea = this.shapeManager.addRectangle({
      width: montageAreaWidth,
      height: montageAreaHeight,
      fill: ImageEditor._createMosaicPattern(),
      stroke: null,
      strokeWidth: 0,
      selectable: false,
      hasBorders: false,
      hasControls: false,
      evented: false,
      id: 'montage-area',
      originX: 'center',
      originY: 'center',
      objectCaching: false,
      noScaleCache: true
    }, { withoutSelection: true })
  }

  /**
   * Создаёт область клиппинга
   * @private
   * @returns {void}
   */
  _createClippingArea() {
    const {
      montageAreaWidth,
      montageAreaHeight
    } = this.options

    this.canvas.clipPath = this.shapeManager.addRectangle({
      id: 'area-clip',
      width: montageAreaWidth,
      height: montageAreaHeight,
      stroke: null,
      fill: null,
      strokeWidth: 0,
      hasBorders: false,
      hasControls: false,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center'
    }, { withoutSelection: true, withoutAdding: true })
  }

  /**
   * Метод для удаления редактора и всех слушателей.
   */
  destroy() {
    this.listeners.destroy()
    this.toolbar.destroy()
    this.canvas.dispose()
    this.workerManager.worker.terminate()
    this.imageManager.revokeBlobUrls()
  }

  /**
   * Создает паттерн мозаики.
   * @returns {object} паттерн мозаики
   */
  static _createMosaicPattern() {
    const patternSourceCanvas = document.createElement('canvas')
    patternSourceCanvas.width = 20
    patternSourceCanvas.height = 20
    const pCtx = patternSourceCanvas.getContext('2d')
    pCtx.fillStyle = '#ddd'
    pCtx.fillRect(0, 0, 40, 40)
    pCtx.fillStyle = '#ccc'
    pCtx.fillRect(0, 0, 10, 10)
    pCtx.fillRect(10, 10, 10, 10)

    return new Pattern({
      source: patternSourceCanvas,
      repeat: 'repeat'
    })
  }
}
