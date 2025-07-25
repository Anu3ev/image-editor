// src/editor/grouping-manager/index.js
import { Group, ActiveSelection, FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'

export type GroupActionOptions = {
  object?: FabricObject,
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
   * @param options.object - массив объектов для группировки
   * @fires editor:objects-grouped
   */
  public group({
    object,
    withoutSave
  }: GroupActionOptions = {}): void {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()
    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (!(activeObject instanceof ActiveSelection)) return

    // Получаем все объекты внутри activeselection, группируем их и удаляем из канваса
    const objectsToGroup = activeObject.getObjects()

    const group = new Group(objectsToGroup)
    objectsToGroup.forEach((obj) => canvas.remove(obj))

    group.set('id', `${group.type}-${nanoid()}`)
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.renderAll()

    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:objects-grouped', {
      object: activeObject,
      group,
      withoutSave
    })
  }

  /**
   * Разгруппировка объектов
   * @param options
   * @param options.object - объект для разгруппировки
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:objects-ungrouped
   */
  public ungroup({
    object,
    withoutSave
  }: GroupActionOptions = {}): void {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()
    const group = object || canvas.getActiveObject()

    if (!(group instanceof Group)) return

    // Получаем все объекты внутри группы, удаляем группу и добавляем объекты обратно на канвас
    const grouppedObjects = group.removeAll()
    canvas.remove(group)

    grouppedObjects.forEach((grouppedObj) => canvas.add(grouppedObj))

    // Выделяем все объекты, которые были в группе
    const sel = new ActiveSelection(grouppedObjects, {
      canvas
    })

    canvas.setActiveObject(sel)
    canvas.renderAll()

    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:objects-ungrouped', {
      object: group,
      selection: sel,
      withoutSave
    })
  }
}
