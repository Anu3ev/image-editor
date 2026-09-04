import { ActiveSelection, FabricObject, Group } from 'fabric'
import { CLIPBOARD_DATA_PREFIX, CLIPBOARD_CLONE_OBJECT_KEYS } from '../constants'

import { ImageEditor } from '../index'
import type { ImportImageOptions } from '../image-manager'
import { materializeObjectIdentity } from '../utils/object-identity'

/** Точная геометрия одного объекта до внутренней сериализации Fabric при clone. */
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
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Содержит объект, скопированный в буфер обмена.
   */
  public clipboard: ActiveSelection | FabricObject | null

  /**
   * @param options
   * @param options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.clipboard = null
  }

  /**
   * Запускает копирование активного объекта во внутренний и системный буфер.
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

  /** Клонирует объект без потери точности геометрии и даёт внешнему коду подготовить клон. */
  private async _cloneObject({ object }: { object: FabricObject }): Promise<FabricObject> {
    const geometry = this._captureCloneGeometry({ object })
    const clonedObject = await object.clone(CLIPBOARD_CLONE_OBJECT_KEYS)

    this._restoreCloneGeometry({ clonedObject, geometry })
    this._prepareObjectClone({
      clonedObject
    })

    return clonedObject
  }

  /** Сохраняет точную геометрию корня и вложенных объектов до вызова Fabric clone. */
  private _captureCloneGeometry({ object }: { object: FabricObject }): CloneGeometrySnapshot[] {
    const objects = [object]
    const geometry: CloneGeometrySnapshot[] = []

    for (let index = 0; index < objects.length; index += 1) {
      const currentObject = objects[index]
      if (!currentObject) throw new Error('Исходный объект должен существовать до клонирования')

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

  /** Восстанавливает значения, округлённые внутренней сериализацией Fabric при clone. */
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
      if (!snapshot || !clone) throw new Error('Структура клона должна совпадать с исходным объектом')

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
      // Textbox пересчитывает высоту при set({ width }), поэтому точные размеры возвращаются последними.
      clone.width = snapshot.width
      clone.height = snapshot.height
      clone.dirty = true

      const clonedChildren = clone instanceof Group ? clone.getObjects() : []
      if (snapshot.childCount !== clonedChildren.length) {
        throw new Error('Количество объектов внутри клона должно совпадать с исходным объектом')
      }

      clonedObjects.push(...clonedChildren)
    }

    if (clonedObjects.length !== geometry.length) {
      throw new Error('Структура клона должна совпадать с исходным объектом')
    }

    for (const clone of clonedObjects) clone.setCoords()
  }

  /**
   * Отделяет customData клона от исходного объекта перед внешней подготовкой.
   */
  private _detachObjectCustomData({ object }: { object: FabricObject }): void {
    const { customData } = object

    if (!customData || typeof customData !== 'object') return

    object.customData = JSON.parse(JSON.stringify(customData)) as object
  }

  /**
   * Подготавливает корневой клон и все вложенные объекты без знания их доменной роли.
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
   * Клонирует объект, сохраняет его во внутренний буфер и запускает системное копирование.
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
        message: 'Ошибка клонирования объекта для внутреннего буфера',
        data: error as object
      })
      return false
    }
  }

  /**
   * Фоновое копирование объекта в системный буфер без блокировки действия пользователя.
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
        message: 'Ошибка копирования объекта в системный буфер обмена',
        data: error as object
      })
    })
  }

  /**
   * Копирование в системный буфер обмена
   */
  private async _copyToSystemClipboard(activeObject: FabricObject): Promise<boolean> {
    const { errorManager } = this.editor

    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard) {
      errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: '_copyToSystemClipboard',
        code: 'CLIPBOARD_NOT_SUPPORTED',
        message: 'navigator.clipboard не поддерживается в этом браузере или отсутствует HTTPS-соединение.'
      })
      return false
    }

    try {
      // Готовим данные для копирования
      const objectData = activeObject.toObject(CLIPBOARD_CLONE_OBJECT_KEYS)
      const jsonString = JSON.stringify(objectData)

      // Для изображений пытаемся скопировать как изображение
      if (activeObject.type === 'image') {
        return this._copyImageToClipboard(activeObject, jsonString)
      }

      // Для других объектов копируем как текст
      return this._copyTextToClipboard(jsonString)
    } catch (error) {
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: '_copyToSystemClipboard',
        code: 'COPY_FAILED',
        message: 'Ошибка копирования объекта',
        data: error as object
      })
      return false
    }
  }

  /**
   * Копирование изображения в буфер обмена
   */
  private async _copyImageToClipboard(imageObject: FabricObject, fallbackText: string): Promise<boolean> {
    try {
      // Создаем canvas элемент синхронно
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
      console.info('Image copied to clipboard successfully')
      return true
    } catch (error) {
      this.editor.errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: '_copyImageToClipboard',
        code: 'CLIPBOARD_WRITE_IMAGE_FAILED',
        message: `Ошибка записи изображения в буфер обмена, выполняется fallback к текстовому копированию: ${error}`,
        data: error as object
      })

      // Fallback к текстовому копированию при ошибке
      return this._copyTextToClipboard(fallbackText)
    }
  }

  /**
   * Копирование текста в буфер обмена
   */
  private async _copyTextToClipboard(jsonString: string): Promise<boolean> {
    try {
      const text = `${CLIPBOARD_DATA_PREFIX}${jsonString}`

      await navigator.clipboard.writeText(text)
      console.info('Text copied to clipboard successfully')
      return true
    } catch (error) {
      const { errorManager } = this.editor
      errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: '_copyTextToClipboard',
        code: 'CLIPBOARD_WRITE_TEXT_FAILED',
        message: `Ошибка записи текста в буфер обмена: ${error}`,
        data: error as object
      })
      return false
    }
  }

  /**
   * Добавляет клонированный объект на canvas с учетом типа объекта
   * @param clonedObject - клонированный объект для добавления
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
   * Материализует clone в каноническую геометрию до добавления на canvas и в internal clipboard.
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
   * Обработка импорта изображения из буфера обмена
   * @param source - источник изображения (data URL или URL)
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
        message: 'Вставка изображения из буфера обмена была отменена или завершилась ошибкой',
        data: { error }
      })
    }
  }

  /**
   * Импорт изображения из внешнего буфера обмена
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
   * Создать копию объекта - копирует и сразу вставляет
   * @param objectToCopy - объект для копирования (если не указан, используется активный объект)
   * @fires editor:object-copied
   * @fires editor:object-pasted
   */
  public async copyPaste(objectToCopy?: FabricObject): Promise<boolean> {
    const { canvas } = this.editor
    const targetObject = objectToCopy || canvas.getActiveObject()

    if (!targetObject || targetObject.locked) return false

    try {
      // Используем асинхронное клонирование для корректной работы с SVG и сложными объектами
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

      // Добавляем на canvas
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
        message: 'Ошибка создания копии объекта',
        data: error as object
      })
      return false
    }
  }

  /**
   * Вырезает активный объект: сначала копирует во внутренний буфер, затем удаляет с canvas.
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
        message: 'Ошибка вырезания объекта',
        data: error as object
      })
      return false
    }
  }

  /**
   * Собирает объект, который должен попасть в буфер при вырезании.
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
   * Обработчик вставки объекта или изображения из буфера обмена.
   * @param event — объект события
   * @param event.clipboardData — данные из буфера обмена
   * @param event.clipboardData.items — элементы буфера обмена
   */
  public async handlePasteEvent({ clipboardData }: ClipboardEvent): Promise<void> {
    if (!clipboardData?.items?.length) {
      this.paste()
      return
    }

    // Сначала проверяем наличие текстовых данных с объектами редактора
    const textData = clipboardData.getData('text/plain')
    if (textData && textData.startsWith(CLIPBOARD_DATA_PREFIX)) {
      // Если в системном буфере есть данные редактора, используем внутренний буфер
      this.paste()
      return
    }

    const { items } = clipboardData
    const lastItem = items[items.length - 1]
    const blob = lastItem.getAsFile()

    // Если в буфере обмена есть изображение, то получаем и вставляем его
    if (lastItem.type !== 'text/html' && blob) {
      const reader = new FileReader()
      reader.onload = (f) => {
        if (!f.target) return

        this._handleImageImport(f.target.result as string).catch((error: unknown) => {
          this.editor.errorManager.emitError({
            origin: 'ClipboardManager',
            method: 'handlePasteEvent',
            code: 'PASTE_IMAGE_FAILED',
            message: 'Ошибка вставки изображения из буфера обмена',
            data: error as object
          })
        })
      }

      reader.readAsDataURL(blob)
      return
    }

    // Если в буфере text/html c тегом img, то получаем и вставляем его
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
            message: 'Ошибка вставки изображения из HTML',
            data: error as object
          })
        })

        return
      }
    }

    this.paste()
  }

  /**
   * Вставка объекта из внутреннего буфера
   * @fires editor:object-pasted
   */
  public async paste(): Promise<boolean> {
    const { canvas } = this.editor

    if (!this.clipboard) return false

    try {
      // Клонируем объект асинхронно (правильно для всех типов объектов)
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

      // Добавляем клонированный объект на canvas
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
        message: 'Ошибка вставки объекта',
        data: error as object
      })
      return false
    }
  }
}
