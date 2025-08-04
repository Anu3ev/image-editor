// TODO: Почистить консоль логи когда всё будет готово.
import { Canvas, FabricObject, Rect } from 'fabric'
import { create as diffPatchCreate } from 'jsondiffpatch'
import type { DiffPatcher, Delta } from 'jsondiffpatch'
import { nanoid } from 'nanoid'
import DiffMatchPatch from 'diff-match-patch'
import { ImageEditor } from '../index'

export default class HistoryManager {
  /**
   * Инстанс редактора с доступом к canvas
   */
  public editor: ImageEditor

  /**
   * Объект, представляющий текущее состояние канваса, от которого будут считаться диффы
   */
  public canvas: Canvas

  /**
   * Базовое состояние канваса, от которого будут считаться диффы.
   * Это состояние сохраняется при первом вызове saveState и используется для создания диффов между текущим состоянием канваса и базовым состоянием.
   */
  public baseState: object | null

  /**
   * Массив диффов, представляющих изменения от базового состояния.
   */
  public patches: { id: string; diff: Delta }[]

  /**
   * Текущее положение в истории изменений.
   * Это индекс в массиве patches, указывающий на последнее сохранённое состояние.
   * Если currentIndex = 0, то это базовое состояние.
   * Если currentIndex = patches.length, то это последнее сохранённое состояние.
   */
  public currentIndex: number

  /**
   * Максимальная длина истории изменений.
   * Когда количество сохранённых изменений превышает это значение, старые изменения удаляются, и базовое состояние обновляется.
   * Это позволяет ограничить размер истории и избежать переполнения памяти.
   */
  public maxHistoryLength: number

  /**
   * Общее количество сделанных изменений в редакторе.
   * Это значение увеличивается при каждом вызове saveState и используется для отслеживания количества изменений.
   * Счётчик увеличивается при каждом сохранении состояния, даже если количество изменений больше чем maxHistoryLength. При откате до нулевого значения currentIndex с помощью undo это позволяет понять, были ли изменения в состоянии редактора.
   */
  public totalChangesCount: number

  /**
   * Количество изменений, которые были "свёрнуты" в базовое состояние.
   * Это значение увеличивается, когда история изменений становится слишком длинной и базовое состояние обновляется.
   * Оно позволяет отслеживать, сколько изменений было сделано с момента последнего обновления базового состояния.
   * Например, если maxHistoryLength = 10 и в истории было 15 изменений, то baseStateChangesCount будет равно 5.
   */
  public baseStateChangesCount: number

  /**
   * DiffPatcher – библиотека для создания и применения диффов между объектами.
   * Она используется для вычисления изменений между текущим состоянием канваса и базовым состоянием.
   * DiffPatcher позволяет эффективно сохранять и восстанавливать изменения, а также управлять историей изменений в редакторе.
   */
  public diffPatcher!: DiffPatcher

  /**
   * Счётчик приостановки истории. Если он больше 0, то сохранение истории (saveHistory) пропускается.
   */
  private _historySuspendCount: number

