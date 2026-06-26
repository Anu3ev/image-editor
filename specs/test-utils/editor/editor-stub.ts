import { Point } from 'fabric'
import { createCanvasStub } from '../canvas/canvas-stub'

type PlacementOriginX = 'left' | 'center' | 'right'
type PlacementOriginY = 'top' | 'center' | 'bottom'

const getObjectPointByOrigin = ({
  object,
  originX,
  originY
}: {
  object: Record<string, any>
  originX: PlacementOriginX
  originY: PlacementOriginY
}) => {
  if (typeof object.getPointByOrigin === 'function') {
    return object.getPointByOrigin(originX, originY)
  }

  const width = (object.width ?? 0) * (object.scaleX ?? 1)
  const height = (object.height ?? 0) * (object.scaleY ?? 1)
  let x = object.left ?? 0
  let y = object.top ?? 0

  if (originX === 'center') {
    x += width / 2
  } else if (originX === 'right') {
    x += width
  }

  if (originY === 'center') {
    y += height / 2
  } else if (originY === 'bottom') {
    y += height
  }

  return new Point(x, y)
}

const setObjectPositionByOrigin = ({
  object,
  left,
  top,
  originX,
  originY
}: {
  object: Record<string, any>
  left: number
  top: number
  originX: PlacementOriginX
  originY: PlacementOriginY
}) => {
  if (typeof object.setPositionByOrigin === 'function') {
    object.setPositionByOrigin(new Point(left, top), originX, originY)
  } else if (typeof object.set === 'function') {
    object.set({
      left,
      top,
      originX,
      originY
    })
  } else {
    object.left = left
    object.top = top
    object.originX = originX
    object.originY = originY
  }

  if (typeof object.setCoords === 'function') {
    object.setCoords()
  }
}

export const createCanvasManagerTestStub = ({
  canvas,
  montageArea,
  getObjects = () => []
}: {
  canvas: Record<string, any>
  montageArea: Record<string, any>
  getObjects?: () => Array<Record<string, any>>
}) => {
  const getMontageAreaSceneCenter = jest.fn(() => {
    const fallbackCenter = canvas.getCenterPoint?.() ?? { x: 0, y: 0 }

    return new Point(
      montageArea.left ?? fallbackCenter.x,
      montageArea.top ?? fallbackCenter.y
    )
  })

  return {
    updateCanvas: jest.fn(),
    centerViewportToMontageArea: jest.fn(),
    getObjects: jest.fn(() => getObjects()),
    getMontageAreaSceneCenter,
    getObjectPlacement: jest.fn(({
      object,
      originX,
      originY
    }: {
      object: Record<string, any>
      originX?: PlacementOriginX
      originY?: PlacementOriginY
    }) => {
      const resolvedOriginX = originX ?? object.originX ?? 'center'
      const resolvedOriginY = originY ?? object.originY ?? 'center'
      const point = getObjectPointByOrigin({
        object,
        originX: resolvedOriginX,
        originY: resolvedOriginY
      })

      return {
        left: point.x,
        top: point.y,
        originX: resolvedOriginX,
        originY: resolvedOriginY
      }
    }),
    getMontageAreaSceneBounds: jest.fn(() => {
      const center = getMontageAreaSceneCenter()
      const width = montageArea.width ?? 0
      const height = montageArea.height ?? 0

      return {
        left: center.x - width / 2,
        top: center.y - height / 2,
        right: center.x + width / 2,
        bottom: center.y + height / 2,
        width,
        height,
        center
      }
    }),
    centerObjectToMontageArea: jest.fn(({ object }: { object: Record<string, any> }) => {
      if (typeof canvas.centerObject === 'function') {
        canvas.centerObject(object)
      } else {
        const center = getMontageAreaSceneCenter()
        setObjectPositionByOrigin({
          object,
          left: center.x,
          top: center.y,
          originX: 'center',
          originY: 'center'
        })
      }

      if (typeof object.setCoords === 'function') {
        object.setCoords()
      }
    }),
    resolveObjectPlacement: jest.fn(({
      object,
      left,
      top,
      originX,
      originY,
      fallbackPoint
    }: {
      object: Record<string, any>
      left?: number
      top?: number
      originX?: PlacementOriginX
      originY?: PlacementOriginY
      fallbackPoint?: Point
    }) => {
      const resolvedOriginX = originX ?? object.originX ?? 'center'
      const resolvedOriginY = originY ?? object.originY ?? 'center'
      const basePoint = fallbackPoint ?? getObjectPointByOrigin({
        object,
        originX: resolvedOriginX,
        originY: resolvedOriginY
      })

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
      object: Record<string, any>
      placement: {
        left: number
        top: number
        originX: PlacementOriginX
        originY: PlacementOriginY
      }
    }) => {
      setObjectPositionByOrigin({
        object,
        left: placement.left,
        top: placement.top,
        originX: placement.originX,
        originY: placement.originY
      })
    })
  }
}

