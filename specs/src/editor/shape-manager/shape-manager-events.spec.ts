import ShapeManager from '../../../../src/editor/shape-manager'
import {
  createShapeManagerEditorStub,
  getCanvasEventPayloads,
  getRequiredCanvasHandler,
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape-manager-spec-helpers'

jest.mock('../../../../src/editor/shape-manager/shape-factory', () => ({
  createShapeNode: jest.fn(),
  applyShapeStyle: jest.fn(),
  resizeShapeNode: jest.fn()
}))

jest.mock('../../../../src/editor/shape-manager/layout/shape-layout', () => ({
  applyShapeTextLayout: jest.fn(),
  resolveMinimumShapeWidthForText: jest.fn(() => 1),
  resolveRequiredShapeHeightForText: jest.fn(({
    height
  }: {
    height: number
  }) => Math.max(1, height)),
  resolveShapeTextFrameLayout: jest.fn(({
    width,
    padding
  }: {
    width: number
    padding?: {
      left?: number
      right?: number
    }
  }) => ({
    frame: {
      left: padding?.left ?? 0,
      width: Math.max(1, width - (padding?.left ?? 0) - (padding?.right ?? 0))
    },
    splitByGrapheme: false,
    textTop: 0
  })),
  resolveShapeTextFixedWidthLayout: jest.fn(({
    width,
    height
  }: {
    width: number
    height: number
  }) => ({
    width,
    height,
    appliedPadding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    appliedUserPadding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    frame: {
      left: 0,
      top: 0,
      width: Math.max(1, width),
      height: Math.max(1, height)
    },
    splitByGrapheme: false,
    textTop: 0
  })),
  resolveShapeTextAutoExpandWidthForText: jest.fn(({
    currentWidth,
    minimumWidth
  }: {
    currentWidth: number
    minimumWidth: number
  }) => Math.max(currentWidth, minimumWidth)),
  resolveGroupCenterPoint: jest.fn(({
    left,
    top,
    canvasCenter
  }: {
    left?: number
    top?: number
    canvasCenter: { x: number; y: number }
  }) => {
    if (typeof left === 'number' && typeof top === 'number') {
      return {
        x: left,
        y: top
      }
    }

    return canvasCenter
  })
}))

describe('shape-manager events', () => {
  const mocks = getShapeManagerUnitMocks()

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
  })

  it('эмитит обновление фигуры после завершения изменения размера, а не во время перетягивания', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'base'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    group.originX = 'right'
    group.originY = 'bottom'
    group.flipX = true
    group.flipY = true

    const scalingController = (manager as unknown as {
      scalingController: {
        handleObjectScaling: (event: unknown) => void
        handleObjectModified: (event: unknown) => void
      }
    }).scalingController
    const mouseDownHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'mouse:down'
    })
    const objectScalingHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:scaling'
    })
    const objectModifiedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:modified'
    })
    const scalingTransform = {
      action: 'scaleX',
      corner: 'mr',
      target: group,
      original: {
        scaleX: 1,
        scaleY: 1,
        left: group.left ?? 0,
        top: group.top ?? 0,
        originX: group.originX ?? 'center',
        originY: group.originY ?? 'center'
      }
    } as never
    const canvasFireMock = editor.canvas.fire as jest.Mock

    jest.spyOn(scalingController, 'handleObjectScaling').mockImplementation(() => {})
    jest.spyOn(scalingController, 'handleObjectModified').mockImplementation(() => {
      group.shapeBaseWidth = 270
      group.shapeManualBaseWidth = 270
      group.width = 270
      group.left = 155
      group.scaleX = 1
      group.setCoords()
    })

    mouseDownHandler({
      target: group
    })

    canvasFireMock.mockClear()

    objectScalingHandler({
      target: group,
      transform: scalingTransform
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toHaveLength(0)
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toHaveLength(0)

    objectModifiedHandler({
      target: group,
      transform: scalingTransform
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'resize',
        target: group
      })
    ])
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toEqual([
      expect.objectContaining({
        shape: group,
        source: 'resize',
        target: group,
        before: expect.objectContaining({
          currentWidth: 180,
          originX: 'right',
          originY: 'bottom',
          flipX: true,
          flipY: true
        }),
        after: expect.objectContaining({
          currentWidth: 270,
          originX: 'right',
          originY: 'bottom',
          flipX: true,
          flipY: true
        })
      })
    ])
  })

  it('не шлёт обновление фигуры, если изменение размера не поменяло итоговый размер', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'base'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    const scalingController = (manager as unknown as {
      scalingController: {
        handleObjectScaling: (event: unknown) => void
        handleObjectModified: (event: unknown) => void
      }
    }).scalingController
    const mouseDownHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'mouse:down'
    })
    const objectScalingHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:scaling'
    })
    const objectModifiedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:modified'
    })
    const scalingTransform = {
      action: 'scaleX',
      corner: 'mr',
      target: group,
      original: {
        scaleX: 1,
        scaleY: 1,
        left: group.left ?? 0,
        top: group.top ?? 0,
        originX: group.originX ?? 'center',
        originY: group.originY ?? 'center'
      }
    } as never
    const canvasFireMock = editor.canvas.fire as jest.Mock

    jest.spyOn(scalingController, 'handleObjectScaling').mockImplementation(() => {})
    jest.spyOn(scalingController, 'handleObjectModified').mockImplementation(() => {})

    mouseDownHandler({
      target: group
    })

    canvasFireMock.mockClear()

    objectScalingHandler({
      target: group,
      transform: scalingTransform
    })
    objectModifiedHandler({
      target: group,
      transform: scalingTransform
    })

    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:before:shape-updated'
    })).toHaveLength(0)
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toHaveLength(0)
  })
})
