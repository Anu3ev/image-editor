import { Control, Group } from 'fabric'

import type {
  RectangularScaleControlKey,
  RectangularScaleMultipliers
} from '../../../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import { ScaleSnappingRuntime } from '../../../../../src/editor/snapping-manager/scaling/scale-snapping-runtime'
import {
  createImageScaleMouseMoveEvent,
  createImageScaleSnappingHarness,
  createImageScaleStartEvent,
  createImageScaleStepEvent,
  getRequiredImageScaleBounds,
  useImageScaleGuide
} from '../../../../test-utils/snapping/image-scale-snapping-controller'

afterEach(jest.restoreAllMocks)

/** Ожидаемые moving edges одной стандартной ручки Image. */
type ControlCase = Readonly<{
  controlKey: RectangularScaleControlKey
  movingEdges: readonly string[]
}>

/** Fabric-настройки и ожидаемый результат одного scale-режима. */
type ScaleModeCase = Readonly<{
  controlKey: RectangularScaleControlKey
  expected: RectangularScaleMultipliers
  marker: MouseEvent
  multipliers: RectangularScaleMultipliers
  title: string
  uniformScaling: boolean
}>

/** Параметры прилипания одной боковой ручки Image. */
type SideSnapCase = Readonly<{
  axis: 'x' | 'y'
  controlKey: RectangularScaleControlKey
  edge: 'left' | 'right' | 'top' | 'bottom'
  multipliers: RectangularScaleMultipliers
  offset: number
  oppositeEdge: 'left' | 'right' | 'top' | 'bottom'
}>

/** Полная wiring-матрица восьми стандартных ручек Image. */
const CONTROL_CASES: readonly ControlCase[] = Object.freeze([
  { controlKey: 'tl', movingEdges: ['left', 'top'] },
  { controlKey: 'tr', movingEdges: ['right', 'top'] },
  { controlKey: 'bl', movingEdges: ['left', 'bottom'] },
  { controlKey: 'br', movingEdges: ['right', 'bottom'] },
  { controlKey: 'ml', movingEdges: ['left'] },
  { controlKey: 'mr', movingEdges: ['right'] },
  { controlKey: 'mt', movingEdges: ['top'] },
  { controlKey: 'mb', movingEdges: ['bottom'] }
])

/** Horizontal, vertical, free и uniform режимы Image scale. */
const SCALE_MODE_CASES: readonly ScaleModeCase[] = Object.freeze([
  {
    controlKey: 'mr',
    expected: { x: 1.2, y: 1 },
    marker: new MouseEvent('pointermove'),
    multipliers: { x: 1.2, y: 1 },
    title: 'изменяет только ширину при скейлинге справа',
    uniformScaling: true
  },
  {
    controlKey: 'mb',
    expected: { x: 1, y: 1.25 },
    marker: new MouseEvent('pointermove'),
    multipliers: { x: 1, y: 1.25 },
    title: 'изменяет только высоту при скейлинге снизу',
    uniformScaling: true
  },
  {
    controlKey: 'br',
    expected: { x: 1.2, y: 0.8 },
    marker: new MouseEvent('pointermove', { shiftKey: true }),
    multipliers: { x: 1.2, y: 0.8 },
    title: 'свободно изменяет обе оси при скейлинге за угол',
    uniformScaling: true
  },
  {
    controlKey: 'tr',
    expected: { x: 1.15, y: 1.15 },
    marker: new MouseEvent('pointermove', { shiftKey: true }),
    multipliers: { x: 1.15, y: 1.15 },
    title: 'одинаково изменяет обе оси при пропорциональном скейлинге за угол',
    uniformScaling: false
  }
])

/** Прилипание левой, правой, верхней и нижней боковых ручек. */
const SIDE_SNAP_CASES: readonly SideSnapCase[] = Object.freeze([
  {
    axis: 'x',
    controlKey: 'ml',
    edge: 'left',
    multipliers: { x: 1.08, y: 1 },
    offset: -10,
    oppositeEdge: 'right'
  },
  {
    axis: 'x',
    controlKey: 'mr',
    edge: 'right',
    multipliers: { x: 1.08, y: 1 },
    offset: 10,
    oppositeEdge: 'left'
  },
  {
    axis: 'y',
    controlKey: 'mt',
    edge: 'top',
    multipliers: { x: 1, y: 1.1 },
    offset: -10,
    oppositeEdge: 'bottom'
  },
  {
    axis: 'y',
    controlKey: 'mb',
    edge: 'bottom',
    multipliers: { x: 1, y: 1.1 },
    offset: 10,
    oppositeEdge: 'top'
  }
])

