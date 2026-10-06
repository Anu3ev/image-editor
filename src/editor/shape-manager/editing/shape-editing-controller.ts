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
 * Fabric mouse-down payload required to enter shape-text editing.
 */
type ShapeMouseDownEvent = {
  target?: FabricObject | null
  e?: Event | MouseEvent
  subTargets?: FabricObject[]
}

/**
 * Fabric text-editing payload for a textbox inside a shape group.
 */
type ShapeTextEditingEvent = {
  target?: FabricObject | null
}

/**
 * Snapshot of group and text interaction flags during editing.
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
 * Pointer-event type from Fabric's findTarget.
 */
type ShapeCanvasPointerEvent = Parameters<Canvas['findTarget']>[0]

/**
 * Fabric findTarget result for the current canvas.
 */
type ShapeCanvasTargetInfo = ReturnType<Canvas['findTarget']>

/**
 * Signature of findTarget, temporarily replaced by the editing controller.
 */
type ShapeCanvasFindTarget = (
  event: ShapeCanvasPointerEvent
) => ShapeCanvasTargetInfo

/**
 * State of the temporary target-resolver override during text editing.
 */
type ShapeEditingTargetResolverState = {
  group: ShapeGroup
  text: ShapeTextNode
  findTarget: ShapeCanvasFindTarget
}

/**
 * Controller for editing text inside a shape group.
 */
export default class ShapeEditingController {
  /**
   * The editor's Fabric canvas.
   */
  private canvas: Canvas

  /**
   * Snapshots of group and text interactivity during editing.
   */
  private editingInteractionState: WeakMap<ShapeGroup, ShapeEditingInteractionState>

  /**
   * Temporary target resolver that routes clicks inside the active shape to the editing textbox.
   */
  private editingTargetResolverState?: ShapeEditingTargetResolverState

  /**
   * Initializes the text-editing controller for the given canvas.
   */
  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
    this.editingInteractionState = new WeakMap()
    this.editingTargetResolverState = undefined
  }

  /**
   * Handles a shape-group click and enters text-editing mode on a subsequent click.
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
   * Puts the shape group in a safe mode where only text editing is available.
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
   * Returns the text node to normal mode when input ends.
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
   * Enables text-editing mode for the selected, unlocked shape group.
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
   * Saves and temporarily disables drag/selection on the shape group during text editing.
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
   * Restores shape-group and text-node interactivity when editing ends.
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
   * Routes clicks inside the current shape group to the active textbox during editing.
   * This prevents Fabric from deselecting when the pointer is in the shape's inset area rather than the text's glyph box.
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
   * Restores canvas.findTarget to its original state when editing ends.
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
