import { Canvas, Pattern, Point, Rect } from 'fabric'
import { nanoid } from 'nanoid'
import type { EditorOptions } from './types/options'
import { createTranslator, type Translate } from './i18n'

import Listeners from './listeners'
import ModuleLoader from './module-loader'
import WorkerManager from './worker-manager'
import CustomizedControls from './customized-controls'
import FontManager from './font-manager'
import ToolbarManager from './ui/toolbar-manager'
import AngleIndicatorManager from './ui/angle-indicator'
import ObjectSizeIndicatorManager from './ui/object-size-indicator'
import ViewportScrollbarManager from './ui/viewport-scrollbar-manager'
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
import CropManager from './crop-manager'
import { addRectangleToCanvas } from './utils/primitive-shapes'

// TODO: Add comprehensive tests with jest
// TODO: Make the demo more attractive
// TODO: Drawing mode
// TODO: Highlight an object when the mouse hovers over its area beneath another object, and allow it to be selected

/**
 * Image editor class.
 * @class
 */
export class ImageEditor {
  /** Fixed-language translator; never changes other editors or persisted content. */
  public readonly t: Translate

  /**
   * Editor options and settings
   */
  readonly options: EditorOptions

  /**
   * HTML container identifier.
   */
  readonly containerId: string

  /**
   * Unique editor identifier.
   */
  readonly editorId: string

  /**
   * Editor canvas.
   */
  public canvas!: Canvas

  /**
   * Workspace where images will be placed.
   */
  public montageArea!: Rect

  /**
   * Class for dynamically importing modules.
   */
  public moduleLoader!: ModuleLoader

  /**
   * Worker manager for background tasks.
   */
  public workerManager!: WorkerManager

  /**
   * Editor error manager.
   */
  public errorManager!: ErrorManager

  /**
   * Operation history manager
   */
  public historyManager!: HistoryManager

  /**
   * Toolbar manager
   */
  public toolbar!: ToolbarManager

  /**
   * Object transform manager
   */
  public transformManager!: TransformManager

  /**
   * Zoom manager
   */
  public zoomManager!: ZoomManager

  /**
   * Canvas manager
   */
  public canvasManager!: CanvasManager

  /**
   * Image manager
   */
  public imageManager!: ImageManager

  /**
   * Layer manager
   */
  public layerManager!: LayerManager

  /**
   * Shape manager
   */
  public shapeManager!: ShapeManager

  /**
   * Canvas interaction blocker
   */
  public interactionBlocker!: InteractionBlocker

  /**
   * Background manager
   */
  public backgroundManager!: BackgroundManager

  /**
   * Clipboard manager
   */
  public clipboardManager!: ClipboardManager

  /**
   * Object lock manager
   */
  public objectLockManager!: ObjectLockManager

  /**
   * Object grouping manager
   */
  public groupingManager!: GroupingManager

  /**
   * Object selection manager
   */
  public selectionManager!: SelectionManager

  /**
   * Object deletion manager
   */
  public deletionManager!: DeletionManager

  /**
   * Canvas drag constraint manager
   */
  public panConstraintManager!: PanConstraintManager

  /**
   * Guide snapping manager
   */
  public snappingManager!: SnappingManager

  /**
   * Inter-object measurement manager
   */
  public measurementManager!: MeasurementManager

  /**
   * Text manager
   */
  public textManager!: TextManager

  /**
   * Template manager
   */
  public templateManager!: TemplateManager

  /**
   * Artboard and image crop mode manager
   */
  public cropManager!: CropManager

  /**
   * Rotation angle indicator manager (optional)
   */
  public angleIndicator?: AngleIndicatorManager

  /**
   * Object size indicator manager for scaling (optional)
   */
  public objectSizeIndicator?: ObjectSizeIndicatorManager

  /**
   * Viewport scrollbar manager (optional)
   */
  public viewportScrollbars?: ViewportScrollbarManager

  /**
   * Editor font manager
   */
  public fontManager!: FontManager

  /**
   * Editor event listeners
   */
  public listeners!: Listeners