it.each(CONTROL_CASES)(
  'для ручки $controlKey учитывает направляющие со стороны изменяемых граней',
  ({ controlKey, movingEdges }) => {
    const harness = createImageScaleSnappingHarness({ controlKey })

    expect(harness.controller.startGesture({
      event: createImageScaleStartEvent({ harness })
    })).toBe(true)
    expect(harness.captureEnvironmentMock).toHaveBeenCalledTimes(1)
    expect(harness.captureEnvironmentMock).toHaveBeenCalledWith({
      activeObject: harness.target,
      targetEdges: movingEdges
    })
  }
)

it.each(SCALE_MODE_CASES)(
  '$title',
  ({
    controlKey,
    expected,
    marker,
    multipliers,
    uniformScaling
  }) => {
    const harness = createImageScaleSnappingHarness({
      controlKey,
      uniformScaling
    })

    expect(harness.controller.startGesture({
      event: createImageScaleStartEvent({ harness })
    })).toBe(true)

    const result = harness.controller.handleObjectScaling({
      event: createImageScaleStepEvent({
        harness,
        marker,
        multipliers
      })
    })

    expect(result.handled).toBe(true)
    expect(harness.target.scaleX).toBeCloseTo(expected.x, 9)
    expect(harness.target.scaleY).toBeCloseTo(expected.y, 9)
    expect(harness.transform.actionPerformed).toBe(true)
  }
)

it('при достижении minScaleLimit синхронизирует Image, Fabric transform и итоговую геометрию', () => {
  const verifyScalePlanMock = jest.spyOn(ScaleSnappingRuntime.prototype, 'verifyScalePlan')
  const harness = createImageScaleSnappingHarness({
    controlKey: 'mr',
    minScaleLimit: 0.5
  })

  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(true)

  const result = harness.controller.handleCanvasMouseMove({
    event: createImageScaleMouseMoveEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: 0.25, y: 1 }
    })
  })
  const finalBounds = getRequiredImageScaleBounds({ target: harness.target })
  const verificationInput = verifyScalePlanMock.mock.calls[0]?.[0]

  expect(result.handled).toBe(true)
  expect(harness.target.scaleX).toBe(0.5)
  expect(harness.transform.scaleX).toBe(harness.target.scaleX)
  expect(harness.transform.scaleY).toBe(harness.target.scaleY)
  expect(finalBounds.left).toBeCloseTo(harness.baselineBounds.left, 9)
  expect(finalBounds.right - finalBounds.left).toBeCloseTo(50, 9)
  expect(verifyScalePlanMock).toHaveBeenCalledTimes(1)
  expect(verificationInput?.finalGeometry.measuredValues).toEqual([0.5])
})

it.each(SIDE_SNAP_CASES)(
  'удерживает ручку $controlKey на направляющей и не сдвигает противоположную грань',
  ({
    axis,
    controlKey,
    edge,
    multipliers,
    offset,
    oppositeEdge
  }) => {
    const harness = createImageScaleSnappingHarness({ controlKey })
    const guidePosition = useImageScaleGuide({
      axis,
      edge,
      harness,
      offset
    })

    expect(harness.controller.startGesture({
      event: createImageScaleStartEvent({ harness })
    })).toBe(true)

    const result = harness.controller.handleObjectScaling({
      event: createImageScaleStepEvent({
        harness,
        marker: new MouseEvent('pointermove'),
        multipliers
      })
    })
    const finalBounds = getRequiredImageScaleBounds({ target: harness.target })

    expect(result.handled).toBe(true)
    if (!result.handled) throw new Error('Боковая ручка Image должна обработать прилипание')
    expect(result.guides).toHaveLength(1)
    expect(result.guides[0]).toMatchObject({ axis, edge, position: guidePosition })
    expect(finalBounds[edge]).toBeCloseTo(guidePosition, 9)
    expect(finalBounds[oppositeEdge]).toBeCloseTo(
      harness.baselineBounds[oppositeEdge],
      9
    )
  }
)

