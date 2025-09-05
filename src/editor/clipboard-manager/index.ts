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
   * Копирование объекта
   * @fires editor:object-copied
   */
  public async copy(): Promise<void> {
    const { canvas, errorManager } = this.editor
    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.locked) return

    // Сначала клонируем объект для внутреннего буфера
    try {
      const clonedObject = await activeObject.clone(['format'])
      this.clipboard = clonedObject
      canvas.fire('editor:object-copied', { object: clonedObject })
    } catch (error) {
      errorManager.emitError({
        origin: 'ClipboardManager',
        method: 'copy',
        code: 'CLONE_FAILED',
        message: 'Ошибка клонирования объекта',
        data: error as object
      })
      return
    }

    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard) {
      errorManager.emitWarning({
        origin: 'ClipboardManager',
        method: 'copy',
        code: 'CLIPBOARD_NOT_SUPPORTED',
        // eslint-disable-next-line max-len
        message: 'ClipboardManager. navigator.clipboard не поддерживается в этом браузере или отсутствует соединение по HTTPS-протоколу.'
      })
      return
    }

    // обычный объект копируем как текст
    if (activeObject.type !== 'image') {
      const text = `${CLIPBOARD_DATA_PREFIX}${JSON.stringify(activeObject.toObject(['format']))}`

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
      return
    }

    // картинку — преобразуем в Blob синхронно из dataURL и сразу отдаем в ClipboardItem
    const el = activeObject.toCanvasElement({
      enableRetinaScaling: false
    })
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
        // В Safari или при отсутствии разрешений - тихо фоллбэчим
        if (err.name === 'NotAllowedError') {
          // Не показываем ошибку пользователю, просто логируем
          console.info('Clipboard access denied, object copied to internal clipboard only')
          return
        }

        // Fallback: копируем изображение как текст
        const fallbackText = `${CLIPBOARD_DATA_PREFIX}${JSON.stringify(activeObject.toObject(['format']))}`

        navigator.clipboard.writeText(fallbackText)
          .catch((fallbackErr) => {
            errorManager.emitWarning({
              origin: 'ClipboardManager',
              method: 'copy',
              code: 'CLIPBOARD_WRITE_IMAGE_FAILED',
              // eslint-disable-next-line max-len
              message: `Ошибка записи изображения в буфер обмена: ${err.message}. Fallback также не удался: ${fallbackErr.message}`,
              data: { originalError: err, fallbackError: fallbackErr }
            })
          })
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

    const { imageManager } = this.editor
    const { items } = clipboardData
    const lastItem = items[items.length - 1]
    const blob = lastItem.getAsFile()

    // Если в буфере обмена есть изображение, то получаем и вставляем его
    if (lastItem.type !== 'text/html' && blob) {
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
  public async paste(): Promise<void> {
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
