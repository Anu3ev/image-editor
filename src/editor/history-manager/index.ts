// TODO: Почистить консоль логи когда всё будет готово.
import {
  Canvas,
  FabricObject,
  FabricImage,
  Rect,
  Textbox
} from 'fabric'
import { create as diffPatchCreate } from 'jsondiffpatch'
import type { DiffPatcher, Delta } from 'jsondiffpatch'
import { nanoid } from 'nanoid'
import DiffMatchPatch from 'diff-match-patch'
import { ImageEditor } from '../index'

export const OBJECT_SERIALIZATION_PROPS = [
  'id',
  'backgroundId',
  'customData',
  'backgroundType',
  'format',
  'contentType',
  'width',
  'height',
  'locked',
  'editable',
  'evented',
  'selectable',
  'lockMovementX',
  'lockMovementY',
  'lockRotation',
  'lockScalingX',
  'lockScalingY',
  'lockSkewingX',
  'lockSkewingY',
  'styles',
  'lineFontDefaults',
  'textCaseRaw',
  'uppercase',
  'autoExpand',
  'linethrough',
  'underline',
  'fontStyle',
  'fontWeight',
  'backgroundOpacity',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'radiusTopLeft',
  'radiusTopRight',
  'radiusBottomRight',
  'radiusBottomLeft'
] as const

