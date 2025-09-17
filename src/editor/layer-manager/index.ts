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
      interactionBlocker: { overlayMask },
      backgroundManager: { backgroundObject }
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

    if (backgroundObject) {
      canvas.sendObjectToBack(backgroundObject)
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
      interactionBlocker: { overlayMask },
      backgroundManager: { backgroundObject }
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

    if (backgroundObject) {
      canvas.sendObjectToBack(backgroundObject)
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
   * Сдвигает выделенные объекты на один уровень вверх - каждый объект поднимается
   * на одну позицию выше относительно своей текущей позиции
   * @param canvas - экземпляр холста
   * @param activeSelection - активное выделение
   */
  private static _moveSelectionForward(canvas: Canvas, activeSelection: ActiveSelection): void {
    const canvasObjects = canvas.getObjects()
    const selectedObjects = activeSelection.getObjects()

    // Проверяем граничный случай: все ли объекты выделения находятся выше всех остальных
    const canAnyObjectMove = selectedObjects.some((obj) => {
      const currentIndex = canvasObjects.indexOf(obj)

      // Ищем объект выше текущего, не входящий в выделение
      for (let i = currentIndex + 1; i < canvasObjects.length; i += 1) {
        if (!selectedObjects.includes(canvasObjects[i])) {
          return true // Нашли объект, значит можем подняться
        }
      }
      return false // Не нашли объектов выше
    })

    if (!canAnyObjectMove) return // Ни один объект не может подняться

    // Сортируем объекты по их текущим позициям (сверху вниз)
    // чтобы обрабатывать их от самого верхнего к самому нижнему
    const sortedSelectedObjects = selectedObjects
      .map((obj) => ({ obj, index: canvasObjects.indexOf(obj) }))
      .sort((a, b) => b.index - a.index)

    // Перемещаем каждый объект индивидуально на одну позицию вверх
    sortedSelectedObjects.forEach((item) => {
      canvas.bringObjectForward(item.obj)
    })
  }

  /**
   * Сдвигает выделенные объекты на один уровень вниз - каждый объект опускается
   * на одну позицию ниже относительно своей текущей позиции
   * @param canvas - экземпляр холста
   * @param activeSelection - активное выделение
   */
  private static _moveSelectionBackwards(canvas: Canvas, activeSelection: ActiveSelection): void {
    const canvasObjects = canvas.getObjects()
    const selectedObjects = activeSelection.getObjects()

    // Проверяем граничный случай: все ли объекты выделения находятся ниже всех остальных
    const canAnyObjectMove = selectedObjects.some((obj) => {
      const currentIndex = canvasObjects.indexOf(obj)

      // Ищем объект ниже текущего, не входящий в выделение
      for (let i = currentIndex - 1; i >= 0; i -= 1) {
        if (!selectedObjects.includes(canvasObjects[i])) {
          return true // Нашли объект, значит можем опуститься
        }
      }
      return false // Не нашли объектов ниже
    })

    if (!canAnyObjectMove) return // Ни один объект не может опуститься

    // Сортируем объекты по их текущим позициям (снизу вверх)
    // чтобы обрабатывать их от самого нижнего к самому верхнему
    const sortedSelectedObjects = selectedObjects
      .map((obj) => ({ obj, index: canvasObjects.indexOf(obj) }))
      .sort((a, b) => a.index - b.index)

    // Перемещаем каждый объект индивидуально на одну позицию вниз
    sortedSelectedObjects.forEach((item) => {
      canvas.sendObjectBackwards(item.obj)
    })
  }
}
