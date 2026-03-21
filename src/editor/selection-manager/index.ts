import {
  ActiveSelection,
  type CanvasOptions,
  type FabricObject,
  type IEvent,
  type TPointerEvent,
  type TPointerEventInfo
} from 'fabric'
import { ImageEditor } from '../index'

export default class SelectionManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Ключи для мультивыделения на канвасе.
   */
  private selectionKey: CanvasOptions['selectionKey']

  /**
   * Последнее активное выделение на канвасе.
   * Используется для восстановления при сбросе выделения с зажатым Ctrl/Cmd.
   */
  private lastSelection: FabricObject[] = []

  /**
   * Флаг, что активировано выделение областью с зажатым Ctrl/Cmd.
   */
  private isCtrlSelectionBoxActive: boolean = false

  /**
   * Флаг, предотвращающий повторное слияние выделения.
   */
  private isSelectionMergeInProgress: boolean = false

  /**
   * Обработчик входа в редактирование текста.
   */
  private handleTextEditingEnteredBound: (event: IEvent) => void

  /**
   * Обработчик выхода из редактирования текста.
   */
  private handleTextEditingExitedBound: (event: IEvent) => void

  /**
   * Обработчик фильтрации залоченного выделения.
   */
  private handleLockedSelectionBound: (options: {
    selected: FabricObject[]
    deselected?: FabricObject[]
    e?: TPointerEvent
  }) => void

  /**
   * Обработчик объединения выделений при выделении областью.
   */
  private handleSelectionMergeBound: (options: { selected: FabricObject[], e?: TPointerEvent }) => void

  /**
   * Обработчик сохранения активного выделения.
   */
  private handleSelectionChangeBound: () => void

  /**
   * Обработчик восстановления выделения после клика по пустой области.
   */
  private handleSelectionClearedBound: ({ e }: { e?: TPointerEvent }) => void

  /**
   * Обработчик начала выделения областью.
   */
  private handleSelectionBoxStartBound: (options: TPointerEventInfo<TPointerEvent>) => void

  /**
   * Обработчик завершения выделения областью.
   */
  private handleSelectionBoxEndBound: (options: TPointerEventInfo<TPointerEvent>) => void

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor

    this.selectionKey = this._resolveSelectionKey()

    this.handleTextEditingEnteredBound = this._handleTextEditingEntered.bind(this)
    this.handleTextEditingExitedBound = this._handleTextEditingExited.bind(this)
    this.handleLockedSelectionBound = this._filterLockedSelection.bind(this)
    this.handleSelectionMergeBound = this._handleSelectionMerge.bind(this)
    this.handleSelectionChangeBound = this._handleSelectionChange.bind(this)
    this.handleSelectionClearedBound = this._handleSelectionCleared.bind(this)
    this.handleSelectionBoxStartBound = this._handleSelectionBoxStart.bind(this)
    this.handleSelectionBoxEndBound = this._handleSelectionBoxEnd.bind(this)

    this._applySelectionKey({ selectionKey: this.selectionKey })
    this._bindEvents()
  }

  /**
   * Выделить все объекты
   * @fires editor:all-objects-selected
   */
  public selectAll(): void {
    const { canvas, canvasManager, objectLockManager } = this.editor

    canvas.discardActiveObject()

    const activeObjects = canvasManager.getObjects()
    const hasLockedObjects = activeObjects.some((obj) => obj.locked)

    const object = activeObjects.length > 1
      ? new ActiveSelection(canvasManager.getObjects(), { canvas })
      : activeObjects[0]

    // Если есть заблокированные объекты, то блокируем выделенный объект
    if (hasLockedObjects) {
      objectLockManager.lockObject({ object, skipInnerObjects: true, withoutSave: true })
    }

    canvas.setActiveObject(object)
    canvas.requestRenderAll()

    canvas.fire('editor:all-objects-selected', { selected: object })
  }

  /**
   * Снимает подписки SelectionManager.
   */
  public destroy(): void {
    const { canvas } = this.editor
    canvas.off('mouse:down', this.handleSelectionBoxStartBound)
    canvas.off('mouse:up', this.handleSelectionBoxEndBound)
    canvas.off('text:editing:entered', this.handleTextEditingEnteredBound)
    canvas.off('text:editing:exited', this.handleTextEditingExitedBound)
    canvas.off('selection:created', this.handleSelectionMergeBound)
    canvas.off('selection:updated', this.handleSelectionMergeBound)
    canvas.off('selection:created', this.handleLockedSelectionBound)
    canvas.off('selection:updated', this.handleLockedSelectionBound)
    canvas.off('selection:created', this.handleSelectionChangeBound)
    canvas.off('selection:updated', this.handleSelectionChangeBound)
    canvas.off('selection:cleared', this.handleSelectionClearedBound)
  }

  /**
   * Назначает ключ для мультивыделения.
   */
  private _applySelectionKey({ selectionKey }: { selectionKey: CanvasOptions['selectionKey'] }): void {
    const { canvas } = this.editor
    canvas.selectionKey = selectionKey
  }

  /**
   * Подписывается на события редактирования текста и выделения объектов.
   */
  private _bindEvents(): void {
    const { canvas } = this.editor
    canvas.on('text:editing:entered', this.handleTextEditingEnteredBound)
    canvas.on('text:editing:exited', this.handleTextEditingExitedBound)
    canvas.on('mouse:down', this.handleSelectionBoxStartBound)
    canvas.on('mouse:up', this.handleSelectionBoxEndBound)
    canvas.on('selection:created', this.handleSelectionMergeBound)
    canvas.on('selection:updated', this.handleSelectionMergeBound)
    canvas.on('selection:created', this.handleLockedSelectionBound)
    canvas.on('selection:updated', this.handleLockedSelectionBound)
    canvas.on('selection:created', this.handleSelectionChangeBound)
    canvas.on('selection:updated', this.handleSelectionChangeBound)
    canvas.on('selection:cleared', this.handleSelectionClearedBound)
  }

  /**
   * Отключает мультивыделение при входе в режим редактирования текста.
   */
  private _handleTextEditingEntered(_event: IEvent): void {
    this._applySelectionKey({ selectionKey: null })
  }

  /**
   * Восстанавливает мультивыделение после выхода из редактирования текста.
   */
  private _handleTextEditingExited(_event: IEvent): void {
    const { selectionKey } = this
    this._applySelectionKey({ selectionKey })
  }

  /**
   * При массовом выделении объектов удаляет из него залоченные.
   * @param params - параметры события
   * @param params.selected - массив выделенных объектов
   * @param params.e - событие указателя (опционально)
   */
  private _filterLockedSelection({ selected, e }: { selected: FabricObject[], e?: TPointerEvent }): void {
    const { editor } = this
    const { canvas } = editor

    // Если это не событие мыши, то ничего не делаем
    if (!(e instanceof MouseEvent)) return

    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    const currentSelection = SelectionManager._collectSelectionObjects({ activeObject })
    if (currentSelection.length <= 1) return

    const { lockedObjects, unlockedObjects } = SelectionManager._splitLockedObjects({ objects: currentSelection })

    // Если нет заблокированных объектов, то ничего не делаем
    if (lockedObjects.length === 0) return

    if (unlockedObjects.length > 0) {
      const addedObjects = selected ?? []
      const shouldKeepLocked = SelectionManager._shouldKeepLockedSelection({
        addedObjects,
        currentSelection,
        pointerEvent: e
      })

      if (shouldKeepLocked) {
        this._applySelectionObjects({ objects: lockedObjects })
        canvas.requestRenderAll()
        return
      }

      this._applySelectionObjects({ objects: unlockedObjects })
      canvas.requestRenderAll()
      return
    }

    this._applySelectionObjects({ objects: lockedObjects })
    canvas.requestRenderAll()
  }

  /**
   * Объединяет выделение при выделении областью с зажатым Ctrl/Cmd.
   * @param params - параметры события
   * @param params.selected - массив новых объектов выделения
   * @param params.e - событие указателя (опционально)
   */
  private _handleSelectionMerge({
    selected,
    e
  }: {
    selected: FabricObject[]
    e?: TPointerEvent
  }): void {
    const { canvas } = this.editor
    const { lastSelection, isCtrlSelectionBoxActive, isSelectionMergeInProgress } = this

    if (isSelectionMergeInProgress) return
    if (!isCtrlSelectionBoxActive) return
    if (!(e instanceof MouseEvent)) return

    const { ctrlKey, metaKey } = e
    const isMultiSelectKeyPressed = Boolean(ctrlKey || metaKey)

    if (!isMultiSelectKeyPressed) return
    if (lastSelection.length === 0) return
    if (selected.length === 0) return

    const activeObject = canvas.getActiveObject()
    const currentSelection = SelectionManager._collectSelectionObjects({ activeObject })

    if (currentSelection.length === 0) return

    const baseSelection = lastSelection
    const baseLockedOnly = SelectionManager._isSelectionLockedOnly({ objects: baseSelection })
    const addedSelection = baseLockedOnly
      ? SelectionManager._filterLockedSelectionObjects({ objects: currentSelection })
      : currentSelection

    const mergedSelection = SelectionManager._mergeSelections({
      baseSelection,
      addedSelection
    })

    const selectionIsSame = SelectionManager._areSelectionsEqual({
      left: mergedSelection,
      right: currentSelection
    })

    if (selectionIsSame) {
      this.isCtrlSelectionBoxActive = false
      return
    }

    this.isSelectionMergeInProgress = true
    this._applySelectionObjects({ objects: mergedSelection })
    canvas.requestRenderAll()
    this.isSelectionMergeInProgress = false
    this.isCtrlSelectionBoxActive = false
  }

  /**
   * Обрабатывает начало выделения областью при зажатом Ctrl/Cmd.
   * @param options - объект события fabric
   */
  private _handleSelectionBoxStart({ e, target }: TPointerEventInfo<TPointerEvent>): void {
    if (!(e instanceof MouseEvent)) return
    if (target) return

    const { editor } = this
    const { canvas, textManager } = editor

    if (!canvas.selection) return
    if (textManager.isTextEditingActive) return

    const { ctrlKey, metaKey } = e
    const isMultiSelectKeyPressed = Boolean(ctrlKey || metaKey)

    if (!isMultiSelectKeyPressed) return

    const activeObject = canvas.getActiveObject()
    const selection = SelectionManager._collectSelectionObjects({ activeObject })

    this.lastSelection = selection.slice()
    this.isCtrlSelectionBoxActive = selection.length > 0
  }

  /**
   * Сбрасывает флаг выделения областью при зажатом Ctrl/Cmd.
   * @param options - объект события fabric
   */
  private _handleSelectionBoxEnd({ e }: TPointerEventInfo<TPointerEvent>): void {
    if (!(e instanceof MouseEvent)) return

    this.isCtrlSelectionBoxActive = false
  }

  /**
   * Сохраняет текущее выделение для возможного восстановления.
   */
  private _handleSelectionChange(): void {
    const { canvas } = this.editor
    const activeObject = canvas.getActiveObject()
    const selection = SelectionManager._collectSelectionObjects({ activeObject })
    this.lastSelection = selection.slice()
  }

  /**
   * Восстанавливает выделение при клике по пустой области с зажатым Ctrl/Cmd.
   * @param params - параметры события
   * @param params.e - событие указателя (опционально)
   */
  private _handleSelectionCleared({ e }: { e?: TPointerEvent }): void {
    const { lastSelection } = this

    if (lastSelection.length === 0) return

    if (!(e instanceof MouseEvent)) {
      this.lastSelection = []
      return
    }

    const { ctrlKey, metaKey } = e
    const isMultiSelectKeyPressed = Boolean(ctrlKey || metaKey)

    if (!isMultiSelectKeyPressed) {
      this.lastSelection = []
      return
    }

    const filteredSelection = this._filterExistingObjects({ objects: lastSelection })
    if (filteredSelection.length === 0) {
      this.lastSelection = []
      return
    }

    this._applySelectionObjects({ objects: filteredSelection })
  }

  /**
   * Собирает объекты активного выделения.
   */
  private static _collectSelectionObjects({ activeObject }: { activeObject: FabricObject | null }): FabricObject[] {
    if (!activeObject) return []

    if (activeObject instanceof ActiveSelection) {
      return activeObject.getObjects()
    }

    return [activeObject]
  }

  /**
   * Проверяет, что выборка состоит только из заблокированных объектов.
   */
  private static _isSelectionLockedOnly({ objects }: { objects: FabricObject[] }): boolean {
    if (objects.length === 0) return false

    for (const object of objects) {
      if (!object.locked) return false
    }

    return true
  }

  /**
   * Оставляет только заблокированные объекты в выборке.
   */
  private static _filterLockedSelectionObjects({ objects }: { objects: FabricObject[] }): FabricObject[] {
    const lockedObjects: FabricObject[] = []

    for (const object of objects) {
      if (!object.locked) continue
      lockedObjects.push(object)
    }

    return lockedObjects
  }

  /**
   * Фильтрует объекты, которые ещё существуют на канвасе.
   */
  private _filterExistingObjects({ objects }: { objects: FabricObject[] }): FabricObject[] {
    const { canvasManager } = this.editor
    const canvasObjects = canvasManager.getObjects()
    const validObjects: FabricObject[] = []

    for (const object of objects) {
      if (!canvasObjects.includes(object)) continue
      validObjects.push(object)
    }

    return validObjects
  }

  /**
   * Проверяет равенство двух выборок без учёта порядка.
   */
  private static _areSelectionsEqual({
    left,
    right
  }: {
    left: FabricObject[]
    right: FabricObject[]
  }): boolean {
    if (left.length !== right.length) return false
    if (left.length === 0) return true

    for (const object of left) {
      if (!right.includes(object)) return false
    }

    return true
  }

  /**
   * Объединяет список объектов без дубликатов.
   */
  private static _mergeSelections({
    baseSelection,
    addedSelection
  }: {
    baseSelection: FabricObject[]
    addedSelection: FabricObject[]
  }): FabricObject[] {
    const mergedSelection: FabricObject[] = []

    for (const object of baseSelection) {
      if (!mergedSelection.includes(object)) {
        mergedSelection.push(object)
      }
    }

    for (const object of addedSelection) {
      if (!mergedSelection.includes(object)) {
        mergedSelection.push(object)
      }
    }

    return mergedSelection
  }

  /**
   * Делит объекты на заблокированные и доступные для редактирования.
   */
  private static _splitLockedObjects({
    objects
  }: {
    objects: FabricObject[]
  }): { lockedObjects: FabricObject[]; unlockedObjects: FabricObject[] } {
    const lockedObjects: FabricObject[] = []
    const unlockedObjects: FabricObject[] = []

    for (const object of objects) {
      if (object.locked) {
        lockedObjects.push(object)
        continue
      }

      unlockedObjects.push(object)
    }

    return { lockedObjects, unlockedObjects }
  }

  /**
   * Определяет, нужно ли сохранить только заблокированное выделение при попытке добавить обычные объекты.
   */
  private static _shouldKeepLockedSelection({
    addedObjects,
    currentSelection,
    pointerEvent
  }: {
    addedObjects: FabricObject[]
    currentSelection: FabricObject[]
    pointerEvent: MouseEvent
  }): boolean {
    const { ctrlKey, metaKey } = pointerEvent
    const isMultiSelectKeyPressed = Boolean(ctrlKey || metaKey)

    if (!isMultiSelectKeyPressed) return false
    if (addedObjects.length === 0) return false

    let addedHasUnlocked = false
    for (const object of addedObjects) {
      if (!object.locked) {
        addedHasUnlocked = true
        break
      }
    }

    if (!addedHasUnlocked) return false

    const previousSelection: FabricObject[] = []
    for (const object of currentSelection) {
      if (!addedObjects.includes(object)) {
        previousSelection.push(object)
      }
    }

    if (previousSelection.length === 0) return false

    for (const object of previousSelection) {
      if (!object.locked) return false
    }

    return true
  }

  /**
   * Применяет выделение и блокирует его, если в нём есть заблокированные объекты.
   */
  private _applySelectionObjects({ objects }: { objects: FabricObject[] }): void {
    const { editor } = this
    const { canvas, objectLockManager } = editor
    const validObjects = this._filterExistingObjects({ objects })

    if (validObjects.length === 0) return

    if (validObjects.length === 1) {
      canvas.setActiveObject(validObjects[0])
      return
    }

    const selection = new ActiveSelection(validObjects, { canvas })
    const hasLockedObjects = SelectionManager._hasLockedObjects({ objects: validObjects })

    if (hasLockedObjects) {
      objectLockManager.lockObject({
        object: selection,
        skipInnerObjects: true,
        withoutSave: true
      })
    }

    canvas.setActiveObject(selection)
  }

  /**
   * Проверяет, есть ли среди объектов заблокированные.
   */
  private static _hasLockedObjects({ objects }: { objects: FabricObject[] }): boolean {
    for (const object of objects) {
      if (object.locked) return true
    }

    return false
  }

  /**
   * Определяет ключи для мультивыделения.
   */
  private _resolveSelectionKey(): CanvasOptions['selectionKey'] {
    const { options } = this.editor
    const { selectionKey } = options

    if (selectionKey !== undefined) return selectionKey

    return ['ctrlKey', 'metaKey']
  }
}
