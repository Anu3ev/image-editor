import { FabricObject } from 'fabric'
import { ImageEditor } from '../index'

export type DeleteSelectedObjectsParams = {
  objects?: FabricObject[],
  withoutSave?: boolean
}

export default class DeletionManager {
  /**
   * Инстанс редактора с доступом к canvas
   */
  public editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Удалить выбранные объекты
   * @param options
   * @param options.objects - массив объектов для удаления
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:objects-deleted
   */
  public deleteSelectedObjects({
    objects,
    withoutSave
  }: DeleteSelectedObjectsParams = {}): void {
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
