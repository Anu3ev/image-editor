import { Group, Point } from 'fabric'
import { english } from '../../../src/editor/i18n'
import type { MockCanvas } from './factories'
import { createMockCanvas, createMockShapeTextbox } from './factories'

/** Horizontal object anchor point in the test CanvasManager. */
type PlacementOriginX = Group['originX']

/** Vertical object anchor point in the test CanvasManager. */
type PlacementOriginY = Group['originY']

/** Object position returned by the test CanvasManager. */
type ShapeObjectPlacement = Readonly<{
  left: number
  top: number
  originX: PlacementOriginX
  originY: PlacementOriginY
}>

/** Anchor points normalized to the group's current values. */
type ShapePlacementOrigins = Pick<ShapeObjectPlacement, 'originX' | 'originY'>

/** Minimal artboard required by ShapeManager in unit tests. */
type ShapeTestMontageArea = {
  width: number
  height: number
  left: number
  top: number
  setCoords: jest.Mock
  getBoundingRect: jest.Mock
}

/** Returns a valid width for the test artboard. */
function resolveMontageAreaWidth({ montageAreaWidth }: { montageAreaWidth?: number }): number {
  if (!Number.isFinite(montageAreaWidth)) return 400

  return Math.max(1, Number(montageAreaWidth))
}

/** Creates an artboard for the ShapeManager test editor. */
function createShapeTestMontageArea({ width }: { width: number }): ShapeTestMontageArea {
  return {
    width,
    height: 300,
    left: width / 2,
    top: 150,
    setCoords: jest.fn(),
    getBoundingRect: jest.fn(() => ({
      left: 0,
      top: 0,
      width,
      height: 300
    }))
  }
}

/** Returns the explicitly supplied or current group anchor points. */
function resolveShapePlacementOrigins({
  object,
  originX,
  originY
}: {
  object: Group
  originX?: PlacementOriginX
  originY?: PlacementOriginY
}): ShapePlacementOrigins {
  return {
    originX: originX ?? object.originX ?? 'center',
    originY: originY ?? object.originY ?? 'center'
  }
}

/** Reads the group's position relative to the selected anchor point. */
function getShapeObjectPlacement({
  object,
  originX,
  originY
}: {
  object: Group
  originX?: PlacementOriginX
  originY?: PlacementOriginY
}): ShapeObjectPlacement {
  const origins = resolveShapePlacementOrigins({ object, originX, originY })
  const point = object.getPointByOrigin(origins.originX, origins.originY)

  return {
    left: point.x,
    top: point.y,
    ...origins
  }
}

/** Completes an incomplete group position with current or fallback coordinates. */
function resolveShapeObjectPlacement({
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
}): ShapeObjectPlacement {
  const origins = resolveShapePlacementOrigins({ object, originX, originY })
  const basePoint = fallbackPoint ?? object.getPointByOrigin(origins.originX, origins.originY)

  return {
    left: left ?? basePoint.x,
    top: top ?? basePoint.y,
    ...origins
  }
}

/** Applies the calculated position to the test group. */
function applyShapeObjectPlacement({
  object,
  placement
}: {
  object: Group
  placement: ShapeObjectPlacement
}): void {
  object.originX = placement.originX
  object.originY = placement.originY
  object.setPositionByOrigin(
    new Point(placement.left, placement.top),
    placement.originX,
    placement.originY
  )
  object.setCoords()
}

/** Creates a test CanvasManager dependency for the ShapeManager editor. */
function createShapeCanvasManagerStub({
  montageArea
}: {
  montageArea: ShapeTestMontageArea
}) {
  return {
    centerObjectToMontageArea: jest.fn(({ object }: { object: Group }) => {
      object.setPositionByOrigin(new Point(montageArea.left, montageArea.top), 'center', 'center')
      object.setCoords()
    }),
    getMontageAreaSceneCenter: jest.fn(() => new Point(montageArea.left, montageArea.top)),
    getObjectPlacement: jest.fn(getShapeObjectPlacement),
    getMontageAreaSceneBounds: jest.fn(() => ({
      left: 0,
      top: 0,
      right: montageArea.width,
      bottom: montageArea.height,
      width: montageArea.width,
      height: montageArea.height,
      center: new Point(montageArea.left, montageArea.top)
    })),
    resolveObjectPlacement: jest.fn(resolveShapeObjectPlacement),
    applyObjectPlacement: jest.fn(applyShapeObjectPlacement)
  }
}

/** Creates a minimal editor for ShapeManager unit tests. */
export const createShapeManagerEditorStub = ({
  canvas,
  montageAreaWidth
}: {
  canvas?: MockCanvas
  montageAreaWidth?: number
} = {}) => {
  const resolvedCanvas = canvas ?? createMockCanvas()
  const resolvedMontageAreaWidth = resolveMontageAreaWidth({ montageAreaWidth })
  const montageArea = createShapeTestMontageArea({ width: resolvedMontageAreaWidth })

  return {
    t: english,
    canvas: resolvedCanvas,
    canvasManager: createShapeCanvasManagerStub({ montageArea }),
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
    selectionManager: {
      handleShapeSelectionScaleStep: jest.fn().mockReturnValue(false),
      commitShapeSelectionScale: jest.fn().mockReturnValue(false),
      shouldSkipShapeSelectionScaleCommit: jest.fn().mockReturnValue(false)
    },
    montageArea
  }
}
