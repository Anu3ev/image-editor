export default class ObjectLockManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }) {
    this.editor = editor
  }

  /**
   * Блокирует объект (или группу объектов) на канвасе
   * @param {Object} options
   * @param {fabric.Object} [options.object] - объект, который нужно заблокировать
   * @param {Boolean} [options.withoutSave] - не сохранять состояние
   * @returns
   * @fires editor:object-locked
   */
  lockObject({ object, skipInnerObjects, withoutSave } = {}) {
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

    const shouldLockInnerObjects = !skipInnerObjects && ['activeselection', 'group'].includes(activeObject.type)

    if (shouldLockInnerObjects) {
      activeObject.getObjects().forEach((obj) => {
        obj.set(lockOptions)
      })
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-locked', { object: activeObject })
  }

  /**
   * Разблокирует объект (или группу объектов) на канвасе
   * @param {Object} options
   * @param {fabric.Object} [options.object] - объект, который нужно разблокировать
   * @param {Boolean} [options.withoutSave] - не сохранять состояние
   * @returns
   * @fires editor:object-unlocked
   */
  unlockObject({ object, withoutSave } = {}) {
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

    if (['activeselection', 'group'].includes(activeObject.type)) {
      activeObject.getObjects().forEach((obj) => {
        obj.set(unlockOptions)
      })
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-unlocked', { object: activeObject })
  }
}
