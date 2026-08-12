import { Path } from 'fabric'
import {
  createScaleProjection,
  projectScaleEdgePositions
} from '../../../../../src/editor/snapping-manager/scaling/scale-projection'
import {
  createTextWidthResizeGestureProjection,
  type TextWidthResizeControlKey
} from '../../../../../src/editor/text-manager/scaling/text-width-resize-projection'
import { createTextWidthResizeProjectionFixture } from '../../../../test-utils/text/width-resize-projection'

it.each<{
  controlKey: TextWidthResizeControlKey
  coefficient: number
  movingEdge: 'left' | 'right'
}>([
  { controlKey: 'mr', coefficient: 1, movingEdge: 'right' },
  { controlKey: 'ml', coefficient: -1, movingEdge: 'left' }
])('связывает ширину с движущейся границей для ручки $controlKey', ({
  controlKey,
  coefficient,
  movingEdge
}) => {
  const fixture = createTextWidthResizeProjectionFixture({ controlKey })
  const gesture = createTextWidthResizeGestureProjection(fixture)

  expect(gesture).not.toBeNull()
  if (!gesture) throw new Error('Проекция должна существовать для боковой ручки текста')

  const mode = gesture.projectionModes[0]
  const projection = createScaleProjection({
    bounds: gesture.baselineBounds,
    input: mode.projection
  })
  const positions = projectScaleEdgePositions({
    projection,
    values: [gesture.baselineWidth + 25]
  })
  const expectedPosition = fixture.bounds[movingEdge] + (25 * coefficient)

  expect(gesture.controlKey).toBe(controlKey)
  expect(gesture.movingEdges).toEqual([movingEdge])
  expect(projection.variables).toEqual(['text-width'])
  expect(projection.edges[0].coefficients).toEqual([coefficient])
  expect(positions[movingEdge]).toBeCloseTo(expectedPosition, 9)
})

it.each<{
  controlKey: TextWidthResizeControlKey
  coefficient: number
  movingEdge: 'bottom' | 'top'
}>([
  { controlKey: 'mr', coefficient: 1, movingEdge: 'bottom' },
  { controlKey: 'ml', coefficient: -1, movingEdge: 'top' }
])('связывает ширину с вертикальной гранью повёрнутого текста для ручки $controlKey', ({
  controlKey,
  coefficient,
  movingEdge
}) => {
  const fixture = createTextWidthResizeProjectionFixture({ angle: 90, controlKey })
  const gesture = createTextWidthResizeGestureProjection(fixture)

  expect(gesture).not.toBeNull()
  if (!gesture) throw new Error('Проекция должна существовать для повёрнутого текста')

  const mode = gesture.projectionModes[0]
  const projection = createScaleProjection({
    bounds: gesture.baselineBounds,
    input: mode.projection
  })
  const positions = projectScaleEdgePositions({
    projection,
    values: [gesture.baselineWidth + 20]
  })
  const expectedPosition = fixture.bounds[movingEdge] + (20 * coefficient)
  const expectedAnchor = fixture.textbox.getPointByOrigin(
    fixture.transform.originX,
    fixture.transform.originY
  )

  expect(gesture.movingEdges).toEqual([movingEdge])
  expect(projection.edges[0].coefficients[0]).toBeCloseTo(coefficient, 9)
  expect(positions[movingEdge]).toBeCloseTo(expectedPosition, 9)
  expect(gesture.fixedAnchor.x).toBeCloseTo(expectedAnchor.x, 9)
  expect(gesture.fixedAnchor.y).toBeCloseTo(expectedAnchor.y, 9)
})

