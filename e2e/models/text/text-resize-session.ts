/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ObjectTargetParams,
  TextResizeFromLeftParams,
  TextResizeFromRightParams,
  TextResizeSnapshot,
  TextResizeStepParams,
  TextResizeUntilWrapParams
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'

/**
 * Открытая drag-сессия resize текстового объекта.
 */
type ActiveTextResizeInteraction = {
  point: {
    x: number
    y: number
  }
  corner: 'ml' | 'mr'
  originX: 'left' | 'right'
  originY: 'top' | 'center' | 'bottom'
  objectIndex?: number
  id?: string
}

/**
 * Viewport-координаты Fabric control для реального mouse-события.
 */
type TextResizeControlPoint = {
  x: number
  y: number
}

/**
 * Результат live-шагa resize после перемещения control.
 */
type TextResizeMoveResult = {
  point: TextResizeControlPoint
  snapshot: TextResizeSnapshot
}

/**
 * Управляет live-resize действиями standalone text-объекта в e2e.
 */
export default class TextResizeSession {
  /**
   * Playwright page с открытым demo-редактором.
   */
  private readonly page: Page

  /**
   * Текущая незавершённая drag-сессия resize.
   */
  private activeInteraction: ActiveTextResizeInteraction | null = null

  /**
   * Создаёт session для resize-сценариев текста.
   */
  constructor(page: Page) {
    this.page = page
  }

