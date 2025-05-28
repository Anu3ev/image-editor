import { ActiveSelection } from 'fabric'

export default class SelectionManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }) {
    this.editor = editor
  }

  /**
   * Выделить все объекты
   * @fires editor:all-objects-selected
   */
  selectAll() {
    const { canvas, canvasManager, objectLockManager } = this.editor

    canvas.discardActiveObject()

    const activeObjects = canvasManager.getObjects()
    const hasLockedObjects = activeObjects.some((obj) => obj.locked)

    const object = activeObjects.length > 1
      ? new ActiveSelection(canvasManager.getObjects(), { canvas })
      : activeObjects[0]

    // Если есть заблокированные объекты, то блокируем выделенный объект
    if (hasLockedObjects) {
      objectLockManager.lockObject({ object, skipInnerObjects: true, withoutSave: true })
    }

    canvas.setActiveObject(object)
    canvas.requestRenderAll()

    canvas.fire('editor:all-objects-selected', { selected: object })
  }
}
