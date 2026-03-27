/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  EditorObjectInfo,
  CanvasStateInfo,
  MontageAreaInfo,
  MontageAreaBoundsInfo,
  MontageAreaViewportBoundsInfo
} from '../types'
import { ShapeModel } from './shape.model'
import { CanvasModel } from './canvas.model'
import { HistoryModel } from './history.model'
import { ClipboardModel } from './clipboard.model'
import { TemplateModel } from './template.model'
import { TextModel } from './text.model'
import { SnappingModel } from './snapping.model'
import { BackgroundModel } from './background.model'
import { InteractionBlockerModel } from './interaction-blocker.model'
import { ImageModel } from './image.model'

export class EditorModel {
  readonly shapes: ShapeModel

  readonly canvas: CanvasModel

  readonly history: HistoryModel

  readonly clipboard: ClipboardModel

  readonly template: TemplateModel

  readonly text: TextModel

  readonly snapping: SnappingModel

  readonly background: BackgroundModel

  readonly interactionBlocker: InteractionBlockerModel

  readonly images: ImageModel

  constructor(readonly page: Page) {
    this.shapes = new ShapeModel(page)
    this.canvas = new CanvasModel(page)
    this.history = new HistoryModel(page)
    this.clipboard = new ClipboardModel(page)
    this.template = new TemplateModel(page)
    this.text = new TextModel(page)
    this.snapping = new SnappingModel(page)
    this.background = new BackgroundModel(page)
    this.interactionBlocker = new InteractionBlockerModel(page)
    this.images = new ImageModel(page)
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
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      return editor.canvasManager.getObjects().map(helpers.serializeEditorObject)
    })
  }

  /** Возвращает текущий активный (выделенный) объект или null */
  async getActiveObject(): Promise<EditorObjectInfo | null> {
    return this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const obj = editor.canvas.getActiveObject()
      if (!obj) return null

      return helpers.serializeEditorObject(obj)
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

  /** Возвращает границы montage area в координатах canvas-сцены. */
  async getMontageAreaBounds(): Promise<MontageAreaBoundsInfo> {
    return this.page.evaluate(() => {
      const { montageArea } = (window as any).editor

      montageArea.setCoords()
      const bounds = montageArea.getBoundingRect(false, true)
      const left = typeof bounds.left === 'number' ? bounds.left : 0
      const top = typeof bounds.top === 'number' ? bounds.top : 0
      const width = typeof bounds.width === 'number' ? bounds.width : 0
      const height = typeof bounds.height === 'number' ? bounds.height : 0

      return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        centerX: left + (width / 2),
        centerY: top + (height / 2)
      }
    })
  }

  /** Возвращает положение монтажной области в viewport-координатах canvas. */
  async getMontageAreaViewportBounds(): Promise<MontageAreaViewportBoundsInfo> {
    const viewportBounds = await this.page.evaluate(() => {
      const { editor } = (window as any)
      const {
        canvas,
        montageArea
      } = editor

      montageArea.setCoords()

      const tl = montageArea.oCoords?.tl
      const tr = montageArea.oCoords?.tr
      const br = montageArea.oCoords?.br
      const bl = montageArea.oCoords?.bl

      if (!tl || !tr || !br || !bl) return null

      const montageLeft = Math.min(tl.x, tr.x, br.x, bl.x)
      const montageTop = Math.min(tl.y, tr.y, br.y, bl.y)
      const montageRight = Math.max(tl.x, tr.x, br.x, bl.x)
      const montageBottom = Math.max(tl.y, tr.y, br.y, bl.y)
      const montageWidth = montageRight - montageLeft
      const montageHeight = montageBottom - montageTop
      const viewportLeft = 0
      const viewportTop = 0
      const viewportWidth = canvas.getWidth()
      const viewportHeight = canvas.getHeight()

      return {
        montageLeft,
        montageTop,
        montageWidth,
        montageHeight,
        montageRight,
        montageBottom,
        montageCenterX: montageLeft + (montageWidth / 2),
        montageCenterY: montageTop + (montageHeight / 2),
        viewportLeft,
        viewportTop,
        viewportWidth,
        viewportHeight,
        viewportRight: viewportLeft + viewportWidth,
        viewportBottom: viewportTop + viewportHeight,
        viewportCenterX: viewportLeft + (viewportWidth / 2),
        viewportCenterY: viewportTop + (viewportHeight / 2)
      }
    })

    expect(viewportBounds, 'должны существовать viewport-границы монтажной области').not.toBeNull()

    return viewportBounds as MontageAreaViewportBoundsInfo
  }

  /** Меняет размер окна браузера и ждёт, пока редактор завершит реакцию на resize. */
  async resizeViewport(params: { width: number, height: number }): Promise<void> {
    const {
      width,
      height
    } = params

    await this.page.setViewportSize({
      width,
      height
    })

    await this.page.waitForFunction(
      ({ nextWidth, nextHeight }) => window.innerWidth === nextWidth && window.innerHeight === nextHeight,
      {
        nextWidth: width,
        nextHeight: height
      }
    )

    await this.page.evaluate(async() => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
    })
  }

  /** Отправляет в редактор hotkey undo через DOM-событие документа. */
  async pressUndoHotkey(): Promise<void> {
    await this.page.evaluate(async() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      }))
      document.dispatchEvent(new KeyboardEvent('keyup', {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        bubbles: true
      }))

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
    })
  }

  /** Отправляет в редактор hotkey redo через DOM-событие документа. */
  async pressRedoHotkey(): Promise<void> {
    await this.page.evaluate(async() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'y',
        code: 'KeyY',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      }))
      document.dispatchEvent(new KeyboardEvent('keyup', {
        key: 'y',
        code: 'KeyY',
        ctrlKey: true,
        bubbles: true
      }))

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
    })
  }

  /** Отправляет Ctrl + wheel на DOM-границу canvas и ждёт завершения рендера. */
  async zoomByCtrlWheel(params: { deltaY: number }): Promise<void> {
    await this.page.evaluate(async({ deltaY }) => {
      const { editor } = window as any
      const rect = editor.canvas.wrapperEl.getBoundingClientRect()

      editor.canvas.wrapperEl.dispatchEvent(new WheelEvent('wheel', {
        deltaY,
        ctrlKey: true,
        clientX: rect.left + (rect.width / 2),
        clientY: rect.top + (rect.height / 2),
        bubbles: true,
        cancelable: true
      }))

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
    }, params)
  }
}
