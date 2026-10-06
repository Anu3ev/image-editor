import { FabricObject, ActiveSelection, Canvas } from 'fabric'
import { ImageEditor } from '../index'

export default class LayerManager {
  /**
   * Reference to the editor containing the canvas.
   */
  public editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Bring an object to the front along the Z axis
   * @param object
   * @param options
   * @param options.withoutSave - Do not save the action to the change history
   * If saving is enabled while text editing is active,
   * the manager first finishes editing so that the text is saved
   * as a separate history step before the layer change.
   * @fires editor:object-bring-to-front
   */
  public bringToFront(
    object?: FabricObject,
    { withoutSave }: { withoutSave?: boolean } = {}
  ): void {
    const {
      canvas,
      historyManager,
      textManager
    } = this.editor

    if (!withoutSave) {
      textManager.exitActiveTextEditing()
    }

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
   * Move an object up one level along the Z axis
   * @param object
   * @param options
   * @param options.withoutSave - Do not save the action to the change history
   * If saving is enabled while text editing is active,
   * the manager first finishes editing so that the text is saved
   * as a separate history step before the layer change.
   * @fires editor:object-bring-forward
   */
  public bringForward(
    object?: FabricObject,
    { withoutSave }: { withoutSave?: boolean } = {}
  ): void {
    const {
      canvas,
      historyManager,
      textManager
    } = this.editor

    if (!withoutSave) {
      textManager.exitActiveTextEditing()
    }

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
   * Send an object to the back along the Z axis
   * @param object
   * @param options
   * @param options.withoutSave - Do not save the action to the change history
   * If saving is enabled while text editing is active,
   * the manager first finishes editing so that the text is saved
   * as a separate history step before the layer change.
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
      textManager,
      interactionBlocker: { overlayMask },
      backgroundManager: { backgroundObject }
    } = this.editor

    if (!withoutSave) {
      textManager.exitActiveTextEditing()
    }

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject instanceof ActiveSelection) {
      const selectedObjects = activeObject.getObjects()

      // Send objects to the bottom layer, starting with the lowest object in the selection
      for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
        canvas.sendObjectToBack(selectedObjects[i])
      }
    } else {
      canvas.sendObjectToBack(activeObject)
    }

    if (backgroundObject) {
      canvas.sendObjectToBack(backgroundObject)
    }

    // Send internal helper elements to the back
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
   * Move an object down one level along the Z axis
   * @param object
   * @param options
   * @param options.withoutSave - Do not save the action to the change history
   * If saving is enabled while text editing is active,
   * the manager first finishes editing so that the text is saved
   * as a separate history step before the layer change.
   */
  public sendBackwards(
    object?: FabricObject,
    { withoutSave }: { withoutSave?: boolean } = {}
  ): void {
    const {
      canvas,
      montageArea,
      historyManager,
      textManager,
      interactionBlocker: { overlayMask },
      backgroundManager: { backgroundObject }
    } = this.editor

    if (!withoutSave) {
      textManager.exitActiveTextEditing()
    }

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    // Handle the active selection
    if (activeObject instanceof ActiveSelection) {
      LayerManager._moveSelectionBackwards(canvas, activeObject)
    } else {
      canvas.sendObjectBackwards(activeObject)
    }

    if (backgroundObject) {
      canvas.sendObjectToBack(backgroundObject)
    }

    // Send internal helper elements to the back
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
   * Moves selected objects up one level: each object moves
   * one position above its current position
   * @param canvas - Canvas instance
   * @param activeSelection - Active selection
   */
  private static _moveSelectionForward(canvas: Canvas, activeSelection: ActiveSelection): void {
    const canvasObjects = canvas.getObjects()
    const selectedObjects = activeSelection.getObjects()

    // Check the boundary case: are all selected objects above all other objects?
    const canAnyObjectMove = selectedObjects.some((obj) => {
      const currentIndex = canvasObjects.indexOf(obj)

      // Look for an object above the current one that is not in the selection
      for (let i = currentIndex + 1; i < canvasObjects.length; i += 1) {
        if (!selectedObjects.includes(canvasObjects[i])) {
          return true // Found an object, so moving up is possible
        }
      }
      return false // No objects found above
    })

    if (!canAnyObjectMove) return // No object can move up

    // Sort objects by their current positions (top to bottom)
    // to process them from highest to lowest
    const sortedSelectedObjects = selectedObjects
      .map((obj) => ({ obj, index: canvasObjects.indexOf(obj) }))
      .sort((a, b) => b.index - a.index)

    // Move each object up one position individually
    sortedSelectedObjects.forEach((item) => {
      canvas.bringObjectForward(item.obj)
    })
  }

  /**
   * Moves selected objects down one level: each object moves
   * one position below its current position
   * @param canvas - Canvas instance
   * @param activeSelection - Active selection
   */
  private static _moveSelectionBackwards(canvas: Canvas, activeSelection: ActiveSelection): void {
    const canvasObjects = canvas.getObjects()
    const selectedObjects = activeSelection.getObjects()

    // Check the boundary case: are all selected objects below all other objects?
    const canAnyObjectMove = selectedObjects.some((obj) => {
      const currentIndex = canvasObjects.indexOf(obj)

      // Look for an object below the current one that is not in the selection
      for (let i = currentIndex - 1; i >= 0; i -= 1) {
        if (!selectedObjects.includes(canvasObjects[i])) {
          return true // Found an object, so moving down is possible
        }
      }
      return false // No objects found below
    })

    if (!canAnyObjectMove) return // No object can move down

    // Sort objects by their current positions (bottom to top)
    // to process them from lowest to highest
    const sortedSelectedObjects = selectedObjects
      .map((obj) => ({ obj, index: canvasObjects.indexOf(obj) }))
      .sort((a, b) => a.index - b.index)

    // Move each object down one position individually
    sortedSelectedObjects.forEach((item) => {
      canvas.sendObjectBackwards(item.obj)
    })
  }
}
