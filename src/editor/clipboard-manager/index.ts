import { ActiveSelection, FabricObject, Group } from 'fabric'
import { CLIPBOARD_DATA_PREFIX, CLIPBOARD_CLONE_OBJECT_KEYS } from '../constants'

import { ImageEditor } from '../index'
import type { ImportImageOptions } from '../image-manager'
import { materializeObjectIdentity } from '../utils/object-identity'

/** Exact geometry of one object before Fabric's internal serialization during clone. */
type CloneGeometrySnapshot = Readonly<{
  angle: number
  childCount: number
  height: number
  left: number
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  strokeWidth: number
  top: number
  width: number
}>

export default class ClipboardManager {
  /**
   * Reference to the editor containing the canvas.
   */
  public editor: ImageEditor

  /**
   * Contains the object copied to the clipboard.
   */
  public clipboard: ActiveSelection | FabricObject | null

  /**
   * @param options
   * @param options.editor - Editor instance with access to the canvas
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.clipboard = null
  }

  /**
   * Starts copying the active object to the internal and system clipboards.
   * @fires editor:object-copied
   */
  public copy(): void {
    const { canvas } = this.editor
    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.locked) return

    this._copyObjectToClipboard({
      object: activeObject,
      method: 'copy'
    })
  }

  /** Clones an object without losing geometry precision and lets external code prepare the clone. */
  private async _cloneObject({ object }: { object: FabricObject }): Promise<FabricObject> {
    const geometry = this._captureCloneGeometry({ object })
    const clonedObject = await object.clone(CLIPBOARD_CLONE_OBJECT_KEYS)

    this._restoreCloneGeometry({ clonedObject, geometry })
    this._prepareObjectClone({
      clonedObject
    })

    return clonedObject
  }

  /** Saves the exact geometry of the root and nested objects before calling Fabric clone. */
  private _captureCloneGeometry({ object }: { object: FabricObject }): CloneGeometrySnapshot[] {
    const objects = [object]
    const geometry: CloneGeometrySnapshot[] = []

    for (let index = 0; index < objects.length; index += 1) {
      const currentObject = objects[index]
      if (!currentObject) throw new Error(this.editor.t('clipboard.errors.cloneSourceMissing'))

      const children = currentObject instanceof Group ? currentObject.getObjects() : []
      geometry.push({
        angle: currentObject.angle,
        childCount: children.length,
        height: currentObject.height,
        left: currentObject.left,
        scaleX: currentObject.scaleX,
        scaleY: currentObject.scaleY,
        skewX: currentObject.skewX,
        skewY: currentObject.skewY,
        strokeWidth: currentObject.strokeWidth,
        top: currentObject.top,
        width: currentObject.width
      })
      objects.push(...children)
    }

    return geometry
  }

  /** Restores values rounded by Fabric's internal serialization during clone. */
  private _restoreCloneGeometry({
    clonedObject,
    geometry
  }: {
    clonedObject: FabricObject
    geometry: readonly CloneGeometrySnapshot[]
  }): void {
    const clonedObjects = [clonedObject]

    for (let index = 0; index < geometry.length; index += 1) {
      const snapshot = geometry[index]
      const clone = clonedObjects[index]
      if (!snapshot || !clone) throw new Error(this.editor.t('clipboard.errors.cloneStructureMismatch'))

      clone.set({
        angle: snapshot.angle,
        left: snapshot.left,
        scaleX: snapshot.scaleX,
        scaleY: snapshot.scaleY,
        skewX: snapshot.skewX,
        skewY: snapshot.skewY,
        strokeWidth: snapshot.strokeWidth,
        top: snapshot.top
      })
      // Textbox recalculates height on set({ width }), so the exact dimensions are restored last.
      clone.width = snapshot.width
      clone.height = snapshot.height
      clone.dirty = true

      const clonedChildren = clone instanceof Group ? clone.getObjects() : []
      if (snapshot.childCount !== clonedChildren.length) {
        throw new Error(this.editor.t('clipboard.errors.cloneObjectCountMismatch'))
      }

      clonedObjects.push(...clonedChildren)
    }

    if (clonedObjects.length !== geometry.length) {
      throw new Error(this.editor.t('clipboard.errors.cloneStructureMismatch'))
    }

    for (const clone of clonedObjects) clone.setCoords()
  }

  /**
   * Detaches the clone's customData from the original object before external preparation.
   */
  private _detachObjectCustomData({ object }: { object: FabricObject }): void {
    const { customData } = object

    if (!customData || typeof customData !== 'object') return

    object.customData = JSON.parse(JSON.stringify(customData)) as object
  }

  /**
   * Prepares the root clone and all nested objects without knowing their domain role.
   */
  private _prepareObjectClone({ clonedObject }: { clonedObject: FabricObject }): void {
    const { prepareObjectClone } = this.editor.options
    const objectsToPrepare: FabricObject[] = [clonedObject]

    for (let index = 0; index < objectsToPrepare.length; index += 1) {
      const object = objectsToPrepare[index]

      this._detachObjectCustomData({ object })
      prepareObjectClone?.(object)

      if (!(object instanceof ActiveSelection) && !(object instanceof Group)) continue

      const childObjects = object.getObjects()

      for (let childIndex = 0; childIndex < childObjects.length; childIndex += 1) {
        objectsToPrepare.push(childObjects[childIndex])
      }
    }
  }

  /**
   * Clones the object, saves it to the internal clipboard, and starts copying it to the system clipboard.
   */
  private async _copyObjectToClipboard({
    object,
    method
  }: {
    object: FabricObject
    method: 'copy' | 'cut'
  }): Promise<boolean> {
    const { canvas, errorManager } = this.editor

    try {
      const clonedObject = await this._cloneObject({ object })

      this._materializeCloneGeometry({
        clonedObject
      })

      this.clipboard = clonedObject
      canvas.fire('editor:object-copied', { object: clonedObject })

      this._copyToSystemClipboardInBackground({
        object: clonedObject,
        method
      })

      return true
    } catch (error) {
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: '_cloneToInternalClipboard',
        code: 'CLONE_FAILED',
        message: this.editor.t('clipboard.errors.internalCloneFailed'),
        data: error as object
      })
      return false
    }
  }

  /**
   * Copies the object to the system clipboard in the background without blocking the user's action.
   */
  private _copyToSystemClipboardInBackground({
    object,
    method
  }: {
    object: FabricObject
    method: 'copy' | 'cut'
  }): void {
    this._copyToSystemClipboard(object).catch((error) => {
      this.editor.errorManager.emitWarning({
        origin: 'ClipboardManager',
        method,
        code: 'COPY_FAILED',
        message: this.editor.t('clipboard.warnings.systemCopyFailed'),
        data: error as object
      })
    })
  }

  /**
   * Copy to the system clipboard
   */
  private async _copyToSystemClipboard(activeObject: FabricObject): Promise<boolean> {
    const { errorManager } = this.editor

    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard) {
      errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: '_copyToSystemClipboard',
        code: 'CLIPBOARD_NOT_SUPPORTED',
        message: this.editor.t('clipboard.warnings.notSupported')
      })
      return false
    }

    try {
      // Prepare the data to copy
      const objectData = activeObject.toObject(CLIPBOARD_CLONE_OBJECT_KEYS)
      const jsonString = JSON.stringify(objectData)

      // For images, try to copy as an image
      if (activeObject.type === 'image') {
        return this._copyImageToClipboard(activeObject, jsonString)
      }

      // For other objects, copy as text
      return this._copyTextToClipboard(jsonString)
    } catch (error) {
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: '_copyToSystemClipboard',
        code: 'COPY_FAILED',
        message: this.editor.t('clipboard.errors.copyFailed'),
        data: error as object
      })
      return false
    }
  }

  /**
   * Copy an image to the clipboard
   */
  private async _copyImageToClipboard(imageObject: FabricObject, fallbackText: string): Promise<boolean> {
    try {
      // Create the canvas element synchronously
      const el = imageObject.toCanvasElement({ enableRetinaScaling: false })
      const dataUrl = el.toDataURL()
      const mime = dataUrl.slice(5).split(';')[0]
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const buffer = new Uint8Array(binary.length)

      for (let i = 0; i < binary.length; i += 1) {
        buffer[i] = binary.charCodeAt(i)
      }

      const blob = new Blob([buffer.buffer], { type: mime })
      const clipboardItem = new ClipboardItem({ [mime]: blob })

      await navigator.clipboard.write([clipboardItem])
      console.info(this.editor.t('clipboard.logs.imageCopied'))
      return true
    } catch (error) {
      this.editor.errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: '_copyImageToClipboard',
        code: 'CLIPBOARD_WRITE_IMAGE_FAILED',
        message: this.editor.t('clipboard.warnings.imageWriteFallback', { error }),
        data: error as object
      })

      // Fall back to copying text on error
      return this._copyTextToClipboard(fallbackText)
    }
  }

  /**
   * Copy text to the clipboard
   */
  private async _copyTextToClipboard(jsonString: string): Promise<boolean> {
    try {
      const text = `${CLIPBOARD_DATA_PREFIX}${jsonString}`

      await navigator.clipboard.writeText(text)
      console.info(this.editor.t('clipboard.logs.textCopied'))
      return true
    } catch (error) {
      const { errorManager } = this.editor
      errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: '_copyTextToClipboard',
        code: 'CLIPBOARD_WRITE_TEXT_FAILED',
        message: this.editor.t('clipboard.warnings.textWriteFailed', { error }),
        data: error as object
      })
      return false
    }
  }

  /**
   * Adds a cloned object to the canvas according to its type
   * @param clonedObject - Cloned object to add
   */
  private _addClonedObjectToCanvas(clonedObject: FabricObject): void {
    const { canvas, historyManager } = this.editor

    canvas.discardActiveObject()

    if (clonedObject instanceof ActiveSelection) {
      historyManager.suspendHistory()
      clonedObject.canvas = canvas
      clonedObject.forEachObject((obj) => {
        canvas.add(obj)
      })

      canvas.setActiveObject(clonedObject)
      canvas.requestRenderAll()
      historyManager.resumeHistory()
      historyManager.saveState()
      return
    }

    canvas.add(clonedObject)
    canvas.setActiveObject(clonedObject)
    canvas.requestRenderAll()
  }

  /**
   * Materializes the clone in canonical geometry before adding it to the canvas and internal clipboard.
   */
  private _materializeCloneGeometry({ clonedObject }: { clonedObject: FabricObject }): void {
    const {
      shapeManager,
      textManager
    } = this.editor

    if (clonedObject instanceof ActiveSelection) {
      clonedObject.forEachObject((object) => {
        textManager.commitStandaloneTextScale({
          target: object
        })
        shapeManager.commitRehydratedShapeLayout({
          target: object
        })
      })
      clonedObject.setCoords()
      return
    }

    textManager.commitStandaloneTextScale({
      target: clonedObject
    })
    shapeManager.commitRehydratedShapeLayout({
      target: clonedObject
    })
  }

  /**
   * Handle image import from the clipboard
   * @param source - Image source (data URL or URL)
   */
  private async _handleImageImport(source: string): Promise<void> {
    const { canvas, errorManager } = this.editor

    let isDeferred = false
    let isSettled = false

    type DeferredImportOptions = Partial<Omit<ImportImageOptions, 'source' | 'fromClipboard'>>

    let resolveDeferred: ((importOptions?: DeferredImportOptions | null) => void) | null = null
    let rejectDeferred: ((error?: unknown) => void) | null = null

    const deferredPromise = new Promise<DeferredImportOptions | null>((resolve, reject) => {
      resolveDeferred = (importOptions?: DeferredImportOptions | null) => {
        if (isSettled) return
        isSettled = true
        resolve(importOptions ?? null)
      }

      rejectDeferred = (error?: unknown) => {
        if (isSettled) return
        isSettled = true
        reject(error)
      }
    })

    const defer = () => {
      isDeferred = true

      return {
        resolve: resolveDeferred as (importOptions?: DeferredImportOptions | null) => void,
        reject: rejectDeferred as (error?: unknown) => void
      }
    }

    canvas.fire('editor:external-image-paste-pending', {
      imageSource: source,
      defer
    })

    if (!isDeferred) {
      await this._importExternalImage({ source })
      return
    }

    try {
      const importOptions = await deferredPromise

      if (importOptions === null) {
        await this._importExternalImage({ source })
        return
      }

      await this._importExternalImage({ source, importOptions })
    } catch (error) {
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: '_handleImageImport',
        code: 'EXTERNAL_PASTE_DEFERRED_REJECTED',
        message: this.editor.t('clipboard.errors.deferredPasteRejected'),
        data: { error }
      })
    }
  }

  /**
   * Import an image from the external clipboard
   */
  private async _importExternalImage({
    source,
    importOptions = {}
  }: {
    source: string
    importOptions?: Partial<Omit<ImportImageOptions, 'source' | 'fromClipboard'>>
  }): Promise<void> {
    const options: ImportImageOptions = {
      source,
      ...importOptions,
      fromClipboard: true
    }

    const result = await this.editor.imageManager.importImage(options)

    const image = result?.image
    const imageSource = result?.source ?? source

    if (image) {
      this.editor.canvas.fire('editor:object-pasted', {
        imageSource,
        fromInternalClipboard: false,
        object: image
      })
    }
  }

  /**
   * Create a duplicate of an object: copy and immediately paste it
   * @param objectToCopy - Object to copy (uses the active object if omitted)
   * @fires editor:object-copied
   * @fires editor:object-pasted
   */
  public async copyPaste(objectToCopy?: FabricObject): Promise<boolean> {
    const { canvas } = this.editor
    const targetObject = objectToCopy || canvas.getActiveObject()

    if (!targetObject || targetObject.locked) return false

    try {
      // Use asynchronous cloning to handle SVG and complex objects correctly
      const clonedObject = await this._cloneObject({ object: targetObject })

      materializeObjectIdentity({
        rootObject: clonedObject
      })

      clonedObject.set({
        left: clonedObject.left + 10,
        top: clonedObject.top + 10
      })

      this._materializeCloneGeometry({
        clonedObject
      })

      // Add to the canvas
      this._addClonedObjectToCanvas(clonedObject)

      canvas.fire('editor:object-duplicated', {
        targetObject,
        clonedObject
      })

      return true
    } catch (error) {
      const { errorManager } = this.editor
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: 'copyPaste',
        code: 'COPY_PASTE_FAILED',
        message: this.editor.t('clipboard.errors.duplicateFailed'),
        data: error as object
      })
      return false
    }
  }

  /**
   * Cuts the active object: first copies it to the internal clipboard, then removes it from the canvas.
   */
  public async cut(): Promise<boolean> {
    const { canvas, deletionManager, errorManager } = this.editor
    const activeObject = canvas.getActiveObject()

    if (!activeObject || activeObject.locked) return false

    try {
      const objectsToDelete = activeObject instanceof ActiveSelection
        ? activeObject.getObjects()
        : [activeObject]
      const deleteTargets = deletionManager.resolveDeleteTargets({
        objects: objectsToDelete
      })

      if (!deleteTargets.deletableObjects.length) {
        deletionManager.deleteSelectedObjects({
          objects: objectsToDelete
        })

        return false
      }

      const cutSourceObject = this._createCutSourceObject({
        activeObject,
        objectsToCut: deleteTargets.deletableObjects
      })

      if (!cutSourceObject) return false

      const copied = await this._copyObjectToClipboard({
        object: cutSourceObject,
        method: 'cut'
      })

      if (!copied) return false

      const result = deletionManager.deleteSelectedObjects({
        objects: objectsToDelete
      })

      return Boolean(result)
    } catch (error) {
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: 'cut',
        code: 'CUT_FAILED',
        message: this.editor.t('clipboard.errors.cutFailed'),
        data: error as object
      })
      return false
    }
  }

  /**
   * Builds the object to place on the clipboard when cutting.
   */
  private _createCutSourceObject({
    activeObject,
    objectsToCut
  }: {
    activeObject: FabricObject
    objectsToCut: FabricObject[]
  }): FabricObject | null {
    if (!(activeObject instanceof ActiveSelection)) return activeObject
    if (!objectsToCut.length) return null
    if (objectsToCut.length === activeObject.getObjects().length) return activeObject
    if (objectsToCut.length === 1) return objectsToCut[0]

    return new ActiveSelection(objectsToCut, {
      canvas: this.editor.canvas
    })
  }

  /**
   * Handler for pasting an object or image from the clipboard.
   * @param event — Event object
   * @param event.clipboardData — Clipboard data
   * @param event.clipboardData.items — Clipboard items
   */
  public async handlePasteEvent({ clipboardData }: ClipboardEvent): Promise<void> {
    if (!clipboardData?.items?.length) {
      this.paste()
      return
    }

    // First check for text data containing editor objects
    const textData = clipboardData.getData('text/plain')
    if (textData && textData.startsWith(CLIPBOARD_DATA_PREFIX)) {
      // If the system clipboard contains editor data, use the internal clipboard
      this.paste()
      return
    }

    const { items } = clipboardData
    const lastItem = items[items.length - 1]
    const blob = lastItem.getAsFile()

    // If the clipboard contains an image, retrieve and paste it
    if (lastItem.type !== 'text/html' && blob) {
      const reader = new FileReader()
      reader.onload = (f) => {
        if (!f.target) return

        this._handleImageImport(f.target.result as string).catch((error: unknown) => {
          this.editor.errorManager.emitError({
            origin: 'ClipboardManager',
            method: 'handlePasteEvent',
            code: 'PASTE_IMAGE_FAILED',
            message: this.editor.t('clipboard.errors.pasteImageFailed'),
            data: error as object
          })
        })
      }

      reader.readAsDataURL(blob)
      return
    }

    // If the clipboard contains text/html with an img tag, retrieve and paste it
    const htmlData = clipboardData.getData('text/html')

    if (htmlData) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlData, 'text/html')
      const img = doc.querySelector('img')

      if (img?.src) {
        this._handleImageImport(img.src).catch((error: unknown) => {
          this.editor.errorManager.emitError({
            origin: 'ClipboardManager',
            method: 'handlePasteEvent',
            code: 'PASTE_HTML_IMAGE_FAILED',
            message: this.editor.t('clipboard.errors.pasteHtmlImageFailed'),
            data: error as object
          })
        })

        return
      }
    }

    this.paste()
  }

  /**
   * Paste an object from the internal clipboard
   * @fires editor:object-pasted
   */
  public async paste(): Promise<boolean> {
    const { canvas } = this.editor

    if (!this.clipboard) return false

    try {
      // Clone the object asynchronously (correct for all object types)
      const clonedObj = await this._cloneObject({ object: this.clipboard })

      canvas.discardActiveObject()

      materializeObjectIdentity({
        rootObject: clonedObj
      })

      clonedObj.set({
        left: clonedObj.left + 10,
        top: clonedObj.top + 10
      })

      this._materializeCloneGeometry({
        clonedObject: clonedObj
      })

      // Add the cloned object to the canvas
      this._addClonedObjectToCanvas(clonedObj)

      canvas.fire('editor:object-pasted', {
        fromInternalClipboard: true,
        clipboardObject: this.clipboard,
        object: clonedObj
      })

      return true
    } catch (error) {
      const { errorManager } = this.editor
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: 'paste',
        code: 'PASTE_FAILED',
        message: this.editor.t('clipboard.errors.pasteFailed'),
        data: error as object
      })
      return false
    }
  }
}
