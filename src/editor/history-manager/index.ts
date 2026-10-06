// TODO: Clean up console logs when everything is ready.
import {
  Canvas,
  FabricObject,
  FabricImage,
  Rect
} from 'fabric'
import { create as diffPatchCreate } from 'jsondiffpatch/with-text-diffs'
import type { DiffPatcher, Delta } from 'jsondiffpatch'
import { nanoid } from 'nanoid'
import type { ImageEditor } from '../index'
import type {
  HistoryChangedAction,
  HistoryChangedPayload
} from '../types/events'
import { OBJECT_SERIALIZATION_PROPS } from './constants'
import {
  areStatesEqual,
  prepareStatesForDiff
} from './diff-normalization'
import {
  applyCustomDataFromState,
  createLoadSafeState
} from './load-state'
import { withNormalizedInteractivityForSnapshot } from './snapshot-interactivity'
import type { CanvasFullState } from './types'

export { OBJECT_SERIALIZATION_PROPS } from './constants'
export type { CanvasFullState } from './types'

/**
 * Result of an attempt to save serialized state to history.
 */
type HistorySaveResult = {
  saved: true
  patchId: string
} | {
  saved: false
}

export default class HistoryManager {
  private _destroyed = false

  /** Cancels Fabric object loading when the editor is destroyed. */
  private readonly _loadAbortController = new AbortController()

  /**
   * Editor instance with access to the canvas
   */
  public editor: ImageEditor

  /**
   * Object representing the current canvas state from which diffs are calculated
   */
  public canvas: Canvas

  /**
   * Base canvas state from which diffs are calculated.
   * This state is saved on the first saveState call and is used to create diffs between the current canvas state and the base state.
   */
  public baseState: CanvasFullState | null

  /**
   * Array of diffs representing changes from the base state.
   */
  public patches: { id: string; diff: Delta }[]

  /**
   * Current position in the change history.
   * This is an index in the patches array pointing to the last saved state.
   * If currentIndex = 0, this is the base state.
   * If currentIndex = patches.length, this is the latest saved state.
   */
  public currentIndex: number

  /**
   * Maximum history length.
   * When the number of saved changes exceeds this value, older changes are removed and the base state is updated.
   * This limits the history size and prevents memory exhaustion.
   */
  public maxHistoryLength: number

  /**
   * Total number of changes made in the editor.
   * This value increases on each saveState call and is used to track the number of changes.
   * The counter increases each time state is saved, even when the number of changes exceeds maxHistoryLength. When undo brings currentIndex back to zero, this indicates whether the editor state has changed.
   */
  public totalChangesCount: number

  /**
   * Number of changes that have been "folded" into the base state.
   * This value increases when the change history becomes too long and the base state is updated.
   * It tracks how many changes have been made since the last base state update.
   * For example, if maxHistoryLength = 10 and the history contained 15 changes, baseStateChangesCount will be 5.
   */
  public baseStateChangesCount: number

  /**
   * DiffPatcher is a library for creating and applying diffs between objects.
   * It is used to calculate changes between the current canvas state and the base state.
   * DiffPatcher allows changes to be saved and restored efficiently and manages the editor's change history.
   */
  public diffPatcher!: DiffPatcher

  /**
   * Flag indicating that state is currently being saved.
   * Used to block undo/redo while changes are being committed.
   */
  private _isSavingState: boolean

  /**
   * History suspension counter. If greater than 0, history saving (saveHistory) is skipped.
   */
  private _historySuspendCount: number

  /**
   * Flag for an active user action (moving/scaling/editing text).
   */
  private _isActionInProgress: boolean

  /**
   * State snapshot at the start of the action, used for cancellation.
   */
  private _actionSnapshot: CanvasFullState | null

  /**
   * Reason for the active action (for debugging).
   */
  private _actionReason: string | null

  /**
   * Deferred state save timer.
   */
  private _pendingSaveTimeoutId: ReturnType<typeof setTimeout> | null

  /**
   * Reason for the deferred state save.
   */
  private _pendingSaveReason: string | null

