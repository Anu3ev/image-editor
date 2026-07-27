import {
  ActiveSelection,
  FabricObject,
  Textbox
} from 'fabric'
import type { ObjectPlacement } from '../../canvas-manager'
import type { ImageEditor } from '../../index'
import type ShapeEditingController from '../editing/shape-editing-controller'
import {
  getShapeNodes
} from '../domain/shape-nodes'
import {
  isShapeGroup,
  resolveShapeGroupFromTarget
} from '../domain/shape-reference'
import {
  detachShapeGroupAutoLayout
} from '../domain/shape-runtime'
import type ShapeLayoutController from '../layout/shape-layout-controller'
import type ShapeLifecycleController from '../lifecycle/shape-lifecycle-controller'
import type ShapeTextNodeController from '../text/shape-text-node-controller'
import ShapeScaleInteractionController from '../scaling/shape-scale-interaction-controller'
import type ShapeScalingController from '../scaling/shape-scaling-controller'
import type {
  ShapeGroup,
  ShapeTextNode,
  ShapeTextStyleOptions
} from '../types'
import type {
  BeforeTextUpdatedPayload,
  TextUpdatedPayload
} from '../../text-manager/types'

/**
 * Данные события canvas, которые нужны обработчикам ShapeManager.
 */
type ShapeCanvasEvent = {
  target?: FabricObject | null
  e?: Event | MouseEvent
  pointer?: {
    x: number
    y: number
  }
  scenePoint?: {
    x: number
    y: number
  }
  subTargets?: FabricObject[]
  transform?: import('fabric').Transform | null
}

/**
 * Зависимости обработчиков событий ShapeManager.
 */
type ShapeEventDependencies = {
  editor: ImageEditor
  scalingController: ShapeScalingController
  editingController: ShapeEditingController
  lifecycleController: ShapeLifecycleController
  layoutController: ShapeLayoutController
  textNodeController: ShapeTextNodeController
  editingPlacements: WeakMap<ShapeGroup, ObjectPlacement>
}

/**
 * Минимальное изменение scale, которое считается реальным изменением ActiveSelection.
 */
const ACTIVE_SELECTION_SCALE_EPSILON = 0.0001

/**
 * Подписывает ShapeManager на события canvas и передаёт их нужным контроллерам.
 */
export default class ShapeEventController {
  /**
   * Зависимости обработчиков событий.
   */
  private readonly dependencies: ShapeEventDependencies

  /**
   * Управляет snapping во время scale одиночного Shape.
   */
  private readonly scaleInteractionController: ShapeScaleInteractionController

  /**
   * Принимает зависимости обработчиков и создаёт контроллер scale-жеста.
   */
  constructor({ dependencies }: { dependencies: ShapeEventDependencies }) {
    this.dependencies = dependencies
    this.scaleInteractionController = new ShapeScaleInteractionController({
      editor: dependencies.editor,
      scalingController: dependencies.scalingController
    })
  }

  /**
   * Подписывает ShapeManager на события canvas и окна.
   */
  public bind(): void {
    const { canvas } = this.dependencies.editor

    canvas.on('object:scaling', this._handleObjectScaling)
    canvas.on('object:modified', this._handleObjectModified)
    canvas.on('mouse:move', this._handleMouseMove)
    canvas.on('mouse:down', this._handleMouseDown)
    canvas.on('mouse:up', this._handleScaleInteractionFinished)
    canvas.on('object:removed', this._handleObjectRemoved)
    canvas.on('selection:created', this._handleScaleInteractionFinished)
    canvas.on('selection:updated', this._handleScaleInteractionFinished)
    canvas.on('selection:cleared', this._handleScaleInteractionFinished)
    canvas.on('text:editing:entered', this._handleTextEditingEntered)
    canvas.on('text:editing:exited', this._handleTextEditingExited)
    canvas.on('text:changed', this._handleTextChanged)
    canvas.on('editor:before:text-updated', this._handleBeforeTextUpdated)
    canvas.on('editor:text-updated', this._handleTextUpdated)

    window.addEventListener('pointercancel', this._handlePointerCancel)
    window.addEventListener('touchcancel', this._handlePointerCancel)
    window.addEventListener('blur', this._handleWindowBlur)
  }

  /**
   * Снимает подписки ShapeManager и очищает активный scale-жест.
   */
  public destroy(): void {
    this.scaleInteractionController.destroy()

    const { canvas } = this.dependencies.editor

    canvas.off('object:scaling', this._handleObjectScaling)
    canvas.off('object:modified', this._handleObjectModified)
    canvas.off('mouse:move', this._handleMouseMove)
    canvas.off('mouse:down', this._handleMouseDown)
    canvas.off('mouse:up', this._handleScaleInteractionFinished)
    canvas.off('object:removed', this._handleObjectRemoved)
    canvas.off('selection:created', this._handleScaleInteractionFinished)
    canvas.off('selection:updated', this._handleScaleInteractionFinished)
    canvas.off('selection:cleared', this._handleScaleInteractionFinished)
    canvas.off('text:editing:entered', this._handleTextEditingEntered)
    canvas.off('text:editing:exited', this._handleTextEditingExited)
    canvas.off('text:changed', this._handleTextChanged)
    canvas.off('editor:before:text-updated', this._handleBeforeTextUpdated)
    canvas.off('editor:text-updated', this._handleTextUpdated)

    window.removeEventListener('pointercancel', this._handlePointerCancel)
    window.removeEventListener('touchcancel', this._handlePointerCancel)
    window.removeEventListener('blur', this._handleWindowBlur)
  }