it('описывает обе движущиеся границы текста при повороте на 30 градусов', () => {
  const fixture = createTextWidthResizeProjectionFixture({ angle: 30, controlKey: 'mr', scaleX: 1.5 })
  const gesture = createTextWidthResizeGestureProjection(fixture)

  expect(gesture).not.toBeNull()
  if (!gesture) throw new Error('Проекция должна существовать для поворота на 30 градусов')

  const edges = gesture.projectionModes[0].projection.edges

  expect(gesture.movingEdges).toEqual(['right', 'bottom'])
  expect(edges[0].coefficients[0]).toBeCloseTo(Math.cos(Math.PI / 6) * 1.5, 9)
  expect(edges[1].coefficients[0]).toBeCloseTo(Math.sin(Math.PI / 6) * 1.5, 9)
  expect(gesture.projectionModes[0].projection.variableSceneWeights[0]).toBeCloseTo(1.5, 9)
})

it.each<TextWidthResizeControlKey>(['ml', 'mr'])(
  'описывает расходящиеся от центра границы для ручки %s',
  (controlKey) => {
    const fixture = createTextWidthResizeProjectionFixture({
      angle: 30,
      centered: true,
      controlKey,
      scaleX: 1.5
    })
    const gesture = createTextWidthResizeGestureProjection(fixture)

    expect(gesture).not.toBeNull()
    if (!gesture) throw new Error('Проекция должна существовать для изменения ширины относительно центра')

    const { edges, variableSceneWeights } = gesture.projectionModes[0].projection
    const xCoefficient = Math.abs(Math.cos(Math.PI / 6) * 1.5) / 2
    const yCoefficient = Math.abs(Math.sin(Math.PI / 6) * 1.5) / 2

    expect(gesture.movingEdges).toEqual(['left', 'right', 'top', 'bottom'])
    expect(edges.map(({ coefficients }) => coefficients[0])).toEqual([
      -xCoefficient,
      xCoefficient,
      -yCoefficient,
      yCoefficient
    ])
    expect(variableSceneWeights[0]).toBeCloseTo(0.75, 9)
    expect(gesture.fixedAnchor.x).toBeCloseTo(fixture.bounds.centerX, 9)
    expect(gesture.fixedAnchor.y).toBeCloseTo(fixture.bounds.centerY, 9)
  }
)

it('не создаёт проекцию при масштабировании и для вложенного текста', () => {
  const scalingFixture = createTextWidthResizeProjectionFixture({ controlKey: 'mr' })
  scalingFixture.transform.action = 'scaling'

  const nestedFixture = createTextWidthResizeProjectionFixture({ controlKey: 'ml' })
  nestedFixture.textbox.group = {} as typeof nestedFixture.textbox.group

  expect(createTextWidthResizeGestureProjection(scalingFixture)).toBeNull()
  expect(createTextWidthResizeGestureProjection(nestedFixture)).toBeNull()
})

it('сохраняет прежнюю логику для отражённого, наклонённого и расположенного по контуру текста', () => {
  const flippedFixture = createTextWidthResizeProjectionFixture({ controlKey: 'mr' })
  flippedFixture.textbox.flipX = true

  const skewedFixture = createTextWidthResizeProjectionFixture({ controlKey: 'ml' })
  skewedFixture.textbox.skewY = 10

  const pathFixture = createTextWidthResizeProjectionFixture({ controlKey: 'mr' })
  pathFixture.textbox.path = new Path('M 0 0 L 100 0')

  expect(createTextWidthResizeGestureProjection(flippedFixture)).toBeNull()
  expect(createTextWidthResizeGestureProjection(skewedFixture)).toBeNull()
  expect(createTextWidthResizeGestureProjection(pathFixture)).toBeNull()
})

it('принимает числовые значения точки опоры стандартной правой ручки Fabric', () => {
  const fixture = createTextWidthResizeProjectionFixture({ controlKey: 'mr' })
  fixture.transform.originX = 0
  fixture.transform.originY = 0.5

  const gesture = createTextWidthResizeGestureProjection(fixture)

  expect(gesture).not.toBeNull()
  expect(gesture?.movingEdges).toEqual(['right'])
  expect(gesture?.controlKey).toBe('mr')
})
