import {
  ActiveSelection,
  FabricObject,
  Textbox
} from 'fabric'
import type { ObjectPlacement } from '../canvas-manager'
import type { ImageEditor } from '../index'
import type ShapeEditingController from './shape-editing'
import type ShapeLifecycleController from './shape-lifecycle'
import type ShapeScalingController from './scaling/shape-scaling'
import { isShapeGroup } from './shape-utils'
import type {
  ShapeGroup,
  ShapeGroupLike,
  ShapeTextNode,
  ShapeTextStyleOptions
} from './types'
import type {
  BeforeTextUpdatedPayload,
  TextUpdatedPayload
} from '../text-manager/types'

/**
 * Нормализованная форма canvas-события, с которой работает ShapeManager event path.
 */
type ShapeCanvasEvent = {
  target?: FabricObject | null
  e?: Event | MouseEvent
  subTargets?: FabricObject[]
  transform?: import('fabric').Transform | null
}

/**
 * Runtime-зависимости, которые event controller использует для shape lifecycle сценариев.
 */
type ShapeEventRuntime = {
  editor: ImageEditor
  scalingController: ShapeScalingController
  editingController: ShapeEditingController
  lifecycleController: ShapeLifecycleController
  editingPlacements: WeakMap<ShapeGroup, ObjectPlacement>
  internalTextUpdates: WeakSet<ShapeTextNode>
  collectShapeGroupsFromTarget: ({
    target,
    subTargets
  }: {
    target?: FabricObject | null
    subTargets?: FabricObject[]
  }) => ShapeGroup[]
  detachShapeGroupAutoLayout: ({ group }: { group: ShapeGroupLike }) => void
  syncShapeTextLayoutAfterTextMutation: ({
    textNode,
    textStyle
  }: {
    textNode: ShapeTextNode
    textStyle?: ShapeTextStyleOptions
  }) => boolean
}

/**
 * Минимальное отклонение scale ActiveSelection, после которого mutation path считается реальным.
 */
const ACTIVE_SELECTION_SCALE_EPSILON = 0.0001

/**
 * Владеет подписками ShapeManager на события canvas и переводит их
 * в lifecycle/scaling/editing сценарии для shape-групп.
 */
export default class ShapeEventController {
  /**
   * Runtime-зависимости, через которые контроллер работает с ShapeManager без прямого доступа к нему.
   */
  private readonly runtime: ShapeEventRuntime

  /**
   * Инициализирует event controller с уже собранным runtime-контрактом ShapeManager.
   */
  constructor({ runtime }: { runtime: ShapeEventRuntime }) {
    this.runtime = runtime
  }

  /**
   * Подписывает обработчики shape-событий на canvas редактора.
   */
  public bind(): void {
    const { canvas } = this.runtime.editor

    canvas.on('object:scaling', this._handleObjectScaling)
    canvas.on('object:modified', this._handleObjectModified)
    canvas.on('mouse:move', this._handleMouseMove)
    canvas.on('mouse:down', this._handleMouseDown)
    canvas.on('mouse:up', this._handleMouseUp)
    canvas.on('text:editing:entered', this._handleTextEditingEntered)
    canvas.on('text:editing:exited', this._handleTextEditingExited)
    canvas.on('text:changed', this._handleTextChanged)
    canvas.on('editor:before:text-updated', this._handleBeforeTextUpdated)
    canvas.on('editor:text-updated', this._handleTextUpdated)
  }

  /**
   * Снимает все canvas-подписки, которыми владеет контроллер.
   */
  public destroy(): void {
    const { canvas } = this.runtime.editor

    canvas.off('object:scaling', this._handleObjectScaling)
    canvas.off('object:modified', this._handleObjectModified)
    canvas.off('mouse:move', this._handleMouseMove)
    canvas.off('mouse:down', this._handleMouseDown)
    canvas.off('mouse:up', this._handleMouseUp)
    canvas.off('text:editing:entered', this._handleTextEditingEntered)
    canvas.off('text:editing:exited', this._handleTextEditingExited)
    canvas.off('text:changed', this._handleTextChanged)
    canvas.off('editor:before:text-updated', this._handleBeforeTextUpdated)
    canvas.off('editor:text-updated', this._handleTextUpdated)
  }

  /**
   * Начинает resize lifecycle для всех shape-групп, попавших в scaling событие.
   */
  private _handleObjectScaling = (event: ShapeCanvasEvent): void => {
    const groups = this.runtime.collectShapeGroupsFromTarget({
      target: event.target,
      subTargets: event.subTargets
    })

    groups.forEach((group) => {
      this.runtime.lifecycleController.beginResize({ group })
    })

    this.runtime.scalingController.handleObjectScaling(event)
  }

  /**
   * Завершает scaling path для одиночной группы или ActiveSelection.
   */
  private _handleObjectModified = (event: ShapeCanvasEvent): void => {
    const groups = this.runtime.collectShapeGroupsFromTarget({
      target: event.target
    })

    if (event.target instanceof ActiveSelection) {
      this._commitActiveSelectionShapeScaling({
        selection: event.target,
        transform: event.transform
      })
      groups.forEach((group) => {
        this.runtime.scalingController.clearState({ group })
      })
    } else {
      this.runtime.scalingController.handleObjectModified(event)
    }

    groups.forEach((group) => {
      this.runtime.lifecycleController.finishResize({ group })
    })
  }

  /**
   * Прокидывает live mouse-move в scaling controller.
   */
  private _handleMouseMove = (event: ShapeCanvasEvent): void => {
    this.runtime.scalingController.handleCanvasMouseMove(event)
  }

