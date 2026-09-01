import { expect } from '@playwright/test'

import { ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE } from '../fixtures/data/active-selection-scaling.data'
import type {
  SelectionChildSceneGeometrySnapshot,
  SelectionCompositionChildSnapshot,
  SelectionCompositionSnapshot
} from '../types'

/** Возвращает обязательную видимую геометрию дочернего объекта. */
export function requireSelectionChildSceneGeometry({
  geometries,
  id
}: {
  geometries: SelectionChildSceneGeometrySnapshot[]
  id: string
}): SelectionChildSceneGeometrySnapshot {
  const geometry = geometries.find((child) => child.id === id)

  expect(geometry, `должна существовать видимая геометрия объекта ${id}`).toBeDefined()
  expect(geometry?.topEdgeLength, `${id} должен иметь положительную ширину`).toBeGreaterThan(0)
  if (!geometry) throw new Error(`Не найдена видимая геометрия объекта ${id}`)

  return geometry
}

/** Возвращает обязательный шейп из снимка общего выделения. */
export function requireSelectionShapeSnapshot({
  composition,
  id
}: {
  composition: SelectionCompositionSnapshot
  id: string
}): SelectionCompositionChildSnapshot {
  const shape = composition.children.find((candidate) => candidate.id === id)

  expect(shape, `в общем выделении должен существовать объект ${id}`).toBeDefined()
  expect(shape?.type, `${id} должен оставаться шейпом`).toBe('shape-group')
  if (!shape) throw new Error(`В общем выделении не найден шейп ${id}`)

  return shape
}

/** Проверяет видимый результат выбранных осей скейлинга повёрнутого шейпа. */
export function expectRotatedShapeLiveGeometry({
  baselineShape,
  baselineScene,
  changesHeight,
  changesWidth,
  currentShape,
  currentScene,
  selectionAngle
}: {
  baselineShape: SelectionCompositionChildSnapshot
  baselineScene: SelectionChildSceneGeometrySnapshot
  changesHeight: boolean
  changesWidth: boolean
  currentShape: SelectionCompositionChildSnapshot
  currentScene: SelectionChildSceneGeometrySnapshot
  selectionAngle: number
}): void {
  if (changesWidth) {
    expect(currentScene.topEdgeLength).toBeGreaterThan(baselineScene.topEdgeLength)
  } else {
    expect(currentScene.topEdgeLength).toBeCloseTo(baselineScene.topEdgeLength, 1)
  }

  if (changesHeight) {
    expect(currentScene.leftEdgeLength).toBeGreaterThan(baselineScene.leftEdgeLength)
  } else {
    expect(currentScene.leftEdgeLength).toBeCloseTo(baselineScene.leftEdgeLength, 1)
  }

  if (changesWidth && changesHeight) {
    const widthMultiplier = currentScene.topEdgeLength / baselineScene.topEdgeLength
    const heightMultiplier = currentScene.leftEdgeLength / baselineScene.leftEdgeLength

    expect(widthMultiplier).toBeCloseTo(heightMultiplier, 2)
  }

  const angle = (selectionAngle * Math.PI) / 180
  const centerDeltaX = currentScene.centerX - baselineScene.centerX
  const centerDeltaY = currentScene.centerY - baselineScene.centerY
  if (changesWidth && !changesHeight) {
    const distance = Math.abs(-Math.sin(angle) * centerDeltaX + Math.cos(angle) * centerDeltaY)

    expect(distance).toBeLessThanOrEqual(ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE)
  }
  if (changesHeight && !changesWidth) {
    const distance = Math.abs(Math.cos(angle) * centerDeltaX + Math.sin(angle) * centerDeltaY)

    expect(distance).toBeLessThanOrEqual(ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE)
  }

  expect(currentScene.sceneAngle).toBeCloseTo(baselineScene.sceneAngle, 1)
  expect(currentScene.orthogonality).toBeCloseTo(0, 5)
  expect(currentShape.originX).toBe(baselineShape.originX)
  expect(currentShape.originY).toBe(baselineShape.originY)
}

