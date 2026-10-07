import {
  ActiveSelection,
  type CanvasEvents,
  type CanvasOptions,
  type FabricObject,
  type TPointerEvent,
  type TPointerEventInfo,
  type Transform
} from 'fabric'
import { ImageEditor } from '../index'
import ActiveSelectionScaleInteractionController, {
  type ActiveSelectionShapeCommitMode
} from './scaling/active-selection-scale-interaction-controller'
import type {
  ActiveSelectionScaleInteractionEvent
} from './scaling/active-selection-scale-session'

type TextEditingEnteredEvent = CanvasEvents['text:editing:entered']
type TextEditingExitedEvent = CanvasEvents['text:editing:exited']

export default class SelectionManager {
  /**
   * Reference to the editor containing the canvas.
   */
  public editor: ImageEditor

  /**
   * Keys for multiselection on the canvas.
   */
  private selectionKey: CanvasOptions['selectionKey']

  /**
   * Last active selection on the canvas.
   * Used for restoration when the selection is cleared while Ctrl/Cmd is held down.
   */
  private lastSelection: FabricObject[] = []

  /**
   * Flag indicating that area selection with Ctrl/Cmd held down is active.
   */
  private isCtrlSelectionBoxActive: boolean = false

  /**
   * Flag preventing repeated selection merging.
   */
  private isSelectionMergeInProgress: boolean = false

  /** Controls unified scaling of supported active selections. */
  private readonly scaleInteractionController: ActiveSelectionScaleInteractionController

  /**
   * Handler for entering text editing.
   */
  private handleTextEditingEnteredBound: (event: TextEditingEnteredEvent) => void

  /**
   * Handler for exiting text editing.
   */
  private handleTextEditingExitedBound: (event: TextEditingExitedEvent) => void

  /**
   * Handler for filtering locked selections.
   */
  private handleLockedSelectionBound: (options: {
    selected: FabricObject[]
    deselected?: FabricObject[]
    e?: TPointerEvent
  }) => void

  /**
   * Handler for merging selections during area selection.
   */
  private handleSelectionMergeBound: (options: { selected: FabricObject[], e?: TPointerEvent }) => void

  /**
   * Handler for saving the active selection.
   */
  private handleSelectionChangeBound: () => void

  /**
   * Handler for restoring the selection after clicking an empty area.
   */
  private handleSelectionClearedBound: ({ e }: { e?: TPointerEvent }) => void

  /**
   * Handler for starting area selection.
   */
  private handleSelectionBoxStartBound: (options: TPointerEventInfo<TPointerEvent>) => void

  /**
   * Handler for ending area selection.
   */
  private handleSelectionBoxEndBound: (options: TPointerEventInfo<TPointerEvent>) => void

  /** Creates the selection manager and attaches its handlers to the canvas. */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.scaleInteractionController = new ActiveSelectionScaleInteractionController({ editor })

    this.selectionKey = this._resolveSelectionKey()

    this.handleTextEditingEnteredBound = this._handleTextEditingEntered.bind(this)
    this.handleTextEditingExitedBound = this._handleTextEditingExited.bind(this)
    this.handleLockedSelectionBound = this._filterLockedSelection.bind(this)
    this.handleSelectionMergeBound = this._handleSelectionMerge.bind(this)
    this.handleSelectionChangeBound = this._handleSelectionChange.bind(this)
    this.handleSelectionClearedBound = this._handleSelectionCleared.bind(this)
    this.handleSelectionBoxStartBound = this._handleSelectionBoxStart.bind(this)
    this.handleSelectionBoxEndBound = this._handleSelectionBoxEnd.bind(this)

