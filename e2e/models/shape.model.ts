/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ShapeObjectInfo,
  ShapeTextInfo,
  ShapeAddParams,
  ShapeAddAtBoundsParams,
  ShapeUpdateParams,
  ShapeStrokeParams,
  ShapeTextAlignParams,
  ShapeTextStyleParams,
  ShapeScaleStepParams,
  ShapeScaleMouseMoveStepParams,
  ShapeScaleSnapshot,
  ShapeScaleCorner,
  ShapePresetKey,
  ShapeHorizontalAlign,
  ShapeVerticalAlign,
  ObjectTargetParams,
  ShapeTextSelectionParams,
  ShapeTextSelectionStyleInfo
} from '../types'

export class ShapeModel {
  private readonly page: Page

  private activeScaleInteraction: {
    point: {
      x: number
      y: number
    }
    mode: 'interactive' | 'synthetic-mouse-move'
    corner: ShapeScaleCorner
    objectIndex?: number
    id?: string
  } | null

  constructor(page: Page) {
    this.page = page
    this.activeScaleInteraction = null
  }

  /** Добавляет shape на canvas и возвращает информацию о созданном объекте */
  async add(params: ShapeAddParams = {}): Promise<ShapeObjectInfo | null> {
    return this.page.evaluate(async(p) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const shape = await editor.shapeManager.add(p)
      if (!shape) return null
      return helpers.serializeShapeObject(shape)
    }, params)
  }

  /** Добавляет shape так, чтобы `left/top` задавали левый верхний угол bounding box. */
  async addAtBounds(params: ShapeAddAtBoundsParams): Promise<ShapeObjectInfo | null> {
    const {
      options: {
        left,
        top,
        width,
        height,
        ...rest
      },
      ...shapeParams
    } = params

    return this.add({
      ...shapeParams,
      options: {
        ...rest,
        width,
        height,
        left: left + (width / 2),
        top: top + (height / 2)
      }
    })
  }

  /** Удаляет shape. По умолчанию — активный объект */
  async remove(params: ObjectTargetParams = {}): Promise<boolean> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      return editor.shapeManager.remove({ target })
    }, params)
  }

  /** Устанавливает заливку shape. По умолчанию — для активного объекта */
  async setFill(params: { fill: string } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(({ fill, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      editor.shapeManager.setFill({ target, fill })
    }, params)
  }

  /** Устанавливает обводку shape. По умолчанию — для активного объекта */
  async setStroke(params: ShapeStrokeParams & ObjectTargetParams = {}): Promise<void> {
    await this.page.evaluate(({ stroke, strokeWidth, dash, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      editor.shapeManager.setStroke({ target, stroke, strokeWidth, dash })
    }, params)
  }

  /** Устанавливает прозрачность shape. По умолчанию — для активного объекта */
  async setOpacity(params: { opacity: number } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(({ opacity, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      editor.shapeManager.setOpacity({ target, opacity })
    }, params)
  }

  /** Устанавливает скругление shape. По умолчанию — для активного объекта */
  async setRounding(params: { rounding: number } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(async({ rounding, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      await editor.shapeManager.setRounding({ target, rounding })
    }, params)
  }

  /** Добавляет shape с текстом и начальными текстовыми стилями. */
  async addShapeWithText(
    params: {
      presetKey?: ShapePresetKey
      text?: string
      fontSize?: number
      width?: number
      height?: number
    } = {}
  ): Promise<ShapeObjectInfo> {
    const {
      presetKey = 'square',
      text = 'TEST',
      fontSize = 72,
      width,
      height
    } = params

    const shape = await this.add({
      presetKey,
      options: {
        width,
        height,
        text,
        textStyle: {
          fontSize
        }
      }
    })
    return this.checkCreation({
      shape,
      presetKey
    })
  }

  /** Добавляет shape с пустым текстом. */
  async addEmptyTextShape(
    params: { presetKey?: ShapePresetKey } = {}
  ): Promise<ShapeObjectInfo> {
    const { presetKey = 'square' } = params
    const shape = await this.add({
      presetKey,
      options: {
        text: ''
      }
    })

    return this.checkCreation({
      shape,
      presetKey
    })
  }

  /** Сжимает shape до minimum width в live drag-сессии и возвращает проверенный snapshot. */
  async shrinkToMinimumWidth(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot> {
    const {
      objectIndex,
      id
    } = params

    const snapshot = await this.simulateScaleMouseMoveStep({
      scaleX: 0.2,
      scaleY: 1,
      pointerX: -20,
      pointerY: 0,
      corner: 'mr',
      originX: 'left',
      originY: 'center',
      objectIndex,
      id
    })

    return snapshot
  }

  /** Масштабирует shape по горизонтали за правую ручку и возвращает live snapshot. */
  async scaleHorizontallyFromRight(
    params: { scaleX: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scaleX,
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveScaleStep({
      scaleX,
      scaleY: 1,
      corner: 'mr',
      originX: 'left',
      originY: 'center',
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Масштабирует shape по вертикали за нижнюю ручку и возвращает live snapshot. */
  async scaleVerticallyFromBottom(
    params: { scaleY: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scaleY,
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveScaleStep({
      scaleX: 1,
      scaleY,
      corner: 'mb',
      originX: 'center',
      originY: 'top',
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Масштабирует shape по вертикали за верхнюю ручку и возвращает live snapshot. */
  async scaleVerticallyFromTop(
    params: { scaleY: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scaleY,
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveScaleStep({
      scaleX: 1,
      scaleY,
      corner: 'mt',
      originX: 'center',
      originY: 'bottom',
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Масштабирует shape по диагонали за угловую ручку и возвращает live snapshot. Поддерживает proportional drag через Shift и отключение snap через Ctrl. */
  async scaleDiagonally(
    params: {
      scaleX: number
      scaleY: number
      corner: 'tl' | 'tr' | 'bl' | 'br'
      shiftKey?: boolean
      ctrlKey?: boolean
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scaleX,
      scaleY,
      corner,
      shiftKey,
      ctrlKey,
      objectIndex,
      id
    } = params

    const originByCorner = {
      tl: {
        originX: 'right' as const,
        originY: 'bottom' as const
      },
      tr: {
        originX: 'left' as const,
        originY: 'bottom' as const
      },
      bl: {
        originX: 'right' as const,
        originY: 'top' as const
      },
      br: {
        originX: 'left' as const,
        originY: 'top' as const
      }
    }
    const {
      originX,
      originY
    } = originByCorner[corner]

    return this._performInteractiveScaleStep({
      scaleX,
      scaleY,
      corner,
      originX,
      originY,
      shiftKey,
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Масштабирует shape по диагонали пропорционально за угловую ручку и возвращает live snapshot. */
  async scaleDiagonallyProportionally(
    params: {
      scale: number
      corner: 'tl' | 'tr' | 'bl' | 'br'
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scale,
      corner,
      objectIndex,
      id
    } = params

    return this.scaleDiagonally({
      scaleX: scale,
      scaleY: scale,
      corner,
      shiftKey: true,
      objectIndex,
      id
    })
  }

  private async _performInteractiveScaleStep(params: ShapeScaleStepParams): Promise<ShapeScaleSnapshot> {
    await this._startScaleInteractionIfNeeded(params)

    const result = await this.page.evaluate((payload) => {
      const {
        scaleX,
        scaleY,
        corner = 'br',
        shiftKey = false,
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

      const activeCorner = typeof transform.corner === 'string' && transform.corner
        ? transform.corner
        : corner
      const activeOriginX = typeof transform.originX === 'string'
        ? transform.originX
        : 'left'
      const activeOriginY = typeof transform.originY === 'string'
        ? transform.originY
        : 'top'
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const settleStep = 0.75
      const anchorPoint = target.getPointByOrigin(activeOriginX, activeOriginY)
      const previousLeft = typeof target.left === 'number' ? target.left : 0
      const previousTop = typeof target.top === 'number' ? target.top : 0
      const previousScaleX = typeof target.scaleX === 'number' ? target.scaleX : 1
      const previousScaleY = typeof target.scaleY === 'number' ? target.scaleY : 1

      target.set({
        scaleX,
        scaleY
      })
      target.setPositionByOrigin(anchorPoint, activeOriginX, activeOriginY)
      target.setCoords()

      const control = target.oCoords?.[activeCorner]
      if (!control || typeof control.x !== 'number' || typeof control.y !== 'number') {
        target.set({
          left: previousLeft,
          top: previousTop,
          scaleX: previousScaleX,
          scaleY: previousScaleY
        })
        target.setCoords()

        return null
      }

      const controlPoint = {
        x: rect.left + control.x,
        y: rect.top + control.y
      }

      target.set({
        left: previousLeft,
        top: previousTop,
        scaleX: previousScaleX,
        scaleY: previousScaleY
      })
      target.setCoords()

      editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: controlPoint.x,
        clientY: controlPoint.y,
        shiftKey,
        ctrlKey
      }))

      if (!ctrlKey) {
        target.setCoords()

        const settledControl = target.oCoords?.[activeCorner]
        if (settledControl && typeof settledControl.x === 'number' && typeof settledControl.y === 'number') {
          let settleDeltaX = 0
          if (activeCorner.includes('l')) {
            settleDeltaX = -settleStep
          }
          if (activeCorner.includes('r')) {
            settleDeltaX = settleStep
          }

          let settleDeltaY = 0
          if (activeCorner.includes('t')) {
            settleDeltaY = -settleStep
          }
          if (activeCorner.includes('b')) {
            settleDeltaY = settleStep
          }

          const settlePoint = {
            x: rect.left + settledControl.x + settleDeltaX,
            y: rect.top + settledControl.y + settleDeltaY
          }

          editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
            bubbles: true,
            button: 0,
            buttons: 1,
            clientX: settlePoint.x,
            clientY: settlePoint.y,
            shiftKey,
            ctrlKey
          }))
        }
      }

      target.setCoords()
      const finalControl = target.oCoords?.[activeCorner]
      const finalPoint = finalControl && typeof finalControl.x === 'number' && typeof finalControl.y === 'number'
        ? {
          x: rect.left + finalControl.x,
          y: rect.top + finalControl.y
        }
        : controlPoint

      return {
        point: finalPoint,
        snapshot: helpers.serializeShapeScaleSnapshot(target)
      }
    }, params)

    expect(result, 'должен существовать live snapshot после интерактивного масштабирования').not.toBeNull()

    await this._waitForCanvasRender()

    const {
      point,
      snapshot
    } = result as {
      point: {
        x: number
        y: number
      }
      snapshot: ShapeScaleSnapshot
    }

    expect(snapshot, 'должен существовать live snapshot после интерактивного масштабирования').not.toBeNull()

    this.activeScaleInteraction = {
      point,
      mode: 'interactive',
      corner: params.corner ?? 'br',
      objectIndex: params.objectIndex,
      id: params.id
    }

    return snapshot
  }

  /** Имитирует масштабирование shape и запекание результата через object:modified */
  async simulateScale(params: { scaleX: number, scaleY: number } & ObjectTargetParams): Promise<void> {
    const {
      scaleX,
      scaleY,
      objectIndex,
      id
    } = params

    await this.simulateScaleStep({
      scaleX,
      scaleY,
      objectIndex,
      id
    })
    await this.finishScale({
      objectIndex,
      id
    })
  }

  /** Выполняет один live-шаг интерактивного масштабирования, при необходимости с зажатыми Shift/Ctrl, и возвращает проверенный snapshot. */
  async simulateScaleStep(params: ShapeScaleStepParams): Promise<ShapeScaleSnapshot> {
    const snapshot = await this.page.evaluate((payload) => {
      const {
        scaleX,
        scaleY,
        corner = 'br',
        originX = 'left',
        originY = 'top',
        shiftKey = false,
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

      const left = typeof target.left === 'number' ? target.left : 0
      const top = typeof target.top === 'number' ? target.top : 0
      const anchorPoint = target.getPointByOrigin(originX, originY)

      target.set({
        scaleX,
        scaleY
      })
      target.setPositionByOrigin(anchorPoint, originX, originY)
      target.setCoords()

      editor.canvas.fire('object:scaling', {
        target,
        e: {
          shiftKey,
          ctrlKey
        },
        transform: {
          original: {
            scaleX: 1,
            scaleY: 1,
            left,
            top
          },
          corner,
          originX,
          originY
        }
      })

      return helpers.serializeShapeScaleSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать live snapshot после интерактивного масштабирования').not.toBeNull()

    return snapshot as ShapeScaleSnapshot
  }

  /** Выполняет live-scale шаг с synthetic mouse:move для clamp-сценариев и при необходимости передаёт состояние Shift/Ctrl. */
  async simulateScaleMouseMoveStep(params: ShapeScaleMouseMoveStepParams): Promise<ShapeScaleSnapshot> {
    await this._startScaleInteractionIfNeeded(params)

    const result = await this.page.evaluate((payload) => {
      const {
        scaleX,
        scaleY,
        pointerX,
        pointerY,
        action = 'scaleX',
        signX = 1,
        signY = 1,
        corner = 'br',
        originX = 'left',
        originY = 'top',
        shiftKey = false,
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

      const activeCorner = typeof transform.corner === 'string' && transform.corner
        ? transform.corner
        : corner
      const activeOriginX = typeof transform.originX === 'string'
        ? transform.originX
        : originX
      const activeOriginY = typeof transform.originY === 'string'
        ? transform.originY
        : originY
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const anchorPoint = target.getPointByOrigin(activeOriginX, activeOriginY)
      const previousLeft = typeof target.left === 'number' ? target.left : 0
      const previousTop = typeof target.top === 'number' ? target.top : 0
      const previousScaleX = typeof target.scaleX === 'number' ? target.scaleX : 1
      const previousScaleY = typeof target.scaleY === 'number' ? target.scaleY : 1

      target.set({
        scaleX,
        scaleY
      })
      target.setPositionByOrigin(anchorPoint, activeOriginX, activeOriginY)
      target.setCoords()

      const control = target.oCoords?.[activeCorner]
      if (!control || typeof control.x !== 'number' || typeof control.y !== 'number') {
        target.set({
          left: previousLeft,
          top: previousTop,
          scaleX: previousScaleX,
          scaleY: previousScaleY
        })
        target.setCoords()

        return null
      }

      const controlPoint = {
        x: rect.left + control.x,
        y: rect.top + control.y
      }

      target.set({
        left: previousLeft,
        top: previousTop,
        scaleX: previousScaleX,
        scaleY: previousScaleY
      })
      target.setCoords()

      const PointCtor = anchorPoint.constructor as new(x: number, y: number) => {
        subtract: (point: { x: number, y: number }) => unknown
      }
      const scenePoint = new PointCtor(anchorPoint.x + pointerX, anchorPoint.y + pointerY)
      const originalGetScenePoint = editor.canvas.getScenePoint.bind(editor.canvas)
      const previousAction = transform.action
      const previousSignX = transform.signX
      const previousSignY = transform.signY

      try {
        transform.action = action
        transform.signX = signX
        transform.signY = signY
        editor.canvas.getScenePoint = () => scenePoint
        editor.canvas.fire('object:scaling', {
          target,
          e: {
            shiftKey,
            ctrlKey
          },
          transform
        })
        editor.canvas.fire('mouse:move', {
          e: new PointerEvent('pointermove', {
            clientX: pointerX,
            clientY: pointerY
          })
        })
      } finally {
        editor.canvas.getScenePoint = originalGetScenePoint
        transform.action = previousAction
        transform.signX = previousSignX
        transform.signY = previousSignY
      }

      target.setCoords()
      const finalControl = target.oCoords?.[activeCorner]
      const finalPoint = finalControl && typeof finalControl.x === 'number' && typeof finalControl.y === 'number'
        ? {
          x: rect.left + finalControl.x,
          y: rect.top + finalControl.y
        }
        : controlPoint

      return {
        point: finalPoint,
        snapshot: helpers.serializeShapeScaleSnapshot(target)
      }
    }, params)

    expect(result, 'должен существовать live snapshot после mouse:move clamp').not.toBeNull()

    await this._waitForCanvasRender()

    const {
      point,
      snapshot
    } = result as {
      point: {
        x: number
        y: number
      }
      snapshot: ShapeScaleSnapshot
    }

    expect(snapshot, 'должен существовать live snapshot после mouse:move clamp').not.toBeNull()

    this.activeScaleInteraction = {
      point,
      mode: 'synthetic-mouse-move',
      corner: params.corner ?? 'br',
      objectIndex: params.objectIndex,
      id: params.id
    }

    return snapshot
  }

  /** Сжимает shape до minimum height в live drag-сессии и возвращает проверенный snapshot. */
  async shrinkToMinimumHeight(
    params: ({ edge?: 'top' | 'bottom' } & ObjectTargetParams) = {}
  ): Promise<ShapeScaleSnapshot> {
    const {
      edge = 'bottom',
      objectIndex,
      id
    } = params

    if (edge === 'top') {
      return this.simulateScaleMouseMoveStep({
        scaleX: 1,
        scaleY: 0.2,
        pointerX: 0,
        pointerY: 20,
        action: 'scaleY',
        signY: -1,
        corner: 'mt',
        originX: 'center',
        originY: 'bottom',
        objectIndex,
        id
      })
    }

    return this.simulateScaleMouseMoveStep({
      scaleX: 1,
      scaleY: 0.2,
      pointerX: 0,
      pointerY: -20,
      action: 'scaleY',
      signY: 1,
      corner: 'mb',
      originX: 'center',
      originY: 'top',
      objectIndex,
      id
    })
  }

  /** Завершает активное интерактивное масштабирование через реальный mouseup, а для synthetic-сценариев остаётся на object:modified. */
  async finishScale(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot> {
    if (this.activeScaleInteraction && this._matchesActiveScaleTarget(params)) {
      const {
        point,
        mode,
        corner,
        objectIndex,
        id
      } = this.activeScaleInteraction
      const snapshot = await this.page.evaluate((payload) => {
        const {
          point: interactionPoint,
          mode: interactionMode,
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

        target.setCoords()

        const currentControl = target.oCoords?.[controlCorner]
        const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
        const releasePoint = currentControl
          && typeof currentControl.x === 'number'
          && typeof currentControl.y === 'number'
          ? {
            x: rect.left + currentControl.x,
            y: rect.top + currentControl.y
          }
          : interactionPoint

        editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
          bubbles: true,
          button: 0,
          buttons: 0,
          clientX: releasePoint.x,
          clientY: releasePoint.y
        }))

        if (interactionMode === 'synthetic-mouse-move') {
          editor.canvas.fire('object:modified', {
            target
          })
        }

        return helpers.serializeShapeScaleSnapshot(target)
      }, {
        point,
        mode,
        corner,
        objectIndex,
        id
      })

      await this._waitForCanvasRender()
      this.activeScaleInteraction = null

      expect(snapshot, 'должен существовать snapshot после завершения масштабирования').not.toBeNull()

      return snapshot as ShapeScaleSnapshot
    }

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

      return helpers.serializeShapeScaleSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot после завершения масштабирования').not.toBeNull()

    return snapshot as ShapeScaleSnapshot
  }

  /** Завершает активное интерактивное масштабирование, если drag-сессия ещё открыта. */
  async finishScaleIfActive(): Promise<ShapeScaleSnapshot | null> {
    if (!this.activeScaleInteraction) return null

    const {
      objectIndex,
      id
    } = this.activeScaleInteraction

    return this.finishScale({
      objectIndex,
      id
    })
  }

  private async _startScaleInteractionIfNeeded(params: ShapeScaleStepParams): Promise<void> {
    const {
      corner = 'br',
      objectIndex,
      id,
      shiftKey = false,
      ctrlKey = false
    } = params

    if (this.activeScaleInteraction) {
      expect(
        this._matchesActiveScaleTarget({
          objectIndex,
          id
        }),
        'нельзя продолжать активную drag-сессию масштабирования для другого объекта'
      ).toBe(true)
      expect(
        this.activeScaleInteraction.corner,
        'нельзя продолжать активную drag-сессию масштабирования через другую ручку'
      ).toBe(corner)

      return
    }

    const point = await this.page.evaluate((payload) => {
      const {
        corner: controlCorner,
        objectIndex: targetObjectIndex,
        id: targetId,
        shiftKey: isShiftKeyPressed,
        ctrlKey: isCtrlKeyPressed
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
        clientY: pointInfo.y,
        shiftKey: isShiftKeyPressed,
        ctrlKey: isCtrlKeyPressed
      }))

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) {
        return null
      }

      return pointInfo
    }, {
      corner,
      objectIndex,
      id,
      shiftKey,
      ctrlKey
    })

    expect(point, 'должна существовать стартовая точка для интерактивного масштабирования').not.toBeNull()

    await this._waitForCanvasRender()

    this.activeScaleInteraction = {
      point: point as {
        x: number
        y: number
      },
      mode: 'interactive',
      corner,
      objectIndex,
      id
    }
  }

  private _matchesActiveScaleTarget(params: ObjectTargetParams): boolean {
    if (!this.activeScaleInteraction) return false

    const {
      objectIndex,
      id
    } = params

    if (typeof id === 'string') {
      return this.activeScaleInteraction.id === id
    }

    if (typeof objectIndex === 'number') {
      return this.activeScaleInteraction.objectIndex === objectIndex
    }

    return true
  }

  private async _waitForCanvasRender(): Promise<void> {
    await this.page.evaluate(async() => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
    })
  }

  /** Возвращает текущий snapshot состояния shape-группы, fail-fast проверяет его наличие. */
  async getScaleSnapshot(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const { __editorHelpers: helpers } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeShapeScaleSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать текущий snapshot масштабируемого shape').not.toBeNull()

    return snapshot as ShapeScaleSnapshot
  }

  /** Обновляет shape — меняет пресет, размеры, стили. Сохраняет позицию и текст */
  async update(params: ShapeUpdateParams & ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    return this.page.evaluate(async({ presetKey, options, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const result = await editor.shapeManager.update({ target, presetKey, options })
      if (!result) return null
      return helpers.serializeShapeObject(result)
    }, params)
  }

  /** Устанавливает выравнивание текста внутри shape */
  async setTextAlign(params: ShapeTextAlignParams & ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    return this.page.evaluate(({ horizontal, vertical, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const result = editor.shapeManager.setTextAlign({ target, horizontal, vertical })
      if (!result) return null
      return helpers.serializeShapeObject(result)
    }, params)
  }

  /** Обновляет стиль текста внутри shape и возвращает снимок текстового узла */
  async updateTextStyle(
    params: { style: ShapeTextStyleParams } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    return this.page.evaluate(({ style, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const result = editor.shapeManager.updateTextStyle({ target, style })
      if (!result) return null

      const textNode = editor.shapeManager.getTextNode({ target: result })
      if (!textNode) return null

      return helpers.serializeShapeTextObject(textNode)
    }, params)
  }

  /** Возвращает текстовый узел внутри shape */
  async getTextNode(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      return helpers.serializeShapeTextObject(textNode)
    }, params)
  }

  /** Делает shape активным объектом canvas */
  async select(params: ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      return helpers.serializeShapeObject(target)
    }, params)
  }

  /** Кликает по фигуре на canvas через реальные координаты viewport. */
  async clickOnCanvas(params: ObjectTargetParams = {}): Promise<void> {
    const point = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.setCoords()
      const centerPoint = target.getCenterPoint()
      const sceneCenterX = typeof centerPoint.x === 'number' ? centerPoint.x : 0
      const sceneCenterY = typeof centerPoint.y === 'number' ? centerPoint.y : 0
      const viewportTransform = Array.isArray(editor.canvas.viewportTransform)
        ? editor.canvas.viewportTransform
        : [1, 0, 0, 1, 0, 0]
      const viewportX = (viewportTransform[0] * sceneCenterX)
        + (viewportTransform[2] * sceneCenterY)
        + viewportTransform[4]
      const viewportY = (viewportTransform[1] * sceneCenterX)
        + (viewportTransform[3] * sceneCenterY)
        + viewportTransform[5]
      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + viewportX,
        y: canvasRect.top + viewportY
      }
    }, params)

    expect(point, 'для клика по фигуре должны существовать координаты на canvas').not.toBeNull()

    await this.page.mouse.click(point!.x, point!.y)
    await this._waitForCanvasRender()
  }

  /** Включает режим редактирования текста внутри shape */
  async enterTextEditing(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      editor.canvas.setActiveObject(textNode)
      textNode.enterEditing()
      textNode.selectAll()
      editor.canvas.requestRenderAll()

      return helpers.serializeShapeTextObject(textNode)
    }, params)
  }

  /** Меняет текст активного text-edit внутри shape */
  async updateEditingText(params: { text: string } & ObjectTargetParams): Promise<ShapeTextInfo | null> {
    return this.page.evaluate(({ text, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      const { hiddenTextarea } = textNode

      if (hiddenTextarea instanceof HTMLTextAreaElement) {
        hiddenTextarea.value = text
        hiddenTextarea.selectionStart = text.length
        hiddenTextarea.selectionEnd = text.length
        hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }))
      } else {
        textNode.set({ text })
        editor.canvas.fire('text:changed', {
          target: textNode
        })
        editor.canvas.requestRenderAll()
      }

      return helpers.serializeShapeTextObject(textNode)
    }, params)
  }

  /** Обновляет стиль текста внутри фигуры, пока открыт режим редактирования. */
  async updateTextStyleInEditing(
    params: { style: ShapeTextStyleParams } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    return this.page.evaluate(({ style, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      const result = editor.textManager.updateText({
        target: textNode,
        style
      })
      if (!result) return null

      return helpers.serializeShapeTextObject(result)
    }, params)
  }

  /** Завершает редактирование текста внутри shape */
  async exitTextEditing(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      textNode.exitEditing()
      editor.canvas.requestRenderAll()

      return helpers.serializeShapeTextObject(textNode)
    }, params)
  }

  /** Устанавливает диапазон выделения текста внутри shape в режиме editing. */
  async setTextSelection(
    params: ShapeTextSelectionParams & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    return this.page.evaluate(({ start, end, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      textNode.selectionStart = start
      textNode.selectionEnd = end

      return helpers.serializeShapeTextObject(textNode)
    }, params)
  }

  /** Возвращает стиль текущего или явного выделенного диапазона текста внутри shape. */
  async getSelectionStyles(
    params: Partial<ShapeTextSelectionParams> & ObjectTargetParams = {}
  ): Promise<ShapeTextSelectionStyleInfo | null> {
    return this.page.evaluate((payload) => {
      const { __editorHelpers: helpers } = window as any

      return helpers.getShapeTextSelectionStyles(payload)
    }, params)
  }

  /**
   * Проверяет что shape создан корректно.
   * Возвращает гарантированно не-null ShapeObjectInfo
   */
  checkCreation(params: { shape: ShapeObjectInfo | null, presetKey?: ShapePresetKey }): ShapeObjectInfo {
    const { shape, presetKey } = params

    expect(shape, 'shape должен быть создан').not.toBeNull()
    expect(shape?.shapeComposite, 'shape должен быть композитным').toBe(true)

    if (presetKey) {
      expect(shape?.shapePresetKey, 'presetKey должен совпадать').toBe(presetKey)
    }

    return shape as ShapeObjectInfo
  }

  /** Добавляет несколько shape по списку пресетов, возвращает массив созданных объектов */
  async addMultiple(params: { presets: ShapePresetKey[] }): Promise<ShapeObjectInfo[]> {
    const results: ShapeObjectInfo[] = []

    for (const presetKey of params.presets) {
      const shape = await this.add({ presetKey })
      if (shape) results.push(shape)
    }

    return results
  }

  /** Возвращает первый shape-объект на canvas */
  async getFirstShape(): Promise<ShapeObjectInfo> {
    const objects = await this.getShapeObjects()
    expect(objects.length, 'на canvas должен быть хотя бы один shape').toBeGreaterThan(0)
    return objects[0]
  }

  /** Возвращает shape-объект по id или индексу canvas. */
  async getObject(params: ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeShapeObject(target)
    }, params)
  }

  /**
   * Проверяет что update вернул корректный результат.
   * Возвращает гарантированно не-null ShapeObjectInfo
   */
  checkUpdate(params: { shape: ShapeObjectInfo | null, presetKey: ShapePresetKey }): ShapeObjectInfo {
    const { shape, presetKey } = params

    expect(shape, 'update должен вернуть объект').not.toBeNull()
    expect(shape?.shapePresetKey, 'presetKey должен смениться').toBe(presetKey)

    return shape as ShapeObjectInfo
  }

  /**
   * Проверяет что setTextAlign вернул корректный результат.
   * Возвращает гарантированно не-null ShapeObjectInfo
   */
  checkTextAlign(
    params: { shape: ShapeObjectInfo | null, horizontal?: ShapeHorizontalAlign, vertical?: ShapeVerticalAlign }
  ): ShapeObjectInfo {
    const { shape, horizontal, vertical } = params

    expect(shape, 'setTextAlign должен вернуть объект').not.toBeNull()

    if (horizontal) {
      expect(shape?.shapeAlignHorizontal, 'горизонтальное выравнивание должно совпадать').toBe(horizontal)
    }

    if (vertical) {
      expect(shape?.shapeAlignVertical, 'вертикальное выравнивание должно совпадать').toBe(vertical)
    }

    return shape as ShapeObjectInfo
  }

  /** Проверяет, что bounds shape- или text-узла остаются внутри bounds группы. */
  checkNodeInsideGroup(params: {
    snapshot: ShapeScaleSnapshot
    kind: 'shape' | 'text'
    tolerance?: number
  }): {
    left: number
    top: number
    right: number
    bottom: number
  } {
    const {
      snapshot,
      kind,
      tolerance = 1.5
    } = params

    const left = kind === 'shape' ? snapshot.shapeBoundsLeft : snapshot.textBoundsLeft
    const top = kind === 'shape' ? snapshot.shapeBoundsTop : snapshot.textBoundsTop
    const right = kind === 'shape' ? snapshot.shapeBoundsRight : snapshot.textBoundsRight
    const bottom = kind === 'shape' ? snapshot.shapeBoundsBottom : snapshot.textBoundsBottom

    expect(left, `${kind} bounds left должен существовать`).not.toBeNull()
    expect(top, `${kind} bounds top должен существовать`).not.toBeNull()
    expect(right, `${kind} bounds right должен существовать`).not.toBeNull()
    expect(bottom, `${kind} bounds bottom должен существовать`).not.toBeNull()

    if (left === null || top === null || right === null || bottom === null) {
      throw new Error(`${kind} bounds должны существовать`)
    }

    expect(left).toBeGreaterThanOrEqual(snapshot.groupBoundsLeft - tolerance)
    expect(top).toBeGreaterThanOrEqual(snapshot.groupBoundsTop - tolerance)
    expect(right).toBeLessThanOrEqual(snapshot.groupBoundsRight + tolerance)
    expect(bottom).toBeLessThanOrEqual(snapshot.groupBoundsBottom + tolerance)

    return {
      left,
      top,
      right,
      bottom
    }
  }

  /**
   * Удаляет shape и проверяет успешность удаления.
   * Возвращает true если удаление подтверждено
   */
  async checkRemoval(params: ObjectTargetParams = {}): Promise<boolean> {
    const removed = await this.remove(params)
    expect(removed, 'shape должен быть удалён').toBe(true)
    return removed
  }

  /** Возвращает список shape-объектов на canvas */
  async getShapeObjects(): Promise<ShapeObjectInfo[]> {
    return this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      return editor.canvasManager.getObjects()
        .filter((obj: any) => Boolean(obj.shapeComposite))
        .map(helpers.serializeShapeObject)
    })
  }
}
