import { Point } from 'fabric'
import {
  applyShapeTextLayout,
  isShapeTextFrameFilled,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText,
  resolveShapeTextFrameLayout
} from '../../../../src/editor/shape-manager/shape-layout'
import { resizeShapeNode } from '../../../../src/editor/shape-manager/shape-factory'
import {
  isShapeGroup
} from '../../../../src/editor/shape-manager/shape-utils'
import {
  createShapeScalingSetup,
  createShapeScalingTransform,
  mockShapeGroupPositionByOrigin
} from '../../../test-utils/shape-scaling-helpers'

jest.mock('../../../../src/editor/shape-manager/shape-layout', () => ({
  applyShapeTextLayout: jest.fn(),
  isShapeTextFrameFilled: jest.fn(),
  resolveMinimumShapeWidthForText: jest.fn(() => 100),
  resolveRequiredShapeHeightForText: jest.fn(({ height }: { height: number }) => height),
  resolveShapeTextFrameLayout: jest.fn(() => ({
    frame: {
      left: -60,
      top: -40,
      width: 120,
      height: 120
    },
    splitByGrapheme: false,
    textTop: -20
  }))
}))

jest.mock('../../../../src/editor/shape-manager/shape-factory', () => ({
  resizeShapeNode: jest.fn()
}))

jest.mock('../../../../src/editor/shape-manager/shape-utils', () => ({
  getShapeNodes: jest.fn(),
  isShapeGroup: jest.fn()
}))

