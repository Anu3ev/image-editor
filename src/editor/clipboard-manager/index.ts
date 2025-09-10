import { ActiveSelection, FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import { CLIPBOARD_DATA_PREFIX } from '../constants'

import { ImageEditor } from '../index'

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
   * Синхронное копирование объекта в системный буфер обмена
   * @fires editor:object-copied
   */
  public copy(): void {
    const { canvas } = this.editor
    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.locked) return

    // Асинхронно клонируем объект для внутреннего буфера (не блокирует систему)
    this.cloneToInternalClipboard(activeObject)

    // Копируем объект в системный буфер обмена
    this.copyToSystemClipboard(activeObject)
  }

  /**
   * Асинхронное клонирование для внутреннего буфера
   */
  private async cloneToInternalClipboard(activeObject: FabricObject): Promise<void> {
    const { canvas, errorManager } = this.editor

    try {
      const clonedObject = await activeObject.clone(['format'])
      this.clipboard = clonedObject
      canvas.fire('editor:object-copied', { object: clonedObject })
    } catch (error) {
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: 'cloneToInternalClipboard',
        code: 'CLONE_FAILED',
        message: 'Ошибка клонирования объекта для внутреннего буфера',
        data: error as object
      })
    }
  }

  /**
   * Копирование в системный буфер обмена
   */
  private async copyToSystemClipboard(activeObject: FabricObject): Promise<boolean> {
    const { errorManager } = this.editor

    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard) {
      errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: 'copyToSystemClipboard',
        code: 'CLIPBOARD_NOT_SUPPORTED',
        message: 'navigator.clipboard не поддерживается в этом браузере или отсутствует HTTPS-соединение.'
      })
      return false
    }

    try {
      // Готовим данные для копирования
      const objectData = activeObject.toObject(['format'])
      const jsonString = JSON.stringify(objectData)

      // Для изображений пытаемся скопировать как изображение
      if (activeObject.type === 'image') {
        return this.copyImageToClipboard(activeObject, jsonString)
      }

      // Для других объектов копируем как текст
      return this.copyTextToClipboard(jsonString)
    } catch (error) {
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: 'copyToSystemClipboard',
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
  private async copyImageToClipboard(imageObject: FabricObject, fallbackText: string): Promise<boolean> {
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
      console.warn('Failed to copy image to clipboard:', error)

      this.editor.errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: 'copyImageToClipboard',
        code: 'CLIPBOARD_WRITE_IMAGE_FAILED',
        message: `Ошибка записи изображения в буфер обмена, выполняется fallback к текстовому копированию: ${error}`,
        data: error as object
      })

      // Fallback к текстовому копированию при ошибке
      return this.copyTextToClipboard(fallbackText)
    }
  }

  /**
   * Копирование текста в буфер обмена
   */
  private async copyTextToClipboard(jsonString: string): Promise<boolean> {
    try {
      const text = `${CLIPBOARD_DATA_PREFIX}${jsonString}`

      await navigator.clipboard.writeText(text)
      console.info('Text copied to clipboard successfully')
      return true
    } catch (error) {
      const { errorManager } = this.editor
      errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: 'copyTextToClipboard',
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
  private addClonedObjectToCanvas(clonedObject: FabricObject): void {
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
      const clonedObject = await targetObject.clone(['format'])

      // Устанавливаем новые координаты и ID
      clonedObject.set({
        id: `${clonedObject.type}-${nanoid()}`,
        left: clonedObject.left + 10,
        top: clonedObject.top + 10,
        evented: true
      })

      // Добавляем на canvas
      this.addClonedObjectToCanvas(clonedObject)

      canvas.fire('editor:object-duplicated', { object: clonedObject })

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

    const { imageManager } = this.editor
    const { items } = clipboardData
    const lastItem = items[items.length - 1]
    const blob = lastItem.getAsFile()

    // Если в буфере обмена есть изображение, то получаем и вставляем его
    if (lastItem.type !== 'text/html' && blob) {
      const reader = new FileReader()
      reader.onload = async(f) => {
        if (!f.target) return

        const { image } = await this.editor.imageManager.importImage({
          source: f.target.result as string,
          fromClipboard: true
        }) ?? {}

        if (image) {
          this.editor.canvas.fire('editor:object-pasted', { object: image })
        }
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
        const { image } = await imageManager.importImage({ source: img.src, fromClipboard: true }) ?? {}

        if (image) {
          this.editor.canvas.fire('editor:object-pasted', { object: image })
        }

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
      const clonedObj = await this.clipboard.clone(['format'])

      canvas.discardActiveObject()
      clonedObj.set({
        id: `${clonedObj.type}-${nanoid()}`,
        left: clonedObj.left + 10,
        top: clonedObj.top + 10,
        evented: true
      })

      // Добавляем клонированный объект на canvas
      this.addClonedObjectToCanvas(clonedObj)

      canvas.fire('editor:object-pasted', { object: clonedObj })
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