  /** Resolves after full initialization; rejects on error or destroy(). */
  public readonly ready: Promise<void>

  private _initialization?: Promise<void>

  private _rejectInitialization?: (error: Error) => void

  private _destroyed = false

  /** Internal cleanup of host resources created by initEditor; the direct constructor does not own them. */
  private readonly _cleanupHostResources?: () => void

  /**
   * ImageEditor class constructor.
   * @param canvasId - Identifier of the canvas where the editor will be created
   * @param options - Editor options and settings
   * @param cleanupHostResources - Internal cleanup of the canvas and registration owned by initEditor
   */
  constructor(canvasId: string, options: EditorOptions, cleanupHostResources?: () => void) {
    this.options = options
    this.t = createTranslator(options.language)
    this._cleanupHostResources = cleanupHostResources
    this.containerId = canvasId
    this.editorId = `${canvasId}-${nanoid()}`

    this.ready = this.init()
    // The constructor supports fire-and-forget usage, but errors are available through ready.
    this.ready.catch(() => {})
  }

  /**
   * Editor initialization.
   * Creates all required managers and loads the initial state.
   * @fires editor:ready
   */
  public init(): Promise<void> {
    if (this._destroyed) return Promise.reject(new Error(this.t('editor.errors.destroyed')))
    if (this._initialization) return this._initialization

    this._initialization = new Promise((resolve, reject) => {
      this._rejectInitialization = reject
      this._initialize().then(() => {
        this._rejectInitialization = undefined
        resolve()
      }, (error: unknown) => {
        this._rejectInitialization = undefined
        this.destroy()
        reject(error)
      })
    })
    return this._initialization
  }

  /** Stops initialization from continuing after the editor is destroyed. */
  private _assertActive(): void {
    if (this._destroyed) {
      // Asynchronous loading may have created a blob URL after destroy().
      this.imageManager?.revokeBlobUrls()
      throw new Error(this.t('editor.errors.destroyed'))
    }
  }

  /** Creates editor resources and restores the initial state. */
  private async _initialize(): Promise<void> {
    const {
      editorContainerWidth,
      editorContainerHeight,
      canvasWrapperWidth,
      canvasWrapperHeight,
      canvasCSSWidth,
      canvasCSSHeight,
      initialImage,
      initialState,
      scaleType,
      showRotationAngle,
      showObjectSizeOnScale,
      showViewportScrollbars,
      _onReadyCallback
    } = this.options

    CustomizedControls.apply()

    this.canvas = new Canvas(this.containerId, this.options)
    this.moduleLoader = new ModuleLoader(this.t)
    this.workerManager = new WorkerManager(undefined, this.t)
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
    this.fontManager = new FontManager(this.options.fonts ?? [], this.t)
    this.textManager = new TextManager({ editor: this })
    this.templateManager = new TemplateManager({ editor: this })
    this.cropManager = new CropManager({ editor: this })

    // Initialize the rotation angle indicator if the option is enabled
    if (showRotationAngle) {
      this.angleIndicator = new AngleIndicatorManager({ editor: this })
    }

    // Initialize the object size indicator if the option is enabled
    if (showObjectSizeOnScale) {
      this.objectSizeIndicator = new ObjectSizeIndicatorManager({ editor: this })
    }

    this._createMontageArea()
    this._createClippingArea()
    this.interactionBlocker.ensureOverlay()

    this.listeners = new Listeners({ editor: this, options: this.options })

    this.canvasManager.setEditorContainerWidth(editorContainerWidth)
    this.canvasManager.setEditorContainerHeight(editorContainerHeight)
    this.canvasManager.setCanvasWrapperWidth(canvasWrapperWidth)
    this.canvasManager.setCanvasWrapperHeight(canvasWrapperHeight)
    this.canvasManager.setCanvasCSSWidth(canvasCSSWidth)
    this.canvasManager.setCanvasCSSHeight(canvasCSSHeight)
    this.canvasManager.updateCanvas()
    this.zoomManager.calculateAndApplyDefaultZoom()

    // Initialize viewport scrollbars after calculating the initial camera state
    if (showViewportScrollbars) {
      this.viewportScrollbars = new ViewportScrollbarManager({ editor: this })
    }

    // Load fonts after the editor has its dimensions
    await this.fontManager.loadFonts()
    this._assertActive()

    if (initialState) {
      this.historyManager.suspendHistory()

      try {
        const preparedState = await this.imageManager.prepareSerializedImageSources({
          state: initialState as CanvasFullState
        })

        this._assertActive()
        await this.historyManager.loadStateFromFullState(preparedState)
        this._assertActive()
      } catch (error) {
        this._assertActive()
        if (initialImage?.source) {
          const {
            source,
            scale = `image-${scaleType}`,
            withoutSave = true,
            ...rest
          } = initialImage

          await this.imageManager.importImage({ source, scale, withoutSave, ...rest })
        }

        this.errorManager.emitError({
          origin: 'ImageEditor',
          method: 'init',
          code: 'INITIAL_STATE_LOAD_FAILED',
          message: this.t('editor.errors.initialStateLoadFailed'),
          data: error as Error
        })
      } finally {
        this.historyManager.resumeHistory()
      }
    } else if (initialImage?.source) {
      const {
        source,
        scale = `image-${scaleType}`,
        withoutSave = true,
        ...rest
      } = initialImage

      await this.imageManager.importImage({ source, scale, withoutSave, ...rest })
    }

    this._assertActive()
    this.historyManager.saveState()

    console.log(this.t('editor.logs.ready'))
    this.canvas.fire('editor:ready', this)
    this._assertActive()

    // invoke the callback if present
    if (typeof _onReadyCallback === 'function') {
      _onReadyCallback(this)
    }
    this._assertActive()
  }