it('один раз применяет scale и возвращает направляющую только после проверки итоговой геометрии', () => {
  const verifyScalePlanMock = jest.spyOn(ScaleSnappingRuntime.prototype, 'verifyScalePlan')
  const harness = createImageScaleSnappingHarness()
  const canonicalState = {
    cropX: harness.target.cropX,
    cropY: harness.target.cropY,
    height: harness.target.height,
    width: harness.target.width
  }
  const guidePosition = useImageScaleGuide({
    axis: 'x',
    edge: 'right',
    harness,
    offset: 10
  })

  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(true)

  const result = harness.controller.handleObjectScaling({
    event: createImageScaleStepEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multiplier: 1.08
    })
  })
  expect(result.handled).toBe(true)
  if (!result.handled) throw new Error('Поддержанный scale-step Image должен быть обработан')

  const finalBounds = getRequiredImageScaleBounds({ target: harness.target })

  expect(result.shouldPublishGuides).toBe(true)
  expect(harness.setMock).toHaveBeenCalledTimes(1)
  expect(harness.setPositionByOriginMock).toHaveBeenCalledTimes(1)
  expect(verifyScalePlanMock).toHaveBeenCalledTimes(1)
  expect(harness.target.scaleX).toBeCloseTo(1.1, 9)
  expect(harness.target.scaleY).toBeCloseTo(1, 9)
  expect(finalBounds.left).toBeCloseTo(harness.baselineBounds.left, 9)
  expect(finalBounds.right).toBeCloseTo(guidePosition, 9)
  expect({
    cropX: harness.target.cropX,
    cropY: harness.target.cropY,
    height: harness.target.height,
    width: harness.target.width
  }).toEqual(canonicalState)
  expect(result.guides).toEqual([{
    axis: 'x',
    edge: 'right',
    position: guidePosition,
    candidateId: 'image-right-guide',
    category: 'edge',
    snapshotIndex: 0
  }])
})

it('сохраняет центр и угол повёрнутого Image при скейлинге по диагонали от центра', () => {
  const harness = createImageScaleSnappingHarness({
    angle: 32,
    centered: true,
    controlKey: 'tr',
    uniformScaling: true
  })
  const fixedAnchor = harness.target.getPointByOrigin(
    harness.transform.originX,
    harness.transform.originY
  )

  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(true)

  const result = harness.controller.handleObjectScaling({
    event: createImageScaleStepEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: 1.18, y: 1.18 }
    })
  })
  const finalAnchor = harness.target.getPointByOrigin(
    harness.transform.originX,
    harness.transform.originY
  )

  expect(result.handled).toBe(true)
  expect(finalAnchor.x).toBeCloseTo(fixedAnchor.x, 9)
  expect(finalAnchor.y).toBeCloseTo(fixedAnchor.y, 9)
  expect(harness.target.angle).toBe(32)
  expect(harness.target.scaleX).toBeCloseTo(1.18, 9)
  expect(harness.target.scaleY).toBeCloseTo(1.18, 9)
})

it('не применяет и не публикует повторно уже проверенный marker', () => {
  const verifyScalePlanMock = jest.spyOn(ScaleSnappingRuntime.prototype, 'verifyScalePlan')
  const harness = createImageScaleSnappingHarness()
  useImageScaleGuide({
    axis: 'x',
    edge: 'right',
    harness,
    offset: 10
  })
  const marker = new MouseEvent('pointermove')

  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(true)

  const event = createImageScaleStepEvent({ harness, marker, multiplier: 1.08 })
  const firstResult = harness.controller.handleObjectScaling({ event })
  const repeatedResult = harness.controller.handleObjectScaling({ event })

  expect(firstResult.handled).toBe(true)
  expect(repeatedResult.handled).toBe(true)
  if (!firstResult.handled || !repeatedResult.handled) {
    throw new Error('Оба вызова одного Image marker должны считаться обработанными')
  }
  expect(firstResult.shouldPublishGuides).toBe(true)
  expect(repeatedResult.shouldPublishGuides).toBe(false)
  expect(repeatedResult.guides).toEqual(firstResult.guides)
  expect(harness.setMock).toHaveBeenCalledTimes(1)
  expect(harness.setPositionByOriginMock).toHaveBeenCalledTimes(1)
  expect(verifyScalePlanMock).toHaveBeenCalledTimes(1)
})

