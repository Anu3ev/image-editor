import { ActiveSelection } from 'fabric'
import { ImageEditor } from '../index'

export default class SelectionManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Выделить все объекты
   * @fires editor:all-objects-selected
   */
  public selectAll(): void {
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
