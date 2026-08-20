import {
  createTextCornerScaleStepProjection,
  resolveTextCornerScalePointerMultiplier
} from '../../../../../src/editor/text-manager/scaling/text-corner-scale-projection'
import { createTextCornerScaleInteractionHarness } from '../../../../test-utils/text/corner-scale-interaction'
import { createMeasuredTextCornerScaleProjectionSetup } from '../../../../test-utils/text/corner-scale-projection'

it('строит проекцию шага по фактически измеренным границам текста', () => {
  const {
    measuredBounds,
    originalProjection,
    previousBounds,
    previousScale,
    scale,
    step
  } = createMeasuredTextCornerScaleProjectionSetup()

  const rightEdge = step.projection.edges.find(({ edge }) => edge === 'right')
  const bottomEdge = step.projection.edges.find(({ edge }) => edge === 'bottom')
  const originalRightEdge = originalProjection.edges.find(({ edge }) => edge === 'right')
  const originalBottomEdge = originalProjection.edges.find(({ edge }) => edge === 'bottom')

  expect(rightEdge).toBeDefined()
  expect(bottomEdge).toBeDefined()
  expect(originalRightEdge).toBeDefined()
  expect(originalBottomEdge).toBeDefined()
  if (!rightEdge || !bottomEdge || !originalRightEdge || !originalBottomEdge) {
    throw new Error('Обе проекции должны описывать правую и нижнюю границы')
  }

  expect(step.projection.baselineValues).toEqual([scale])
  expect(rightEdge.coefficients[0]).toBeCloseTo(
    (measuredBounds.right - previousBounds.right) / (scale - previousScale),
    9
  )
  expect(bottomEdge.coefficients[0]).toBeCloseTo(
    (measuredBounds.bottom - previousBounds.bottom) / (scale - previousScale),
    9
  )
  expect(rightEdge.coefficients[0]).not.toBeCloseTo(originalRightEdge.coefficients[0], 9)
  expect(bottomEdge.coefficients[0]).not.toBeCloseTo(originalBottomEdge.coefficients[0], 9)
})

it('использует сторону, с которой грань действительно меняется', () => {
  const { baselineBounds, gesture } = createTextCornerScaleInteractionHarness()
  const scale = 1.248
  const bounds = Object.freeze({
    ...baselineBounds,
    right: baselineBounds.left + 125,
    bottom: baselineBounds.top + 50,
    centerX: baselineBounds.left + 62.5,
    centerY: baselineBounds.top + 25
  })
  const lowerBounds = Object.freeze({
    ...bounds,
    right: bounds.right - 1,
    bottom: bounds.bottom - 1,
    centerX: bounds.centerX - 0.5,
    centerY: bounds.centerY - 0.5
  })
  const upperBounds = Object.freeze({
    ...bounds,
    right: bounds.right + 3,
    centerX: bounds.centerX + 1.5
  })
  const step = createTextCornerScaleStepProjection({
    bounds,
    gesture,
    samples: [
      Object.freeze({ bounds: lowerBounds, scale: scale - 0.01 }),
      Object.freeze({ bounds: upperBounds, scale: scale + 0.01 })
    ],
    scale
  })

  expect(step).not.toBeNull()
  if (!step) throw new Error('Проекция локального шага должна существовать')

  const rightEdge = step.projection.edges.find(({ edge }) => edge === 'right')
  const bottomEdge = step.projection.edges.find(({ edge }) => edge === 'bottom')

  expect(rightEdge?.coefficients[0]).toBeCloseTo(300, 9)
  expect(bottomEdge?.coefficients[0]).toBeCloseTo(100, 9)
  expect(step.projection.baselineValues).toEqual([scale])
})

it('возвращает нулевой множитель в неподвижной точке и после её пересечения', () => {
  const { fixedAnchor, gesture, pointerStart } = createTextCornerScaleInteractionHarness()
  const crossedPoint = {
    x: fixedAnchor.x - ((pointerStart.x - fixedAnchor.x) * 0.2),
    y: fixedAnchor.y - ((pointerStart.y - fixedAnchor.y) * 0.2)
  }

  expect(resolveTextCornerScalePointerMultiplier({ gesture, pointer: fixedAnchor })).toBe(0)
  expect(resolveTextCornerScalePointerMultiplier({ gesture, pointer: crossedPoint })).toBe(0)
})