it('с Ctrl применяет raw scale от начала жеста вместо удержанного значения', () => {
  const harness = createImageScaleSnappingHarness()
  useImageScaleGuide({
    axis: 'x',
    edge: 'right',
    harness,
    offset: 10
  })

  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(true)

  const snappedResult = harness.controller.handleObjectScaling({
    event: createImageScaleStepEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multiplier: 1.08
    })
  })
  expect(snappedResult.handled).toBe(true)
  expect(harness.target.scaleX).toBeCloseTo(1.1, 9)

  const rawResult = harness.controller.handleObjectScaling({
    event: createImageScaleStepEvent({
      harness,
      marker: new MouseEvent('pointermove', { ctrlKey: true }),
      multiplier: 1.08
    })
  })
  expect(rawResult.handled).toBe(true)
  if (!rawResult.handled) throw new Error('Scale-step Image с Ctrl должен остаться обработанным')

  const finalBounds = getRequiredImageScaleBounds({ target: harness.target })

  expect(rawResult.guides).toEqual([])
  expect(harness.target.scaleX).toBeCloseTo(1.08, 9)
  expect(harness.target.scaleX).not.toBeCloseTo(1.1 * 1.08, 9)
  expect(finalBounds.left).toBeCloseTo(harness.baselineBounds.left, 9)
  expect(harness.setMock).toHaveBeenCalledTimes(2)
})

it('обрабатывает mouse:move fallback и дедуплицирует его с тем же marker', () => {
  const harness = createImageScaleSnappingHarness()
  const marker = new MouseEvent('pointermove')

  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(true)

  const event = createImageScaleMouseMoveEvent({
    harness,
    marker,
    multipliers: { x: 1.2, y: 1 }
  })
  const firstResult = harness.controller.handleCanvasMouseMove({ event })
  const repeatedResult = harness.controller.handleCanvasMouseMove({ event })

  expect(firstResult.handled).toBe(true)
  expect(repeatedResult.handled).toBe(true)
  if (!firstResult.handled || !repeatedResult.handled) {
    throw new Error('Mouse fallback одного Image marker должен остаться обработанным')
  }
  expect(firstResult.shouldPublishGuides).toBe(true)
  expect(repeatedResult.shouldPublishGuides).toBe(false)
  expect(harness.target.scaleX).toBeCloseTo(1.2, 9)
  expect(harness.target.scaleY).toBeCloseTo(1, 9)
  expect(harness.setMock).toHaveBeenCalledTimes(1)
})

it('при Shift на боковой ручке завершает scale-сессию до стандартного Fabric skew', () => {
  const harness = createImageScaleSnappingHarness({ controlKey: 'mr' })

  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(true)

  const skewResult = harness.controller.handleCanvasMouseMove({
    event: createImageScaleMouseMoveEvent({
      harness,
      marker: new MouseEvent('pointermove', { shiftKey: true }),
      multipliers: { x: 1.2, y: 1 }
    })
  })

  expect(skewResult.handled).toBe(true)
  if (!skewResult.handled) throw new Error('Переход боковой ручки в skew должен быть обработан')
  expect(skewResult.guides).toEqual([])
  expect(skewResult.shouldPublishGuides).toBe(true)
  expect(harness.setMock).not.toHaveBeenCalled()
  expect(harness.controller.finishGesture()).toBe(false)
})

it('оставляет legacy владельцу custom handler правой ручки при стандартном action scaleX', () => {
  const harness = createImageScaleSnappingHarness({ controlKey: 'mr' })
  const rightControl = harness.target.controls.mr
  const customScaleHandler = jest.fn(() => true)

  expect(rightControl).toBeDefined()
  if (!rightControl) throw new Error('Тестовый Image должен иметь правую ручку')

  harness.target.controls = {
    ...harness.target.controls,
    mr: new Control({
      ...rightControl,
      actionHandler: customScaleHandler
    })
  }

  expect(harness.transform.action).toBe('scaleX')
  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(customScaleHandler).not.toHaveBeenCalled()
})

it('оставляет legacy владельцу правую ручку со смещённой геометрией', () => {
  const harness = createImageScaleSnappingHarness({ controlKey: 'mr' })
  const rightControl = harness.target.controls.mr

  expect(rightControl).toBeDefined()
  if (!rightControl) throw new Error('Тестовый Image должен иметь правую ручку')

  harness.target.controls = {
    ...harness.target.controls,
    mr: new Control({
      ...rightControl,
      x: 0.4
    })
  }

  expect(harness.transform.action).toBe('scaleX')
  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
})

it('поддерживает визуальное оформление стандартной правой ручки', () => {
  const harness = createImageScaleSnappingHarness({ controlKey: 'mr' })
  const rightControl = harness.target.controls.mr

  expect(rightControl).toBeDefined()
  if (!rightControl) throw new Error('Тестовый Image должен иметь правую ручку')

  harness.target.controls = {
    ...harness.target.controls,
    mr: new Control({
      ...rightControl,
      sizeX: 18,
      sizeY: 30,
      render: jest.fn()
    })
  }

  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.captureEnvironmentMock).toHaveBeenCalledTimes(1)
})

