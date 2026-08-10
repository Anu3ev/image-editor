/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  SnappingDragBoundsParams,
  SnappingDragBoundsWithHoldParams,
  SnappingDragCenterParams,
  SnappingDragHoldTrace,
  SnappingDragMoveParams,
  SnappingDragStartParams,
  SnappingGuideState,
  SnappingObservedDragStep,
  SnappingObjectSnapshot,
  SnappingTargetParams
} from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

/** Координаты указателя в клиентской системе браузера. */
type CanvasClientPoint = {
  x: number
  y: number
}

/** Данные Fabric-преобразования, необходимые для следующего шага drag. */
type DragTransformInfo = {
  offsetX: number
  offsetY: number
  snapshot: SnappingObjectSnapshot
}

/** Идентификатор объекта и модификатор одного pointer-step. */
type DragPointerParams = SnappingTargetParams & {
  ctrlKey?: boolean
}

/** Управляет пользовательскими drag-сценариями и читает состояние прилипания. */
export class SnappingModel {
  private readonly page: Page

  private activePointerClientPoint: CanvasClientPoint | null

  private isControlKeyPressed: boolean

  /** Создаёт модель прилипания для указанной Playwright-страницы. */
  constructor(page: Page) {
    this.page = page
    this.activePointerClientPoint = null
    this.isControlKeyPressed = false
  }

  /** Возвращает текущее состояние направляющих SnappingManager. */
  async getGuideState(): Promise<SnappingGuideState> {
    return this.page.evaluate(() => {
      const {
        __editorHelpers: helpers
      } = window as any

      return helpers.getSnappingGuideState()
    })
  }

