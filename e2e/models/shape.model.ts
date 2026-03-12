/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ShapeObjectInfo,
  ShapeTextInfo,
  ShapeAddParams,
  ShapeUpdateParams,
  ShapeStrokeParams,
  ShapeTextAlignParams,
  ShapeTextStyleParams,
  ShapeScaleStepParams,
  ShapeScaleSnapshot,
  ShapePresetKey,
  ShapeHorizontalAlign,
  ShapeVerticalAlign,
  ObjectTargetParams,
  ShapeTextSelectionParams,
  ShapeTextSelectionStyleInfo
} from '../types'

export class ShapeModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
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

  /** Удаляет shape. По умолчанию — активный объект */
  async remove(params: ObjectTargetParams = {}): Promise<boolean> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
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

      const target = helpers.resolveTarget(objectIndex, id)
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

      const target = helpers.resolveTarget(objectIndex, id)
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

      const target = helpers.resolveTarget(objectIndex, id)
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

      const target = helpers.resolveTarget(objectIndex, id)
      await editor.shapeManager.setRounding({ target, rounding })
    }, params)
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

  /** Выполняет один live-шаг интерактивного масштабирования и возвращает snapshot состояния */
  async simulateScaleStep(params: ShapeScaleStepParams): Promise<ShapeScaleSnapshot | null> {
    return this.page.evaluate((payload) => {
      const {
        scaleX,
        scaleY,
        corner = 'br',
        originX = 'left',
        originY = 'top',
        objectIndex,
        id
      } = payload

      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      if (!target) return null

      const left = typeof target.left === 'number' ? target.left : 0
      const top = typeof target.top === 'number' ? target.top : 0

      target.set({
        scaleX,
        scaleY
      })
      target.setCoords()

      editor.canvas.fire('object:scaling', {
        target,
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
  }

  /** Завершает интерактивное масштабирование через object:modified и возвращает snapshot состояния */
  async finishScale(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      if (!target) return null

      editor.canvas.fire('object:modified', {
        target
      })

      return helpers.serializeShapeScaleSnapshot(target)
    }, params)
  }

  /** Возвращает текущий snapshot состояния shape-группы для проверок live-scale */
  async getScaleSnapshot(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const { __editorHelpers: helpers } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      if (!target) return null

      return helpers.serializeShapeScaleSnapshot(target)
    }, params)
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
      textNode.isEditing = true
      textNode.enterEditing()
      textNode.selectAll()
      editor.canvas.fire('text:editing:entered', {
        target: textNode
      })

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

      textNode.set({ text })
      editor.canvas.fire('text:changed', {
        target: textNode
      })

      return helpers.serializeShapeTextObject(textNode)
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
      textNode.isEditing = false
      editor.canvas.fire('text:editing:exited', {
        target: textNode
      })

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

  /**
   * Проверяет что snapshot live-scale получен корректно.
   * Возвращает гарантированно не-null ShapeScaleSnapshot
   */
  checkScaleSnapshot(params: { snapshot: ShapeScaleSnapshot | null, message: string }): ShapeScaleSnapshot {
    const {
      snapshot,
      message
    } = params

    expect(snapshot, message).not.toBeNull()

    return snapshot as ShapeScaleSnapshot
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