  /**
   * Начинает resize для затронутых Shape и применяет текущий scale.
   */
  private _handleObjectScaling = (event: ShapeCanvasEvent): void => {
    this._beginResize({ event })

    if (this.scaleInteractionController.handleObjectScaling(event)) return

    this.dependencies.scalingController.handleObjectScaling(event)
  }

  /**
   * Фиксирует результат scale для одиночного Shape или ActiveSelection.
   */
  private _handleObjectModified = (event: ShapeCanvasEvent): void => {
    const groups = this._collectShapeGroupsFromTarget({
      target: event.target
    })

    if (event.target instanceof ActiveSelection) {
      this._commitActiveSelectionShapeScaling({
        selection: event.target,
        transform: event.transform
      })
      groups.forEach((group) => {
        this.dependencies.scalingController.clearState({ group })
      })
    } else {
      this.dependencies.scalingController.handleObjectModified(event)
    }

    groups.forEach((group) => {
      this.dependencies.lifecycleController.finishResize({ group })
    })
  }

  /**
   * Обрабатывает mouse:move, когда Fabric не отправил object:scaling.
   */
  private _handleMouseMove = (event: ShapeCanvasEvent): void => {
    if (this.scaleInteractionController.handleCanvasMouseMove(event)) {
      if (event.transform?.actionPerformed) {
        this._beginResize({ event })
      }
      return
    }

    this.dependencies.scalingController.handleCanvasMouseMove(event)
  }

  /** Начинает отслеживать resize для Shape, затронутых событием. */
  private _beginResize({ event }: { event: ShapeCanvasEvent }): void {
    const groups = this._collectShapeGroupsFromTarget({
      target: event.target,
      subTargets: event.subTargets
    })

    groups.forEach((group) => {
      this.dependencies.lifecycleController.beginResize({ group })
    })
  }

  /**
   * Сохраняет Shape до возможного resize и запускает обработчики mouse:down.
   */
  private _handleMouseDown = (event: ShapeCanvasEvent): void => {
    const groups = this._collectShapeGroupsFromTarget({
      target: event.target,
      subTargets: event.subTargets
    })

    groups.forEach((group) => {
      this.dependencies.lifecycleController.captureResizeStart({ group })
    })

    this.scaleInteractionController.beginGesture(event)
    this.dependencies.editingController.handleMouseDown(event)
  }

  /** Очищает данные завершённого scale-жеста. */
  private _handleScaleInteractionFinished = (): void => {
    this.scaleInteractionController.finishGesture()
    this.dependencies.lifecycleController.clearResizeStarts()
  }

  /** Завершает scale-жест, если его Shape удалили с canvas. */
  private _handleObjectRemoved = (event: ShapeCanvasEvent): void => {
    const { target } = event
    if (!target) return
    if (!this.scaleInteractionController.finishGestureForTarget({ target })) return

    this.dependencies.lifecycleController.clearResizeStarts()
  }

  /** Прерывает scale после pointercancel или touchcancel. */
  private _handlePointerCancel = (event: PointerEvent | TouchEvent): void => {
    if (!this.scaleInteractionController.interruptGesture({ event })) return

    this.dependencies.lifecycleController.clearResizeStarts()
  }

  /** Прерывает scale, когда окно теряет фокус. */
  private _handleWindowBlur = (): void => {
    if (!this.scaleInteractionController.interruptGesture()) return

    this.dependencies.lifecycleController.clearResizeStarts()
  }

  /**
   * Завершает редактирование текста внутри Shape.
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
        this.dependencies.editingPlacements.delete(group)
        completedEditing = {
          group,
          textNode
        }
      }
    }

    this.dependencies.editingController.handleTextEditingExited(event)

    if (!completedEditing) return

    this.dependencies.lifecycleController.finishTextEditing(completedEditing)
  }

  /**
   * Подготавливает Shape к редактированию текста и запоминает его положение.
   */
  private _handleTextEditingEntered = (event: ShapeCanvasEvent): void => {
    if (event.target instanceof Textbox) {
      const textNode = event.target as ShapeTextNode
      const { group } = textNode

      if (isShapeGroup(group)) {
        detachShapeGroupAutoLayout({ group })
        this.dependencies.lifecycleController.beginTextEditing({ group })
        this.dependencies.editingPlacements.set(
          group,
          this.dependencies.editor.canvasManager.getObjectPlacement({ object: group })
        )
      }
    }

    this.dependencies.editingController.handleTextEditingEntered(event)
  }

