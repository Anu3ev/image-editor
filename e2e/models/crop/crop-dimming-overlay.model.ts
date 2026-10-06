/* eslint-disable no-use-before-define -- Keep the public e2e model above private visual sampling helpers. */
import { type Page, expect } from '@playwright/test'

import type {
  CropCanvasPixelInfo,
  CropDimmingOverlaySnapshot
} from '../../types'

/** Point in viewport coordinates of the lower Fabric canvas. */
type CropDimmingViewportPoint = {
  x: number
  y: number
}

/** Fabric-object coordinates sufficient for reading dimming. */
type BrowserFabricObject = {
  oCoords?: Partial<Record<'tl' | 'tr' | 'br' | 'bl', BrowserFabricPoint>>
  setCoords: () => void
}

/** Fabric-object point in the browser runtime. */
type BrowserFabricPoint = {
  x?: unknown
  y?: unknown
}

/** Active crop-manager state used only for visual reads. */
type BrowserCropState = {
  frame: BrowserFabricObject
}

/** Minimal browser contract for reading the crop-dimming overlay. */
type BrowserCropDimmingEditor = {
  canvas: {
    controlsAboveOverlay?: boolean
    getHeight: () => number
    getWidth: () => number
    lowerCanvasEl: HTMLCanvasElement
    overlayImage?: unknown
    overlayVpt?: boolean
  }
  cropManager: {
    getState: () => BrowserCropState | null
  }
  montageArea: BrowserFabricObject
}

/** Window contract for browser-side reading of the crop-dimming overlay. */
type BrowserCropDimmingWindow = Window & {
  editor?: BrowserCropDimmingEditor
}

/** Canvas and crop-area geometry in viewport coordinates. */
type CropDimmingViewportGeometry = {
  canvasHeight: number
  canvasWidth: number
  controlsAboveOverlay: boolean
  frame: CropDimmingViewportPoint[] | null
  hasOverlayImage: boolean
  montage: CropDimmingViewportPoint[]
  overlayVpt: boolean
}

/** Points used to read the mask's visual state. */
type CropDimmingSamplePoints = {
  insideFrame: CropDimmingViewportPoint | null
  outsideFrame: CropDimmingViewportPoint | null
  outsideMontage: CropDimmingViewportPoint
}

/** Artboard fractions used to find a stable point outside the crop frame. */
const CROP_DIMMING_SAMPLE_RATIOS = [0.12, 0.24, 0.5, 0.76, 0.88]

/** Inset from the canvas edge for reading a pixel outside the artboard. */
const CANVAS_EDGE_SAMPLE_INSET = 16

/** E2E model of visual dimming outside the active crop frame. */
export class CropDimmingOverlayModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Returns pixels and runtime state of crop-mode dimming. */
  async getSnapshot(): Promise<CropDimmingOverlaySnapshot> {
    const geometry = await this.getViewportGeometry()
    const points = resolveSamplePoints({ geometry })
    const pixels = await this.readPixels({ points })

    expect(pixels.outsideMontage, 'должен читаться пиксель за пределами montage area').not.toBeNull()
    expect(geometry.canvasWidth, 'ширина canvas должна быть больше нуля').toBeGreaterThan(0)

    return {
      ...pixels,
      hasOverlayImage: geometry.hasOverlayImage,
      overlayVpt: geometry.overlayVpt,
      controlsAboveOverlay: geometry.controlsAboveOverlay
    }
  }

  /** Reads viewport geometry of the current canvas and active crop frame. */
  private async getViewportGeometry(): Promise<CropDimmingViewportGeometry> {
    const geometry = await this.page.evaluate(() => {
      const { editor } = window as BrowserCropDimmingWindow
      if (!editor) return null

      /** Serializes a Fabric object's viewport corners. */
      const serializeObjectCoords = (object: BrowserFabricObject) => {
        object.setCoords()
        const { tl, tr, br, bl } = object.oCoords ?? {}
        const points = [tl, tr, br, bl]

        if (!points.every((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))) {
          return null
        }

        return points.map((point) => ({
          x: Number(point?.x),
          y: Number(point?.y)
        }))
      }
      const montage = serializeObjectCoords(editor.montageArea)
      const cropState = editor.cropManager.getState()
      const frame = cropState ? serializeObjectCoords(cropState.frame) : null
      const { canvas } = editor

      if (!montage) return null

      return {
        canvasHeight: canvas.getHeight(),
        canvasWidth: canvas.getWidth(),
        controlsAboveOverlay: Boolean(canvas.controlsAboveOverlay),
        frame,
        hasOverlayImage: Boolean(canvas.overlayImage),
        montage,
        overlayVpt: Boolean(canvas.overlayVpt)
      }
    })

    expect(geometry, 'для чтения затемнения должен существовать Fabric canvas').not.toBeNull()
    if (!geometry) {
      throw new Error('Не удалось прочитать viewport-геометрию затемнения crop mode')
    }

    expect(geometry.montage).toHaveLength(4)
    expect(geometry.canvasHeight, 'высота canvas должна быть больше нуля').toBeGreaterThan(0)

    return geometry
  }

  /** Reads lower Fabric canvas pixels at the specified viewport points. */
  private async readPixels({
    points
  }: {
    points: CropDimmingSamplePoints
  }): Promise<Pick<CropDimmingOverlaySnapshot, 'insideFrame' | 'outsideFrame' | 'outsideMontage'>> {
    const pixels = await this.page.evaluate(({ samplePoints }) => {
      const { editor } = window as BrowserCropDimmingWindow
      if (!editor) return null

      const { canvas } = editor
      const context = canvas.lowerCanvasEl.getContext('2d')
      if (!context) return null

      const scaleX = canvas.lowerCanvasEl.width / canvas.getWidth()
      const scaleY = canvas.lowerCanvasEl.height / canvas.getHeight()

      /** Reads one lower Fabric canvas pixel at a viewport point. */
      const readPixel = (point: CropDimmingViewportPoint | null): CropCanvasPixelInfo | null => {
        if (!point) return null

        const x = Math.min(Math.max(Math.round(point.x * scaleX), 0), canvas.lowerCanvasEl.width - 1)
        const y = Math.min(Math.max(Math.round(point.y * scaleY), 0), canvas.lowerCanvasEl.height - 1)
        const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data

        return { red, green, blue, alpha }
      }

      return {
        insideFrame: readPixel(samplePoints.insideFrame),
        outsideFrame: readPixel(samplePoints.outsideFrame),
        outsideMontage: readPixel(samplePoints.outsideMontage)
      }
    }, { samplePoints: points })

    expect(pixels, 'должны читаться пиксели lower Fabric canvas').not.toBeNull()
    if (!pixels) {
      throw new Error('Не удалось прочитать пиксели затемнения crop mode')
    }

    const { outsideMontage } = pixels

    expect(outsideMontage, 'должен существовать пиксель за пределами montage area').not.toBeNull()
    if (!outsideMontage) {
      throw new Error('Не удалось прочитать пиксель за пределами montage area')
    }

    expect(Object.values(pixels)).toHaveLength(3)

    return {
      ...pixels,
      outsideMontage
    }
  }
}

