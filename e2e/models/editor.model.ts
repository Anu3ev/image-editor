/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  EditorObjectInfo,
  EditorRemountInfo,
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
  DeleteSkippedEventInfo,
  ObjectTargetParams,
  SnappingObjectSnapshot
} from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'
import { ShapeModel } from './shape/shape.model'
import { CanvasModel } from './canvas.model'
import { HistoryModel } from './history.model'
import { ClipboardModel } from './clipboard.model'
import { TemplateModel } from './template.model'
import { TextModel } from './text/text.model'
import { SnappingModel } from './snapping.model'
import { MeasurementModel } from './measurement.model'
import { BackgroundModel } from './background.model'
import { InteractionBlockerModel } from './interaction-blocker.model'
import { ImageModel } from './image/image.model'
import { ToolbarModel } from './toolbar.model'
import { SelectionModel } from './selection/selection.model'
import { GroupingModel } from './grouping.model'
import { CropModel } from './crop/crop.model'

/** Result of dispatching DOM input events to the canvas wrapper. */
type WheelInputDispatchState = {
  canceledEvents: number
  dispatchedEvents: number
}

/** Options for a sequence of wheel events in the browser context. */
type WheelInputDispatchParams = {
  ctrlKey?: boolean
  deltaXSteps?: number[]
  deltaYSteps: number[]
  deltaMode?: number
}

/** Options for dragging the viewport with Space + left mouse button. */
type ViewportSpaceDragParams = {
  deltaX: number
  deltaY: number
}

