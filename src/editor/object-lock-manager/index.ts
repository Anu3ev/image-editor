import { FabricObject, ActiveSelection, Group, Textbox } from 'fabric'
import { ImageEditor } from '../index'
import { resolveShapeGroupFromTarget } from '../shape-manager/shape-utils'

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
   * Ссылка на редактор, содержащий canvas.
   */
  editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Блокирует объект (или группу объектов) на канвасе.
   * Если передан внутренний объект shape-группы, блокировка применяется к владеющей группе.
   * @param options
   * @param options.object - объект, который нужно заблокировать
   * @param options.skipInnerObjects - не блокировать внутренние объекты
   * @param options.withoutSave - не сохранять состояние
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
   * Разблокирует объект (или группу объектов) на канвасе.
   * Если передан внутренний объект shape-группы, разблокировка применяется к владеющей группе.
   * @param options
   * @param options.object - объект, который нужно разблокировать
   * @param options.withoutSave - не сохранять состояние в истории изменений
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
   * Собирает объект и всех его вложенных потомков, чтобы lock-state применялся консистентно.
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
   * Завершает активное редактирование у всех текстовых объектов до применения lock-флагов.
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