  /**
   * Возвращает текущее состояние resize текстового объекта.
   */
  async getResizeSnapshot(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeTextResizeSnapshot(target)
    }, params)

    expect(snapshot, 'должно существовать состояние resize текстового объекта').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }

  /**
   * Выполняет live horizontal resize текстового объекта справа до заданной внутренней ширины.
   */
  async resizeFromRightToWidth(params: TextResizeFromRightParams): Promise<TextResizeSnapshot> {
    const {
      width,
      originY = 'top',
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveResizeStep({
      width,
      corner: 'mr',
      originX: 'left',
      originY,
      ctrlKey,
      objectIndex,
      id
    })
  }

  /**
   * Выполняет live horizontal resize текстового объекта слева до заданной внутренней ширины.
   */
  async resizeFromLeftToWidth(params: TextResizeFromLeftParams): Promise<TextResizeSnapshot> {
    const {
      width,
      originY = 'top',
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveResizeStep({
      width,
      corner: 'ml',
      originX: 'right',
      originY,
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
      x: number
      originY?: 'top' | 'center' | 'bottom'
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    return this._resizeToGuide({
      edge: 'right',
      ...params
    })
  }

  /**
   * Подводит левую границу текста к заданной вертикальной направляющей.
   */
  async resizeFromLeftToGuide(
    params: {
      x: number
      originY?: 'top' | 'center' | 'bottom'
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    return this._resizeToGuide({
      edge: 'left',
      ...params
    })
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

  /**
   * Завершает активный resize через реальный mouseup, а без active drag-сессии завершает его через object:modified.
   */
  async finishResize(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    if (this.activeInteraction && this._matchesActiveTarget(params)) {
      return this._finishActiveResize()
    }

    return this._finishModifiedTransform(params)
  }

  /**
   * Закрывает текущую открытую resize-сессию через настоящий mouseup.
   */
  private async _finishActiveResize(): Promise<TextResizeSnapshot> {
    const interaction = this.activeInteraction
    expect(interaction, 'должна существовать активная resize-сессия текста').not.toBeNull()
    if (!interaction) {
      throw new Error('активная resize-сессия текста должна существовать перед mouseup')
    }

    const snapshot = await this.page.evaluate((payload) => {
      const {
        point,
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

      target.setCoords()

      const control = target.oCoords?.[corner]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const releasePoint = control && typeof control.x === 'number' && typeof control.y === 'number'
        ? {
          x: rect.left + control.x,
          y: rect.top + control.y
        }
        : point

      editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: releasePoint.x,
        clientY: releasePoint.y
      }))

      return helpers.serializeTextResizeSnapshot(target)
    }, interaction)

    await waitForCanvasRender({ page: this.page })
    this.activeInteraction = null

    expect(snapshot, 'должно существовать состояние после завершения resize текстового объекта').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }

  /**
   * Завершает активный интерактивный resize, если drag-сессия ещё открыта.
   */
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

  /**
   * Выполняет один live-шаг horizontal resize текста через настоящую drag-сессию Fabric.
   */
  private async _performInteractiveResizeStep(params: TextResizeStepParams): Promise<TextResizeSnapshot> {
    await this._startResizeInteractionIfNeeded(params)

    const point = await this._resolveResizeControlPoint(params)
    const result = await this._moveResizePointer({
      point,
      ctrlKey: params.ctrlKey,
      objectIndex: params.objectIndex,
      id: params.id
    })

    expect(result, 'должно существовать состояние live resize текстового объекта').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    if (!result) {
      throw new Error('live resize текста должен вернуть новое состояние')
    }

    this.activeInteraction = {
      point: result.point,
      corner: params.corner,
      originX: params.originX,
      originY: params.originY,
      objectIndex: params.objectIndex,
      id: params.id
    }

    return result.snapshot
  }

  /**
   * Рассчитывает viewport-точку control, которая соответствует нужной ширине текста.
   */
  private async _resolveResizeControlPoint(params: TextResizeStepParams): Promise<TextResizeControlPoint> {
    const point = await this.page.evaluate((payload) => {
      const {
        width,
        corner,
        originX,
        originY,
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

      const activeCorner = typeof transform.corner === 'string' && transform.corner
        ? transform.corner
        : corner
      const activeOriginX = typeof transform.originX === 'string'
        ? transform.originX
        : originX
      const activeOriginY = typeof transform.originY === 'string'
        ? transform.originY
        : originY
      const paddingLeft = typeof target.paddingLeft === 'number' ? target.paddingLeft : 0
      const paddingRight = typeof target.paddingRight === 'number' ? target.paddingRight : 0
      const anchorPoint = target.getPointByOrigin(activeOriginX, activeOriginY)
      const visualWidth = Math.max(1, width + paddingLeft + paddingRight)
      const previousState = {
        width: typeof target.width === 'number' ? target.width : visualWidth,
        left: typeof target.left === 'number' ? target.left : 0,
        top: typeof target.top === 'number' ? target.top : 0
      }

      target.set({ width: visualWidth })
      target.setPositionByOrigin(
        anchorPoint,
        activeOriginX,
        activeOriginY
      )
      target.setCoords()

      const control = target.oCoords?.[activeCorner]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      target.set(previousState)
      target.setCoords()

      if (!control || typeof control.x !== 'number' || typeof control.y !== 'number') return null

      return {
        x: rect.left + control.x,
        y: rect.top + control.y
      }
    }, params)

    expect(point, 'должна существовать точка resize-ручки текста для заданной ширины').not.toBeNull()
    if (!point) {
      throw new Error('точка resize-ручки текста должна существовать для заданной ширины')
    }

    return point
  }

  /**
   * Двигает указатель в рассчитанную точку resize и возвращает live-состояние текста.
   */
  private async _moveResizePointer(
    params: {
      point: TextResizeControlPoint
      ctrlKey?: boolean
    } & ObjectTargetParams
  ): Promise<TextResizeMoveResult | null> {
    return this.page.evaluate((payload) => {
      const {
        point,
        ctrlKey = false,
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

      editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: point.x,
        clientY: point.y,
        ctrlKey
      }))
      editor.canvas.fire('object:resizing', {
        target,
        e: { ctrlKey },
        transform
      })

      target.setCoords()

      return {
        point,
        snapshot: helpers.serializeTextResizeSnapshot(target)
      }
    }, params)
  }

  /**
   * Сужает текстовый объект до первого live-состояния, где число строк увеличилось.
   */
  private async _resizeUntilTextWraps(
    params: {
      edge: 'left' | 'right'
    } & TextResizeUntilWrapParams
  ): Promise<TextResizeSnapshot> {
    const {
      edge,
      originY = 'top',
      ctrlKey,
      objectIndex,
      id
    } = params
    const minimumWidth = 40
    const widthStep = 12
    const initialSnapshot = await this.getResizeSnapshot({
      objectIndex,
      id
    })
    let currentSnapshot = initialSnapshot

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const nextWidth = Math.max(
        minimumWidth,
        Math.floor(currentSnapshot.width - widthStep)
      )

      if (nextWidth >= currentSnapshot.width) {
        break
      }

      currentSnapshot = edge === 'right'
        ? await this.resizeFromRightToWidth({
          width: nextWidth,
          originY,
          ctrlKey,
          objectIndex,
          id
        })
        : await this.resizeFromLeftToWidth({
          width: nextWidth,
          originY,
          ctrlKey,
          objectIndex,
          id
        })

      if (currentSnapshot.lineCount > initialSnapshot.lineCount) {
        return currentSnapshot
      }
    }

    expect(
      currentSnapshot.lineCount,
      'текст должен перейти на новую строку после сужения'
    ).toBeGreaterThan(initialSnapshot.lineCount)

    return currentSnapshot
  }

  /**
   * Подводит выбранную границу текста к вертикальной направляющей.
   */
  private async _resizeToGuide(
    params: {
      edge: 'left' | 'right'
      x: number
      originY?: 'top' | 'center' | 'bottom'
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    const {
      edge,
      x,
      originY = 'top',
      objectIndex,
      id
    } = params
    const guideTolerance = 1.5
    let currentSnapshot = await this.getResizeSnapshot({
      objectIndex,
      id
    })
    let nextWidth = edge === 'right'
      ? x - currentSnapshot.boundsLeft - currentSnapshot.paddingLeft - currentSnapshot.paddingRight
      : currentSnapshot.boundsRight - x - currentSnapshot.paddingLeft - currentSnapshot.paddingRight

    for (let attempt = 0; attempt < 6; attempt += 1) {
      currentSnapshot = edge === 'right'
        ? await this.resizeFromRightToWidth({
          width: Math.max(1, nextWidth),
          originY,
          objectIndex,
          id
        })
        : await this.resizeFromLeftToWidth({
          width: Math.max(1, nextWidth),
          originY,
          objectIndex,
          id
        })

      const guideDelta = edge === 'right'
        ? x - currentSnapshot.boundsRight
        : currentSnapshot.boundsLeft - x

      if (Math.abs(guideDelta) <= guideTolerance) {
        return currentSnapshot
      }

      nextWidth += guideDelta
    }

    return currentSnapshot
  }

  /**
   * Завершает resize без открытой drag-сессии через object:modified.
   */
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

    expect(snapshot, 'должно существовать состояние после завершения resize текстового объекта').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }

  /**
   * Открывает интерактивную drag-сессию resize для текстового объекта через реальный mousedown по ручке.
   */
  private async _startResizeInteractionIfNeeded(params: TextResizeStepParams): Promise<void> {
    if (this.activeInteraction) {
      this._expectActiveInteractionMatches(params)
      return
    }

    const point = await this._openResizeInteraction(params)

    await waitForCanvasRender({ page: this.page })

    this.activeInteraction = {
      point,
      corner: params.corner,
      originX: params.originX,
      originY: params.originY,
      objectIndex: params.objectIndex,
      id: params.id
    }
  }

  /**
   * Начинает Fabric resize-сессию через mousedown по нужной ручке.
   */
  private async _openResizeInteraction(params: TextResizeStepParams): Promise<TextResizeControlPoint> {
    const {
      corner,
      originX,
      originY,
      objectIndex,
      id
    } = params
    const point = await this.page.evaluate((payload) => {
      const {
        corner: controlCorner,
        originX: resizeOriginX,
        originY: resizeOriginY,
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

      editor.canvas.__onMouseDown(new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: pointInfo.x,
        clientY: pointInfo.y
      }))

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) {
        return null
      }

      transform.originX = resizeOriginX
      transform.originY = resizeOriginY

      if (transform.original) {
        transform.original.originX = resizeOriginX
        transform.original.originY = resizeOriginY
      }

      return pointInfo
    }, {
      corner,
      originX,
      originY,
      objectIndex,
      id
    })

    expect(point, 'должна существовать стартовая точка для интерактивного resize текста').not.toBeNull()
    if (!point) {
      throw new Error('стартовая точка для интерактивного resize текста должна существовать')
    }

    return point
  }

  /**
   * Проверяет, что продолжается та же resize-сессия текста.
   */
  private _expectActiveInteractionMatches(params: TextResizeStepParams): void {
    const interaction = this.activeInteraction
    expect(interaction, 'должна существовать активная resize-сессия текста').not.toBeNull()
    if (!interaction) {
      throw new Error('активная resize-сессия текста должна существовать перед live-шагом')
    }

    expect(
      this._matchesActiveTarget(params),
      'нельзя начинать resize другого текстового объекта, пока не завершён текущий resize'
    ).toBe(true)
    expect(
      interaction.corner,
      'нельзя продолжать активную drag-сессию resize через другую ручку'
    ).toBe(params.corner)
    expect(
      interaction.originX,
      'нельзя продолжать активную drag-сессию resize с другой горизонтальной опорой'
    ).toBe(params.originX)
    expect(
      interaction.originY,
      'нельзя продолжать активную drag-сессию resize с другой вертикальной опорой'
    ).toBe(params.originY)
  }

  /**
   * Возвращает true, если активная resize-сессия относится к тому же текстовому объекту.
   */
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
