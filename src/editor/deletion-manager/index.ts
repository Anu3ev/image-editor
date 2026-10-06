import { FabricObject, Group } from 'fabric'
import { ImageEditor } from '../index'
import type {
  ObjectsDeletedPayload,
  ObjectsDeleteSkippedPayload
} from '../types/events'
import { isCurrentTransformAffectedByRemoval } from '../utils/current-transform'

/**
 * Options for deleting selected objects.
 */
export type DeleteSelectedObjectsParams = {
  objects?: FabricObject[],
  withoutSave?: boolean,
  ignoreDeleteGuard?: boolean,
  _isRecursiveCall?: boolean
}

/**
 * Options for determining which objects can be deleted.
 */
export type ResolveDeleteTargetsParams = {
  objects?: FabricObject[],
  ignoreDeleteGuard?: boolean
}

/**
 * Result of determining which objects can be deleted.
 */
export type DeleteTargets = {
  requestedObjects: FabricObject[]
  deletableObjects: FabricObject[]
  skippedObjects: FabricObject[]
}

/**
 * Internal deletion plan indicating whether the canvas actually changes.
 */
type DeletePlan = {
  requestedObjects: FabricObject[]
  deletableObjects: FabricObject[]
  skippedObjects: FabricObject[]
  hasCanvasChanges: boolean
}

/**
 * Result of deleting objects within a single operation.
 */
type DeleteObjectsResult = {
  deletedObjects: FabricObject[]
  skippedObjects: FabricObject[]
}

/**
 * Result of ungrouping when deleting a group.
 */
type GroupDeletionResult = {
  deletedObjects: FabricObject[]
  skippedObjects: FabricObject[]
  objectsToDelete: FabricObject[]
}

export default class DeletionManager {
  /**
   * Editor instance with access to the canvas
   */
  public editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Checks whether the object is a group that can be ungrouped
   * @param obj - Object to check
   * @returns true if the object is a group and is not an SVG
   */
  private static _isUngroupableGroup(obj: FabricObject): obj is Group {
    return obj instanceof Group && obj.format !== 'svg'
  }

  /**
   * Checks whether an object can be deleted under the external constraint.
   */
  private _canDeleteObject({
    object,
    ignoreDeleteGuard
  }: {
    object: FabricObject
    ignoreDeleteGuard: boolean
  }): boolean {
    if (ignoreDeleteGuard) return true

    return this.editor.options.canDeleteObject?.(object) ?? true
  }

  /**
   * Splits the requested objects into deletable and skipped objects.
   * Locked objects remain an internal constraint and are not included in skippedObjects.
   */
  public resolveDeleteTargets({
    objects,
    ignoreDeleteGuard = false
  }: ResolveDeleteTargetsParams = {}): DeleteTargets {
    const targetObjects = objects || this.editor.canvas.getActiveObjects()
    const deletableObjects: FabricObject[] = []
    const skippedObjects: FabricObject[] = []

    for (let index = 0; index < targetObjects.length; index += 1) {
      const object = targetObjects[index]

      if (object.locked) continue

      if (!this._canDeleteObject({ object, ignoreDeleteGuard })) {
        skippedObjects.push(object)
        continue
      }

      deletableObjects.push(object)
    }

    return {
      requestedObjects: targetObjects,
      deletableObjects,
      skippedObjects
    }
  }

  /**
   * Checks whether deletion will actually change the canvas.
   */
  private _resolveDeletePlan({
    objects,
    ignoreDeleteGuard = false
  }: ResolveDeleteTargetsParams = {}): DeletePlan {
    const deleteTargets = this.resolveDeleteTargets({
      objects,
      ignoreDeleteGuard
    })
    const skippedObjects = [...deleteTargets.skippedObjects]
    let hasCanvasChanges = false

    for (let index = 0; index < deleteTargets.deletableObjects.length; index += 1) {
      const object = deleteTargets.deletableObjects[index]

      if (!DeletionManager._isUngroupableGroup(object)) {
        hasCanvasChanges = true
        continue
      }

      const childObjects = object.getObjects()

      if (!childObjects.length) {
        hasCanvasChanges = true
        continue
      }

      const childTargets = this.resolveDeleteTargets({
        objects: childObjects,
        ignoreDeleteGuard
      })

      if (childTargets.deletableObjects.length > 0) {
        hasCanvasChanges = true
        continue
      }

      skippedObjects.push(...childTargets.skippedObjects)
    }

    return {
      ...deleteTargets,
      skippedObjects,
      hasCanvasChanges
    }
  }

