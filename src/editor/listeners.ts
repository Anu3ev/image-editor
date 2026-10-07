import { ActiveSelection, FabricObject, Canvas, TPointerEventInfo, TPointerEvent, Textbox } from 'fabric'
import type { EditorOptions } from './types/options'

import { ImageEditor } from '.'

const HISTORY_SAVE_DEBOUNCE_MS = 300
const STANDARD_WHEEL_DELTA = 100
const WHEEL_LINE_DELTA = 16
const MOUSE_WHEEL_ZOOM_CHANGE_PERCENT = 0.05
const TRACKPAD_PINCH_ZOOM_CHANGE_PERCENT = 0.8
const TRACKPAD_PINCH_DELTA_THRESHOLD = 50
const WEBKIT_GESTURE_ZOOM_GAIN = 1

/** Handler with a cancelable deferred invocation. */
type DebouncedHandler<T extends(...args: unknown[]) => unknown> = ((...args: Parameters<T>) => void) & {
  cancel: () => void
}

type CanvasWithTransform = Canvas & {
  _currentTransform?: Record<string, unknown> | null
}

interface CanvasGestureEvent extends Event {
  scale: number
  clientX?: number
  clientY?: number
}

/**
 * Pan gesture point in the DOM event's viewport coordinates.
 */
interface PanPointer {
  x: number
  y: number
}

/**
 * Minimal touch contract needed to calculate the midpoint between two fingers.
 */
interface TouchPointLike {
  clientX: number
  clientY: number
}

/**
 * Minimal mouse/pointer event contract for panning with Space + left mouse button.
 */
interface ClientPointerLike {
  clientX: number
  clientY: number
}

/**
 * Touch event with an indexable list of active touch points.
 */
interface TouchEventWithPoints extends Event {
  touches: ArrayLike<TouchPointLike>
}

class Listeners {
  private _destroyed = false

  /**
   * Reference to the editor containing the canvas.
   */
  editor: ImageEditor

  /**
   * Reference to the Fabric Canvas.
   */
  canvas: Canvas

  /**
   * Listener parameters (options).
   */
  options: Partial<EditorOptions>

  /**
   * Flag indicating that canvas dragging is active.
   * @default false
   */
  private isDragging: boolean = false

  /**
   * Last pan pointer X coordinate while dragging the canvas.
   * Used to calculate horizontal movement during mouse and touch panning.
   * @default 0
   */
  private lastPanPointerX: number = 0

  /**
   * Last pan pointer Y coordinate while dragging the canvas.
   * Used to calculate vertical movement during mouse and touch panning.
   * @default 0
   */
  private lastPanPointerY: number = 0

  /**
   * Last cumulative scale from a WebKit gesture event.
   * Needed only to convert gesturechange into an incremental zoom step.
   * @default 1
   */
  private lastGestureScale: number = 1

  /**
   * Flag indicating that Ctrl+Z/Ctrl+Y is held down.
   * Prevents repeated calls while the keys are held down.
   * @default false
   */
  isUndoRedoKeyPressed: boolean = false

  /**
   * Flag indicating that the space bar is held down.
   * Used to activate canvas dragging mode.
   * @default false
   */
  isSpacePressed: boolean = false

  /**
   * Selection saved before entering canvas dragging mode.
   * Used to restore the selection after releasing the space bar.
   * @default []
   */
  private savedSelection: FabricObject[] = []

  /**
   * Bound event handlers.
   * Used to remove listeners when the instance is destroyed.
   */
  handleContainerResizeBound: ((e: Event) => void) & { cancel: () => void }

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

  handleCanvasWheelInputBound: (event: WheelEvent) => void

  handleCanvasGestureStartBound: (event: Event) => void

  handleCanvasGestureChangeBound: (event: Event) => void

  handleCanvasGestureEndBound: (event: Event) => void

  handleResetObjectFitBound: (options: TPointerEventInfo<TPointerEvent>) => void

