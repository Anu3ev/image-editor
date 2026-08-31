import { Control, Group, Rect } from 'fabric'
import type { RectangularScaleControlKey } from '../../../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import {
  captureActiveSelectionImageLocalStates,
  createActiveSelectionScaleHarness,
  createActiveSelectionScaleMouseMoveEvent,
  createActiveSelectionScaleStartEvent,
  createActiveSelectionScaleStepEvent,
  createShapeActiveSelectionScaleHarness,
  getRequiredActiveSelectionBounds
} from '../../../../test-utils/selection/active-selection-scale-interaction'
import { createMockFabricImage } from '../../../../test-utils/managers/image'
import { useRectangularScaleGuide } from '../../../../test-utils/snapping/rectangular-scale-gesture-projection'

afterEach(jest.restoreAllMocks)

/** Ожидаемые подвижные грани всех стандартных ручек общего выделения. */
const ACTIVE_SELECTION_SCALE_CONTROL_CASES: readonly Readonly<{
  controlKey: RectangularScaleControlKey
  movingEdges: readonly string[]
}>[] = Object.freeze([
  { controlKey: 'tl', movingEdges: ['left', 'top'] },
  { controlKey: 'tr', movingEdges: ['right', 'top'] },
  { controlKey: 'bl', movingEdges: ['left', 'bottom'] },
  { controlKey: 'br', movingEdges: ['right', 'bottom'] },
  { controlKey: 'ml', movingEdges: ['left'] },
  { controlKey: 'mr', movingEdges: ['right'] },
  { controlKey: 'mt', movingEdges: ['top'] },
  { controlKey: 'mb', movingEdges: ['bottom'] }
])

/** Состояния общего выделения, для которых новый путь скейлинга не применяется. */
const UNSUPPORTED_ACTIVE_SELECTION_STATES = Object.freeze([
  { title: 'наклон по X', state: { skewX: 1 } },
  { title: 'наклон по Y', state: { skewY: 1 } },
  { title: 'отражение по X', state: { flipX: true } },
  { title: 'отражение по Y', state: { flipY: true } },
  { title: 'заблокированное выделение', state: { locked: true } },
  { title: 'заблокированный скейлинг по X', state: { lockScalingX: true } },
  { title: 'заблокированный скейлинг по Y', state: { lockScalingY: true } }
])

it.each(ACTIVE_SELECTION_SCALE_CONTROL_CASES)(
  'для ручки $controlKey фиксирует направляющие подвижных граней',
  ({ controlKey, movingEdges }) => {
    const harness = createActiveSelectionScaleHarness({ controlKey })

    expect(harness.controller.startGesture({
      event: createActiveSelectionScaleStartEvent({ harness })
    })).toBe(true)
    expect(harness.captureEnvironmentMock).toHaveBeenCalledTimes(1)
    expect(harness.captureEnvironmentMock).toHaveBeenCalledWith({
      activeObject: harness.target,
      targetEdges: movingEdges
    })
  }
)

it('один раз меняет масштаб всего выделения и публикует только подтверждённую направляющую', () => {
  const harness = createActiveSelectionScaleHarness({ controlKey: 'mr' })
  const childState = captureActiveSelectionImageLocalStates({ children: harness.children })
  const guidePosition = useRectangularScaleGuide({
    axis: 'x',
    candidateIdPrefix: 'active-selection',
    edge: 'right',
    harness,
    offset: 10
  })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleObjectScaling({
    event: createActiveSelectionScaleStepEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: 1.04, y: 1 }
    })
  })).toBe(true)

  const bounds = getRequiredActiveSelectionBounds({ target: harness.target })

  expect(bounds.left).toBeCloseTo(harness.baselineBounds.left, 9)
  expect(bounds.right).toBeCloseTo(guidePosition, 9)
  expect(harness.transform.actionPerformed).toBe(true)
  expect(harness.markHandledMock).toHaveBeenCalledTimes(1)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({
    guides: [expect.objectContaining({
      axis: 'x',
      edge: 'right',
      position: guidePosition
    })]
  })
  expect(captureActiveSelectionImageLocalStates({ children: harness.children })).toEqual(childState)
  expect(harness.supportsShapeSelectionMock).not.toHaveBeenCalled()
  expect(harness.applyShapeSelectionPreviewMock).not.toHaveBeenCalled()
})

it('для выделения из шейпов начинает общую сессию и передаёт состав на проверку ShapeManager', () => {
  const harness = createShapeActiveSelectionScaleHarness({ controlKey: 'mr' })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.supportsShapeSelectionMock).toHaveBeenCalledTimes(1)
  expect(harness.supportsShapeSelectionMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.captureEnvironmentMock).toHaveBeenCalledTimes(1)
  expect(harness.captureEnvironmentMock).toHaveBeenCalledWith({
    activeObject: harness.target,
    targetEdges: ['right']
  })
})