/** Проверяет фиксацию последнего видимого состояния одного повёрнутого шейпа. */
function expectCommittedRotatedShapeGeometry({
  baselineShape,
  committedShape,
  committedScene,
  liveScene
}: {
  baselineShape: SelectionCompositionChildSnapshot
  committedShape: SelectionCompositionChildSnapshot
  committedScene: SelectionChildSceneGeometrySnapshot
  liveScene: SelectionChildSceneGeometrySnapshot
}): void {
  expect(Math.abs(committedScene.centerX - liveScene.centerX))
    .toBeLessThanOrEqual(ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE)
  expect(Math.abs(committedScene.centerY - liveScene.centerY))
    .toBeLessThanOrEqual(ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE)
  expect(committedScene.topEdgeLength).toBeCloseTo(liveScene.topEdgeLength, 1)
  expect(committedScene.leftEdgeLength).toBeCloseTo(liveScene.leftEdgeLength, 1)
  expect(committedScene.sceneAngle).toBeCloseTo(liveScene.sceneAngle, 5)
  expect(committedScene.orthogonality).toBeCloseTo(liveScene.orthogonality, 5)
  expect(committedShape.width).toBeCloseTo(liveScene.width, 5)
  expect(committedShape.height).toBeCloseTo(liveScene.height, 5)
  expect(committedShape.angle).toBeCloseTo(baselineShape.angle, 5)
  expect(committedShape.skewX).toBeCloseTo(0, 5)
  expect(committedShape.skewY).toBeCloseTo(0, 5)
  expect(committedShape.scaleX).toBeCloseTo(1, 5)
  expect(committedShape.scaleY).toBeCloseTo(1, 5)
  expect(committedShape.originX).toBe(baselineShape.originX)
  expect(committedShape.originY).toBe(baselineShape.originY)
}

/** Проверяет фиксацию видимой геометрии всех повёрнутых шейпов после mouseup. */
export function expectRotatedShapesCommitted({
  baseline,
  committed,
  committedGeometry,
  liveGeometry,
  shapeIds
}: {
  baseline: SelectionCompositionSnapshot
  committed: SelectionCompositionSnapshot
  committedGeometry: SelectionChildSceneGeometrySnapshot[]
  liveGeometry: SelectionChildSceneGeometrySnapshot[]
  shapeIds: readonly string[]
}): void {
  expect(shapeIds.length).toBeGreaterThan(0)
  expect(committedGeometry.length).toBeGreaterThanOrEqual(shapeIds.length)

  for (const id of shapeIds) {
    expectCommittedRotatedShapeGeometry({
      baselineShape: requireSelectionShapeSnapshot({ composition: baseline, id }),
      committedShape: requireSelectionShapeSnapshot({ composition: committed, id }),
      committedScene: requireSelectionChildSceneGeometry({ geometries: committedGeometry, id }),
      liveScene: requireSelectionChildSceneGeometry({ geometries: liveGeometry, id })
    })
  }
}