  /**
   * Фиксирует resize start snapshot и передаёт событие в editing controller.
   */
  private _handleMouseDown = (event: ShapeCanvasEvent): void => {
    const groups = this.runtime.collectShapeGroupsFromTarget({
      target: event.target,
      subTargets: event.subTargets
    })

    groups.forEach((group) => {
      this.runtime.lifecycleController.captureResizeStart({ group })
    })

    this.runtime.editingController.handleMouseDown(event)
  }

  /**
   * Сбрасывает временные resize snapshots после завершения pointer action.
   */
  private _handleMouseUp = (): void => {
    this.runtime.lifecycleController.clearResizeStarts()
  }

  /**
   * Завершает text-editing lifecycle для текста внутри shape-группы.
   */
  private _handleTextEditingExited = (event: ShapeCanvasEvent): void => {
    let completedEditing: {
      group: ShapeGroup
      textNode: ShapeTextNode
    } | null = null

    if (event.target instanceof Textbox) {
      const textNode = event.target as ShapeTextNode
      const { group } = textNode

      if (isShapeGroup(group)) {
        this.runtime.editingPlacements.delete(group)
        completedEditing = {
          group,
          textNode
        }
      }
    }

    this.runtime.editingController.handleTextEditingExited(event)

    if (!completedEditing) return

    this.runtime.lifecycleController.finishTextEditing(completedEditing)
  }

  /**
   * Переводит shape-группу в режим text editing и запоминает её placement.
   */
  private _handleTextEditingEntered = (event: ShapeCanvasEvent): void => {
    if (event.target instanceof Textbox) {
      const textNode = event.target as ShapeTextNode
      const { group } = textNode

      if (isShapeGroup(group)) {
        this.runtime.detachShapeGroupAutoLayout({ group })
        this.runtime.lifecycleController.beginTextEditing({ group })
        this.runtime.editingPlacements.set(
          group,
          this.runtime.editor.canvasManager.getObjectPlacement({ object: group })
        )
      }
    }

    this.runtime.editingController.handleTextEditingEntered(event)
  }

  /**
   * Синхронизирует layout группы после live-изменения текста внутри фигуры.
   */
  private _handleTextChanged = (event: ShapeCanvasEvent): void => {
    if (!(event.target instanceof Textbox)) return

    const textNode = event.target as ShapeTextNode

    if (!isShapeGroup(textNode.group)) return

    const wasSynchronized = this.runtime.syncShapeTextLayoutAfterTextMutation({
      textNode
    })

    if (!wasSynchronized) return

    this.runtime.editor.canvas.requestRenderAll()
  }

  /**
   * Выполняет pre-history синхронизацию shape-layout перед программным text update.
   */
  private _handleBeforeTextUpdated = (
    event: BeforeTextUpdatedPayload
  ): void => {
    const { textbox, style } = event

    if (!(textbox instanceof Textbox)) return

    const textNode = textbox as ShapeTextNode
    const { group } = textNode

    if (!isShapeGroup(group)) return
    if (this.runtime.internalTextUpdates.has(textNode)) return

    const lifecycle = this.runtime.lifecycleController.beginTextUpdate({
      group,
      textNode,
      withoutSave: event.options.withoutSave
    })
    const wasSynchronized = this.runtime.syncShapeTextLayoutAfterTextMutation({
      textNode,
      textStyle: style
    })

    if (!wasSynchronized) {
      this.runtime.lifecycleController.cancelTextUpdate({ textNode })
      return
    }

    this.runtime.lifecycleController.fireBefore({ lifecycle })
  }

  /**
   * Завершает lifecycle программного обновления текста внутри shape-группы.
   */
  private _handleTextUpdated = (event: TextUpdatedPayload): void => {
    const { textbox } = event

    if (!(textbox instanceof Textbox)) return

    this.runtime.lifecycleController.finishTextUpdate({
      textNode: textbox as ShapeTextNode
    })
  }

  /**
   * Запекает scale ActiveSelection в дочерние shape-группы и восстанавливает выделение.
   */
  private _commitActiveSelectionShapeScaling({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform?: ShapeCanvasEvent['transform']
  }): void {
    const objects = selection.getObjects()
    const shapeGroups = objects.filter((object): object is ShapeGroup => {
      return isShapeGroup(object)
    })

    if (!shapeGroups.length) return

    const { scaleX, scaleY } = this.runtime.scalingController.resolveActiveSelectionCommittedScale({
      selection
    })
    const hasScaleChange = Math.abs(scaleX - 1) > ACTIVE_SELECTION_SCALE_EPSILON
      || Math.abs(scaleY - 1) > ACTIVE_SELECTION_SCALE_EPSILON

    if (!hasScaleChange) {
      this.runtime.scalingController.clearActiveSelectionState({ selection })
      return
    }

    const { canvas, canvasManager } = this.runtime.editor

    canvas.discardActiveObject()

    shapeGroups.forEach((group) => {
      const placement = canvasManager.getObjectPlacement({ object: group })
      const didCommitScaling = this.runtime.scalingController.commitActiveSelectionGroupScaling({
        group,
        scaleX,
        scaleY,
        transform
      })

      if (!didCommitScaling) return

      canvasManager.applyObjectPlacement({
        object: group,
        placement
      })
      group.setCoords()
    })

    this.runtime.scalingController.clearActiveSelectionState({ selection })
    canvas.setActiveObject(new ActiveSelection(objects, { canvas }))
    canvas.requestRenderAll()
  }
}
