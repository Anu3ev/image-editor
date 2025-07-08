import { ActiveSelection, Canvas, FabricObject, FabricObjectProps, ObjectEvents, SerializedObjectProps } from 'fabric'
import { nanoid } from 'nanoid'

import { ImageEditor } from '../index'

export default class ClipboardManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   * @type {ImageEditor}
   */
  editor: ImageEditor

  /**
   * Содержит объект, скопированный в буфер обмена.
   * @type {ActiveSelection | FabricObject | null}
   */
  clipboard: ActiveSelection | FabricObject | null

  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.clipboard = null
  }

  /**
   * Копирование объекта
   * @fires editor:object-copied
   */
  copy() {
    const { canvas, errorManager } = this.editor
    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    // фикс: сразу пишем в системный буфер, чтобы сохранить контекст жеста
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard) {
      errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: 'copy',
        code: 'CLIPBOARD_NOT_SUPPORTED',
        // eslint-disable-next-line max-len
        message: 'ClipboardManager. navigator.clipboard не поддерживается в этом браузере или отсутствует соединение по HTTPS-протоколу.'
      })

      this._cloneAndFire(canvas, activeObject)
      return
    }

    // обычный объект копируем как текст
    if (activeObject.type !== 'image') {
      const text = `application/image-editor:${JSON.stringify(activeObject.toObject(['format']))}`
      navigator.clipboard.writeText(text)
        .catch((err) => {
          errorManager.emitWarning({
            origin: 'ClipboardManager',
            method: 'copy',
            code: 'CLIPBOARD_WRITE_TEXT_FAILED',
            message: `Ошибка записи текстового объекта в буфер обмена: ${err.message}`,
            data: err
          })
        })

      this._cloneAndFire(canvas, activeObject)
      return
    }

    // картинку — преобразуем в Blob синхронно из dataURL и сразу отдаем в ClipboardItem
    const el = activeObject.toCanvasElement()
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

    navigator.clipboard.write([clipboardItem])
      .catch((err) => {
        errorManager.emitWarning({
          origin: 'ClipboardManager',
          method: 'copy',
          code: 'CLIPBOARD_WRITE_IMAGE_FAILED',
          message: `Ошибка записи изображения в буфер обмена: ${err.message}`
        })
      })

    this._cloneAndFire(canvas, activeObject)
  }

  /**
   * Клонирует объект и вызывает событие 'editor:object-copied'.
   * @param canvas - экземпляр canvas
   * @param object - активный объект
   */
  private _cloneAndFire(
    canvas: Canvas,
    object: FabricObject<Partial<FabricObjectProps>, SerializedObjectProps, ObjectEvents>
  ) {
    object.clone(['format'])
      .then((clonedObject) => {
        this.clipboard = clonedObject
        canvas.fire('editor:object-copied', { object: clonedObject })
      })
      .catch((error) => {
        this.editor.errorManager.emitError({
          origin: 'ClipboardManager',
          method: '_cloneAndFire',
          code: 'CLONE_FAILED',
          message: 'ClipboardManager. Ошибка клонирования объекта',
          data: error
        })
      })
  }

  /**
   * Обработчик вставки объекта или изображения из буфера обмена.
   * @param {Object} event — объект события
   * @param {Object} event.clipboardData — данные из буфера обмена
   * @param {Array} event.clipboardData.items — элементы буфера обмена
   */
  handlePasteEvent({ clipboardData }:ClipboardEvent) {
    if (!clipboardData?.items?.length) return

    const { imageManager } = this.editor
    const { items } = clipboardData
    const lastItem = items[items.length - 1]

    // Если в буфере обмена есть изображение, то получаем и вставляем его
    if (lastItem.type !== 'text/html') {
      const blob = lastItem.getAsFile()
      if (!blob) return

      const reader = new FileReader()
      reader.onload = (f) => {
        if (!f.target) return

        this.editor.imageManager.importImage({ source: f.target.result as string })
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
        imageManager.importImage({ source: img.src })
        return
      }
    }

    this.paste()
  }

  /**
   * Вставка объекта
   * @fires editor:object-pasted
   */
  async paste() {
    const { canvas } = this.editor

    if (!this.clipboard) return

    // клонируем объект, чтобы не менять его положение в буфере обмена
    const clonedObj = await this.clipboard.clone(['format'])

    canvas.discardActiveObject()
    clonedObj.set({
      id: `${clonedObj.type}-${nanoid()}`,
      left: clonedObj.left + 10,
      top: clonedObj.top + 10,
      evented: true
    })

    // Если объект activeselection, то перебираем все его объекты и добавляем их в canvas
    if (clonedObj instanceof ActiveSelection) {
      clonedObj.canvas = canvas
      clonedObj.forEachObject((obj) => {
        canvas.add(obj)
      })
    } else {
      canvas.add(clonedObj)
    }

    canvas.setActiveObject(clonedObj)
    canvas.requestRenderAll()

    canvas.fire('editor:object-pasted', { object: clonedObj })
  }
}
