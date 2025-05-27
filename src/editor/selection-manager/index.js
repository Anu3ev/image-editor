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
    const { canvas, canvasManager } = this.editor

    canvas.discardActiveObject()

    const activeObjects = canvasManager.getObjects()

    const sel = activeObjects.length > 1
      ? new ActiveSelection(canvasManager.getObjects(), { canvas })
      : activeObjects[0]

    canvas.setActiveObject(sel)
    canvas.requestRenderAll()

    canvas.fire('editor:all-objects-selected', { selected: sel })
  }
}
