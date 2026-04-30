import {
  Control,
  Point,
  controlsUtils,
  type Transform,
  type TPointerEvent
} from 'fabric'
import { applyShapeCornerFreeScaleControls } from '../../../../src/editor/shape-manager/scaling/shape-controls'
import {
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'

type ShapeCornerControl = Control & {
  shapeFreeScaleCornerControl?: boolean
}

describe('shape-controls', () => {
  const scalingEquallyMock = controlsUtils.scalingEqually as jest.Mock
  const getLocalPointMock = controlsUtils.getLocalPoint as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    scalingEquallyMock.mockReturnValue(true)
    getLocalPointMock.mockImplementation((_transform, _originX, _originY, x: number, y: number) => new Point(x, y))
  })

  it('applyShapeCornerFreeScaleControls подменяет только угловые контролы', () => {
    const group = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })
    const topLeftControl = new Control({
      actionHandler: jest.fn()
    })
    const topRightControl = new Control({
      actionHandler: jest.fn()
    })
    const bottomLeftControl = new Control({
      actionHandler: jest.fn()
    })
    const bottomRightControl = new Control({
      actionHandler: jest.fn()
    })
    const middleLeftControl = new Control({
      actionHandler: jest.fn()
    })

    group.controls = {
      tl: topLeftControl,
      tr: topRightControl,
      bl: bottomLeftControl,
      br: bottomRightControl,
      ml: middleLeftControl
    } as never

    applyShapeCornerFreeScaleControls({
      target: group
    })

    expect(group.controls.tl).not.toBe(topLeftControl)
    expect(group.controls.tr).not.toBe(topRightControl)
    expect(group.controls.bl).not.toBe(bottomLeftControl)
    expect(group.controls.br).not.toBe(bottomRightControl)
    expect(group.controls.ml).toBe(middleLeftControl)
    expect((group.controls.tl as ShapeCornerControl).shapeFreeScaleCornerControl).toBe(true)
    expect((group.controls.tr as ShapeCornerControl).shapeFreeScaleCornerControl).toBe(true)
    expect((group.controls.bl as ShapeCornerControl).shapeFreeScaleCornerControl).toBe(true)
    expect((group.controls.br as ShapeCornerControl).shapeFreeScaleCornerControl).toBe(true)
  })

  it('applyShapeCornerFreeScaleControls не оборачивает corner controls повторно', () => {
    const group = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })

    group.controls = {
      tl: new Control({
        actionHandler: jest.fn()
      }),
      tr: new Control({
        actionHandler: jest.fn()
      })
    } as never

    applyShapeCornerFreeScaleControls({
      target: group
    })

    const wrappedTopLeftControl = group.controls.tl
    const wrappedTopRightControl = group.controls.tr

    applyShapeCornerFreeScaleControls({
      target: group
    })

    expect(group.controls.tl).toBe(wrappedTopLeftControl)
    expect(group.controls.tr).toBe(wrappedTopRightControl)
  })

  it('corner control при зажатом Shift сохраняет пропорции и восстанавливает uniformScaling canvas', () => {
    const group = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })
    const canvas = {
      uniformScaling: true
    }
    const target = {
      canvas,
      scaleX: 1,
      scaleY: 1,
      set: jest.fn((key: string, value: number) => {
        target[key as 'scaleX' | 'scaleY'] = value
      }),
      _getTransformedDimensions: jest.fn(() => ({
        x: 100,
        y: 100
      }))
    }

    group.controls = {
      tl: new Control({
        actionHandler: jest.fn()
      })
    } as never

    applyShapeCornerFreeScaleControls({
      target: group
    })

    const actionHandler = (group.controls.tl as Control).actionHandler as NonNullable<Control['actionHandler']>
    scalingEquallyMock.mockImplementationOnce((eventData, transform) => {
      transform.target.set('scaleX', 0.4)
      transform.target.set('scaleY', 0.4)

      return {
        eventData,
        mode: 'proportional-scaling-result'
      }
    })
    const eventData = {
      shiftKey: true
    } satisfies Pick<TPointerEvent, 'shiftKey'>
    const transform = {
      target,
      originX: 'left',
      originY: 'top'
    } as unknown as Transform

    const result = actionHandler(
      eventData as TPointerEvent,
      transform,
      10,
      20
    )

    expect(result).toEqual({
      eventData,
      mode: 'proportional-scaling-result'
    })
    expect(scalingEquallyMock).toHaveBeenCalledWith(
      eventData,
      transform,
      10,
      20
    )
    expect(target.scaleX).toBeCloseTo(0.4, 4)
    expect(target.scaleY).toBeCloseTo(0.4, 4)
    expect(canvas.uniformScaling).toBe(true)
  })

  it('corner control без Shift переводит пропорциональный объект в непропорциональный free-scale режим', () => {
    const group = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })
    const target = {
      canvas: {
        uniformScaling: true
      },
      scaleX: 1,
      scaleY: 1,
      lockScalingX: false,
      lockScalingY: false,
      lockScalingFlip: false,
      set: jest.fn((key: string, value: number) => {
        target[key as 'scaleX' | 'scaleY'] = value
      }),
      _getTransformedDimensions: jest.fn(() => ({
        x: 100,
        y: 100
      }))
    }

    group.controls = {
      tl: new Control({
        actionHandler: jest.fn()
      })
    } as never

    applyShapeCornerFreeScaleControls({
      target: group
    })

    const actionHandler = (group.controls.tl as Control).actionHandler as NonNullable<Control['actionHandler']>
    const eventData = {
      shiftKey: false
    } satisfies Pick<TPointerEvent, 'shiftKey'>
    const transform = {
      target,
      originX: 'left',
      originY: 'top'
    } as unknown as Transform

    const result = actionHandler(
      eventData as TPointerEvent,
      transform,
      50,
      25
    )

    expect(result).toBe(true)
    expect(scalingEquallyMock).not.toHaveBeenCalled()
    expect(target.scaleX).toBeCloseTo(0.5, 4)
    expect(target.scaleY).toBeCloseTo(0.25, 4)
    expect(target.scaleX).not.toBeCloseTo(target.scaleY, 4)
  })

  it('при lockScalingFlip продолжает обновлять scaleY, когда scaleX упёрся в opposite corner', () => {
    const group = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })
    const target = {
      canvas: {
        uniformScaling: true
      },
      scaleX: 1,
      scaleY: 1,
      lockScalingX: false,
      lockScalingY: false,
      lockScalingFlip: true,
      set: jest.fn((key: string, value: number) => {
        target[key as 'scaleX' | 'scaleY'] = value
      }),
      _getTransformedDimensions: jest.fn(() => ({
        x: 100,
        y: 100
      }))
    }

    group.controls = {
      tl: new Control({
        actionHandler: jest.fn()
      })
    } as never

    applyShapeCornerFreeScaleControls({
      target: group
    })

    const actionHandler = (group.controls.tl as Control).actionHandler as NonNullable<Control['actionHandler']>
    const transform = {
      target,
      originX: 'left',
      originY: 'top'
    } as unknown as Transform
    const eventData = {
      shiftKey: false
    } satisfies Pick<TPointerEvent, 'shiftKey'>

    actionHandler(
      eventData as TPointerEvent,
      transform,
      50,
      50
    )

    const result = actionHandler(
      eventData as TPointerEvent,
      transform,
      -50,
      25
    )

    expect(result).toBe(true)
    expect(target.scaleX).toBeCloseTo(0.5, 4)
    expect(target.scaleY).toBeCloseTo(0.125, 4)
  })

  it('при lockScalingFlip продолжает обновлять scaleX, когда scaleY упёрся в opposite corner', () => {
    const group = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })
    const target = {
      canvas: {
        uniformScaling: true
      },
      scaleX: 1,
      scaleY: 1,
      lockScalingX: false,
      lockScalingY: false,
      lockScalingFlip: true,
      set: jest.fn((key: string, value: number) => {
        target[key as 'scaleX' | 'scaleY'] = value
      }),
      _getTransformedDimensions: jest.fn(() => ({
        x: 100,
        y: 100
      }))
    }

    group.controls = {
      tl: new Control({
        actionHandler: jest.fn()
      })
    } as never

    applyShapeCornerFreeScaleControls({
      target: group
    })

    const actionHandler = (group.controls.tl as Control).actionHandler as NonNullable<Control['actionHandler']>
    const transform = {
      target,
      originX: 'left',
      originY: 'top'
    } as unknown as Transform
    const eventData = {
      shiftKey: false
    } satisfies Pick<TPointerEvent, 'shiftKey'>

    actionHandler(
      eventData as TPointerEvent,
      transform,
      50,
      50
    )

    const result = actionHandler(
      eventData as TPointerEvent,
      transform,
      25,
      -50
    )

    expect(result).toBe(true)
    expect(target.scaleX).toBeCloseTo(0.125, 4)
    expect(target.scaleY).toBeCloseTo(0.5, 4)
  })
})
