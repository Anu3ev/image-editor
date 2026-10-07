import { FabricObject, ActiveSelection, Group, Textbox } from 'fabric'
import { ImageEditor } from '../index'
import { resolveShapeGroupFromTarget } from '../shape-manager/domain/shape-reference'

type lockObjectOptions = {
  object?: FabricObject
  skipInnerObjects?: boolean
  withoutSave?: boolean
}

type unlockObjectOptions = {
  object?: FabricObject
  withoutSave?: boolean
}

export default class ObjectLockManager {
  /**
   * Reference to the editor containing the canvas.
   */
  editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Locks an object (or group of objects) on the canvas.
   * If an internal object of a shape group is provided, the lock is applied to its owning group.
   * @param options
   * @param options.object - Object to lock
   * @param options.skipInnerObjects - Do not lock internal objects
   * @param options.withoutSave - Do not save the state
   * @fires editor:object-locked
   */
  lockObject(
    { object, skipInnerObjects, withoutSave }: lockObjectOptions = {}
  ): void {
    const { canvas, historyManager } = this.editor

    const requestedObject = object || canvas.getActiveObject()
    const targetObject = resolveShapeGroupFromTarget({ target: requestedObject }) ?? requestedObject

    if (!targetObject || targetObject.locked) return

    const lockOptions = {
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      lockSkewingX: true,
      lockSkewingY: true,
      editable: false,
      locked: true
    }

    const objectsToLock = skipInnerObjects
      ? [targetObject]
      : ObjectLockManager._collectLockTargets({ object: targetObject })

    ObjectLockManager._exitEditingInTextboxes({ objects: objectsToLock })

    for (let index = 0; index < objectsToLock.length; index += 1) {
      objectsToLock[index].set(lockOptions)
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-locked', {
      object: targetObject,
      skipInnerObjects,
      withoutSave
    })
  }

  /**
   * Unlocks an object (or group of objects) on the canvas.
   * If an internal object of a shape group is provided, the unlock is applied to its owning group.
   * @param options
   * @param options.object - Object to unlock
   * @param options.withoutSave - Do not save the state to the change history
   * @fires editor:object-unlocked
   */
  unlockObject({ object, withoutSave }: unlockObjectOptions = {}): void {
    const { canvas, historyManager } = this.editor

    const requestedObject = object || canvas.getActiveObject()
    const targetObject = resolveShapeGroupFromTarget({ target: requestedObject }) ?? requestedObject

    if (!targetObject) return

    const unlockOptions = {
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      editable: true,
      locked: false
    }

    const objectsToUnlock = ObjectLockManager._collectLockTargets({ object: targetObject })

    for (let index = 0; index < objectsToUnlock.length; index += 1) {
      objectsToUnlock[index].set(unlockOptions)
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-unlocked', {
      object: targetObject,
      withoutSave
    })
  }

  private static _isGroupOrSelection(object: FabricObject): boolean {
    return object instanceof ActiveSelection || object instanceof Group
  }

  /**
   * Collects the object and all nested descendants so lock state is applied consistently.
   */
  private static _collectLockTargets({ object }: { object: FabricObject }): FabricObject[] {
    const lockTargets = [object]

    if (!ObjectLockManager._isGroupOrSelection(object)) {
      return lockTargets
    }

    const childObjects = (object as Group | ActiveSelection).getObjects()

    for (let index = 0; index < childObjects.length; index += 1) {
      const childObject = childObjects[index]
      const nestedTargets = ObjectLockManager._collectLockTargets({ object: childObject })

      for (let nestedIndex = 0; nestedIndex < nestedTargets.length; nestedIndex += 1) {
        lockTargets.push(nestedTargets[nestedIndex])
      }
    }

    return lockTargets
  }

  /**
   * Finishes active editing on all text objects before applying lock flags.
   */
  private static _exitEditingInTextboxes({ objects }: { objects: FabricObject[] }): void {
    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index]

      if (!(object instanceof Textbox) || !object.isEditing) {
        continue
      }

      object.exitEditing()
    }
  }
}
