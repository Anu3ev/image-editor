import { FabricObject, ActiveSelection, Group } from 'fabric'
import { ImageEditor } from '../index'

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
   * Блокирует объект (или группу объектов) на канвасе
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

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject || activeObject.locked) return

    const lockOptions = {
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      lockSkewingX: true,
      lockSkewingY: true,
      locked: true
    }

    activeObject.set(lockOptions)

    const shouldLockInnerObjects = !skipInnerObjects && ObjectLockManager._isGroupOrSelection(activeObject)

    if (shouldLockInnerObjects) {
      (activeObject as Group | ActiveSelection).getObjects().forEach((obj) => {
        obj.set(lockOptions)
      })
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-locked', {
      object: activeObject,
      skipInnerObjects,
      withoutSave
    })
  }

  /**
   * Разблокирует объект (или группу объектов) на канвасе
   * @param options
   * @param options.object - объект, который нужно разблокировать
   * @param options.withoutSave - не сохранять состояние в истории изменений
   * @fires editor:object-unlocked
   */
  unlockObject({ object, withoutSave }: unlockObjectOptions = {}): void {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    const unlockOptions = {
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      locked: false
    }

    activeObject.set(unlockOptions)

    if (ObjectLockManager._isGroupOrSelection(activeObject)) {
      (activeObject as Group | ActiveSelection).getObjects().forEach((obj) => {
        obj.set(unlockOptions)
      })
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-unlocked', {
      object: activeObject,
      withoutSave
    })
  }

  private static _isGroupOrSelection(object: FabricObject): boolean {
    return object instanceof ActiveSelection || object instanceof Group
  }
}
