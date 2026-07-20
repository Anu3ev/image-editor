/* eslint-disable no-use-before-define -- Public e2e model держим выше private visual sampling helpers. */
import { type Page, expect } from '@playwright/test'

import type {
  CropCanvasPixelInfo,
  CropDimmingOverlaySnapshot
} from '../../types'

/** Точка в viewport-координатах lower Fabric canvas. */
type CropDimmingViewportPoint = {
  x: number
  y: number
}

/** Координаты Fabric-объекта, достаточные для чтения затемнения. */
type BrowserFabricObject = {
  oCoords?: Partial<Record<'tl' | 'tr' | 'br' | 'bl', BrowserFabricPoint>>
  setCoords: () => void
}

/** Точка Fabric-объекта в browser runtime. */
type BrowserFabricPoint = {
  x?: unknown
  y?: unknown
}

/** Активное состояние crop manager, используемое только для visual read. */
type BrowserCropState = {
  frame: BrowserFabricObject
}

/** Минимальный browser contract для чтения crop dimming overlay. */
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

/** Window contract для browser-side чтения crop dimming overlay. */
type BrowserCropDimmingWindow = Window & {
  editor?: BrowserCropDimmingEditor
}

/** Геометрия canvas и crop-области в viewport-координатах. */
type CropDimmingViewportGeometry = {
  canvasHeight: number
  canvasWidth: number
  controlsAboveOverlay: boolean
  frame: CropDimmingViewportPoint[] | null
  hasOverlayImage: boolean
  montage: CropDimmingViewportPoint[]
  overlayVpt: boolean
}

/** Точки, по которым читается визуальное состояние маски. */
type CropDimmingSamplePoints = {
  insideFrame: CropDimmingViewportPoint | null
  outsideFrame: CropDimmingViewportPoint | null
  outsideMontage: CropDimmingViewportPoint
}

/** Доли montage area для поиска устойчивой точки вне crop frame. */
const CROP_DIMMING_SAMPLE_RATIOS = [0.12, 0.24, 0.5, 0.76, 0.88]

/** Отступ от края canvas для чтения пикселя вне montage area. */
const CANVAS_EDGE_SAMPLE_INSET = 16

/** E2E-модель визуального затемнения вне active crop frame. */
export class CropDimmingOverlayModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Возвращает пиксели и runtime-состояние затемнения crop mode. */
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

  /** Читает viewport-геометрию текущего canvas и active crop frame. */
  private async getViewportGeometry(): Promise<CropDimmingViewportGeometry> {
    const geometry = await this.page.evaluate(() => {
      const { editor } = window as BrowserCropDimmingWindow
      if (!editor) return null

      /** Сериализует viewport-углы Fabric-объекта. */
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

  /** Читает пиксели lower Fabric canvas в заданных viewport-точках. */
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

      /** Читает один пиксель lower Fabric canvas в viewport-точке. */
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

/** Выбирает точки для проверки hole и затемнённой области. */
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

/** Находит canvas-точку, которая не принадлежит montage area. */
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

/** Находит montage-точку, которая находится за пределами crop frame. */
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

/** Интерполирует точку внутри четырёхугольника с порядком tl, tr, br, bl. */
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

/** Интерполирует точку между двумя viewport-координатами. */
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

/** Проверяет принадлежность точки выпуклому или невыпуклому многоугольнику. */
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
