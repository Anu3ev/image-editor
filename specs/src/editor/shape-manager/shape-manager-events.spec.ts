import '../../../test-utils/shape-manager-module-mocks'
import { ActiveSelection, Point } from 'fabric'
import ShapeManager from '../../../../src/editor/shape-manager'
import {
  createShapeManagerEditorStub,
  getCanvasEventPayloads,
  getRequiredCanvasHandler,
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape-manager-spec-helpers'

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

  it('при начале изменения размера нескольких шейпов запускает resize lifecycle для каждой фигуры', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const firstShape = await manager.add({
      presetKey: 'square',
      options: {
        text: 'first'
      }
    })
    const secondShape = await manager.add({
      presetKey: 'square',
      options: {
        text: 'second'
      }
    })

    if (!firstShape || !secondShape) {
      throw new Error('shape groups should be created')
    }

    const lifecycleController = (manager as unknown as {
      lifecycleController: {
        beginResize: (payload: unknown) => void
      }
    }).lifecycleController
    const scalingController = (manager as unknown as {
      scalingController: {
        handleObjectScaling: (event: unknown) => void
      }
    }).scalingController
    const objectScalingHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:scaling'
    })
    const selection = new ActiveSelection([firstShape, secondShape] as never[], {
      canvas: editor.canvas as never
    }) as ActiveSelection & {
      scaleX?: number
      scaleY?: number
    }
    const scalingTransform = {
      action: 'scaleX',
      corner: 'mr',
      target: selection,
      original: {
        scaleX: 1,
        scaleY: 1,
        left: 0,
        top: 0,
        originX: 'center',
        originY: 'center'
      }
    } as never
    const beginResizeSpy = jest.spyOn(lifecycleController, 'beginResize').mockImplementation(() => {})
    const handleObjectScalingSpy = jest.spyOn(scalingController, 'handleObjectScaling').mockImplementation(() => {})

    objectScalingHandler({
      target: selection,
      transform: scalingTransform
    })

    expect(beginResizeSpy).toHaveBeenCalledTimes(2)
    expect(beginResizeSpy).toHaveBeenNthCalledWith(1, {
      group: firstShape
    })
    expect(beginResizeSpy).toHaveBeenNthCalledWith(2, {
      group: secondShape
    })
    expect(handleObjectScalingSpy).toHaveBeenCalledWith(expect.objectContaining({
      target: selection,
      transform: scalingTransform
    }))
  })

  it('после изменения размера нескольких шейпов фиксирует resize каждой фигуры и собирает выделение обратно', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const firstShape = await manager.add({
      presetKey: 'square',
      options: {
        text: 'first'
      }
    })
    const secondShape = await manager.add({
      presetKey: 'square',
      options: {
        text: 'second'
      }
    })

    if (!firstShape || !secondShape) {
      throw new Error('shape groups should be created')
    }

    const lifecycleController = (manager as unknown as {
      lifecycleController: {
        finishResize: (payload: unknown) => void
      }
    }).lifecycleController
    const scalingController = (manager as unknown as {
      scalingController: {
        commitActiveSelectionGroupScaling: (payload: unknown) => boolean
        clearState: (payload: unknown) => void
      }
    }).scalingController
    const objectModifiedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:modified'
    })
    const selection = new ActiveSelection([firstShape, secondShape] as never[], {
      canvas: editor.canvas as never
    }) as ActiveSelection & {
      scaleX?: number
      scaleY?: number
    }
    const scalingTransform = {
      action: 'scaleX',
      corner: 'mr',
      target: selection,
      original: {
        scaleX: 1,
        scaleY: 1,
        left: 0,
        top: 0,
        originX: 'center',
        originY: 'center'
      }
    } as never
    const commitActiveSelectionGroupScalingSpy = jest
      .spyOn(scalingController, 'commitActiveSelectionGroupScaling')
      .mockReturnValue(true)
    const commitRehydratedShapeLayoutSpy = jest
      .spyOn(manager, 'commitRehydratedShapeLayout')
      .mockReturnValue(true)
    const clearStateSpy = jest.spyOn(scalingController, 'clearState').mockImplementation(() => {})
    const finishResizeSpy = jest.spyOn(lifecycleController, 'finishResize').mockImplementation(() => {})
    const getObjectPlacementMock = editor.canvasManager.getObjectPlacement as jest.Mock
    const applyObjectPlacementMock = editor.canvasManager.applyObjectPlacement as jest.Mock

    selection.scaleX = 0.75
    selection.scaleY = 1.2

    objectModifiedHandler({
      target: selection,
      transform: scalingTransform
    })

    expect(commitActiveSelectionGroupScalingSpy).toHaveBeenCalledTimes(2)
    expect(commitActiveSelectionGroupScalingSpy).toHaveBeenNthCalledWith(1, {
      group: firstShape,
      scaleX: 0.75,
      scaleY: 1.2,
      transform: scalingTransform
    })
    expect(commitActiveSelectionGroupScalingSpy).toHaveBeenNthCalledWith(2, {
      group: secondShape,
      scaleX: 0.75,
      scaleY: 1.2,
      transform: scalingTransform
    })

    expect(commitRehydratedShapeLayoutSpy).not.toHaveBeenCalled()
    expect(getObjectPlacementMock).toHaveBeenCalledTimes(2)
    expect(getObjectPlacementMock).toHaveBeenNthCalledWith(1, {
      object: firstShape
    })
    expect(getObjectPlacementMock).toHaveBeenNthCalledWith(2, {
      object: secondShape
    })
    expect(applyObjectPlacementMock).toHaveBeenCalledTimes(2)
    expect(applyObjectPlacementMock).toHaveBeenNthCalledWith(1, {
      object: firstShape,
      placement: getObjectPlacementMock.mock.results[0].value
    })
    expect(applyObjectPlacementMock).toHaveBeenNthCalledWith(2, {
      object: secondShape,
      placement: getObjectPlacementMock.mock.results[1].value
    })
    expect(getObjectPlacementMock.mock.invocationCallOrder[0]).toBeLessThan(
      commitActiveSelectionGroupScalingSpy.mock.invocationCallOrder[0]
    )
    expect(commitActiveSelectionGroupScalingSpy.mock.invocationCallOrder[0]).toBeLessThan(
      applyObjectPlacementMock.mock.invocationCallOrder[0]
    )

    expect(clearStateSpy).toHaveBeenCalledTimes(2)
    expect(clearStateSpy).toHaveBeenNthCalledWith(1, {
      group: firstShape
    })
    expect(clearStateSpy).toHaveBeenNthCalledWith(2, {
      group: secondShape
    })
    expect(finishResizeSpy).toHaveBeenCalledTimes(2)
    expect(finishResizeSpy).toHaveBeenNthCalledWith(1, {
      group: firstShape
    })
    expect(finishResizeSpy).toHaveBeenNthCalledWith(2, {
      group: secondShape
    })
    expect(editor.canvas.discardActiveObject).toHaveBeenCalledTimes(1)

    const setActiveObjectCalls = (editor.canvas.setActiveObject as jest.Mock).mock.calls
    const restoredSelection = setActiveObjectCalls[setActiveObjectCalls.length - 1]?.[0]

    expect(restoredSelection).toBeInstanceOf(ActiveSelection)
    expect(restoredSelection?.getObjects()).toEqual([firstShape, secondShape])
  })

  it('после изменения размера нескольких шейпов фиксирует размер по scale, применённому во время drag', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const firstShape = await manager.add({
      presetKey: 'square',
      options: {
        text: 'first'
      }
    })
    const secondShape = await manager.add({
      presetKey: 'square',
      options: {
        text: 'second'
      }
    })

    if (!firstShape || !secondShape) {
      throw new Error('shape groups should be created')
    }

    const minimumShapeWidth = 120
    const rawSelectionScaleX = 0.2
    const { shapeBaseWidth } = firstShape

    if (typeof shapeBaseWidth !== 'number') {
      throw new Error('у первого шейпа должна существовать базовая ширина')
    }

    const appliedSelectionScaleX = minimumShapeWidth / shapeBaseWidth
    for (const shape of [firstShape, secondShape]) {
      shape.getPositionByOrigin = jest.fn((
        originX: Parameters<ActiveSelection['getPositionByOrigin']>[0],
        originY: Parameters<ActiveSelection['getPositionByOrigin']>[1]
      ) => shape.getPointByOrigin(originX, originY)) as never
    }
    const scalingController = (manager as unknown as {
      scalingController: {
        commitActiveSelectionGroupScaling: (payload: unknown) => boolean
      }
    }).scalingController
    const objectScalingHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:scaling'
    })
    const objectModifiedHandler = getRequiredCanvasHandler({
      canvas: editor.canvas,
      eventName: 'object:modified'
    })
    const selection = new ActiveSelection([firstShape, secondShape] as never[], {
      canvas: editor.canvas as never
    }) as ActiveSelection & {
      scaleX?: number
      scaleY?: number
      setCoords: jest.Mock
      setPositionByOrigin: jest.Mock
    }
    const scalingTransform = {
      action: 'scaleX',
      corner: 'mr',
      target: selection,
      originX: 'left',
      originY: 'center',
      original: {
        scaleX: 1,
        scaleY: 1,
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'center'
      }
    } as never
    const commitActiveSelectionGroupScalingSpy = jest
      .spyOn(scalingController, 'commitActiveSelectionGroupScaling')
      .mockReturnValue(true)
    const getPositionByOriginMock = jest.fn((
      _originX: Parameters<ActiveSelection['getPositionByOrigin']>[0],
      _originY: Parameters<ActiveSelection['getPositionByOrigin']>[1]
    ) => new Point(0, 0))

    mocks.resolveMinimumShapeWidthForTextMock.mockReturnValue(minimumShapeWidth)
    selection.scaleX = rawSelectionScaleX
    selection.scaleY = 1
    selection.setCoords = jest.fn()
    selection.getPositionByOrigin = getPositionByOriginMock
    selection.setPositionByOrigin = jest.fn()

    objectScalingHandler({
      target: selection,
      transform: scalingTransform
    })

    selection.scaleX = rawSelectionScaleX

    objectModifiedHandler({
      target: selection,
      transform: scalingTransform
    })

    expect(commitActiveSelectionGroupScalingSpy).toHaveBeenCalledTimes(2)
    expect(commitActiveSelectionGroupScalingSpy).toHaveBeenNthCalledWith(1, {
      group: firstShape,
      scaleX: appliedSelectionScaleX,
      scaleY: 1,
      transform: scalingTransform
    })
    expect(commitActiveSelectionGroupScalingSpy).toHaveBeenNthCalledWith(2, {
      group: secondShape,
      scaleX: appliedSelectionScaleX,
      scaleY: 1,
      transform: scalingTransform
    })
  })
})
