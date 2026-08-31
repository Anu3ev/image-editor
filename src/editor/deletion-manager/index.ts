import { FabricObject, Group } from 'fabric'
import { ImageEditor } from '../index'
import type {
  ObjectsDeletedPayload,
  ObjectsDeleteSkippedPayload
} from '../types/events'
import { isCurrentTransformAffectedByRemoval } from '../utils/current-transform'

/**
 * Параметры удаления выбранных объектов.
 */
export type DeleteSelectedObjectsParams = {
  objects?: FabricObject[],
  withoutSave?: boolean,
  ignoreDeleteGuard?: boolean,
  _isRecursiveCall?: boolean
}

/**
 * Параметры расчёта объектов, которые можно удалить.
 */
export type ResolveDeleteTargetsParams = {
  objects?: FabricObject[],
  ignoreDeleteGuard?: boolean
}

/**
 * Результат расчёта объектов, которые можно удалить.
 */
export type DeleteTargets = {
  requestedObjects: FabricObject[]
  deletableObjects: FabricObject[]
  skippedObjects: FabricObject[]
}

/**
 * Внутренний план удаления с признаком реальных изменений canvas.
 */
type DeletePlan = {
  requestedObjects: FabricObject[]
  deletableObjects: FabricObject[]
  skippedObjects: FabricObject[]
  hasCanvasChanges: boolean
}

/**
 * Результат удаления объектов внутри одной операции.
 */
type DeleteObjectsResult = {
  deletedObjects: FabricObject[]
  skippedObjects: FabricObject[]
}

/**
 * Результат разгруппировки при удалении группы.
 */
