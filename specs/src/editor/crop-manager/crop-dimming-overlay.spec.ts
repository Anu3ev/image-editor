import {
  Rect,
  type Canvas
} from 'fabric'

import {
  CropDimmingOverlay,
  installCropDimmingOverlay,
  restoreCropDimmingOverlay
} from '../../../../src/editor/crop-manager/domain/crop-dimming-overlay'
import { createCanvasStub } from '../../../test-utils/canvas/canvas-stub'

/** Снимок вызовов canvas context после рендера dimming overlay. */
type DimmingOverlayRenderSnapshot = {
  context: CanvasRenderingContext2D
  beginPath: jest.Mock
  closePath: jest.Mock
  fill: jest.Mock
  getFillStyle: () => string | CanvasGradient | CanvasPattern
  lineTo: jest.Mock
  moveTo: jest.Mock
}

/** Создаёт canvas с исходными настройками overlay до запуска crop mode. */
const createDimmingCanvas = (): Canvas => {
  const canvas = createCanvasStub() as Canvas

  canvas.overlayImage = undefined
  canvas.overlayVpt = true
  canvas.controlsAboveOverlay = false

  return canvas
}

/** Создаёт Rect crop frame с управляемой transform matrix. */
const createCropFrame = ({
  transform
}: {
  transform: [number, number, number, number, number, number]
}): Rect => {
  const frame = new Rect({
    width: 100,
    height: 60,
    originX: 'center',
    originY: 'center'
  })

  frame.calcTransformMatrix = jest.fn().mockReturnValue(transform)

  return frame
}

/** Создаёт context, который фиксирует path и fill-параметры renderer-а. */
const createDimmingOverlayRenderSnapshot = (): DimmingOverlayRenderSnapshot => {
  const beginPath = jest.fn()
  const closePath = jest.fn()
  const fill = jest.fn()
  const lineTo = jest.fn()
  const moveTo = jest.fn()
  let fillStyle: string | CanvasGradient | CanvasPattern = '#ffffff'
  const context: Partial<CanvasRenderingContext2D> = {
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(value: string | CanvasGradient | CanvasPattern) {
      fillStyle = value
    },
    beginPath,
    closePath,
    fill,
    lineTo,
    moveTo
  }

  return {
    context: context as CanvasRenderingContext2D,
    beginPath,
    closePath,
    fill,
    getFillStyle: () => fillStyle,
    lineTo,
    moveTo
  }
}

describe('CropDimmingOverlay', () => {
  it('устанавливает transient overlay и восстанавливает предыдущие canvas-настройки', () => {
    const canvas = createDimmingCanvas()
    const frame = createCropFrame({
      transform: [1, 0, 0, 1, 100, 120]
    })
    const previousOverlay = new Rect({ width: 10, height: 10 })

    canvas.overlayImage = previousOverlay
    installCropDimmingOverlay({ canvas, frame })

    const overlay = canvas.overlayImage

    expect(overlay).toBeInstanceOf(CropDimmingOverlay)

    if (!(overlay instanceof CropDimmingOverlay)) {
      throw new Error('Crop dimming overlay должен быть установлен в canvas.overlayImage')
    }

    expect(overlay.fill).toBe('#000000')
    expect(overlay.opacity).toBe(0.25)
    expect(overlay.objectCaching).toBe(false)
    expect(overlay.excludeFromExport).toBe(true)
    expect(canvas.overlayVpt).toBe(false)
    expect(canvas.controlsAboveOverlay).toBe(true)

    restoreCropDimmingOverlay({ canvas })

    expect(canvas.overlayImage).toBe(previousOverlay)
    expect(canvas.overlayVpt).toBe(true)
    expect(canvas.controlsAboveOverlay).toBe(false)
  })

  it('не изменяет canvas overlay, которым crop mode не владеет', () => {
    const canvas = createDimmingCanvas()
    const existingOverlay = new Rect({ width: 10, height: 10 })

    canvas.overlayImage = existingOverlay
    canvas.overlayVpt = false
    canvas.controlsAboveOverlay = true

    restoreCropDimmingOverlay({ canvas })

    expect(canvas.overlayImage).toBe(existingOverlay)
    expect(canvas.overlayVpt).toBe(false)
    expect(canvas.controlsAboveOverlay).toBe(true)
  })

  it('строит evenodd-отверстие по live transform crop frame и viewport', () => {
    const canvas = createDimmingCanvas()
    const frame = createCropFrame({
      transform: [0, 2, -3, 0, 100, 200]
    })
    const overlay = new CropDimmingOverlay({
      canvas,
      frame,
      previousOverlayImage: undefined,
      previousOverlayVpt: true,
      previousControlsAboveOverlay: false
    })

    overlay.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 0, 0])
    canvas.viewportTransform = [2, 0, 0, 2, 10, 20]

    const firstSnapshot = createDimmingOverlayRenderSnapshot()
    overlay._render(firstSnapshot.context)

    expect(firstSnapshot.beginPath).toHaveBeenCalledTimes(1)
    expect(firstSnapshot.moveTo).toHaveBeenNthCalledWith(1, 0, 0)
    expect(firstSnapshot.lineTo).toHaveBeenNthCalledWith(1, 800, 0)
    expect(firstSnapshot.lineTo).toHaveBeenNthCalledWith(3, 0, 600)
    expect(firstSnapshot.moveTo).toHaveBeenNthCalledWith(2, 390, 220)
    expect(firstSnapshot.lineTo).toHaveBeenNthCalledWith(4, 390, 620)
    expect(firstSnapshot.lineTo).toHaveBeenNthCalledWith(6, 30, 220)
    expect(firstSnapshot.closePath).toHaveBeenCalledTimes(2)
    expect(firstSnapshot.getFillStyle()).toBe('#000000')
    expect(firstSnapshot.fill).toHaveBeenCalledWith('evenodd')

    frame.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 300, 50])
    canvas.viewportTransform = [1, 0, 0, 1, 40, 60]

    const secondSnapshot = createDimmingOverlayRenderSnapshot()
    overlay._render(secondSnapshot.context)

    expect(secondSnapshot.moveTo).toHaveBeenNthCalledWith(2, 290, 80)
    expect(secondSnapshot.lineTo).toHaveBeenNthCalledWith(4, 390, 80)
    expect(secondSnapshot.fill).toHaveBeenCalledWith('evenodd')
  })
})
