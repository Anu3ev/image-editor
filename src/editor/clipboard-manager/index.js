import { ActiveSelection } from 'fabric'
import { nanoid } from 'nanoid'

export default class ClipboardManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }) {
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
        await navigator.clipboard.writeText(['application/image-editor', JSON.stringify(clonedObject)])

        canvas.fire('editor:object-copied', { object: clonedObject })
        return
      }

      const clonedObjectCanvas = clonedObject.toCanvasElement()
      const clonedObjectBlob = await new Promise((resolve) => { clonedObjectCanvas.toBlob(resolve) })

      const clipboardItem = new ClipboardItem({ [clonedObjectBlob.type]: clonedObjectBlob })

      await navigator.clipboard.write([clipboardItem])

      canvas.fire('editor:object-copied', { object: clonedObject })
    } catch (error) {
      const errorMessagePrefix = 'ClipboardManager. Ошибка записи в системный буфер обмена:'

      console.error(errorMessagePrefix, error)

      canvas.fire('editor:error', {
        message: `${errorMessagePrefix} ${error.message}`
      })
    }
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
