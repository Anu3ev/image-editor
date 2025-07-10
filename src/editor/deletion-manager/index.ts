import { FabricObject } from 'fabric'
import { ImageEditor } from '../index'

export default class DeletionManager {
  /**
   * Инстанс редактора с доступом к canvas
   * @type {ImageEditor}
   */
  editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Удалить выбранные объекты
   * @param {Object} options
   * @param {FabricObject[]} options.objects - массив объектов для удаления
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:objects-deleted
   */
  deleteSelectedObjects({
    objects,
    withoutSave
  }: {
    objects?: FabricObject[],
    withoutSave?: boolean
  } = {}) {
    const { canvas, historyManager, groupingManager } = this.editor

    // Отбираем только те объекты, которые не заблокированы
    const activeObjects = (objects || canvas.getActiveObjects()).filter((obj) => !obj.locked)
    if (!activeObjects?.length) return

    historyManager.suspendHistory()

    activeObjects.forEach((obj) => {
      if (obj.type === 'group' && obj.format !== 'svg') {
        groupingManager.ungroup({ object: obj, withoutSave })
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

    canvas.fire('editor:objects-deleted', {
      objects: activeObjects,
      withoutSave
    })
  }
}