  /**
   * Обновляет layout Shape после изменения текста во время редактирования.
   */
  private _handleTextChanged = (event: ShapeCanvasEvent): void => {
    if (!(event.target instanceof Textbox)) return

    const textNode = event.target as ShapeTextNode

    if (!isShapeGroup(textNode.group)) return

    // ShapeManager получает text:changed раньше TextManager, поэтому сначала
    // синхронизируем стили строк, от которых зависит измерение layout.
    this.dependencies.editor.textManager.syncLineStylesWithText({
      textbox: textNode
    })

    const wasSynchronized = this._syncShapeTextLayoutAfterTextMutation({
      textNode
    })

    if (!wasSynchronized) return

    this.dependencies.editor.canvas.requestRenderAll()
  }

  /**
   * Обновляет layout Shape до сохранения предыдущего состояния текста в history.
   */
  private _handleBeforeTextUpdated = (
    event: BeforeTextUpdatedPayload
  ): void => {
    const { textbox, style } = event

    if (!(textbox instanceof Textbox)) return

    const textNode = textbox as ShapeTextNode
    const { group } = textNode

    if (!isShapeGroup(group)) return
    if (this.dependencies.textNodeController.isInternalUpdate({ textNode })) return

    const lifecycle = this.dependencies.lifecycleController.beginTextUpdate({
      group,
      textNode,
      withoutSave: event.options.withoutSave
    })
    const wasSynchronized = this._syncShapeTextLayoutAfterTextMutation({
      textNode,
      textStyle: style
    })

    if (!wasSynchronized) {
      this.dependencies.lifecycleController.cancelTextUpdate({ textNode })
      return
    }

    this.dependencies.lifecycleController.fireBefore({ lifecycle })
  }

  /**
   * Завершает программное обновление текста внутри Shape.
   */
  private _handleTextUpdated = (event: TextUpdatedPayload): void => {
    const { textbox } = event

    if (!(textbox instanceof Textbox)) return

    this.dependencies.lifecycleController.finishTextUpdate({
      textNode: textbox as ShapeTextNode
    })
  }

  /**
   * Синхронизирует layout группы после изменения принадлежащего ей текста.
   */
  private _syncShapeTextLayoutAfterTextMutation({
    textNode,
    textStyle
  }: {
    textNode: ShapeTextNode
    textStyle?: ShapeTextStyleOptions
  }): boolean {
    const { group } = textNode
    if (!isShapeGroup(group)) return false

    const { shape, text } = getShapeNodes({ group })
    if (!shape || !text) return false

    const { layoutController, editingPlacements, editor } = this.dependencies
    const placement = editingPlacements.get(group)
      ?? editor.canvasManager.getObjectPlacement({ object: group })

    detachShapeGroupAutoLayout({ group })

    layoutController.applyCurrentLayout({
      group,
      shape,
      text,
      placement,
      height: layoutController.resolveManualDimensions({ group }).height,
      alignH: layoutController.resolveShapeTextHorizontalAlign({
        group,
        textStyle
      })
    })

    return true
  }

  /**
   * Собирает уникальные shape-группы из target, subTargets и ActiveSelection.
   */
  private _collectShapeGroupsFromTarget({
    target,
    subTargets = []
  }: {
    target?: FabricObject | null
    subTargets?: FabricObject[]
  }): ShapeGroup[] {
    const groups = new Set<ShapeGroup>()
    const targets = target ? [target, ...subTargets] : subTargets

    for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
      const candidate = targets[targetIndex]
      const objects = candidate instanceof ActiveSelection
        ? candidate.getObjects()
        : [candidate]

      for (let objectIndex = 0; objectIndex < objects.length; objectIndex += 1) {
        const group = resolveShapeGroupFromTarget({
          target: objects[objectIndex]
        })

        if (group) groups.add(group)
      }
    }

    return Array.from(groups)
  }

  /**
   * Применяет scale ActiveSelection к дочерним Shape и восстанавливает выделение.
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

    const { scaleX, scaleY } = this.dependencies.scalingController.resolveActiveSelectionCommittedScale({
      selection
    })
    const hasScaleChange = Math.abs(scaleX - 1) > ACTIVE_SELECTION_SCALE_EPSILON
      || Math.abs(scaleY - 1) > ACTIVE_SELECTION_SCALE_EPSILON

    if (!hasScaleChange) {
      this.dependencies.scalingController.clearActiveSelectionState({ selection })
      return
    }

    const { canvas, canvasManager } = this.dependencies.editor

    canvas.discardActiveObject()

    shapeGroups.forEach((group) => {
      const placement = canvasManager.getObjectPlacement({ object: group })
      const didCommitScaling = this.dependencies.scalingController.commitActiveSelectionGroupScaling({
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

    this.dependencies.scalingController.clearActiveSelectionState({ selection })
    canvas.setActiveObject(new ActiveSelection(objects, { canvas }))
    canvas.requestRenderAll()
  }
}
