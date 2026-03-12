import {
  Canvas,
  FabricObject,
  Textbox
} from 'fabric'
import {
  ShapeGroup,
  ShapeTextNode
} from './types'
import {
  getShapeNodes,
  isShapeGroup,
  resolveShapeGroupFromTarget
} from './shape-utils'
import { prepareShapeTextNode } from './shape-runtime'

type ShapeMouseDownEvent = {
  target?: FabricObject | null
  e?: Event | MouseEvent
  subTargets?: FabricObject[]
}

type ShapeTextEditingEvent = {
  target?: FabricObject | null
}

type ShapeEditingInteractionState = {
  groupSelectable: boolean
  groupEvented: boolean
  groupLockMovementX: boolean
  groupLockMovementY: boolean
  groupHoverCursor?: string | null
  groupMoveCursor?: string | null
  textLockMovementX: boolean
  textLockMovementY: boolean
}

/**
 * Контроллер редактирования текста внутри shape-группы.
 */
export default class ShapeEditingController {
  /**
   * Fabric canvas редактора.
   */
  private canvas: Canvas

  /**
   * Снимки интерактивности группы и текста на время редактирования.
   */
  private editingInteractionState: WeakMap<ShapeGroup, ShapeEditingInteractionState>

  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
    this.editingInteractionState = new WeakMap()
  }

  /**
   * Обрабатывает клик по shape-группе и переводит текст в режим редактирования по повторному клику.
   */
  public handleMouseDown = (
    event: ShapeMouseDownEvent
  ): void => {
    const {
      target,
      e,
      subTargets = []
    } = event

    const group = resolveShapeGroupFromTarget({
      target,
      subTargets
    })

    if (!group) return

    const { text } = getShapeNodes({ group })
    if (!text) return

    const activeObject = this.canvas.getActiveObject()
    const isGroupSelected = activeObject === group
    const isTextSelected = activeObject === text
    const isTextEditing = isTextSelected && text.isEditing

    if (isTextEditing) return

    if (!isGroupSelected) {
      if (!text.isEditing) {
        prepareShapeTextNode({ text })
      }
      return
    }

    if (!(e instanceof MouseEvent)) return
    if (e.detail < 2) return

    this.enterTextEditing({ group })
  }

  /**
   * Переводит shape-группу в безопасный режим, где доступно только редактирование текста.
   */
  public handleTextEditingEntered = (event: ShapeTextEditingEvent): void => {
    const { target } = event
    if (!(target instanceof Textbox)) return

    const text = target as ShapeTextNode
    const { group } = text
    if (!isShapeGroup(group)) return

    this._enterTextEditingInteractionMode({
      group,
      text
    })

    this.canvas.requestRenderAll()
  }

  /**
   * Возвращает текстовый узел в обычный режим после завершения ввода.
   */
  public handleTextEditingExited = (event: ShapeTextEditingEvent): void => {
    const { target } = event
    if (!(target instanceof Textbox)) return

    const text = target as ShapeTextNode
    const { group } = text
    if (!isShapeGroup(group)) return

    this._restoreTextEditingInteractionMode({
      group,
      text
    })
    prepareShapeTextNode({ text })

    if (this.canvas.getActiveObject() === text) {
      this.canvas.setActiveObject(group)
    }

    this.canvas.requestRenderAll()
  }

  /**
   * Включает текстовый режим редактирования для выбранной shape-группы.
   */
  public enterTextEditing({ group }: { group: ShapeGroup }): void {
    const { text } = getShapeNodes({ group })
    if (!text) return

    this._enterTextEditingInteractionMode({
      group,
      text
    })

    text.set({
      evented: true,
      selectable: true,
      lockMovementX: true,
      lockMovementY: true
    })

    this.canvas.setActiveObject(text)

    if (!text.isEditing) {
      text.enterEditing()
      text.selectAll()
    }

    this.canvas.requestRenderAll()
  }

  /**
   * Фиксирует и временно отключает drag/selection у shape-группы на время редактирования текста.
   */
  private _enterTextEditingInteractionMode({
    group,
    text
  }: {
    group: ShapeGroup
    text: ShapeTextNode
  }): void {
    const hasStoredState = this.editingInteractionState.has(group)
    if (!hasStoredState) {
      this.editingInteractionState.set(group, {
        groupSelectable: group.selectable !== false,
        groupEvented: group.evented !== false,
        groupLockMovementX: Boolean(group.lockMovementX),
        groupLockMovementY: Boolean(group.lockMovementY),
        groupHoverCursor: group.hoverCursor,
        groupMoveCursor: group.moveCursor,
        textLockMovementX: Boolean(text.lockMovementX),
        textLockMovementY: Boolean(text.lockMovementY)
      })
    }

    group.set({
      selectable: false,
      evented: true,
      lockMovementX: true,
      lockMovementY: true,
      hoverCursor: 'text',
      moveCursor: 'text'
    })

    text.set({
      lockMovementX: true,
      lockMovementY: true
    })

    group.setCoords()
    text.setCoords()
  }

  /**
   * Восстанавливает интерактивность shape-группы и текстового узла после завершения редактирования.
   */
  private _restoreTextEditingInteractionMode({
    group,
    text
  }: {
    group: ShapeGroup
    text: ShapeTextNode
  }): void {
    const storedState = this.editingInteractionState.get(group)
    if (!storedState) return

    group.set({
      selectable: storedState.groupSelectable,
      evented: storedState.groupEvented,
      lockMovementX: storedState.groupLockMovementX,
      lockMovementY: storedState.groupLockMovementY,
      hoverCursor: storedState.groupHoverCursor,
      moveCursor: storedState.groupMoveCursor
    })

    text.set({
      lockMovementX: storedState.textLockMovementX,
      lockMovementY: storedState.textLockMovementY
    })

    this.editingInteractionState.delete(group)

    group.setCoords()
    text.setCoords()
  }
}
