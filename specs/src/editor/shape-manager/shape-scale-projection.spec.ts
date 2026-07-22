import {
  ActiveSelection,
  Group,
  Point
} from 'fabric'
import {
  createShapeScaleGestureProjection,
  projectShapeScaleBounds,
  resolveShapeScaleModeProjection,
  resolveShapeScalePointerMultipliers,
  type ShapeScaleSceneEdge
} from '../../../../src/editor/shape-manager/scaling/shape-scale-projection'
import {
  createShapeScaleGestureTransform,
  createShapeScaleProjectionFixture,
  moveFixturePointer,
  projectFixtureBounds,
  resolveFixtureFreeMode,
  SHAPE_SCALE_CONTROL_ROTATION_CASES
} from '../../../test-utils/shape/scale-projection'

/** Corner-кейсы из общей матрицы controls и rotations. */
const CORNER_ROTATION_CASES = SHAPE_SCALE_CONTROL_ROTATION_CASES.filter(({ controlKey }) => {
  return controlKey === 'tl' || controlKey === 'tr' || controlKey === 'bl' || controlKey === 'br'
})

it.each(SHAPE_SCALE_CONTROL_ROTATION_CASES)(
  'считает raw pointer multipliers для control $controlKey при повороте $angle°',
  ({ controlKey, angle }) => {
    const fixture = createShapeScaleProjectionFixture({ controlKey, angle })
    const projection = createShapeScaleGestureProjection({
      transform: fixture.transform,
      pointerStart: fixture.pointerStart
    })

    expect(projection).not.toBeNull()
    if (!projection) throw new Error('Projection должна существовать для поддерживаемого Shape control')

    const pointer = moveFixturePointer({
      fixture,
      multipliers: { x: 1.4, y: 0.65 }
    })
    const mode = resolveFixtureFreeMode({ controlKey })
    const multipliers = resolveShapeScalePointerMultipliers({ projection, pointer, mode })

    expect(multipliers).not.toBeNull()
    if (!multipliers) throw new Error('Pointer multipliers должны существовать для поддерживаемого режима')

    expect(multipliers.x).toBeCloseTo(mode === 'vertical' ? 1 : 1.4, 9)
    expect(multipliers.y).toBeCloseTo(mode === 'horizontal' ? 1 : 0.65, 9)
  }
)

it.each(CORNER_ROTATION_CASES)(
  'считает uniform pointer multiplier для control $controlKey при повороте $angle°',
  ({ controlKey, angle }) => {
    const fixture = createShapeScaleProjectionFixture({ controlKey, angle })
    const projection = createShapeScaleGestureProjection({
      transform: fixture.transform,
      pointerStart: fixture.pointerStart
    })

    expect(projection).not.toBeNull()
    if (!projection) throw new Error('Projection должна существовать для corner control')

    const pointer = moveFixturePointer({
      fixture,
      multipliers: { x: 1.35, y: 1.35 }
    })
    const multipliers = resolveShapeScalePointerMultipliers({
      projection,
      pointer,
      mode: 'uniform'
    })

    expect(multipliers).not.toBeNull()
    if (!multipliers) throw new Error('Uniform multipliers должны существовать для corner control')

    expect(multipliers.x).toBeCloseTo(1.35, 9)
    expect(multipliers.y).toBeCloseTo(1.35, 9)
  }
)

it('uniform scaling использует Fabric-compatible L1 расстояние по обеим локальным осям', () => {
  const fixture = createShapeScaleProjectionFixture({
    controlKey: 'br',
    angle: 30,
    width: 200,
    height: 100
  })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать для проверки L1 distance')

  const pointer = moveFixturePointer({
    fixture,
    multipliers: { x: 1.5, y: 0.5 }
  })
  const multipliers = resolveShapeScalePointerMultipliers({
    projection,
    pointer,
    mode: 'uniform'
  })
  const expectedMultiplier = ((200 * 1.5) + (100 * 0.5)) / 300

  expect(multipliers).not.toBeNull()
  expect(multipliers?.x).toBeCloseTo(expectedMultiplier, 9)
  expect(multipliers?.y).toBeCloseTo(expectedMultiplier, 9)
})

it('поддерживает free и uniform scaling относительно centered origin', () => {
  const fixture = createShapeScaleProjectionFixture({
    controlKey: 'br',
    angle: 30,
    centered: true
  })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать для centered corner scaling')

  const freePointer = moveFixturePointer({
    fixture,
    multipliers: { x: 1.2, y: 0.75 }
  })
  const uniformPointer = moveFixturePointer({
    fixture,
    multipliers: { x: 1.4, y: 1.4 }
  })
  const freeMultipliers = resolveShapeScalePointerMultipliers({
    projection,
    pointer: freePointer,
    mode: 'free'
  })
  const uniformMultipliers = resolveShapeScalePointerMultipliers({
    projection,
    pointer: uniformPointer,
    mode: 'uniform'
  })

  expect(projection.fixedAnchor.x).toBeCloseTo(400, 9)
  expect(projection.fixedAnchor.y).toBeCloseTo(300, 9)
  expect(freeMultipliers?.x).toBeCloseTo(1.2, 9)
  expect(freeMultipliers?.y).toBeCloseTo(0.75, 9)
  expect(uniformMultipliers?.x).toBeCloseTo(1.4, 9)
  expect(uniformMultipliers?.y).toBeCloseTo(1.4, 9)
})