/** Options for dragging the viewport scrollbar's DOM thumb. */
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

  readonly measurement: MeasurementModel

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
    this.measurement = new MeasurementModel(page)
    this.background = new BackgroundModel(page)
    this.interactionBlocker = new InteractionBlockerModel(page)
    this.images = new ImageModel(page)
    this.toolbar = new ToolbarModel(page)
    this.selection = new SelectionModel({
      page,
      shapes: this.shapes
    })
    this.grouping = new GroupingModel(page)
    this.crop = new CropModel(page)
  }

  /** Sends a hotkey to body so the DOM event has the correct element target. */
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

  /** Waits for the final editor state after init() completes, rather than the early appearance of window.editor. */
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

  /** Destroys the editor and remounts it through the same public initEditor. */
  async destroyAndRemount(): Promise<EditorRemountInfo> {
    const result = await this.page.evaluate(async() => {
      const { editor: previous } = window as any
      const previousCanvas = previous.canvas.lowerCanvasEl as HTMLCanvasElement
      const previousUpperCanvas = previous.canvas.upperCanvasEl as HTMLCanvasElement
      const modulePath = '/js/editor-module-loader.js'
      const { loadEditorModule } = await import(modulePath)
      const { default: initEditor } = await loadEditorModule()

      previous.destroy()
      const remainingRegistration = window.editor
      // After delete, the browser may return the host by ID through Window named access.
      const registrationRemoved = remainingRegistration === undefined
        || remainingRegistration === previous.options.editorContainer
      const replacement = await initEditor('editor', previous.options)

      return {
        previousEditorId: previous.editorId,
        editorId: replacement.editorId,
        registrationRemoved,
        replacementRegistered: window.editor === replacement,
        previousCanvasConnected: previousCanvas.isConnected,
        previousUpperCanvasConnected: previousUpperCanvas.isConnected,
        canvasCount: replacement.options.editorContainer.querySelectorAll('canvas').length
      }
    })

    await this.waitForReady()
    return result
  }

  /** Enables the e2e rule protecting objects with the specified customData.handle. */
  async useCustomDataDeleteGuard(params: { handle: string }): Promise<void> {
    await this.page.evaluate(({ handle }) => {
      const { editor } = window as any
      const hasProtectedHandle = (object: any) => object?.customData?.handle === handle

      editor.options.canDeleteObject = (object: any) => !hasProtectedHandle(object)
      editor.options.prepareObjectClone = (rootObject: any) => {
        const objectsToPrepare = [rootObject]

        for (let index = 0; index < objectsToPrepare.length; index += 1) {
          const object = objectsToPrepare[index]

          if (hasProtectedHandle(object)) {
            delete object.customData.handle
          }

          if (typeof object?.getObjects !== 'function') continue

          const childObjects = object.getObjects()
          if (!Array.isArray(childObjects)) continue

          for (let childIndex = 0; childIndex < childObjects.length; childIndex += 1) {
            objectsToPrepare.push(childObjects[childIndex])
          }
        }
      }
    }, params)
  }

  /** Starts recording deletion-rejection events in the browser-side e2e helper. */
  async startDeleteSkippedEventRecording(): Promise<void> {
    await this.page.evaluate(() => {
      const { __editorHelpers: helpers } = window as any

      helpers.startDeleteSkippedEventRecording()
    })
  }

  /** Returns recorded deletion-rejection events. */
  async getDeleteSkippedEvents(): Promise<DeleteSkippedEventInfo[]> {
    return this.page.evaluate(() => {
      const { __editorHelpers: helpers } = window as any

      return helpers.getDeleteSkippedEventRecords()
    })
  }

  /** Sets a canvas object's customData through the browser-side model boundary. */
  async setObjectCustomData(params: ObjectTargetParams & { customData: Record<string, unknown> }): Promise<void> {
    const updated = await this.page.evaluate(({ customData, id, objectIndex }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)

      if (!target) return false

      if (typeof target.set === 'function') {
        target.set({ customData })
      } else {
        target.customData = customData
      }

      editor.canvas.requestRenderAll()
      return true
    }, params)

    expect(updated, 'объект для установки customData должен существовать').toBe(true)
    await waitForCanvasRender({ page: this.page })
  }

  /** Returns an object's customData.handle or null. */
  async getObjectCustomDataHandle(params: ObjectTargetParams = {}): Promise<string | null> {
    return this.page.evaluate(({ id, objectIndex }) => {
      const { __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      const handle = target?.customData?.handle

      return typeof handle === 'string' ? handle : null
    }, params)
  }

  /** Counts user objects with the specified customData.handle. */
  async countObjectsByCustomDataHandle(params: { handle: string }): Promise<number> {
    return this.page.evaluate(({ handle }) => {
      const { editor } = window as any

      return editor.canvasManager.getObjects().filter((object: any) => {
        return object?.customData?.handle === handle
      }).length
    }, params)
  }

  /** Returns a snapshot of the current canvas state */
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

  /** Returns the current viewportTransform offset and canvas zoom. */
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

  /** Returns viewport pan state from the production PanConstraintManager. */
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

  /** Returns the viewport scrollbars' DOM state. */
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

  /** Returns DOM bounds of the upper canvas layer for real pointer interactions. */
  async getCanvasViewportBounds(): Promise<ViewportBoundsInfo> {
    return this.page.evaluate(() => {
      const { canvas } = (window as any).editor
      const rect = canvas.upperCanvasEl.getBoundingClientRect()

      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
        centerX: rect.left + (rect.width / 2),
        centerY: rect.top + (rect.height / 2)
      }
    })
  }

  /** Returns user canvas objects (excluding internal objects) */
  async getObjects(): Promise<EditorObjectInfo[]> {
    return this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      return editor.canvasManager.getObjects().map(helpers.serializeEditorObject)
    })
  }

  /** Returns the current active (selected) object or null */
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

  /** Returns the current state of the DOM object-size indicator. */
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

  /** Returns the visible DOM object-size indicator or fails with a clear reason. */
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

  /** Returns a canvas-object snapshot with its current bounding box. */
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

  /** Returns a canvas object's viewport bounds in the canvas coordinate system. */
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

  /** Checks that the number of user objects on the canvas matches the expected count */
  async checkObjectCount(params: { count: number }): Promise<void> {
    const objects = await this.getObjects()
    expect(objects, `ожидается ${params.count} объектов на canvas`).toHaveLength(params.count)
  }

  /** Waits for the user-object count on the canvas to match the expected count. */
  async waitForObjectCount(params: { count: number }): Promise<void> {
    await this.page.waitForFunction(({ count }) => {
      const { editor } = window as any

      return editor.canvasManager.getObjects().length === count
    }, params)

    await waitForCanvasRender({ page: this.page })
  }

  /** Selects all user objects on the canvas through the public editor API. */
  async selectAllObjects(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.selectionManager.selectAll()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Calls fitObject for the current active object through the public transformManager API. */
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

  /** Changes the current active object's opacity through the public transformManager API. */
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

  /** Returns the font size currently shown by the right-hand demo-controls panel. */
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

  /** Locks the current selected object through the public editor API. */
  async lockSelectedObject(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.objectLockManager.lockObject()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Deletes the current selected object through the public editor API. */
  async deleteSelectedObject(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.deletionManager.deleteSelectedObjects()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Deletes an object selected by ID or index through the shared DeletionManager. */
  async deleteObject({
    id,
    objectIndex
  }: ObjectTargetParams): Promise<boolean> {
    const deleted = await this.page.evaluate(({ targetId, targetIndex }) => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(targetIndex, targetId)
      if (!target) return false

      const result = editor.deletionManager.deleteSelectedObjects({
        objects: [target]
      })

      return Boolean(result?.objects?.includes(target))
    }, {
      targetId: id,
      targetIndex: objectIndex
    })

    await waitForCanvasRender({ page: this.page })

    return deleted
  }

  /** Unlocks the current selected object through the public editor API. */
  async unlockSelectedObject(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.objectLockManager.unlockObject()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Sends a Space keydown and waits for the editor to finish responding. */
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

  /** Sends a Space keyup and waits for the editor to finish responding. */
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

  /** Returns the current cursor state of the upper canvas layer. */
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

  /** Returns artboard information */
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

  /** Returns artboard bounds in canvas-scene coordinates. */
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

  /** Returns the artboard's position in canvas viewport coordinates. */
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

  /** Resizes the browser window and waits for the editor to finish responding to the resize. */
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

  /** Sends the undo hotkey to the editor through a body DOM event. */
  async pressUndoHotkey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'z',
      code: 'KeyZ'
    })
  }

  /** Sends the redo hotkey to the editor through a body DOM event. */
  async pressRedoHotkey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'y',
      code: 'KeyY'
    })
  }

  /** Sends the cut hotkey to the editor through a body DOM event. */
  async pressCutHotkey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'x',
      code: 'KeyX'
    })
  }

  /** Sends the duplicate hotkey to the editor through a body DOM event. */
  async pressDuplicateHotkey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'd',
      code: 'KeyD'
    })
  }

  /** Sends the Delete key to the editor through a body DOM event. */
  async pressDeleteKey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'Delete',
      code: 'Delete',
      ctrlKey: false
    })
  }

  /** Sends the Backspace key to the editor through a body DOM event. */
  async pressBackspaceKey(): Promise<void> {
    await this._pressEditorHotkey({
      key: 'Backspace',
      code: 'Backspace',
      ctrlKey: false
    })
  }

  /**
   * Sends a sequence of wheel events to the canvas-wrapper center.
   * Ctrl + wheel is used for zoom; wheel without Ctrl is used for trackpad pan.
   */
  private async _dispatchWheelEvents(params: WheelInputDispatchParams): Promise<WheelInputDispatchState> {
    this._assertWheelInputDispatchParams(params)

    const dispatchState = await this._dispatchWheelEventsInBrowser(params)

    await waitForCanvasRender({ page: this.page })

    return dispatchState
  }

  /**
   * Checks wheel-step consistency before dispatching to the browser context.
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
   * Dispatches DOM wheel events inside the browser context.
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

  /** Converts canvas viewport coordinates to browser client coordinates. */
  private async _resolveCanvasClientPoint({
    x,
    y
  }: {
    x: number
    y: number
  }): Promise<{
    x: number
    y: number
  }> {
    return this.page.evaluate(({ viewportX, viewportY }) => {
      const { editor } = window as any
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: rect.left + viewportX,
        y: rect.top + viewportY
      }
    }, {
      viewportX: x,
      viewportY: y
    })
  }

  /** Performs real wheel input at the specified canvas viewport point. */
  private async _wheelAtViewportPoint({
    x,
    y,
    deltaX = 0,
    deltaY,
    ctrlKey = false
  }: {
    x: number
    y: number
    deltaX?: number
    deltaY: number
    ctrlKey?: boolean
  }): Promise<void> {
    const clientPoint = await this._resolveCanvasClientPoint({ x, y })

    await this.page.mouse.move(clientPoint.x, clientPoint.y)

    if (ctrlKey) {
      await this.page.keyboard.down('Control')
    }

    try {
      await this.page.mouse.wheel(deltaX, deltaY)
    } finally {
      if (ctrlKey) {
        await this.page.keyboard.up('Control')
      }
    }

    await waitForCanvasRender({ page: this.page })
  }

  /** Sends Ctrl + wheel to the canvas DOM boundary and waits for rendering to finish. */
  async zoomByCtrlWheel(params: { deltaY: number }): Promise<WheelInputDispatchState> {
    return this._dispatchWheelEvents({
      ctrlKey: true,
      deltaYSteps: [params.deltaY]
    })
  }

  /** Performs a series of real Ctrl + wheel events at the specified canvas viewport point. */
  async zoomByCtrlWheelRepeatedlyAtViewportPoint({
    deltaY,
    steps,
    x,
    y
  }: {
    deltaY: number
    steps: number
    x: number
    y: number
  }): Promise<void> {
    const clientPoint = await this._resolveCanvasClientPoint({ x, y })

    await this.page.mouse.move(clientPoint.x, clientPoint.y)
    await this.page.keyboard.down('Control')

    try {
      for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
        await this.page.mouse.wheel(0, deltaY)
      }
    } finally {
      await this.page.keyboard.up('Control')
    }

    await waitForCanvasRender({ page: this.page })
  }

  /** Performs real wheel panning at the specified canvas viewport point. */
  async panByWheelAtViewportPoint({
    deltaX = 0,
    deltaY,
    x,
    y
  }: {
    deltaX?: number
    deltaY: number
    x: number
    y: number
  }): Promise<void> {
    await this._wheelAtViewportPoint({
      deltaX,
      deltaY,
      x,
      y
    })
  }

  /** Sends wheel without Ctrl, like a two-finger trackpad scroll. */
  async panByTrackpadScroll(params: { deltaX: number; deltaY: number }): Promise<WheelInputDispatchState> {
    return this._dispatchWheelEvents({
      deltaMode: DOM_DELTA_PIXEL,
      deltaXSteps: [params.deltaX],
      deltaYSteps: [params.deltaY]
    })
  }

  /** Sends a series of wheel events without Ctrl and returns before deferred rendering. */
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

  /** Zooms in on the canvas until the viewport can move along both axes. */
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

  /** Moves the viewport with a real Space + left-mouse-button drag on the canvas. */
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

  /** Moves the viewport scrollbar thumb with a real mouse drag. */
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

  /** Sends small Ctrl + wheel events, like a trackpad pinch gesture. */
  async zoomInByTrackpadPinch(): Promise<WheelInputDispatchState> {
    return this._dispatchWheelEvents({
      ctrlKey: true,
      deltaMode: DOM_DELTA_PIXEL,
      deltaYSteps: FULL_TRACKPAD_PINCH_IN_DELTA_STEPS
    })
  }

  /** Sends small Ctrl + wheel events, like a reverse trackpad pinch gesture. */
  async zoomOutByTrackpadPinch(): Promise<WheelInputDispatchState> {
    return this._dispatchWheelEvents({
      ctrlKey: true,
      deltaMode: DOM_DELTA_PIXEL,
      deltaYSteps: FULL_TRACKPAD_PINCH_OUT_DELTA_STEPS
    })
  }

  /** Sends WebKit gesture events as Safari's pinch-gesture fallback. */
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
