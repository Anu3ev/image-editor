import { Control, Point, controlsUtils } from 'fabric'
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
      group
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
      group
    })

    const wrappedTopLeftControl = group.controls.tl
    const wrappedTopRightControl = group.controls.tr

    applyShapeCornerFreeScaleControls({
      group
    })

    expect(group.controls.tl).toBe(wrappedTopLeftControl)
    expect(group.controls.tr).toBe(wrappedTopRightControl)
  })

  it('corner control при зажатом Shift использует proportional scaling и восстанавливает uniformScaling canvas', () => {
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
      scaleY: 1
    }

    group.controls = {
      tl: new Control({
        actionHandler: jest.fn()
      })
    } as never

    applyShapeCornerFreeScaleControls({
      group
    })

    const actionHandler = (group.controls.tl as Control).actionHandler as NonNullable<Control['actionHandler']>
    scalingEquallyMock.mockReturnValueOnce('proportional-scaling-result')

    const result = actionHandler(
      {
        shiftKey: true
      },
      {
        target
      },
      10,
      20
    )

    expect(result).toBe('proportional-scaling-result')
    expect(scalingEquallyMock).toHaveBeenCalledWith(
      {
        shiftKey: true
      },
      {
        target
      },
      10,
      20
    )
    expect(canvas.uniformScaling).toBe(true)
  })

  it('corner control без Shift остаётся в free-scale режиме и не вызывает proportional scaling', () => {
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
      group
    })

    const actionHandler = (group.controls.tl as Control).actionHandler as NonNullable<Control['actionHandler']>

    const result = actionHandler(
      {
        shiftKey: false
      },
      {
        target,
        originX: 'left',
        originY: 'top'
      },
      50,
      25
    )

    expect(result).toBe(true)
    expect(scalingEquallyMock).not.toHaveBeenCalled()
    expect(target.scaleX).toBeCloseTo(0.5, 4)
    expect(target.scaleY).toBeCloseTo(0.25, 4)
  })
})
