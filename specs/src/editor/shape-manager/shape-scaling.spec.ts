import ShapeScalingController from '../../../../src/editor/shape-manager/shape-scaling'
import {
  applyShapeTextLayout,
  isShapeTextFrameFilled,
  resolveShapeTextFrameLayout
} from '../../../../src/editor/shape-manager/shape-layout'
import {
  getShapeNodes,
  isShapeGroup
} from '../../../../src/editor/shape-manager/shape-utils'
import {
  createMockCanvas,
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'

jest.mock('../../../../src/editor/shape-manager/shape-layout', () => ({
  applyShapeTextLayout: jest.fn(),
  isShapeTextFrameFilled: jest.fn(),
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

jest.mock('../../../../src/editor/shape-manager/shape-utils', () => ({
  getShapeNodes: jest.fn(),
  isShapeGroup: jest.fn()
}))

describe('shape-scaling', () => {
  const applyShapeTextLayoutMock = applyShapeTextLayout as jest.Mock
  const isShapeTextFrameFilledMock = isShapeTextFrameFilled as jest.Mock
  const resolveShapeTextFrameLayoutMock = resolveShapeTextFrameLayout as jest.Mock
  const getShapeNodesMock = getShapeNodes as jest.Mock
  const isShapeGroupMock = isShapeGroup as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    isShapeGroupMock.mockImplementation((target: { shapeComposite?: boolean }) => target?.shapeComposite === true)
  })

  it('блокирует уменьшение заполненного текстом шейпа как noop (без изменения размеров)', () => {
    const {
      controller,
      canvas,
      group
    } = createScalingSetup()

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
    } = createScalingSetup()

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

  it('обновляет текстовый layout в live-режиме во время scaling', () => {
    const {
      controller,
      canvas,
      group,
      text
    } = createScalingSetup()

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

  it('запекает размеры после разрешенного scaling и сбрасывает scale у группы/текста', () => {
    const {
      controller,
      group,
      text
    } = createScalingSetup()

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

  it('при заполненном фрейме не даёт уменьшить базовые размеры ниже текущих', () => {
    const {
      controller,
      group
    } = createScalingSetup()

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
    expect(layoutCall.width).toBeGreaterThanOrEqual(200)
    expect(layoutCall.height).toBeGreaterThanOrEqual(200)
  })
})

function createScalingSetup(): {
  controller: ShapeScalingController
  canvas: ReturnType<typeof createMockCanvas>
  group: ReturnType<typeof createMockShapeGroup>
  text: ReturnType<typeof createMockShapeTextbox>
} {
  const canvas = createMockCanvas()
  const shape = createMockShapeNode({
    width: 200,
    height: 200
  })
  const text = createMockShapeTextbox({
    text: 'test text',
    width: 200,
    fontSize: 30
  })
  const group = createMockShapeGroup({
    shape,
    text,
    left: 480,
    top: 420,
    width: 200,
    height: 200
  })

  const getShapeNodesMock = getShapeNodes as jest.Mock
  getShapeNodesMock.mockReturnValue({
    shape,
    text
  })

  return {
    controller: new ShapeScalingController({
      canvas: canvas as never
    }),
    canvas,
    group,
    text
  }
}