/** Selects points for checking the hole and dimmed area. */
function resolveSamplePoints({
  geometry
}: {
  geometry: CropDimmingViewportGeometry
}): CropDimmingSamplePoints {
  const outsideMontage = findPointOutsideMontage({ geometry })
  if (!geometry.frame) {
    return {
      insideFrame: null,
      outsideFrame: null,
      outsideMontage
    }
  }

  return {
    insideFrame: interpolateQuadrilateral({ points: geometry.frame, u: 0.5, v: 0.5 }),
    outsideFrame: findPointOutsideFrame({ frame: geometry.frame, montage: geometry.montage }),
    outsideMontage
  }
}

/** Finds a canvas point outside the artboard. */
function findPointOutsideMontage({
  geometry
}: {
  geometry: CropDimmingViewportGeometry
}): CropDimmingViewportPoint {
  const { canvasHeight, canvasWidth, montage } = geometry
  const candidates = [
    { x: CANVAS_EDGE_SAMPLE_INSET, y: CANVAS_EDGE_SAMPLE_INSET },
    { x: canvasWidth - CANVAS_EDGE_SAMPLE_INSET, y: CANVAS_EDGE_SAMPLE_INSET },
    { x: CANVAS_EDGE_SAMPLE_INSET, y: canvasHeight - CANVAS_EDGE_SAMPLE_INSET },
    { x: canvasWidth - CANVAS_EDGE_SAMPLE_INSET, y: canvasHeight - CANVAS_EDGE_SAMPLE_INSET }
  ]
  const outsideMontage = candidates.find((point) => !isPointInsidePolygon({ point, polygon: montage }))

  if (!outsideMontage) {
    throw new Error('Не удалось выбрать canvas-точку за пределами montage area')
  }

  return outsideMontage
}

/** Finds an artboard point outside the crop frame. */
function findPointOutsideFrame({
  frame,
  montage
}: {
  frame: CropDimmingViewportPoint[]
  montage: CropDimmingViewportPoint[]
}): CropDimmingViewportPoint {
  for (const v of CROP_DIMMING_SAMPLE_RATIOS) {
    for (const u of CROP_DIMMING_SAMPLE_RATIOS) {
      const point = interpolateQuadrilateral({ points: montage, u, v })
      if (!isPointInsidePolygon({ point, polygon: frame })) return point
    }
  }

  throw new Error('Не удалось выбрать montage-точку за пределами crop frame')
}

/** Interpolates a point inside a quadrilateral ordered tl, tr, br, bl. */
function interpolateQuadrilateral({
  points,
  u,
  v
}: {
  points: CropDimmingViewportPoint[]
  u: number
  v: number
}): CropDimmingViewportPoint {
  const [topLeft, topRight, bottomRight, bottomLeft] = points
  if (!topLeft || !topRight || !bottomRight || !bottomLeft) {
    throw new Error('Для интерполяции нужны четыре угла Fabric-объекта')
  }

  const top = interpolatePoint({ from: topLeft, to: topRight, ratio: u })
  const bottom = interpolatePoint({ from: bottomLeft, to: bottomRight, ratio: u })

  return interpolatePoint({ from: top, to: bottom, ratio: v })
}

/** Interpolates a point between two viewport coordinates. */
function interpolatePoint({
  from,
  to,
  ratio
}: {
  from: CropDimmingViewportPoint
  to: CropDimmingViewportPoint
  ratio: number
}): CropDimmingViewportPoint {
  return {
    x: from.x + ((to.x - from.x) * ratio),
    y: from.y + ((to.y - from.y) * ratio)
  }
}

/** Checks whether a point lies inside a convex or non-convex polygon. */
function isPointInsidePolygon({
  point,
  polygon
}: {
  point: CropDimmingViewportPoint
  polygon: CropDimmingViewportPoint[]
}): boolean {
  let isInside = false

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]
    const previous = polygon[(index + polygon.length - 1) % polygon.length]

    if (!current || !previous) continue

    const crossesPointRay = ((current.y > point.y) !== (previous.y > point.y))
      && (point.x < (((previous.x - current.x) * (point.y - current.y))
        / (previous.y - current.y)) + current.x)

    if (crossesPointRay) isInside = !isInside
  }

  return isInside
}
