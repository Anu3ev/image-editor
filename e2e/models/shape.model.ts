/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ShapeObjectInfo,
  ShapeAddParams,
  ShapeUpdateParams,
  ShapeStrokeParams,
  ShapeTextAlignParams,
  ShapePresetKey,
  ObjectTargetParams
} from '../types'

export class ShapeModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Добавляет shape на canvas и возвращает информацию о созданном объекте */
  async add(params: ShapeAddParams = {}): Promise<ShapeObjectInfo | null> {
    return this.page.evaluate(async(p) => {
      const w = window as any
      const shape = await w.editor.shapeManager.add(p)
      if (!shape) return null
      return w.__serializeShapeObject(shape)
    }, params)
  }

  /** Удаляет shape. По умолчанию — активный объект */
  async remove(params: ObjectTargetParams = {}): Promise<boolean> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const w = window as any
      const target = w.__resolveTarget(objectIndex, id)
      return w.editor.shapeManager.remove({ target })
    }, params)
  }

  /** Устанавливает заливку shape. По умолчанию — для активного объекта */
  async setFill(params: { fill: string } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(({ fill, objectIndex, id }) => {
      const w = window as any
      const target = w.__resolveTarget(objectIndex, id)
      w.editor.shapeManager.setFill({ target, fill })
    }, params)
  }

  /** Устанавливает обводку shape. По умолчанию — для активного объекта */
  async setStroke(params: ShapeStrokeParams & ObjectTargetParams = {}): Promise<void> {
    await this.page.evaluate(({ stroke, strokeWidth, dash, objectIndex, id }) => {
      const w = window as any
      const target = w.__resolveTarget(objectIndex, id)
      w.editor.shapeManager.setStroke({ target, stroke, strokeWidth, dash })
    }, params)
  }

  /** Устанавливает прозрачность shape. По умолчанию — для активного объекта */
  async setOpacity(params: { opacity: number } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(({ opacity, objectIndex, id }) => {
      const w = window as any
      const target = w.__resolveTarget(objectIndex, id)
      w.editor.shapeManager.setOpacity({ target, opacity })
    }, params)
  }

  /** Устанавливает скругление shape. По умолчанию — для активного объекта */
  async setRounding(params: { rounding: number } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(async({ rounding, objectIndex, id }) => {
      const w = window as any
      const target = w.__resolveTarget(objectIndex, id)
      await w.editor.shapeManager.setRounding({ target, rounding })
    }, params)
  }

  /** Обновляет shape — меняет пресет, размеры, стили. Сохраняет позицию и текст */
  async update(params: ShapeUpdateParams & ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    return this.page.evaluate(async({ presetKey, options, objectIndex, id }) => {
      const w = window as any
      const target = w.__resolveTarget(objectIndex, id)
      const result = await w.editor.shapeManager.update({ target, presetKey, options })
      if (!result) return null
      return w.__serializeShapeObject(result)
    }, params)
  }

  /** Устанавливает выравнивание текста внутри shape */
  async setTextAlign(params: ShapeTextAlignParams & ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    return this.page.evaluate(({ horizontal, vertical, objectIndex, id }) => {
      const w = window as any
      const target = w.__resolveTarget(objectIndex, id)
      const result = w.editor.shapeManager.setTextAlign({ target, horizontal, vertical })
      if (!result) return null
      return w.__serializeShapeObject(result)
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

  /** Возвращает список shape-объектов на canvas */
  async getShapeObjects(): Promise<ShapeObjectInfo[]> {
    return this.page.evaluate(() => {
      const w = window as any
      return w.editor.canvasManager.getObjects()
        .filter((obj: any) => Boolean(obj.shapeComposite))
        .map(w.__serializeShapeObject)
    })
  }
}