  /**
   * Notifies the external UI that some objects were not deleted.
   */
  private _fireDeleteSkipped({
    skippedObjects,
    requestedObjects,
    withoutSave
  }: ObjectsDeleteSkippedPayload): void {
    if (!skippedObjects.length) return

    this.editor.canvas.fire('editor:objects-delete-skipped', {
      skippedObjects,
      requestedObjects,
      withoutSave
    })
  }

  /**
   * Returns the objects to delete for the current active context.
   * When text editing mode is open, object operations must target the text's owner,
   * not the internal text object that is temporarily active.
   */
  private _resolveObjectsForDelete({
    objects,
    withoutSave
  }: {
    objects?: FabricObject[]
    withoutSave: boolean
  }): FabricObject[] | undefined {
    if (objects) return objects
    if (withoutSave) return undefined

    const activeTextEditingOwner = this.editor.textManager.getActiveTextEditingOwner()
    if (!activeTextEditingOwner) return undefined

    return [activeTextEditingOwner]
  }

  /**
   * Ungroups a group and collects the child objects allowed to be deleted.
   */
  private _collectGroupObjectsForDeletion({
    group,
    ignoreDeleteGuard
  }: {
    group: Group
    ignoreDeleteGuard: boolean
  }): GroupDeletionResult {
    const { groupingManager } = this.editor
    const childObjects = group.getObjects()
    const childTargets = this.resolveDeleteTargets({
      objects: childObjects,
      ignoreDeleteGuard
    })

    if (childObjects.length && !childTargets.deletableObjects.length) {
      return {
        deletedObjects: [],
        skippedObjects: childTargets.skippedObjects,
        objectsToDelete: []
      }
    }

    const { ungroupedObjects = [] } = groupingManager.ungroup({
      target: group,
      withoutSave: true
    }) ?? {}
    const objectsToDelete: FabricObject[] = []
    const shouldDeleteAllUngroupedObjects = !childObjects.length

    for (let index = 0; index < ungroupedObjects.length; index += 1) {
      const object = ungroupedObjects[index]

      if (shouldDeleteAllUngroupedObjects || childTargets.deletableObjects.includes(object)) {
        objectsToDelete.push(object)
      }
    }

    return {
      deletedObjects: [group],
      skippedObjects: childTargets.skippedObjects,
      objectsToDelete
    }
  }

  /**
   * Removes objects from the canvas without managing the overall history transaction.
   */
  private _deleteObjects({
    objects,
    ignoreDeleteGuard
  }: {
    objects: FabricObject[]
    ignoreDeleteGuard: boolean
  }): DeleteObjectsResult {
    const { canvas } = this.editor
    const objectsToDelete = [...objects]
    const deletedObjects: FabricObject[] = []
    const skippedObjects: FabricObject[] = []

    for (let index = 0; index < objectsToDelete.length; index += 1) {
      const object = objectsToDelete[index]

      if (DeletionManager._isUngroupableGroup(object)) {
        const result = this._collectGroupObjectsForDeletion({
          group: object,
          ignoreDeleteGuard
        })

        deletedObjects.push(...result.deletedObjects)
        skippedObjects.push(...result.skippedObjects)

        for (let childIndex = 0; childIndex < result.objectsToDelete.length; childIndex += 1) {
          objectsToDelete.push(result.objectsToDelete[childIndex])
        }

        continue
      }

      canvas.remove(object)
      deletedObjects.push(object)
    }

    return {
      deletedObjects,
      skippedObjects
    }
  }

