import {
  createShapeScaleGestureProjection,
  type ShapeScaleControlKey,
  type ShapeScaleGestureProjection,
  type ShapeScaleMultipliers
} from '../../../../src/editor/shape-manager/scaling/shape-scale-projection'
import { stabilizeShapeScaleMultipliers } from '../../../../src/editor/shape-manager/scaling/shape-scale-stabilization'
import { createShapeScaleProjectionFixture } from '../../../test-utils/shape/scale-projection'

/** Параметры тестовой проекции с минимальной обязательной геометрией. */
type StabilizationProjectionOptions = Readonly<{
  controlKey?: ShapeScaleControlKey
  angle?: number
  width?: number
  height?: number
}>

/** Сценарий скейлинга за боковую ручку с округлением только активной локальной оси. */
type SideModeCase = Readonly<{
  mode: 'horizontal' | 'vertical'
  controlKey: 'mr' | 'mb'
  multipliers: ShapeScaleMultipliers
  expected: ShapeScaleMultipliers
}>

/** Горизонтальный и вертикальный скейлинг с намеренно изменённой неактивной осью. */
const SIDE_MODE_CASES: readonly SideModeCase[] = Object.freeze([
  Object.freeze({
    mode: 'horizontal',
    controlKey: 'mr',
    multipliers: Object.freeze({ x: 1.234, y: 1.876 }),
    expected: Object.freeze({ x: 1.23, y: 1 })
  }),
  Object.freeze({
    mode: 'vertical',
    controlKey: 'mb',
    multipliers: Object.freeze({ x: 1.876, y: 0.876 }),
    expected: Object.freeze({ x: 1, y: 0.875 })
  })
])

/** Создаёт валидную проекцию жеста на общей тестовой геометрии Shape. */
function createProjection({
  controlKey = 'br',
  angle = 0,
  width = 100,
  height = 80
}: StabilizationProjectionOptions = {}): ShapeScaleGestureProjection {
  const fixture = createShapeScaleProjectionFixture({
    controlKey,
    angle,
    width,
    height
  })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Проекция жеста должна существовать в тесте стабилизации скейлинга')

  return projection
}

it('без направляющих округляет размеры по обеим свободным осям до целых пикселей', () => {
  const projection = createProjection()
  const stabilized = stabilizeShapeScaleMultipliers({
    projection,
    mode: 'free',
    multipliers: { x: 1.234, y: 0.876 },
    protectedEdges: []
  })

  expect(stabilized.x).toBeCloseTo(1.23, 9)
  expect(stabilized.y).toBeCloseTo(0.875, 9)
  expect(Object.isFrozen(stabilized)).toBe(true)
})

it('на правой направляющей не округляет x, но округляет свободную ось y', () => {
  const projection = createProjection()
  const stabilized = stabilizeShapeScaleMultipliers({
    projection,
    mode: 'free',
    multipliers: { x: 1.234, y: 0.876 },
    protectedEdges: ['right']
  })

  expect(stabilized.x).toBe(1.234)
  expect(stabilized.y).toBeCloseTo(0.875, 9)
  expect(Object.isFrozen(stabilized)).toBe(true)
})

it('у повёрнутого Shape не округляет ни одну ось, если направляющая зависит от обеих', () => {
  const projection = createProjection({ angle: 30 })
  const stabilized = stabilizeShapeScaleMultipliers({
    projection,
    mode: 'free',
    multipliers: { x: 1.234, y: 0.876 },
    protectedEdges: ['bottom']
  })

  expect(stabilized.x).toBe(1.234)
  expect(stabilized.y).toBe(0.876)
  expect(Object.isFrozen(stabilized)).toBe(true)
})

it('на направляющей не округляет общий множитель пропорционального скейлинга', () => {
  const projection = createProjection()
  const stabilized = stabilizeShapeScaleMultipliers({
    projection,
    mode: 'uniform',
    multipliers: { x: 1.234, y: 1.234 },
    protectedEdges: ['right']
  })

  expect(stabilized.x).toBe(1.234)
  expect(stabilized.y).toBe(1.234)
  expect(Object.isFrozen(stabilized)).toBe(true)
})

it('без направляющих выбирает ближайшую коррекцию ширины или высоты для общего множителя', () => {
  const projection = createProjection()
  const stabilized = stabilizeShapeScaleMultipliers({
    projection,
    mode: 'uniform',
    multipliers: { x: 1.234, y: 1.234 },
    protectedEdges: []
  })

  expect(stabilized.x).toBeCloseTo(1.2375, 9)
  expect(stabilized.y).toBe(stabilized.x)
  expect(80 * stabilized.y).toBeCloseTo(99, 9)
})

it.each(SIDE_MODE_CASES)(
  '$mode: скейлинг за боковую ручку оставляет неактивную ось равной единице',
  ({ mode, controlKey, multipliers, expected }) => {
    const projection = createProjection({ controlKey })
    const stabilized = stabilizeShapeScaleMultipliers({
      projection,
      mode,
      multipliers,
      protectedEdges: []
    })

    expect(stabilized.x).toBeCloseTo(expected.x, 9)
    expect(stabilized.y).toBeCloseTo(expected.y, 9)
    expect(Object.isFrozen(stabilized)).toBe(true)
  }
)

it('отклоняет вырожденную геометрию и недопустимые множители скейлинга', () => {
  const projection = createProjection()
  const zeroWidthProjection = Object.freeze({
    ...projection,
    u: Object.freeze({ x: 0, y: 0 })
  })
  const invalidHeightProjection = Object.freeze({
    ...projection,
    v: Object.freeze({ x: Number.NaN, y: 80 })
  })

  expect(() => stabilizeShapeScaleMultipliers({
    projection: zeroWidthProjection,
    mode: 'free',
    multipliers: { x: 1, y: 1 },
    protectedEdges: []
  })).toThrow(RangeError)
  expect(() => stabilizeShapeScaleMultipliers({
    projection: invalidHeightProjection,
    mode: 'free',
    multipliers: { x: 1, y: 1 },
    protectedEdges: []
  })).toThrow(RangeError)
  expect(() => stabilizeShapeScaleMultipliers({
    projection,
    mode: 'free',
    multipliers: { x: 0, y: 1 },
    protectedEdges: []
  })).toThrow(RangeError)
  expect(() => stabilizeShapeScaleMultipliers({
    projection,
    mode: 'free',
    multipliers: { x: 1, y: Number.POSITIVE_INFINITY },
    protectedEdges: []
  })).toThrow(RangeError)
  expect(() => stabilizeShapeScaleMultipliers({
    projection,
    mode: 'uniform',
    multipliers: { x: 1.2, y: 1.3 },
    protectedEdges: []
  })).toThrow('Uniform Shape scale requires equal x and y multipliers')
})