  /**
   * State snapshot that has already completed the previous action
   * but has not yet been committed as a separate history step.
   */
  private _pendingCommittedState: CanvasFullState | null

  /**
   * Reason for the staged state snapshot.
   */
  private _pendingCommittedStateReason: string | null

  /**
   * Flag for a deferred save while the UI is blocked.
   */
  private _hasDeferredSaveAfterUnblock: boolean

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this._isSavingState = false
    this._historySuspendCount = 0
    this._isActionInProgress = false
    this._actionSnapshot = null
    this._actionReason = null
    this._pendingSaveTimeoutId = null
    this._pendingSaveReason = null
    this._pendingCommittedState = null
    this._pendingCommittedStateReason = null
    this._hasDeferredSaveAfterUnblock = false
    this.baseState = null
    this.patches = []
    this.currentIndex = 0
    this.maxHistoryLength = editor.options.maxHistoryLength

    // Total number of changes made
    this.totalChangesCount = 0
    // Number of changes "folded" into the base state
    this.baseStateChangesCount = 0

    this._createDiffPatcher()
  }

  /** Cancels deferred work without saving the state of the canvas being destroyed. */
  public destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this._loadAbortController.abort()
    this._clearPendingSave()
    this._clearPendingCommittedState()
    this._clearPendingAction()
    this._hasDeferredSaveAfterUnblock = false
  }

  /** Check whether history saving should be skipped */
  public get skipHistory(): boolean {
    return this._destroyed || this._historySuspendCount > 0 || this._isSavingState
  }

  public get lastPatch(): { id: string; diff: Delta } | null {
    return this.patches[this.currentIndex - 1] || null
  }

  private _createDiffPatcher(): void {
    this.diffPatcher = diffPatchCreate({
      objectHash(obj: object) {
        const fabricObj = obj as FabricObject

        // Serialize styles to a JSON string for correct comparison
        const objectHash = JSON.stringify(fabricObj)

        return [objectHash].join('-')
      },

      arrays: {
        detectMove: true,
        includeValueOnMove: false
      },

      textDiff: {
        minLength: 60
      }
    })
  }

  /** Increment the history suspension counter */
  public suspendHistory(): void {
    this._historySuspendCount += 1
  }

  /** Decrement the history suspension counter */
  public resumeHistory(): void {
    this._historySuspendCount = Math.max(0, this._historySuspendCount - 1)
  }

  /**
   * Stores the state for canceling the active action.
   * @param reason - Reason for starting the action
   */
  public beginAction({ reason }: { reason: string }): void {
    if (this._isActionInProgress) return
    if (this.skipHistory) return

    this._isActionInProgress = true
    this._actionReason = reason
    this._actionSnapshot = this._captureCurrentState()
  }

  /**
   * Finishes the active action and clears the snapshot.
   * @param reason - Reason for finishing (optional)
   */
  public endAction({ reason }: { reason?: string } = {}): void {
    if (!this._isActionInProgress) return
    if (reason && this._actionReason && reason !== this._actionReason) return

    this._clearPendingAction()
  }

  /**
   * Schedules a deferred state save.
   * @param delayMs - Delay before saving
   * @param reason - Reason for saving
   */
  public scheduleSaveState({ delayMs, reason }: { delayMs: number; reason: string }): void {
    if (this._destroyed) return
    this._clearPendingSave()

    this._pendingSaveReason = reason
    this._pendingSaveTimeoutId = setTimeout(this._handlePendingSaveTimeout.bind(this), delayMs)
  }

  /**
   * Forces the deferred state to be saved.
   * @param options - Additional flush conditions
   * @param options.reason - If provided, flushes only when the reason matches
   */
  public flushPendingSave({ reason }: { reason?: string } = {}): boolean {
    if (this._pendingSaveTimeoutId === null) return false
    if (reason && this._pendingSaveReason !== reason) return false

    this._clearPendingSave()
    this.saveState()
    return true
  }

  /**
   * Stores the current canonical state as an already completed action boundary.
   * The next saveState first saves this snapshot, then the current canvas state.
   */
  public stageCurrentStateForPendingSave({ reason }: { reason: string }): void {
    if (this.skipHistory) return

    this._pendingCommittedState = this._captureCurrentState()
    this._pendingCommittedStateReason = reason
  }

  /**
   * Checks whether the editor has unsaved changes
   */
  public hasUnsavedChanges(): boolean {
    return this.totalChangesCount > 0
  }

  /**
   * Gets the current position in the overall change history
   */
  public getCurrentChangePosition(): number {
    return this.baseStateChangesCount + this.currentIndex
  }

  /**
   * Checks whether the editor UI is blocked.
   */
  private _isUiBlocked(): boolean {
    const { interactionBlocker } = this.editor
    if (!interactionBlocker) return false

    return interactionBlocker.isBlocked
  }

  /**
   * Marks the state to be saved after the UI is unblocked.
   */
  private _deferSaveAfterUiUnblock(): void {
    this._hasDeferredSaveAfterUnblock = true
  }

  /**
   * Performs the deferred save after the UI is unblocked.
   */
  public flushDeferredSaveAfterUnblock(): boolean {
    if (!this._hasDeferredSaveAfterUnblock) return false
    if (this._isUiBlocked()) return false
    if (this.skipHistory) return false

    this._hasDeferredSaveAfterUnblock = false
    this.saveState()

    return true
  }

  /**
   * Get the full state by applying all diffs to the base state.
   */
  public getFullState(): CanvasFullState {
    const { baseState, currentIndex, patches } = this

    // Deep copy of the base state
    let state = JSON.parse(JSON.stringify(baseState))
    // Apply all diffs up to the current index
    for (let i = 0; i < currentIndex; i += 1) {
      state = this.diffPatcher.patch(state, patches[i].diff)
    }

    console.log('getFullState state', state)
    return state
  }

  /**
   * Returns the current canvas state with objects temporarily unlocked.
   */
  private _captureCurrentState(): CanvasFullState {
    return withNormalizedInteractivityForSnapshot({
      canvas: this.canvas,
      callback: () => this._serializeCanvasState()
    })
  }

  /**
   * Serializes the current canvas state.
   */
  private _serializeCanvasState(): CanvasFullState {
    const { canvas } = this
    return canvas.toDatalessObject([...OBJECT_SERIALIZATION_PROPS]) as CanvasFullState
  }

  /**
   * Handles the deferred save timer firing.
   */
  private _handlePendingSaveTimeout(): void {
    if (this._pendingSaveTimeoutId === null) return

    this._pendingSaveTimeoutId = null
    this._pendingSaveReason = null

    this.saveState()
  }

  /**
   * Resets the text editing flag if it is active.
   */
  private _deactivateTextEditing(): void {
    const { textManager } = this.editor
    if (!textManager) return
    if (!textManager.isTextEditingActive) return

    textManager.isTextEditingActive = false
  }

  /**
   * Clears the deferred save without committing the state.
   */
  private _clearPendingSave(): void {
    const { _pendingSaveTimeoutId: pendingSaveTimeoutId } = this
    if (pendingSaveTimeoutId === null) return

    clearTimeout(pendingSaveTimeoutId)
    this._pendingSaveTimeoutId = null
    this._pendingSaveReason = null
  }

  /**
   * Clears the staged action boundary without saving.
   */
  private _clearPendingCommittedState(): void {
    this._pendingCommittedState = null
    this._pendingCommittedStateReason = null
  }

  /**
   * Returns the staged action boundary and clears it.
   */
  private _consumePendingCommittedState(
    { reason }: { reason?: string } = {}
  ): { state: CanvasFullState, reason: string | null } | null {
    if (!this._pendingCommittedState) return null
    if (reason && this._pendingCommittedStateReason !== reason) return null

    const pendingCommittedState = {
      state: this._pendingCommittedState,
      reason: this._pendingCommittedStateReason
    }

    this._clearPendingCommittedState()

    return pendingCommittedState
  }

  /**
   * Clears the active action state.
   */
  private _clearPendingAction(): void {
    this._isActionInProgress = false
    this._actionSnapshot = null
    this._actionReason = null
  }

  /**
   * Cancels the active action and restores the state from its start.
   */
  private async _cancelPendingAction(): Promise<boolean> {
    const { _isActionInProgress: isActionInProgress, _actionSnapshot: actionSnapshot } = this
    if (!isActionInProgress || !actionSnapshot) return false

    const actionReason = this._actionReason

    this._clearPendingSave()
    this._clearPendingCommittedState()
    this._clearPendingAction()

    this.suspendHistory()

    try {
      await this.loadStateFromFullState(actionSnapshot)
      if (this._destroyed) return true

      if (actionReason === 'text-edit') {
        this._deactivateTextEditing()
      }

      return true
    } finally {
      this.resumeHistory()
    }
  }

  /**
   * Saves an already serialized canonical state to history.
   */
  private _saveSerializedState({ currentStateObj }: { currentStateObj: CanvasFullState }): HistorySaveResult {
    // If the base state has not yet been set, save the full state as the base
    if (!this.baseState) {
      this.baseState = currentStateObj
      this.patches = []
      this.currentIndex = 0
      console.log('Базовое состояние сохранено.')
      return { saved: false }
    }

    const diff = this._resolveStateDiff({ currentStateObj })
    if (!diff) return { saved: false }

    console.log('baseState', this.baseState)
    console.log('diff', diff)

    const patchId = this._appendHistoryPatch({ diff })

    console.log('Состояние сохранено. Текущий индекс истории:', this.currentIndex)

    return {
      saved: true,
      patchId
    }
  }

  /**
   * Calculates the diff between the currently saved state and the next serialized state.
   */
  private _resolveStateDiff({ currentStateObj }: { currentStateObj: CanvasFullState }): Delta | null {
    const prevState = this.getFullState()
    const {
      prevState: normalizedPrevState,
      nextState: normalizedCurrentState
    } = prepareStatesForDiff({
      prevState,
      nextState: currentStateObj
    })
    const diff = this.diffPatcher.diff(normalizedPrevState, normalizedCurrentState)

    console.log('normalizedPrevState', normalizedPrevState)
    console.log('normalizedCurrentState', normalizedCurrentState)

    if (!diff) {
      console.log('Нет изменений для сохранения.')
      return null
    }

    const statesEqual = areStatesEqual({
      prevState: normalizedPrevState,
      nextState: normalizedCurrentState
    })

    if (statesEqual) {
      console.log('statesEqual. Нет изменений для сохранения.')
      return null
    }

    return diff
  }

  /**
   * Adds a diff to history, removing the redo branch and respecting the history length limit.
   */
  private _appendHistoryPatch({ diff }: { diff: Delta }): string {
    if (this.currentIndex < this.patches.length) {
      this.patches.splice(this.currentIndex)
    }

    const patchId = nanoid()

    this.totalChangesCount += 1
    this.patches.push({ id: patchId, diff })
    this.currentIndex += 1

    this._trimHistoryToMaxLength()

    return patchId
  }

  /**
   * Folds the oldest diff into baseState when history exceeds maxHistoryLength.
   */
  private _trimHistoryToMaxLength(): void {
    if (this.patches.length <= this.maxHistoryLength) return

    this.baseState = this.diffPatcher.patch(this.baseState, this.patches[0].diff) as CanvasFullState
    this.patches.shift()
    this.currentIndex -= 1
    this.baseStateChangesCount += 1
  }

  /**
   * Builds a compact history change payload for external subscribers.
   */
  private _createHistoryChangedPayload({
    action,
    patchId
  }: {
    action: HistoryChangedAction
    patchId?: string
  }): HistoryChangedPayload {
    const payload: HistoryChangedPayload = {
      action,
      currentIndex: this.currentIndex,
      totalChangesCount: this.totalChangesCount,
      baseStateChangesCount: this.baseStateChangesCount,
      patchesCount: this.patches.length,
      canUndo: this.currentIndex > 0,
      canRedo: this.currentIndex < this.patches.length,
      hasUnsavedChanges: this.hasUnsavedChanges(),
      currentChangePosition: this.getCurrentChangePosition()
    }

    if (patchId !== undefined) {
      payload.patchId = patchId
    }

    return payload
  }

  /**
   * Emits an event when the history state actually changes.
   */
  private _fireHistoryChanged({
    action,
    patchId
  }: {
    action: HistoryChangedAction
    patchId?: string
  }): void {
    this.canvas.fire('editor:history-changed', this._createHistoryChangedPayload({
      action,
      patchId
    }))
  }

  /**
   * Emits history-changed only for a saveState that actually added a patch.
   */
  private _fireHistoryChangedAfterSave(saveResult: HistorySaveResult): void {
    if (!saveResult.saved) return

    this._fireHistoryChanged({
      action: 'save',
      patchId: saveResult.patchId
    })
  }

  /**
   * Save the current state as a diff from the last saved full state.
   * @fires editor:history-changed
   */
  public saveState(): void {
    console.log('saveState')
    if (this.skipHistory) return
    if (this._isUiBlocked()) {
      this._deferSaveAfterUiUnblock()
      return
    }

    this._isSavingState = true

    console.time('saveState')

    try {
      const pendingCommittedState = this._consumePendingCommittedState()

      if (pendingCommittedState) {
        if (
          this._pendingSaveTimeoutId !== null
          && this._pendingSaveReason === pendingCommittedState.reason
        ) {
          this._clearPendingSave()
        }

        if (pendingCommittedState.reason === 'text-edit') {
          this._deactivateTextEditing()
        }

        const pendingSaveResult = this._saveSerializedState({
          currentStateObj: pendingCommittedState.state
        })
        this._fireHistoryChangedAfterSave(pendingSaveResult)
      }

      const currentStateObj = this._captureCurrentState()

      console.timeEnd('saveState')

      const saveResult = this._saveSerializedState({
        currentStateObj
      })
      this._fireHistoryChangedAfterSave(saveResult)
    } finally {
      this._isSavingState = false
    }
  }

  /**
   * Function for loading state into the canvas.
   * @param fullState - Full canvas state
   * The state must already be saved in the canonical scene model.
   * After deserialization, the editor synchronizes derived geometry and camera state
   * with the container's current viewport, without restoring legacy placement.
   * For standalone text and shape compositions, transient scale is also materialized
   * after loadFromJSON so that subsequent resize/scale and text layout scenarios operate
   * from a single persisted contract.
   * @fires editor:history-state-loaded
   */
  public async loadStateFromFullState(fullState: CanvasFullState): Promise<void> {
    if (this._destroyed || !fullState) return

    console.log('loadStateFromFullState fullState', fullState)

    const {
      canvas,
      canvasManager,
      interactionBlocker,
      backgroundManager,
      zoomManager,
      panConstraintManager
    } = this.editor
    const { width: oldCanvasStateWidth, height: oldCanvasStateHeight } = canvas
    const {
      width: previousMontageWidth,
      height: previousMontageHeight
    } = this.editor.montageArea

    // Reset the overlay, as it may be duplicated when loading state
    interactionBlocker.overlayMask = null

    const safeState = createLoadSafeState({ state: fullState })

    try {
      await canvas.loadFromJSON(safeState, undefined, { signal: this._loadAbortController.signal })
    } catch (error) {
      if (this._destroyed) return
      throw error
    }
    if (this._destroyed) return

    applyCustomDataFromState({ state: fullState, canvas })

    // Restore the editor's references to montageArea and overlay
    const loadedMontage = canvas.getObjects().find((obj) => obj.id === 'montage-area') as Rect | undefined
    let montageSizeChanged = false
    let canvasSizeChanged = false

    if (loadedMontage) {
      this.editor.montageArea = loadedMontage
      canvasManager.placeMontageAreaAtCanonicalScenePosition()
      montageSizeChanged = loadedMontage.width !== previousMontageWidth
        || loadedMontage.height !== previousMontageHeight
      canvasSizeChanged = oldCanvasStateWidth !== canvas.getWidth()
        || oldCanvasStateHeight !== canvas.getHeight()
    }

    const loadedBackgroundObject = canvas.getObjects().find((obj) => obj.id === 'background')

    if (!loadedBackgroundObject) {
      backgroundManager.removeBackground({ withoutSave: true })
    } else {
      backgroundManager.backgroundObject = loadedBackgroundObject as Rect | FabricImage
    }

    const {
      textManager,
      shapeManager
    } = this.editor

    canvas.getObjects().forEach((object) => {
      textManager.commitStandaloneTextScale({
        target: object
      })
      shapeManager.commitRehydratedShapeLayout({
        target: object
      })
    })

    if (loadedMontage) {
      interactionBlocker.ensureOverlay()

      if (canvasSizeChanged) {
        canvasManager.updateCanvas()
      } else if (montageSizeChanged) {
        zoomManager.calculateAndApplyDefaultZoom()
        canvasManager.refreshMontageDerivedState()
      } else {
        zoomManager.updateDefaultZoom()
        canvasManager.refreshMontageDerivedState()
        panConstraintManager.updateBounds()
      }
    }

    canvas.renderAll()
    canvas.fire('editor:history-state-loaded', {
      fullState,
      currentIndex: this.currentIndex,
      totalChangesCount: this.totalChangesCount,
      baseStateChangesCount: this.baseStateChangesCount,
      patchesCount: this.patches.length,
      patches: this.patches
    })
  }

  /**
   * Undo: cancel the last action by restoring state from the accumulated diffs.
   * @fires editor:undo
   * @fires editor:history-changed
   */
  public async undo(): Promise<void> {
    if (this.skipHistory) return

    const isActionCanceled = await this._cancelPendingAction()
    if (this._destroyed || isActionCanceled) return

    this.flushPendingSave()

    if (this.currentIndex <= 0) {
      console.log('Нет предыдущих состояний для отмены.')
      return
    }

    this.suspendHistory()

    try {
      this.currentIndex -= 1
      this.totalChangesCount -= 1

      const fullState = this.getFullState()

      await this.loadStateFromFullState(fullState)
      if (this._destroyed) return

      console.log('Undo выполнен. Текущий индекс истории:', this.currentIndex)

      this.canvas.fire('editor:undo', {
        fullState,
        currentIndex: this.currentIndex,
        totalChangesCount: this.totalChangesCount,
        baseStateChangesCount: this.baseStateChangesCount,
        patchesCount: this.patches.length,
        patches: this.patches
      })
      this._fireHistoryChanged({ action: 'undo' })
    } catch (error) {
      this.editor.errorManager.emitError({
        origin: 'HistoryManager',
        method: 'undo',
        code: 'UNDO_ERROR',
        message: 'Ошибка отмены действия',
        data: error as Error
      })
    } finally {
      this.resumeHistory()
    }
  }

  /**
   * Redo: repeat a previously undone action.
   * @fires editor:redo
   * @fires editor:history-changed
   */
  public async redo(): Promise<void> {
    if (this.skipHistory) return

    const isActionCanceled = await this._cancelPendingAction()
    if (this._destroyed || isActionCanceled) return

    this.flushPendingSave()

    if (this.currentIndex >= this.patches.length) {
      console.log('Нет состояний для повтора.')
      return
    }

    this.suspendHistory()

    try {
      this.currentIndex += 1
      this.totalChangesCount += 1

      const fullState = this.getFullState()
      console.log('fullState', fullState)

      await this.loadStateFromFullState(fullState)
      if (this._destroyed) return

      console.log('Redo выполнен. Текущий индекс истории:', this.currentIndex)

      this.canvas.fire('editor:redo', {
        fullState,
        currentIndex: this.currentIndex,
        totalChangesCount: this.totalChangesCount,
        baseStateChangesCount: this.baseStateChangesCount,
        patchesCount: this.patches.length,
        patches: this.patches
      })
      this._fireHistoryChanged({ action: 'redo' })
    } catch (error) {
      this.editor.errorManager.emitError({
        origin: 'HistoryManager',
        method: 'redo',
        code: 'REDO_ERROR',
        message: 'Ошибка повтора действия',
        data: error as Error
      })
    } finally {
      this.resumeHistory()
    }
  }
}