  /**
   * Editor options that the user can change.
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
   * The constructor takes the editor and options.
   * @param params
   * @param params.editor – Editor containing the canvas
   * @param params.options — Editor settings (see defaults.js)
   * @param params.options.canvasDragging — Enable canvas dragging
   * @param params.options.mouseWheelZooming — Enable mouse wheel zoom
   * @param params.options.copyObjectsByHotkey — Copy objects with Ctrl+C
   * @param params.options.cutObjectsByHotkey — Cut objects with Ctrl+X
   * @param params.options.duplicateObjectsByHotkey — Duplicate objects with Ctrl+D
   * @param params.options.pasteImageFromClipboard — Paste images and objects from the clipboard
   * @param params.options.undoRedoByHotKeys — Undo/redo with Ctrl+Z/Ctrl+Y
   * @param params.options.selectAllByHotkey — Select all objects with Ctrl+A
   * @param params.options.deleteObjectsByHotkey — Delete objects with Delete
   * @param params.options.resetObjectFitByDoubleClick — Reset object fit on double-click
   * @param params.options.adaptCanvasToContainerOnResize — Adapt the canvas to the container size when the window is resized
   */
  constructor({ editor, options = {} }: { editor: ImageEditor; options?: Partial<EditorOptions> }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.options = options

    // Create and store bound handlers so they can be removed later.
    // Global (DOM) events:
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

    // Canvas (Fabric) events:
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
    this.handleCanvasWheelInputBound = this.handleCanvasWheelInput.bind(this)
    this.handleCanvasGestureStartBound = this.handleCanvasGestureStart.bind(this)
    this.handleCanvasGestureChangeBound = this.handleCanvasGestureChange.bind(this)
    this.handleCanvasGestureEndBound = this.handleCanvasGestureEnd.bind(this)
    this.handleResetObjectFitBound = this.handleResetObjectFit.bind(this)

    this.init()
  }

