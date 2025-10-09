import { FabricObject } from 'fabric'
import { ImageEditor } from '../index'
import { ObjectsDeletedPayload } from '../types/events'

export type DeleteSelectedObjectsParams = {
  objects?: FabricObject[],
  withoutSave?: boolean,
  _isRecursiveCall?: boolean
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
   * Проверяет, является ли объект разгруппируемой группой
   * @param obj - объект для проверки
   * @returns true, если объект является группой и не является SVG
   */
  private static _isUngroupableGroup(obj: FabricObject): boolean {
    return obj.type === 'group' && obj.format !== 'svg'
  }

  /**
   * Обрабатывает удаление группы: разгруппировывает и рекурсивно удаляет объекты
   * @param group - группа для обработки
   * @returns массив всех удаленных объектов (включая саму группу)
   */
  private _handleGroupDeletion(group: FabricObject): FabricObject[] {
    const { groupingManager } = this.editor

    // Разгруппировываем и получаем объекты
    const { ungroupedObjects = [] } = groupingManager.ungroup({
      object: group,
      withoutSave: true
    }) ?? {}

    // Рекурсивно удаляем разгруппированные объекты
    this.deleteSelectedObjects({
      objects: ungroupedObjects,
      withoutSave: true,
      _isRecursiveCall: true
    })

    // Возвращаем саму группу и разгруппированные объекты как удаленные
    return [group, ...ungroupedObjects]
  }

  /**
   * Удалить выбранные объекты
   * @param options
   * @param options.objects - массив объектов для удаления
   * @param options.withoutSave - Не сохранять состояние
   * @param options._isRecursiveCall - Внутренний параметр для рекурсивных вызовов
   * @fires editor:objects-deleted
   */
  public deleteSelectedObjects({
    objects,
    withoutSave = false,
    _isRecursiveCall = false
  }: DeleteSelectedObjectsParams = {}): ObjectsDeletedPayload | null {
    const { canvas, historyManager } = this.editor

    // Получаем объекты для удаления
    const targetObjects = objects || canvas.getActiveObjects()

    // Отбираем только те объекты, которые не заблокированы
    const activeObjects = targetObjects.filter((obj) => !obj.locked)

    if (!activeObjects?.length) return null

    // Suspend только на верхнем уровне
    if (!_isRecursiveCall) {
      historyManager.suspendHistory()
    }

    const deletedObjects: FabricObject[] = []

    activeObjects.forEach((obj) => {
      // Обработка групп: разгруппировываем и рекурсивно удаляем
      if (DeletionManager._isUngroupableGroup(obj)) {
        const deleted = this._handleGroupDeletion(obj)
        deletedObjects.push(...deleted)
        return
      }

      // Обычное удаление объекта
      canvas.remove(obj)
      deletedObjects.push(obj)
    })

    // Операции только на верхнем уровне
    if (_isRecursiveCall) return null

    canvas.discardActiveObject()
    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    const result = {
      objects: deletedObjects,
      withoutSave
    }

    canvas.fire('editor:objects-deleted', result)
    return result
  }
}
