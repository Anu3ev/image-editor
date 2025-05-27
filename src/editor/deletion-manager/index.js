export default class DeletionManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }) {
    this.editor = editor
  }

  /**
   * Удалить выбранные объекты
   * @param {Object} options
   * @param {fabric.Object[]} options.objects - массив объектов для удаления
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-deleted
   */
  deleteSelectedObjects({ objects, withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    // Отбираем только те объекты, которые не заблокированы
    const activeObjects = (objects || canvas.getActiveObjects()).filter((obj) => !obj.locked)
    if (!activeObjects?.length) return

    historyManager.suspendHistory()

    activeObjects.forEach((obj) => {
      if (obj.type === 'group' && obj.format !== 'svg') {
        this.ungroup(obj)
        this.deleteSelectedObjects()

        return
      }

      canvas.remove(obj)
    })

    canvas.discardActiveObject()
    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:objects-deleted')
  }
}
