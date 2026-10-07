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

/** Open drag of a text side handle. */
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

/** Handle coordinates in the browser window. */
type TextResizeControlPoint = {
  x: number
  y: number
}

/** Moving outer edge and its offset when changing canonical width. */
type TextResizeGuideGeometry = Readonly<{
  coefficient: number
  edge: 'boundsBottom' | 'boundsLeft' | 'boundsRight' | 'boundsTop'
}>

/** Nearest states on opposite sides of the line-wrap boundary. */
type TextWrapWidthRange = {
  unwrapped: TextResizeSnapshot
  wrapped: TextResizeSnapshot
}

/** Manages standalone-text width changes through real mouse events. */
export default class TextResizeSession {
  /**
   * Playwright page with the demo editor open.
   */
  private readonly page: Page

  /** Current unfinished side-handle drag. */
  private activeInteraction: ActiveTextResizeInteraction | null = null

  /** Creates a text-width-change model. */
  constructor(page: Page) {
    this.page = page
  }

  /** Returns the current text state during width changes. */
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

  /** Changes text width from the right to the specified value. */
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

  /** Changes text width from the left to the specified value. */
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
   * Brings the text's right boundary to the specified vertical guide.
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
   * Brings the text's left boundary to the specified vertical guide.
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

  /** Brings the selected side handle's outer edge to a guide. */
  async resizeSideToGuide(params: TextResizeToGuideParams): Promise<TextResizeSnapshot> {
    return this._resizeToGuide(params)
  }

  /**
   * Narrows the text object from the right to the first state where text wraps onto a new line.
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
   * Narrows the text object from the left to the first state where text wraps onto a new line.
   */
  async resizeFromLeftUntilTextWraps(
    params: TextResizeUntilWrapParams = {}
  ): Promise<TextResizeSnapshot> {
    return this._resizeUntilTextWraps({
      edge: 'left',
      ...params
    })
  }

  /** Finishes the handle drag or sends a final event for an already modified object. */
  async finishResize(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    if (this.activeInteraction && this._matchesActiveTarget(params)) {
      return this._finishActiveResize()
    }

    return this._finishModifiedTransform(params)
  }

  /** Closes the current drag with a real mouse-button release. */
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

  /** Finishes the width change if the side handle is still captured. */
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

  /** Continues the side-handle drag with relative pointer movement. */
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

  /** Performs one width change through a real Fabric-handle drag. */
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

  /** Calculates the handle position for the specified width without modifying the object. */
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

  /** Moves the pointer to the calculated point and confirms that the selected text exists. */
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

  /** Narrows text to the first state where the line count increases. */
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

  /** Finds adjacent widths before and after a new line appears. */
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

  /** Narrows the line-wrap boundary interval through successive bisection. */
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

  /** Changes width through the selected side handle. */
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

  /** Brings the text's selected outer edge to a guide along the specified axis. */
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

  /** Reads the matrix from Fabric and determines the selected handle's outer edge. */
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

  /** Finishes a width change without a captured handle through a final Fabric event. */
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

  /** Captures the text's side handle with a real mouse-button press. */
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

  /** Checks that pressing the handle did not change the text before pointer movement. */
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

  /** Starts a Fabric width change by pressing the required handle. */
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

  /** Returns the selected side handle's position in the browser window. */
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

  /** Checks that Fabric started changing the required text's width with the selected handle. */
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

  /** Checks that the same side-handle drag is continuing. */
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

  /** Checks whether the current drag belongs to the same text. */
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