it('оставляет legacy владельцу grouped, locked, flipped и custom-action Image', () => {
  const grouped = createImageScaleSnappingHarness()
  grouped.target.group = Object.create(Group.prototype)
  const locked = createImageScaleSnappingHarness()
  locked.target.lockScalingX = true
  const flipped = createImageScaleSnappingHarness()
  flipped.target.flipY = true
  const customAction = createImageScaleSnappingHarness()
  customAction.transform.action = 'skewX'

  expect(grouped.controller.startGesture({
    event: createImageScaleStartEvent({ harness: grouped })
  })).toBe(false)
  expect(grouped.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(locked.controller.startGesture({
    event: createImageScaleStartEvent({ harness: locked })
  })).toBe(false)
  expect(locked.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(flipped.controller.startGesture({
    event: createImageScaleStartEvent({ harness: flipped })
  })).toBe(false)
  expect(flipped.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(customAction.controller.startGesture({
    event: createImageScaleStartEvent({ harness: customAction })
  })).toBe(false)
  expect(customAction.captureEnvironmentMock).not.toHaveBeenCalled()
})

it('поддерживает обычный stroke и оставляет scale-independent stroke legacy владельцу', () => {
  const regularStroke = createImageScaleSnappingHarness()
  regularStroke.target.stroke = '#000000'
  regularStroke.target.strokeWidth = 4
  regularStroke.target.strokeUniform = false
  const scaleIndependentStroke = createImageScaleSnappingHarness()
  scaleIndependentStroke.target.stroke = '#000000'
  scaleIndependentStroke.target.strokeWidth = 4
  scaleIndependentStroke.target.strokeUniform = true

  expect(regularStroke.controller.startGesture({
    event: createImageScaleStartEvent({ harness: regularStroke })
  })).toBe(true)
  expect(regularStroke.captureEnvironmentMock).toHaveBeenCalledTimes(1)
  expect(scaleIndependentStroke.controller.startGesture({
    event: createImageScaleStartEvent({ harness: scaleIndependentStroke })
  })).toBe(false)
  expect(scaleIndependentStroke.captureEnvironmentMock).not.toHaveBeenCalled()
})

it('завершает сессию без apply для чужого события и пересечения неподвижной точки', () => {
  const foreignHarness = createImageScaleSnappingHarness()
  const foreignTarget = createImageScaleSnappingHarness().target

  expect(foreignHarness.controller.startGesture({
    event: createImageScaleStartEvent({ harness: foreignHarness })
  })).toBe(true)

  const foreignEvent = {
    ...createImageScaleMouseMoveEvent({
      harness: foreignHarness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: 1.1, y: 1 }
    }),
    target: foreignTarget
  }
  const foreignResult = foreignHarness.controller.handleCanvasMouseMove({
    event: foreignEvent
  })

  expect(foreignResult.handled).toBe(false)
  if (foreignResult.handled) throw new Error('Чужое событие не должно обрабатываться Image owner')
  expect(foreignResult.didFinishSession).toBe(true)
  expect(foreignHarness.setMock).not.toHaveBeenCalled()

  const crossingHarness = createImageScaleSnappingHarness()
  expect(crossingHarness.controller.startGesture({
    event: createImageScaleStartEvent({ harness: crossingHarness })
  })).toBe(true)

  const crossingResult = crossingHarness.controller.handleCanvasMouseMove({
    event: createImageScaleMouseMoveEvent({
      harness: crossingHarness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: -0.1, y: 1 }
    })
  })

  expect(crossingResult.handled).toBe(false)
  if (crossingResult.handled) throw new Error('Пересечение fixed point не должно обрабатываться Image owner')
  expect(crossingResult.didFinishSession).toBe(true)
  expect(crossingHarness.setMock).not.toHaveBeenCalled()
})

it('очищает transient scale-сессию один раз и после этого возвращает unhandled', () => {
  const harness = createImageScaleSnappingHarness()

  expect(harness.controller.startGesture({
    event: createImageScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.finishGesture()).toBe(true)
  expect(harness.controller.finishGesture()).toBe(false)

  const result = harness.controller.handleCanvasMouseMove({
    event: createImageScaleMouseMoveEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: 1.1, y: 1 }
    })
  })

  expect(result.handled).toBe(false)
  if (result.handled) throw new Error('Завершённая Image scale-сессия не должна обрабатывать mouse:move')
  expect(result.didFinishSession).toBe(false)
  expect(harness.setMock).not.toHaveBeenCalled()
})
