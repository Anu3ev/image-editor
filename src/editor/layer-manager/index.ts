import { FabricObject, ActiveSelection, Canvas } from 'fabric'
import { ImageEditor } from '../index'

export default class LayerManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Поднять объект навверх по оси Z
   * @param object
   * @param options
   * @param options.withoutSave - Не сохранять действие в истории изменений
   * @fires editor:object-bring-to-front
   */
  public bringToFront(
    object?: FabricObject,
    { withoutSave }: { withoutSave?: boolean } = {}
  ): void {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject instanceof ActiveSelection) {
      activeObject.getObjects().forEach((obj) => {
        canvas.bringObjectToFront(obj)
      })
    } else {
      canvas.bringObjectToFront(activeObject)
    }

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-bring-to-front', {
      object: activeObject,
      withoutSave
    })
  }

  /**
   * Поднять объект на один уровень вверх по оси Z
   * @param object
   * @param options
   * @param options.withoutSave - Не сохранять действие в истории изменений
   * @fires editor:object-bring-forward
   */
  public bringForward(
    object?: FabricObject,
    { withoutSave }: { withoutSave?: boolean } = {}
  ): void {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject instanceof ActiveSelection) {
      LayerManager._moveSelectionForward(canvas, activeObject)
    } else {
      canvas.bringObjectForward(activeObject)
    }

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-bring-forward', {
      object: activeObject,
      withoutSave
    })
  }

  /**
   * Отправить объект на задний план по оси Z
   * @param object
   * @param options
   * @param options.withoutSave - Не сохранять действие в истории изменений
   * @fires editor:object-send-to-back
   */
  public sendToBack(
    object?: FabricObject,
    { withoutSave }: { withoutSave?: boolean } = {}
  ): void {
    const {
      canvas,
      montageArea,
      historyManager,
      interactionBlocker: { overlayMask }
    } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject instanceof ActiveSelection) {
      const selectedObjects = activeObject.getObjects()

      // Отправляем объекты на нижний слой, начиная с нижнего объекта выделения
      for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
        canvas.sendObjectToBack(selectedObjects[i])
      }
    } else {
      canvas.sendObjectToBack(activeObject)
    }

    // Служебные элементы отправляем вниз
    canvas.sendObjectToBack(montageArea)

    if (overlayMask) {
      canvas.sendObjectToBack(overlayMask)
    }

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-send-to-back', {
      object: activeObject,
      withoutSave
    })
  }

  /**
  * Отправить объект на один уровень ниже по оси Z
  * @param object
  * @param options
  * @param options.withoutSave - Не сохранять действие в истории изменений
  */
  public sendBackwards(
    object?: FabricObject,
    { withoutSave }: { withoutSave?: boolean } = {}
  ): void {
    const {
      canvas,
      montageArea,
      historyManager,
      interactionBlocker: { overlayMask }
    } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    // Обработка активного выделения
    if (activeObject instanceof ActiveSelection) {
      LayerManager._moveSelectionBackwards(canvas, activeObject)
    } else {
      canvas.sendObjectBackwards(activeObject)
    }

    // Служебные элементы отправляем вниз
    canvas.sendObjectToBack(montageArea)

    if (overlayMask) {
      canvas.sendObjectToBack(overlayMask)
    }

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-send-backwards', {
      object: activeObject,
      withoutSave
    })
  }

  /**
   * Сдвигает выделенные объекты на один уровень вверх относительно ближайшего верхнего объекта
   * @param canvas - экземпляр холста
   * @param activeSelection - активное выделение
   */
  private static _moveSelectionForward(canvas: Canvas, activeSelection: ActiveSelection): void {
    const canvasObjects = canvas.getObjects()
    const selectedObjects = activeSelection.getObjects()

    // Получаем индексы всех выделенных объектов
    const selectedIndices = selectedObjects.map((obj) => canvasObjects.indexOf(obj))

    // Ищем ближайший объект выше ЛЮБОГО из выделенных (не только самого верхнего)
    let targetObjectIndex = -1

    for (let i = 0; i < canvasObjects.length; i += 1) {
      const obj = canvasObjects[i]

      // Если объект не входит в выделение И находится выше хотя бы одного выделенного
      if (!selectedObjects.includes(obj) && selectedIndices.some((selectedIdx) => i > selectedIdx)) {
        targetObjectIndex = i
        break
      }
    }

    // Если нашли объект для обмена местами
    if (targetObjectIndex !== -1) {
    // Сортируем выделенные объекты по их текущим индексам (сверху вниз)
      const sortedSelected = selectedObjects
        .map((obj) => ({ obj, index: canvasObjects.indexOf(obj) }))
        .sort((a, b) => b.index - a.index)

      // Перемещаем каждый выделенный объект на одну позицию выше найденного объекта
      // Начинаем с самого верхнего, чтобы не нарушить порядок
      sortedSelected.forEach((item) => {
        const currentIndex = canvasObjects.indexOf(item.obj)
        if (currentIndex < targetObjectIndex) {
          canvas.moveObjectTo(item.obj, targetObjectIndex)
          // Обновляем targetObjectIndex, так как объект сдвинулся
          targetObjectIndex = currentIndex
        }
      })
    }
  }

  /**
   * Сдвигает выделенные объекты на один уровень вниз относительно ближайшего нижнего объекта
   * @param canvas - экземпляр холста
   * @param activeSelection - активное выделение
   */
  private static _moveSelectionBackwards(canvas: Canvas, activeSelection: ActiveSelection): void {
    const canvasObjects = canvas.getObjects()
    const selectedObjects = activeSelection.getObjects()

    // Получаем индексы всех выделенных объектов
    const selectedIndices = selectedObjects.map((obj) => canvasObjects.indexOf(obj))

    // Ищем ближайший объект ниже ЛЮБОГО из выделенных
    let targetObjectIndex = -1

    for (let i = canvasObjects.length - 1; i >= 0; i -= 1) {
      const obj = canvasObjects[i]

      // Если объект не входит в выделение И находится ниже хотя бы одного выделенного
      if (!selectedObjects.includes(obj) && selectedIndices.some((selectedIdx) => i < selectedIdx)) {
        targetObjectIndex = i
        break
      }
    }

    // Если нашли объект для обмена местами
    if (targetObjectIndex !== -1) {
      // Сортируем выделенные объекты по их текущим индексам (снизу вверх)
      const sortedSelected = selectedObjects
        .map((obj) => ({ obj, index: canvasObjects.indexOf(obj) }))
        .sort((a, b) => a.index - b.index)

      // Перемещаем каждый выделенный объект на одну позицию ниже найденного объекта
      // Начинаем с самого нижнего, чтобы не нарушить порядок
      sortedSelected.forEach((item) => {
        const currentIndex = canvasObjects.indexOf(item.obj)
        if (currentIndex > targetObjectIndex) {
          canvas.moveObjectTo(item.obj, targetObjectIndex)
          // Обновляем targetObjectIndex, так как объект сдвинулся
          targetObjectIndex = currentIndex
        }
      })
    }
  }
}