it('проверяет фактически применённый к шейпам масштаб и скрывает недостижимую направляющую', () => {
  const harness = createShapeActiveSelectionScaleHarness({
    clampedMultipliers: { x: 1.01, y: 1 },
    controlKey: 'mr'
  })
  const guidePosition = useRectangularScaleGuide({
    axis: 'x',
    candidateIdPrefix: 'shape-active-selection',
    edge: 'right',
    harness,
    offset: 10
  })
  const marker = new MouseEvent('pointermove')

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)

  const stepEvent = createActiveSelectionScaleStepEvent({
    harness,
    marker,
    multipliers: { x: 1.04, y: 1 }
  })

  expect(harness.controller.handleObjectScaling({
    event: stepEvent
  })).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    event: stepEvent
  })).toBe(true)

  const bounds = getRequiredActiveSelectionBounds({ target: harness.target })

  expect(bounds.left).toBeCloseTo(harness.baselineBounds.left, 9)
  expect(bounds.right).not.toBeCloseTo(guidePosition, 9)
  expect(harness.target.scaleX).toBeCloseTo(1.01, 9)
  expect(harness.transform.scaleX).toBeCloseTo(harness.target.scaleX, 9)
  expect(harness.applyShapeSelectionPreviewMock).toHaveBeenCalledTimes(1)
  expect(harness.applyShapeSelectionPreviewMock).toHaveBeenCalledWith({
    selection: harness.target,
    transform: harness.transform,
    event: marker
  })
  expect(harness.markHandledMock).toHaveBeenCalledTimes(2)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.controller.beginShapeSelectionCommit({ selection: harness.target }))
    .toBe('canonical-scale')
  expect(harness.controller.finishShapeSelectionCommit({ selection: harness.target })).toBe(true)
})

it('обрабатывает до ShapeManager только шаг текущей сессии выделения из шейпов', () => {
  const harness = createShapeActiveSelectionScaleHarness()
  const startEvent = createActiveSelectionScaleStartEvent({ harness })
  const otherHarness = createShapeActiveSelectionScaleHarness()
  const otherEvent = createActiveSelectionScaleStartEvent({ harness: otherHarness })

  expect(harness.controller.handleShapeSelectionScaleStep({
    event: startEvent,
    intentSource: 'fabric-preview'
  })).toBe(false)
  expect(harness.controller.startGesture({ event: startEvent })).toBe(true)

  const currentEvent = createActiveSelectionScaleStepEvent({
    harness,
    marker: new MouseEvent('pointermove'),
    multipliers: { x: 1.05, y: 1 }
  })

  expect(harness.controller.handleShapeSelectionScaleStep({
    event: currentEvent,
    intentSource: 'fabric-preview'
  })).toBe(true)
  expect(harness.controller.handleShapeSelectionScaleStep({
    event: otherEvent,
    intentSource: 'fabric-preview'
  })).toBe(false)
  expect(harness.controller.finishGesture()).toBe(true)
  expect(harness.controller.handleShapeSelectionScaleStep({
    event: currentEvent,
    intentSource: 'fabric-preview'
  })).toBe(false)

  const imageHarness = createActiveSelectionScaleHarness()
  const imageEvent = createActiveSelectionScaleStartEvent({ harness: imageHarness })

  expect(imageHarness.controller.startGesture({ event: imageEvent })).toBe(true)
  expect(imageHarness.controller.handleShapeSelectionScaleStep({
    event: imageEvent,
    intentSource: 'fabric-preview'
  })).toBe(false)
})

it('возвращает необрабатываемый шаг шейпов прежней логике в том же событии', () => {
  const harness = createShapeActiveSelectionScaleHarness()

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleShapeSelectionScaleStep({
    event: {
      target: harness.target,
      transform: harness.transform,
      pointer: harness.pointerStart,
      scenePoint: harness.pointerStart
    },
    intentSource: 'fabric-preview'
  })).toBe(false)
  expect(harness.applyShapeSelectionPreviewMock).not.toHaveBeenCalled()
  expect(harness.clearShapeSelectionPreviewStateMock).not.toHaveBeenCalled()
  expect(harness.controller.finishGesture()).toBe(true)
})