it('сохраняет полный immutable mouse-down snapshot', () => {
  const fixture = createShapeScaleProjectionFixture({
    controlKey: 'br',
    angle: 30,
    originalScaleX: 1.25,
    originalScaleY: 0.8
  })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать для валидного Shape baseline')

  expect(projection.u.x).toBeCloseTo(fixture.u.x, 9)
  expect(projection.u.y).toBeCloseTo(fixture.u.y, 9)
  expect(projection.v.x).toBeCloseTo(fixture.v.x, 9)
  expect(projection.v.y).toBeCloseTo(fixture.v.y, 9)
  expect(projection.fixedAnchor.x).toBeCloseTo(fixture.fixedAnchor.x, 9)
  expect(projection.fixedAnchor.y).toBeCloseTo(fixture.fixedAnchor.y, 9)
  expect(projection.originalScales).toEqual({ x: 1.25, y: 0.8 })
  expect(projection.baselineBounds).toEqual(fixture.baselineBounds)
  expect(Object.isFrozen(projection)).toBe(true)
  expect(Object.isFrozen(projection.u)).toBe(true)
  expect(Object.isFrozen(projection.baselineBounds)).toBe(true)
})

it('повторно получает тот же raw intent после мутации target и исходных данных', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br', angle: 30 })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать до проверки независимости от target')

  const pointer = moveFixturePointer({
    fixture,
    multipliers: { x: 1.45, y: 0.7 }
  })
  const firstResult = resolveShapeScalePointerMultipliers({
    projection,
    pointer,
    mode: 'free'
  })

  fixture.target.set({
    width: 1,
    height: 999,
    scaleX: 8,
    scaleY: 0.02
  })
  fixture.sourceCorners[0].x += 1000
  fixture.transformOriginal.scaleX = 99
  fixture.transformOriginal.scaleY = 77

  const repeatedResult = resolveShapeScalePointerMultipliers({
    projection,
    pointer,
    mode: 'free'
  })

  expect(firstResult?.x).toBeCloseTo(1.45, 9)
  expect(firstResult?.y).toBeCloseTo(0.7, 9)
  expect(repeatedResult).toEqual(firstResult)
  expect(projection.originalScales).toEqual({ x: 1.25, y: 0.8 })
  expect(fixture.getCoordsMock).toHaveBeenCalledTimes(1)
})

it('проецирует rotated exact bounds без мутации target', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br', angle: 30 })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать для rotated bounds')

  const multipliers = { x: 1.4, y: 0.65 }
  const expected = projectFixtureBounds({ fixture, multipliers })
  const projected = projectShapeScaleBounds({ projection, multipliers })

  expect(projected).not.toBeNull()
  if (!projected) throw new Error('Projected bounds должны существовать для конечных multipliers')

  expect(projected.left).toBeCloseTo(expected.left, 9)
  expect(projected.right).toBeCloseTo(expected.right, 9)
  expect(projected.top).toBeCloseTo(expected.top, 9)
  expect(projected.bottom).toBeCloseTo(expected.bottom, 9)
  expect(projected.centerX).toBeCloseTo(expected.centerX, 9)
  expect(projected.centerY).toBeCloseTo(expected.centerY, 9)
  expect(fixture.target.scaleX).toBe(1.25)
  expect(fixture.target.scaleY).toBe(0.8)
  expect(fixture.getCoordsMock).toHaveBeenCalledTimes(1)
})

it('возвращает несколько moving edges для повёрнутого side scaling', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'mr', angle: 30 })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать для horizontal side scaling')

  const modeProjection = resolveShapeScaleModeProjection({ projection, mode: 'horizontal' })
  const projectedBounds = projectShapeScaleBounds({
    projection,
    multipliers: { x: 1.4, y: 1 }
  })

  expect(modeProjection).not.toBeNull()
  expect(projectedBounds).not.toBeNull()
  if (!modeProjection || !projectedBounds) throw new Error('Side projection и bounds должны существовать')

  expect(modeProjection.variables).toEqual(['multiplier-x'])
  expect(modeProjection.edges.map(({ edge }) => edge)).toEqual(['right', 'bottom'])

  const positions: Record<ShapeScaleSceneEdge, number> = {
    left: projectedBounds.left,
    right: projectedBounds.right,
    top: projectedBounds.top,
    bottom: projectedBounds.bottom
  }
  modeProjection.edges.forEach((edge) => {
    const predictedPosition = edge.baselinePosition + (edge.coefficients[0] * 0.4)
    expect(predictedPosition).toBeCloseTo(positions[edge.edge], 9)
  })
})

