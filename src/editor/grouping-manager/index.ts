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
 * Параметры события editor:objects-ungrouped
 */
export type UngroupedObjectsData = {
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
   * Получить группы для разгруппировки
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

    if (!activeObject || !(activeObject instanceof Group)) {
      return null
    }

    return [activeObject]
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
 * @param options.target - объект Group, массив групп или ActiveSelection с группами для разгруппировки
 * @param options.withoutSave - Не сохранять состояние
 * @returns данные о разгруппировке или null, если нет групп для разгруппировки
 * @fires editor:objects-ungrouped
 */
  public ungroup({
    target,
    withoutSave = false
  }: UngroupActionOptions = {}): UngroupedObjectsData | null {
    const { canvas, historyManager } = this.editor

    // Получаем группы для разгруппировки
    const groupsToUngroup = this._getGroupsToUngroup(target)
    if (!groupsToUngroup) return null

    try {
      historyManager.suspendHistory()

      const allUngroupedObjects: FabricObject[] = []

      // Разгруппировываем все группы
      groupsToUngroup.forEach((group) => {
        const ungroupedObjects = group.removeAll()
        canvas.remove(group)
        ungroupedObjects.forEach((groupedObj) => {
          canvas.add(groupedObj)
          allUngroupedObjects.push(groupedObj)
        })
      })

      // Выделяем все разгруппированные объекты
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