it('если object:scaling не сработал, обрабатывает mouse:move и применяет прилипание', () => {
  const harness = createActiveSelectionScaleHarness({ controlKey: 'mr' })
  const initialScaleX = harness.target.scaleX
  const guidePosition = useRectangularScaleGuide({
    axis: 'x',
    candidateIdPrefix: 'active-selection',
    edge: 'right',
    harness,
    offset: 10
  })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: 1.04, y: 1 }
    })
  })).toBe(true)

  const bounds = getRequiredActiveSelectionBounds({ target: harness.target })

  expect(bounds.left).toBeCloseTo(harness.baselineBounds.left, 9)
  expect(bounds.right).toBeCloseTo(guidePosition, 9)
  expect(harness.target.scaleX).not.toBeCloseTo(initialScaleX, 9)
  expect(harness.transform.actionPerformed).toBe(true)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({
    guides: [expect.objectContaining({ edge: 'right', position: guidePosition })]
  })
})

it.each([
  {
    title: 'по умолчанию пропорционально меняет обе оси за угол',
    multipliers: { x: 1.1, y: 1.1 },
    shiftKey: false,
    uniformScaling: true
  },
  {
    title: 'с Shift свободно меняет обе оси за угол',
    multipliers: { x: 1.1, y: 1.2 },
    shiftKey: true,
    uniformScaling: true
  },
  {
    title: 'без Shift свободно меняет обе оси при отключённом пропорциональном режиме',
    multipliers: { x: 1.1, y: 1.2 },
    shiftKey: false,
    uniformScaling: false
  },
  {
    title: 'с Shift пропорционально меняет обе оси при отключённом пропорциональном режиме',
    multipliers: { x: 1.1, y: 1.1 },
    shiftKey: true,
    uniformScaling: false
  }
])('$title', ({ multipliers, shiftKey, uniformScaling }) => {
  const harness = createActiveSelectionScaleHarness({
    controlKey: 'br',
    uniformScaling
  })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleObjectScaling({
    event: createActiveSelectionScaleStepEvent({
      harness,
      marker: new MouseEvent('pointermove', { shiftKey }),
      multipliers
    })
  })).toBe(true)
  expect(harness.target.scaleX).toBeCloseTo(multipliers.x, 9)
  expect(harness.target.scaleY).toBeCloseTo(multipliers.y, 9)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
})

it.each([
  {
    title: 'без Shift сохраняет пропорции',
    multipliers: { x: 1.1, y: 1.1 },
    shiftKey: false
  },
  {
    title: 'с Shift свободно меняет обе оси',
    multipliers: { x: 1.1, y: 1.2 },
    shiftKey: true
  }
])('для угловой ручки шейпов $title независимо от общей настройки Fabric', ({
  multipliers,
  shiftKey
}) => {
  const harness = createShapeActiveSelectionScaleHarness({
    controlKey: 'br',
    uniformScaling: false
  })
  const marker = new MouseEvent('pointermove', { shiftKey })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleObjectScaling({
    event: createActiveSelectionScaleStepEvent({
      harness,
      marker,
      multipliers
    })
  })).toBe(true)
  expect(harness.target.scaleX).toBeCloseTo(multipliers.x, 9)
  expect(harness.target.scaleY).toBeCloseTo(multipliers.y, 9)
  expect(harness.applyShapeSelectionPreviewMock).toHaveBeenCalledTimes(1)
})

it('во время наклона боковой ручкой не передаёт повторные движения в расчёт скейлинга шейпов', () => {
  const harness = createShapeActiveSelectionScaleHarness({ controlKey: 'mr' })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleObjectScaling({
    event: createActiveSelectionScaleStepEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: 1.1, y: 1 }
    })
  })).toBe(true)

  const skewMarker = new MouseEvent('pointermove', { shiftKey: true })
  const nextSkewMarker = new MouseEvent('pointermove', { shiftKey: true })

  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker: skewMarker,
      multipliers: { x: 1.2, y: 1 }
    })
  })).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker: nextSkewMarker,
      multipliers: { x: 1.3, y: 1 }
    })
  })).toBe(true)
  expect(harness.markHandledMock).toHaveBeenCalledWith({ marker: skewMarker })
  expect(harness.markHandledMock).toHaveBeenCalledWith({ marker: nextSkewMarker })
  expect(harness.applyShapeSelectionPreviewMock).toHaveBeenCalledTimes(1)
  expect(harness.clearShapeSelectionPreviewStateMock).not.toHaveBeenCalled()
  harness.target.set({ skewY: 8 })
  expect(harness.controller.beginShapeSelectionCommit({ selection: harness.target }))
    .toBe('fabric-transform')
  expect(harness.controller.finishShapeSelectionCommit({ selection: harness.target })).toBe(true)
  expect(harness.controller.finishGesture()).toBe(false)
})

