// src/editor/grouping-manager/index.js
import { Group, ActiveSelection, FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'

export type GroupActionOptions = {
  target?: ActiveSelection | FabricObject[],
  withoutSave?: boolean
}

export type UngroupActionOptions = {
  target?: Group | Group[] | ActiveSelection,
  withoutSave?: boolean
}

/**
 * Parameters for the editor:objects-ungrouped event
 */
export type UngroupedObjectsData = {
  selection: ActiveSelection,
  ungroupedObjects: FabricObject[],
  withoutSave?: boolean
}

/**
 * Parameters for the editor:objects-grouped event
 */
export type GroupedObjectsData = {
  group: Group
  withoutSave?: boolean
}

export default class GroupingManager {
  /**
   * Editor instance with access to the canvas
   */
  public editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Get the objects to group
   * @private
   */
  private _getObjectsToGroup(target?: ActiveSelection | FabricObject[]): FabricObject[] | null {
    if (Array.isArray(target)) {
      return target.length > 0 ? target : null
    }

    const activeObject = target || this.editor.canvas.getActiveObject()

    if (!activeObject || !(activeObject instanceof ActiveSelection)) {
      return null
    }

    return activeObject.getObjects()
  }

  /**
   * Get the groups to ungroup
   * @private
   */
  private _getGroupsToUngroup(target?: Group | Group[] | ActiveSelection): Group[] | null {
    if (Array.isArray(target)) {
      const groups = target.filter((item) => item instanceof Group)
      return groups.length > 0 ? groups : null
    }

    if (target instanceof ActiveSelection) {
      const groups = target.getObjects().filter((obj) => obj instanceof Group) as Group[]
      return groups.length > 0 ? groups : null
    }

    const activeObject = target || this.editor.canvas.getActiveObject()

    if (!activeObject) return null

    // If the active object is an ActiveSelection (when target is not explicitly provided)
    if (activeObject instanceof ActiveSelection) {
      const groups = activeObject.getObjects().filter((obj) => obj instanceof Group) as Group[]
      return groups.length > 0 ? groups : null
    }

    // If it is a single group
    if (activeObject instanceof Group) return [activeObject]

    return null
  }

  /**
   * Bakes an object's transient scale into its domain model after it leaves a Fabric group.
   */
  private _materializeUngroupedObject({ object }: { object: FabricObject }): void {
    const {
      shapeManager,
      textManager
    } = this.editor
    const shapeLayoutParams: {
      target: FabricObject
      textScale?: number
    } = {
      target: object
    }

    if (object.shapeComposite === true) {
      shapeLayoutParams.textScale = Math.abs(object.scaleX ?? 1) || 1
    }

    const standaloneTextScaleCommitted = textManager.commitStandaloneTextScale({
      target: object
    })
    const shapeLayoutCommitted = shapeManager.commitRehydratedShapeLayout(shapeLayoutParams)

    if (!standaloneTextScaleCommitted && !shapeLayoutCommitted) {
      object.setCoords()
    }
  }

  /**
 * Group objects
 * @param options
 * @param options.target - ActiveSelection object or array of objects to group
 * @param options.withoutSave - Do not save the state
 * @fires editor:objects-grouped
 */
  public group({
    target,
    withoutSave = false
  }: GroupActionOptions = {}): GroupedObjectsData | null {
    const { canvas, historyManager } = this.editor

    // Get the objects to group
    const objectsToGroup = this._getObjectsToGroup(target)
    if (!objectsToGroup) return null

    try {
      historyManager.suspendHistory()

      // Create a group with a unique ID
      const group = new Group(objectsToGroup, {
        id: `group-${nanoid()}`
      })

      // Remove the objects from the canvas
      objectsToGroup.forEach((obj) => canvas.remove(obj))

      // Add the group and select it
      canvas.add(group)
      canvas.setActiveObject(group)
      canvas.requestRenderAll()

      const result: GroupedObjectsData = {
        group,
        withoutSave
      }

      canvas.fire('editor:objects-grouped', result)

      return result
    } finally {
      historyManager.resumeHistory()

      if (!withoutSave) {
        historyManager.saveState()
      }
    }
  }

  /**
 * Ungroup objects
 * @param options
 * @param options.target - Group object, array of groups, or ActiveSelection containing groups to ungroup
 * @param options.withoutSave - Do not save the state
 * @returns Ungrouping data, or null if there are no groups to ungroup
 * @fires editor:objects-ungrouped
 */
  public ungroup({
    target,
    withoutSave = false
  }: UngroupActionOptions = {}): UngroupedObjectsData | null {
    const { canvas, historyManager } = this.editor

    // Get the groups to ungroup
    const groupsToUngroup = this._getGroupsToUngroup(target)
    if (!groupsToUngroup) return null

    try {
      historyManager.suspendHistory()

      const allUngroupedObjects: FabricObject[] = []

      // Ungroup all groups
      groupsToUngroup.forEach((group) => {
        const ungroupedObjects = group.removeAll()
        canvas.remove(group)
        ungroupedObjects.forEach((groupedObj) => {
          this._materializeUngroupedObject({
            object: groupedObj
          })
          canvas.add(groupedObj)
          allUngroupedObjects.push(groupedObj)
        })
      })

      // Select all ungrouped objects
      const selection = new ActiveSelection(allUngroupedObjects, {
        canvas
      })

      canvas.setActiveObject(selection)
      canvas.requestRenderAll()

      const result: UngroupedObjectsData = {
        selection,
        ungroupedObjects: allUngroupedObjects,
        withoutSave
      }

      canvas.fire('editor:objects-ungrouped', result)

      return result
    } finally {
      historyManager.resumeHistory()

      if (!withoutSave) {
        historyManager.saveState()
      }
    }
  }
}
