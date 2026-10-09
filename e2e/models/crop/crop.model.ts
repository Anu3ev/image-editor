/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-use-before-define -- Keep the public e2e model above private scenario helpers. */
import { type Page, expect } from '@playwright/test'

import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import {
  resolveExpectedFreeSourceBoundaryRect,
  resolveExpectedSourceBoundaryRect,
  resolveExtraSourceBoundaryDragDelta,
  resolveSourceBoundaryDragDelta,
  type CropFramePointerDelta
} from './crop-source-boundary.model'
import { CropFrameControlModel } from './crop-frame-control.model'
import { CropDimmingOverlayModel } from './crop-dimming-overlay.model'
import { CropEventRecorder } from './crop-event-recorder'
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
} from '../../types'

/** Last pointer position of a live crop-frame resize. */
type CropResizePointer = {
  x: number
  y: number
  shiftKey: boolean
}

/** Last pointer position of a live crop-frame drag. */
type CropMovePointer = {
  x: number
  y: number
  altKey: boolean
  ctrlKey: boolean
}

/** Result of a browser-side crop-frame drag step. */
type CropResizeDragResult = {
  point: CropResizePointer
}

/** Live state of a slow crop-frame resize. */
type CropSlowResizeState = {
  state: CropStateInfo
  indicator: ObjectSizeIndicatorInfo
}

/** Result of a browser-side crop-frame center-drag step. */
type CropMoveDragResult = {
  point: CropMovePointer
}

/** Options for browser-side crop-frame dragging with live-session control. */
type CropFrameControlDragParams = CropResizeFromControlParams & {
  continueInteraction?: boolean
}

/** Options for resizing the crop frame to target result dimensions. */
type CropFrameResizeToSizeParams = {
  control: CropControlKey
  size: CropSizeInfo
  shiftKey?: boolean
}

