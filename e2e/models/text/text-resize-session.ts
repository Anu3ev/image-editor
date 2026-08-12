/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ObjectTargetParams,
  TextResizeContinueParams,
  TextResizeFromLeftParams,
  TextResizeFromRightParams,
  TextResizeGuideAxis,
  TextResizeSnapshot,
  TextResizeSide,
  TextResizeStepParams,
  TextResizeToGuideParams,
  TextResizeUntilWrapParams
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'

/** Открытое перетаскивание боковой ручки текста. */
type ActiveTextResizeInteraction = {
  point: {
    x: number
    y: number
  }
  corner: 'ml' | 'mr'
  centered: boolean
  originX: 'left' | 'right'
  originY: 'top' | 'center' | 'bottom'
  objectIndex?: number
  id?: string
}

/** Координаты ручки в окне браузера. */
type TextResizeControlPoint = {
  x: number
  y: number
}

/** Движущаяся внешняя грань и её смещение при изменении канонической ширины. */
type TextResizeGuideGeometry = Readonly<{
  coefficient: number
  edge: 'boundsBottom' | 'boundsLeft' | 'boundsRight' | 'boundsTop'
}>

/** Ближайшие состояния по разные стороны от границы переноса строк. */
type TextWrapWidthRange = {
  unwrapped: TextResizeSnapshot
  wrapped: TextResizeSnapshot
}

/** Управляет изменением ширины отдельного текста через настоящие события мыши. */
export default class TextResizeSession {
  /**
   * Playwright page с открытым demo-редактором.
   */
  private readonly page: Page

  /** Текущее незавершённое перетаскивание боковой ручки. */
  private activeInteraction: ActiveTextResizeInteraction | null = null

  /** Создаёт модель изменения ширины текста. */
  constructor(page: Page) {
    this.page = page
  }

