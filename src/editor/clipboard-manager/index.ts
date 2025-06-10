import { ActiveSelection } from 'fabric'
import { nanoid } from 'nanoid'

import { ImageEditor } from '../index'
import { ExtendedFabricObject } from '../types'

export default class ClipboardManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   * @type {ImageEditor}
   */
  editor: ImageEditor
  /**
   * Содержит объект, скопированный в буфер обмена.
   * @type {ActiveSelection | ExtendedFabricObject | null}
   */
  clipboard: ActiveSelection | ExtendedFabricObject | null


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
  async copy() {
    const { canvas } = this.editor

    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    try {
      const clonedObject = await activeObject.clone(['format'])
      this.clipboard = clonedObject

      // Сохраняем объект в буфере обмена, если он доступен
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard) {
        console.warn(
          // eslint-disable-next-line max-len
          'ClipboardManager. navigator.clipboard не поддерживается в этом браузере или отсутствует соединение по HTTPS-протоколу.'
        )

        canvas.fire('editor:object-copied', { object: clonedObject })
        return
      }

      if (this.clipboard.type !== 'image') {
        await navigator.clipboard.writeText(`application/image-editor:${JSON.stringify(clonedObject)}`)

        canvas.fire('editor:object-copied', { object: clonedObject })
        return
      }

      const clonedObjectCanvas = clonedObject.toCanvasElement()
      const clonedObjectBlob = await new Promise<Blob | null>((resolve) => { clonedObjectCanvas.toBlob(resolve) })

      if (!clonedObjectBlob) return

      const clipboardItem = new ClipboardItem({ [clonedObjectBlob.type]: clonedObjectBlob })

      await navigator.clipboard.write([clipboardItem])

      canvas.fire('editor:object-copied', { object: clonedObject })
    } catch (error) {
      if (!(error instanceof Error)) return

      const errorMessagePrefix = 'ClipboardManager. Ошибка записи в системный буфер обмена:'

      console.error(errorMessagePrefix, error)

      canvas.fire('editor:error', {
        message: `${errorMessagePrefix} ${error.message}`
      })
    }
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

    console.log('handlePasteEvent clipboardData', clipboardData)
    console.log('handlePasteEvent lastItem', lastItem)

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
