import {
  Canvas,
  FabricObject,
  Textbox
} from 'fabric'
import {
  ShapeGroup,
  ShapeTextNode
} from '../types'
import {
  getShapeNodes
} from '../domain/shape-nodes'
import {
  isShapeGroup,
  resolveShapeGroupFromTarget
} from '../domain/shape-reference'
import { prepareShapeTextNode } from '../domain/shape-runtime'

/**
 * Fabric mouse down payload, который нужен для входа в редактирование текста фигуры.
 */
type ShapeMouseDownEvent = {
  target?: FabricObject | null
  e?: Event | MouseEvent
  subTargets?: FabricObject[]
}

/**
 * Fabric text editing payload для textbox внутри shape-группы.
 */
type ShapeTextEditingEvent = {
  target?: FabricObject | null
}

/**
 * Снимок интерактивных флагов группы и текста на время редактирования.
 */
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
 * Pointer event тип из Fabric findTarget.
 */
type ShapeCanvasPointerEvent = Parameters<Canvas['findTarget']>[0]

/**
 * Результат Fabric findTarget для текущего canvas.
 */
type ShapeCanvasTargetInfo = ReturnType<Canvas['findTarget']>

/**
 * Сигнатура findTarget, которую временно подменяет editing controller.
 */
type ShapeCanvasFindTarget = (
  event: ShapeCanvasPointerEvent
) => ShapeCanvasTargetInfo

/**
 * Состояние временной подмены target resolver во время редактирования текста.
 */
type ShapeEditingTargetResolverState = {
  group: ShapeGroup
  text: ShapeTextNode
  findTarget: ShapeCanvasFindTarget
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

  /**
   * Временный target resolver, который удерживает клики внутри активного shape на editing-textbox.
   */
  private editingTargetResolverState?: ShapeEditingTargetResolverState

  /**
   * Инициализирует controller редактирования текста для переданного canvas.
   */
  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
    this.editingInteractionState = new WeakMap()
    this.editingTargetResolverState = undefined
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
   * Включает текстовый режим редактирования для выбранной незаблокированной shape-группы.
   */
  public enterTextEditing({ group }: { group: ShapeGroup }): void {
    const { text } = getShapeNodes({ group })
    if (!text) return

    const isLocked = Boolean(group.locked || text.locked)

    if (isLocked) {
      prepareShapeTextNode({ text })
      this.canvas.requestRenderAll()
      return
    }

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

    this._installEditingTargetResolver({
      group,
      text
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

    this._restoreEditingTargetResolver()

    this.editingInteractionState.delete(group)

    group.setCoords()
    text.setCoords()
  }

  /**
   * На время editing перенаправляет клики внутри текущей shape-группы в активный textbox.
   * Это удерживает Fabric от deselect, когда курсор попадает в inset-область shape, а не в сам glyph-box текста.
   */
  private _installEditingTargetResolver({
    group,
    text
  }: {
    group: ShapeGroup
    text: ShapeTextNode
  }): void {
    const currentState = this.editingTargetResolverState

    if (currentState?.group === group && currentState.text === text) {
      return
    }

    this._restoreEditingTargetResolver()

    const canvas = this.canvas as Canvas & {
      findTarget: ShapeCanvasFindTarget
    }
    const originalFindTarget = canvas.findTarget.bind(canvas)

    canvas.findTarget = (event: ShapeCanvasPointerEvent): ShapeCanvasTargetInfo => {
      const targetInfo = originalFindTarget(event)
      const activeObject = this.canvas.getActiveObject()

      if (activeObject !== text || !text.isEditing) return targetInfo

      if (targetInfo.target === text) return targetInfo

      const targetGroup = resolveShapeGroupFromTarget({
        target: targetInfo.target,
        subTargets: targetInfo.subTargets
      })

      if (targetGroup !== group) return targetInfo

      const subTargets = targetInfo.subTargets.includes(text)
        ? targetInfo.subTargets
        : [text, ...targetInfo.subTargets]

      return {
        ...targetInfo,
        target: text,
        currentTarget: text,
        subTargets,
        currentSubTargets: subTargets
      }
    }

    this.editingTargetResolverState = {
      group,
      text,
      findTarget: originalFindTarget
    }
  }

  /**
   * Возвращает canvas.findTarget в исходное состояние после завершения editing.
   */
  private _restoreEditingTargetResolver(): void {
    const currentState = this.editingTargetResolverState
    if (!currentState) return

    const canvas = this.canvas as Canvas & {
      findTarget: ShapeCanvasFindTarget
    }

    canvas.findTarget = currentState.findTarget
    this.editingTargetResolverState = undefined
  }
}