describe('shape-scaling', () => {
  const applyShapeTextLayoutMock = applyShapeTextLayout as jest.Mock
  const isShapeTextFrameFilledMock = isShapeTextFrameFilled as jest.Mock
  const resolveMinimumShapeWidthForTextMock = resolveMinimumShapeWidthForText as jest.Mock
  const resolveRequiredShapeHeightForTextMock = resolveRequiredShapeHeightForText as jest.Mock
  const resolveShapeTextFrameLayoutMock = resolveShapeTextFrameLayout as jest.Mock
  const resizeShapeNodeMock = resizeShapeNode as jest.Mock
  const isShapeGroupMock = isShapeGroup as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    isShapeGroupMock.mockImplementation((target: { shapeComposite?: boolean }) => target?.shapeComposite === true)
    resolveMinimumShapeWidthForTextMock.mockReturnValue(100)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => height)
  })

  it('блокирует уменьшение заполненного текстом шейпа как noop (без изменения размеров)', () => {
    const {
      controller,
      canvas,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(true)

    group.scaleX = 0.8
    group.scaleY = 0.8
    group.left = 480
    group.top = 420

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    expect(group.shapeScalingNoopTransform).toBe(true)
    expect(group.scaleX).toBe(1)
    expect(group.scaleY).toBe(1)
    expect(group.left).toBe(480)
    expect(group.top).toBe(420)

    controller.handleObjectModified({
      target: group
    })

    expect(applyShapeTextLayoutMock).not.toHaveBeenCalled()
    expect(group.scaleX).toBe(1)
    expect(group.scaleY).toBe(1)
    expect(group.shapeScalingNoopTransform).toBe(false)
    expect(canvas.requestRenderAll).toHaveBeenCalled()
  })

  it('не допускает flip при диагональном ресайзе через противоположный угол', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)

    group.flipX = false
    group.flipY = false
    group.scaleX = -1.1
    group.scaleY = 1.1

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    expect(group.lockScalingFlip).toBe(true)
    expect(group.scaleX).toBe(1)
    expect(group.scaleY).toBe(1)
    expect(group.flipX).toBe(false)
    expect(group.flipY).toBe(false)
    expect(group.shapeScalingNoopTransform).toBe(true)
  })

  it('не блокирует уменьшение когда следующий layout требует splitByGrapheme', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveShapeTextFrameLayoutMock.mockReturnValueOnce({
      frame: {
        left: -60,
        top: -40,
        width: 120,
        height: 120
      },
      splitByGrapheme: true,
      textTop: -20
    })

    group.scaleX = 0.8
    group.scaleY = 0.8
    group.left = 480
    group.top = 420

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    expect(group.shapeScalingNoopTransform).toBe(false)
    expect(group.scaleX).toBe(0.8)
    expect(group.scaleY).toBe(0.8)
  })

  it('обновляет текстовый layout в live-режиме во время scaling', () => {
    const {
      controller,
      canvas,
      group,
      text
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveShapeTextFrameLayoutMock.mockReturnValue({
      frame: {
        left: -60,
        top: -40,
        width: 120,
        height: 160
      },
      splitByGrapheme: false,
      textTop: -10
    })

    group.scaleX = 1.5
    group.scaleY = 2

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    expect(text.width).toBe(120)
    expect(text.left).toBeCloseTo(-40, 4)
    expect(text.top).toBeCloseTo(-5, 4)
    expect(text.scaleX).toBeCloseTo(1 / 1.5, 4)
    expect(text.scaleY).toBeCloseTo(0.5, 4)
    expect(canvas.requestRenderAll).toHaveBeenCalled()
  })

  it('синхронизирует высоту группы с live-preview высотой текста при переносе строк', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveRequiredShapeHeightForTextMock.mockReturnValue(360)

    group.scaleX = 0.5
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: createShapeScalingTransform()
    })

    expect(group.width).toBe(200)
    expect(group.height).toBe(360)
  })

  it('после упора в минимальную ширину позволяет снова растягивать объект в той же drag-сессии', () => {
    const {
      controller,
      canvas,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveMinimumShapeWidthForTextMock.mockReturnValue(100)

    const canvasWithTransform = canvas as typeof canvas & {
      _currentTransform?: unknown
      getScenePoint: jest.Mock
      getZoom: jest.Mock
    }

    canvasWithTransform.getScenePoint = jest.fn(() => ({
      x: -10,
      y: 0,
      rotate: jest.fn(() => new Point(-10, 0)),
      subtract: jest.fn(() => new Point(-10, 0))
    }))
    canvasWithTransform.getZoom = jest.fn(() => 1)
    group.canvas = canvasWithTransform as never
    group.getRelativeCenterPoint = jest.fn(() => new Point(0, 0)) as never
    group.translateToGivenOrigin = jest.fn((point: Point) => point) as never
    group.controls = {
      br: {
        offsetX: 0,
        offsetY: 0
      }
    } as never

    group.scaleX = 1
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: createShapeScalingTransform()
    })

    canvasWithTransform._currentTransform = {
      ...createShapeScalingTransform(),
      target: group,
      action: 'scaleX',
      signX: 1
    }

    controller.handleCanvasMouseMove({
      e: {} as PointerEvent
    })

    expect(group.scaleX).toBeCloseTo(0.5, 4)
    expect(group.shapeScalingNoopTransform).toBe(false)

    group.scaleX = 0.9

    controller.handleObjectScaling({
      target: group,
      transform: createShapeScalingTransform()
    })

    expect(group.scaleX).toBeCloseTo(0.9, 4)
    expect(group.shapeScalingNoopTransform).toBe(false)
  })

  it('запекает размеры после разрешенного scaling и сбрасывает scale у группы/текста', () => {
    const {
      controller,
      group,
      text
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)

    group.scaleX = 1.5
    group.scaleY = 1.25

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    controller.handleObjectModified({
      target: group
    })

    const layoutCall = applyShapeTextLayoutMock.mock.calls[0]?.[0]
    expect(layoutCall).toEqual(expect.objectContaining({
      width: 300,
      height: 250
    }))
    expect(group.scaleX).toBe(1)
    expect(group.scaleY).toBe(1)
    expect(text.scaleX).toBe(1)
    expect(text.scaleY).toBe(1)
    expect(group.shapeManualBaseWidth).toBe(300)
    expect(group.shapeManualBaseHeight).toBe(250)
  })

  it('масштабирует shapeRounding пропорционально при равномерном увеличении', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    group.shapeRounding = 50
    isShapeTextFrameFilledMock.mockReturnValue(false)

    group.scaleX = 2
    group.scaleY = 2

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    controller.handleObjectModified({
      target: group
    })

    expect(group.shapeRounding).toBe(100)
  })

  it('масштабирует shapeRounding пропорционально при уменьшении', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    group.shapeRounding = 80
    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveMinimumShapeWidthForTextMock.mockReturnValue(1)

    group.scaleX = 0.5
    group.scaleY = 0.5

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    controller.handleObjectModified({
      target: group
    })

    expect(group.shapeRounding).toBe(40)
  })

  it('при непропорциональном масштабировании использует min(scaleX, scaleY) для rounding', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    group.shapeRounding = 50
    isShapeTextFrameFilledMock.mockReturnValue(false)

    group.scaleX = 3
    group.scaleY = 2

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    controller.handleObjectModified({
      target: group
    })

    expect(group.shapeRounding).toBe(100)
  })

  it('не меняет shapeRounding если он равен 0', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    group.shapeRounding = 0
    isShapeTextFrameFilledMock.mockReturnValue(false)

    group.scaleX = 3
    group.scaleY = 3

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    controller.handleObjectModified({
      target: group
    })

    expect(group.shapeRounding).toBe(0)
  })

  it('при заполненном фрейме не даёт уменьшить базовую высоту ниже текущей', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    group.scaleX = 0.7
    group.scaleY = 0.8

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    controller.handleObjectModified({
      target: group
    })

    const layoutCall = applyShapeTextLayoutMock.mock.calls[0]?.[0]
    expect(layoutCall.width).toBe(140)
    expect(layoutCall.height).toBeGreaterThanOrEqual(200)
  })

  it('сохраняет одинаковую минимальную ширину после повторных циклов shrink-expand-shrink', () => {
    const {
      controller,
      canvas,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveMinimumShapeWidthForTextMock.mockReturnValue(100)

    const canvasWithTransform = canvas as typeof canvas & {
      _currentTransform?: unknown
      getScenePoint: jest.Mock
      getZoom: jest.Mock
    }
    const minimumWidthTransform = {
      ...createShapeScalingTransform(),
      target: group,
      action: 'scaleX',
      signX: 1
    } as never

    canvasWithTransform.getScenePoint = jest.fn(() => ({
      x: -10,
      y: 0,
      rotate: jest.fn(() => new Point(-10, 0)),
      subtract: jest.fn(() => new Point(-10, 0))
    }))
    canvasWithTransform.getZoom = jest.fn(() => 1)
    group.canvas = canvasWithTransform as never
    group.getRelativeCenterPoint = jest.fn(() => new Point(0, 0)) as never
    group.translateToGivenOrigin = jest.fn((point: Point) => point) as never
    group.controls = {
      br: {
        offsetX: 0,
        offsetY: 0
      }
    } as never

    group.scaleX = 1
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: createShapeScalingTransform()
    })
    canvasWithTransform._currentTransform = minimumWidthTransform
    controller.handleCanvasMouseMove({
      e: {} as PointerEvent
    })
    controller.handleObjectModified({
      target: group,
      e: {} as PointerEvent,
      transform: minimumWidthTransform
    })

    group.scaleX = 2
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: createShapeScalingTransform()
    })
    controller.handleObjectModified({
      target: group
    })

    group.scaleX = 1
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: createShapeScalingTransform()
    })
    canvasWithTransform._currentTransform = minimumWidthTransform
    controller.handleCanvasMouseMove({
      e: {} as PointerEvent
    })
    controller.handleObjectModified({
      target: group,
      e: {} as PointerEvent,
      transform: minimumWidthTransform
    })

    const firstShrinkCall = applyShapeTextLayoutMock.mock.calls[0]?.[0]
    const expandCall = applyShapeTextLayoutMock.mock.calls[1]?.[0]
    const secondShrinkCall = applyShapeTextLayoutMock.mock.calls[2]?.[0]

    expect(firstShrinkCall.width).toBe(100)
    expect(expandCall.width).toBe(200)
    expect(secondShrinkCall.width).toBe(100)
  })

  it('фиксирует anchor в live-режиме и восстанавливает позицию через setPositionByOrigin', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    mockShapeGroupPositionByOrigin({ group })

    group.getCenterPoint = jest.fn(() => new Point(480, 420)) as never
    group.scaleX = 1.4
    group.scaleY = 1.3
    group.left = 530
    group.top = 490

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    expect(group.setPositionByOrigin).toHaveBeenCalledWith(expect.objectContaining({
      x: 480,
      y: 420
    }), 'left', 'top')
    expect(group.left).toBe(480)
    expect(group.top).toBe(420)
  })

  it('компенсирует live-геометрию shape с учетом немасштабируемой обводки', () => {
    const {
      controller,
      group,
      shape
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    group.shapeStrokeWidth = 10
    group.scaleX = 2
    group.scaleY = 2

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    const resizeCall = resizeShapeNodeMock.mock.calls.at(-1)?.[0]
    expect(resizeCall).toEqual(expect.objectContaining({
      shape,
      strokeWidth: 10
    }))
    expect(resizeCall.width).toBeCloseTo(205, 4)
    expect(resizeCall.height).toBeCloseTo(205, 4)
  })

  it('восстанавливает anchor на object:modified и не даёт прыжка позиции', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    mockShapeGroupPositionByOrigin({ group })

    group.getCenterPoint = jest.fn(() => new Point(480, 420)) as never
    group.scaleX = 1.5
    group.scaleY = 1.25

    controller.handleObjectScaling({
      target: group,
      transform: {
        original: {
          scaleX: 1,
          scaleY: 1,
          left: 480,
          top: 420
        },
        corner: 'br',
        originX: 'left',
        originY: 'top'
      } as never
    })

    const callsAfterScaling = group.setPositionByOrigin.mock.calls.length
    group.left = 700
    group.top = 700

    controller.handleObjectModified({
      target: group
    })

    expect(group.setPositionByOrigin.mock.calls.length).toBeGreaterThan(callsAfterScaling)
    expect(group.setPositionByOrigin).toHaveBeenLastCalledWith(expect.objectContaining({
      x: 480,
      y: 420
    }), 'left', 'top')
    expect(group.left).toBe(480)
    expect(group.top).toBe(420)
  })
})