/** Проверяет, что mouseup не меняет последнее видимое состояние рамки. */
export function expectSelectionFrameToMatchLiveState({
  committed,
  live
}: {
  committed: SelectionCompositionSnapshot
  live: SelectionCompositionSnapshot
}): void {
  const tolerance = ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE

  expect(Math.abs(committed.selection.boundsWidth - live.selection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(committed.selection.boundsHeight - live.selection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(committed.selection.boundsLeft - live.selection.boundsLeft)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(committed.selection.boundsTop - live.selection.boundsTop)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(committed.selection.boundsRight - live.selection.boundsRight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(committed.selection.boundsBottom - live.selection.boundsBottom)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(committed.selection.centerX - live.selection.centerX)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(committed.selection.centerY - live.selection.centerY)).toBeLessThanOrEqual(tolerance)
  expect(committed.selection.angle).toBeCloseTo(live.selection.angle, 5)
}

/** Проверяет восстановление канонической геометрии повёрнутых шейпов. */
export function expectRotatedShapeCompositionToMatch({
  actual,
  expected,
  shapeIds
}: {
  actual: SelectionCompositionSnapshot
  expected: SelectionCompositionSnapshot
  shapeIds: readonly string[]
}): void {
  expect(shapeIds.length).toBeGreaterThan(0)
  expect(actual.children).toHaveLength(expected.children.length)

  for (const id of shapeIds) {
    const actualShape = requireSelectionShapeSnapshot({ composition: actual, id })
    const expectedShape = requireSelectionShapeSnapshot({ composition: expected, id })

    expect(actualShape.width).toBeCloseTo(expectedShape.width, 2)
    expect(actualShape.height).toBeCloseTo(expectedShape.height, 2)
    expect(actualShape.angle).toBeCloseTo(expectedShape.angle, 2)
    expect(actualShape.skewX).toBeCloseTo(expectedShape.skewX, 2)
    expect(actualShape.skewY).toBeCloseTo(expectedShape.skewY, 2)
    expect(actualShape.scaleX).toBeCloseTo(expectedShape.scaleX, 2)
    expect(actualShape.scaleY).toBeCloseTo(expectedShape.scaleY, 2)
    expect(actualShape.boundsLeft).toBeCloseTo(expectedShape.boundsLeft, 2)
    expect(actualShape.boundsTop).toBeCloseTo(expectedShape.boundsTop, 2)
    expect(actualShape.boundsWidth).toBeCloseTo(expectedShape.boundsWidth, 2)
    expect(actualShape.boundsHeight).toBeCloseTo(expectedShape.boundsHeight, 2)
    expect(actualShape.centerX).toBeCloseTo(expectedShape.centerX, 2)
    expect(actualShape.centerY).toBeCloseTo(expectedShape.centerY, 2)
    expect(actualShape.originX).toBe(expectedShape.originX)
    expect(actualShape.originY).toBe(expectedShape.originY)
  }
}

/** Проверяет, что после mouseup видимая геометрия дочерних объектов не изменилась. */
export function expectSelectionChildrenToMatchLiveState({
  childIds,
  committed,
  live
}: {
  childIds: readonly string[]
  committed: SelectionChildSceneGeometrySnapshot[]
  live: SelectionChildSceneGeometrySnapshot[]
}): void {
  expect(childIds.length).toBeGreaterThan(0)
  expect(committed).toHaveLength(live.length)

  for (const id of childIds) {
    const committedChild = requireSelectionChildSceneGeometry({ geometries: committed, id })
    const liveChild = requireSelectionChildSceneGeometry({ geometries: live, id })

    expect(committedChild.centerX).toBeCloseTo(liveChild.centerX, 1)
    expect(committedChild.centerY).toBeCloseTo(liveChild.centerY, 1)
    expect(committedChild.topEdgeLength).toBeCloseTo(liveChild.topEdgeLength, 1)
    expect(committedChild.leftEdgeLength).toBeCloseTo(liveChild.leftEdgeLength, 1)
    expect(committedChild.sceneAngle).toBeCloseTo(liveChild.sceneAngle, 5)
    expect(committedChild.orthogonality).toBeCloseTo(liveChild.orthogonality, 5)
  }
}

/** Проверяет равномерный рост остальных объектов при горизонтальном скейлинге смешанного состава. */
export function expectNonShapeHorizontalGrowth({
  current,
  ids,
  previous
}: {
  current: SelectionChildSceneGeometrySnapshot[]
  ids: readonly string[]
  previous: SelectionChildSceneGeometrySnapshot[]
}): void {
  expect(ids.length).toBeGreaterThan(0)
  expect(current).toHaveLength(previous.length)

  for (const id of ids) {
    const previousChild = requireSelectionChildSceneGeometry({ geometries: previous, id })
    const currentChild = requireSelectionChildSceneGeometry({ geometries: current, id })

    expect(currentChild.topEdgeLength).toBeGreaterThan(previousChild.topEdgeLength)
    expect(currentChild.leftEdgeLength).toBeCloseTo(previousChild.leftEdgeLength, 1)
    expect(currentChild.centerY).toBeCloseTo(previousChild.centerY, 1)
    expect(currentChild.sceneAngle).toBeCloseTo(previousChild.sceneAngle, 5)
    expect(currentChild.orthogonality).toBeCloseTo(0, 5)
  }
}

/** Проверяет каждый следующий кадр роста повёрнутых шейпов без поперечного скачка. */
export function expectRotatedShapeHorizontalGrowth({
  baseline,
  baselineGeometry,
  current,
  currentGeometry,
  previousGeometry,
  shapeIds
}: {
  baseline: SelectionCompositionSnapshot
  baselineGeometry: SelectionChildSceneGeometrySnapshot[]
  current: SelectionCompositionSnapshot
  currentGeometry: SelectionChildSceneGeometrySnapshot[]
  previousGeometry: SelectionChildSceneGeometrySnapshot[]
  shapeIds: readonly string[]
}): void {
  expect(shapeIds.length).toBeGreaterThan(0)
  expect(currentGeometry.length).toBeGreaterThanOrEqual(shapeIds.length)

  for (const id of shapeIds) {
    const currentScene = requireSelectionChildSceneGeometry({ geometries: currentGeometry, id })

    expect(currentScene.topEdgeLength).toBeGreaterThan(
      requireSelectionChildSceneGeometry({ geometries: previousGeometry, id }).topEdgeLength
    )
    expectRotatedShapeLiveGeometry({
      baselineShape: requireSelectionShapeSnapshot({ composition: baseline, id }),
      baselineScene: requireSelectionChildSceneGeometry({ geometries: baselineGeometry, id }),
      changesHeight: false,
      changesWidth: true,
      currentShape: requireSelectionShapeSnapshot({ composition: current, id }),
      currentScene,
      selectionAngle: baseline.selection.angle
    })
  }
}
