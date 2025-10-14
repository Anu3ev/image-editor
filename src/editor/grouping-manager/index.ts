// src/editor/grouping-manager/index.js
import { Group, ActiveSelection, FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'

export type GroupActionOptions = {
  object?: FabricObject,
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
  object: FabricObject
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
 * Группировка объектов
 * @param options
 * @param options.withoutSave - Не сохранять состояние
 * @param options.object - объект ActiveSelection для группировки
 * @fires editor:objects-grouped
 */
  public group({
    object,
    withoutSave = false
  }: GroupActionOptions = {}): GroupedObjectsData | null {
    const { canvas, historyManager } = this.editor
    const activeObject = object || canvas.getActiveObject()

    if (!activeObject || !(activeObject instanceof ActiveSelection)) return null

    try {
      historyManager.suspendHistory()

      const objectsToGroup = activeObject.getObjects()

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
        object: activeObject,
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
 * @param options.object - объект Group для разгруппировки
 * @param options.withoutSave - Не сохранять состояние
 * @returns данные о разгруппировке или null, если объект не является группой
 * @fires editor:objects-ungrouped
 */
  public ungroup({
    object,
    withoutSave = false
  }: GroupActionOptions = {}): UngroupedObjectsData | null {
    const { canvas, historyManager } = this.editor
    const group = object || canvas.getActiveObject()

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