export const createEditorStub = () => {
  const canvas = createCanvasStub()
  const montageArea = {
    width: 400,
    height: 300,
    left: 100,
    top: 50,
    set: jest.fn((updates: Record<string, unknown>) => {
      Object.assign(montageArea, updates)
    }),
    setCoords: jest.fn(),
    calcTransformMatrix: jest.fn().mockReturnValue([1, 0, 0, 1, 0, 0]),
    id: 'montage-area'
  }

  return {
    canvas,
    historyManager: {
      skipHistory: false,
      saveState: jest.fn(),
      scheduleSaveState: jest.fn(),
      flushPendingSave: jest.fn(),
      beginAction: jest.fn(),
      endAction: jest.fn(),
      suspendHistory: jest.fn(),
      resumeHistory: jest.fn(),
      undo: jest.fn().mockResolvedValue(undefined),
      redo: jest.fn().mockResolvedValue(undefined)
    },
    interactionBlocker: {
      isBlocked: false,
      overlayMask: { id: 'overlay-mask' } as any,
      refresh: jest.fn()
    },
    canvasManager: {
      ...createCanvasManagerTestStub({
        canvas,
        montageArea,
        getObjects: () => [
          { set: jest.fn() },
          { set: jest.fn() }
        ]
      })
    },
    transformManager: {
      resetObject: jest.fn(),
      resetObjects: jest.fn(),
      fitObject: jest.fn()
    },
    zoomManager: {
      zoom: jest.fn(),
      setZoom: jest.fn(),
      handlePointerZoom: jest.fn(),
      handleMouseWheelZoom: jest.fn(),
      resetZoom: jest.fn(),
      calculateAndApplyDefaultZoom: jest.fn(),
      updateDefaultZoom: jest.fn(),
      defaultZoom: 0.8,
      minZoom: 0.1,
      maxZoom: 2
    },
    panConstraintManager: {
      updateBounds: jest.fn(),
      getPanBounds: jest.fn().mockReturnValue({ minX: 0, maxX: 0, minY: 0, maxY: 0, canPan: true }),
      isPanAllowed: jest.fn().mockReturnValue(true),
      constrainPan: jest.fn((x, y) => ({ x, y })),
      getCurrentOffset: jest.fn().mockReturnValue({ x: 0, y: 0 })
    },
    layerManager: { bringToFront: jest.fn() },
    selectionManager: { selectAll: jest.fn() },
    deletionManager: { deleteSelectedObjects: jest.fn() },
    clipboardManager: { copy: jest.fn(), handlePasteEvent: jest.fn() },
    objectLockManager: {
      lockObject: jest.fn()
    },
    textManager: {
      isTextEditingActive: false,
      commitStandaloneTextScale: jest.fn(),
      exitActiveTextEditing: jest.fn().mockReturnValue(false)
    },
    errorManager: {
      emitWarning: jest.fn(),
      emitError: jest.fn()
    },
    imageManager: {
      calculateScaleFactor: jest.fn().mockReturnValue(1),
      importImage: jest.fn(),
      prepareSerializedImageSources: jest.fn().mockImplementation(async({ state }) => state)
    },
    backgroundManager: {
      backgroundObject: null,
      refresh: jest.fn()
    },
    toolbar: {
      hideTemporarily: jest.fn(),
      showAfterTemporary: jest.fn()
    },
    shapeManager: {
      addRectangle: jest.fn(),
      commitRehydratedShapeLayout: jest.fn()
    },
    cropManager: {
      applyFrameSourceBoundScalePlan: jest.fn().mockReturnValue(false),
      isActive: false,
      fitFrame: jest.fn().mockReturnValue(null),
      isFrameOverflowingSource: jest.fn().mockReturnValue(false),
      isFrameSourceScaleClamped: jest.fn().mockReturnValue(false),
      resetFrameToSource: jest.fn().mockReturnValue(null),
      restoreFrameScaleAnchorAfterSnap: jest.fn().mockReturnValue(false)
    },
    montageArea,
    options: {
      editorContainer: null as HTMLElement | null,
      canvasBackstoreWidth: null,
      canvasBackstoreHeight: null,
      montageAreaWidth: 400,
      montageAreaHeight: 300,
      defaultScale: 0.8,
      minZoom: 0.1,
      maxZoom: 2,
      scaleType: 'contain',
      showViewportScrollbars: true
    }
  } as any
}
