/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  EditorObjectInfo,
  CanvasStateInfo,
  CanvasViewportTransformInfo,
  MontageAreaInfo,
  MontageAreaBoundsInfo,
  MontageAreaViewportBoundsInfo,
  ObjectSizeIndicatorInfo,
  VisibleObjectSizeIndicatorInfo,
  ViewportPanInfo,
  ViewportScrollbarInfo,
  ViewportBoundsInfo,
  ObjectTargetParams,
  SnappingObjectSnapshot
} from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'
import { ShapeModel } from './shape/shape.model'
import { CanvasModel } from './canvas.model'
import { HistoryModel } from './history.model'
import { ClipboardModel } from './clipboard.model'
import { TemplateModel } from './template.model'
import { TextModel } from './text.model'
import { SnappingModel } from './snapping.model'
import { BackgroundModel } from './background.model'
import { InteractionBlockerModel } from './interaction-blocker.model'
import { ImageModel } from './image.model'
import { ToolbarModel } from './toolbar.model'
import { SelectionModel } from './selection.model'
import { GroupingModel } from './grouping.model'
import { CropModel } from './crop.model'

/** Результат отправки DOM input-событий в canvas wrapper. */
type WheelInputDispatchState = {
  canceledEvents: number
  dispatchedEvents: number
}

/** Параметры последовательности wheel-событий для browser context. */
type WheelInputDispatchParams = {
  ctrlKey?: boolean
  deltaXSteps?: number[]
  deltaYSteps: number[]
  deltaMode?: number
}

/** Параметры drag viewport через Space + ЛКМ. */
type ViewportSpaceDragParams = {
  deltaX: number
  deltaY: number
}

/** Параметры drag DOM-thumb viewport-скроллбара. */
type ViewportScrollbarThumbDragParams = {
  axis: 'horizontal' | 'vertical'
  delta: number
}

