import { Canvas, Pattern, Rect, CanvasOptions } from 'fabric'
import { nanoid } from 'nanoid'

import Listeners from './listeners'
import ModuleLoader from './module-loader'
import WorkerManager from './worker-manager'
import CustomizedControls from './customized-controls'
import FontManager from './font-manager'
import ToolbarManager from './ui/toolbar-manager'
import AngleIndicatorManager from './ui/angle-indicator'
import HistoryManager, { CanvasFullState } from './history-manager'
import ImageManager from './image-manager'
import CanvasManager from './canvas-manager'
import TransformManager from './transform-manager'
import ZoomManager from './zoom-manager'
import InteractionBlocker from './interaction-blocker'
import BackgroundManager from './background-manager'
import LayerManager from './layer-manager'
import ShapeManager from './shape-manager'
import ClipboardManager from './clipboard-manager'
import ObjectLockManager from './object-lock-manager'
import GroupingManager from './grouping-manager'
import SelectionManager from './selection-manager'
import DeletionManager from './deletion-manager'
import ErrorManager from './error-manager'
import PanConstraintManager from './pan-constraint-manager'
import TextManager from './text-manager'
import TemplateManager from './template-manager'
import SnappingManager from './snapping-manager'
import MeasurementManager from './measurement-manager'

import type { ImportImageOptions } from './image-manager'

// TODO: Обложиться тестами с помощью jest
// TODO: Сделать более симпатичное демо
// TODO: Режим рисования
// TODO: Подумать как работать с переводами в редакторе
// TODO: Сделать чтобы при наведении мыши на область где находится объект под другим объектом, этот объект тоже подсвечивался, и его можно было выбрать

/**
 * Класс редактора изображений.
 * @class
 */
export class ImageEditor {
  /**
   * Опции и настройки редактора
   */
  readonly options: CanvasOptions

  /**
   * Идентификатор HTML-контейнера.
   */
  readonly containerId: string

  /**
   * Уникальный идентификатор редактора.
   */
  readonly editorId: string

  /**
   * Буфер обмена для хранения объектов.
   */
  public clipboard: ClipboardItem | null

  /**
   * Канвас редактора.
   */
  public canvas!: Canvas

  /**
   * Рабочая область, в которой будут размещаться изображения.
   */
  public montageArea!: Rect

  /**
   * Класс для динамического импорта модулей.
   */
  public moduleLoader!: ModuleLoader

  /**
   * Менеджер воркеров для выполнения фоновых задач.
   */
  public workerManager!: WorkerManager

  /**
   * Менеджер ошибок редактора.
   */
  public errorManager!: ErrorManager

  /**
   * Менеджер истории операций
   */
  public historyManager!: HistoryManager

  /**
   * Менеджер панели инструментов
   */
  public toolbar!: ToolbarManager

  /**
   * Менеджер трансформаций объектов
   */
  public transformManager!: TransformManager

  /**
   * Менеджер зума
   */
  public zoomManager!: ZoomManager

  /**
   * Менеджер канваса
   */
  public canvasManager!: CanvasManager

  /**
   * Менеджер изображений
   */
  public imageManager!: ImageManager

  /**
   * Менеджер слоёв
   */
  public layerManager!: LayerManager

  /**
   * Менеджер фигур
   */
  public shapeManager!: ShapeManager

  /**
   * Блокировщик взаимодействия с канвасом
   */
  public interactionBlocker!: InteractionBlocker

  /**
   * Менеджер фона
   */
  public backgroundManager!: BackgroundManager

  /**
   * Менеджер буфера обмена
   */
  public clipboardManager!: ClipboardManager

  /**
   * Менеджер блокировки объектов
   */
  public objectLockManager!: ObjectLockManager

  /**
   * Менеджер группировки объектов
   */
  public groupingManager!: GroupingManager

  /**
   * Менеджер выделения объектов
   */
  public selectionManager!: SelectionManager

  /**
   * Менеджер удаления объектов
   */
  public deletionManager!: DeletionManager

  /**
   * Менеджер ограничения перетаскивания канваса
   */
  public panConstraintManager!: PanConstraintManager

  /**
   * Менеджер прилипания к направляющим
   */
  public snappingManager!: SnappingManager

  /**
   * Менеджер измерений между объектами
   */
  public measurementManager!: MeasurementManager

  /**
   * Менеджер работы с текстом
   */
  public textManager!: TextManager

  /**
   * Менеджер шаблонов
   */
  public templateManager!: TemplateManager

  /**
   * Менеджер индикатора угла поворота (опционально)
   */
  public angleIndicator?: AngleIndicatorManager

  /**
   * Менеджер шрифтов редактора
   */
  public fontManager!: FontManager

  /**
   * Слушатели событий редактора
   */
  public listeners!: Listeners

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
  public async init(): Promise<void> {
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
      showRotationAngle,
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
    this.zoomManager = new ZoomManager({ editor: this })
    this.canvasManager = new CanvasManager({ editor: this })
    this.imageManager = new ImageManager({ editor: this })
    this.layerManager = new LayerManager({ editor: this })
    this.shapeManager = new ShapeManager({ editor: this })
    this.interactionBlocker = new InteractionBlocker({ editor: this })
    this.backgroundManager = new BackgroundManager({ editor: this })
    this.clipboardManager = new ClipboardManager({ editor: this })
    this.objectLockManager = new ObjectLockManager({ editor: this })
    this.groupingManager = new GroupingManager({ editor: this })
    this.selectionManager = new SelectionManager({ editor: this })
    this.deletionManager = new DeletionManager({ editor: this })
    this.panConstraintManager = new PanConstraintManager({ editor: this })
    this.snappingManager = new SnappingManager({ editor: this })
    this.measurementManager = new MeasurementManager({ editor: this })
    this.fontManager = new FontManager(this.options.fonts ?? [])
    this.textManager = new TextManager({ editor: this })
    this.templateManager = new TemplateManager({ editor: this })

    // Инициализируем индикатор угла поворота, если включена опция
    if (showRotationAngle) {
      this.angleIndicator = new AngleIndicatorManager({ editor: this })
    }

    this._createMontageArea()
    this._createClippingArea()

    this.listeners = new Listeners({ editor: this, options: this.options })

    this.canvasManager.setEditorContainerWidth(editorContainerWidth)
    this.canvasManager.setEditorContainerHeight(editorContainerHeight)
    this.canvasManager.setCanvasWrapperWidth(canvasWrapperWidth)
    this.canvasManager.setCanvasWrapperHeight(canvasWrapperHeight)
    this.canvasManager.setCanvasCSSWidth(canvasCSSWidth)
    this.canvasManager.setCanvasCSSHeight(canvasCSSHeight)
    this.canvasManager.updateCanvas()
    this.zoomManager.calculateAndApplyDefaultZoom()

    // Загружаем шрифты после того как редактор получил размеры
    await this.fontManager.loadFonts()

    if (initialImage?.source) {
      const {
        source,
        scale = `image-${scaleType}`,
        withoutSave = true,
        ...rest
      } = initialImage as ImportImageOptions

      await this.imageManager.importImage({ source, scale, withoutSave, ...rest })
    }

    if (initialStateJSON) {
      this.historyManager.loadStateFromFullState(initialStateJSON as CanvasFullState)
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
  public destroy(): void {
    this.listeners.destroy()
    this.snappingManager?.destroy()
    this.measurementManager?.destroy()
    this.toolbar.destroy()
    this.angleIndicator?.destroy()
    this.textManager?.destroy()
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