  /**
   * Performs the canvas mutation while history is suspended.
   */
  private _deleteObjectsInHistoryTransaction({
    deletePlan,
    ignoreDeleteGuard
  }: {
    deletePlan: DeletePlan
    ignoreDeleteGuard: boolean
  }): DeleteObjectsResult {
    const {
      canvas,
      historyManager
    } = this.editor
    let deleteResult: DeleteObjectsResult = {
      deletedObjects: [],
      skippedObjects: []
    }

    historyManager.suspendHistory()

    try {
      // Finish the transform before removing its objects, while the active selection is still intact.
      if (isCurrentTransformAffectedByRemoval({
        canvas,
        objects: deletePlan.deletableObjects
      })) {
        canvas.endCurrentTransform()
      }

      deleteResult = this._deleteObjects({
        objects: deletePlan.deletableObjects,
        ignoreDeleteGuard
      })

      if (deleteResult.deletedObjects.length) {
        canvas.discardActiveObject()
        canvas.renderAll()
      }
    } finally {
      historyManager.resumeHistory()
    }

    return deleteResult
  }

  /**
   * Saves a successful deletion, reports skipped objects, and emits the deletion event.
   */
  private _completeDeleteOperation({
    deletePlan,
    deleteResult,
    skippedObjects,
    withoutSave
  }: {
    deletePlan: DeletePlan
    deleteResult: DeleteObjectsResult
    skippedObjects: FabricObject[]
    withoutSave: boolean
  }): ObjectsDeletedPayload {
    const { canvas, historyManager } = this.editor

    if (!withoutSave) {
      historyManager.saveState()
    }

    const result = {
      objects: deleteResult.deletedObjects,
      withoutSave
    }

    this._fireDeleteSkipped({
      skippedObjects,
      requestedObjects: deletePlan.requestedObjects,
      withoutSave
    })

    canvas.fire('editor:objects-deleted', result)
    return result
  }

  /**
   * Delete selected objects
   * @param options
   * @param options.objects - Array of objects to delete
   * @param options.withoutSave - Do not save the state
   * @param options.ignoreDeleteGuard - Do not apply the external deletion guard
   * @param options._isRecursiveCall - Deprecated internal parameter retained for compatibility
   * If the deletion is saved to history while text editing mode is active,
   * the manager first finishes editing so that the text is saved
   * as a separate history step before deletion.
   * @fires editor:objects-deleted
   * @fires editor:objects-delete-skipped
   */
  public deleteSelectedObjects({
    objects,
    withoutSave = false,
    ignoreDeleteGuard = false
  }: DeleteSelectedObjectsParams = {}): ObjectsDeletedPayload | null {
    const { textManager } = this.editor
    const objectsForDelete = this._resolveObjectsForDelete({
      objects,
      withoutSave
    })
    const deletePlan = this._resolveDeletePlan({
      objects: objectsForDelete,
      ignoreDeleteGuard
    })

    if (!deletePlan.hasCanvasChanges) {
      this._fireDeleteSkipped({
        skippedObjects: deletePlan.skippedObjects,
        requestedObjects: deletePlan.requestedObjects,
        withoutSave
      })

      return null
    }

    if (!withoutSave) {
      textManager.exitActiveTextEditing()
    }

    const deleteResult = this._deleteObjectsInHistoryTransaction({
      deletePlan,
      ignoreDeleteGuard
    })
    const skippedObjects = [
      ...deletePlan.skippedObjects,
      ...deleteResult.skippedObjects
    ]

    if (!deleteResult.deletedObjects.length) {
      this._fireDeleteSkipped({
        skippedObjects,
        requestedObjects: deletePlan.requestedObjects,
        withoutSave
      })

      return null
    }

    return this._completeDeleteOperation({
      deletePlan,
      deleteResult,
      skippedObjects,
      withoutSave
    })
  }
}