  /**
   * Creates the artboard
   */
  private _createMontageArea(): void {
    const {
      montageAreaWidth,
      montageAreaHeight
    } = this.options
    const centerPoint = new Point(montageAreaWidth / 2, montageAreaHeight / 2)

    this.montageArea = addRectangleToCanvas({
      canvas: this.canvas,
      centerPoint,
      options: {
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
      },
      flags: { withoutSelection: true }
    })
  }

  /**
   * Creates the clipping area
   */
  private _createClippingArea(): void {
    const {
      montageAreaWidth,
      montageAreaHeight
    } = this.options
    const centerPoint = new Point(montageAreaWidth / 2, montageAreaHeight / 2)

    this.canvas.clipPath = addRectangleToCanvas({
      canvas: this.canvas,
      centerPoint,
      options: {
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
      },
      flags: {
        withoutSelection: true,
        withoutAdding: true
      }
    })
  }

  /**
   * Method for removing the editor and all listeners.
   */
  public destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this._rejectInitialization?.(new Error(this.t('editor.errors.destroyed')))
    this._rejectInitialization = undefined

    const cleanupSteps = [
      () => this.workerManager?.terminate(),
      () => this.listeners?.destroy(),
      () => this.historyManager?.destroy(),
      () => this.shapeManager?.destroy(),
      () => this.textManager?.destroy(),
      () => this.selectionManager?.destroy(),
      () => this.snappingManager?.destroy(),
      () => this.measurementManager?.destroy(),
      () => this.toolbar?.destroy(),
      () => this.angleIndicator?.destroy(),
      () => this.objectSizeIndicator?.destroy(),
      () => this.viewportScrollbars?.destroy(),
      () => this.cropManager?.destroy(),
      () => this.canvas?.dispose(),
      () => this._cleanupHostResources?.(),
      () => this.imageManager?.destroy(),
      () => this.errorManager?.cleanBuffer()
    ]

    cleanupSteps.forEach((cleanup) => {
      try {
        // Fabric dispose() may finish asynchronously after a deferred render.
        Promise.resolve(cleanup()).catch((error: unknown) => {
          console.error(this.t('editor.errors.resourceCleanupFailed'), error)
        })
      } catch (error) {
        console.error(this.t('editor.errors.resourceCleanupFailed'), error)
      }
    })
  }

  /**
   * Creates the checkerboard pattern.
   * @returns Checkerboard pattern
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
