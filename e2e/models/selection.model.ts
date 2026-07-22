/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type { SnappingObjectSnapshot } from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

/** Ручка, за которую можно изменить размер активного составного объекта. */
type SelectionControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

/** Угловая ручка активного составного объекта. */
type SelectionDiagonalControlKey = Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'>

/** Состояние незавершённого скейлинга составного объекта. */
type SelectionScaleInteraction = {
  point: {
    x: number
    y: number
  }
  mode: 'browser-pointer' | 'fabric-handler'
  control: SelectionControlKey
  shiftKey: boolean
}

/** Смещение активной ручки на одном шаге скейлинга. */
type DragActiveScaleHandleParams = {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Результат шага при прямом вызове обработчика Fabric. */
type SelectionScaleStepResult = {
  point: {
    x: number
    y: number
  }
  snapshot: SnappingObjectSnapshot
}

/** Параметры прямого скейлинга общего выделения через обработчики Fabric. */
type ScaleSelectionFromControlParams = {
  startControl: SelectionControlKey
  oppositeControl: SelectionControlKey
  scaleX?: number
  scaleY?: number
  minimumWidth?: number
  minimumHeight?: number
  shiftKey?: boolean
}

/** Минимальный размер, до которого нужно сжать общее выделение. */
type SelectionMinimumSizeParams = {
  minimumSize: number
  shiftKey?: boolean
}

/**
 * Расхождение между границами активного объекта и отрисованной рамкой выделения.
 */
type SelectionFrameAlignmentInfo = {
  bottomRightDeltaX: number
  bottomRightDeltaY: number
  maxDistance: number
  topLeftDeltaX: number
  topLeftDeltaY: number
}

/** Точка объекта в системе координат canvas. */
type SelectionScenePoint = {
  x: number
  y: number
  transform?: (matrix: number[]) => SelectionScenePoint
}

/** Минимальный контракт объекта для проверки положения рамки выделения. */
type SelectionVisualTarget = {
  group?: {
    calcTransformMatrix?: () => number[]
  }
  getPointByOrigin: (originX: string, originY: string) => SelectionScenePoint
}

/** Ручки и состав текущего активного объекта. */
export interface SelectionScaleCapability {
  targetId: string | null
  targetType: string
  childIds: string[]
  availableScaleHandles: string[]
  snapshot: SnappingObjectSnapshot
}

/** Состояния до движения, во время скейлинга и после mouseup. */
export interface SelectionScaleGestureResult {
  started: SnappingObjectSnapshot
  live: SnappingObjectSnapshot
  committed: SnappingObjectSnapshot
}

/** Действия и проверки для активного общего выделения или группы. */
export class SelectionModel {
  private readonly page: Page

  private activeScaleInteraction: SelectionScaleInteraction | null

  /** Создаёт модель действий над составными объектами редактора. */
  constructor(page: Page) {
    this.page = page
    this.activeScaleInteraction = null
  }

  /** Возвращает состояние текущего активного составного объекта. */
  async getSnapshot(): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      return helpers.serializeSnappingObjectSnapshot(target)
    })

    expect(snapshot, 'должен существовать текущий активный объект').not.toBeNull()

    if (!snapshot) throw new Error('Активный объект должен существовать')

    return snapshot
  }

  /** Возвращает доступные ручки, дочерние id и границы активного объекта. */
  async getScaleCapability(): Promise<SelectionScaleCapability> {
    const capability = await this.page.evaluate(() => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      target.setCoords()

      const scaleHandles = ['tl', 'tr', 'br', 'bl', 'ml', 'mt', 'mr', 'mb']
      const availableScaleHandles = scaleHandles.filter((handle) => {
        const point = target.oCoords?.[handle]
        const isVisible = typeof target.isControlVisible !== 'function' || target.isControlVisible(handle)

        return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && isVisible)
      })
      const childIds = (target.getObjects?.() ?? [])
        .map((child: { id?: unknown }) => child.id)
        .filter((id: unknown): id is string => typeof id === 'string')

      return {
        targetId: typeof target.id === 'string' ? target.id : null,
        targetType: target.type,
        childIds,
        availableScaleHandles,
        snapshot: helpers.serializeSnappingObjectSnapshot(target)
      }
    })

    expect(capability, 'активный объект должен существовать').not.toBeNull()
    expect(capability?.availableScaleHandles, 'должен существовать список доступных ручек')
      .toBeInstanceOf(Array)

    if (!capability) throw new Error('Активный объект должен существовать')

    return capability
  }

  /** Возвращает смещение области выделения относительно активного объекта без принудительного setCoords(). */
  async getActiveObjectSelectionFrameAlignment(): Promise<SelectionFrameAlignmentInfo> {
    const alignment = await this.page.evaluate(() => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      const visualTarget = helpers.resolveShapeNode(target) ?? target

      if (!target?.oCoords || typeof visualTarget?.getPointByOrigin !== 'function') return null

      const measuredTarget = visualTarget as SelectionVisualTarget
      const { viewportTransform } = editor.canvas
      const toScenePoint = (object: SelectionVisualTarget, originX: string, originY: string) => {
        const point = object.getPointByOrigin(originX, originY)

        if (
          object.group
          && typeof point.transform === 'function'
          && typeof object.group.calcTransformMatrix === 'function'
        ) {
          return point.transform(object.group.calcTransformMatrix())
        }

        return point
      }
      const toViewportPoint = (point: { x: number; y: number }) => ({
        x: viewportTransform[0] * point.x + viewportTransform[2] * point.y + viewportTransform[4],
        y: viewportTransform[1] * point.x + viewportTransform[3] * point.y + viewportTransform[5]
      })

      const topLeft = toViewportPoint(toScenePoint(measuredTarget, 'left', 'top'))
      const bottomRight = toViewportPoint(toScenePoint(measuredTarget, 'right', 'bottom'))
      const controlTopLeft = target.oCoords.tl
      const controlBottomRight = target.oCoords.br

      if (!controlTopLeft || !controlBottomRight) return null

      const topLeftDeltaX = controlTopLeft.x - topLeft.x
      const topLeftDeltaY = controlTopLeft.y - topLeft.y
      const bottomRightDeltaX = controlBottomRight.x - bottomRight.x
      const bottomRightDeltaY = controlBottomRight.y - bottomRight.y
      const topLeftDistance = Math.sqrt(topLeftDeltaX * topLeftDeltaX + topLeftDeltaY * topLeftDeltaY)
      const bottomRightDistance = Math.sqrt(
        bottomRightDeltaX * bottomRightDeltaX + bottomRightDeltaY * bottomRightDeltaY
      )

      return {
        bottomRightDeltaX,
        bottomRightDeltaY,
        maxDistance: Math.max(topLeftDistance, bottomRightDistance),
        topLeftDeltaX,
        topLeftDeltaY
      }
    })

    expect(alignment, 'область выделения активного объекта должна быть доступна').not.toBeNull()

    return alignment as SelectionFrameAlignmentInfo
  }

  /** Масштабирует текущее общее выделение справа и возвращает live-состояние. */
  async scaleHorizontallyFromRight(
    params: {
      scaleX: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mr',
      oppositeControl: 'ml',
      scaleX: params.scaleX
    })
  }

  /** Масштабирует текущее общее выделение слева и возвращает live-состояние. */
  async scaleHorizontallyFromLeft(
    params: {
      scaleX: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'ml',
      oppositeControl: 'mr',
      scaleX: params.scaleX
    })
  }

  /** Масштабирует текущее общее выделение снизу и возвращает live-состояние. */
  async scaleVerticallyFromBottom(
    params: {
      scaleY: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mb',
      oppositeControl: 'mt',
      scaleY: params.scaleY
    })
  }

  /** Масштабирует текущее общее выделение сверху и возвращает live-состояние. */
  async scaleVerticallyFromTop(
    params: {
      scaleY: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mt',
      oppositeControl: 'mb',
      scaleY: params.scaleY
    })
  }

  /** Масштабирует текущее общее выделение из правого нижнего угла и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async scaleDiagonallyFromBottomRight(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'br',
      oppositeControl: 'tl',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Масштабирует текущее общее выделение из правого верхнего угла и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async scaleDiagonallyFromTopRight(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'tr',
      oppositeControl: 'bl',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Масштабирует текущее общее выделение из левого верхнего угла и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async scaleDiagonallyFromTopLeft(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'tl',
      oppositeControl: 'br',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Масштабирует текущее общее выделение из левого нижнего угла и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async scaleDiagonallyFromBottomLeft(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'bl',
      oppositeControl: 'tr',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение справа до минимальной ширины и возвращает live-состояние. */
  async shrinkHorizontallyFromRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mr',
      oppositeControl: 'ml',
      minimumWidth: params.minimumSize
    })
  }

  /** Сжимает текущее общее выделение снизу до минимальной высоты и возвращает live-состояние. */
  async shrinkVerticallyFromBottomToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mb',
      oppositeControl: 'mt',
      minimumHeight: params.minimumSize
    })
  }

  /** Сжимает текущее общее выделение сверху до минимальной высоты и возвращает live-состояние. */
  async shrinkVerticallyFromTopToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mt',
      oppositeControl: 'mb',
      minimumHeight: params.minimumSize
    })
  }

  /** Сжимает текущее общее выделение из правого нижнего угла до минимальных ширины и высоты и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async shrinkDiagonallyFromBottomRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'br',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из правого верхнего угла до минимальных ширины и высоты и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async shrinkDiagonallyFromTopRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'tr',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из левого верхнего угла до минимальных ширины и высоты и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async shrinkDiagonallyFromTopLeftToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'tl',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из левого нижнего угла до минимальных ширины и высоты и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async shrinkDiagonallyFromBottomLeftToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'bl',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение по диагонали до минимальных ширины и высоты из выбранного угла. */
  async shrinkDiagonallyToMinimum({
    corner,
    minimumSize,
    shiftKey
  }: {
    corner: SelectionDiagonalControlKey
    minimumSize: number
    shiftKey?: boolean
  }): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner,
      minimumSize,
      shiftKey
    })
  }

  /** Начинает реальный скейлинг общего выделения или группы. */
  async startScaleFromControl(
    params: { control: SelectionControlKey }
  ): Promise<SnappingObjectSnapshot> {
    expect(this.activeScaleInteraction, 'перед скейлингом не должно быть другой активной сессии').toBeNull()

    const point = await this._resolveScaleControlPoint(params)

    await this.page.mouse.move(point.x, point.y)
    await this.page.mouse.down()
    await waitForCanvasRender({ page: this.page })

    const transform = await this.page.evaluate(({ control }) => {
      const { editor } = window as any
      const target = editor.canvas.getActiveObject()
      const activeTransform = editor.canvas._currentTransform

      return {
        childCount: target?.getObjects?.().length ?? 0,
        started: Boolean(target && activeTransform?.target === target),
        control: activeTransform?.corner ?? null,
        requestedControl: control
      }
    }, params)

    expect(transform.started, 'mousedown должен начать скейлинг активного объекта').toBe(true)
    expect(transform.control, 'Fabric transform должен использовать выбранную ручку').toBe(transform.requestedControl)
    expect(transform.childCount, 'общее выделение или группа должны содержать минимум два объекта')
      .toBeGreaterThanOrEqual(2)

    this.activeScaleInteraction = {
      point,
      mode: 'browser-pointer',
      control: params.control,
      shiftKey: false
    }

    return this.getSnapshot()
  }

  /** Завершает скейлинг тем же способом, которым он был начат. */
  async finishScale(): Promise<SnappingObjectSnapshot> {
    expect(this.activeScaleInteraction, 'для mouseup нужна активная scale-сессия').not.toBeNull()
    if (!this.activeScaleInteraction) {
      throw new Error('Активная scale-сессия составного объекта должна существовать')
    }

    const interaction = this.activeScaleInteraction
    let snapshot: SnappingObjectSnapshot

    if (interaction.mode === 'browser-pointer') {
      snapshot = await this._finishBrowserScaleInteraction(interaction)
    } else {
      snapshot = await this._finishFabricScaleInteraction(interaction)
    }

    this.activeScaleInteraction = null

    expect(snapshot.boundsWidth, 'ширина выделения после mouseup должна быть положительной').toBeGreaterThan(0)
    expect(snapshot.boundsHeight, 'высота выделения после mouseup должна быть положительной').toBeGreaterThan(0)

    return snapshot
  }

  /** Продолжает движение активной ручки составного объекта. */
  async dragActiveScaleHandleBy(
    params: DragActiveScaleHandleParams
  ): Promise<SnappingObjectSnapshot> {
    expect(this.activeScaleInteraction, 'для движения ручки нужна активная scale-сессия').not.toBeNull()
    if (!this.activeScaleInteraction) {
      throw new Error('Активная scale-сессия составного объекта должна существовать')
    }

    if (this.activeScaleInteraction.mode === 'browser-pointer') {
      return this._dragBrowserScaleHandleBy(params)
    }

    return this._dragFabricScaleHandleBy(params)
  }

  /** Выполняет полный скейлинг за правую нижнюю ручку. */
  async scaleFromBottomRightBy(params: DragActiveScaleHandleParams): Promise<SelectionScaleGestureResult> {
    const started = await this.startScaleFromControl({ control: 'br' })
    const live = await this.dragActiveScaleHandleBy(params)
    const committed = await this.finishScale()

    expect(live.boundsWidth, 'ширина во время скейлинга должна быть положительной').toBeGreaterThan(0)
    expect(committed.boundsWidth, 'ширина после mouseup должна быть положительной')
      .toBeGreaterThan(0)

    return { started, live, committed }
  }

  /** Двигает ручку составного объекта настоящим mousemove. */
  private async _dragBrowserScaleHandleBy(
    params: DragActiveScaleHandleParams
  ): Promise<SnappingObjectSnapshot> {
    const interaction = this.activeScaleInteraction
    expect(interaction?.mode, 'реальный mousemove должен продолжать ту же сессию').toBe('browser-pointer')
    if (!interaction || interaction.mode !== 'browser-pointer') {
      throw new Error('Должна существовать активная сессия скейлинга составного объекта')
    }

    const nextPoint = {
      x: interaction.point.x + params.deltaX,
      y: interaction.point.y + params.deltaY
    }

    await this.page.mouse.move(nextPoint.x, nextPoint.y, { steps: params.pointerSteps ?? 1 })
    await waitForCanvasRender({ page: this.page })
    interaction.point = nextPoint

    const snapshot = await this.getSnapshot()

    expect(snapshot.boundsWidth, 'ширина активного объекта во время движения должна быть положительной')
      .toBeGreaterThan(0)
    expect(snapshot.boundsHeight, 'высота активного объекта во время движения должна быть положительной')
      .toBeGreaterThan(0)

    return snapshot
  }

  /** Продолжает скейлинг прямым вызовом обработчика Fabric. */
  private async _dragFabricScaleHandleBy(
    params: DragActiveScaleHandleParams
  ): Promise<SnappingObjectSnapshot> {
    const interaction = this.activeScaleInteraction
    expect(interaction?.mode, 'Fabric mousemove должен продолжать сессию прямых вызовов').toBe('fabric-handler')
    if (!interaction || interaction.mode !== 'fabric-handler') {
      throw new Error('Должна существовать сессия скейлинга через обработчики Fabric')
    }

    const result = await this._moveFabricScaleHandle({
      ...interaction,
      ...params
    })

    expect(result, 'Fabric mousemove должен вернуть live-состояние общего выделения').not.toBeNull()
    if (!result) {
      throw new Error('Fabric mousemove должен вернуть live-состояние общего выделения')
    }

    await waitForCanvasRender({ page: this.page })

    interaction.point = result.point

    return result.snapshot
  }

  /** Выполняет один прямой Fabric mousemove и читает новое положение ручки. */
  private async _moveFabricScaleHandle(
    payload: SelectionScaleInteraction & DragActiveScaleHandleParams
  ): Promise<SelectionScaleStepResult | null> {
    return this.page.evaluate((interaction) => {
      const { point, control, deltaX, deltaY, shiftKey } = interaction
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      const movePoint = {
        x: point.x + deltaX,
        y: point.y + deltaY
      }

      editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: movePoint.x,
        clientY: movePoint.y,
        shiftKey
      }))

      const snapshotTarget = editor.canvas.getActiveObject() ?? target
      snapshotTarget.setCoords()

      const currentControl = snapshotTarget.oCoords?.[control]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const currentPoint = currentControl && Number.isFinite(currentControl.x) && Number.isFinite(currentControl.y)
        ? { x: rect.left + currentControl.x, y: rect.top + currentControl.y }
        : movePoint

      return {
        point: currentPoint,
        snapshot: helpers.serializeSnappingObjectSnapshot(snapshotTarget)
      }
    }, payload)
  }

  /** Завершает реальный скейлинг составного объекта настоящим mouseup. */
  private async _finishBrowserScaleInteraction(
    interaction: SelectionScaleInteraction
  ): Promise<SnappingObjectSnapshot> {
    expect(interaction.mode, 'mouseup должен завершать реальную сессию').toBe('browser-pointer')
    expect(Number.isFinite(interaction.point.x), 'координата X при mouseup должна быть конечной').toBe(true)

    await this.page.mouse.up()
    await waitForCanvasRender({ page: this.page })

    return this.getSnapshot()
  }

  /** Завершает скейлинг прямым вызовом обработчика Fabric. */
  private async _finishFabricScaleInteraction(
    interaction: SelectionScaleInteraction
  ): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate((payload) => {
      const { point, control, shiftKey } = payload
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      target.setCoords()

      const currentControl = target.oCoords?.[control]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const releasePoint = currentControl && Number.isFinite(currentControl.x) && Number.isFinite(currentControl.y)
        ? { x: rect.left + currentControl.x, y: rect.top + currentControl.y }
        : point

      editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: releasePoint.x,
        clientY: releasePoint.y,
        shiftKey
      }))

      const snapshotTarget = editor.canvas.getActiveObject() ?? target
      snapshotTarget.setCoords()

      return helpers.serializeSnappingObjectSnapshot(snapshotTarget)
    }, interaction)

    expect(snapshot, 'Fabric mouseup должен вернуть состояние общего выделения').not.toBeNull()
    expect(Number.isFinite(snapshot?.boundsWidth), 'ширина после Fabric mouseup должна быть конечной').toBe(true)

    await waitForCanvasRender({ page: this.page })

    return snapshot as SnappingObjectSnapshot
  }

  /** Возвращает экранные координаты ручки общего выделения или группы. */
  private async _resolveScaleControlPoint(
    params: { control: SelectionControlKey }
  ): Promise<{ x: number, y: number }> {
    const point = await this.page.evaluate(({ control }) => {
      const { editor } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      target.setCoords()
      editor.canvas.renderAll()

      const controlPoint = target.oCoords?.[control]
      if (!controlPoint || !Number.isFinite(controlPoint.x) || !Number.isFinite(controlPoint.y)) return null

      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: rect.left + controlPoint.x,
        y: rect.top + controlPoint.y
      }
    }, params)

    expect(point, 'координаты ручки активного объекта должны существовать').not.toBeNull()
    expect(Number.isFinite(point?.x), 'координата X ручки должна быть конечной').toBe(true)
    expect(Number.isFinite(point?.y), 'координата Y ручки должна быть конечной').toBe(true)

    if (!point) throw new Error('Координаты ручки активного объекта должны существовать')

    return point
  }

  /** Выполняет или продолжает скейлинг через прямой вызов обработчиков Fabric. */
  private async _scaleFromControl(
    params: ScaleSelectionFromControlParams
  ): Promise<SnappingObjectSnapshot> {
    const {
      activeScaleInteraction
    } = this
    const requestedShiftKey = Boolean(params.shiftKey)

    this._assertScaleInteractionCanContinue({
      activeScaleInteraction,
      startControl: params.startControl,
      requestedShiftKey
    })

    const result = await this.page.evaluate((payload) => {
      const {
        __editorHelpers: helpers
      } = window as any

      return helpers.scaleSelectionFromControl(payload)
    }, {
      ...params,
      continueInteraction: activeScaleInteraction !== null,
      shiftKey: requestedShiftKey
    })

    expect(result, 'должно существовать live-состояние общего выделения после масштабирования').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    const {
      point,
      shiftKey: interactionShiftKey,
      snapshot
    } = result as {
      point: {
        x: number
        y: number
      }
      shiftKey: boolean
      snapshot: SnappingObjectSnapshot
    }

    this.activeScaleInteraction = {
      point,
      mode: 'fabric-handler',
      control: params.startControl,
      shiftKey: interactionShiftKey
    }

    return snapshot
  }

  /** Сжимает составной объект до минимального размера из указанного угла. */
  private async _shrinkDiagonallyToMinimum(params: {
    corner: Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'>
    minimumSize: number
    shiftKey?: boolean
  }): Promise<SnappingObjectSnapshot> {
    const {
      corner,
      minimumSize,
      shiftKey
    } = params

    return this._scaleFromControl({
      startControl: corner,
      oppositeControl: this._resolveOppositeDiagonalControl(corner),
      minimumWidth: minimumSize,
      minimumHeight: minimumSize,
      shiftKey
    })
  }

  /** Возвращает ручку, противоположную указанному углу. */
  private _resolveOppositeDiagonalControl(
    corner: Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'>
  ): Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'> {
    if (corner === 'br') return 'tl'
    if (corner === 'tr') return 'bl'
    if (corner === 'tl') return 'br'

    return 'tr'
  }

  /** Проверяет, что следующий шаг совместим с уже начатым скейлингом. */
  private _assertScaleInteractionCanContinue(params: {
    activeScaleInteraction: SelectionScaleInteraction | null
    startControl: SelectionControlKey
    requestedShiftKey: boolean
  }): void {
    const {
      activeScaleInteraction,
      startControl,
      requestedShiftKey
    } = params

    if (!activeScaleInteraction) return

    expect(
      activeScaleInteraction.mode,
      'прямой тестовый API должен продолжать только сессию обработчиков Fabric'
    ).toBe('fabric-handler')
    expect(
      activeScaleInteraction.control,
      'нельзя продолжать активную drag-сессию общего выделения через другую ручку'
    ).toBe(startControl)
    expect(
      activeScaleInteraction.shiftKey,
      'нельзя продолжать активную drag-сессию общего выделения с другим состоянием Shift'
    ).toBe(requestedShiftKey)
  }
}