  /**
   * Initialize all handlers according to the options.
   */
  init(): void {
    if (this._destroyed) return
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

    if (this.options.mouseWheelZooming || this.options.canvasDragging) {
      this.canvas.wrapperEl.addEventListener('wheel', this.handleCanvasWheelInputBound, {
        capture: true,
        passive: false
      })
    }

    if (this.options.mouseWheelZooming) {
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
    // Attach global DOM events:
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
    // Initialize editor history
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
    // Initialize overlayMask events
    this.canvas.on('object:added', this.handleOverlayUpdateBound)
    this.canvas.on('selection:created', this.handleOverlayUpdateBound)
  }

  private _bindBackgroundEvents(): void {
    // Initialize background events
    this.canvas.on('object:added', this.handleBackgroundUpdateBound)
    this.canvas.on('selection:created', this.handleBackgroundUpdateBound)
  }

  /**
   * Handlers for saving editor state to history.
   * Run when objects change (movement, resizing, etc.).
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
   * Records the start of an object transform for correct undo behavior.
   * @param options - Event parameters
   * @param options.target - Object being transformed
   */
  handleObjectTransformStart({ target }: { target?: FabricObject }): void {
    if (!target) return

    this.editor.historyManager.beginAction({ reason: 'object-transform' })
  }

  /**
   * Finishes an object transform.
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
   * Update overlayMask when objects are added or selected.
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

  // --- Global DOM handlers ---

  /**
   * Browser window resize handler.
   * Adapts the canvas camera state to the container dimensions.
   * Derived layers that depend on montageArea and the viewport are synchronized inside CanvasManager.
   */
  handleContainerResize(): void {
    if (this._destroyed) return
    this.editor.canvasManager.updateCanvas()
  }

  /**
   * Handler for Ctrl+C (copy).
   * @param event — Event object
   * @param event.ctrlKey — Whether Ctrl is held down
   * @param event.metaKey — Whether Cmd is held down (on Mac)
   * @param event.code — Key code
   */
  handleCopyEvent(event: KeyboardEvent): void {
    const { ctrlKey, metaKey, code } = event

    if (this._shouldIgnoreKeyboardEvent(event)) return
    if ((!ctrlKey && !metaKey) || code !== 'KeyC') return

    event.preventDefault()
    this.editor.clipboardManager.copy()
  }

  /**
   * Handler for Ctrl+X (cut).
   * @param event — Event object
   * @param event.ctrlKey — Whether Ctrl is held down
   * @param event.metaKey — Whether Cmd is held down (on Mac)
   * @param event.code — Key code
   */
  handleCutEvent(event: KeyboardEvent): void {
    const { ctrlKey, metaKey, code } = event

    if (this._shouldIgnoreKeyboardEvent(event)) return
    if ((!ctrlKey && !metaKey) || code !== 'KeyX') return

    event.preventDefault()
    this.editor.clipboardManager.cut()
  }

  /**
   * Handler for Ctrl+D (duplicate).
   * @param event — Event object
   * @param event.ctrlKey — Whether Ctrl is held down
   * @param event.metaKey — Whether Cmd is held down (on Mac)
   * @param event.code — Key code
   */
  handleDuplicateEvent(event: KeyboardEvent): void {
    const { ctrlKey, metaKey, code } = event

    if (this._shouldIgnoreKeyboardEvent(event)) return
    if ((!ctrlKey && !metaKey) || code !== 'KeyD') return

    event.preventDefault()
    this.editor.clipboardManager.copyPaste()
  }

  /**
   * Handler for pasting an object or image from the clipboard.
   * @param event — Event object
   */
  handlePasteEvent(event: ClipboardEvent): void {
    if (this._shouldIgnoreKeyboardEvent(event)) return

    this.editor.clipboardManager.handlePasteEvent(event)
  }

  /**
   * Handler for undo/redo (Ctrl+Z/Ctrl+Y).
   * @param event — Event object
   * @param event.ctrlKey — Whether Ctrl is held down
   * @param event.metaKey — Whether Cmd is held down (on Mac)
   * @param event.code — Key code
   * Hotkeys are not handled while interactionBlocker is active,
   * because blocking the editor must disable user interaction.
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

    // On Mac, ignore isUndoRedoKeyPressed because macOS does not emit keyup events while Meta is held down.
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
   * Handler for releasing Ctrl+Z/Ctrl+Y.
   * @param event — Event object
   * @param event.code — Key code
   */
  handleUndoRedoKeyUp(event: KeyboardEvent): void {
    if (this._shouldIgnoreKeyboardEvent(event)) return
    if (!['KeyZ', 'KeyY'].includes(event.code)) return

    this.isUndoRedoKeyPressed = false
  }

  /**
   * Handler for selecting all objects (Ctrl+A).
   * @param event — Event object
   * @param event.ctrlKey — Whether Ctrl is held down
   * @param event.metaKey — Whether Cmd is held down (on Mac)
   * @param event.code — Key code
   */
  handleSelectAllEvent(event:KeyboardEvent): void {
    if (this._shouldIgnoreKeyboardEvent(event)) return

    const { ctrlKey, metaKey, code } = event
    if ((!ctrlKey && !metaKey) || code !== 'KeyA') return
    event.preventDefault()
    this.editor.selectionManager.selectAll()
  }

  /**
   * Handler for deleting objects (Delete or Backspace).
   * @param event — Event object
   * @param event.code — Key code
   */
  handleDeleteObjectsEvent(event:KeyboardEvent): void {
    if (this._shouldIgnoreKeyboardEvent(event)) return
    if (event.code !== 'Delete' && event.code !== 'Backspace') return
    event.preventDefault()
    this.editor.deletionManager.deleteSelectedObjects()
  }

  /**
   * Handler for pressing the space bar.
   * Disables object interaction and sets the cursor to "grab" for dragging the canvas.
   * @param event — Event object
   * @param event.code — Key code
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

    // Commit all changes before entering pan mode
    // so temporary selectable/evented values do not enter history.
    if (!editor.historyManager.skipHistory) {
      editor.historyManager.saveState()
    }

    editor.historyManager.suspendHistory()

    this.isSpacePressed = true
    event.preventDefault()

    // Save the current selection
    const activeObject = canvas.getActiveObject() || null

    if (activeObject instanceof ActiveSelection) {
      this.savedSelection = activeObject.getObjects().slice()
    } else if (activeObject) {
      this.savedSelection = [activeObject]
    }

    // Clear the selection as soon as the space bar is pressed
    canvas.discardActiveObject()

    // Set the grab cursor for the entire canvas
    canvas.set({
      selection: false,
      defaultCursor: 'grab'
    })
    canvas.setCursor('grab')

    // Disable object interactivity
    editor.canvasManager.getObjects().forEach((obj) => {
      obj.set({
        selectable: false,
        evented: false
      })
    })

    canvas.requestRenderAll()
  }

  /**
   * Handler for releasing the space bar.
   * Stops canvas dragging if it is active.
   * Restores normal object interaction.
   * @param event — Event object
   * @param event.code — Key code
   */
  handleSpaceKeyUp(event:KeyboardEvent): void {
    const { code } = event
    if (code !== 'Space') return
    if (this._shouldIgnoreKeyboardEvent(event) && !this.isSpacePressed) return

    if (!this.isSpacePressed) return

    this.isSpacePressed = false

    // Stop dragging when the space bar is released
    if (this.isDragging) {
      this.handleCanvasDragEnd()
    }

    // Restore normal canvas behavior
    this.canvas.set({
      defaultCursor: 'default',
      selection: true
    })
    this.canvas.setCursor('default')

    // Restore object interactivity and cursors
    this.editor.canvasManager.getObjects().forEach((obj) => {
      obj.set({
        selectable: true,
        evented: true
      })
    })

    // Restore the saved selection
    this._restoreSelection(this.savedSelection)
    this.savedSelection = []

    this.editor.historyManager.resumeHistory()

    this.canvas.requestRenderAll()
  }

  /**
   * Restores the selection after validating its objects
   * @param selection - Objects whose selection should be restored
   */
  private _restoreSelection(selection: FabricObject[]): void {
    const { canvas, editor } = this

    // If there are no valid objects, do not restore anything
    if (selection.length === 0) return

    // If only one object remains, select it directly
    if (selection.length === 1) {
      canvas.setActiveObject(selection[0])
      return
    }

    // Keep only objects that still exist on the canvas
    const validObjects = selection.filter((obj) => editor.canvasManager.getObjects().includes(obj))

    // Create a new ActiveSelection with the valid objects
    const newSelection = new ActiveSelection(validObjects, { canvas })

    // If at least one object is locked, lock the selection itself too
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
   * Checks whether an object transform is currently in progress on the canvas.
   */
  private _isObjectTransforming(): boolean {
    const { canvas } = this
    const { _currentTransform } = canvas as CanvasWithTransform

    return Boolean(_currentTransform)
  }

  // --- Canvas (Fabric) event handlers ---

  /**
   * Start dragging the canvas.
   * Mouse panning requires Space to be held down; touch panning starts with two fingers without a keyboard.
   * @param options - Pointer event
   * @param options.e — Pointer event object
   */
  handleCanvasDragStart({ e: event }:TPointerEventInfo<TPointerEvent>): void {
    const pointer = this._getPanPointer(event)

    if (!pointer) return

    this.isDragging = true
    this.lastPanPointerX = pointer.x
    this.lastPanPointerY = pointer.y

    if (this._isClientPointerEvent(event)) {
      this.canvas.set('defaultCursor', 'grabbing')
      this.canvas.setCursor('grabbing')
    }
  }

  /**
   * Drag the canvas.
   * Checks whether dragging is allowed at the current zoom and applies pan constraints through panConstraintManager.
   * @param options
   * @param options.e — Event object
   */
  handleCanvasDragging({ e: event }:TPointerEventInfo<TPointerEvent>): void {
    if (!this.isDragging) return

    const pointer = this._getPanPointer(event)

    if (!pointer) return

    const didHandlePan = this.editor.panConstraintManager.applyPanDelta({
      deltaX: pointer.x - this.lastPanPointerX,
      deltaY: pointer.y - this.lastPanPointerY
    })

    if (!didHandlePan) return

    this.lastPanPointerX = pointer.x
    this.lastPanPointerY = pointer.y

    if (event.cancelable) {
      event.preventDefault()
    }
  }

  /**
   * Finish dragging the canvas (mouse:up).
   * Saves the new canvas position.
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
   * Returns the current pan gesture point for the mouse or a two-finger touch.
   * @param event - Pointer event
   * @returns Pan gesture point, or null if the event should not move the viewport
   */
  private _getPanPointer(event: TPointerEvent): PanPointer | null {
    const touchCenter = this._getTwoTouchCenter(event)

    if (touchCenter) return touchCenter
    if (this._isClientPointerEvent(event)) {
      if (!this.isSpacePressed) return null

      return {
        x: event.clientX,
        y: event.clientY
      }
    }

    return null
  }

  /**
   * Checks whether the event contains pointer viewport coordinates.
   */
  private _isClientPointerEvent(event: TPointerEvent): event is TPointerEvent & ClientPointerLike {
    const pointer = event as Partial<ClientPointerLike>

    return typeof pointer.clientX === 'number' && typeof pointer.clientY === 'number'
  }

  /**
   * Calculates the midpoint between two active touch points.
   * @param event - Pointer event
   * @returns Midpoint between two fingers, or null for other touch scenarios
   */
  private _getTwoTouchCenter(event: TPointerEvent): PanPointer | null {
    if (!('touches' in event)) return null

    const { touches } = event as TouchEventWithPoints

    if (touches.length !== 2) return null

    const firstTouch = touches[0]
    const secondTouch = touches[1]

    if (!firstTouch || !secondTouch) return null

    return {
      x: (firstTouch.clientX + secondTouch.clientX) / 2,
      y: (firstTouch.clientY + secondTouch.clientY) / 2
    }
  }

  /**
   * Calculates the zoom step based on the current canvas scale and wheel event type.
   * A regular wheel remains gentle, while small pixel-wheel trackpad events receive a separate gain.
   * @param event - Wheel event
   * @returns Zoom change step
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
   * Normalizes wheel delta to a single scale so pixel/line/page wheel events are treated equally.
   * @param event - Wheel event
   * @param axis - Wheel event axis
   * @returns Normalized delta
   */
  private _normalizeWheelDelta({
    event,
    axis
  }: {
    event: WheelEvent
    axis: 'x' | 'y'
  }): number {
    const delta = axis === 'x' ? event.deltaX : event.deltaY

    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return delta * WHEEL_LINE_DELTA
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      const pageSize = axis === 'x'
        ? this.canvas.getWidth()
        : this.canvas.getHeight()

      return delta * pageSize
    }

    return delta
  }

  /**
   * Normalizes deltaY to a single scale so pixel/line/page wheel events are treated equally.
   * @param event - Wheel event
   * @returns Normalized deltaY
   */
  private _normalizeWheelDeltaY(event: WheelEvent): number {
    return this._normalizeWheelDelta({ event, axis: 'y' })
  }

  /**
   * Distinguishes a trackpad pinch gesture from a regular wheel using small pixel deltas.
   * @param event - Wheel event
   * @returns true if the event resembles a trackpad pinch
   */
  private _isTrackpadPinchWheel(event: WheelEvent): boolean {
    const normalizedDeltaY = Math.abs(this._normalizeWheelDeltaY(event))

    return event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && normalizedDeltaY < TRACKPAD_PINCH_DELTA_THRESHOLD
  }

  /**
   * Converts wheel scrolling to a viewport pan delta.
   * Wheel delta describes viewport scrolling, so viewportTransform moves in the opposite direction.
   * @param event - Wheel event
   * @returns viewportTransform offset for panning
   */
  private _getWheelPanDelta(event: WheelEvent): { deltaX: number; deltaY: number } {
    return {
      deltaX: -this._normalizeWheelDelta({ event, axis: 'x' }),
      deltaY: -this._normalizeWheelDelta({ event, axis: 'y' })
    }
  }

  /**
   * Converts the cumulative scale from gesturechange into an incremental zoom step.
   * @param scale - Current cumulative scale from a WebKit gesture
   * @returns Zoom change step
   */
  private _calculateGestureZoomStep(scale: number): number {
    const currentZoom = this.canvas.getZoom()
    const relativeScale = scale / this.lastGestureScale

    if (!Number.isFinite(relativeScale) || relativeScale <= 0) return 0

    return currentZoom * (relativeScale - 1) * WEBKIT_GESTURE_ZOOM_GAIN
  }

  /**
   * Checks whether a DOM event actually contains a WebKit gesture scale.
   * @param event - DOM event
   * @returns true if the event can be treated as a CanvasGestureEvent
   */
  private _isCanvasGestureEvent(event: Event): event is CanvasGestureEvent {
    return 'scale' in event && typeof event.scale === 'number'
  }

  /**
   * Returns the DOM coordinates of a gesture event.
   * If the browser did not provide clientX/clientY, uses the center of the canvas wrapper element.
   * @param event - WebKit gesture event
   * @returns DOM coordinates for pointer zoom
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
   * Wheel handler at the canvas DOM boundary.
   * Ctrl/Cmd + wheel remains a zoom interaction, while wheel without modifiers
   * is used for panning via two-finger trackpad scrolling.
   */
  handleCanvasWheelInput(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) {
      this._handleCanvasWheelPan(event)
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const scaleAdjustment = this._calculateAdaptiveZoomStep(event)

    this.editor.zoomManager.handlePointerZoom(scaleAdjustment, event)
  }

  /**
   * Applies wheel input without Ctrl/Cmd as a pan event.
   * @param event - Wheel event
   */
  private _handleCanvasWheelPan(event: WheelEvent): void {
    if (!this.options.canvasDragging) return

    const didHandlePan = this.editor.panConstraintManager.applyPanDelta(this._getWheelPanDelta(event))

    if (!didHandlePan) return

    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Start of a WebKit gesture event.
   * This is a fallback path for Safari/macOS, where pinch may not arrive through wheel events.
   * @param event - gesturestart DOM event
   */
  handleCanvasGestureStart(event: Event): void {
    if (!this._isCanvasGestureEvent(event)) return

    event.preventDefault()
    event.stopPropagation()

    this.lastGestureScale = event.scale > 0 ? event.scale : 1
  }

  /**
   * WebKit gesturechange handler.
   * GestureEvent.scale is cumulative, so it is converted here into an incremental zoom step.
   * @param event - gesturechange DOM event
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
   * End of a WebKit gesture event.
   */
  handleCanvasGestureEnd(event: Event): void {
    if (this._isCanvasGestureEvent(event)) {
      event.preventDefault()
      event.stopPropagation()
    }

    this.lastGestureScale = 1
  }

  /**
   * Handler for resetting an object or active crop frame on double-click.
   * @param options - Fabric event object
   */
  handleResetObjectFit(options: TPointerEventInfo<TPointerEvent>): void {
    const { target, e } = options
    const isCtrlPressed = Boolean(e && (e.ctrlKey || e.metaKey))

    if (isCtrlPressed) return

    const cropResetState = this.editor.cropManager.resetFrameToSource({ target })

    if (cropResetState) return
    if (!target || target instanceof Textbox || Boolean(target.shapeComposite)) return

    this.editor.transformManager.resetObject({ object: target })
  }

  /**
   * Checks whether the keyboard event should be ignored
   * Returns true if focus is in an input field or an element matching the ignored selectors
   * @param event - Keyboard event
   * @returns true if the event should be ignored
   */
  _shouldIgnoreKeyboardEvent(event: KeyboardEvent | ClipboardEvent): boolean {
    // Use document.activeElement as the primary way to determine the current element
    // because event.target may point to the dialog root element
    const activeElement = document.activeElement as HTMLElement
    const eventTarget = event.target as HTMLElement

    // Check standard input elements for both elements
    const inputTypes = ['input', 'textarea', 'select']

    // Check eventTarget
    if (eventTarget) {
      const eventTagName = eventTarget.tagName.toLowerCase()

      // For a paste event: if eventTarget is an input/select/textarea,
      // also check activeElement
      if (event.type === 'paste' && inputTypes.includes(eventTagName)) {
        // If activeElement is also an input/select/textarea, ignore the event
        // If activeElement is body/canvas, do NOT ignore it
        const activeTagName = activeElement?.tagName.toLowerCase()
        if (activeTagName && inputTypes.includes(activeTagName)) return true
        return false
      }

      // For other events (not paste), check as usual
      if (inputTypes.includes(eventTagName)) {
        return true
      }
      if (eventTarget.contentEditable === 'true') {
        return true
      }
    }

    // Check activeElement if it differs from eventTarget
    if (activeElement && activeElement !== eventTarget) {
      const activeTagName = activeElement.tagName.toLowerCase()
      if (inputTypes.includes(activeTagName)) return true
      if (activeElement.contentEditable === 'true') return true
    }

    // Check text selection: if there is selected text, check its context
    const selection = window.getSelection()

    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const commonAncestor = range.commonAncestorContainer

      // Get the selected text's container element
      let selectionContainer: Node | null = commonAncestor
      if (selectionContainer.nodeType === Node.TEXT_NODE) {
        selectionContainer = selectionContainer.parentElement
      }

      // Check whether the selected text is inside any ignored selectors
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
   * Method for removing all listeners
   */
  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this.handleContainerResizeBound.cancel()

    // Global DOM handlers
    window.removeEventListener('resize', this.handleContainerResizeBound, { capture: true })
    document.removeEventListener('keydown', this.handleCopyEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleCutEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleDuplicateEventBound, { capture: true })
    document.removeEventListener('paste', this.handlePasteEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleUndoRedoEventBound, { capture: true })
    document.removeEventListener('keyup', this.handleUndoRedoKeyUpBound, { capture: true })
    document.removeEventListener('keydown', this.handleSelectAllEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleDeleteObjectsEventBound, { capture: true })

    // Canvas (Fabric) handlers:
    if (this.options.canvasDragging) {
      this.canvas.off('mouse:down', this.handleCanvasDragStartBound)
      this.canvas.off('mouse:move', this.handleCanvasDraggingBound)
      this.canvas.off('mouse:up', this.handleCanvasDragEndBound)

      document.removeEventListener('keydown', this.handleSpaceKeyDownBound, { capture: true })
      document.removeEventListener('keyup', this.handleSpaceKeyUpBound, { capture: true })
    }
    if (this.options.mouseWheelZooming || this.options.canvasDragging) {
      this.canvas.wrapperEl.removeEventListener('wheel', this.handleCanvasWheelInputBound, {
        capture: true
      })
    }

    if (this.options.mouseWheelZooming) {
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
   * Debounce to reduce the function call frequency.
   * @param fn — Handler function
   * @param delay — Delay in milliseconds
   * @returns A new handler wrapper
   */
  static debounce<T extends(...args: unknown[]) => unknown>(fn: T, delay: number): DebouncedHandler<T> {
    let timer: ReturnType<typeof setTimeout> | null = null
    const cancel = (): void => {
      if (timer !== null) clearTimeout(timer)
      timer = null
    }
    const debounced = function(this: ThisParameterType<T>, ...args: Parameters<T>): void {
      cancel()
      timer = setTimeout(() => {
        timer = null
        fn.apply(this, args)
      }, delay)
    }

    return Object.assign(debounced, { cancel })
  }
}

export default Listeners