  /** Возвращает snapshot объекта canvas с актуальным bounding box. */
  async getObjectSnapshot(params: SnappingTargetParams = {}): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({ activeObject, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = activeObject
        ? editor.canvas.getActiveObject()
        : helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot объекта для snapping-проверки').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Начинает реальное перетаскивание выбранного объекта из его центра. */
  async startObjectDrag(params: SnappingDragStartParams = {}): Promise<SnappingObjectSnapshot> {
    const dragStart = await this._resolveObjectDragStartClientPoint(params)

    await waitForCanvasRender({ page: this.page })

    const { x, y } = dragStart
    this.activePointerClientPoint = {
      x,
      y
    }
    await this.page.mouse.move(x, y)
    await this.page.mouse.down()
    await waitForCanvasRender({ page: this.page })

    await this._assertObjectDragStarted(params)

    return this.getObjectSnapshot(params)
  }

  /** Возвращает клиентские координаты центра выбранного объекта. */
  private async _resolveObjectDragStartClientPoint(
    params: SnappingDragStartParams
  ): Promise<CanvasClientPoint> {
    const dragStart = await this.page.evaluate(({ activeObject, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = activeObject
        ? editor.canvas.getActiveObject()
        : helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.setCoords()

      const centerPoint = typeof target.getCenterPoint === 'function'
        ? target.getCenterPoint()
        : {
          x: typeof target.left === 'number' ? target.left : 0,
          y: typeof target.top === 'number' ? target.top : 0
        }
      const sceneX = typeof centerPoint.x === 'number' ? centerPoint.x : 0
      const sceneY = typeof centerPoint.y === 'number' ? centerPoint.y : 0
      const [a, b, c, d, tx, ty] = editor.canvas.viewportTransform
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      editor.canvas.requestRenderAll()

      return {
        x: rect.left + (sceneX * a) + (sceneY * c) + tx,
        y: rect.top + (sceneX * b) + (sceneY * d) + ty
      }
    }, params)

    expect(dragStart, 'должна существовать стартовая pointer-точка для перетаскивания').not.toBeNull()
    expect(Number.isFinite(dragStart?.x), 'стартовая X-координата drag должна быть конечной').toBe(true)
    expect(Number.isFinite(dragStart?.y), 'стартовая Y-координата drag должна быть конечной').toBe(true)

    return dragStart as CanvasClientPoint
  }

  /** Проверяет, что pointerdown начал именно перемещение выбранного объекта. */
  private async _assertObjectDragStarted(params: SnappingDragStartParams): Promise<void> {
    const dragTransform = await this.page.evaluate(({ activeObject, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = activeObject
        ? editor.canvas.getActiveObject()
        : helpers.resolveCanvasObject(objectIndex, id)
      const transform = editor.canvas._currentTransform
      if (!target || !transform || transform.target !== target) return null

      return {
        action: transform.action ?? null
      }
    }, params)

    expect(dragTransform, 'после начала drag должен появиться transform для нужного объекта').not.toBeNull()
    expect(dragTransform?.action, 'pointerdown должен начать перемещение, а не работу с control').toBe('drag')
  }

  /** Перемещает объект в live drag-сессии и возвращает его новый snapshot. */
  async dragObjectTo(params: SnappingDragMoveParams): Promise<SnappingObjectSnapshot> {
    const dragInfo = await this._getDragTransformInfo(params)
    return this._moveDragPointerToFabricPosition({
      params,
      dragInfo,
      left: params.left,
      top: params.top
    })
  }

  /** Перемещает объект в live drag-сессии так, чтобы его bounding box пришёл в нужную позицию. */
  async dragObjectBoundsTo(params: SnappingDragBoundsParams): Promise<SnappingObjectSnapshot> {
    const dragInfo = await this._getDragTransformInfo(params)
    const nextLeft = dragInfo.snapshot.left + (params.left - dragInfo.snapshot.boundsLeft)
    const nextTop = dragInfo.snapshot.top + (params.top - dragInfo.snapshot.boundsTop)

    return this._moveDragPointerToFabricPosition({
      params,
      dragInfo,
      left: nextLeft,
      top: nextTop
    })
  }

  /** Выполняет полный drag объекта до нужной позиции bounding box и завершает его через mouseup. */
  async moveObjectBoundsTo(params: SnappingDragBoundsParams): Promise<SnappingObjectSnapshot> {
    await this.startObjectDrag(params)
    await this.dragObjectBoundsTo(params)
    await this.finishPointerInteraction()

    return this.getObjectSnapshot(params)
  }

  /** Выполняет полное перетаскивание и сохраняет состояния внутри удержания. */
  async dragObjectBoundsWithHold({
    heldPositions,
    ...params
  }: SnappingDragBoundsWithHoldParams): Promise<SnappingDragHoldTrace> {
    await this.startObjectDrag(params)
    const acquiredSnapshot = await this.dragObjectBoundsTo(params)
    const acquired = Object.freeze({
      snapshot: acquiredSnapshot,
      guides: await this.getGuideState()
    })
    const held: SnappingObservedDragStep[] = []

    for (const position of heldPositions) {
      const snapshot = await this.dragObjectBoundsTo({ ...params, ...position })
      held.push(Object.freeze({
        snapshot,
        guides: await this.getGuideState()
      }))
    }

    await this.finishPointerInteraction()

    return Object.freeze({
      acquired,
      held: Object.freeze(held),
      committed: await this.getObjectSnapshot(params)
    })
  }

  /** Перемещает объект в live drag-сессии так, чтобы центр его bounding box пришёл в нужную позицию. */
  async dragObjectCenterTo(params: SnappingDragCenterParams): Promise<SnappingObjectSnapshot> {
    const dragInfo = await this._getDragTransformInfo(params)
    const nextLeft = dragInfo.snapshot.left + (params.centerX - dragInfo.snapshot.centerX)
    const nextTop = dragInfo.snapshot.top + (params.centerY - dragInfo.snapshot.centerY)

    return this._moveDragPointerToFabricPosition({
      params,
      dragInfo,
      left: nextLeft,
      top: nextTop
    })
  }

  /** Перемещает реальный указатель в позицию, соответствующую Fabric left/top. */
  private async _moveDragPointerToFabricPosition({
    params,
    dragInfo,
    left,
    top
  }: {
    params: DragPointerParams
    dragInfo: DragTransformInfo
    left: number
    top: number
  }): Promise<SnappingObjectSnapshot> {
    const clientPoint = await this._resolveClientPointForScenePoint({
      x: left + dragInfo.offsetX,
      y: top + dragInfo.offsetY
    })

    await this._movePointerDuringDrag({
      point: clientPoint,
      ctrlKey: params.ctrlKey
    })

    return this.getObjectSnapshot(params)
  }

  /** Завершает pointer-взаимодействие и очищает направляющие как после mouseup. */
  async finishPointerInteraction(): Promise<SnappingGuideState> {
    expect(
      this.activePointerClientPoint,
      'pointer interaction должна завершаться только после начала drag'
    ).not.toBeNull()

    await this.page.mouse.up()
    await waitForCanvasRender({ page: this.page })
    await this._setControlKeyPressed({ pressed: false })
    this.activePointerClientPoint = null

    return this.getGuideState()
  }

  /** Завершает начатое моделью перетаскивание или ничего не делает без активного указателя. */
  async finishPointerInteractionIfActive(): Promise<void> {
    if (!this.activePointerClientPoint) return

    await this.finishPointerInteraction()
  }

  /** Возвращает текущее Fabric-преобразование и геометрию выбранного объекта. */
  private async _getDragTransformInfo(params: SnappingTargetParams): Promise<DragTransformInfo> {
    const dragInfo = await this.page.evaluate(({ activeObject, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = activeObject
        ? editor.canvas.getActiveObject()
        : helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) return null

      return {
        offsetX: typeof transform.offsetX === 'number' ? transform.offsetX : 0,
        offsetY: typeof transform.offsetY === 'number' ? transform.offsetY : 0,
        snapshot: helpers.serializeSnappingObjectSnapshot(target)
      }
    }, params)

    expect(dragInfo, 'во время drag должен существовать transform для выбранного объекта').not.toBeNull()

    return dragInfo as DragTransformInfo
  }

  /** Переводит координаты сцены в клиентские координаты браузера. */
  private async _resolveClientPointForScenePoint(
    point: { x: number, y: number }
  ): Promise<CanvasClientPoint> {
    return this.page.evaluate(({ x, y }) => {
      const {
        editor
      } = window as any

      const [a, b, c, d, tx, ty] = editor.canvas.viewportTransform
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: rect.left + (x * a) + (y * c) + tx,
        y: rect.top + (x * b) + (y * d) + ty
      }
    }, point)
  }

  /** Выполняет одно реальное перемещение указателя с явно заданным состоянием Ctrl. */
  private async _movePointerDuringDrag({
    point,
    ctrlKey = false
  }: {
    point: CanvasClientPoint
    ctrlKey?: boolean
  }): Promise<void> {
    await this._setControlKeyPressed({ pressed: ctrlKey })
    await this.page.mouse.move(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
    this.activePointerClientPoint = point
  }

  /** Синхронизирует Ctrl с состоянием модификатора следующего события мыши. */
  private async _setControlKeyPressed({
    pressed
  }: {
    pressed: boolean
  }): Promise<void> {
    if (pressed === this.isControlKeyPressed) return

    if (pressed) {
      await this.page.keyboard.down('Control')
      this.isControlKeyPressed = true
      return
    }

    await this.page.keyboard.up('Control')
    this.isControlKeyPressed = false
  }
}