const FULL_TRACKPAD_PINCH_IN_DELTA_STEPS = [-5, -5, -5, -5, -5, -5, -5, -5, -5, -5]
const FULL_TRACKPAD_PINCH_OUT_DELTA_STEPS = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
const DOM_DELTA_PIXEL = 0
const VIEWPORT_PAN_ZOOM_ATTEMPTS = 6

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

  readonly toolbar: ToolbarModel

  readonly selection: SelectionModel

  readonly grouping: GroupingModel

  readonly crop: CropModel

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
    this.toolbar = new ToolbarModel(page)
    this.selection = new SelectionModel(page)
    this.grouping = new GroupingModel(page)
    this.crop = new CropModel(page)
  }

  /** Отправляет hotkey на body, чтобы DOM-событие имело корректный element target. */
  private async _pressEditorHotkey({
    key,
    code,
    ctrlKey = true
  }: {
    key: string
    code: string
    ctrlKey?: boolean
  }): Promise<void> {
    await this.page.evaluate((params) => {
      const target = document.body

      target.dispatchEvent(new KeyboardEvent('keydown', {
        ...params,
        bubbles: true,
        cancelable: true
      }))
      target.dispatchEvent(new KeyboardEvent('keyup', {
        ...params,
        bubbles: true
      }))
    }, {
      key,
      code,
      ctrlKey
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Ожидает финальное состояние редактора после завершения init(), а не раннее появление window.editor. */
  async waitForReady(): Promise<void> {
    await this.page.waitForFunction(() => {
      const { editor } = window as any

      if (!editor?.canvas) return false
      if (!editor.historyManager?.baseState) return false
      if (!editor.listeners) return false
      if (!editor.canvas.lowerCanvasEl?.isConnected) return false
      if (!editor.canvas.upperCanvasEl?.isConnected) return false

      return editor.canvas.getWidth() > 0 && editor.canvas.getHeight() > 0
    })

    await waitForCanvasRender({ page: this.page })
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

  /** Возвращает текущее смещение viewportTransform и zoom canvas. */
  async getCanvasViewportTransform(): Promise<CanvasViewportTransformInfo> {
    return this.page.evaluate(() => {
      const { canvas } = (window as any).editor
      const vpt = canvas.viewportTransform

      return {
        x: vpt[4],
        y: vpt[5],
        zoom: canvas.getZoom()
      }
    })
  }

  /** Возвращает pan-состояние viewport из production PanConstraintManager. */
  async getViewportPanState(): Promise<ViewportPanInfo> {
    return this.page.evaluate(() => {
      const { panConstraintManager } = (window as any).editor
      const state = panConstraintManager.getViewportPanState()

      return {
        canPan: state.canPan,
        horizontal: {
          canPan: state.horizontal.canPan,
          current: state.horizontal.current,
          max: state.horizontal.max,
          min: state.horizontal.min,
          ratio: state.horizontal.ratio,
          scrollDistance: state.horizontal.scrollDistance
        },
        vertical: {
          canPan: state.vertical.canPan,
          current: state.vertical.current,
          max: state.vertical.max,
          min: state.vertical.min,
          ratio: state.vertical.ratio,
          scrollDistance: state.vertical.scrollDistance
        }
      }
    })
  }

  /** Возвращает DOM-состояние viewport-скроллбаров. */
  async getViewportScrollbarState(): Promise<ViewportScrollbarInfo> {
    return this.page.evaluate(() => {
      const serializeBounds = (element: Element) => {
        const bounds = element.getBoundingClientRect()

        return {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
          right: bounds.right,
          bottom: bounds.bottom,
          centerX: bounds.left + bounds.width / 2,
          centerY: bounds.top + bounds.height / 2
        }
      }
      const resolveAxis = (axis: 'horizontal' | 'vertical') => {
        const track = document.querySelector(`[data-editor-scrollbar="${axis}"]`)
        const thumb = document.querySelector(`[data-editor-scrollbar-thumb="${axis}"]`)

        if (!track || !thumb) {
          throw new Error(`viewport-скроллбар ${axis} должен существовать`)
        }

        const style = window.getComputedStyle(track)

        return {
          thumb: serializeBounds(thumb),
          track: serializeBounds(track),
          visible: style.display !== 'none'
        }
      }

      return {
        horizontal: resolveAxis('horizontal'),
        vertical: resolveAxis('vertical')
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

  /** Возвращает текущее состояние DOM-индикатора размеров объекта. */
  async getObjectSizeIndicator(): Promise<ObjectSizeIndicatorInfo> {
    return this.page.evaluate(() => {
      const indicator = document.querySelector('.fabric-editor-object-size-indicator')
      if (!(indicator instanceof HTMLDivElement)) {
        return {
          visible: false,
          text: '',
          width: null,
          height: null
        }
      }

      const style = window.getComputedStyle(indicator)
      const bounds = indicator.getBoundingClientRect()
      const text = indicator.textContent ?? ''
      const match = text.match(/ширина:\s*([\d\s]+)\s+высота:\s*([\d\s]+)/)
      const width = match ? Number(match[1].replace(/\s/g, '')) : null
      const height = match ? Number(match[2].replace(/\s/g, '')) : null

      return {
        visible: style.display !== 'none'
          && style.visibility !== 'hidden'
          && bounds.width > 0
          && bounds.height > 0,
        text,
        width,
        height
      }
    })
  }

  /** Возвращает видимый DOM-индикатор размеров объекта или падает с понятной причиной. */
  async requireObjectSizeIndicator(): Promise<VisibleObjectSizeIndicatorInfo> {
    const indicator = await this.getObjectSizeIndicator()

    expect(indicator.visible, 'индикатор размеров объекта должен быть видимым').toBe(true)
    expect(indicator.width, 'индикатор размеров должен содержать ширину').not.toBeNull()
    expect(indicator.height, 'индикатор размеров должен содержать высоту').not.toBeNull()

    if (indicator.width === null || indicator.height === null) {
      throw new Error('индикатор размеров объекта должен содержать ширину и высоту')
    }

    return {
      ...indicator,
      visible: true,
      width: indicator.width,
      height: indicator.height
    }
  }

  /** Возвращает snapshot объекта canvas с актуальным bounding box. */
  async getObjectSnapshot(params: ObjectTargetParams = {}): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot объекта').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Возвращает viewport-границы объекта canvas в системе координат canvas. */
  async getObjectViewportBounds(params: ObjectTargetParams = {}): Promise<ViewportBoundsInfo> {
    const bounds = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.setCoords()

      const tl = target.oCoords?.tl
      const tr = target.oCoords?.tr
      const br = target.oCoords?.br
      const bl = target.oCoords?.bl

      if (!tl || !tr || !br || !bl) return null

      const left = Math.min(tl.x, tr.x, br.x, bl.x)
      const top = Math.min(tl.y, tr.y, br.y, bl.y)
      const right = Math.max(tl.x, tr.x, br.x, bl.x)
      const bottom = Math.max(tl.y, tr.y, br.y, bl.y)
      const width = right - left
      const height = bottom - top

      return {
        left,
        top,
        width,
        height,
        right,
        bottom,
        centerX: left + (width / 2),
        centerY: top + (height / 2)
      }
    }, params)

    expect(bounds, 'для объекта должны существовать viewport-границы').not.toBeNull()

    return bounds as ViewportBoundsInfo
  }

  /** Проверяет что количество пользовательских объектов на canvas равно ожидаемому */
  async checkObjectCount(params: { count: number }): Promise<void> {
    const objects = await this.getObjects()
    expect(objects, `ожидается ${params.count} объектов на canvas`).toHaveLength(params.count)
  }

  /** Ждёт, пока количество пользовательских объектов на canvas станет ожидаемым. */
  async waitForObjectCount(params: { count: number }): Promise<void> {
    await this.page.waitForFunction(({ count }) => {
      const { editor } = window as any

      return editor.canvasManager.getObjects().length === count
    }, params)

    await waitForCanvasRender({ page: this.page })
  }

  /** Выделяет все пользовательские объекты на canvas через публичный API редактора. */
  async selectAllObjects(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.selectionManager.selectAll()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Вызывает fitObject для текущего активного объекта через публичный API transformManager. */
  async fitActiveObject(
    params: {
      type?: 'contain' | 'cover'
      fitAsOneObject?: boolean
    } = {}
  ): Promise<void> {
    const fitState = await this.page.evaluate(({ type, fitAsOneObject }) => {
      const { editor } = window as any
      const activeObject = editor.canvas.getActiveObject()

      if (!activeObject) {
        return {
          hadActiveObject: false,
          hasActiveObjectAfter: false
        }
      }

      editor.transformManager.fitObject({
        type,
        fitAsOneObject
      })

      return {
        hadActiveObject: true,
        hasActiveObjectAfter: Boolean(editor.canvas.getActiveObject())
      }
    }, params)

    expect(fitState.hadActiveObject, 'для fitObject должен существовать активный объект').toBe(true)
    expect(fitState.hasActiveObjectAfter, 'после fitObject активный объект не должен теряться').toBe(true)

    await waitForCanvasRender({ page: this.page })
  }

  /** Меняет opacity текущего активного объекта через публичный API transformManager. */
  async setActiveObjectOpacity({ opacity }: { opacity: number }): Promise<void> {
    const hasActiveObject = await this.page.evaluate(({ opacity: nextOpacity }) => {
      const { editor } = window as any
      const activeObject = editor.canvas.getActiveObject()

      if (!activeObject) return false

      editor.transformManager.setActiveObjectOpacity({
        opacity: nextOpacity
      })

      return Boolean(editor.canvas.getActiveObject())
    }, { opacity })

    expect(hasActiveObject, 'для изменения opacity должен существовать активный объект').toBe(true)

    await waitForCanvasRender({ page: this.page })
  }

  /** Возвращает размер шрифта, который сейчас показывает правая панель demo-контролов. */
  async getDisplayedTextFontSize(): Promise<number> {
    const fontSize = await this.page.evaluate(() => {
      const fontSizeInput = document.getElementById('text-font-size')

      if (!(fontSizeInput instanceof HTMLInputElement)) return null

      const parsedFontSize = Number(fontSizeInput.value)
      if (!Number.isFinite(parsedFontSize)) return null

      return parsedFontSize
    })

    expect(fontSize, 'поле размера шрифта должно существовать в demo-панели').not.toBeNull()
    expect(Number.isFinite(fontSize as number), 'размер шрифта в demo-панели должен быть числом').toBe(true)

    return fontSize as number
  }

  /** Блокирует текущий выделенный объект через публичный API редактора. */
  async lockSelectedObject(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.objectLockManager.lockObject()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Удаляет текущий выделенный объект через публичный API редактора. */
  async deleteSelectedObject(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.deletionManager.deleteSelectedObjects()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Разблокирует текущий выделенный объект через публичный API редактора. */
  async unlockSelectedObject(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.objectLockManager.unlockObject()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Отправляет keydown пробела и ждёт завершения реакции редактора. */
  async pressSpaceKey(): Promise<void> {
    await this.page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true
      }))
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Отправляет keyup пробела и ждёт завершения реакции редактора. */
  async releaseSpaceKey(): Promise<void> {
    await this.page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true
      }))
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Возвращает текущее cursor-состояние верхнего canvas слоя. */
  async getCanvasCursorState(): Promise<{
    currentCursor: string
  }> {
    return this.page.evaluate(() => {
      const { editor } = window as any

      return {
        currentCursor: editor.canvas.upperCanvasEl.style.cursor ?? ''
      }
    })
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

    await waitForCanvasRender({ page: this.page })
  }

  /** Отправляет в редактор hotkey undo через DOM-событие body. */
  async pressUndoHotkey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'z',
      code: 'KeyZ'
    })
  }

  /** Отправляет в редактор hotkey redo через DOM-событие body. */
  async pressRedoHotkey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'y',
      code: 'KeyY'
    })
  }

  /** Отправляет в редактор hotkey вырезания через DOM-событие body. */
  async pressCutHotkey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'x',
      code: 'KeyX'
    })
  }

  /** Отправляет в редактор hotkey дублирования через DOM-событие body. */
  async pressDuplicateHotkey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'd',
      code: 'KeyD'
    })
  }

  /**
   * Отправляет последовательность wheel событий в центр canvas wrapper.
   * Ctrl + wheel используется для zoom, wheel без Ctrl — для pan на тачпаде.
   */
  private async _dispatchWheelEvents(params: WheelInputDispatchParams): Promise<WheelInputDispatchState> {
    this._assertWheelInputDispatchParams(params)

    const dispatchState = await this._dispatchWheelEventsInBrowser(params)

    await waitForCanvasRender({ page: this.page })

    return dispatchState
  }

  /**
   * Проверяет согласованность wheel steps перед отправкой в browser context.
   */
  private _assertWheelInputDispatchParams({
    deltaXSteps,
    deltaYSteps
  }: WheelInputDispatchParams): void {
    if (deltaXSteps && deltaXSteps.length !== deltaYSteps.length) {
      throw new Error('deltaXSteps должен совпадать по длине с deltaYSteps')
    }
  }

  /**
   * Выполняет DOM dispatch wheel-событий внутри browser context.
   */
  private async _dispatchWheelEventsInBrowser({
    ctrlKey = false,
    deltaXSteps,
    deltaYSteps,
    deltaMode
  }: WheelInputDispatchParams): Promise<WheelInputDispatchState> {
    return this.page.evaluate(({
      ctrlKey: eventCtrlKey,
      deltaMode: eventDeltaMode,
      deltaXSteps: eventDeltaXSteps,
      deltaYSteps: eventDeltaYSteps
    }) => {
      const { editor } = window as any
      const wrapper = editor.canvas.wrapperEl
      const rect = wrapper.getBoundingClientRect()
      const clientX = rect.left + (rect.width / 2)
      const clientY = rect.top + (rect.height / 2)
      let canceledEvents = 0

      for (let index = 0; index < eventDeltaYSteps.length; index += 1) {
        const deltaY = eventDeltaYSteps[index]
        const deltaX = eventDeltaXSteps?.[index] ?? 0
        const eventInit: WheelEventInit = {
          deltaX,
          deltaY,
          ctrlKey: eventCtrlKey,
          clientX,
          clientY,
          bubbles: true,
          cancelable: true
        }

        if (typeof eventDeltaMode === 'number') {
          eventInit.deltaMode = eventDeltaMode
        }

        const wasNotCanceled = wrapper.dispatchEvent(new WheelEvent('wheel', eventInit))

        if (!wasNotCanceled) {
          canceledEvents += 1
        }
      }

      return {
        canceledEvents,
        dispatchedEvents: eventDeltaYSteps.length
      }
    }, {
      ctrlKey,
      deltaMode,
      deltaXSteps,
      deltaYSteps
    })
  }

  /** Отправляет Ctrl + wheel на DOM-границу canvas и ждёт завершения рендера. */
  async zoomByCtrlWheel(params: { deltaY: number }): Promise<WheelInputDispatchState> {
    return this._dispatchWheelEvents({
      ctrlKey: true,
      deltaYSteps: [params.deltaY]
    })
  }

  /** Отправляет wheel без Ctrl, как двухпальцевый scroll на тачпаде. */
  async panByTrackpadScroll(params: { deltaX: number; deltaY: number }): Promise<WheelInputDispatchState> {
    return this._dispatchWheelEvents({
      deltaMode: DOM_DELTA_PIXEL,
      deltaXSteps: [params.deltaX],
      deltaYSteps: [params.deltaY]
    })
  }

  /** Отправляет серию wheel без Ctrl и возвращается до отложенного render. */
  async panByFastTrackpadScroll(params: {
    deltaXSteps: number[]
    deltaYSteps: number[]
  }): Promise<WheelInputDispatchState> {
    const dispatchParams = {
      deltaMode: DOM_DELTA_PIXEL,
      deltaXSteps: params.deltaXSteps,
      deltaYSteps: params.deltaYSteps
    }

    this._assertWheelInputDispatchParams(dispatchParams)

    return this._dispatchWheelEventsInBrowser(dispatchParams)
  }

  /** Приближает canvas до состояния, когда viewport можно двигать по обеим осям. */
  async zoomInUntilViewportCanMove(): Promise<ViewportPanInfo> {
    for (let attempt = 0; attempt < VIEWPORT_PAN_ZOOM_ATTEMPTS; attempt += 1) {
      const panState = await this.getViewportPanState()

      if (panState.horizontal.canPan && panState.vertical.canPan) {
        return panState
      }

      await this.zoomInByTrackpadPinch()
    }

    const panState = await this.getViewportPanState()

    if (!panState.horizontal.canPan || !panState.vertical.canPan) {
      throw new Error('Viewport должен двигаться по обеим осям после серии pinch-жестов')
    }

    return panState
  }

  /** Двигает viewport настоящим Space + ЛКМ drag по canvas. */
  async dragViewportBySpaceMouse({ deltaX, deltaY }: ViewportSpaceDragParams): Promise<void> {
    const startPoint = await this.page.evaluate(() => {
      const { canvas } = (window as any).editor
      const bounds = canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2
      }
    })

    await this.page.evaluate(() => {
      const { activeElement } = document

      if (activeElement instanceof HTMLElement) {
        activeElement.blur()
      }
    })
    await this.page.keyboard.down('Space')
    await this.page.waitForFunction(() => {
      const { editor } = window as any

      return editor.listeners.isSpacePressed === true
    })
    await this.page.mouse.move(startPoint.x, startPoint.y)
    await this.page.mouse.down()
    await this.page.waitForFunction(() => {
      const { editor } = window as any

      return editor.listeners.isDragging === true
    })
    await this.page.mouse.move(startPoint.x + deltaX, startPoint.y + deltaY)
    await this.page.mouse.up()
    await this.page.keyboard.up('Space')
    await waitForCanvasRender({ page: this.page })
  }

  /** Двигает thumb viewport-скроллбара реальным mouse drag. */
  async dragViewportScrollbarThumb({ axis, delta }: ViewportScrollbarThumbDragParams): Promise<void> {
    const scrollbarState = await this.getViewportScrollbarState()
    const axisState = scrollbarState[axis]
    const trackSize = axis === 'horizontal' ? axisState.track.width : axisState.track.height
    const thumbSize = axis === 'horizontal' ? axisState.thumb.width : axisState.thumb.height

    expect(axisState.visible, `viewport-скроллбар ${axis} должен быть видимым`).toBe(true)
    expect(trackSize, `track viewport-скроллбара ${axis} должен иметь размер`).toBeGreaterThan(0)
    expect(thumbSize, `thumb viewport-скроллбара ${axis} должен быть меньше track`).toBeLessThan(trackSize)

    const startPoint = {
      x: axisState.thumb.centerX,
      y: axisState.thumb.centerY
    }
    const endPoint = {
      x: axis === 'horizontal' ? startPoint.x + delta : startPoint.x,
      y: axis === 'vertical' ? startPoint.y + delta : startPoint.y
    }

    await this.page.mouse.move(startPoint.x, startPoint.y)
    await this.page.mouse.down()
    await this.page.mouse.move(endPoint.x, endPoint.y)
    await this.page.mouse.up()
    await waitForCanvasRender({ page: this.page })
  }

  /** Отправляет мелкие Ctrl + wheel события, как при pinch-жесте на тачпаде. */
  async zoomInByTrackpadPinch(): Promise<WheelInputDispatchState> {
    return this._dispatchWheelEvents({
      ctrlKey: true,
      deltaMode: DOM_DELTA_PIXEL,
      deltaYSteps: FULL_TRACKPAD_PINCH_IN_DELTA_STEPS
    })
  }

  /** Отправляет мелкие Ctrl + wheel события, как при обратном pinch-жесте на тачпаде. */
  async zoomOutByTrackpadPinch(): Promise<WheelInputDispatchState> {
    return this._dispatchWheelEvents({
      ctrlKey: true,
      deltaMode: DOM_DELTA_PIXEL,
      deltaYSteps: FULL_TRACKPAD_PINCH_OUT_DELTA_STEPS
    })
  }

  /** Отправляет WebKit gesture-события, как Safari fallback для pinch-жеста. */
  async zoomInByWebKitGesturePinch(): Promise<WheelInputDispatchState> {
    const dispatchState = await this.page.evaluate(() => {
      const { editor } = window as any
      const wrapper = editor.canvas.wrapperEl
      const rect = wrapper.getBoundingClientRect()
      const clientX = rect.left + (rect.width / 2)
      const clientY = rect.top + (rect.height / 2)
      let canceledEvents = 0

      for (const eventInit of [
        { type: 'gesturestart', scale: 1 },
        { type: 'gesturechange', scale: 1.3 },
        { type: 'gestureend', scale: 1.3 }
      ]) {
        const event = new Event(eventInit.type, {
          bubbles: true,
          cancelable: true
        })

        Object.defineProperty(event, 'scale', { value: eventInit.scale })
        Object.defineProperty(event, 'clientX', { value: clientX })
        Object.defineProperty(event, 'clientY', { value: clientY })

        const wasNotCanceled = wrapper.dispatchEvent(event)

        if (!wasNotCanceled) {
          canceledEvents += 1
        }
      }

      return {
        canceledEvents,
        dispatchedEvents: 3
      }
    })

    await waitForCanvasRender({ page: this.page })

    return dispatchState
  }
}
