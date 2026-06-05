/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-use-before-define -- Public e2e model держим выше private scenario helpers. */
import { type Page, expect } from '@playwright/test'

import { waitForCanvasRender } from '../helpers/canvas-render.helper'
import {
  resolveExpectedFreeSourceBoundaryRect,
  resolveExpectedSourceBoundaryRect,
  resolveExtraSourceBoundaryDragDelta,
  resolveSourceBoundaryDragDelta,
  type CropFramePointerDelta
} from './crop-source-boundary.model'
import { CropFrameControlModel } from './crop-frame-control.model'
import type {
  CropControlKey,
  CropImageSourceInfo,
  CropRectInfo,
  CropResizeFromControlParams,
  CropSizeInfo,
  CropStartParams,
  CropStateInfo,
  EditorObjectInfo,
  ObjectSizeIndicatorInfo,
  ObjectTargetParams
} from '../types'

/** Последняя pointer-позиция live resize crop frame. */
type CropResizePointer = {
  x: number
  y: number
  shiftKey: boolean
}

/** Последняя pointer-позиция live drag crop frame. */
type CropMovePointer = {
  x: number
  y: number
  altKey: boolean
  ctrlKey: boolean
}

/** Результат browser-side шага drag crop frame. */
type CropResizeDragResult = {
  point: CropResizePointer
}

/** Live-состояние медленного resize crop frame. */
type CropSlowResizeState = {
  state: CropStateInfo
  indicator: ObjectSizeIndicatorInfo
}

/** Результат browser-side шага drag crop frame за центр. */
type CropMoveDragResult = {
  point: CropMovePointer
}

/** Параметры browser-side drag crop frame с управлением live-сессией. */
type CropFrameControlDragParams = CropResizeFromControlParams & {
  continueInteraction?: boolean
}

/** Параметры resize crop frame до целевого размера результата. */
type CropFrameResizeToSizeParams = {
  control: CropControlKey
  size: CropSizeInfo
  shiftKey?: boolean
}