export type CanvasFullState = {
  clipPath: object | null
  height: number
  width: number
  objects: FabricObject[]
  version: string
}

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
   * Флаг, показывающий что в данный момент идёт сохранение состояния.
   * Используется для блокировки undo/redo во время фиксации изменений.
   */
  private _isSavingState: boolean

  /**
   * Счётчик приостановки истории. Если он больше 0, то сохранение истории (saveHistory) пропускается.
   */
  private _historySuspendCount: number

  /**
   * Флаг активного пользовательского действия (перемещение/масштабирование/редактирование текста).
   */
  private _isActionInProgress: boolean

  /**
   * Снимок состояния на начало действия для отмены.
   */
  private _actionSnapshot: CanvasFullState | null

  /**
   * Причина активного действия (для отладки).
   */
  private _actionReason: string | null

  /**
   * Таймер отложенного сохранения состояния.
   */
  private _pendingSaveTimeoutId: ReturnType<typeof setTimeout> | null

  /**
   * Причина отложенного сохранения состояния.
   */
  private _pendingSaveReason: string | null

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this._isSavingState = false
    this._historySuspendCount = 0
    this._isActionInProgress = false
    this._actionSnapshot = null
    this._actionReason = null
    this._pendingSaveTimeoutId = null
    this._pendingSaveReason = null
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
    return this._historySuspendCount > 0 || this._isSavingState
  }

  public get lastPatch(): { id: string; diff: Delta } | null {
    return this.patches[this.currentIndex - 1] || null
  }

  private _createDiffPatcher(): void {
    this.diffPatcher = diffPatchCreate({
      objectHash(obj: object) {
        const fabricObj = obj as FabricObject

        // Сериализуем styles в JSON строку для корректного сравнения
        const objectHash = JSON.stringify(fabricObj)

        return [objectHash].join('-')
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
   * Запоминает состояние для отмены активного действия.
   * @param reason - причина начала действия
   */
  public beginAction({ reason }: { reason: string }): void {
    if (this._isActionInProgress) return
    if (this.skipHistory) return

    this._isActionInProgress = true
    this._actionReason = reason
    this._actionSnapshot = this._captureCurrentState()
  }

  /**
   * Завершает активное действие и очищает снимок.
   * @param reason - причина завершения (опционально)
   */
  public endAction({ reason }: { reason?: string } = {}): void {
    if (!this._isActionInProgress) return
    if (reason && this._actionReason && reason !== this._actionReason) return

    this._clearPendingAction()
  }

  /**
   * Планирует сохранение состояния с отложенным вызовом.
   * @param delayMs - задержка перед сохранением
   * @param reason - причина сохранения
   */
  public scheduleSaveState({ delayMs, reason }: { delayMs: number; reason: string }): void {
    this._clearPendingSave()

    this._pendingSaveReason = reason
    this._pendingSaveTimeoutId = setTimeout(this._handlePendingSaveTimeout.bind(this), delayMs)
  }

  /**
   * Принудительно сохраняет отложенное состояние.
   */
  public flushPendingSave(): boolean {
    if (this._pendingSaveTimeoutId === null) return false

    const pendingReason = this._pendingSaveReason
    this._clearPendingSave()
    this._finalizePendingSave({ reason: pendingReason })
    return true
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
  public getFullState(): CanvasFullState {
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
   * Возвращает текущее состояние канваса с учётом временной разблокировки объектов.
   */
  private _captureCurrentState(): CanvasFullState {
    return this._withTemporaryUnlock(this._serializeCanvasState.bind(this))
  }

  /**
   * Сериализует текущее состояние канваса.
   */
  private _serializeCanvasState(): CanvasFullState {
    const { canvas } = this
    return canvas.toDatalessObject([...OBJECT_SERIALIZATION_PROPS]) as CanvasFullState
  }

  /**
   * Обрабатывает срабатывание отложенного сохранения.
   */
  private _handlePendingSaveTimeout(): void {
    if (this._pendingSaveTimeoutId === null) return

    const pendingReason = this._pendingSaveReason
    this._pendingSaveTimeoutId = null
    this._pendingSaveReason = null

    this._finalizePendingSave({ reason: pendingReason })
  }

  /**
   * Завершает отложенное сохранение и применяет состояние.
   * @param reason - причина сохранения
   */
  private _finalizePendingSave({ reason }: { reason: string | null }): void {
    if (reason === 'text-edit') {
      this._deactivateTextEditing()
    }

    this.saveState()
  }

  /**
   * Сбрасывает флаг редактирования текста, если он активен.
   */
  private _deactivateTextEditing(): void {
    const { textManager } = this.editor
    if (!textManager) return
    if (!textManager.isTextEditingActive) return

    textManager.isTextEditingActive = false
  }

  /**
   * Очищает отложенное сохранение без фиксации состояния.
   */
  private _clearPendingSave(): void {
    const { _pendingSaveTimeoutId: pendingSaveTimeoutId } = this
    if (pendingSaveTimeoutId === null) return

    clearTimeout(pendingSaveTimeoutId)
    this._pendingSaveTimeoutId = null
    this._pendingSaveReason = null
  }

  /**
   * Очищает состояние активного действия.
   */
  private _clearPendingAction(): void {
    this._isActionInProgress = false
    this._actionSnapshot = null
    this._actionReason = null
  }

  /**
   * Отменяет активное действие и возвращает состояние на момент начала.
   */
  private async _cancelPendingAction(): Promise<boolean> {
    const { _isActionInProgress: isActionInProgress, _actionSnapshot: actionSnapshot } = this
    if (!isActionInProgress || !actionSnapshot) return false

    const actionReason = this._actionReason

    this._clearPendingSave()
    this._clearPendingAction()

    this.suspendHistory()

    try {
      await this.loadStateFromFullState(actionSnapshot)

      if (actionReason === 'text-edit') {
        this._deactivateTextEditing()
      }

      return true
    } finally {
      this.resumeHistory()
    }
  }

  /**
   * Сохраняем текущее состояние в виде диффа от последнего сохранённого полного состояния.
   */
  public saveState(): void {
    console.log('saveState')
    if (this.skipHistory) return

    this._isSavingState = true

    console.time('saveState')

    try {
      // Получаем текущее состояние канваса как объект и указываем, какие свойства нужно сохарнить обязательно.
      const currentStateObj = this._withTemporaryUnlock(
        () => this.canvas.toDatalessObject([...OBJECT_SERIALIZATION_PROPS])
      )

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

      const {
        prevState: normalizedPrevState,
        nextState: normalizedCurrentState
      } = HistoryManager._prepareStatesForDiff({
        prevState,
        nextState: currentStateObj as CanvasFullState
      })
      const diff = this.diffPatcher.diff(normalizedPrevState, normalizedCurrentState)

      console.log('normalizedPrevState', normalizedPrevState)
      console.log('normalizedCurrentState', normalizedCurrentState)

      // Если изменений нет, не сохраняем новый шаг
      if (!diff) {
        console.log('Нет изменений для сохранения.')
        return
      }

      const statesEqual = HistoryManager._areStatesEqual({
        prevState: normalizedPrevState,
        nextState: normalizedCurrentState
      })

      if (statesEqual) {
        console.log('statesEqual. Нет изменений для сохранения.')
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
        this.baseState = this.diffPatcher.patch(this.baseState, this.patches[0].diff) as CanvasFullState
        this.patches.shift() // Удаляем первый дифф
        this.currentIndex -= 1 // Корректируем индекс

        // Увеличиваем счётчик изменений, "свёрнутых" в базовое состояние
        this.baseStateChangesCount += 1
      }

      console.log('Состояние сохранено. Текущий индекс истории:', this.currentIndex)
    } finally {
      this._isSavingState = false
    }
  }

  /**
   * Подготавливает состояния для расчёта diff: нормализует технические изменения
   * и компенсирует смещения при ресайзе окна.
   */
  private static _prepareStatesForDiff({
    prevState,
    nextState
  }: {
    prevState: CanvasFullState
    nextState: CanvasFullState
  }): { prevState: CanvasFullState; nextState: CanvasFullState } {
    const normalizedPrevState = HistoryManager._cloneState({ state: prevState })
    const normalizedNextState = HistoryManager._cloneState({ state: nextState })

    HistoryManager._normalizeTextBackground({ objects: normalizedPrevState.objects })
    HistoryManager._normalizeTextBackground({ objects: normalizedNextState.objects })
    HistoryManager._normalizeCanvasSize({
      prevState: normalizedPrevState,
      nextState: normalizedNextState
    })
    HistoryManager._normalizeTranslation({
      prevState: normalizedPrevState,
      nextState: normalizedNextState
    })

    return {
      prevState: normalizedPrevState,
      nextState: normalizedNextState
    }
  }

  /**
   * Делает глубокую копию состояния канваса.
   * @param state - исходное состояние
   */
  private static _cloneState({ state }: { state: CanvasFullState }): CanvasFullState {
    return JSON.parse(JSON.stringify(state)) as CanvasFullState
  }

  /**
   * Проверяет, равны ли два состояния после нормализации с учётом устойчивого порядка ключей.
   * @param prevState - предыдущее состояние
   * @param nextState - следующее состояние
   */
  private static _areStatesEqual({
    prevState,
    nextState
  }: {
    prevState: CanvasFullState
    nextState: CanvasFullState
  }): boolean {
    const prevStable = HistoryManager._stableStringify({ value: prevState })
    const nextStable = HistoryManager._stableStringify({ value: nextState })
    return prevStable === nextStable
  }

  /**
   * Делает устойчивую сериализацию значения с сортировкой ключей объектов.
   * @param value - значение для сериализации
   */
  private static _stableStringify({ value }: { value: unknown }): string {
    /**
     * Нормализует значение для стабильной сериализации.
     * @param value - исходное значение
     */
    const normalizeValue = ({ value: rawValue }: { value: unknown }): unknown => {
      if (Array.isArray(rawValue)) {
        const normalizedArray: unknown[] = []

        for (let index = 0; index < rawValue.length; index += 1) {
          normalizedArray.push(normalizeValue({ value: rawValue[index] }))
        }

        return normalizedArray
      }

      if (rawValue && typeof rawValue === 'object') {
        const normalizedObject: Record<string, unknown> = {}
        const keys = Object.keys(rawValue).sort()

        for (let index = 0; index < keys.length; index += 1) {
          const key = keys[index]
          normalizedObject[key] = normalizeValue({
            value: (rawValue as Record<string, unknown>)[key]
          })
        }

        return normalizedObject
      }

      return rawValue
    }

    return JSON.stringify(normalizeValue({ value }))
  }

  /**
   * Нормализует backgroundColor у текстовых объектов без фона, чтобы избежать шумовых диффов.
   * @param objects - список объектов канваса
   */
  private static _normalizeTextBackground({ objects }: { objects: FabricObject[] }): void {
    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index] as FabricObject & {
        type?: string
        backgroundOpacity?: number
        backgroundColor?: string | null
        textBackgroundColor?: string | null
      }
      const {
        type,
        backgroundOpacity: rawBackgroundOpacity,
        backgroundColor: rawBackgroundColor,
        textBackgroundColor: rawTextBackgroundColor
      } = object
      const backgroundOpacity = typeof rawBackgroundOpacity === 'number' ? rawBackgroundOpacity : 0
      const backgroundColor = typeof rawBackgroundColor === 'string' ? rawBackgroundColor : ''
      const textBackgroundColor = typeof rawTextBackgroundColor === 'string' ? rawTextBackgroundColor : ''
      const isTextObject = type === 'textbox'
        || type === 'i-text'
        || type === 'text'
        || type === 'background-textbox'
      const hasBackgroundColor = backgroundColor.length > 0 || textBackgroundColor.length > 0

      if (!isTextObject) continue
      if (backgroundOpacity > 0 && hasBackgroundColor) continue

      object.backgroundColor = null
      object.textBackgroundColor = null
    }
  }

  /**
   * Игнорирует изменения размеров канваса, если размер монтажной области не менялся.
   * Это устраняет диффы от ресайза окна без влияния на историю документа.
   */
  private static _normalizeCanvasSize({
    prevState,
    nextState
  }: {
    prevState: CanvasFullState
    nextState: CanvasFullState
  }): void {
    const { width: prevWidth, height: prevHeight, objects: prevObjects } = prevState
    const { objects: nextObjects } = nextState
    const {
      width: prevMontageWidth,
      height: prevMontageHeight
    } = HistoryManager._getMontageAreaSize({ objects: prevObjects })

    const {
      width: nextMontageWidth,
      height: nextMontageHeight
    } = HistoryManager._getMontageAreaSize({ objects: nextObjects })
    const montageSizeChanged = prevMontageWidth !== nextMontageWidth
      || prevMontageHeight !== nextMontageHeight

    if (montageSizeChanged) return

    nextState.width = prevWidth
    nextState.height = prevHeight
  }

  /**
   * Компенсирует смещение монтажной области, чтобы не сохранять ресайз как изменение истории.
   */
  private static _normalizeTranslation({
    prevState,
    nextState
  }: {
    prevState: CanvasFullState
    nextState: CanvasFullState
  }): void {
    const { objects: prevObjects, clipPath: prevClipPath } = prevState
    const { objects: nextObjects, clipPath: nextClipPath } = nextState
    const {
      left: prevMontageLeft,
      top: prevMontageTop
    } = HistoryManager._getMontageAreaPosition({ objects: prevObjects })

    const {
      left: nextMontageLeft,
      top: nextMontageTop
    } = HistoryManager._getMontageAreaPosition({ objects: nextObjects })

    const deltaX = nextMontageLeft - prevMontageLeft
    const deltaY = nextMontageTop - prevMontageTop

    if (deltaX === 0 && deltaY === 0) return

    const montageObject = HistoryManager._getObjectById({
      objects: nextObjects,
      id: 'montage-area'
    })

    if (montageObject) {
      montageObject.left = prevMontageLeft
      montageObject.top = prevMontageTop
    }

    const prevClipPathPosition = HistoryManager._getClipPathPosition({ clipPath: prevClipPath })

    if (prevClipPathPosition && nextClipPath && typeof nextClipPath === 'object') {
      const { left, top } = prevClipPathPosition
      const clipPathObject = nextClipPath as { left?: number; top?: number }

      clipPathObject.left = left
      clipPathObject.top = top
    }

    const ignoredIds = HistoryManager._getTranslationIgnoredIds()

    for (let index = 0; index < nextObjects.length; index += 1) {
      const object = nextObjects[index] as FabricObject & { id?: string }
      const { id } = object

      if (id && ignoredIds.has(id)) continue

      if (typeof object.left === 'number') {
        object.left -= deltaX
      }

      if (typeof object.top === 'number') {
        object.top -= deltaY
      }
    }
  }

  /**
   * Возвращает позицию clipPath из состояния, если она доступна.
   */
  private static _getClipPathPosition({
    clipPath
  }: {
    clipPath: object | null
  }): { left: number; top: number } | null {
    if (!clipPath || typeof clipPath !== 'object') return null

    const { left, top } = clipPath as { left?: number; top?: number }

    if (typeof left !== 'number' || typeof top !== 'number') return null

    return { left, top }
  }

  /**
   * Возвращает позицию монтажной области из списка объектов.
   */
  private static _getMontageAreaPosition({
    objects
  }: {
    objects: FabricObject[]
  }): { left: number; top: number } {
    const montageObject = HistoryManager._getObjectById({
      objects,
      id: 'montage-area'
    })

    if (!montageObject) {
      return { left: 0, top: 0 }
    }

    const { left = 0, top = 0 } = montageObject
    return { left, top }
  }

  /**
   * Возвращает размеры монтажной области из списка объектов.
   */
  private static _getMontageAreaSize({
    objects
  }: {
    objects: FabricObject[]
  }): { width: number; height: number } {
    const montageObject = HistoryManager._getObjectById({
      objects,
      id: 'montage-area'
    })

    if (!montageObject) {
      return { width: 0, height: 0 }
    }

    const { width = 0, height = 0 } = montageObject
    return { width, height }
  }

  /**
   * Находит объект по id в массиве объектов канваса.
   */
  private static _getObjectById({
    objects,
    id
  }: {
    objects: FabricObject[]
    id: string
  }): FabricObject | null {
    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index] as FabricObject & { id?: string }

      if (object.id === id) return object
    }

    return null
  }

  /**
   * Возвращает набор id объектов, которые не должны сдвигаться при нормализации.
   */
  private static _getTranslationIgnoredIds(): Set<string> {
    return new Set(['montage-area', 'overlay-mask', 'background'])
  }

  /**
   * Создаёт безопасную копию состояния для загрузки в canvas.
   * customData сериализуется, чтобы Fabric не обрабатывал её как параметры объекта.
   *
   * @param state - полное состояние канваса
   */
  private static _createLoadSafeState({ state }: { state: CanvasFullState }): CanvasFullState {
    const clonedState = JSON.parse(JSON.stringify(state)) as CanvasFullState
    const { objects = [] } = clonedState

    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index]
      const { customData } = object

      if (!customData || typeof customData !== 'object') continue

      object.customData = JSON.stringify(customData)
    }

    return clonedState
  }

  /**
   * Восстанавливает customData на объектах канваса из состояния истории.
   * Нужна, чтобы в истории всегда сохранялся объект, а не строка.
   *
   * @param state - исходное состояние с object customData
   * @param canvas - канвас, в который загружены объекты
   */
  private static _applyCustomDataFromState({
    state,
    canvas
  }: {
    state: CanvasFullState
    canvas: Canvas
  }): void {
    const { objects: stateObjects = [] } = state
    const customDataById = new Map<string, object>()
    const customDataByIndex = new Map<number, object>()

    for (let index = 0; index < stateObjects.length; index += 1) {
      const stateObject = stateObjects[index]
      const { customData, id } = stateObject

      if (!customData || typeof customData !== 'object') continue

      if (typeof id === 'string') {
        customDataById.set(id, customData)
        continue
      }

      customDataByIndex.set(index, customData)
    }

    const canvasObjects = canvas.getObjects?.() ?? []

    for (let index = 0; index < canvasObjects.length; index += 1) {
      const canvasObject = canvasObjects[index]
      const { id } = canvasObject
      let customData: object | undefined

      if (typeof id === 'string') {
        customData = customDataById.get(id)
      }

      if (!customData) {
        customData = customDataByIndex.get(index)
      }

      if (!customData) continue

      canvasObject.customData = HistoryManager._cloneCustomData({ customData })
    }
  }

  /**
   * Делает глубокую копию customData, чтобы избежать общих ссылок со state.
   * @param customData - пользовательские данные объекта
   */
  private static _cloneCustomData({ customData }: { customData: object }): object {
    return JSON.parse(JSON.stringify(customData)) as object
  }

  /**
   * Функция загрузки состояния в канвас.
   * @param fullState - полное состояние канваса
   * @fires editor:history-state-loaded
   */
  public async loadStateFromFullState(fullState: CanvasFullState): Promise<void> {
    if (!fullState) return

    console.log('loadStateFromFullState fullState', fullState)

    const { canvas, canvasManager, interactionBlocker, backgroundManager } = this.editor
    const { width: oldCanvasStateWidth, height: oldCanvasStateHeight } = canvas

    // Сбрасываем overlay, так как он может задваиваться при загрузке состояния
    interactionBlocker.overlayMask = null

    const safeState = HistoryManager._createLoadSafeState({ state: fullState })

    await canvas.loadFromJSON(safeState)
    HistoryManager._applyCustomDataFromState({ state: fullState, canvas })

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

    const loadedBackgroundObject = canvas.getObjects().find((obj) => obj.id === 'background')

    if (!loadedBackgroundObject) {
      backgroundManager.removeBackground({ withoutSave: true })
    } else {
      backgroundManager.backgroundObject = loadedBackgroundObject as Rect | FabricImage
      backgroundManager.refresh()
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

    const isActionCanceled = await this._cancelPendingAction()
    if (isActionCanceled) return

    this.flushPendingSave()

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

    const isActionCanceled = await this._cancelPendingAction()
    if (isActionCanceled) return

    this.flushPendingSave()

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

  private _withTemporaryUnlock<T>(callback: () => T): T {
    const modified: Array<{
      object: FabricObject & {
        locked?: boolean
        lockMovementX?: boolean
        lockMovementY?: boolean
        type?: string
      }
      lockMovementX?: boolean
      lockMovementY?: boolean
      selectable?: boolean
    }> = []

    const objects = this.canvas.getObjects?.() ?? []

    objects.forEach((object) => {
      const type = typeof object.type === 'string' ? object.type.toLowerCase() : ''
      const isTextObject = type === 'textbox'
        || type === 'i-text'
        || typeof (object as Textbox).isEditing === 'boolean'
        || type === 'background-textbox'
      if (!isTextObject) return

      if (object.locked) return

      const lockMovementX = Boolean(object.lockMovementX)
      const lockMovementY = Boolean(object.lockMovementY)
      if (!lockMovementX && !lockMovementY) return

      modified.push({
        object,
        lockMovementX: object.lockMovementX,
        lockMovementY: object.lockMovementY,
        selectable: object.selectable
      })

      object.lockMovementX = false
      object.lockMovementY = false
      object.selectable = true
    })

    try {
      return callback()
    } finally {
      modified.forEach(({ object, lockMovementX, lockMovementY, selectable }) => {
        object.lockMovementX = lockMovementX
        object.lockMovementY = lockMovementY
        object.selectable = selectable
      })
    }
  }
}
