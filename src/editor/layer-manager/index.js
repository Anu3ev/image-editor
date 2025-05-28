export default class LayerManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({
    editor
  }) {
    this.editor = editor
  }

  /**
   * Поднять объект навверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-to-front
   */
  bringToFront(object, { withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
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

    canvas.fire('editor:object-bring-to-front')
  }

  /**
   * Поднять объект на один уровень вверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-forward
   */
  bringForward(object, { withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      LayerManager._moveSelectionForward(canvas, activeObject)
    } else {
      canvas.bringObjectForward(activeObject)
    }

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-bring-forward')
  }

  /**
 * Отправить объект на задний план по оси Z
 * @param {fabric.Object} object
 * @param {Object} options
 * @param {Boolean} options.withoutSave - Не сохранять состояние
 * @fires editor:object-send-to-back
 */
  sendToBack(object, { withoutSave } = {}) {
    const {
      canvas,
      montageArea,
      historyManager,
      interactionBlocker: { overlayMask }
    } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
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
    canvas.sendObjectToBack(overlayMask)

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-send-to-back')
  }

  /**
  * Отправить объект на один уровень ниже по оси Z
  * @param {fabric.Object} object
  * @param {Object} options
  * @param {Boolean} options.withoutSave - Не сохранять состояние
  */
  sendBackwards(object, { withoutSave } = {}) {
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
    if (activeObject.type === 'activeselection') {
      LayerManager._moveSelectionBackwards(canvas, activeObject)
    } else {
      canvas.sendObjectBackwards(activeObject)
    }

    // Служебные элементы отправляем вниз
    canvas.sendObjectToBack(montageArea)
    canvas.sendObjectToBack(overlayMask)

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-send-backwards')
  }

  /**
   * Сдвигает выделенные объекты на один уровень вверх относительно ближайшего верхнего объекта
   * @param {fabric.Canvas} canvas - экземпляр холста
   * @param {fabric.ActiveSelection} activeSelection - активное выделение
   * @returns {void}
   * @private
   */
  static _moveSelectionForward(canvas, activeSelection) {
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
   * @param {fabric.Canvas} canvas - экземпляр холста
   * @param {fabric.ActiveSelection} activeSelection - активное выделение
   * @returns {void}
   * @private
   */
  static _moveSelectionBackwards(canvas, activeSelection) {
    const canvasObjects = canvas.getObjects()
    const selectedObjects = activeSelection.getObjects()

    // Находим минимальный индекс среди выделенных объектов
    const minSelectedIndex = Math.min(...selectedObjects.map((obj) => canvasObjects.indexOf(obj)))

    // Перемещаем выделенные объекты вниз относительно ближайшего нижнего объекта, начиная с нижнего
    for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
      canvas.moveObjectTo(selectedObjects[i], minSelectedIndex - 1)
    }
  }
}
