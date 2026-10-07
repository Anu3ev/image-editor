import { ActiveSelection, FabricObject } from 'fabric'
import type { EditorOptions } from '../types/options'
import { ImageEditor } from '../index'

import {
  DEFAULT_ROTATE_RATIO
} from '../constants'
import { resolveShapeGroupFromTarget } from '../shape-manager/domain/shape-reference'

export type ResetObjectOptions = {
  object?: FabricObject
  alwaysFitObject?: boolean
  withoutSave?: boolean
}

export default class TransformManager {
  /**
   * Editor instance with access to the canvas
   */
  public editor: ImageEditor

  /**
   * Listener parameters (options).
   */
  public options: EditorOptions

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.options = editor.options
  }

  /**
   * Sets the absolute rotation angle of an object
   * @param object - Target object
   * @param angle - Absolute angle in degrees
   * @param options
   * @param options.withoutSave - Do not save the state
   * @fires editor:object-rotated
   */
  public setAngle(
    object: FabricObject,
    angle: number,
    { withoutSave }: { withoutSave?: boolean } = {}
  ): void {
    const { canvas, historyManager } = this.editor

    if (!object) return

    object.rotate(angle)
    object.setCoords()
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-rotated', {
      object,
      withoutSave,
      angle
    })
  }

  /**
   * Rotate the active object by a relative angle
   * @param angle
   * @param options
   * @param options.withoutSave - Do not save the state
   * @fires editor:object-rotated
   */
  public rotate(angle: number = DEFAULT_ROTATE_RATIO, { withoutSave }: { withoutSave?: boolean } = {}): void {
    const { canvas } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return

    const newAngle = (obj.angle ?? 0) + angle
    this.setAngle(obj, newAngle, { withoutSave })
  }

  /**
   * Flip horizontally
   * @param options
   * @param options.withoutSave - Do not save the state
   * @fires editor:object-flipped-x
   */
  public flipX({ withoutSave }: { withoutSave?: boolean } = {}): void {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipX = !obj.flipX
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-flipped-x', {
      object: obj,
      withoutSave
    })
  }

  /**
   * Flip vertically
   * @param options
   * @param options.withoutSave - Do not save the state
   * @fires editor:object-flipped-y
   */
  public flipY({ withoutSave }: { withoutSave?: boolean } = {}): void {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipY = !obj.flipY
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-flipped-y', {
      object: obj,
      withoutSave
    })
  }

  /**
   * Set object opacity
   * @param options
   * @param options.object - Object whose opacity should be set
   * @param options.withoutSave - Do not save the state
   * @param options.opacity - Opacity from 0 to 1
   * @fires editor:object-opacity-changed
   */
  public setActiveObjectOpacity({
    object,
    opacity = 1,
    withoutSave
  }: { object?: FabricObject; opacity?: number; withoutSave?: boolean } = {}): void {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    let hasAppliedOpacity = false

    if (activeObject instanceof ActiveSelection) {
      const objects = activeObject.getObjects()

      for (let index = 0; index < objects.length; index += 1) {
        const selectionObject = objects[index]
        const isApplied = this._setCanvasObjectOpacity({
          object: selectionObject,
          opacity
        })

        hasAppliedOpacity = hasAppliedOpacity || isApplied
      }
    } else {
      hasAppliedOpacity = this._setCanvasObjectOpacity({
        object: activeObject,
        opacity
      })
    }

    if (!hasAppliedOpacity) return

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-opacity-changed', {
      object: activeObject,
      opacity,
      withoutSave
    })
  }

  /**
   * Sets opacity according to the shape group domain contract.
   */
  private _setCanvasObjectOpacity({
    object,
    opacity
  }: {
    object: FabricObject
    opacity: number
  }): boolean {
    const shapeGroup = resolveShapeGroupFromTarget({ target: object })

    if (shapeGroup) {
      const updated = this.editor.shapeManager.setOpacity({
        target: shapeGroup,
        opacity,
        withoutSave: true
      })

      return Boolean(updated)
    }

    object.set('opacity', opacity)

    return true
  }

  /**
   * Scale an object
   * @param options
   * @param options.object - Object containing the image to scale
   * @param options.type - Scaling type
   * 'contain' - scales the image to fit inside
   * 'cover' - scales the image to fill the canvas dimensions
   * @param options.withoutSave - Do not save the state
   * @param options.fitAsOneObject - Scale all objects in the active group as a single object
   * @fires editor:image-fitted
   */
  public fitObject({
    object,
    type = this.options.scaleType,
    withoutSave,
    fitAsOneObject
  }: {
    object?: FabricObject,
    type?: 'contain' | 'cover',
    withoutSave?: boolean,
    fitAsOneObject?: boolean
  } = {}): void {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject instanceof ActiveSelection && !fitAsOneObject) {
      const selectedItems = activeObject.getObjects()

      canvas.discardActiveObject()

      selectedItems.forEach((obj: FabricObject) => {
        this._fitSingleObject(obj, type)
      })

      const sel = new ActiveSelection(selectedItems, { canvas })
      canvas.setActiveObject(sel)
    } else {
      this._fitSingleObject(activeObject, type)

      if (activeObject instanceof ActiveSelection && fitAsOneObject) {
        this._materializeFittedSelection({
          selection: activeObject
        })
      }
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-fitted', {
      object: activeObject,
      type,
      withoutSave,
      fitAsOneObject
    })
  }

  /**
   * Scales an individual object taking its rotation angle into account
   * @param obj - Object to scale
   * @param type - Scaling type
   * @private
   */
  private _fitSingleObject(obj: FabricObject, type: 'contain' | 'cover'): void {
    const {
      canvasManager,
      montageArea
    } = this.editor

    const { width, height, scaleX = 1, scaleY = 1, angle = 0 } = obj

    // Calculate the current scaled dimensions
    const scaledWidth = width * Math.abs(scaleX)
    const scaledHeight = height * Math.abs(scaleY)

    // Calculate dimensions accounting for rotation
    const radians = (angle * Math.PI) / 180
    const cos = Math.abs(Math.cos(radians))
    const sin = Math.abs(Math.sin(radians))

    const rotatedWidth = scaledWidth * cos + scaledHeight * sin
    const rotatedHeight = scaledWidth * sin + scaledHeight * cos

    // Calculate the scale factor
    const canvasWidth = montageArea.width
    const canvasHeight = montageArea.height

    let scaleFactor: number

    if (type === 'contain') {
      scaleFactor = Math.min(canvasWidth / rotatedWidth, canvasHeight / rotatedHeight)
    } else {
      scaleFactor = Math.max(canvasWidth / rotatedWidth, canvasHeight / rotatedHeight)
    }

    // Apply scaling to the current scaleX and scaleY values
    obj.set({
      scaleX: scaleX * scaleFactor,
      scaleY: scaleY * scaleFactor
    })

    canvasManager.centerObjectToMontageArea({ object: obj })

    const fittedObjectMaterialized = this._materializeFittedObject({
      object: obj
    })

    if (!fittedObjectMaterialized) {
      obj.setCoords?.()
    }
  }

  /**
   * Bakes the fitted object's transient scale into canonical state if the object supports this lifecycle.
   */
  private _materializeFittedObject({ object }: { object: FabricObject }): boolean {
    const {
      shapeManager,
      textManager
    } = this.editor
    const shapeLayoutParams: {
      target: FabricObject
      textScale?: number
    } = {
      target: object
    }

    if (object.shapeComposite === true) {
      shapeLayoutParams.textScale = Math.abs(object.scaleX ?? 1) || 1
    }

    const standaloneTextScaleCommitted = textManager.commitStandaloneTextScale({
      target: object
    })
    const shapeLayoutCommitted = shapeManager.commitRehydratedShapeLayout(shapeLayoutParams)

    return standaloneTextScaleCommitted || shapeLayoutCommitted
  }

  /**
   * Returns true if the fitted child object should go through the materialization pipeline.
   */
  private _requiresFittedObjectMaterialization({ object }: { object: FabricObject }): boolean {
    const isStandaloneTextObject = object.type === 'textbox' || object.type === 'background-textbox'
    const isShapeCompositeObject = 'shapeComposite' in object && object.shapeComposite === true

    return isStandaloneTextObject || isShapeCompositeObject
  }

  /**
   * Materializes the fitted ActiveSelection through the same child-level pipeline as other group transforms.
   */
  private _materializeFittedSelection({ selection }: { selection: ActiveSelection }): void {
    const { canvas } = this.editor
    const objects = selection.getObjects()

    const hasObjectsThatRequireMaterialization = objects.some((object) => {
      return this._requiresFittedObjectMaterialization({
        object
      })
    })

    if (!hasObjectsThatRequireMaterialization) return

    canvas.discardActiveObject()

    objects.forEach((object) => {
      const fittedObjectMaterialized = this._materializeFittedObject({
        object
      })

      if (!fittedObjectMaterialized) {
        object.setCoords?.()
      }
    })

    const nextSelection = new ActiveSelection(objects, { canvas })
    canvas.setActiveObject(nextSelection)
  }

  /**
   * Set the default scale for all objects inside the editor artboard
   */
  public resetObjects(): void {
    this.editor.canvasManager.getObjects().forEach((object) => {
      this.resetObject({ object })
    })
  }

  /**
   * Reset the object scale to its default
   * @param options
   * @param options.object - Object to reset. Resets the active object if omitted
   * @param options.withoutSave - Do not save the state
   * @param options.alwaysFitObject - Fit the object to the workspace even if it is smaller than the workspace
   * @fires editor:object-reset
   */
  public resetObject({ object, alwaysFitObject = false, withoutSave = false }: ResetObjectOptions = {}): void {
    const {
      canvas,
      canvasManager,
      montageArea,
      imageManager,
      historyManager,
      options: { scaleType }
    } = this.editor

    const currentObject = object || canvas.getActiveObject()

    if (!currentObject || currentObject.locked) return

    historyManager.suspendHistory()

    const isImage = currentObject.type === 'image' || currentObject.format === 'svg'

    if (!isImage) {
      currentObject.set({
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        angle: 0
      })
    }

    if (alwaysFitObject) {
      this.fitObject({ object: currentObject, withoutSave: true, fitAsOneObject: true })
    } else {
      const { width: montageAreaWidth, height: montageAreaHeight } = montageArea
      const { width: imageWidth, height: imageHeight } = currentObject

      const scaleFactor = imageManager.calculateScaleFactor({
        imageObject: currentObject,
        scaleType
      })

      const needFit = (scaleType === 'contain' && scaleFactor < 1)
        || (scaleType === 'cover' && (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight))

      // Apply contain and cover only if the image dimensions exceed the canvas dimensions; otherwise, simply reset
      if (needFit) {
        this.fitObject({ object: currentObject, withoutSave: true, fitAsOneObject: true })
      } else {
        currentObject.set({ scaleX: 1, scaleY: 1 })
      }
    }

    currentObject.set({ flipX: false, flipY: false, angle: 0 })
    canvasManager.centerObjectToMontageArea({ object: currentObject })
    canvas.renderAll()

    historyManager.resumeHistory()
    if (!withoutSave) historyManager.saveState()

    canvas.fire('editor:object-reset', {
      object: currentObject,
      withoutSave,
      alwaysFitObject
    })
  }
}
