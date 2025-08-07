import { Canvas, Pattern, Rect, CanvasOptions } from 'fabric'
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
import ErrorManager from './error-manager'

import type { ImportImageOptions } from './image-manager'

// TODO: Обложиться тестами с помощью jest
// TODO: Сделать более симпатичное демо
// TODO: Режим рисования
// TODO: Добавление текста
// TODO: Сделать снэп (прилипание к краям и центру)
// TODO: Подумать как работать с переводами в редакторе

/**
 * Класс редактора изображений.
 * @class
 */
export class ImageEditor {
  /**
   * Опции и настройки редактора
   * @type {CanvasOptions}
   */
  readonly options: CanvasOptions

  /**
   * Идентификатор HTML-контейнера.
   * @type {string}
   */
  readonly containerId: string

  /**
   * Уникальный идентификатор редактора.
   * @type {string}
   */
  readonly editorId: string

  /**
   * Буфер обмена для хранения объектов.
   * @type {ClipboardItem | null}
   */
  clipboard: ClipboardItem | null

  /**
   * Канвас редактора.
   * @type {Canvas | undefined}
   */
  canvas!: Canvas

  /**
   * Рабочая область, в которой будут размещаться изображения.
   * @type {Rect | undefined}
   */
  montageArea!: Rect

  /**
   * Класс для динамического импорта модулей.
   * @type {ModuleLoader | undefined}
   */
  moduleLoader!: ModuleLoader

  /**
   * Менеджер воркеров для выполнения фоновых задач.
   * @type {WorkerManager | undefined}
   */
  workerManager!: WorkerManager

  /**
   * Менеджер ошибок редактора.
   * @type {ErrorManager | undefined}
   */
  errorManager!: ErrorManager

  /**
   * Менеджер истории операций
   * @type {HistoryManager | undefined}
   */
  historyManager!: HistoryManager

  /**
   * Менеджер панели инструментов
   * @type {ToolbarManager | undefined}
   */
  toolbar!: ToolbarManager

  /**
   * Менеджер трансформаций объектов
   * @type {TransformManager | undefined}
   */
  transformManager!: TransformManager

  /**
   * Менеджер канваса
   * @type {CanvasManager | undefined}
   */
  canvasManager!: CanvasManager

  /**
   * Менеджер изображений
   * @type {ImageManager | undefined}
   */
  imageManager!: ImageManager

  /**
   * Менеджер слоёв
   * @type {LayerManager | undefined}
   */
  layerManager!: LayerManager

  /**
   * Менеджер фигур
   * @type {ShapeManager | undefined}
   */
  shapeManager!: ShapeManager

  /**
   * Блокировщик взаимодействия с канвасом
   * @type {InteractionBlocker | undefined}
   */
  interactionBlocker!: InteractionBlocker

  /**
   * Менеджер буфера обмена
   * @type {ClipboardManager | undefined}
   */
  clipboardManager!: ClipboardManager

  /**
   * Менеджер блокировки объектов
   * @type {ObjectLockManager | undefined}
   */
  objectLockManager!: ObjectLockManager

  /**
   * Менеджер группировки объектов
   * @type {GroupingManager | undefined}
   */
  groupingManager!: GroupingManager

  /**
   * Менеджер выделения объектов
   * @type {SelectionManager | undefined}
   */
  selectionManager!: SelectionManager

  /**
   * Менеджер удаления объектов
   * @type {DeletionManager | undefined}
   */
  deletionManager!: DeletionManager

  /**
   * Слушатели событий редактора
   * @type {Listeners | undefined}
   */
  listeners!: Listeners

  /**
   * Конструктор класса ImageEditor.
   * @param canvasId - идентификатор канваса, в котором будет создан редактор
   * @param options - опции и настройки редактора
   */
  constructor(canvasId: string, options: CanvasOptions) {
    this.options = options
    this.containerId = canvasId
    this.editorId = `${canvasId}-${nanoid()}`
    this.clipboard = null

    this.init()
  }

  /**
   * Инициализация редактора.
   * Создаёт все необходимые менеджеры и загружает начальное состояние.
   * @fires editor:ready
   */
  async init(): Promise<void> {
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
    this.errorManager = new ErrorManager({ editor: this })
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

    this._createMontageArea()
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
        withoutSave = true
      } = initialImage as ImportImageOptions

      await this.imageManager.importImage({ source, scale, withoutSave })
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
   */
  private _createMontageArea(): void {
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
   */
  private _createClippingArea(): void {
    const {
      montageAreaWidth,
      montageAreaHeight
    } = this.options

    this.canvas.clipPath = this.shapeManager.addRectangle({
      id: 'area-clip',
      width: montageAreaWidth,
      height: montageAreaHeight,
      stroke: null,
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
  destroy(): void {
    this.listeners.destroy()
    this.toolbar.destroy()
    this.canvas.dispose()
    this.workerManager.worker.terminate()
    this.imageManager.revokeBlobUrls()
    this.errorManager.cleanBuffer()
  }

  /**
   * Создает паттерн мозаики.
   * @returns паттерн мозаики
   */
  private static _createMosaicPattern(): Pattern {
    const patternSourceCanvas = document.createElement('canvas')
    patternSourceCanvas.width = 20
    patternSourceCanvas.height = 20
    const pCtx = patternSourceCanvas.getContext('2d')!
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