  constructor({ editor }: { editor: ImageEditor }) {
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
  public get skipHistory(): boolean {
    return this._historySuspendCount > 0
  }

  public get lastPatch(): { id: string; diff: Delta } | null {
    return this.patches[this.currentIndex - 1] || null
  }

  private _createDiffPatcher(): void {
    this.diffPatcher = diffPatchCreate({
      objectHash(obj: object) {
        const fabricObj = obj as FabricObject

        return [
          fabricObj.id,
          fabricObj.format,
          fabricObj.locked,
          fabricObj.left,
          fabricObj.top,
          fabricObj.width,
          fabricObj.height,
          fabricObj.flipX,
          fabricObj.flipY,
          fabricObj.scaleX,
          fabricObj.scaleY,
          fabricObj.angle,
          fabricObj.opacity
        ].join('-')
      },

      arrays: {
        detectMove: true,
        includeValueOnMove: false
      },

      textDiff: {
        diffMatchPatch: DiffMatchPatch,
        minLength: 60
      }
    })
  }

  /** Увеличить счётчик приостановки истории */
  public suspendHistory(): void {
    this._historySuspendCount += 1
  }

  /** Уменьшить счётчик приостановки истории */
  public resumeHistory(): void {
    this._historySuspendCount = Math.max(0, this._historySuspendCount - 1)
  }

  /**
   * Проверяет, есть ли в редакторе несохранённые изменения
   */
  public hasUnsavedChanges(): boolean {
    return this.totalChangesCount > 0
  }

  /**
   * Получает текущую позицию в общей истории изменений
   */
  public getCurrentChangePosition(): number {
    return this.baseStateChangesCount + this.currentIndex
  }

  /**
   * Получаем полное состояние, применяя все диффы к базовому состоянию.
   */
  public getFullState(): Partial<Canvas> {
    const { baseState, currentIndex, patches } = this

    // Глубокая копия базового состояния
    let state = JSON.parse(JSON.stringify(baseState))
    // Применяем все диффы до текущего индекса
    for (let i = 0; i < currentIndex; i += 1) {
      state = this.diffPatcher.patch(state, patches[i].diff)
    }

    console.log('getFullState state', state)
    return state
  }

  /**
   * Сохраняем текущее состояние в виде диффа от последнего сохранённого полного состояния.
   */
  public saveState(): void {
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
    this.patches.push({ id: nanoid(), diff })
    this.currentIndex += 1

    // Если история стала слишком длинной, сбрасываем её: делаем новое базовое состояние
    if (this.patches.length > this.maxHistoryLength) {
      // Обновляем базовое состояние, применяя самый старый дифф
      // Можно также обновить базу, применив все диффы, но здесь мы делаем сдвиг на один шаг
      this.baseState = this.diffPatcher.patch(this.baseState, this.patches[0].diff) as Partial<Canvas>
      this.patches.shift() // Удаляем первый дифф
      this.currentIndex -= 1 // Корректируем индекс

      // Увеличиваем счётчик изменений, "свёрнутых" в базовое состояние
      this.baseStateChangesCount += 1
    }

    console.log('Состояние сохранено. Текущий индекс истории:', this.currentIndex)
  }

  /**
   * Функция загрузки состояния в канвас.
   * @param fullState - полное состояние канваса
   * @fires editor:history-state-loaded
   */
  public async loadStateFromFullState(fullState: Partial<Canvas>): Promise<void> {
    if (!fullState) return

    console.log('loadStateFromFullState fullState', fullState)

    const { canvas, canvasManager, interactionBlocker } = this.editor
    const { width: oldCanvasStateWidth, height: oldCanvasStateHeight } = canvas

    // Load and render
    await canvas.loadFromJSON(fullState)

    // Восстанавливаем ссылки на montageArea и overlay в редакторе
    const loadedMontage = canvas.getObjects().find((obj) => obj.id === 'montage-area') as Rect | undefined
    if (loadedMontage) {
      this.editor.montageArea = loadedMontage

      // Если размеры канваса изменились (был ресайз), адаптируем только канвас, а не объекты
      if (oldCanvasStateWidth !== canvas.getWidth() || oldCanvasStateHeight !== canvas.getHeight()) {
        canvasManager.updateCanvas()
      }
    }

    const loadedOverlayMask = canvas.getObjects().find((obj) => obj.id === 'overlay-mask')

    if (loadedOverlayMask) {
      interactionBlocker.overlayMask = loadedOverlayMask as Rect
      interactionBlocker.overlayMask.visible = false
    }

    canvas.renderAll()
    canvas.fire('editor:history-state-loaded', {
      fullState,
      currentIndex: this.currentIndex,
      totalChangesCount: this.totalChangesCount,
      baseStateChangesCount: this.baseStateChangesCount,
      patchesCount: this.patches.length,
      patches: this.patches
    })
  }

  /**
   * Undo – отмена последнего действия, восстанавливая состояние по накопленным диффам.
   * @fires editor:undo
   */
  public async undo(): Promise<void> {
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

      this.canvas.fire('editor:undo', {
        fullState,
        currentIndex: this.currentIndex,
        totalChangesCount: this.totalChangesCount,
        baseStateChangesCount: this.baseStateChangesCount,
        patchesCount: this.patches.length,
        patches: this.patches
      })
    } catch (error) {
      this.editor.errorManager.emitError({
        origin: 'HistoryManager',
        method: 'undo',
        code: 'UNDO_ERROR',
        message: 'Ошибка отмены действия',
        data: error as Error
      })
    } finally {
      this.resumeHistory()
    }
  }

  /**
   * Redo – повтор ранее отменённого действия.
   * @fires editor:redo
   */
  public async redo(): Promise<void> {
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

      this.canvas.fire('editor:redo', {
        fullState,
        currentIndex: this.currentIndex,
        totalChangesCount: this.totalChangesCount,
        baseStateChangesCount: this.baseStateChangesCount,
        patchesCount: this.patches.length,
        patches: this.patches
      })
    } catch (error) {
      this.editor.errorManager.emitError({
        origin: 'HistoryManager',
        method: 'redo',
        code: 'REDO_ERROR',
        message: 'Ошибка повтора действия',
        data: error as Error
      })
    } finally {
      this.resumeHistory()
    }
  }
}
