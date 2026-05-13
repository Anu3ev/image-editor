import type { Canvas } from 'fabric'
import { AiGenerationOverlay } from '../../../../src/editor/interaction-blocker/ai-generation-overlay'

export type RenderedOverlayArc = {
  fillStyle: string | CanvasGradient | CanvasPattern
  radius: number
  x: number
  y: number
}

export type RenderedOverlayFillRect = {
  fillStyle: string | CanvasGradient | CanvasPattern
  height: number
  width: number
  x: number
  y: number
}

export type AiGenerationOverlayRenderSnapshot = {
  arcs: RenderedOverlayArc[]
  fillRects: RenderedOverlayFillRect[]
  scaleMock: jest.Mock
  translateMock: jest.Mock
}

type RenderAiGenerationOverlayParams = {
  height: number
  width: number
  zoom?: number
}

export const renderAiGenerationOverlay = ({
  height,
  width,
  zoom = 1
}: RenderAiGenerationOverlayParams): AiGenerationOverlayRenderSnapshot => {
  const arcs: RenderedOverlayArc[] = []
  const fillRects: RenderedOverlayFillRect[] = []
  const scaleMock = jest.fn()
  const translateMock = jest.fn()
  let fillStyle: string | CanvasGradient | CanvasPattern = '#000000'
  let pendingArc: RenderedOverlayArc | null = null

  const context: Partial<CanvasRenderingContext2D> = {
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(value: string | CanvasGradient | CanvasPattern) {
      fillStyle = value
    },
    save: jest.fn(),
    beginPath: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    fillRect: jest.fn((x: number, y: number, rectWidth: number, rectHeight: number) => {
      fillRects.push({
        x,
        y,
        width: rectWidth,
        height: rectHeight,
        fillStyle
      })
    }),
    translate: translateMock,
    scale: scaleMock,
    arc: jest.fn((x: number, y: number, radius: number) => {
      pendingArc = {
        x,
        y,
        radius,
        fillStyle
      }
    }),
    fill: jest.fn(() => {
      if (!pendingArc) return

      arcs.push(pendingArc)
      pendingArc = null
    }),
    restore: jest.fn()
  }

  const overlay = new AiGenerationOverlay({ width, height })
  overlay.canvas = {
    getZoom: () => zoom
  } as Canvas
  overlay._render(context as CanvasRenderingContext2D)

  return {
    arcs,
    fillRects,
    scaleMock,
    translateMock
  }
}

export const getSmallestPositiveGap = ({ values }: { values: number[] }): number => {
  const roundedValues = values.map((value) => Number(value.toFixed(4)))
  const uniqueValues = Array.from(new Set(roundedValues)).sort((a, b) => a - b)
  let smallestGap = Number.POSITIVE_INFINITY

  for (let index = 1; index < uniqueValues.length; index += 1) {
    const gap = uniqueValues[index] - uniqueValues[index - 1]

    if (gap > 0 && gap < smallestGap) {
      smallestGap = gap
    }
  }

  return smallestGap
}