  /** Возвращает текущее состояние текста при изменении ширины. */
  async getResizeSnapshot(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeTextResizeSnapshot(target)
    }, params)

    expect(snapshot, 'должно существовать состояние текстового объекта').not.toBeNull()
    if (!snapshot) throw new Error('состояние текстового объекта должно существовать')

    return snapshot
  }

  /** Изменяет ширину текста справа до заданного значения. */
  async resizeFromRightToWidth(params: TextResizeFromRightParams): Promise<TextResizeSnapshot> {
    const {
      width,
      centered,
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveResizeStep({
      width,
      corner: 'mr',
      originX: 'left',
      originY: 'center',
      centered,
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Изменяет ширину текста слева до заданного значения. */
  async resizeFromLeftToWidth(params: TextResizeFromLeftParams): Promise<TextResizeSnapshot> {
    const {
      width,
      centered,
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveResizeStep({
      width,
      corner: 'ml',
      originX: 'right',
      originY: 'center',
      centered,
      ctrlKey,
      objectIndex,
      id
    })
  }

  /**
   * Подводит правую границу текста к заданной вертикальной направляющей.
   */
  async resizeFromRightToGuide(
    params: {
      centered?: boolean
      x: number
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    return this.resizeSideToGuide({
      axis: 'x',
      position: params.x,
      side: 'right',
      centered: params.centered,
      objectIndex: params.objectIndex,
      id: params.id
    })
  }

  /**
   * Подводит левую границу текста к заданной вертикальной направляющей.
   */
  async resizeFromLeftToGuide(
    params: {
      centered?: boolean
      x: number
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    return this.resizeSideToGuide({
      axis: 'x',
      position: params.x,
      side: 'left',
      centered: params.centered,
      objectIndex: params.objectIndex,
      id: params.id
    })
  }

  /** Подводит внешнюю грань выбранной боковой ручки к направляющей. */
  async resizeSideToGuide(params: TextResizeToGuideParams): Promise<TextResizeSnapshot> {
    return this._resizeToGuide(params)
  }

  /**
   * Сужает текстовый объект справа до первого состояния, где текст переносится на новую строку.
   */
  async resizeFromRightUntilTextWraps(
    params: TextResizeUntilWrapParams = {}
  ): Promise<TextResizeSnapshot> {
    return this._resizeUntilTextWraps({
      edge: 'right',
      ...params
    })
  }

  /**
   * Сужает текстовый объект слева до первого состояния, где текст переносится на новую строку.
   */
  async resizeFromLeftUntilTextWraps(
    params: TextResizeUntilWrapParams = {}
  ): Promise<TextResizeSnapshot> {
    return this._resizeUntilTextWraps({
      edge: 'left',
      ...params
    })
  }

  /** Завершает перетаскивание ручки или отправляет итоговое событие для уже изменённого объекта. */
  async finishResize(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    if (this.activeInteraction && this._matchesActiveTarget(params)) {
      return this._finishActiveResize()
    }

    return this._finishModifiedTransform(params)
  }

  /** Закрывает текущее перетаскивание настоящим отпусканием кнопки мыши. */
  private async _finishActiveResize(): Promise<TextResizeSnapshot> {
    const interaction = this.activeInteraction
    expect(interaction, 'боковая ручка текста должна быть захвачена').not.toBeNull()
    if (!interaction) {
      throw new Error('перед отпусканием кнопки мыши боковая ручка текста должна быть захвачена')
    }

    try {
      await this.page.mouse.up()
    } finally {
      if (interaction.centered) await this.page.keyboard.up('Alt')
    }
    await waitForCanvasRender({ page: this.page })
    this.activeInteraction = null

    return this.getResizeSnapshot({
      objectIndex: interaction.objectIndex,
      id: interaction.id
    })
  }

  /** Завершает изменение ширины, если боковая ручка ещё захвачена. */
  async finishResizeIfActive(): Promise<TextResizeSnapshot | null> {
    if (!this.activeInteraction) return null

    const {
      objectIndex,
      id
    } = this.activeInteraction

    return this.finishResize({
      objectIndex,
      id
    })
  }

  /** Продолжает перетаскивание боковой ручки относительным движением указателя. */
  async continueResizeHandleBy(params: TextResizeContinueParams): Promise<TextResizeSnapshot> {
    const interaction = this.activeInteraction
    expect(interaction, 'боковая ручка текста должна быть захвачена').not.toBeNull()
    if (!interaction) {
      throw new Error('перед следующим движением боковая ручка текста должна быть захвачена')
    }

    const requestedPoint = {
      x: interaction.point.x + params.deltaX,
      y: interaction.point.y + params.deltaY
    }
    const movedPoint = await this._moveResizePointer({
      point: requestedPoint,
      ctrlKey: params.ctrlKey,
      pointerSteps: params.pointerSteps,
      objectIndex: interaction.objectIndex,
      id: interaction.id
    })
    expect(movedPoint, 'следующее движение ручки должно вернуть положение указателя').not.toBeNull()
    if (!movedPoint) throw new Error('после движения ручки должно существовать положение указателя')

    this.activeInteraction = {
      ...interaction,
      point: movedPoint
    }
    await waitForCanvasRender({ page: this.page })

    return this.getResizeSnapshot({
      objectIndex: interaction.objectIndex,
      id: interaction.id
    })
  }

  /** Выполняет одно изменение ширины через настоящее перетаскивание ручки Fabric. */
  private async _performInteractiveResizeStep(params: TextResizeStepParams): Promise<TextResizeSnapshot> {
    await this._startResizeInteractionIfNeeded(params)

    const requestedPoint = await this._resolveResizeControlPoint(params)
    const movedPoint = await this._moveResizePointer({
      point: requestedPoint,
      ctrlKey: params.ctrlKey,
      objectIndex: params.objectIndex,
      id: params.id
    })

    expect(movedPoint, 'после движения ручки должно существовать положение указателя').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    if (!movedPoint) {
      throw new Error('изменение ширины текста должно вернуть положение указателя')
    }

    this.activeInteraction = {
      point: movedPoint,
      centered: Boolean(params.centered),
      corner: params.corner,
      originX: params.originX,
      originY: params.originY,
      objectIndex: params.objectIndex,
      id: params.id
    }

    return this.getResizeSnapshot({
      objectIndex: params.objectIndex,
      id: params.id
    })
  }

  /** Рассчитывает положение ручки для заданной ширины без изменения объекта. */
  private async _resolveResizeControlPoint(params: TextResizeStepParams): Promise<TextResizeControlPoint> {
    const point = await this.page.evaluate((payload) => {
      const {
        width,
        corner,
        objectIndex,
        id
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) return null

      target.setCoords()
      const activeCorner = transform.corner || corner
      const control = target.oCoords?.[activeCorner]
      const currentWidth = target.width
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const canvasWidth = editor.canvas.getWidth()
      const canvasHeight = editor.canvas.getHeight()
      if (!control || !Number.isFinite(currentWidth)) return null
      if (Math.abs(rect.width - canvasWidth) > 0.01 || Math.abs(rect.height - canvasHeight) > 0.01) return null

      const centered = (transform.originX === 'center' || transform.originX === 0.5)
        && (transform.originY === 'center' || transform.originY === 0.5)
      const direction = activeCorner === 'mr' ? 1 : -1
      const widthFactor = centered ? 0.5 : 1
      const [objectX, objectY] = target.calcTransformMatrix()
      const canonicalDelta = direction * (Math.max(1, width) - currentWidth) * widthFactor
      const sceneDeltaX = objectX * canonicalDelta
      const sceneDeltaY = objectY * canonicalDelta
      const [a, b, c, d] = editor.canvas.viewportTransform

      return {
        x: rect.left + control.x + (a * sceneDeltaX) + (c * sceneDeltaY),
        y: rect.top + control.y + (b * sceneDeltaX) + (d * sceneDeltaY)
      }
    }, params)

    expect(point, 'должно существовать положение боковой ручки для заданной ширины').not.toBeNull()
    if (!point) {
      throw new Error('не удалось рассчитать положение боковой ручки для заданной ширины')
    }

    return point
  }

  /** Двигает указатель в рассчитанную точку и подтверждает, что выбранный текст существует. */
  private async _moveResizePointer(
    params: {
      point: TextResizeControlPoint
      ctrlKey?: boolean
      pointerSteps?: number
    } & ObjectTargetParams
  ): Promise<TextResizeControlPoint | null> {
    const { point, ctrlKey = false, pointerSteps = 1 } = params

    if (ctrlKey) await this.page.keyboard.down('Control')

    try {
      await this.page.mouse.move(point.x, point.y, { steps: pointerSteps })
    } finally {
      if (ctrlKey) await this.page.keyboard.up('Control')
    }

    return this.page.evaluate((payload) => {
      const {
        point: movedPoint,
        objectIndex,
        id
      } = payload
      const {
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.setCoords()

      return movedPoint
    }, params)
  }

  /** Сужает текст до первого состояния, в котором увеличилось число строк. */
  private async _resizeUntilTextWraps(
    params: {
      edge: 'left' | 'right'
    } & TextResizeUntilWrapParams
  ): Promise<TextResizeSnapshot> {
    const {
      edge,
      ctrlKey = true,
      objectIndex,
      id
    } = params
    const initialSnapshot = await this.getResizeSnapshot({
      objectIndex,
      id
    })
    const range = await this._findTextWrapWidthRange({
      edge,
      ctrlKey,
      initialSnapshot,
      objectIndex,
      id
    })

    expect(range, 'при сужении должна существовать граница переноса строки').not.toBeNull()
    if (!range) throw new Error('не удалось найти границу переноса строки')

    return this._refineTextWrapWidthRange({ edge, ctrlKey, range, objectIndex, id })
  }

  /** Находит соседние ширины до и после появления новой строки. */
  private async _findTextWrapWidthRange({
    edge,
    ctrlKey,
    initialSnapshot,
    objectIndex,
    id
  }: {
    edge: 'left' | 'right'
    ctrlKey: boolean
    initialSnapshot: TextResizeSnapshot
  } & ObjectTargetParams): Promise<TextWrapWidthRange | null> {
    let unwrapped = initialSnapshot

    for (let attempt = 1; attempt <= 40; attempt += 1) {
      const width = Math.max(40, Math.floor(initialSnapshot.width - (12 * attempt)))
      if (width >= unwrapped.width) return null

      const snapshot = await this._resizeFromSideToWidth({ edge, width, ctrlKey, objectIndex, id })
      if (snapshot.lineCount > initialSnapshot.lineCount) return { unwrapped, wrapped: snapshot }

      unwrapped = snapshot
    }

    return null
  }

  /** Сужает интервал границы переноса строк последовательным делением пополам. */
  private async _refineTextWrapWidthRange({
    edge,
    ctrlKey,
    range,
    objectIndex,
    id
  }: {
    edge: 'left' | 'right'
    ctrlKey: boolean
    range: TextWrapWidthRange
  } & ObjectTargetParams): Promise<TextResizeSnapshot> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const width = (range.wrapped.width + range.unwrapped.width) / 2
      const snapshot = await this._resizeFromSideToWidth({ edge, width, ctrlKey, objectIndex, id })

      if (snapshot.lineCount > range.unwrapped.lineCount) {
        range.wrapped = snapshot
      } else {
        range.unwrapped = snapshot
      }
    }

    return this._resizeFromSideToWidth({
      edge,
      width: range.wrapped.width,
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Изменяет ширину через выбранную боковую ручку. */
  private _resizeFromSideToWidth({
    edge,
    width,
    ctrlKey,
    objectIndex,
    id
  }: {
    edge: 'left' | 'right'
    width: number
    ctrlKey: boolean
  } & ObjectTargetParams): Promise<TextResizeSnapshot> {
    if (edge === 'right') {
      return this.resizeFromRightToWidth({ width, ctrlKey, objectIndex, id })
    }

    return this.resizeFromLeftToWidth({ width, ctrlKey, objectIndex, id })
  }

  /** Подводит выбранную внешнюю грань текста к направляющей по заданной оси. */
  private async _resizeToGuide(params: TextResizeToGuideParams): Promise<TextResizeSnapshot> {
    const {
      position,
      side,
      objectIndex,
      id
    } = params
    const snapProbeDistance = 3
    const geometry = await this._resolveResizeGuideGeometry(params)
    const currentSnapshot = await this.getResizeSnapshot({
      objectIndex,
      id
    })
    const pointerEdgePosition = position - (Math.sign(geometry.coefficient) * snapProbeDistance)
    const nextWidth = currentSnapshot.width
      + ((pointerEdgePosition - currentSnapshot[geometry.edge]) / geometry.coefficient)

    return side === 'right'
      ? this.resizeFromRightToWidth({
        width: Math.max(1, nextWidth),
        centered: params.centered,
        objectIndex,
        id
      })
      : this.resizeFromLeftToWidth({
        width: Math.max(1, nextWidth),
        centered: params.centered,
        objectIndex,
        id
      })
  }

  /** Читает из Fabric матрицу и определяет внешнюю грань выбранной ручки. */
  private async _resolveResizeGuideGeometry(
    params: {
      axis: TextResizeGuideAxis
      centered?: boolean
      side: TextResizeSide
    } & ObjectTargetParams
  ): Promise<TextResizeGuideGeometry> {
    const geometry = await this.page.evaluate(({ axis, centered, side, objectIndex, id }) => {
      const { __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const matrix = target.calcTransformMatrix()
      const direction = side === 'right' ? 1 : -1
      const centeredMultiplier = centered ? 0.5 : 1
      const coefficient = matrix[axis === 'x' ? 0 : 1] * direction * centeredMultiplier
      if (!Number.isFinite(coefficient) || Math.abs(coefficient) <= 0.000000001) return null

      let edge: TextResizeGuideGeometry['edge']
      if (axis === 'x') {
        edge = coefficient > 0 ? 'boundsRight' : 'boundsLeft'
      } else {
        edge = coefficient > 0 ? 'boundsBottom' : 'boundsTop'
      }

      return { coefficient, edge }
    }, params)

    expect(geometry, 'должна существовать проекция боковой ручки на выбранную ось').not.toBeNull()
    if (!geometry) throw new Error('боковая ручка текста должна двигать грань по выбранной оси')

    return geometry
  }

  /** Завершает изменение ширины без захваченной ручки через итоговое событие Fabric. */
  private async _finishModifiedTransform(params: ObjectTargetParams): Promise<TextResizeSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.fire('object:modified', {
        target
      })

      return helpers.serializeTextResizeSnapshot(target)
    }, params)

    expect(snapshot, 'должно существовать состояние после завершения изменения ширины').not.toBeNull()
    if (!snapshot) throw new Error('после завершения изменения ширины должно существовать состояние текста')

    return snapshot
  }

  /** Захватывает боковую ручку текста настоящим нажатием кнопки мыши. */
  private async _startResizeInteractionIfNeeded(params: TextResizeStepParams): Promise<void> {
    if (this.activeInteraction) {
      this._expectActiveInteractionMatches(params)
      return
    }

    const beforeMouseDown = await this.getResizeSnapshot(params)
    const point = await this._openResizeInteraction(params)
    const afterMouseDown = await this.getResizeSnapshot(params)
    this._expectMouseDownPreservedGeometry({ beforeMouseDown, afterMouseDown })

    await waitForCanvasRender({ page: this.page })

    this.activeInteraction = {
      point,
      centered: Boolean(params.centered),
      corner: params.corner,
      originX: params.originX,
      originY: params.originY,
      objectIndex: params.objectIndex,
      id: params.id
    }
  }

  /** Проверяет, что нажатие на ручку не изменило текст до движения указателя. */
  private _expectMouseDownPreservedGeometry({
    beforeMouseDown,
    afterMouseDown
  }: {
    beforeMouseDown: TextResizeSnapshot
    afterMouseDown: TextResizeSnapshot
  }): void {
    expect(afterMouseDown.width).toBe(beforeMouseDown.width)
    expect(afterMouseDown.height).toBe(beforeMouseDown.height)
    expect(afterMouseDown.lineCount).toBe(beforeMouseDown.lineCount)
    expect([
      afterMouseDown.boundsLeft,
      afterMouseDown.boundsTop,
      afterMouseDown.boundsRight,
      afterMouseDown.boundsBottom
    ]).toEqual([
      beforeMouseDown.boundsLeft,
      beforeMouseDown.boundsTop,
      beforeMouseDown.boundsRight,
      beforeMouseDown.boundsBottom
    ])
  }

  /** Начинает изменение ширины Fabric нажатием на нужную ручку. */
  private async _openResizeInteraction(params: TextResizeStepParams): Promise<TextResizeControlPoint> {
    const point = await this._resolveInitialResizeControlPoint(params)

    if (params.centered) await this.page.keyboard.down('Alt')

    try {
      await this.page.mouse.move(point.x, point.y)
      await this.page.mouse.down()
      await this._assertResizeInteractionStarted(params)
    } catch (error) {
      if (params.centered) await this.page.keyboard.up('Alt')
      throw error
    }

    return point
  }

  /** Возвращает положение выбранной боковой ручки в окне браузера. */
  private async _resolveInitialResizeControlPoint(
    params: TextResizeStepParams
  ): Promise<TextResizeControlPoint> {
    const point = await this.page.evaluate((payload) => {
      const {
        corner: controlCorner,
        objectIndex: targetObjectIndex,
        id: targetId
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(targetObjectIndex, targetId)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.setCoords()
      editor.canvas.renderAll()

      const control = target.oCoords?.[controlCorner]
      if (!control || typeof control.x !== 'number' || typeof control.y !== 'number') {
        return null
      }

      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const pointInfo = {
        x: rect.left + control.x,
        y: rect.top + control.y
      }

      return pointInfo
    }, params)

    expect(point, 'должно существовать начальное положение боковой ручки текста').not.toBeNull()
    if (!point) {
      throw new Error('не удалось определить начальное положение боковой ручки текста')
    }

    return point
  }

  /** Проверяет, что Fabric начал изменять ширину нужного текста выбранной ручкой. */
  private async _assertResizeInteractionStarted(params: TextResizeStepParams): Promise<void> {
    const state = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      const transform = editor.canvas._currentTransform

      return {
        hasTarget: Boolean(target),
        matchesTarget: Boolean(target) && transform?.target === target,
        corner: transform?.corner ?? null
      }
    }, params)

    expect(state.hasTarget, 'для начала изменения ширины должен существовать текст').toBe(true)
    expect(state.matchesTarget, 'Fabric должен начать изменять ширину выбранного текста').toBe(true)
    expect(state.corner, 'Fabric должен захватить выбранную боковую ручку').toBe(params.corner)
  }

  /** Проверяет, что продолжается то же перетаскивание боковой ручки. */
  private _expectActiveInteractionMatches(params: TextResizeStepParams): void {
    const interaction = this.activeInteraction
    expect(interaction, 'боковая ручка текста должна быть захвачена').not.toBeNull()
    if (!interaction) {
      throw new Error('перед следующим движением боковая ручка текста должна быть захвачена')
    }

    expect(
      this._matchesActiveTarget(params),
      'нельзя изменять ширину другого текста, пока не завершено текущее перетаскивание'
    ).toBe(true)
    expect(
      interaction.corner,
      'нельзя продолжать изменение ширины другой ручкой'
    ).toBe(params.corner)
    expect(
      interaction.originX,
      'нельзя продолжать изменение ширины с другой горизонтальной опорой'
    ).toBe(params.originX)
    expect(
      interaction.originY,
      'нельзя продолжать изменение ширины с другой вертикальной опорой'
    ).toBe(params.originY)
    expect(
      interaction.centered,
      'нельзя менять режим относительно центра во время перетаскивания ручки'
    ).toBe(Boolean(params.centered))
  }

  /** Проверяет, относится ли текущее перетаскивание к тому же тексту. */
  private _matchesActiveTarget(params: ObjectTargetParams): boolean {
    if (!this.activeInteraction) return false

    const {
      objectIndex,
      id
    } = params

    if (typeof id === 'string') {
      return this.activeInteraction.id === id
    }

    if (typeof objectIndex === 'number') {
      return this.activeInteraction.objectIndex === objectIndex
    }

    return true
  }
}