    this.scaleInteractionController.bind()
    this._applySelectionKey({ selectionKey: this.selectionKey })
    this._bindEvents()
  }

  /**
   * Select all objects
   * @fires editor:all-objects-selected
   */
  public selectAll(): void {
    const { canvas, canvasManager, objectLockManager } = this.editor

    canvas.discardActiveObject()

    const activeObjects = canvasManager.getObjects()
    const hasLockedObjects = activeObjects.some((obj) => obj.locked)

    const object = activeObjects.length > 1
      ? new ActiveSelection(canvasManager.getObjects(), { canvas })
      : activeObjects[0]

    // If there are locked objects, lock the selected object
    if (hasLockedObjects) {
      objectLockManager.lockObject({ object, skipInnerObjects: true, withoutSave: true })
    }

    canvas.setActiveObject(object)
    canvas.requestRenderAll()

    canvas.fire('editor:all-objects-selected', { selected: object })
  }

  /** Passes a shape selection scaling step to the unified owner before the legacy handler runs. */
  public handleShapeSelectionScaleStep({
    event,
    intentSource
  }: {
    event: ActiveSelectionScaleInteractionEvent
    intentSource: 'fabric-preview' | 'pointer-projection'
  }): boolean {
    if (!(event.target instanceof ActiveSelection) || !event.transform) return false

    return this.scaleInteractionController.handleShapeSelectionScaleStep({
      event,
      intentSource
    })
  }

  /** Commits shapes without allowing internal selection change events to interrupt the session. */
  public commitShapeSelectionScale({
    selection,
    commit
  }: {
    selection: ActiveSelection
    commit: (mode: ActiveSelectionShapeCommitMode) => void
  }): boolean {
    const mode = this.scaleInteractionController.beginShapeSelectionCommit({ selection })
    if (!mode) return false

    let didFinish = false

    try {
      commit(mode)
    } finally {
      didFinish = this.scaleInteractionController.finishShapeSelectionCommit({ selection })
    }

    if (!didFinish) {
      throw new Error(this.editor.t('selection.errors.shapeScaleSessionNotFinished'))
    }

    return true
  }

  /** Commits a selection containing text and all connected domains within a single shared session. */
  public commitTextSelectionScale({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform?: Transform | null
  }): boolean {
    return this.scaleInteractionController.commitTextDrivenSelectionScale({ selection, transform })
  }

  /** Checks whether ShapeManager should skip a separate commit of the full mixed composition. */
  public shouldSkipShapeSelectionScaleCommit({
    selection
  }: {
    selection: ActiveSelection
  }): boolean {
    return this.scaleInteractionController.shouldSkipShapeSelectionCommit({ selection })
  }

  /**
   * Removes SelectionManager subscriptions.
   */
  public destroy(): void {
    const { canvas } = this.editor
    this.scaleInteractionController.destroy()
    canvas.off('mouse:down', this.handleSelectionBoxStartBound)
    canvas.off('mouse:up', this.handleSelectionBoxEndBound)
    canvas.off('text:editing:entered', this.handleTextEditingEnteredBound)
    canvas.off('text:editing:exited', this.handleTextEditingExitedBound)
    canvas.off('selection:created', this.handleSelectionMergeBound)
    canvas.off('selection:updated', this.handleSelectionMergeBound)
    canvas.off('selection:created', this.handleLockedSelectionBound)
    canvas.off('selection:updated', this.handleLockedSelectionBound)
    canvas.off('selection:created', this.handleSelectionChangeBound)
    canvas.off('selection:updated', this.handleSelectionChangeBound)
    canvas.off('selection:cleared', this.handleSelectionClearedBound)
  }

  /**
   * Assigns the multiselection key.
   */
  private _applySelectionKey({ selectionKey }: { selectionKey: CanvasOptions['selectionKey'] }): void {
    const { canvas } = this.editor
    canvas.selectionKey = selectionKey
  }

  /**
   * Subscribes to text editing and object selection events.
   */
  private _bindEvents(): void {
    const { canvas } = this.editor
    canvas.on('text:editing:entered', this.handleTextEditingEnteredBound)
    canvas.on('text:editing:exited', this.handleTextEditingExitedBound)
    canvas.on('mouse:down', this.handleSelectionBoxStartBound)
    canvas.on('mouse:up', this.handleSelectionBoxEndBound)
    canvas.on('selection:created', this.handleSelectionMergeBound)
    canvas.on('selection:updated', this.handleSelectionMergeBound)
    canvas.on('selection:created', this.handleLockedSelectionBound)
    canvas.on('selection:updated', this.handleLockedSelectionBound)
    canvas.on('selection:created', this.handleSelectionChangeBound)
    canvas.on('selection:updated', this.handleSelectionChangeBound)
    canvas.on('selection:cleared', this.handleSelectionClearedBound)
  }

  /**
   * Disables multiselection when entering text editing mode.
   */
  private _handleTextEditingEntered(_event: TextEditingEnteredEvent): void {
    this._applySelectionKey({ selectionKey: null })
  }

  /**
   * Restores multiselection after exiting text editing mode.
   */
  private _handleTextEditingExited(_event: TextEditingExitedEvent): void {
    const { selectionKey } = this
    this._applySelectionKey({ selectionKey })
  }

  /**
   * Removes locked objects from a multi-object selection.
   * @param params - Event parameters
   * @param params.selected - Array of selected objects
   * @param params.e - Pointer event (optional)
   */
  private _filterLockedSelection({ selected, e }: { selected: FabricObject[], e?: TPointerEvent }): void {
    const { editor } = this
    const { canvas } = editor

    // Do nothing if this is not a mouse event
    if (!(e instanceof MouseEvent)) return

    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    const currentSelection = SelectionManager._collectSelectionObjects({ activeObject })
    if (currentSelection.length <= 1) return

    const { lockedObjects, unlockedObjects } = SelectionManager._splitLockedObjects({ objects: currentSelection })

    // Do nothing if there are no locked objects
    if (lockedObjects.length === 0) return

    if (unlockedObjects.length > 0) {
      const addedObjects = selected ?? []
      const shouldKeepLocked = SelectionManager._shouldKeepLockedSelection({
        addedObjects,
        currentSelection,
        pointerEvent: e
      })

      if (shouldKeepLocked) {
        this._applySelectionObjects({ objects: lockedObjects })
        canvas.requestRenderAll()
        return
      }

      this._applySelectionObjects({ objects: unlockedObjects })
      canvas.requestRenderAll()
      return
    }

    this._applySelectionObjects({ objects: lockedObjects })
    canvas.requestRenderAll()
  }

  /**
   * Merges selections during area selection with Ctrl/Cmd held down.
   * @param params - Event parameters
   * @param params.selected - Array of newly selected objects
   * @param params.e - Pointer event (optional)
   */
  private _handleSelectionMerge({
    selected,
    e
  }: {
    selected: FabricObject[]
    e?: TPointerEvent
  }): void {
    const { canvas } = this.editor
    const { lastSelection, isCtrlSelectionBoxActive, isSelectionMergeInProgress } = this

    if (isSelectionMergeInProgress) return
    if (!isCtrlSelectionBoxActive) return
    if (!(e instanceof MouseEvent)) return

    const { ctrlKey, metaKey } = e
    const isMultiSelectKeyPressed = Boolean(ctrlKey || metaKey)

    if (!isMultiSelectKeyPressed) return
    if (lastSelection.length === 0) return
    if (selected.length === 0) return

    const activeObject = canvas.getActiveObject()
    const currentSelection = SelectionManager._collectSelectionObjects({ activeObject })

    if (currentSelection.length === 0) return

    const baseSelection = lastSelection
    const baseLockedOnly = SelectionManager._isSelectionLockedOnly({ objects: baseSelection })
    const addedSelection = baseLockedOnly
      ? SelectionManager._filterLockedSelectionObjects({ objects: currentSelection })
      : currentSelection

    const mergedSelection = SelectionManager._mergeSelections({
      baseSelection,
      addedSelection
    })

    const selectionIsSame = SelectionManager._areSelectionsEqual({
      left: mergedSelection,
      right: currentSelection
    })

    if (selectionIsSame) {
      this.isCtrlSelectionBoxActive = false
      return
    }

    this.isSelectionMergeInProgress = true
    this._applySelectionObjects({ objects: mergedSelection })
    canvas.requestRenderAll()
    this.isSelectionMergeInProgress = false
    this.isCtrlSelectionBoxActive = false
  }

  /**
   * Handles the start of area selection with Ctrl/Cmd held down.
   * @param options - Fabric event object
   */
  private _handleSelectionBoxStart({ e, target }: TPointerEventInfo<TPointerEvent>): void {
    if (!(e instanceof MouseEvent)) return
    if (target) return

    const { editor } = this
    const { canvas, textManager } = editor

    if (!canvas.selection) return
    if (textManager.isTextEditingActive) return

    const { ctrlKey, metaKey } = e
    const isMultiSelectKeyPressed = Boolean(ctrlKey || metaKey)

    if (!isMultiSelectKeyPressed) return

    const activeObject = canvas.getActiveObject()
    const selection = SelectionManager._collectSelectionObjects({ activeObject })

    this.lastSelection = selection.slice()
    this.isCtrlSelectionBoxActive = selection.length > 0
  }

  /**
   * Resets the flag for area selection with Ctrl/Cmd held down.
   * @param options - Fabric event object
   */
  private _handleSelectionBoxEnd({ e }: TPointerEventInfo<TPointerEvent>): void {
    if (!(e instanceof MouseEvent)) return

    this.isCtrlSelectionBoxActive = false
  }

  /**
   * Saves the current selection for possible restoration.
   */
  private _handleSelectionChange(): void {
    const { canvas } = this.editor
    const activeObject = canvas.getActiveObject()
    const selection = SelectionManager._collectSelectionObjects({ activeObject })
    this.lastSelection = selection.slice()
  }

  /**
   * Restores the selection when clicking an empty area with Ctrl/Cmd held down.
   * @param params - Event parameters
   * @param params.e - Pointer event (optional)
   */
  private _handleSelectionCleared({ e }: { e?: TPointerEvent }): void {
    const { lastSelection } = this

    if (lastSelection.length === 0) return

    if (!(e instanceof MouseEvent)) {
      this.lastSelection = []
      return
    }

    const { ctrlKey, metaKey } = e
    const isMultiSelectKeyPressed = Boolean(ctrlKey || metaKey)

    if (!isMultiSelectKeyPressed) {
      this.lastSelection = []
      return
    }

    const filteredSelection = this._filterExistingObjects({ objects: lastSelection })
    if (filteredSelection.length === 0) {
      this.lastSelection = []
      return
    }

    this._applySelectionObjects({ objects: filteredSelection })
  }

  /**
   * Collects the active selection's objects.
   */
  private static _collectSelectionObjects({ activeObject }: { activeObject?: FabricObject | null }): FabricObject[] {
    if (!activeObject) return []

    if (activeObject instanceof ActiveSelection) {
      return activeObject.getObjects()
    }

    return [activeObject]
  }

  /**
   * Checks whether the set contains only locked objects.
   */
  private static _isSelectionLockedOnly({ objects }: { objects: FabricObject[] }): boolean {
    if (objects.length === 0) return false

    for (const object of objects) {
      if (!object.locked) return false
    }

    return true
  }

  /**
   * Keeps only locked objects in the set.
   */
  private static _filterLockedSelectionObjects({ objects }: { objects: FabricObject[] }): FabricObject[] {
    const lockedObjects: FabricObject[] = []

    for (const object of objects) {
      if (!object.locked) continue
      lockedObjects.push(object)
    }

    return lockedObjects
  }

  /**
   * Filters for objects that still exist on the canvas.
   */
  private _filterExistingObjects({ objects }: { objects: FabricObject[] }): FabricObject[] {
    const { canvasManager } = this.editor
    const canvasObjects = canvasManager.getObjects()
    const validObjects: FabricObject[] = []

    for (const object of objects) {
      if (!canvasObjects.includes(object)) continue
      validObjects.push(object)
    }

    return validObjects
  }

  /**
   * Checks whether two sets are equal regardless of order.
   */
  private static _areSelectionsEqual({
    left,
    right
  }: {
    left: FabricObject[]
    right: FabricObject[]
  }): boolean {
    if (left.length !== right.length) return false
    if (left.length === 0) return true

    for (const object of left) {
      if (!right.includes(object)) return false
    }

    return true
  }

  /**
   * Merges object lists without duplicates.
   */
  private static _mergeSelections({
    baseSelection,
    addedSelection
  }: {
    baseSelection: FabricObject[]
    addedSelection: FabricObject[]
  }): FabricObject[] {
    const mergedSelection: FabricObject[] = []

    for (const object of baseSelection) {
      if (!mergedSelection.includes(object)) {
        mergedSelection.push(object)
      }
    }

    for (const object of addedSelection) {
      if (!mergedSelection.includes(object)) {
        mergedSelection.push(object)
      }
    }

    return mergedSelection
  }

  /**
   * Splits objects into locked and editable objects.
   */
  private static _splitLockedObjects({
    objects
  }: {
    objects: FabricObject[]
  }): { lockedObjects: FabricObject[]; unlockedObjects: FabricObject[] } {
    const lockedObjects: FabricObject[] = []
    const unlockedObjects: FabricObject[] = []

    for (const object of objects) {
      if (object.locked) {
        lockedObjects.push(object)
        continue
      }

      unlockedObjects.push(object)
    }

    return { lockedObjects, unlockedObjects }
  }

  /**
   * Determines whether to retain only the locked selection when attempting to add regular objects.
   */
  private static _shouldKeepLockedSelection({
    addedObjects,
    currentSelection,
    pointerEvent
  }: {
    addedObjects: FabricObject[]
    currentSelection: FabricObject[]
    pointerEvent: MouseEvent
  }): boolean {
    const { ctrlKey, metaKey } = pointerEvent
    const isMultiSelectKeyPressed = Boolean(ctrlKey || metaKey)

    if (!isMultiSelectKeyPressed) return false
    if (addedObjects.length === 0) return false

    let addedHasUnlocked = false
    for (const object of addedObjects) {
      if (!object.locked) {
        addedHasUnlocked = true
        break
      }
    }

    if (!addedHasUnlocked) return false

    const previousSelection: FabricObject[] = []
    for (const object of currentSelection) {
      if (!addedObjects.includes(object)) {
        previousSelection.push(object)
      }
    }

    if (previousSelection.length === 0) return false

    for (const object of previousSelection) {
      if (!object.locked) return false
    }

    return true
  }

  /**
   * Applies the selection and locks it if it contains locked objects.
   */
  private _applySelectionObjects({ objects }: { objects: FabricObject[] }): void {
    const { editor } = this
    const { canvas, objectLockManager } = editor
    const validObjects = this._filterExistingObjects({ objects })

    if (validObjects.length === 0) return

    if (validObjects.length === 1) {
      canvas.setActiveObject(validObjects[0])
      return
    }

    const selection = new ActiveSelection(validObjects, { canvas })
    const hasLockedObjects = SelectionManager._hasLockedObjects({ objects: validObjects })

    if (hasLockedObjects) {
      objectLockManager.lockObject({
        object: selection,
        skipInnerObjects: true,
        withoutSave: true
      })
    }

    canvas.setActiveObject(selection)
  }

  /**
   * Checks whether any of the objects are locked.
   */
  private static _hasLockedObjects({ objects }: { objects: FabricObject[] }): boolean {
    for (const object of objects) {
      if (object.locked) return true
    }

    return false
  }

  /**
   * Determines the multiselection keys.
   */
  private _resolveSelectionKey(): CanvasOptions['selectionKey'] {
    const { options } = this.editor
    const { selectionKey } = options

    if (selectionKey !== undefined) return selectionKey

    return ['ctrlKey', 'metaKey']
  }
}