it('после возврата к скейлингу снова отделяет наклон от расчёта размера шейпов', () => {
  const harness = createShapeActiveSelectionScaleHarness({ controlKey: 'mr' })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleObjectScaling({
    event: createActiveSelectionScaleStepEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: 1.1, y: 1 }
    })
  })).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker: new MouseEvent('pointermove', { shiftKey: true }),
      multipliers: { x: 1.2, y: 1 }
    })
  })).toBe(true)

  const scaleMarker = new MouseEvent('pointermove')

  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker: scaleMarker,
      multipliers: { x: 1.4, y: 1 }
    })
  })).toBe(false)

  const repeatedSkewMarker = new MouseEvent('pointermove', { shiftKey: true })

  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker: repeatedSkewMarker,
      multipliers: { x: 1.5, y: 1 }
    })
  })).toBe(true)
  const handledMarkers = harness.markHandledMock.mock.calls.map(([params]) => params.marker)

  expect(handledMarkers).not.toContain(scaleMarker)
  expect(handledMarkers).toContain(repeatedSkewMarker)
  expect(harness.applyShapeSelectionPreviewMock).toHaveBeenCalledTimes(1)
  expect(harness.clearShapeSelectionPreviewStateMock).not.toHaveBeenCalled()
})

it('при Shift на боковой ручке завершает сессию до наклона Fabric и не меняет масштаб выделения', () => {
  const harness = createActiveSelectionScaleHarness({ controlKey: 'mr' })
  const initialScale = { x: harness.target.scaleX, y: harness.target.scaleY }
  const marker = new MouseEvent('pointermove', { shiftKey: true })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker,
      multipliers: { x: 1.2, y: 1 }
    })
  })).toBe(true)
  expect({ x: harness.target.scaleX, y: harness.target.scaleY }).toEqual(initialScale)
  expect(harness.transform.actionPerformed).toBe(false)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.markHandledMock).toHaveBeenCalledWith({ marker })
  expect(harness.controller.finishGesture()).toBe(false)
})

it('не применяет повторно один и тот же шаг указателя между object:scaling и mouse:move', () => {
  const harness = createActiveSelectionScaleHarness({ controlKey: 'mr' })
  const marker = new MouseEvent('pointermove')
  const event = createActiveSelectionScaleStepEvent({
    harness,
    marker,
    multipliers: { x: 1.1, y: 1 }
  })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleObjectScaling({ event })).toBe(true)

  const firstBounds = getRequiredActiveSelectionBounds({ target: harness.target })

  expect(harness.controller.handleCanvasMouseMove({ event })).toBe(true)
  expect(getRequiredActiveSelectionBounds({ target: harness.target })).toEqual(firstBounds)
  expect(harness.publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(harness.markHandledMock).toHaveBeenCalledTimes(2)
})

it('не подключает выделение с вложенным изображением к новому пути', () => {
  const harness = createActiveSelectionScaleHarness()
  harness.children[0].parent = harness.target

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
})

it('оставляет смешанное выделение на прежнем пути скейлинга', () => {
  const harness = createActiveSelectionScaleHarness()
  const shape = new Rect({ width: 40, height: 30 })
  jest.spyOn(harness.target, 'getObjects').mockReturnValue([harness.children[0], shape])

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.supportsShapeSelectionMock).toHaveBeenCalledTimes(1)
  expect(harness.supportsShapeSelectionMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.applyShapeSelectionPreviewMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
})

it('оставляет неподдерживаемое выделение из шейпов на прежнем пути скейлинга', () => {
  const harness = createShapeActiveSelectionScaleHarness({ supported: false })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.supportsShapeSelectionMock).toHaveBeenCalledTimes(1)
  expect(harness.supportsShapeSelectionMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.applyShapeSelectionPreviewMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
})

it.each(UNSUPPORTED_ACTIVE_SELECTION_STATES)(
  'не подключает $title к новому пути',
  ({ state }) => {
    const harness = createActiveSelectionScaleHarness()
    harness.target.set(state)

    expect(harness.controller.startGesture({
      event: createActiveSelectionScaleStartEvent({ harness })
    })).toBe(false)
    expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
    expect(harness.markHandledMock).not.toHaveBeenCalled()
    expect(harness.publishGuidesMock).not.toHaveBeenCalled()
  }
)

it('не подключает вложенное общее выделение к новому пути', () => {
  const harness = createActiveSelectionScaleHarness()
  harness.target.parent = new Group([], {})

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
})

