import { Group, Point } from 'fabric'
import type { MockCanvas } from './factories'
import { createMockCanvas, createMockShapeTextbox } from './factories'

type PlacementOriginX = 'left' | 'center' | 'right'
type PlacementOriginY = 'top' | 'center' | 'bottom'

export const createShapeManagerEditorStub = ({
  canvas,
  montageAreaWidth
}: {
  canvas?: MockCanvas
  montageAreaWidth?: number
} = {}) => {
  const resolvedCanvas = canvas ?? createMockCanvas()
  const resolvedMontageAreaWidth = Number.isFinite(montageAreaWidth)
    ? Math.max(1, Number(montageAreaWidth))
    : 400
  const montageArea = {
    width: resolvedMontageAreaWidth,
    height: 300,
    left: resolvedMontageAreaWidth / 2,
    top: 150,
    setCoords: jest.fn(),
    getBoundingRect: jest.fn(() => ({
      left: 0,
      top: 0,
      width: resolvedMontageAreaWidth,
      height: 300
    }))
  }

  return {
    canvas: resolvedCanvas,
    canvasManager: {
      centerObjectToMontageArea: jest.fn(({ object }: { object: Group }) => {
        object.setPositionByOrigin(new Point(montageArea.left, montageArea.top), 'center', 'center')
        object.setCoords()
      }),
      getMontageAreaSceneCenter: jest.fn(() => new Point(montageArea.left, montageArea.top)),
      getObjectPlacement: jest.fn(({
        object,
        originX,
        originY
      }: {
        object: Group
        originX?: PlacementOriginX
        originY?: PlacementOriginY
      }) => {
        const resolvedOriginX = originX ?? object.originX ?? 'center'
        const resolvedOriginY = originY ?? object.originY ?? 'center'
        const point = object.getPointByOrigin(resolvedOriginX, resolvedOriginY)

        return {
          left: point.x,
          top: point.y,
          originX: resolvedOriginX,
          originY: resolvedOriginY
        }
      }),
      getMontageAreaSceneBounds: jest.fn(() => ({
        left: 0,
        top: 0,
        right: montageArea.width,
        bottom: montageArea.height,
        width: montageArea.width,
        height: montageArea.height,
        center: new Point(montageArea.left, montageArea.top)
      })),
      resolveObjectPlacement: jest.fn(({
        object,
        left,
        top,
        originX,
        originY,
        fallbackPoint
      }: {
        object: Group
        left?: number
        top?: number
        originX?: PlacementOriginX
        originY?: PlacementOriginY
        fallbackPoint?: Point
      }) => {
        const resolvedOriginX = originX ?? object.originX ?? 'center'
        const resolvedOriginY = originY ?? object.originY ?? 'center'
        const basePoint = fallbackPoint ?? object.getPointByOrigin(resolvedOriginX, resolvedOriginY)

        return {
          left: left ?? basePoint.x,
          top: top ?? basePoint.y,
          originX: resolvedOriginX,
          originY: resolvedOriginY
        }
      }),
      applyObjectPlacement: jest.fn(({
        object,
        placement
      }: {
        object: Group
        placement: {
          left: number
          top: number
          originX: PlacementOriginX
          originY: PlacementOriginY
        }
      }) => {
        object.originX = placement.originX
        object.originY = placement.originY
        object.setPositionByOrigin(
          new Point(placement.left, placement.top),
          placement.originX,
          placement.originY
        )
        object.setCoords()
      })
    },
    textManager: {
      addText: jest.fn((style: Record<string, unknown>) => createMockShapeTextbox({
        text: String(style.text ?? ''),
        width: Number(style.width) || 180,
        textAlign: (style.align as 'left' | 'center' | 'right' | 'justify') ?? 'center'
      })),
      syncLineStylesWithText: jest.fn(),
      updateText: jest.fn()
    },
    historyManager: {
      suspendHistory: jest.fn(),
      resumeHistory: jest.fn(),
      saveState: jest.fn()
    },
    montageArea
  }
}