/** Параметры видимого drag resize control crop frame реальной мышью. */
type CropFrameControlMouseDragParams = {
  control: CropControlKey
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Параметры продолжения видимого resize drag crop frame реальной мышью. */
type CropFrameControlMouseDragContinuationParams = {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Параметры drag resize control crop frame в source-пикселях. */
type CropFrameControlSourceDragParams = {
  control: CropControlKey
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Параметры медленного drag resize control crop frame в source-пикселях. */
type CropFrameControlSlowSourceDragParams = {
  control: CropControlKey
  deltaX: number
  deltaY: number
  steps: number
}

/** Параметры медленного drag resize control crop frame к source-точке. */
type CropFrameControlSlowSourcePointDragParams = {
  control: CropControlKey
  sourcePoint: {
    x: number
    y: number
  }
  steps: number
}

/** Параметры продолжения drag resize control crop frame в source-пикселях. */
type CropFrameControlSourceDragContinuationParams = {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Параметры переноса граней active crop frame к центральным guide монтажной области. */
type CropFrameMontageCenterGuideMoveParams = {
  horizontalEdge: 'left' | 'right'
  verticalEdge: 'top' | 'bottom'
}

/** Параметры пошагового resize crop frame до набора live-размеров. */
type CropFrameResizeToSizesParams = {
  control: CropControlKey
  sizes: CropSizeInfo[]
  shiftKey?: boolean
}

/** Изображение, которое гарантированно создано и имеет id. */
interface CreatedCropImage extends EditorObjectInfo {
  id: string
}

/** Параметры подготовки image crop для созданного изображения. */
type ImageCropSetupParams = {
  image: CreatedCropImage
}

/** Параметры подготовки пропорционального image crop у центральных guide монтажной области. */
type ProportionalImageCropAtMontageCenterGuidesParams = ImageCropSetupParams & {
  size: CropSizeInfo
  alignedEdges: CropFrameMontageCenterGuideMoveParams
}

/** Параметры переноса active image crop к правой границе source. */
type MoveCropFrameToImageRightEdgeParams = {
  image: CreatedCropImage
}

/** Параметры resize crop frame за source-границу. */
type CropFrameSourceBoundaryResizeParams = {
  control: CropControlKey
  image: CreatedCropImage
  extraPixels?: number
}

/** Параметры resize crop frame до source-границы. */
type CropFrameSourceBoundaryDragParams = {
  control: CropControlKey
  image: CreatedCropImage
  overshootPixels?: number
}

/** Результат resize crop frame до source-границы и следующего движения наружу. */
type CropFrameSourceBoundaryResizeResult = {
  expectedRect: CropRectInfo
  stateAtBoundary: CropStateInfo
  stateAfterExtraDrag: CropStateInfo
}

/** Listener события изменения crop mode в browser runtime. */
type CropResizeModeChangeListener = () => void

/** Browser-side editor contract для переключения base resize mode во время live crop resize. */
type BrowserCropResizeModeEditor = {
  canvas: {
    on: (eventName: 'editor:crop:changed', listener: CropResizeModeChangeListener) => void
    off: (eventName: 'editor:crop:changed', listener: CropResizeModeChangeListener) => void
  }
  cropManager: {
    effectivePreserveAspectRatio: boolean
    setPreserveAspectRatio: (params: {
      preserveAspectRatio: boolean
      keepCurrentResizeMode?: boolean
    }) => CropStateInfo | null
  }
}

/** Browser window с editor runtime для переключения base resize mode. */
type BrowserCropResizeModeWindow = Window & {
  editor?: BrowserCropResizeModeEditor
}

/** Live-шаги уменьшения квадратной crop-области перед переносом в середину. */
const CENTERED_SQUARE_CROP_SHRINK_DELTAS = [48, 96, 144]

/** Дополнительный drag после первого упора в source. */
const SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS = 40

/** Соответствие drag-control crop frame его фиксированному противоположному control. */
const OPPOSITE_CROP_CONTROL = {
  tl: 'br',
  tr: 'bl',
  bl: 'tr',
  br: 'tl',
  ml: 'mr',
  mr: 'ml',
  mt: 'mb',
  mb: 'mt'
} satisfies Record<CropControlKey, CropControlKey>

export class CropModel {
  private readonly page: Page

  /** E2E-модель hover/cursor действий над controls активной crop-области. */
  readonly frameControls: CropFrameControlModel

  /** Pointer-позиция последнего незавершённого resize crop frame. */
  private lastResizePointer: CropResizePointer | null = null

  /** Pointer-позиция последнего незавершённого drag crop frame. */
  private lastMovePointer: CropMovePointer | null = null

  constructor(page: Page) {
    this.page = page
    this.frameControls = new CropFrameControlModel(page)
  }

  /** Возвращает true, если crop mode активен. */
  async isActive(): Promise<boolean> {
    return this.page.evaluate(() => {
      const { editor } = window as any

      return Boolean(editor.cropManager?.isActive)
    })
  }

  /** Ожидает выхода из crop mode. */
  async waitUntilInactive(): Promise<void> {
    await this.page.waitForFunction(() => {
      const { editor } = window as any

      return !editor.cropManager?.isActive
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Возвращает публичное состояние crop mode в сериализованном виде. */
  async getState(): Promise<CropStateInfo | null> {
    return this.page.evaluate(() => {
      const { editor } = window as any
      const state = editor.cropManager?.getState()
      if (!state) return null

      const { frame } = state

      return {
        mode: state.mode,
        targetId: state.target?.id ?? null,
        options: state.options,
        rect: state.rect,
        frame: {
          id: frame.id ?? null,
          type: frame.type,
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
          scaleX: frame.scaleX,
          scaleY: frame.scaleY,
          angle: frame.angle
        }
      }
    })
  }

  /** Входит в режим кропа монтажной области через публичный API редактора. */
  async startCanvasCrop(params: CropStartParams = {}): Promise<CropStateInfo> {
    const state = await this.page.evaluate((options) => {
      const { editor } = window as any

      return editor.cropManager.startCanvasCrop(options)
    }, params)

    expect(state, 'crop монтажной области должен стартовать').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Входит в режим кропа изображения через публичный API редактора. */
  async startImageCrop(params: CropStartParams = {}): Promise<CropStateInfo> {
    const state = await this.page.evaluate(({ objectIndex, id, ...options }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)

      return editor.cropManager.startImageCrop({
        ...options,
        target
      })
    }, params)

    expect(state, 'crop изображения должен стартовать').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Включает квадратный image crop, уменьшает его и переносит в середину source. */
  async startCenteredSmallSquareImageCrop({
    image
  }: ImageCropSetupParams): Promise<CropStateInfo> {
    const startedState = await this.startImageCrop({
      id: image.id,
      aspectRatio: {
        width: 1,
        height: 1
      },
      allowFrameOverflow: false,
      preserveAspectRatio: true
    })
    const shrunkenState = await this.shrinkActiveSquareCropFrame({
      initialState: startedState
    })
    const centeredState = await this.moveActiveCropFrameToImageCenter({
      image,
      state: shrunkenState
    })

    expect(startedState.options.allowFrameOverflow).toBe(false)
    expect(startedState.options.preserveAspectRatio).toBe(true)

    return centeredState
  }

  /** Включает квадратный image crop 1:1 и переносит frame к правой границе source. */
  async startSquareImageCropAtImageRightEdge({
    image
  }: ImageCropSetupParams): Promise<CropStateInfo> {
    const startedState = await this.startImageCrop({
      id: image.id,
      aspectRatio: {
        width: 1,
        height: 1
      },
      allowFrameOverflow: false,
      preserveAspectRatio: true
    })

    expect(startedState.options.allowFrameOverflow).toBe(false)
    expect(startedState.options.preserveAspectRatio).toBe(true)

    return this.moveActiveCropFrameToImageRightEdge({ image })
  }

  /** Включает пропорциональный image crop, уменьшает его и переносит выбранные грани к центру монтажной области. */
  async startProportionalImageCropAtMontageCenterGuides({
    image,
    size,
    alignedEdges
  }: ProportionalImageCropAtMontageCenterGuidesParams): Promise<CropStateInfo> {
    const startedState = await this.startImageCrop({
      id: image.id,
      allowFrameOverflow: false,
      preserveAspectRatio: true
    })
    const resizedState = await this.dragFrameFromControlToSize({
      control: 'br',
      size
    })
    const committedState = await this.finishFrameResize()
    const movedState = await this.moveFrameEdgesToMontageCenterGuides(alignedEdges)

    expect(startedState.options.allowFrameOverflow).toBe(false)
    expect(startedState.options.preserveAspectRatio).toBe(true)
    expect(Math.round(resizedState.rect.width)).toBe(Math.round(size.width))
    expect(Math.round(resizedState.rect.height)).toBe(Math.round(size.height))
    expect(Math.round(committedState.rect.width)).toBe(Math.round(resizedState.rect.width))
    expect(Math.round(committedState.rect.height)).toBe(Math.round(resizedState.rect.height))

    return movedState
  }

  /** Переносит active crop frame к правой границе изображения и завершает drag. */
  async moveActiveCropFrameToImageRightEdge({
    image
  }: MoveCropFrameToImageRightEdgeParams): Promise<CropStateInfo> {
    const state = await this.requireState()
    const sourceDeltaX = image.width - state.rect.left - state.rect.width
    const scaleX = Math.abs(state.frame.scaleX ?? 1)

    expect(sourceDeltaX, 'crop frame должен находиться левее правой границы source').toBeGreaterThanOrEqual(0)
    expect(scaleX, 'scaleX crop frame должен быть больше нуля для переноса к source-границе').toBeGreaterThan(0)
    if (sourceDeltaX < 0 || scaleX <= 0) {
      throw new Error('Нельзя перенести crop frame к правой границе source из текущего состояния')
    }

    await this.dragFrameByOffset({
      deltaX: sourceDeltaX * scaleX,
      deltaY: 0
    })
    const movedState = await this.finishFrameMove()

    expect(Math.round(movedState.rect.left + movedState.rect.width)).toBe(image.width)
    expect(Math.round(movedState.rect.height)).toBe(Math.round(state.rect.height))

    return movedState
  }

  /** Задаёт размер активной crop-области через публичный API редактора. */
  async setSize(params: { width: number, height: number }): Promise<CropStateInfo> {
    await this.page.evaluate((size) => {
      const { editor } = window as any

      editor.cropManager.setSize({ size })
    }, params)

    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Задаёт пропорции активной crop-области через публичный API редактора. */
  async setAspectRatio(params: CropSizeInfo): Promise<CropStateInfo> {
    await this.page.evaluate((aspectRatio) => {
      const { editor } = window as any

      editor.cropManager.setAspectRatio({ aspectRatio })
    }, params)

    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Переключает сохранение пропорций у resize crop-области через публичный API редактора. */
  async setPreserveAspectRatio(
    params: { preserveAspectRatio: boolean }
  ): Promise<CropStateInfo> {
    const state = await this.page.evaluate((payload) => {
      const { editor } = window as any

      return editor.cropManager.setPreserveAspectRatio(payload)
    }, params)

    expect(state, 'режим сохранения пропорций у active crop должен обновиться').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Переключает base resize mode в свободный на следующем live-step, где Shift снял фиксацию пропорций. */
  async switchToFreeResizeOnNextFreeLiveResize(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as BrowserCropResizeModeWindow
      if (!editor) {
        throw new Error('Editor runtime должен быть доступен перед подпиской на crop resize')
      }

      /** Переключает base режим в свободный, сохраняя текущий live resize mode. */
      const switchToFreeResize = (): void => {
        if (editor.cropManager.effectivePreserveAspectRatio !== false) return

        editor.canvas.off('editor:crop:changed', switchToFreeResize)

        const state = editor.cropManager.setPreserveAspectRatio({
          preserveAspectRatio: false,
          keepCurrentResizeMode: true
        })
        if (!state) {
          throw new Error('Active crop должен существовать во время переключения resize mode')
        }
      }

      editor.canvas.on('editor:crop:changed', switchToFreeResize)
    })
  }

  /** Применяет активный crop mode. */
  async apply(): Promise<void> {
    const result = await this.page.evaluate(() => {
      const { editor } = window as any

      return editor.cropManager.apply()
    })

    expect(result, 'активный crop должен примениться').not.toBeNull()
    await waitForCanvasRender({ page: this.page })
  }

  /** Отменяет активный crop mode. */
  async cancel(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.cropManager.cancel()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Масштабирует crop-область из control через реальную Fabric drag-сессию. */
  async resizeFrameFromControl(params: CropResizeFromControlParams): Promise<CropStateInfo> {
    await this.dragFrameFromControl(params)

    return this.finishFrameResize()
  }

  /** Тянет crop-область из control и оставляет Fabric drag-сессию активной. */
  async dragFrameFromControl(params: CropResizeFromControlParams): Promise<CropStateInfo> {
    const dragResult = await this.performFrameControlDrag(params)

    this.lastResizePointer = dragResult.point
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Тянет resize control crop frame реальной мышью и оставляет drag-сессию открытой. */
  async dragFrameControlBy(params: CropFrameControlMouseDragParams): Promise<CropStateInfo> {
    expect(
      this.lastResizePointer,
      'нельзя начинать новый resize drag crop frame, пока не завершён предыдущий'
    ).toBeNull()

    const {
      control,
      deltaX,
      deltaY,
      pointerSteps = 8
    } = params
    const point = await this.frameControls.resolveControlPoint({ control })
    const nextPoint = {
      x: point.x + deltaX,
      y: point.y + deltaY,
      shiftKey: false
    }

    await this.page.mouse.move(point.x, point.y)
    await this.page.mouse.down()
    await this.page.mouse.move(nextPoint.x, nextPoint.y, { steps: pointerSteps })
    await waitForCanvasRender({ page: this.page })

    this.lastResizePointer = nextPoint

    return this.requireState()
  }

  /** Тянет resize control crop frame на смещение, заданное в source-пикселях. */
  async dragFrameControlBySourcePixels(
    params: CropFrameControlSourceDragParams
  ): Promise<CropStateInfo> {
    const {
      control,
      deltaX,
      deltaY,
      pointerSteps
    } = params

    expect(
      Number.isFinite(deltaX),
      'source-смещение crop frame по X должно быть конечным числом'
    ).toBe(true)
    expect(
      Number.isFinite(deltaY),
      'source-смещение crop frame по Y должно быть конечным числом'
    ).toBe(true)
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
      throw new Error('Source-смещение crop frame должно быть конечным числом')
    }

    const pointerDelta = await this.resolveSourcePixelPointerDelta({
      deltaX,
      deltaY
    })

    return this.dragFrameControlBy({
      control,
      deltaX: pointerDelta.deltaX,
      deltaY: pointerDelta.deltaY,
      pointerSteps
    })
  }

  /** Медленно тянет resize control crop frame и возвращает состояние после каждого live-step. */
  async dragFrameControlSlowlyBySourcePixels(
    params: CropFrameControlSlowSourceDragParams
  ): Promise<CropSlowResizeState[]> {
    expect(
      this.lastResizePointer,
      'нельзя начинать новый resize drag crop frame, пока не завершён предыдущий'
    ).toBeNull()
    expect(Number.isInteger(params.steps), 'число slow-step для resize crop frame должно быть целым').toBe(true)
    expect(params.steps, 'для медленного resize crop frame должен быть хотя бы один шаг').toBeGreaterThan(0)
    expect(Number.isFinite(params.deltaX), 'source-смещение crop frame по X должно быть конечным числом').toBe(true)
    expect(Number.isFinite(params.deltaY), 'source-смещение crop frame по Y должно быть конечным числом').toBe(true)
    const hasInvalidParams = !Number.isInteger(params.steps)
      || params.steps <= 0
      || !Number.isFinite(params.deltaX)
      || !Number.isFinite(params.deltaY)

    if (hasInvalidParams) {
      throw new Error('Параметры медленного resize crop frame должны быть валидными')
    }

    const point = await this.frameControls.resolveControlPoint({ control: params.control })
    const pointerDelta = await this.resolveSourcePixelPointerDelta({
      deltaX: params.deltaX,
      deltaY: params.deltaY
    })

    return this.dragFrameControlSlowlyBetweenClientPoints({
      startPoint: point,
      targetPoint: {
        x: point.x + pointerDelta.deltaX,
        y: point.y + pointerDelta.deltaY
      },
      steps: params.steps
    })
  }

  /** Медленно тянет resize control crop frame к точке внутри source и возвращает live-состояния. */
  async dragFrameControlSlowlyToSourcePoint(
    params: CropFrameControlSlowSourcePointDragParams
  ): Promise<CropSlowResizeState[]> {
    expect(
      this.lastResizePointer,
      'нельзя начинать новый resize drag crop frame, пока не завершён предыдущий'
    ).toBeNull()
    expect(Number.isInteger(params.steps), 'число slow-step для resize crop frame должно быть целым').toBe(true)
    expect(params.steps, 'для медленного resize crop frame должен быть хотя бы один шаг').toBeGreaterThan(0)
    expect(Number.isFinite(params.sourcePoint.x), 'source-точка crop frame по X должна быть конечным числом').toBe(true)
    expect(Number.isFinite(params.sourcePoint.y), 'source-точка crop frame по Y должна быть конечным числом').toBe(true)
    const hasInvalidParams = !Number.isInteger(params.steps)
      || params.steps <= 0
      || !Number.isFinite(params.sourcePoint.x)
      || !Number.isFinite(params.sourcePoint.y)

    if (hasInvalidParams) {
      throw new Error('Параметры медленного resize crop frame к source-точке должны быть валидными')
    }

    return this.dragFrameControlSlowlyBetweenClientPoints({
      startPoint: await this.frameControls.resolveControlPoint({ control: params.control }),
      targetPoint: await this.resolveSourcePointAsClientPoint(params.sourcePoint),
      steps: params.steps
    })
  }

  /** Тянет resize control до source-границы и продолжает движение наружу. */
  async dragFrameControlPastSourceBoundary({
    control,
    image,
    extraPixels = SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS
  }: CropFrameSourceBoundaryResizeParams): Promise<CropFrameSourceBoundaryResizeResult> {
    const state = await this.requireState()
    const canvasZoom = await this.getCanvasZoom()
    const expectedRect = resolveExpectedSourceBoundaryRect({
      control,
      image,
      state
    })
    const boundaryDelta = resolveSourceBoundaryDragDelta({
      control,
      state,
      expectedRect,
      canvasZoom
    })
    const stateAtBoundary = await this.dragFrameControlBy({
      control,
      ...boundaryDelta,
      pointerSteps: 12
    })
    const stateAfterExtraDrag = await this.continueFrameResizeBy({
      ...resolveExtraSourceBoundaryDragDelta({
        control,
        pixels: extraPixels
      }),
      pointerSteps: 8
    })

    return {
      expectedRect,
      stateAtBoundary,
      stateAfterExtraDrag
    }
  }

  /** Тянет свободный resize control до source-границы. */
  async dragFreeFrameControlToSourceBoundary({
    control,
    image,
    overshootPixels
  }: CropFrameSourceBoundaryDragParams): Promise<CropStateInfo> {
    const state = await this.requireState()
    const canvasZoom = await this.getCanvasZoom()
    const expectedRect = resolveExpectedFreeSourceBoundaryRect({
      control,
      image,
      state
    })
    const boundaryDelta = resolveSourceBoundaryDragDelta({
      control,
      state,
      expectedRect,
      canvasZoom,
      overshootPixels
    })

    return this.dragFrameControlBy({
      control,
      ...boundaryDelta,
      pointerSteps: 12
    })
  }

  /** Тянет свободный resize control до source-границы и продолжает движение наружу. */
  async dragFreeFrameControlPastSourceBoundary({
    control,
    image,
    extraPixels = SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS
  }: CropFrameSourceBoundaryResizeParams): Promise<CropFrameSourceBoundaryResizeResult> {
    const state = await this.requireState()
    const canvasZoom = await this.getCanvasZoom()
    const expectedRect = resolveExpectedFreeSourceBoundaryRect({
      control,
      image,
      state
    })
    const boundaryDelta = resolveSourceBoundaryDragDelta({
      control,
      state,
      expectedRect,
      canvasZoom
    })
    const stateAtBoundary = await this.dragFrameControlBy({
      control,
      ...boundaryDelta,
      pointerSteps: 12
    })
    const stateAfterExtraDrag = await this.continueFrameResizeBy({
      ...resolveExtraSourceBoundaryDragDelta({
        control,
        pixels: extraPixels
      }),
      pointerSteps: 8
    })

    return {
      expectedRect,
      stateAtBoundary,
      stateAfterExtraDrag
    }
  }

  /** Тянет crop-область из control до целевого результата в source-пикселях. */
  async dragFrameFromControlToSize(params: CropFrameResizeToSizeParams): Promise<CropStateInfo> {
    const resizeParams = await this.resolveResizeFromSize(params)

    return this.dragFrameFromControl(resizeParams)
  }

  /** Продолжает активный drag crop-control без нового mousedown. */
  async continueFrameResizeFromControl(params: CropResizeFromControlParams): Promise<CropStateInfo> {
    const dragResult = await this.performFrameControlDrag({
      ...params,
      continueInteraction: true
    })

    this.lastResizePointer = dragResult.point
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Продолжает открытую resize drag-сессию crop frame реальным движением мыши. */
  async continueFrameResizeBy(
    params: CropFrameControlMouseDragContinuationParams
  ): Promise<CropStateInfo> {
    expect(
      this.lastResizePointer,
      'нельзя продолжать resize drag crop frame без активной drag-сессии'
    ).not.toBeNull()

    if (!this.lastResizePointer) {
      throw new Error('Активная drag-сессия resize crop frame должна существовать')
    }

    const {
      deltaX,
      deltaY,
      pointerSteps = 1
    } = params
    const nextPoint = {
      x: this.lastResizePointer.x + deltaX,
      y: this.lastResizePointer.y + deltaY,
      shiftKey: this.lastResizePointer.shiftKey
    }

    await this.page.mouse.move(nextPoint.x, nextPoint.y, { steps: pointerSteps })
    await waitForCanvasRender({ page: this.page })

    this.lastResizePointer = nextPoint

    return this.requireState()
  }

  /** Продолжает resize crop frame на смещение, заданное в source-пикселях. */
  async continueFrameResizeBySourcePixels(
    params: CropFrameControlSourceDragContinuationParams
  ): Promise<CropStateInfo> {
    const {
      deltaX,
      deltaY,
      pointerSteps
    } = params

    expect(
      Number.isFinite(deltaX),
      'source-смещение crop frame по X должно быть конечным числом'
    ).toBe(true)
    expect(
      Number.isFinite(deltaY),
      'source-смещение crop frame по Y должно быть конечным числом'
    ).toBe(true)
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
      throw new Error('Source-смещение crop frame должно быть конечным числом')
    }

    const pointerDelta = await this.resolveSourcePixelPointerDelta({
      deltaX,
      deltaY
    })

    return this.continueFrameResizeBy({
      deltaX: pointerDelta.deltaX,
      deltaY: pointerDelta.deltaY,
      pointerSteps
    })
  }

  /** Продолжает активный drag crop-control до целевого результата в source-пикселях. */
  async continueFrameResizeFromControlToSize(params: CropFrameResizeToSizeParams): Promise<CropStateInfo> {
    const resizeParams = await this.resolveResizeFromSize(params)

    return this.continueFrameResizeFromControl(resizeParams)
  }

  /** Тянет crop-control через последовательность live-размеров и возвращает состояние после каждого шага. */
  async dragFrameFromControlToSizes(params: CropFrameResizeToSizesParams): Promise<CropStateInfo[]> {
    const {
      control,
      sizes,
      shiftKey
    } = params

    expect(sizes.length, 'для пошагового resize crop frame должен быть хотя бы один размер').toBeGreaterThan(0)

    const firstSize = sizes[0]

    expect(firstSize, 'первый размер пошагового resize crop frame должен существовать').toBeDefined()
    if (!firstSize) {
      throw new Error('Первый размер пошагового resize crop frame должен существовать')
    }

    const states = [
      await this.dragFrameFromControlToSize({
        control,
        size: firstSize,
        shiftKey
      })
    ]

    for (let index = 1; index < sizes.length; index += 1) {
      const size = sizes[index]

      expect(size, 'каждый размер пошагового resize crop frame должен существовать').toBeDefined()
      if (!size) {
        throw new Error('Каждый размер пошагового resize crop frame должен существовать')
      }

      states.push(await this.continueFrameResizeFromControlToSize({
        control,
        size,
        shiftKey
      }))
    }

    expect(states.length, 'число live-состояний crop должно совпадать с числом resize-шагов').toBe(sizes.length)

    return states
  }

  /** Тянет active crop frame за центр на заданное смещение и оставляет drag-сессию активной. */
  async dragFrameByOffset(
    params: { deltaX: number, deltaY: number, altKey?: boolean, ctrlKey?: boolean }
  ): Promise<CropStateInfo> {
    const dragResult = await this.performFrameMove(params)

    this.lastMovePointer = dragResult.point
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Переносит выбранные грани active crop frame к центральным guide монтажной области. */
  async moveFrameEdgesToMontageCenterGuides(
    params: CropFrameMontageCenterGuideMoveParams
  ): Promise<CropStateInfo> {
    const stateBeforeMove = await this.requireState()
    const delta = await this.page.evaluate((payload) => {
      const { editor } = window as any
      const cropState = editor.cropManager.getState()
      if (!cropState) return null

      const { frame } = cropState
      const frameBounds = frame.getObjectSnappingBounds?.()
      if (!frameBounds) return null

      editor.montageArea.setCoords()
      const montageBounds = editor.montageArea.getBoundingRect(false, true)
      const montageCenterX = montageBounds.left + (montageBounds.width / 2)
      const montageCenterY = montageBounds.top + (montageBounds.height / 2)
      const frameEdgeX = payload.horizontalEdge === 'right'
        ? frameBounds.right
        : frameBounds.left
      const frameEdgeY = payload.verticalEdge === 'bottom'
        ? frameBounds.bottom
        : frameBounds.top

      return {
        deltaX: montageCenterX - frameEdgeX,
        deltaY: montageCenterY - frameEdgeY
      }
    }, params)

    expect(delta, 'нужно вычислить смещение crop frame к центральным guide').not.toBeNull()
    if (!delta) {
      throw new Error('Не удалось вычислить смещение crop frame к центральным guide')
    }

    const liveState = await this.dragFrameByOffset(delta)
    const movedState = await this.finishFrameMove()

    expect(Math.round(liveState.rect.width)).toBe(Math.round(stateBeforeMove.rect.width))
    expect(Math.round(liveState.rect.height)).toBe(Math.round(stateBeforeMove.rect.height))
    expect(Math.round(movedState.rect.width)).toBe(Math.round(stateBeforeMove.rect.width))
    expect(Math.round(movedState.rect.height)).toBe(Math.round(stateBeforeMove.rect.height))

    return movedState
  }

  /** Выполняет реальный двойной клик по центру активной crop-области. */
  async doubleClickFrame(): Promise<CropStateInfo> {
    const point = await this.page.evaluate(() => {
      const { editor } = window as any
      const cropState = editor.cropManager.getState()
      if (!cropState) return null

      const { frame } = cropState
      frame.setCoords()

      const bounds = frame.getBoundingRect(false, true)
      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + bounds.left + (bounds.width / 2),
        y: canvasRect.top + bounds.top + (bounds.height / 2)
      }
    })

    expect(point, 'для двойного клика по crop-области должны существовать client-координаты').not.toBeNull()
    if (!point) {
      throw new Error('Не удалось получить client-координаты для двойного клика по crop-области')
    }

    await this.page.mouse.dblclick(point.x, point.y)
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Завершает активный resize crop frame через mouseup. */
  async finishFrameResize(): Promise<CropStateInfo> {
    const pointer = this.lastResizePointer

    expect(pointer, 'должна существовать активная resize-сессия crop frame').not.toBeNull()
    if (!pointer) {
      throw new Error('Нельзя завершить resize crop frame без активной drag-сессии')
    }

    expect(Number.isFinite(pointer.x), 'clientX resize crop frame должен быть конечным числом').toBe(true)
    expect(Number.isFinite(pointer.y), 'clientY resize crop frame должен быть конечным числом').toBe(true)
    if (!Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) {
      throw new Error('Нельзя завершить resize crop frame без конечной client-точки')
    }

    const state = await this.page.evaluate((payload) => {
      const { editor } = window as any

      editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: payload.x,
        clientY: payload.y,
        shiftKey: payload.shiftKey
      }))

      return editor.cropManager.getState()
    }, pointer)

    this.lastResizePointer = null

    expect(state, 'после mouseup crop mode должен остаться активным').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Завершает активный drag crop frame через mouseup. */
  async finishFrameMove(): Promise<CropStateInfo> {
    const pointer = this.lastMovePointer

    expect(pointer, 'должна существовать активная drag-сессия crop frame').not.toBeNull()
    if (!pointer) {
      throw new Error('Нельзя завершить drag crop frame без активной drag-сессии')
    }

    const state = await this.page.evaluate((payload) => {
      const { editor } = window as any

      editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: payload.x,
        clientY: payload.y,
        altKey: payload.altKey,
        ctrlKey: payload.ctrlKey
      }))

      return editor.cropManager.getState()
    }, pointer)

    this.lastMovePointer = null

    expect(state, 'после mouseup crop mode должен остаться активным').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Уменьшает активный квадратный crop frame несколькими live-шагами. */
  private async shrinkActiveSquareCropFrame({
    initialState
  }: {
    initialState: CropStateInfo
  }): Promise<CropStateInfo> {
    const shrinkSizes = CENTERED_SQUARE_CROP_SHRINK_DELTAS.map((delta) => {
      return {
        width: initialState.rect.width - delta,
        height: initialState.rect.height - delta
      }
    })
    const liveStates = await this.dragFrameFromControlToSizes({
      control: 'bl',
      sizes: shrinkSizes
    })
    const shrunkenState = await this.finishFrameResize()

    expect(liveStates).toHaveLength(shrinkSizes.length)
    expect(shrunkenState.rect.width).toBeLessThan(initialState.rect.width)
    expect(shrunkenState.rect.height).toBeLessThan(initialState.rect.height)

    return shrunkenState
  }

  /** Перетаскивает активный crop frame в середину изображения. */
  private async moveActiveCropFrameToImageCenter({
    image,
    state
  }: {
    image: CreatedCropImage
    state: CropStateInfo
  }): Promise<CropStateInfo> {
    const targetCenteredLeft = (image.width - state.rect.width) / 2
    const targetCenteredTop = (image.height - state.rect.height) / 2
    const liveState = await this.dragFrameByOffset({
      deltaX: (targetCenteredLeft - state.rect.left) * (state.frame.scaleX ?? 1),
      deltaY: (targetCenteredTop - state.rect.top) * (state.frame.scaleY ?? 1)
    })
    const centeredState = await this.finishFrameMove()

    expect(liveState.rect.width).toBeCloseTo(state.rect.width, 4)
    expect(liveState.rect.height).toBeCloseTo(state.rect.height, 4)
    expect(centeredState.rect.left).toBeGreaterThan(0)
    expect(centeredState.rect.top).toBeGreaterThan(0)
    expect(centeredState.rect.left + centeredState.rect.width).toBeLessThan(image.width)
    expect(centeredState.rect.top + centeredState.rect.height).toBeLessThan(image.height)

    return centeredState
  }

  /** Возвращает текущий zoom canvas для расчёта visible pointer-смещений. */
  private async getCanvasZoom(): Promise<number> {
    const zoom = await this.page.evaluate(() => {
      const { editor } = window as any

      return editor.canvas.getZoom()
    })

    expect(Number.isFinite(zoom), 'zoom canvas должен быть конечным числом').toBe(true)
    expect(zoom, 'zoom canvas должен быть больше нуля').toBeGreaterThan(0)
    if (!Number.isFinite(zoom) || zoom <= 0) {
      throw new Error('Zoom canvas должен быть конечным числом больше нуля')
    }

    return zoom
  }

  /** Возвращает текущее состояние DOM-индикатора размеров объекта. */
  private async getObjectSizeIndicator(): Promise<ObjectSizeIndicatorInfo> {
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

  private async dragFrameControlSlowlyBetweenClientPoints({
    startPoint,
    targetPoint,
    steps
  }: {
    startPoint: { x: number, y: number }
    targetPoint: { x: number, y: number }
    steps: number
  }): Promise<CropSlowResizeState[]> {
    const states: CropSlowResizeState[] = []

    await this.page.mouse.move(startPoint.x, startPoint.y)
    await this.page.mouse.down()

    for (let index = 1; index <= steps; index += 1) {
      const nextPoint = {
        x: startPoint.x + (((targetPoint.x - startPoint.x) * index) / steps),
        y: startPoint.y + (((targetPoint.y - startPoint.y) * index) / steps),
        shiftKey: false
      }

      await this.page.mouse.move(nextPoint.x, nextPoint.y)
      await waitForCanvasRender({ page: this.page })
      states.push({
        state: await this.requireState(),
        indicator: await this.getObjectSizeIndicator()
      })
      this.lastResizePointer = nextPoint
    }

    expect(states.length, 'число live-состояний crop должно совпадать с числом slow-step').toBe(steps)

    return states
  }

  /** Пересчитывает source-пиксели active crop frame в client-смещение pointer. */
  private async resolveSourcePixelPointerDelta({
    deltaX,
    deltaY
  }: {
    deltaX: number
    deltaY: number
  }): Promise<CropFramePointerDelta> {
    const state = await this.requireState()
    const canvasZoom = await this.getCanvasZoom()
    const scaleX = Math.abs(state.frame.scaleX ?? 1)
    const scaleY = Math.abs(state.frame.scaleY ?? 1)

    expect(scaleX, 'scaleX crop frame должен быть больше нуля для пересчёта source-пикселей').toBeGreaterThan(0)
    expect(scaleY, 'scaleY crop frame должен быть больше нуля для пересчёта source-пикселей').toBeGreaterThan(0)
    if (scaleX <= 0 || scaleY <= 0) {
      throw new Error('Scale crop frame должен быть больше нуля для пересчёта source-пикселей')
    }

    return {
      deltaX: deltaX * scaleX * canvasZoom,
      deltaY: deltaY * scaleY * canvasZoom
    }
  }

  /** Переводит source-точку active image crop в client-координаты браузера. */
  private async resolveSourcePointAsClientPoint(
    point: { x: number, y: number }
  ): Promise<{ x: number, y: number }> {
    const clientPoint = await this.page.evaluate((sourcePoint) => {
      const { editor } = window as any
      const cropState = editor.cropManager.getState()
      if (!cropState?.target) return null

      const source = cropState.target
      const center = source.getCenterPoint()
      const width = source.width ?? 0
      const height = source.height ?? 0
      const scaleX = source.scaleX ?? 1
      const scaleY = source.scaleY ?? 1
      const angle = ((source.angle ?? 0) * Math.PI) / 180
      const localX = (sourcePoint.x - (width / 2)) * scaleX
      const localY = (sourcePoint.y - (height / 2)) * scaleY
      const sceneX = center.x + (localX * Math.cos(angle)) - (localY * Math.sin(angle))
      const sceneY = center.y + (localX * Math.sin(angle)) + (localY * Math.cos(angle))
      const [a, b, c, d, tx, ty] = editor.canvas.viewportTransform
      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + (a * sceneX) + (c * sceneY) + tx,
        y: canvasRect.top + (b * sceneX) + (d * sceneY) + ty
      }
    }, point)

    expect(clientPoint, 'для source-точки active crop должны существовать client-координаты').not.toBeNull()
    if (!clientPoint) {
      throw new Error('Для source-точки active crop должны существовать client-координаты')
    }

    return clientPoint
  }

  /** Выполняет browser-side drag crop-control и возвращает pointer для завершения drag. */
  private async performFrameControlDrag(params: CropFrameControlDragParams): Promise<CropResizeDragResult> {
    const oppositeControl = OPPOSITE_CROP_CONTROL[params.control]
    const dragResult = await this.page.evaluate((payload) => {
      const {
        control,
        oppositeControl: opposite,
        widthRatio,
        heightRatio,
        shiftKey = false,
        continueInteraction = false
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const cropState = editor.cropManager.getState()
      if (!cropState) return null

      editor.canvas.setActiveObject(cropState.frame)
      const result = helpers.scaleSelectionFromControl({
        startControl: control,
        oppositeControl: opposite,
        scaleX: widthRatio,
        scaleY: heightRatio,
        shiftKey,
        continueInteraction
      })
      if (!result) return null

      if (!editor.cropManager.getState()) return null

      return {
        point: {
          x: result.point.x,
          y: result.point.y,
          shiftKey: result.shiftKey
        }
      }
    }, {
      ...params,
      oppositeControl
    })

    expect(dragResult, 'после drag crop mode должен остаться активным').not.toBeNull()
    if (!dragResult) {
      throw new Error('Не удалось выполнить drag crop-control')
    }

    return dragResult
  }

  /** Выполняет browser-side drag active crop frame за центр и возвращает pointer для завершения drag. */
  private async performFrameMove(
    params: { deltaX: number, deltaY: number, altKey?: boolean, ctrlKey?: boolean }
  ): Promise<CropMoveDragResult> {
    const dragResult = await this.page.evaluate((payload) => {
      const {
        deltaX,
        deltaY,
        altKey = false,
        ctrlKey = false
      } = payload
      const { editor } = window as any
      const cropState = editor.cropManager.getState()
      if (!cropState) return null

      const { frame } = cropState
      const center = frame.getCenterPoint()
      const [a, b, c, d, tx, ty] = editor.canvas.viewportTransform
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const startPoint = {
        x: rect.left + (center.x * a) + (center.y * c) + tx,
        y: rect.top + (center.x * b) + (center.y * d) + ty
      }
      const nextCenter = {
        x: center.x + deltaX,
        y: center.y + deltaY
      }
      const nextPoint = {
        x: rect.left + (nextCenter.x * a) + (nextCenter.y * c) + tx,
        y: rect.top + (nextCenter.x * b) + (nextCenter.y * d) + ty
      }

      editor.canvas.setActiveObject(frame)
      editor.canvas.__onMouseDown(new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: startPoint.x,
        clientY: startPoint.y,
        altKey,
        ctrlKey
      }))
      editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: nextPoint.x,
        clientY: nextPoint.y,
        altKey,
        ctrlKey
      }))

      if (!editor.cropManager.getState()) return null

      return {
        point: {
          x: nextPoint.x,
          y: nextPoint.y,
          altKey,
          ctrlKey
        }
      }
    }, params)

    expect(dragResult, 'после drag crop mode должен остаться активным').not.toBeNull()
    if (!dragResult) {
      throw new Error('Не удалось выполнить drag crop frame за центр')
    }

    return dragResult
  }

  /** Кликает в центр canvas-объекта реальным mouse-событием. */
  async clickObjectCenter(params: ObjectTargetParams): Promise<void> {
    const point = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.setCoords()
      const bounds = target.getBoundingRect(false, true)
      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + bounds.left + (bounds.width / 2),
        y: canvasRect.top + bounds.top + (bounds.height / 2)
      }
    }, params)

    expect(point, 'для клика по объекту должны существовать client-координаты').not.toBeNull()
    if (!point) {
      throw new Error('Не удалось получить client-координаты для клика по объекту')
    }

    await this.page.mouse.click(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Возвращает pixel/source-состояние изображения после image crop. */
  async getImageSourceInfo(params: ObjectTargetParams): Promise<CropImageSourceInfo> {
    const info = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const source = target.getElement?.()

      return {
        id: target.id ?? null,
        width: target.width,
        height: target.height,
        cropX: target.cropX ?? 0,
        cropY: target.cropY ?? 0,
        sourceWidth: source?.width ?? 0,
        sourceHeight: source?.height ?? 0
      }
    }, params)

    expect(info, 'должно существовать состояние изображения после crop').not.toBeNull()
    if (!info) {
      throw new Error('Не удалось получить состояние изображения после crop')
    }

    return info
  }

  /** Возвращает активное состояние crop mode или падает, если оно отсутствует. */
  async requireState(): Promise<CropStateInfo> {
    const state = await this.getState()

    expect(state, 'crop mode должен быть активен').not.toBeNull()
    if (!state) {
      throw new Error('Crop mode должен быть активен')
    }

    return state
  }

  /** Преобразует желаемый размер результата crop в ratio-параметры resize control. */
  private async resolveResizeFromSize(params: CropFrameResizeToSizeParams): Promise<CropResizeFromControlParams> {
    const state = await this.requireState()
    const {
      control,
      size,
      shiftKey
    } = params
    const { width, height } = state.rect

    expect(width, 'текущая ширина crop frame должна быть больше нуля').toBeGreaterThan(0)
    expect(height, 'текущая высота crop frame должна быть больше нуля').toBeGreaterThan(0)

    if (width <= 0 || height <= 0) {
      throw new Error('Текущий размер crop frame должен быть больше нуля')
    }

    return {
      control,
      widthRatio: size.width / width,
      heightRatio: size.height / height,
      shiftKey
    }
  }
}