/** Options for visibly dragging a crop-frame resize control with a real mouse. */
type CropFrameControlMouseDragParams = {
  control: CropControlKey
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Options for continuing a visible crop-frame resize drag with a real mouse. */
type CropFrameControlMouseDragContinuationParams = {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Options for dragging a crop-frame resize control in source pixels. */
type CropFrameControlSourceDragParams = {
  control: CropControlKey
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Options for slowly dragging a crop-frame resize control in source pixels. */
type CropFrameControlSlowSourceDragParams = {
  control: CropControlKey
  deltaX: number
  deltaY: number
  steps: number
}

/** Options for slowly dragging a crop-frame resize control to a source point. */
type CropFrameControlSlowSourcePointDragParams = {
  control: CropControlKey
  sourcePoint: {
    x: number
    y: number
  }
  steps: number
}

/** Options for continuing a crop-frame resize-control drag in source pixels. */
type CropFrameControlSourceDragContinuationParams = {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Options for moving active crop-frame edges to the artboard's center guides. */
type CropFrameMontageCenterGuideMoveParams = {
  horizontalEdge: 'left' | 'right'
  verticalEdge: 'top' | 'bottom'
}

/** Options for stepwise crop-frame resize through a set of live dimensions. */
type CropFrameResizeToSizesParams = {
  control: CropControlKey
  sizes: CropSizeInfo[]
  shiftKey?: boolean
}

/** Image guaranteed to have been created and to have an ID. */
interface CreatedCropImage extends EditorObjectInfo {
  id: string
}

/** Options for preparing image cropping for a created image. */
type ImageCropSetupParams = {
  image: CreatedCropImage
}

/** Options for preparing proportional image cropping at the artboard's center guides. */
type ProportionalImageCropAtMontageCenterGuidesParams = ImageCropSetupParams & {
  size: CropSizeInfo
  alignedEdges: CropFrameMontageCenterGuideMoveParams
}

/** Options for moving the active image crop to the right source boundary. */
type MoveCropFrameToImageRightEdgeParams = {
  image: CreatedCropImage
}

/** Options for resizing the crop frame beyond the source boundary. */
type CropFrameSourceBoundaryResizeParams = {
  control: CropControlKey
  image: CreatedCropImage
  extraPixels?: number
}

/** Options for resizing the crop frame to the source boundary. */
type CropFrameSourceBoundaryDragParams = {
  control: CropControlKey
  image: CreatedCropImage
  overshootPixels?: number
}

/** Result of resizing the crop frame to the source boundary and the next outward movement. */
type CropFrameSourceBoundaryResizeResult = {
  expectedRect: CropRectInfo
  stateAtBoundary: CropStateInfo
  stateAfterExtraDrag: CropStateInfo
}

/** Live steps for shrinking the square crop area before moving it to the center. */
const CENTERED_SQUARE_CROP_SHRINK_DELTAS = [48, 96, 144]

/** Additional drag after first reaching the source limit. */
const SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS = 40

/** Mapping from a crop-frame drag control to its fixed opposite control. */
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

  /** E2E model of hover/cursor actions on active crop-area controls. */
  readonly frameControls: CropFrameControlModel

  /** E2E model of visual dimming outside the active crop frame. */
  readonly dimmingOverlay: CropDimmingOverlayModel

  /** Recording of public crop apply, cancel, and change events. */
  readonly events: CropEventRecorder

  /** Pointer position of the last unfinished crop-frame resize. */
  private lastResizePointer: CropResizePointer | null = null

  /** Pointer position of the last unfinished crop-frame drag. */
  private lastMovePointer: CropMovePointer | null = null

  constructor(page: Page) {
    this.page = page
    this.frameControls = new CropFrameControlModel(page)
    this.dimmingOverlay = new CropDimmingOverlayModel(page)
    this.events = new CropEventRecorder(page)
  }

  /** Returns true if crop mode is active. */
  async isActive(): Promise<boolean> {
    return this.page.evaluate(() => {
      const { editor } = window as any

      return Boolean(editor.cropManager?.isActive)
    })
  }

  /** Waits for crop mode to exit. */
  async waitUntilInactive(): Promise<void> {
    await this.page.waitForFunction(() => {
      const { editor } = window as any

      return !editor.cropManager?.isActive
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Returns the serialized public crop-mode state. */
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
        effectivePreserveAspectRatio: state.effectivePreserveAspectRatio,
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

  /** Enters artboard crop mode through the public editor API. */
  async startCanvasCrop(params: CropStartParams = {}): Promise<CropStateInfo> {
    const state = await this.page.evaluate((options) => {
      const { editor } = window as any

      return editor.cropManager.startCanvasCrop(options)
    }, params)

    expect(state, 'crop монтажной области должен стартовать').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Enters image crop mode through the public editor API. */
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

  /** Enables square image cropping, shrinks it, and moves it to the source center. */
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

  /** Enables square 1:1 image cropping and moves the frame to the right source boundary. */
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

  /** Enables proportional image cropping, shrinks it, and moves selected edges to the artboard center. */
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

  /** Moves the active crop frame to the image's right boundary and ends the drag. */
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

  /** Sets the active crop-area dimensions through the public editor API. */
  async setSize(params: { width: number, height: number }): Promise<CropStateInfo> {
    await this.page.evaluate((size) => {
      const { editor } = window as any

      editor.cropManager.setSize({ size })
    }, params)

    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Sets the active crop-area aspect ratio through the public editor API. */
  async setAspectRatio(params: CropSizeInfo): Promise<CropStateInfo> {
    await this.page.evaluate((aspectRatio) => {
      const { editor } = window as any

      editor.cropManager.setAspectRatio({ aspectRatio })
    }, params)

    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Toggles aspect-ratio preservation for crop-area resize through the public editor API. */
  async setPreserveAspectRatio(
    params: { preserveAspectRatio: boolean, keepCurrentResizeMode?: boolean }
  ): Promise<CropStateInfo> {
    const state = await this.page.evaluate((payload) => {
      const { editor } = window as any

      return editor.cropManager.setPreserveAspectRatio(payload)
    }, params)

    expect(state, 'режим сохранения пропорций у active crop должен обновиться').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Scales the active crop area to the artboard through the public crop-manager API. */
  async fitFrame(params: { type: 'contain' | 'cover' }): Promise<CropStateInfo> {
    const state = await this.page.evaluate((payload) => {
      const { editor } = window as any

      return editor.cropManager.fitFrame(payload)
    }, params)

    expect(state, 'active crop должен масштабироваться к монтажной области').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Expands the active image crop to the source without passing a Fabric event target. */
  async resetFrameToSource(): Promise<CropStateInfo> {
    const state = await this.page.evaluate(() => {
      const { editor } = window as any

      return editor.cropManager.resetFrameToSource()
    })

    expect(state, 'active image crop должен сбрасываться до source без event target').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Applies the active crop mode. */
  async apply(): Promise<void> {
    const result = await this.page.evaluate(() => {
      const { editor } = window as any

      return editor.cropManager.apply()
    })

    expect(result, 'активный crop должен примениться').not.toBeNull()
    await waitForCanvasRender({ page: this.page })
  }

  /** Cancels the active crop mode. */
  async cancel(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.cropManager.cancel()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Scales the crop area from a control through a real Fabric drag session. */
  async resizeFrameFromControl(params: CropResizeFromControlParams): Promise<CropStateInfo> {
    await this.dragFrameFromControl(params)

    return this.finishFrameResize()
  }

  /** Drags the crop area from a control and leaves the Fabric drag session active. */
  async dragFrameFromControl(params: CropResizeFromControlParams): Promise<CropStateInfo> {
    const dragResult = await this.performFrameControlDrag(params)

    this.lastResizePointer = dragResult.point
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Drags a crop-frame resize control with a real mouse and leaves the drag session open. */
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

  /** Drags a crop-frame resize control by an offset specified in source pixels. */
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

  /** Slowly drags a crop-frame resize control and returns the state after each live step. */
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

  /** Slowly drags a crop-frame resize control to a point inside the source and returns live states. */
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

  /** Drags a resize control to the source boundary and continues outward. */
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

  /** Drags a free-resize control to the source boundary. */
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

  /** Drags a free-resize control to the source boundary and continues outward. */
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

  /** Drags the crop area from a control to the target result in source pixels. */
  async dragFrameFromControlToSize(params: CropFrameResizeToSizeParams): Promise<CropStateInfo> {
    const resizeParams = await this.resolveResizeFromSize(params)

    return this.dragFrameFromControl(resizeParams)
  }

  /** Continues an active crop-control drag without a new mousedown. */
  async continueFrameResizeFromControl(params: CropResizeFromControlParams): Promise<CropStateInfo> {
    const dragResult = await this.performFrameControlDrag({
      ...params,
      continueInteraction: true
    })

    this.lastResizePointer = dragResult.point
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Continues an open crop-frame resize drag session with real mouse movement. */
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

  /** Continues crop-frame resize by an offset specified in source pixels. */
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

  /** Continues an active crop-control drag to the target result in source pixels. */
  async continueFrameResizeFromControlToSize(params: CropFrameResizeToSizeParams): Promise<CropStateInfo> {
    const resizeParams = await this.resolveResizeFromSize(params)

    return this.continueFrameResizeFromControl(resizeParams)
  }

  /** Drags a crop control through a sequence of live dimensions and returns the state after each step. */
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

  /** Drags the active crop frame by its center through the specified offset and leaves the drag session active. */
  async dragFrameByOffset(
    params: { deltaX: number, deltaY: number, altKey?: boolean, ctrlKey?: boolean }
  ): Promise<CropStateInfo> {
    const dragResult = await this.performFrameMove(params)

    this.lastMovePointer = dragResult.point
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Moves selected active crop-frame edges to the artboard's center guides. */
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

  /** Performs a real double-click at the center of the active crop area. */
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

  /** Ends the active crop-frame resize with mouseup. */
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

  /** Ends the active crop-frame drag with mouseup. */
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

  /** Shrinks the active square crop frame in several live steps. */
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

  /** Drags the active crop frame to the image center. */
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

  /** Returns the current canvas zoom for calculating visible pointer offsets. */
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

  /** Returns the current state of the DOM object-size indicator. */
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
      const match = text.match(/Width:\s*([\d\s]+)\s+Height:\s*([\d\s]+)/)
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

  /** Converts active crop-frame source pixels to a client-pointer offset. */
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

  /** Converts an active image-crop source point to browser client coordinates. */
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

  /** Performs a browser-side crop-control drag and returns the pointer for ending the drag. */
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

  /** Performs a browser-side center drag of the active crop frame and returns the pointer for ending the drag. */
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

  /** Clicks a canvas object's center with a real mouse event. */
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

  /** Returns the image's pixel/source state after image cropping. */
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

  /** Returns the active crop-mode state or fails if it is absent. */
  async requireState(): Promise<CropStateInfo> {
    const state = await this.getState()

    expect(state, 'crop mode должен быть активен').not.toBeNull()
    if (!state) {
      throw new Error('Crop mode должен быть активен')
    }

    return state
  }

  /** Converts the desired crop-result dimensions to resize-control ratio parameters. */
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
