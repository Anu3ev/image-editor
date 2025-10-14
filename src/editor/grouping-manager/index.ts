// src/editor/grouping-manager/index.js
import { Group, ActiveSelection, FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'

export type GroupActionOptions = {
  target?: ActiveSelection | FabricObject[],
  withoutSave?: boolean
}

export type UngroupActionOptions = {
  target?: Group,
  withoutSave?: boolean
}

/**
 * Параметры события editor:objects-ungrouped
 */
export type UngroupedObjectsData = {
  object: FabricObject,
  selection: ActiveSelection,
  ungroupedObjects: FabricObject[],
  withoutSave?: boolean
}

/**
 * Параметры события editor:objects-grouped
 */
export type GroupedObjectsData = {
  group: Group
  withoutSave?: boolean
}

export default class GroupingManager {
  /**
   * Инстанс редактора с доступом к canvas
   */
  public editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Получить объекты для группировки
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
 * Группировка объектов
 * @param options
 * @param options.target - объект ActiveSelection или массив объектов для группировки
 * @param options.withoutSave - Не сохранять состояние
 * @fires editor:objects-grouped
 */
  public group({
    target,
    withoutSave = false
  }: GroupActionOptions = {}): GroupedObjectsData | null {
    const { canvas, historyManager } = this.editor

    // Получаем объекты для группировки
    const objectsToGroup = this._getObjectsToGroup(target)
    if (!objectsToGroup) return null

    try {
      historyManager.suspendHistory()

      // Создаем группу с уникальным ID
      const group = new Group(objectsToGroup, {
        id: `group-${nanoid()}`
      })

      // Удаляем объекты из canvas
      objectsToGroup.forEach((obj) => canvas.remove(obj))

      // Добавляем группу и выделяем её
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
 * Разгруппировка объектов
 * @param options
 * @param options.target - объект Group для разгруппировки
 * @param options.withoutSave - Не сохранять состояние
 * @returns данные о разгруппировке или null, если объект не является группой
 * @fires editor:objects-ungrouped
 */
  public ungroup({
    target,
    withoutSave = false
  }: UngroupActionOptions = {}): UngroupedObjectsData | null {
    const { canvas, historyManager } = this.editor
    const group = target || canvas.getActiveObject()

    if (!(group instanceof Group)) return null

    try {
      historyManager.suspendHistory()

      // Получаем все объекты внутри группы, удаляем группу и добавляем объекты обратно на канвас
      const ungroupedObjects = group.removeAll()
      canvas.remove(group)

      ungroupedObjects.forEach((groupedObj) => canvas.add(groupedObj))

      // Выделяем все объекты, которые были в группе
      const selection = new ActiveSelection(ungroupedObjects, {
        canvas
      })

      canvas.setActiveObject(selection)
      canvas.requestRenderAll()

      const result: UngroupedObjectsData = {
        object: group,
        selection,
        ungroupedObjects,
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
