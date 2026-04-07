import { Point } from 'fabric'
import {
  applyShapeTextLayout,
  isShapeTextFrameFilled,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText,
  resolveShapeTextFrameLayout
} from '../../../../src/editor/shape-manager/layout/shape-layout'
import { resizeShapeNode } from '../../../../src/editor/shape-manager/shape-factory'
import {
  isShapeGroup
} from '../../../../src/editor/shape-manager/shape-utils'
import {
  createShapeScalingSetup,
  createShapeScalingTransform,
  mockShapeScalingLocalPointer,
  mockShapeGroupPositionByOrigin
} from '../../../test-utils/shape-scaling-helpers'

jest.mock('../../../../src/editor/shape-manager/layout/shape-layout', () => ({
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
    applyShapeTextLayoutMock.mockImplementation(({
      group,
      width,
      height
    }: {
      group: {
        width?: number
        height?: number
        shapeBaseWidth?: number
        shapeBaseHeight?: number
      }
      width: number
      height: number
    }) => {
      group.width = width
      group.height = height
      group.shapeBaseWidth = width
      group.shapeBaseHeight = height
    })
  })

  it('обрабатывает vertical shrink как noop, если shape уже стоит на minimum height в начале drag', () => {
    const {
      controller,
      canvas,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => {
      if (height === 1) return 200

      return height
    })

    group.scaleY = 0.8
    group.left = 480
    group.top = 420
    const initialAnchor = group.getPointByOrigin('center', 'top')

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    expect(group.shapeScalingNoopTransform).toBe(true)
    expect(group.scaleX).toBe(1)
    expect(group.scaleY).toBe(1)
    expect(group.left).toBe(480)
    expect(group.getPointByOrigin('center', 'top')).toEqual(initialAnchor)

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
    expect(group.shapeScalingNoopTransform).toBe(false)
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

  it('при proportional corner scaling по Shift откатывает весь transform к последнему допустимому состоянию', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveMinimumShapeWidthForTextMock.mockReturnValue(100)

    group.scaleX = 0.4
    group.scaleY = 0.4

    controller.handleObjectScaling({
      target: group,
      e: {
        shiftKey: true
      } as never,
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

    expect(group.scaleX).toBe(1)
    expect(group.scaleY).toBe(1)
    expect(group.shapeScalingNoopTransform).toBe(false)
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

  it('в live-режиме зажимает vertical shrink на minimum height текста, если Fabric пропустил scaling-кадр', () => {
    const {
      controller,
      canvas,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => {
      if (height === 1) return 80

      return height
    })

    const canvasWithTransform = canvas as typeof canvas & {
      _currentTransform?: unknown
    }

    mockShapeScalingLocalPointer({
      canvas: canvasWithTransform,
      group,
      corner: 'mb',
      localPoint: new Point(0, -10)
    })

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    canvasWithTransform._currentTransform = {
      ...createShapeScalingTransform({
        corner: 'mb',
        originX: 'center',
        originY: 'top'
      }),
      target: group,
      action: 'scaleY',
      signY: 1
    }

    controller.handleCanvasMouseMove({
      e: {} as PointerEvent
    })

    expect(group.scaleY).toBeCloseTo(0.4, 4)
    expect((group.height ?? 0) * (group.scaleY ?? 1)).toBeCloseTo(80, 4)
    expect(group.shapeScalingNoopTransform).toBe(false)
  })

  it('при vertical shrink компенсирует text.scaleY и не уменьшает визуальный размер текста', () => {
    const {
      controller,
      text,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveShapeTextFrameLayoutMock.mockReturnValue({
      frame: {
        left: -60,
        top: -40,
        width: 120,
        height: 80
      },
      splitByGrapheme: false,
      textTop: -20
    })

    group.scaleX = 1
    group.scaleY = 0.5

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    expect(text.scaleX).toBeCloseTo(1, 4)
    expect(text.scaleY).toBeCloseTo(2, 4)
  })

  it('на object:modified запекает vertical shrink в minimum height текста, даже если lastAllowedScaleY устарел', () => {
    const {
      controller,
      canvas,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => {
      if (height === 1) return 80

      return height
    })

    mockShapeScalingLocalPointer({
      canvas,
      group,
      corner: 'mb',
      localPoint: new Point(0, -10)
    })

    group.scaleY = 0.9

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    controller.handleObjectModified({
      target: group,
      e: {} as PointerEvent,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY',
        signY: 1
      } as never
    })

    const layoutCall = applyShapeTextLayoutMock.mock.calls.at(-1)?.[0]

    expect(layoutCall).toEqual(expect.objectContaining({
      width: 200,
      height: 80
    }))
    expect(group.scaleY).toBe(1)
  })

  it('в live-режиме зажимает vertical shrink пустого shape на 1px', () => {
    const {
      controller,
      canvas,
      group,
      text
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    text.set({
      text: ''
    })
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => {
      if (height === 1) return 1

      return height
    })

    const canvasWithTransform = canvas as typeof canvas & {
      _currentTransform?: unknown
    }

    mockShapeScalingLocalPointer({
      canvas: canvasWithTransform,
      group,
      corner: 'mb',
      localPoint: new Point(0, -10)
    })

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    canvasWithTransform._currentTransform = {
      ...createShapeScalingTransform({
        corner: 'mb',
        originX: 'center',
        originY: 'top'
      }),
      target: group,
      action: 'scaleY',
      signY: 1
    }

    controller.handleCanvasMouseMove({
      e: {} as PointerEvent
    })

    expect(group.scaleY).toBeCloseTo(0.005, 4)
    expect((group.height ?? 0) * (group.scaleY ?? 1)).toBeCloseTo(1, 4)
    expect(group.shapeScalingNoopTransform).toBe(false)
  })

  it('на object:modified запекает vertical shrink пустого shape в 1px', () => {
    const {
      controller,
      canvas,
      group,
      text
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    text.set({
      text: ''
    })
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => {
      if (height === 1) return 1

      return height
    })

    mockShapeScalingLocalPointer({
      canvas,
      group,
      corner: 'mb',
      localPoint: new Point(0, -10)
    })

    group.scaleY = 0.8

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    controller.handleObjectModified({
      target: group,
      e: {} as PointerEvent,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY',
        signY: 1
      } as never
    })

    const layoutCall = applyShapeTextLayoutMock.mock.calls.at(-1)?.[0]

    expect(layoutCall).toEqual(expect.objectContaining({
      width: 200,
      height: 1
    }))
    expect(group.scaleY).toBe(1)
  })

  it('horizontal scaling не блокируется из-за vertical minimum на старте drag', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => {
      if (height === 1) return 200

      return height
    })

    group.scaleX = 0.8
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX'
      } as never
    })

    expect(group.shapeScalingNoopTransform).toBe(false)
    expect(group.scaleX).toBe(0.8)
  })

  it('при уменьшении по ширине не учитывает пользовательские отступы в минимальной ширине', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    group.shapePresetKey = 'square'
    group.shapePaddingTop = 12
    group.shapePaddingRight = 40
    group.shapePaddingBottom = 14
    group.shapePaddingLeft = 30
    group.scaleX = 0.4
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX'
      } as never
    })

    expect(resolveMinimumShapeWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    }))
  })

  it('при уменьшении по ширине сохраняет внутренний отступ формы в минимальной ширине', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    group.shapePresetKey = 'circle'
    group.shapePaddingTop = 12
    group.shapePaddingRight = 40
    group.shapePaddingBottom = 14
    group.shapePaddingLeft = 30
    group.shapeBaseWidth = 200
    group.shapeBaseHeight = 200
    group.scaleX = 0.4
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX'
      } as never
    })

    expect(resolveMinimumShapeWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
      }
    }))
  })

  it('при уменьшении по ширине учитывает обводку в минимальной ширине', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    Object.assign(group, {
      shapeStroke: '#00ff00'
    })
    group.shapePresetKey = 'square'
    group.shapeStrokeWidth = 10
    group.scaleX = 0.4
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX'
      } as never
    })

    expect(resolveMinimumShapeWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
      }
    }))
  })

  it('при уменьшении по ширине складывает внутренний отступ формы и обводку', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    Object.assign(group, {
      shapeStroke: '#00ff00'
    })
    group.shapePresetKey = 'circle'
    group.shapeStrokeWidth = 10
    group.shapeBaseWidth = 200
    group.shapeBaseHeight = 200
    group.scaleX = 0.4
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX'
      } as never
    })

    expect(resolveMinimumShapeWidthForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    }))
  })

  it('после vertical shrink до minimum height horizontal scaling продолжает работать', () => {
    const {
      controller,
      canvas,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => {
      if (height === 1) return 80

      return height
    })

    mockShapeScalingLocalPointer({
      canvas,
      group,
      corner: 'mb',
      localPoint: new Point(0, -10)
    })

    group.scaleY = 0.5

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    controller.handleObjectModified({
      target: group,
      e: {} as PointerEvent,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY',
        signY: 1
      } as never
    })

    group.scaleX = 0.8
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX'
      } as never
    })

    expect(group.shapeScalingNoopTransform).toBe(false)
    expect(group.scaleX).toBe(0.8)
  })

  it('при заблокированном vertical shrink восстанавливает текущую laid-out height, а не manual base height', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => {
      if (height === 1) return 180

      return height
    })

    group.shapeBaseWidth = 60
    group.shapeBaseHeight = 180
    group.shapeManualBaseWidth = 60
    group.shapeManualBaseHeight = 80
    group.width = 60
    group.height = 180
    group.scaleY = 0.8

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    expect(group.shapeScalingNoopTransform).toBe(true)

    controller.handleObjectModified({
      target: group
    })

    expect(applyShapeTextLayoutMock).not.toHaveBeenCalled()
    expect(resizeShapeNodeMock).toHaveBeenLastCalledWith(expect.objectContaining({
      width: 60,
      height: 180
    }))
    expect(group.height).toBe(180)
    expect(group.shapeManualBaseHeight).toBe(80)
    expect(group.shapeScalingNoopTransform).toBe(false)
  })

  it('при vertical scaling сохраняет текущую ширину, если она уже больше ручной базовой', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)

    group.shapeBaseWidth = 209
    group.shapeBaseHeight = 320
    group.shapeManualBaseWidth = 200
    group.shapeManualBaseHeight = 320
    group.width = 209
    group.height = 320
    group.scaleY = 0.8

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    expect(group.width).toBe(209)
    expect(group.shapeManualBaseWidth).toBe(200)
  })

  it('при vertical scaling на object:modified не переписывает ручную базовую ширину текущей шириной', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)

    group.shapeBaseWidth = 209
    group.shapeBaseHeight = 320
    group.shapeManualBaseWidth = 200
    group.shapeManualBaseHeight = 320
    group.width = 209
    group.height = 320
    group.scaleY = 0.5

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    controller.handleObjectModified({
      target: group
    })

    const layoutCall = applyShapeTextLayoutMock.mock.calls.at(-1)?.[0]

    expect(layoutCall).toEqual(expect.objectContaining({
      width: 209,
      height: 160
    }))
    expect(group.shapeManualBaseWidth).toBe(200)
    expect(group.shapeManualBaseHeight).toBe(160)
    expect(group.shapeBaseWidth).toBe(209)

    const groupWithReplaceBox = group as typeof group & {
      shapeReplaceBoxWidth?: number
      shapeReplaceBoxHeight?: number
    }

    expect(groupWithReplaceBox.shapeReplaceBoxWidth).toBe(209)
    expect(groupWithReplaceBox.shapeReplaceBoxHeight).toBe(160)
  })

  it('minimum height для vertical clamp считает от текущей width', () => {
    const {
      controller,
      canvas,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ width, height }: {
      width: number
      height: number
    }) => {
      if (height === 1) {
        return width <= 140 ? 90 : 80
      }

      return height
    })

    mockShapeScalingLocalPointer({
      canvas,
      group,
      corner: 'mb',
      localPoint: new Point(0, -10)
    })

    group.scaleX = 0.7
    group.scaleY = 0.9

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    controller.handleObjectModified({
      target: group,
      e: {} as PointerEvent,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY',
        signY: 1
      } as never
    })

    expect(resolveRequiredShapeHeightForTextMock).toHaveBeenCalledWith(expect.objectContaining({
      width: 140,
      height: 1
    }))
  })

  it('при отсутствии изменения размеров на object:modified восстанавливает text-shape через applyShapeTextLayout', () => {
    const {
      controller,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)

    group.scaleX = 1.001
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX'
      } as never
    })

    controller.handleObjectModified({
      target: group
    })

    const layoutCall = applyShapeTextLayoutMock.mock.calls.at(-1)?.[0]

    expect(layoutCall).toEqual(expect.objectContaining({
      width: 200,
      height: 200
    }))
    expect(group.scaleX).toBe(1)
    expect(group.scaleY).toBe(1)
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

  it('после minimum width и minimum height horizontal scaling обратно вширь продолжает работать', () => {
    const {
      controller,
      canvas,
      group
    } = createShapeScalingSetup()

    isShapeTextFrameFilledMock.mockReturnValue(false)
    resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }: { height: number }) => {
      if (height === 1) return 80

      return height
    })

    mockShapeScalingLocalPointer({
      canvas,
      group,
      corner: 'mr',
      localPoint: new Point(-10, 0)
    })

    group.scaleX = 0.8
    group.scaleY = 0.8

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX'
      } as never
    })

    controller.handleObjectModified({
      target: group,
      e: {} as PointerEvent,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX',
        signX: 1
      } as never
    })

    mockShapeScalingLocalPointer({
      canvas,
      group,
      corner: 'mb',
      localPoint: new Point(0, -10)
    })

    group.scaleX = 1
    group.scaleY = 0.8

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY'
      } as never
    })

    controller.handleObjectModified({
      target: group,
      e: {} as PointerEvent,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mb',
          originX: 'center',
          originY: 'top'
        }),
        action: 'scaleY',
        signY: 1
      } as never
    })

    group.scaleX = 1.2
    group.scaleY = 1

    controller.handleObjectScaling({
      target: group,
      transform: {
        ...createShapeScalingTransform({
          corner: 'mr',
          originX: 'left',
          originY: 'center'
        }),
        action: 'scaleX'
      } as never
    })

    expect(group.shapeScalingNoopTransform).toBe(false)
    expect(group.scaleX).toBe(1.2)
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
    const initialAnchor = group.getPointByOrigin('left', 'top')

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
      x: initialAnchor.x,
      y: initialAnchor.y
    }), 'left', 'top')
    expect(group.left).toBe(initialAnchor.x)
    expect(group.top).toBe(initialAnchor.y)
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
    const initialAnchor = group.getPointByOrigin('left', 'top')

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
      x: initialAnchor.x,
      y: initialAnchor.y
    }), 'left', 'top')
    expect(group.left).toBe(initialAnchor.x)
    expect(group.top).toBe(initialAnchor.y)
  })
})