it('возвращает edge-specific коэффициенты двух осей для повёрнутого corner scaling', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br', angle: 30 })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать для free corner scaling')

  const modeProjection = resolveShapeScaleModeProjection({ projection, mode: 'free' })
  const projectedBounds = projectShapeScaleBounds({
    projection,
    multipliers: { x: 1.4, y: 0.65 }
  })

  expect(modeProjection).not.toBeNull()
  expect(projectedBounds).not.toBeNull()
  if (!modeProjection || !projectedBounds) throw new Error('Corner projection и bounds должны существовать')

  expect(modeProjection.variables).toEqual(['multiplier-x', 'multiplier-y'])
  expect(modeProjection.edges.map(({ edge }) => edge)).toEqual(['left', 'right', 'bottom'])

  const positions: Record<ShapeScaleSceneEdge, number> = {
    left: projectedBounds.left,
    right: projectedBounds.right,
    top: projectedBounds.top,
    bottom: projectedBounds.bottom
  }
  modeProjection.edges.forEach((edge) => {
    const predictedPosition = edge.baselinePosition
      + (edge.coefficients[0] * 0.4)
      + (edge.coefficients[1] * -0.35)
    expect(edge.coefficients).toHaveLength(2)
    expect(predictedPosition).toBeCloseTo(positions[edge.edge], 9)
  })
})

it('возвращает все moving edges для centered rotated side scaling', () => {
  const fixture = createShapeScaleProjectionFixture({
    controlKey: 'mr',
    angle: 30,
    centered: true
  })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать для centered side scaling')

  const modeProjection = resolveShapeScaleModeProjection({ projection, mode: 'horizontal' })

  expect(modeProjection).not.toBeNull()
  expect(modeProjection?.edges.map(({ edge }) => edge)).toEqual(['left', 'right', 'top', 'bottom'])
  expect(modeProjection?.edges.every(({ coefficients }) => coefficients.length === 1)).toBe(true)
})

it('uniform projection воспроизводит exact bounds всех moving edges', () => {
  const fixture = createShapeScaleProjectionFixture({
    controlKey: 'br',
    angle: 30,
    centered: true
  })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать для centered uniform scaling')

  const modeProjection = resolveShapeScaleModeProjection({ projection, mode: 'uniform' })
  const projectedBounds = projectShapeScaleBounds({
    projection,
    multipliers: { x: 1.3, y: 1.3 }
  })

  expect(modeProjection).not.toBeNull()
  expect(projectedBounds).not.toBeNull()
  if (!modeProjection || !projectedBounds) throw new Error('Uniform projection и bounds должны существовать')

  const positions: Record<ShapeScaleSceneEdge, number> = {
    left: projectedBounds.left,
    right: projectedBounds.right,
    top: projectedBounds.top,
    bottom: projectedBounds.bottom
  }

  expect(modeProjection.variables).toEqual(['uniform-multiplier'])
  expect(modeProjection.edges.map(({ edge }) => edge)).toEqual(['left', 'right', 'top', 'bottom'])
  modeProjection.edges.forEach((edge) => {
    const predictedPosition = edge.baselinePosition + (edge.coefficients[0] * 0.3)
    expect(predictedPosition).toBeCloseTo(positions[edge.edge], 9)
  })
})

it('не создаёт snapshot для обычной Fabric group', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  fixture.target.shapeComposite = false

  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).not.toHaveBeenCalled()
})

it('не создаёт snapshot для ActiveSelection', () => {
  const selection = new ActiveSelection([])
  const getCoordsMock = jest.fn(() => [
    new Point(0, 0),
    new Point(100, 0),
    new Point(100, 100),
    new Point(0, 100)
  ])
  selection.getCoords = getCoordsMock

  const projection = createShapeScaleGestureProjection({
    transform: createShapeScaleGestureTransform({ target: selection }),
    pointerStart: new Point(100, 100)
  })

  expect(projection).toBeNull()
  expect(getCoordsMock).not.toHaveBeenCalled()
})

it('не создаёт snapshot для Shape внутри другой группы', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  fixture.target.group = new Group([])

  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).not.toHaveBeenCalled()
})

it('не создаёт snapshot для Shape со skew', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  fixture.target.skewX = 5

  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).not.toHaveBeenCalled()
})

