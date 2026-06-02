/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-use-before-define -- Public e2e model держим выше private scenario helpers. */
import { type Page, expect } from '@playwright/test'

import { waitForCanvasRender } from '../helpers/canvas-render.helper'
import type {
  CropControlKey,
  CropImageSourceInfo,
  CropRectInfo,
  CropResizeFromControlParams,
  CropSizeInfo,
  CropStartParams,
  CropStateInfo,
  EditorObjectInfo,
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

/** Параметры продолжения drag resize control crop frame в source-пикселях. */
type CropFrameControlSourceDragContinuationParams = {
  deltaX: number
  deltaY: number
  pointerSteps?: number
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

/** Результат resize crop frame до source-границы и следующего движения наружу. */
type CropFrameSourceBoundaryResizeResult = {
  expectedRect: CropRectInfo
  stateAtBoundary: CropStateInfo
  stateAfterExtraDrag: CropStateInfo
}

/** Смещение client pointer для visible drag resize control. */
type CropFramePointerDelta = {
  deltaX: number
  deltaY: number
}

/** Source anchor, который остаётся неподвижным во время resize. */
type CropFrameHorizontalBoundaryAnchor = 'left' | 'center' | 'right'

/** Source anchor, который остаётся неподвижным во время vertical resize. */
type CropFrameVerticalBoundaryAnchor = 'top' | 'center' | 'bottom'

/** Source anchor для расчёта одной оси. */
type CropFrameBoundaryAnchor = CropFrameHorizontalBoundaryAnchor | CropFrameVerticalBoundaryAnchor

/** Стороны source, которые фиксирует текущий crop control. */
type CropFrameBoundaryAnchors = {
  fixedX: CropFrameHorizontalBoundaryAnchor
  fixedY: CropFrameVerticalBoundaryAnchor
}

/** Live-шаги уменьшения квадратной crop-области перед переносом в середину. */
const CENTERED_SQUARE_CROP_SHRINK_DELTAS = [48, 96, 144]

/** Перелёт pointer за source-границу, чтобы реальные side-controls гарантированно попали в clamp. */
const SOURCE_BOUNDARY_OVERSHOOT_PIXELS = 48

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

  /** Pointer-позиция последнего незавершённого resize crop frame. */
  private lastResizePointer: CropResizePointer | null = null

  /** Pointer-позиция последнего незавершённого drag crop frame. */
  private lastMovePointer: CropMovePointer | null = null

  constructor(page: Page) {
    this.page = page
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
    const point = await this.resolveFrameControlPoint({ control })
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

  /** Наводит курсор на указанный resize control активной crop-области. */
  async hoverFrameControl(params: { control: CropControlKey }): Promise<void> {
    const point = await this.resolveFrameControlPoint(params)

    await this.page.mouse.move(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Возвращает cursor canvas после hover указанного resize control. */
  async getFrameControlCursor(
    params: { control: CropControlKey, shiftKey?: boolean }
  ): Promise<string> {
    const {
      control,
      shiftKey = false
    } = params

    if (!shiftKey) {
      await this.hoverFrameControl({ control })

      return this.readCanvasCursor()
    }

    await this.page.keyboard.down('Shift')

    try {
      await this.hoverFrameControl({ control })

      return await this.readCanvasCursor()
    } finally {
      await this.page.keyboard.up('Shift')
    }
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

  /** Возвращает viewport-координаты resize control активной crop-области. */
  private async resolveFrameControlPoint(
    { control }: { control: CropControlKey }
  ): Promise<{ x: number, y: number }> {
    const point = await this.page.evaluate(({ control: controlKey }) => {
      const { editor } = window as any
      const cropState = editor.cropManager.getState()
      if (!cropState) return null

      const { frame } = cropState

      editor.canvas.setActiveObject(frame)
      frame.setCoords()
      editor.canvas.renderAll()

      const frameControl = frame.oCoords?.[controlKey]
      if (!frameControl || typeof frameControl.x !== 'number' || typeof frameControl.y !== 'number') {
        return null
      }

      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + frameControl.x,
        y: canvasRect.top + frameControl.y
      }
    }, { control })

    expect(point, 'для hover crop-control должны существовать client-координаты').not.toBeNull()
    if (!point) {
      throw new Error('Не удалось получить client-координаты crop-control')
    }

    return point
  }

  /** Возвращает текущее значение cursor у верхнего canvas слоя. */
  private async readCanvasCursor(): Promise<string> {
    return this.page.evaluate(() => {
      const { editor } = window as any

      return editor.canvas.upperCanvasEl.style.cursor ?? ''
    })
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

/** Возвращает ожидаемый source-rect после упора proportional resize в source. */
function resolveExpectedSourceBoundaryRect({
  control,
  image,
  state
}: {
  control: CropControlKey
  image: CreatedCropImage
  state: CropStateInfo
}): CropRectInfo {
  const anchors = resolveCropControlBoundaryAnchors({ control })
  const size = resolveSourceBoundarySize({
    anchors,
    image,
    rect: state.rect
  })
  const centerX = state.rect.left + (state.rect.width / 2)
  const centerY = state.rect.top + (state.rect.height / 2)

  return {
    left: resolveBoundaryLeft({
      anchors,
      rect: state.rect,
      centerX,
      size
    }),
    top: resolveBoundaryTop({
      anchors,
      rect: state.rect,
      centerY,
      size
    }),
    width: size,
    height: size
  }
}

/** Возвращает fixed anchors для resize control в source-координатах. */
function resolveCropControlBoundaryAnchors({
  control
}: {
  control: CropControlKey
}): CropFrameBoundaryAnchors {
  return {
    fixedX: resolveCropControlBoundaryAnchorX({ control }),
    fixedY: resolveCropControlBoundaryAnchorY({ control })
  }
}

/** Возвращает fixed horizontal anchor для resize control. */
function resolveCropControlBoundaryAnchorX({
  control
}: {
  control: CropControlKey
}): CropFrameBoundaryAnchors['fixedX'] {
  if (control === 'tl' || control === 'bl' || control === 'ml') return 'right'
  if (control === 'tr' || control === 'br' || control === 'mr') return 'left'

  return 'center'
}

/** Возвращает fixed vertical anchor для resize control. */
function resolveCropControlBoundaryAnchorY({
  control
}: {
  control: CropControlKey
}): CropFrameBoundaryAnchors['fixedY'] {
  if (control === 'tl' || control === 'tr' || control === 'mt') return 'bottom'
  if (control === 'bl' || control === 'br' || control === 'mb') return 'top'

  return 'center'
}

/** Возвращает максимальный квадратный размер crop frame внутри source. */
function resolveSourceBoundarySize({
  anchors,
  image,
  rect
}: {
  anchors: CropFrameBoundaryAnchors
  image: CreatedCropImage
  rect: CropRectInfo
}): number {
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  const centerX = rect.left + (rect.width / 2)
  const centerY = rect.top + (rect.height / 2)
  const widthLimit = resolveSourceBoundaryAxisLimit({
    sourceLength: image.width,
    anchor: anchors.fixedX,
    start: rect.left,
    end: right,
    center: centerX
  })
  const heightLimit = resolveSourceBoundaryAxisLimit({
    sourceLength: image.height,
    anchor: anchors.fixedY,
    start: rect.top,
    end: bottom,
    center: centerY
  })

  return Math.min(widthLimit, heightLimit)
}

/** Возвращает максимальный размер одной source-оси с учётом fixed anchor. */
function resolveSourceBoundaryAxisLimit({
  sourceLength,
  anchor,
  start,
  end,
  center
}: {
  sourceLength: number
  anchor: CropFrameBoundaryAnchor
  start: number
  end: number
  center: number
}): number {
  if (anchor === 'left' || anchor === 'top') return sourceLength - start
  if (anchor === 'right' || anchor === 'bottom') return end

  return Math.min(center, sourceLength - center) * 2
}

/** Возвращает left ожидаемого source-rect после proportional resize. */
function resolveBoundaryLeft({
  anchors,
  rect,
  centerX,
  size
}: {
  anchors: CropFrameBoundaryAnchors
  rect: CropRectInfo
  centerX: number
  size: number
}): number {
  if (anchors.fixedX === 'left') return rect.left
  if (anchors.fixedX === 'right') return rect.left + rect.width - size

  return centerX - (size / 2)
}

/** Возвращает top ожидаемого source-rect после proportional resize. */
function resolveBoundaryTop({
  anchors,
  rect,
  centerY,
  size
}: {
  anchors: CropFrameBoundaryAnchors
  rect: CropRectInfo
  centerY: number
  size: number
}): number {
  if (anchors.fixedY === 'top') return rect.top
  if (anchors.fixedY === 'bottom') return rect.top + rect.height - size

  return centerY - (size / 2)
}

/** Возвращает visible drag-смещение до ожидаемой source-границы. */
function resolveSourceBoundaryDragDelta({
  control,
  state,
  expectedRect,
  canvasZoom
}: {
  control: CropControlKey
  state: CropStateInfo
  expectedRect: CropRectInfo
  canvasZoom: number
}): CropFramePointerDelta {
  const scaleX = (state.frame.scaleX ?? 1) * canvasZoom
  const scaleY = (state.frame.scaleY ?? 1) * canvasZoom
  const currentRight = state.rect.left + state.rect.width
  const currentBottom = state.rect.top + state.rect.height
  const expectedRight = expectedRect.left + expectedRect.width
  const expectedBottom = expectedRect.top + expectedRect.height

  return {
    deltaX: resolveBoundaryAxisDragDelta({
      control,
      negativeControls: ['tl', 'bl', 'ml'],
      positiveControls: ['tr', 'br', 'mr'],
      currentStart: state.rect.left,
      currentEnd: currentRight,
      expectedStart: expectedRect.left,
      expectedEnd: expectedRight,
      scale: scaleX
    }),
    deltaY: resolveBoundaryAxisDragDelta({
      control,
      negativeControls: ['tl', 'tr', 'mt'],
      positiveControls: ['bl', 'br', 'mb'],
      currentStart: state.rect.top,
      currentEnd: currentBottom,
      expectedStart: expectedRect.top,
      expectedEnd: expectedBottom,
      scale: scaleY
    })
  }
}

/** Возвращает visible drag-смещение вдоль одной оси до source-границы. */
function resolveBoundaryAxisDragDelta({
  control,
  negativeControls,
  positiveControls,
  currentStart,
  currentEnd,
  expectedStart,
  expectedEnd,
  scale
}: {
  control: CropControlKey
  negativeControls: CropControlKey[]
  positiveControls: CropControlKey[]
  currentStart: number
  currentEnd: number
  expectedStart: number
  expectedEnd: number
  scale: number
}): number {
  if (negativeControls.includes(control)) {
    return ((expectedStart - currentStart) * scale) - SOURCE_BOUNDARY_OVERSHOOT_PIXELS
  }
  if (positiveControls.includes(control)) {
    return ((expectedEnd - currentEnd) * scale) + SOURCE_BOUNDARY_OVERSHOOT_PIXELS
  }

  return 0
}

/** Возвращает visible drag-смещение после первого упора в source-границу. */
function resolveExtraSourceBoundaryDragDelta({
  control,
  pixels
}: {
  control: CropControlKey
  pixels: number
}): CropFramePointerDelta {
  return {
    deltaX: resolveExtraSourceBoundaryAxisDragDelta({
      control,
      negativeControls: ['tl', 'bl', 'ml'],
      positiveControls: ['tr', 'br', 'mr'],
      pixels
    }),
    deltaY: resolveExtraSourceBoundaryAxisDragDelta({
      control,
      negativeControls: ['tl', 'tr', 'mt'],
      positiveControls: ['bl', 'br', 'mb'],
      pixels
    })
  }
}

/** Возвращает дополнительное visible drag-смещение вдоль одной оси. */
function resolveExtraSourceBoundaryAxisDragDelta({
  control,
  negativeControls,
  positiveControls,
  pixels
}: {
  control: CropControlKey
  negativeControls: CropControlKey[]
  positiveControls: CropControlKey[]
  pixels: number
}): number {
  if (negativeControls.includes(control)) return -pixels
  if (positiveControls.includes(control)) return pixels

  return 0
}