it('не подключает общее выделение внутри группы к новому пути', () => {
  const harness = createActiveSelectionScaleHarness()
  harness.target.group = new Group([], {})

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
})

it('не подключает нестандартную ручку к новому пути', () => {
  const harness = createActiveSelectionScaleHarness({ controlKey: 'mr' })
  harness.target.controls.mr = new Control({
    actionHandler: () => true,
    x: 0.5,
    y: 0
  })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
})

it('завершает сессию после удаления прямого изображения из выделения и игнорирует другой объект', () => {
  const harness = createActiveSelectionScaleHarness()
  const unrelated = createMockFabricImage()

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.finishGestureForTarget({ target: unrelated })).toBe(false)
  jest.spyOn(harness.target, 'getObjects').mockReturnValue([harness.children[1]])
  expect(harness.target.getObjects()).not.toContain(harness.children[0])
  expect(harness.controller.finishGestureForTarget({ target: harness.children[0] })).toBe(true)
  expect(harness.controller.finishGesture()).toBe(false)
})

it('при удалении дочернего шейпа очищает временное состояние ShapeManager', () => {
  const harness = createShapeActiveSelectionScaleHarness()

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.finishGestureForTarget({ target: harness.children[0] })).toBe(true)
  expect(harness.clearShapeSelectionPreviewStateMock).toHaveBeenCalledTimes(1)
  expect(harness.clearShapeSelectionPreviewStateMock).toHaveBeenCalledWith({
    selection: harness.target,
    children: harness.children
  })
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.controller.finishGesture()).toBe(false)
})

it('при отмене указателя завершает преобразование Fabric и очищает сессию', () => {
  const harness = createActiveSelectionScaleHarness()
  const event = new Event('pointercancel') as PointerEvent

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.interruptGesture({ event })).toBe(true)
  expect(harness.controller.interruptGesture({ event })).toBe(false)
  expect(harness.endCurrentTransformMock).toHaveBeenCalledTimes(1)
  expect(harness.endCurrentTransformMock).toHaveBeenCalledWith(event)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.controller.finishGesture()).toBe(false)
})

it('при отмене скейлинга шейпов очищает временное состояние ShapeManager', () => {
  const harness = createShapeActiveSelectionScaleHarness()
  const event = new Event('pointercancel') as PointerEvent

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.interruptGesture({ event })).toBe(true)
  expect(harness.endCurrentTransformMock).toHaveBeenCalledWith(event)
  expect(harness.clearShapeSelectionPreviewStateMock).toHaveBeenCalledTimes(1)
  expect(harness.clearShapeSelectionPreviewStateMock).toHaveBeenCalledWith({
    selection: harness.target,
    children: harness.children
  })
  expect(harness.controller.finishGesture()).toBe(false)
})

it('при потере фокуса окна завершает скейлинг шейпов и очищает временное состояние', () => {
  const harness = createShapeActiveSelectionScaleHarness()
  harness.controller.bind()

  try {
    expect(harness.controller.startGesture({
      event: createActiveSelectionScaleStartEvent({ harness })
    })).toBe(true)

    window.dispatchEvent(new Event('blur'))

    expect(harness.endCurrentTransformMock).toHaveBeenCalledTimes(1)
    expect(harness.endCurrentTransformMock).toHaveBeenCalledWith(undefined)
    expect(harness.clearShapeSelectionPreviewStateMock).toHaveBeenCalledTimes(1)
    expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
    expect(harness.controller.finishGesture()).toBe(false)
  } finally {
    harness.controller.destroy()
  }
})

it('при отмене касания завершает скейлинг шейпов и очищает временное состояние', () => {
  const harness = createShapeActiveSelectionScaleHarness()
  const event = new Event('touchcancel') as TouchEvent
  harness.controller.bind()

  try {
    expect(harness.controller.startGesture({
      event: createActiveSelectionScaleStartEvent({ harness })
    })).toBe(true)

    window.dispatchEvent(event)

    expect(harness.endCurrentTransformMock).toHaveBeenCalledTimes(1)
    expect(harness.endCurrentTransformMock).toHaveBeenCalledWith(event)
    expect(harness.clearShapeSelectionPreviewStateMock).toHaveBeenCalledTimes(1)
    expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
    expect(harness.controller.finishGesture()).toBe(false)
  } finally {
    harness.controller.destroy()
  }
})

it('при уничтожении очищает направляющие и завершает активную сессию', () => {
  const harness = createActiveSelectionScaleHarness()

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)

  harness.publishGuidesMock.mockClear()
  harness.controller.destroy()

  expect(harness.publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.controller.finishGesture()).toBe(false)
})