it.each([
  { controlKey: 'mr', action: 'skewY' },
  { controlKey: 'mt', action: 'skewX' },
  { controlKey: 'br', action: 'scaleX' }
] as const)('не принимает action $action как scale для control $controlKey', ({ controlKey, action }) => {
  const fixture = createShapeScaleProjectionFixture({ controlKey })

  const projection = createShapeScaleGestureProjection({
    transform: {
      ...fixture.transform,
      action
    },
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).not.toHaveBeenCalled()
})

it.each(['flipX', 'flipY'] as const)('не создаёт snapshot для Shape с %s', (flipProperty) => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  fixture.target[flipProperty] = true

  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).not.toHaveBeenCalled()
})

it.each(['locked', 'lockScalingX', 'lockScalingY'] as const)(
  'не создаёт snapshot для Shape с %s',
  (lockProperty) => {
    const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
    fixture.target[lockProperty] = true

    const projection = createShapeScaleGestureProjection({
      transform: fixture.transform,
      pointerStart: fixture.pointerStart
    })

    expect(projection).toBeNull()
    expect(fixture.getCoordsMock).not.toHaveBeenCalled()
  }
)

it('не создаёт snapshot для non-scale control', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })

  const projection = createShapeScaleGestureProjection({
    transform: {
      ...fixture.transform,
      corner: 'mtr'
    },
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).not.toHaveBeenCalled()
})

it('не создаёт snapshot для невалидного numeric origin', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })

  const projection = createShapeScaleGestureProjection({
    transform: {
      ...fixture.transform,
      originX: Number.NaN
    },
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).not.toHaveBeenCalled()
})

it('не создаёт snapshot, если getCoords вернул не четыре угла', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  fixture.getCoordsMock.mockReturnValue([
    new Point(0, 0),
    new Point(100, 0),
    new Point(100, 100)
  ])

  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).toHaveBeenCalledTimes(1)
})

it('не создаёт snapshot, если чтение getCoords завершилось ошибкой', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  fixture.getCoordsMock.mockImplementation(() => {
    throw new Error('invalid Fabric geometry')
  })

  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).toHaveBeenCalledTimes(1)
})

it('не создаёт snapshot для вырожденной affine-матрицы', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  fixture.getCoordsMock.mockReturnValue([
    new Point(10, 20),
    new Point(10, 20),
    new Point(10, 20),
    new Point(10, 20)
  ])

  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).toHaveBeenCalledTimes(1)
})

it('не создаёт snapshot для невалидного mouse-down pointer', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })

  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: new Point(Number.NaN, 100)
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).not.toHaveBeenCalled()
})

it('не создаёт snapshot для невалидного original scale', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })

  const projection = createShapeScaleGestureProjection({
    transform: {
      ...fixture.transform,
      original: {
        scaleX: 0,
        scaleY: 1
      }
    },
    pointerStart: fixture.pointerStart
  })

  expect(projection).toBeNull()
  expect(fixture.getCoordsMock).not.toHaveBeenCalled()
})

it('не продолжает uniform scale после пересечения fixed point', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать до проверки crossing')

  const pointer = moveFixturePointer({
    fixture,
    multipliers: { x: -0.1, y: -0.1 }
  })

  expect(resolveShapeScalePointerMultipliers({ projection, pointer, mode: 'uniform' })).toBeNull()
  expect(fixture.getCoordsMock).toHaveBeenCalledTimes(1)
})

it('продолжает uniform scale при точном касании одной оси неподвижной точки', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать до проверки касания оси')

  const pointer = moveFixturePointer({
    fixture,
    multipliers: { x: 0, y: 1 }
  })
  const multipliers = resolveShapeScalePointerMultipliers({ projection, pointer, mode: 'uniform' })

  expect(multipliers).not.toBeNull()
  expect(multipliers?.x).toBeCloseTo(1 / 3)
  expect(multipliers?.y).toBeCloseTo(1 / 3)
})

it('не возвращает pointer intent и coefficients для несовместимого control mode', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'mr' })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать для проверки несовместимого режима')

  const pointer = moveFixturePointer({ fixture, multipliers: { x: 1.2, y: 1 } })

  expect(resolveShapeScalePointerMultipliers({ projection, pointer, mode: 'uniform' })).toBeNull()
  expect(resolveShapeScaleModeProjection({ projection, mode: 'free' })).toBeNull()
})

it('отклоняет невалидные pointer и hypothetical multipliers после создания snapshot', () => {
  const fixture = createShapeScaleProjectionFixture({ controlKey: 'br' })
  const projection = createShapeScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })

  expect(projection).not.toBeNull()
  if (!projection) throw new Error('Projection должна существовать до проверки runtime-входа')

  expect(resolveShapeScalePointerMultipliers({
    projection,
    pointer: new Point(Number.POSITIVE_INFINITY, 0),
    mode: 'free'
  })).toBeNull()
  expect(projectShapeScaleBounds({
    projection,
    multipliers: { x: Number.NaN, y: 1 }
  })).toBeNull()
})
