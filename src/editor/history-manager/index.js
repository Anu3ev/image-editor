// TODO: Почистить консоль логи когда всё будет готово.
import { create as diffPatchCreate } from 'jsondiffpatch'

export default class HistoryManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this._historySuspendCount = 0
    this.baseState = null
    this.patches = []
    this.currentIndex = 0
    this.maxHistoryLength = editor.options.maxHistoryLength

    // Общее количество сделанных изменений
    this.totalChangesCount = 0
    // Количество изменений, которые "свёрнуты" в базовое состояние
    this.baseStateChangesCount = 0

    this._createDiffPatcher()
  }

  /** Проверка, нужно ли пропускать сохранение истории */
  get skipHistory() {
    return this._historySuspendCount > 0
  }

  _createDiffPatcher() {
    this.diffPatcher = diffPatchCreate({
      objectHash(obj) {
        return [
          obj.id,
          obj.format,
          obj.locked,
          obj.left,
          obj.top,
          obj.width,
          obj.height,
          obj.flipX,
          obj.flipY,
          obj.scaleX,
          obj.scaleY,
          obj.angle,
          obj.opacity
        ].join('-')
      },

      arrays: {
        detectMove: true,
        includeValueOnMove: false
      },

      textDiff: {
        minLength: 60
      }
    })
  }

  /** Увеличить счётчик приостановки истории */
  suspendHistory() {
    this._historySuspendCount += 1
  }

  /** Уменьшить счётчик приостановки истории */
  resumeHistory() {
    this._historySuspendCount = Math.max(0, this._historySuspendCount - 1)
  }

  /**
   * Проверяет, есть ли в редакторе несохранённые изменения
   * @returns {boolean}
   */
  hasUnsavedChanges() {
    return this.totalChangesCount > 0
  }

  /**
   * Получает текущую позицию в общей истории изменений
   * @returns {number}
   */
  getCurrentChangePosition() {
    return this.baseStateChangesCount + this.currentIndex
  }

  /**
   * Получаем полное состояние, применяя все диффы к базовому состоянию.
   */
  getFullState() {
    const { baseState, currentIndex, patches } = this

    // Глубокая копия базового состояния
    let state = JSON.parse(JSON.stringify(baseState))
    // Применяем все диффы до текущего индекса
    for (let i = 0; i < currentIndex; i += 1) {
      state = this.diffPatcher.patch(state, patches[i])
    }

    console.log('getFullState state', state)
    return state
  }

  /**
   * Сохраняем текущее состояние в виде диффа от последнего сохранённого полного состояния.
   */
  saveState() {
    console.log('saveState')
    if (this.skipHistory) return

    console.time('saveState')

    // Получаем текущее состояние канваса как объект и указываем, какие свойства нужно сохарнить обязательно.
    const currentStateObj = this.canvas.toDatalessObject([
      'selectable',
      'evented',
      'id',
      'format',
      'width',
      'height',
      'locked',
      'lockMovementX',
      'lockMovementY',
      'lockRotation',
      'lockScalingX',
      'lockScalingY',
      'lockSkewingX',
      'lockSkewingY'
    ])

    console.timeEnd('saveState')

    // Если базовое состояние ещё не установлено, сохраняем полное состояние как базу
    if (!this.baseState) {
      this.baseState = currentStateObj
      this.patches = []
      this.currentIndex = 0
      console.log('Базовое состояние сохранено.')
      return
    }

    // Вычисляем diff между последним сохранённым полным состоянием и текущим состоянием.
    // Последнее сохранённое полное состояние – это результат getFullState()
    const prevState = this.getFullState()
    const diff = this.diffPatcher.diff(prevState, currentStateObj)

    // Если изменений нет, не сохраняем новый шаг
    if (!diff) {
      console.log('Нет изменений для сохранения.')
      return
    }

    console.log('baseState', this.baseState)

    // Если мы уже сделали undo и сейчас добавляем новое состояние,
    // удаляем «редо»-ветку
    if (this.currentIndex < this.patches.length) {
      this.patches.splice(this.currentIndex)
    }

    console.log('diff', diff)

    this.totalChangesCount += 1

    // Сохраняем дифф
    this.patches.push(diff)
    this.currentIndex += 1

    // Если история стала слишком длинной, сбрасываем её: делаем новое базовое состояние
    if (this.patches.length > this.maxHistoryLength) {
      // Обновляем базовое состояние, применяя самый старый дифф
      // Можно также обновить базу, применив все диффы, но здесь мы делаем сдвиг на один шаг
      this.baseState = this.diffPatcher.patch(this.baseState, this.patches[0])
      this.patches.shift() // Удаляем первый дифф
      this.currentIndex -= 1 // Корректируем индекс

      // Увеличиваем счётчик изменений, "свёрнутых" в базовое состояние
      this.baseStateChangesCount += 1
    }

    console.log('Состояние сохранено. Текущий индекс истории:', this.currentIndex)
  }

  /**
   * Функция загрузки состояния в канвас.
   * @param {object} fullState - полное состояние канваса
   * @fires editor:history-state-loaded
   */
  async loadStateFromFullState(fullState) {
    if (!fullState) return
    console.log('loadStateFromFullState fullState', fullState)

    // Load and render
    await this.canvas.loadFromJSON(fullState)

    // Восстанавливаем ссылки на montageArea и overlay в редакторе
    const loadedMontage = this.canvas.getObjects().find((obj) => obj.id === 'montage-area')
    if (loadedMontage) {
      this.editor.montageArea = loadedMontage
    }

    const loadedOverlayMask = this.canvas.getObjects().find((obj) => obj.id === 'overlay-mask')

    if (loadedOverlayMask) {
      this.editor.interactionBlocker.overlayMask = loadedOverlayMask
      this.editor.interactionBlocker.overlayMask.visible = false
    }

    this.canvas.renderAll()

    this.canvas.fire('editor:history-state-loaded')
  }

  /**
   * Undo – отмена последнего действия, восстанавливая состояние по накопленным диффам.
   * @fires editor:undo
   */
  async undo() {
    if (this.skipHistory) return

    if (this.currentIndex <= 0) {
      console.log('Нет предыдущих состояний для отмены.')
      return
    }

    this.suspendHistory()

    try {
      this.currentIndex -= 1
      this.totalChangesCount -= 1

      const fullState = this.getFullState()

      await this.loadStateFromFullState(fullState)

      console.log('Undo выполнен. Текущий индекс истории:', this.currentIndex)

      this.canvas.fire('editor:undo')
    } catch (error) {
      console.error('undo. Ошибка отмены действия: ', error)
      this.canvas.fire('editor:error', { message: `Ошибка отмены действия: ${error.message}` })
    } finally {
      this.resumeHistory()
    }
  }

  /**
   * Redo – повтор ранее отменённого действия.
   * @fires editor:redo
   */
  async redo() {
    if (this.skipHistory) return

    if (this.currentIndex >= this.patches.length) {
      console.log('Нет состояний для повтора.')
      return
    }

    this.suspendHistory()

    try {
      this.currentIndex += 1
      this.totalChangesCount += 1

      const fullState = this.getFullState()
      console.log('fullState', fullState)

      await this.loadStateFromFullState(fullState)

      console.log('Redo выполнен. Текущий индекс истории:', this.currentIndex)

      this.canvas.fire('editor:redo')
    } catch (error) {
      console.error('redo. Ошибка повтора действия: ', error)
      this.canvas.fire('editor:error', { message: `Ошибка повтора действия: ${error.message}` })
    } finally {
      this.resumeHistory()
    }
  }
}