type GroupDeletionResult = {
  deletedObjects: FabricObject[]
  skippedObjects: FabricObject[]
  objectsToDelete: FabricObject[]
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
  private static _isUngroupableGroup(obj: FabricObject): obj is Group {
    return obj instanceof Group && obj.format !== 'svg'
  }

  /**
   * Проверяет, можно ли удалить объект с учётом внешнего ограничения.
   */
  private _canDeleteObject({
    object,
    ignoreDeleteGuard
  }: {
    object: FabricObject
    ignoreDeleteGuard: boolean
  }): boolean {
    if (ignoreDeleteGuard) return true

    return this.editor.options.canDeleteObject?.(object) ?? true
  }

  /**
   * Делит запрошенные объекты на удаляемые и пропущенные.
   * Заблокированные объекты остаются внутренним ограничением и в skippedObjects не попадают.
   */
  public resolveDeleteTargets({
    objects,
    ignoreDeleteGuard = false
  }: ResolveDeleteTargetsParams = {}): DeleteTargets {
    const targetObjects = objects || this.editor.canvas.getActiveObjects()
    const deletableObjects: FabricObject[] = []
    const skippedObjects: FabricObject[] = []

    for (let index = 0; index < targetObjects.length; index += 1) {
      const object = targetObjects[index]

      if (object.locked) continue

      if (!this._canDeleteObject({ object, ignoreDeleteGuard })) {
        skippedObjects.push(object)
        continue
      }

      deletableObjects.push(object)
    }

    return {
      requestedObjects: targetObjects,
      deletableObjects,
      skippedObjects
    }
  }

  /**
   * Проверяет, приведёт ли удаление к реальным изменениям canvas.
   */
  private _resolveDeletePlan({
    objects,
    ignoreDeleteGuard = false
  }: ResolveDeleteTargetsParams = {}): DeletePlan {
    const deleteTargets = this.resolveDeleteTargets({
      objects,
      ignoreDeleteGuard
    })
    const skippedObjects = [...deleteTargets.skippedObjects]
    let hasCanvasChanges = false

    for (let index = 0; index < deleteTargets.deletableObjects.length; index += 1) {
      const object = deleteTargets.deletableObjects[index]

      if (!DeletionManager._isUngroupableGroup(object)) {
        hasCanvasChanges = true
        continue
      }

      const childObjects = object.getObjects()

      if (!childObjects.length) {
        hasCanvasChanges = true
        continue
      }

      const childTargets = this.resolveDeleteTargets({
        objects: childObjects,
        ignoreDeleteGuard
      })

      if (childTargets.deletableObjects.length > 0) {
        hasCanvasChanges = true
        continue
      }

      skippedObjects.push(...childTargets.skippedObjects)
    }

    return {
      ...deleteTargets,
      skippedObjects,
      hasCanvasChanges
    }
  }

  /**
   * Сообщает внешнему интерфейсу, что часть объектов не была удалена.
   */
  private _fireDeleteSkipped({
    skippedObjects,
    requestedObjects,
    withoutSave
  }: ObjectsDeleteSkippedPayload): void {
    if (!skippedObjects.length) return

    this.editor.canvas.fire('editor:objects-delete-skipped', {
      skippedObjects,
      requestedObjects,
      withoutSave
    })
  }

  /**
   * Возвращает объекты удаления для текущего активного контекста.
   * Если открыт режим редактирования текста, объектные операции должны работать с владельцем текста,
   * а не с внутренним временно активным текстовым объектом.
   */
  private _resolveObjectsForDelete({
    objects,
    withoutSave
  }: {
    objects?: FabricObject[]
    withoutSave: boolean
  }): FabricObject[] | undefined {
    if (objects) return objects
    if (withoutSave) return undefined

    const activeTextEditingOwner = this.editor.textManager.getActiveTextEditingOwner()
    if (!activeTextEditingOwner) return undefined

    return [activeTextEditingOwner]
  }

  /**
   * Разгруппировывает группу и собирает разрешённые дочерние объекты для удаления.
   */
  private _collectGroupObjectsForDeletion({
    group,
    ignoreDeleteGuard
  }: {
    group: Group
    ignoreDeleteGuard: boolean
  }): GroupDeletionResult {
    const { groupingManager } = this.editor
    const childObjects = group.getObjects()
    const childTargets = this.resolveDeleteTargets({
      objects: childObjects,
      ignoreDeleteGuard
    })

    if (childObjects.length && !childTargets.deletableObjects.length) {
      return {
        deletedObjects: [],
        skippedObjects: childTargets.skippedObjects,
        objectsToDelete: []
      }
    }

    const { ungroupedObjects = [] } = groupingManager.ungroup({
      target: group,
      withoutSave: true
    }) ?? {}
    const objectsToDelete: FabricObject[] = []
    const shouldDeleteAllUngroupedObjects = !childObjects.length

    for (let index = 0; index < ungroupedObjects.length; index += 1) {
      const object = ungroupedObjects[index]

      if (shouldDeleteAllUngroupedObjects || childTargets.deletableObjects.includes(object)) {
        objectsToDelete.push(object)
      }
    }

    return {
      deletedObjects: [group],
      skippedObjects: childTargets.skippedObjects,
      objectsToDelete
    }
  }

  /**
   * Удаляет объекты с canvas без управления общей транзакцией истории.
   */
  private _deleteObjects({
    objects,
    ignoreDeleteGuard
  }: {
    objects: FabricObject[]
    ignoreDeleteGuard: boolean
  }): DeleteObjectsResult {
    const { canvas } = this.editor
    const objectsToDelete = [...objects]
    const deletedObjects: FabricObject[] = []
    const skippedObjects: FabricObject[] = []

    for (let index = 0; index < objectsToDelete.length; index += 1) {
      const object = objectsToDelete[index]

      if (DeletionManager._isUngroupableGroup(object)) {
        const result = this._collectGroupObjectsForDeletion({
          group: object,
          ignoreDeleteGuard
        })

        deletedObjects.push(...result.deletedObjects)
        skippedObjects.push(...result.skippedObjects)

        for (let childIndex = 0; childIndex < result.objectsToDelete.length; childIndex += 1) {
          objectsToDelete.push(result.objectsToDelete[childIndex])
        }

        continue
      }

      canvas.remove(object)
      deletedObjects.push(object)
    }

    return {
      deletedObjects,
      skippedObjects
    }
  }

  /**
   * Выполняет изменение canvas внутри приостановленной истории.
   */
  private _deleteObjectsInHistoryTransaction({
    deletePlan,
    ignoreDeleteGuard
  }: {
    deletePlan: DeletePlan
    ignoreDeleteGuard: boolean
  }): DeleteObjectsResult {
    const {
      canvas,
      historyManager
    } = this.editor
    let deleteResult: DeleteObjectsResult = {
      deletedObjects: [],
      skippedObjects: []
    }

    historyManager.suspendHistory()

    try {
      // Завершаем преобразование до удаления его объектов, пока общее выделение ещё цело.
      if (isCurrentTransformAffectedByRemoval({
        canvas,
        objects: deletePlan.deletableObjects
      })) {
        canvas.endCurrentTransform()
      }

      deleteResult = this._deleteObjects({
        objects: deletePlan.deletableObjects,
        ignoreDeleteGuard
      })

      if (deleteResult.deletedObjects.length) {
        canvas.discardActiveObject()
        canvas.renderAll()
      }
    } finally {
      historyManager.resumeHistory()
    }

    return deleteResult
  }

  /**
   * Сохраняет успешное удаление, сообщает о пропущенных объектах и публикует событие удаления.
   */
  private _completeDeleteOperation({
    deletePlan,
    deleteResult,
    skippedObjects,
    withoutSave
  }: {
    deletePlan: DeletePlan
    deleteResult: DeleteObjectsResult
    skippedObjects: FabricObject[]
    withoutSave: boolean
  }): ObjectsDeletedPayload {
    const { canvas, historyManager } = this.editor

    if (!withoutSave) {
      historyManager.saveState()
    }

    const result = {
      objects: deleteResult.deletedObjects,
      withoutSave
    }

    this._fireDeleteSkipped({
      skippedObjects,
      requestedObjects: deletePlan.requestedObjects,
      withoutSave
    })

    canvas.fire('editor:objects-deleted', result)
    return result
  }

  /**
   * Удалить выбранные объекты
   * @param options
   * @param options.objects - массив объектов для удаления
   * @param options.withoutSave - Не сохранять состояние
   * @param options.ignoreDeleteGuard - Не применять внешнюю проверку возможности удаления
   * @param options._isRecursiveCall - Устаревший внутренний параметр, оставлен для совместимости
   * Если удаление сохраняется в историю и в этот момент открыт режим редактирования текста,
   * менеджер сначала завершает редактирование, чтобы текст сохранился
   * отдельным history-шагом до удаления.
   * @fires editor:objects-deleted
   * @fires editor:objects-delete-skipped
   */
  public deleteSelectedObjects({
    objects,
    withoutSave = false,
    ignoreDeleteGuard = false
  }: DeleteSelectedObjectsParams = {}): ObjectsDeletedPayload | null {
    const { textManager } = this.editor
    const objectsForDelete = this._resolveObjectsForDelete({
      objects,
      withoutSave
    })
    const deletePlan = this._resolveDeletePlan({
      objects: objectsForDelete,
      ignoreDeleteGuard
    })

    if (!deletePlan.hasCanvasChanges) {
      this._fireDeleteSkipped({
        skippedObjects: deletePlan.skippedObjects,
        requestedObjects: deletePlan.requestedObjects,
        withoutSave
      })

      return null
    }

    if (!withoutSave) {
      textManager.exitActiveTextEditing()
    }

    const deleteResult = this._deleteObjectsInHistoryTransaction({
      deletePlan,
      ignoreDeleteGuard
    })
    const skippedObjects = [
      ...deletePlan.skippedObjects,
      ...deleteResult.skippedObjects
    ]

    if (!deleteResult.deletedObjects.length) {
      this._fireDeleteSkipped({
        skippedObjects,
        requestedObjects: deletePlan.requestedObjects,
        withoutSave
      })

      return null
    }

    return this._completeDeleteOperation({
      deletePlan,
      deleteResult,
      skippedObjects,
      withoutSave
    })
  }
}
