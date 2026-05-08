/**
 * ShapeModel — основная e2e-модель для работы с фигурой.
 * Здесь остаётся весь публичный API: создание, обновление, выбор, работа с текстом и чтение состояния фигуры.
 *
 * ShapeScalingSession вынесена отдельно, потому что скейлинг — это не часть самой фигуры, а отдельное действие со своим временным состоянием: начать изменение размера, пройти промежуточные шаги и завершить его.
 * ShapeModel остаётся точкой входа, а ShapeScalingSession отвечает только за скейлинг.
 *
 * Для следующих разбиений shape.model держим простое правило:
 * основной API фигуры оставляем в ShapeModel;
 * отдельные действия с собственной ответственностью выносим в отдельные файлы через композицию;
 * не делим файл просто ради размера — вынос должен делать код понятнее.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ShapeObjectInfo,
  ShapeObjectTreeIds,
  ShapeTextInfo,
  ShapeAddParams,
  ShapeAddAtBoundsParams,
  ShapeUpdateParams,
  ShapeStrokeParams,
  ShapeTextAlignParams,
  ShapeTextStyleParams,
  ShapeScaleMouseMoveStepParams,
  ShapeScaleSnapshot,
  ShapeScaleSide,
  ShapeScaleStepParams,
  ShapePresetKey,
  ShapeHorizontalAlign,
  ShapeVerticalAlign,
  ObjectTargetParams,
  ShapeTextEditingUpdateParams,
  ShapeTextSelectionParams,
  ShapeTextSelectionStyleInfo
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import { ShapeScalingSession, type ShapeDiagonalScaleCorner } from './shape-scaling-session'

type ShapeScaleLiveState = {
  snapshot: ShapeScaleSnapshot
  lineCount: number
}

export class ShapeModel {
  private readonly page: Page

  private readonly scalingController: ShapeScalingSession

  constructor(page: Page) {
    this.page = page
    this.scalingController = new ShapeScalingSession(page)
  }

  /** Возвращает viewport-координаты центра фигуры для реальных mouse-событий. */
  private async _resolveTargetCenterPoint(params: ObjectTargetParams = {}): Promise<{ x: number, y: number }> {
    const point = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
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

    expect(point, 'для взаимодействия с фигурой должны существовать координаты на canvas').not.toBeNull()

    return point as {
      x: number
      y: number
    }
  }

  /** Переводит точку canvas-сцены в viewport-координаты браузера для реальных mouse-событий. */
  private async _resolveViewportPointFromScenePoint(
    params: {
      x: number
      y: number
    }
  ): Promise<{
    x: number
    y: number
  }> {
    const point = await this.page.evaluate(({ x, y }) => {
      const { editor } = window as any
      const viewportTransform = Array.isArray(editor.canvas.viewportTransform)
        ? editor.canvas.viewportTransform
        : [1, 0, 0, 1, 0, 0]
      const viewportX = (viewportTransform[0] * x)
        + (viewportTransform[2] * y)
        + viewportTransform[4]
      const viewportY = (viewportTransform[1] * x)
        + (viewportTransform[3] * y)
        + viewportTransform[5]
      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + viewportX,
        y: canvasRect.top + viewportY
      }
    }, params)

    expect(point, 'для pointer-взаимодействия на canvas должны существовать viewport-координаты').not.toBeNull()

    return point as {
      x: number
      y: number
    }
  }

  /** Возвращает точки для клика и drag в горизонтальной области отступа текста внутри фигуры. */
  private async _resolveTextInsetInteractionPoints(
    {
      side,
      ...targetParams
    }: {
      side: 'left' | 'right'
    } & ObjectTargetParams
  ): Promise<{
    insetPoint: {
      x: number
      y: number
    }
    textPoint: {
      x: number
      y: number
    }
  }> {
    const snapshot = await this.getScaleSnapshot(targetParams)

    expect(
      snapshot.textBoundsLeft,
      'левая граница текста должна существовать для взаимодействия с отступом'
    ).not.toBeNull()
    expect(
      snapshot.textBoundsTop,
      'верхняя граница текста должна существовать для взаимодействия с отступом'
    ).not.toBeNull()
    expect(
      snapshot.textBoundsRight,
      'правая граница текста должна существовать для взаимодействия с отступом'
    ).not.toBeNull()
    expect(
      snapshot.textBoundsBottom,
      'нижняя граница текста должна существовать для взаимодействия с отступом'
    ).not.toBeNull()

    const textBoundsLeft = snapshot.textBoundsLeft as number
    const textBoundsTop = snapshot.textBoundsTop as number
    const textBoundsRight = snapshot.textBoundsRight as number
    const textBoundsBottom = snapshot.textBoundsBottom as number
    const insetWidth = side === 'right'
      ? snapshot.groupBoundsRight - textBoundsRight
      : textBoundsLeft - snapshot.groupBoundsLeft

    const insetSideTitle = side === 'right'
      ? 'правого'
      : 'левого'

    expect(
      insetWidth,
      `для ${insetSideTitle} отступа фигуры должно быть место для pointer-взаимодействия`
    ).toBeGreaterThan(8)

    const textBoundsWidth = textBoundsRight - textBoundsLeft
    const textOffset = Math.max(4, Math.min(textBoundsWidth / 3, 24))
    const interactionSceneY = textBoundsTop + ((textBoundsBottom - textBoundsTop) / 2)
    const insetSceneX = side === 'right'
      ? textBoundsRight + (insetWidth / 2)
      : textBoundsLeft - (insetWidth / 2)
    const textSceneX = side === 'right'
      ? textBoundsLeft + textOffset
      : textBoundsRight - textOffset

    const insetPoint = await this._resolveViewportPointFromScenePoint({
      x: insetSceneX,
      y: interactionSceneY
    })
    const textPoint = await this._resolveViewportPointFromScenePoint({
      x: textSceneX,
      y: interactionSceneY
    })

    return {
      insetPoint,
      textPoint
    }
  }

  /** Возвращает viewport-координаты control-handle фигуры для реальных mouse-событий. */
  private async _resolveControlPoint(
    {
      corner,
      ...targetParams
    }: {
      corner: 'mtr'
    } & ObjectTargetParams
  ): Promise<{ x: number, y: number }> {
    const point = await this.page.evaluate(({ corner: controlCorner, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.setCoords()
      editor.canvas.renderAll()

      const control = target.oCoords?.[controlCorner]
      if (!control || typeof control.x !== 'number' || typeof control.y !== 'number') {
        return null
      }

      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + control.x,
        y: canvasRect.top + control.y
      }
    }, {
      corner,
      ...targetParams
    })

    expect(point, 'для взаимодействия с ручкой фигуры должны существовать координаты на canvas').not.toBeNull()

    return point as {
      x: number
      y: number
    }
  }

  /** Добавляет shape на canvas и возвращает информацию о созданном объекте */
  async add(params: ShapeAddParams = {}): Promise<ShapeObjectInfo | null> {
    const createdShape = await this.page.evaluate(async(p) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const shape = await editor.shapeManager.add(p)
      if (!shape) return null
      return helpers.serializeShapeObject(shape)
    }, params)

    if (!createdShape) return null

    await waitForCanvasRender({ page: this.page })

    if (typeof createdShape.id !== 'string') return createdShape

    return this.getObject({ id: createdShape.id })
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
    const removed = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      return editor.shapeManager.remove({ target })
    }, params)

    await waitForCanvasRender({ page: this.page })

    return removed
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

    await waitForCanvasRender({ page: this.page })
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

    await waitForCanvasRender({ page: this.page })
  }

  /** Устанавливает прозрачность shape. По умолчанию — для активного объекта и его текста */
  async setOpacity(params: { opacity: number; applyToText?: boolean } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(({ opacity, applyToText, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      editor.shapeManager.setOpacity({ target, opacity, applyToText })
    }, params)

    await waitForCanvasRender({ page: this.page })
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

    await waitForCanvasRender({ page: this.page })
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
  async shrinkToMinimumWidth(
    params: ({ edge?: 'left' | 'right' } & ObjectTargetParams) = {}
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingController.shrinkToMinimumWidth(params)
  }

  /** Масштабирует текущий target на canvas по горизонтали за правую ручку и возвращает live snapshot. */
  async scaleHorizontallyFromRight(
    params: { scaleX: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingController.scaleHorizontallyFromRight(params)
  }

  /** Масштабирует shape по горизонтали за левую ручку и возвращает live snapshot. */
  async scaleHorizontallyFromLeft(
    params: { scaleX: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingController.scaleHorizontallyFromLeft(params)
  }

  /** Масштабирует текущий target на canvas по вертикали за нижнюю ручку и возвращает live snapshot. */
  async scaleVerticallyFromBottom(
    params: { scaleY: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingController.scaleVerticallyFromBottom(params)
  }

  /** Масштабирует shape по вертикали за верхнюю ручку и возвращает live snapshot. */
  async scaleVerticallyFromTop(
    params: { scaleY: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingController.scaleVerticallyFromTop(params)
  }

  /** Масштабирует shape по диагонали за угловую ручку и возвращает live snapshot. Поддерживает явную передачу Shift и отключение snap через Ctrl. */
  async scaleDiagonally(
    params: {
      scaleX: number
      scaleY: number
      corner: ShapeDiagonalScaleCorner
      shiftKey?: boolean
      ctrlKey?: boolean
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingController.scaleDiagonally(params)
  }

  /** Масштабирует shape по диагонали пропорционально за угловую ручку и возвращает live snapshot. */
  async scaleDiagonallyProportionally(
    params: {
      scale: number
      corner: ShapeDiagonalScaleCorner
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingController.scaleDiagonallyProportionally(params)
  }

  /** Сжимает shape до minimum по диагонали и возвращает live snapshot текущего кадра. */
  async shrinkDiagonallyToMinimum(
    params: {
      corner: ShapeDiagonalScaleCorner
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingController.shrinkDiagonallyToMinimum(params)
  }

  /** Имитирует масштабирование shape и запекание результата через object:modified. */
  async simulateScale(params: { scaleX: number, scaleY: number } & ObjectTargetParams): Promise<void> {
    await this.scalingController.simulateScale(params)
  }

  /** Выполняет один live-шаг интерактивного масштабирования и возвращает проверенный snapshot. */
  async simulateScaleStep(params: ShapeScaleStepParams): Promise<ShapeScaleSnapshot> {
    return this.scalingController.simulateScaleStep(params)
  }

  /** Выполняет live-scale шаг с synthetic mouse:move для clamp-сценариев. */
  async simulateScaleMouseMoveStep(params: ShapeScaleMouseMoveStepParams): Promise<ShapeScaleSnapshot> {
    return this.scalingController.simulateScaleMouseMoveStep(params)
  }

  /** Сжимает shape до minimum height в live drag-сессии и возвращает проверенный snapshot. */
  async shrinkToMinimumHeight(
    params: ({ edge?: 'top' | 'bottom' } & ObjectTargetParams) = {}
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingController.shrinkToMinimumHeight(params)
  }

  /** Завершает активное интерактивное масштабирование и возвращает итоговый snapshot. */
  async finishScale(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot> {
    return this.scalingController.finishScale(params)
  }

  /** Завершает активное интерактивное масштабирование, если drag-сессия ещё открыта. */
  async finishScaleIfActive(): Promise<ShapeScaleSnapshot | null> {
    return this.scalingController.finishScaleIfActive()
  }

  /** Пошагово сужает shape с выбранной стороны и возвращает live-состояния каждого шага. */
  async shrinkFromSideInSteps(
    params: {
      side: ShapeScaleSide
      steps: number[]
    } & ObjectTargetParams
  ): Promise<ShapeScaleLiveState[]> {
    const {
      side,
      steps,
      objectIndex,
      id
    } = params

    expect(steps.length, 'для поэтапного сужения должен быть хотя бы один шаг').toBeGreaterThan(0)

    const states: ShapeScaleLiveState[] = []

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]
      let snapshot: ShapeScaleSnapshot

      if (side === 'right') {
        snapshot = await this.scaleHorizontallyFromRight({
          id,
          objectIndex,
          scaleX: step
        })
      } else if (side === 'left') {
        snapshot = await this.scaleHorizontallyFromLeft({
          id,
          objectIndex,
          scaleX: step
        })
      } else if (side === 'bottom') {
        snapshot = await this.scaleVerticallyFromBottom({
          id,
          objectIndex,
          scaleY: step
        })
      } else {
        snapshot = await this.scaleVerticallyFromTop({
          id,
          objectIndex,
          scaleY: step
        })
      }

      const text = await this.getTextNode({
        id,
        objectIndex
      })

      states.push({
        snapshot,
        lineCount: text?.lineCount ?? 0
      })
    }

    return states
  }

  /** Возвращает текущий snapshot масштабируемого target, fail-fast проверяет его наличие. */
  async getScaleSnapshot(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const { __editorHelpers: helpers } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
      if (!target) return null

      return helpers.serializeShapeScaleSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать текущий snapshot масштабируемого target').not.toBeNull()

    return snapshot as ShapeScaleSnapshot
  }

  /**
   * Устанавливает абсолютный угол поворота фигуры.
   * Использует TransformManager для корректного применения трансформации и сохранения в историю.
   */
  async setAngle(params: { angle: number } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(({ angle, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return

      editor.transformManager.setAngle(target, angle)
    }, params)

    await waitForCanvasRender({ page: this.page })
  }

  /** Обновляет shape — меняет пресет, размеры, стили. Сохраняет позицию и текст */
  async update(params: ShapeUpdateParams & ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    const shape = await this.page.evaluate(async({ presetKey, options, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const result = await editor.shapeManager.update({ target, presetKey, options })
      if (!result) return null
      return helpers.serializeShapeObject(result)
    }, params)

    if (!shape) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof shape.id === 'string'
      ? { id: shape.id }
      : params

    return this.getObject(settledParams)
  }

  /** Устанавливает выравнивание текста внутри shape */
  async setTextAlign(params: ShapeTextAlignParams & ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    const shape = await this.page.evaluate(({ horizontal, vertical, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const result = editor.shapeManager.setTextAlign({ target, horizontal, vertical })
      if (!result) return null
      return helpers.serializeShapeObject(result)
    }, params)

    if (!shape) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof shape.id === 'string'
      ? { id: shape.id }
      : params

    return this.getObject(settledParams)
  }

  /** Обновляет стиль текста внутри shape и возвращает снимок текстового узла */
  async updateTextStyle(
    params: { style: ShapeTextStyleParams } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    const updatedTextNode = await this.page.evaluate(({ style, objectIndex, id }) => {
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

    if (!updatedTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
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

  /** Возвращает ID shape-группы и её внутренних объектов. */
  async getObjectTreeIds(params: ObjectTargetParams = {}): Promise<ShapeObjectTreeIds> {
    const ids = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
      if (!target) return null

      const shapeNode = helpers.resolveShapeNode(target)
      const textNode = editor.shapeManager.getTextNode({ target })

      return {
        groupId: typeof target.id === 'string' ? target.id : null,
        shapeId: shapeNode && typeof shapeNode.id === 'string' ? shapeNode.id : null,
        textId: textNode && typeof textNode.id === 'string' ? textNode.id : null
      }
    }, params)

    expect(ids, 'для shape-группы должны существовать id объектов').not.toBeNull()

    return ids as ShapeObjectTreeIds
  }

  /** Делает shape активным объектом canvas */
  async select(params: ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    const shape = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      editor.canvas.requestRenderAll()

      return helpers.serializeShapeObject(target)
    }, params)

    if (!shape) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof shape.id === 'string'
      ? { id: shape.id }
      : params

    return this.getObject(settledParams)
  }

  /** Кликает по фигуре на canvas через реальные координаты viewport. */
  async clickOnCanvas(
    params: ({
      point?: 'center' | 'bottom-right'
    } & ObjectTargetParams) = {}
  ): Promise<void> {
    const {
      point: pointType = 'center',
      ...targetParams
    } = params

    const point = pointType === 'bottom-right'
      ? await this.page.evaluate(({ objectIndex, id }) => {
        const {
          editor,
          __editorHelpers: helpers
        } = window as any

        const target = helpers.resolveCanvasObject(objectIndex, id)
        if (!target) return null

        target.setCoords()

        const corner = target.oCoords?.br
        if (!corner || typeof corner.x !== 'number' || typeof corner.y !== 'number') {
          return null
        }

        const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

        return {
          x: canvasRect.left + corner.x - 12,
          y: canvasRect.top + corner.y - 12
        }
      }, targetParams)
      : await this._resolveTargetCenterPoint(targetParams)

    expect(point, 'для клика по фигуре должны существовать координаты на canvas').not.toBeNull()

    const resolvedPoint = point as {
      x: number
      y: number
    }

    await this.page.mouse.click(resolvedPoint.x, resolvedPoint.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Открывает редактирование текста внутри фигуры через реальный двойной клик по canvas. */
  async openTextEditingFromCanvas(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    const point = await this._resolveTargetCenterPoint(params)

    await this.page.mouse.dblclick(point.x, point.y)
    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Кликает в горизонтальную область отступа текста внутри фигуры через реальные координаты canvas. */
  async clickTextInset(
    params: {
      side: 'left' | 'right'
    } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    const {
      side,
      ...targetParams
    } = params
    const { insetPoint } = await this._resolveTextInsetInteractionPoints({
      side,
      ...targetParams
    })

    await this.page.mouse.click(insetPoint.x, insetPoint.y)
    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(targetParams)
  }

  /** Начинает выделение текста из горизонтальной области отступа и протягивает курсор внутрь текста. */
  async dragTextSelectionFromInset(
    params: {
      side: 'left' | 'right'
    } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    const {
      side,
      ...targetParams
    } = params
    const {
      insetPoint,
      textPoint
    } = await this._resolveTextInsetInteractionPoints({
      side,
      ...targetParams
    })

    await this.page.mouse.move(insetPoint.x, insetPoint.y)
    await this.page.mouse.down()
    await waitForCanvasRender({ page: this.page })

    await this.page.mouse.move(textPoint.x, textPoint.y, {
      steps: 8
    })
    await waitForCanvasRender({ page: this.page })

    await this.page.mouse.up()
    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(targetParams)
  }

  /** Наводит курсор на ручку поворота фигуры. */
  async hoverRotateHandle(params: ObjectTargetParams = {}): Promise<void> {
    const point = await this._resolveControlPoint({
      corner: 'mtr',
      ...params
    })

    await this.page.mouse.move(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Начинает взаимодействие с ручкой поворота фигуры. */
  async startRotateFromHandle(params: ObjectTargetParams = {}): Promise<void> {
    const point = await this._resolveControlPoint({
      corner: 'mtr',
      ...params
    })

    await this.page.mouse.move(point.x, point.y)
    await this.page.mouse.down()
    await waitForCanvasRender({ page: this.page })
  }

  /** Завершает текущее pointer-взаимодействие с canvas. */
  async finishPointerInteraction(): Promise<void> {
    await this.page.mouse.up()
    await waitForCanvasRender({ page: this.page })
  }

  /** Включает режим редактирования текста внутри shape */
  async enterTextEditing(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    const editingTextNode = await this.page.evaluate(({ objectIndex, id }) => {
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

    if (!editingTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Меняет текст активного text-edit внутри shape */
  async updateEditingText(params: ShapeTextEditingUpdateParams): Promise<ShapeTextInfo | null> {
    const updatedTextNode = await this.page.evaluate((payload) => {
      const {
        text,
        selectionStart,
        selectionEnd,
        objectIndex,
        id
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      const { hiddenTextarea } = textNode
      const nextSelectionStart = typeof selectionStart === 'number' ? selectionStart : text.length
      const nextSelectionEnd = typeof selectionEnd === 'number' ? selectionEnd : nextSelectionStart

      if (hiddenTextarea instanceof HTMLTextAreaElement) {
        hiddenTextarea.value = text
        hiddenTextarea.selectionStart = nextSelectionStart
        hiddenTextarea.selectionEnd = nextSelectionEnd
        hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }))
      } else {
        textNode.set({ text })
        textNode.selectionStart = nextSelectionStart
        textNode.selectionEnd = nextSelectionEnd
        editor.canvas.fire('text:changed', {
          target: textNode
        })
        editor.canvas.requestRenderAll()
      }

      return helpers.serializeShapeTextObject(textNode)
    }, params)

    if (!updatedTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Обновляет стиль текста внутри фигуры, пока открыт режим редактирования. */
  async updateTextStyleInEditing(
    params: { style: ShapeTextStyleParams } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    const updatedTextNode = await this.page.evaluate(({ style, objectIndex, id }) => {
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

    if (!updatedTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Завершает редактирование текста внутри shape */
  async exitTextEditing(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    const editingTextNode = await this.page.evaluate(({ objectIndex, id }) => {
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

    if (!editingTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
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

      if (typeof textNode.setSelectionStart === 'function') {
        textNode.setSelectionStart(start)
      } else {
        textNode.selectionStart = start
      }

      if (typeof textNode.setSelectionEnd === 'function') {
        textNode.setSelectionEnd(end)
      } else {
        textNode.selectionEnd = end
      }
      const { hiddenTextarea } = textNode

      if (hiddenTextarea instanceof HTMLTextAreaElement) {
        hiddenTextarea.focus()
        hiddenTextarea.selectionStart = start
        hiddenTextarea.selectionEnd = end
      }

      return helpers.serializeShapeTextObject(textNode)
    }, params)
  }

  /** Удаляет выделенный текст внутри shape через реальное keyboard-событие. */
  async deleteSelectedText(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    await this.page.keyboard.press('Delete')
    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Вводит текст внутрь shape в текущую позицию курсора через реальные keyboard-события. */
  async typeText(params: { text: string } & ObjectTargetParams): Promise<ShapeTextInfo | null> {
    const {
      text,
      ...targetParams
    } = params
    const parts = text.split('\n')

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]
      if (part.length > 0) {
        await this.page.keyboard.type(part)
      }

      if (index < parts.length - 1) {
        await this.page.keyboard.press('Enter')
      }
    }

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(targetParams)
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

  /** Проверяет, что текст остаётся внутри внутренней области шейпа после вычета обводки. */
  checkTextInsideStrokeSafeArea(params: {
    snapshot: ShapeScaleSnapshot
    tolerance?: number
  }): {
    left: number
    top: number
    right: number
    bottom: number
  } {
    const {
      snapshot,
      tolerance = 1.5
    } = params

    expect(
      snapshot.shapeStrokeWidth,
      'ширина обводки должна существовать для проверки текста внутри обводки'
    ).not.toBeNull()
    expect(snapshot.shapeBoundsLeft, 'левая граница шейпа должна существовать').not.toBeNull()
    expect(snapshot.shapeBoundsTop, 'верхняя граница шейпа должна существовать').not.toBeNull()
    expect(snapshot.shapeBoundsRight, 'правая граница шейпа должна существовать').not.toBeNull()
    expect(snapshot.shapeBoundsBottom, 'нижняя граница шейпа должна существовать').not.toBeNull()
    expect(snapshot.textBoundsLeft, 'левая граница текста должна существовать').not.toBeNull()
    expect(snapshot.textBoundsTop, 'верхняя граница текста должна существовать').not.toBeNull()
    expect(snapshot.textBoundsRight, 'правая граница текста должна существовать').not.toBeNull()
    expect(snapshot.textBoundsBottom, 'нижняя граница текста должна существовать').not.toBeNull()

    if (
      snapshot.shapeStrokeWidth === null
      || snapshot.shapeBoundsLeft === null
      || snapshot.shapeBoundsTop === null
      || snapshot.shapeBoundsRight === null
      || snapshot.shapeBoundsBottom === null
      || snapshot.textBoundsLeft === null
      || snapshot.textBoundsTop === null
      || snapshot.textBoundsRight === null
      || snapshot.textBoundsBottom === null
    ) {
      throw new Error('для проверки текста внутри обводки должны существовать bounds шейпа, текста и strokeWidth')
    }

    const safeLeft = snapshot.shapeBoundsLeft + snapshot.shapeStrokeWidth
    const safeTop = snapshot.shapeBoundsTop + snapshot.shapeStrokeWidth
    const safeRight = snapshot.shapeBoundsRight - snapshot.shapeStrokeWidth
    const safeBottom = snapshot.shapeBoundsBottom - snapshot.shapeStrokeWidth

    expect(snapshot.textBoundsLeft).toBeGreaterThanOrEqual(safeLeft - tolerance)
    expect(snapshot.textBoundsTop).toBeGreaterThanOrEqual(safeTop - tolerance)
    expect(snapshot.textBoundsRight).toBeLessThanOrEqual(safeRight + tolerance)
    expect(snapshot.textBoundsBottom).toBeLessThanOrEqual(safeBottom + tolerance)

    return {
      left: snapshot.textBoundsLeft,
      top: snapshot.textBoundsTop,
      right: snapshot.textBoundsRight,
      bottom: snapshot.textBoundsBottom
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
