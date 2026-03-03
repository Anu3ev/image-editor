/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type { EditorObjectInfo, CanvasStateInfo, MontageAreaInfo } from '../types'
import { ShapeModel } from './shape.model'
import { CanvasModel } from './canvas.model'

export class EditorModel {
  readonly shapes: ShapeModel

  readonly canvas: CanvasModel

  constructor(readonly page: Page) {
    this.shapes = new ShapeModel(page)
    this.canvas = new CanvasModel(page)
  }

  /**
   * Инжектирует вспомогательные функции в контекст браузера.
   * Должен быть вызван до page.goto()
   */
  async injectBrowserHelpers(): Promise<void> {
    await this.page.addInitScript(() => {
      const w = window as any

      w.__serializeEditorObject = (obj: any) => ({
        id: obj.id,
        type: obj.type,
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        fill: obj.fill ?? null,
        stroke: obj.stroke ?? null,
        strokeWidth: obj.strokeWidth ?? 0,
        opacity: obj.opacity ?? 1,
        visible: obj.visible ?? true,
        selectable: obj.selectable ?? true,
        flipX: obj.flipX ?? false,
        flipY: obj.flipY ?? false
      })

      w.__serializeShapeObject = (obj: any) => ({
        ...w.__serializeEditorObject(obj),
        shapeComposite: obj.shapeComposite ?? false,
        shapePresetKey: obj.shapePresetKey ?? '',
        shapeAlignHorizontal: obj.shapeAlignHorizontal ?? 'center',
        shapeAlignVertical: obj.shapeAlignVertical ?? 'middle',
        shapeFill: obj.shapeFill,
        shapeStroke: obj.shapeStroke,
        shapeStrokeWidth: obj.shapeStrokeWidth,
        shapeOpacity: obj.shapeOpacity,
        shapeRounding: obj.shapeRounding
      })

      w.__resolveTarget = (objectIndex?: number, id?: string) => {
        if (id !== undefined) return id
        if (objectIndex !== undefined) return w.editor.canvasManager.getObjects()[objectIndex]
        return undefined
      }
    })
  }

  /** Ожидает полной инициализации редактора */
  async waitForReady(): Promise<void> {
    await this.page.waitForFunction(() => {
      const { editor } = window as any
      return Boolean(editor?.canvas && editor?.templateManager)
    })
  }

  /** Возвращает снимок текущего состояния canvas */
  async getCanvasState(): Promise<CanvasStateInfo> {
    return this.page.evaluate(() => {
      const { canvas, canvasManager } = (window as any).editor
      return {
        width: canvas.getWidth(),
        height: canvas.getHeight(),
        zoom: canvas.getZoom(),
        objectCount: canvasManager.getObjects().length
      }
    })
  }

  /** Возвращает список пользовательских объектов canvas (без служебных) */
  async getObjects(): Promise<EditorObjectInfo[]> {
    return this.page.evaluate(() => {
      const w = window as any
      return w.editor.canvasManager.getObjects().map(w.__serializeEditorObject)
    })
  }

  /** Возвращает текущий активный (выделенный) объект или null */
  async getActiveObject(): Promise<EditorObjectInfo | null> {
    return this.page.evaluate(() => {
      const w = window as any
      const obj = w.editor.canvas.getActiveObject()
      if (!obj) return null
      return w.__serializeEditorObject(obj)
    })
  }

  /** Проверяет что количество пользовательских объектов на canvas равно ожидаемому */
  async checkObjectCount(params: { count: number }): Promise<void> {
    const objects = await this.getObjects()
    expect(objects, `ожидается ${params.count} объектов на canvas`).toHaveLength(params.count)
  }

  /** Возвращает информацию о montage area */
  async getMontageArea(): Promise<MontageAreaInfo> {
    return this.page.evaluate(() => {
      const { montageArea } = (window as any).editor
      return {
        width: montageArea.width,
        height: montageArea.height,
        left: montageArea.left,
        top: montageArea.top
      }
    })
  }
}
