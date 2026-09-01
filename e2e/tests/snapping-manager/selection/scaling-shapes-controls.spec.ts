import {
  test,
  expect
} from '../../../fixtures/rotated-shape-selection-scaling.fixture'
import {
  ACTIVE_SELECTION_SCALE_CONTROL_CASES,
  MIXED_SELECTION_SCALE_CONTROL_CASES,
  ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE,
  type ActiveSelectionScaleEdge
} from '../../../fixtures/data/active-selection-scaling.data'
import {
  expectRotatedShapeLiveGeometry,
  expectRotatedShapesCommitted,
  expectSelectionFrameToMatchLiveState,
  requireSelectionChildSceneGeometry,
  requireSelectionShapeSnapshot
} from '../../../helpers/rotated-shape-selection-scaling.helper'
import type { SnappingGuideInfo } from '../../../types'

/** Поля точных границ общего выделения по именам сценических граней. */
const ACTIVE_SELECTION_BOUNDS_FIELDS = {
  bottom: 'boundsBottom',
  left: 'boundsLeft',
  right: 'boundsRight',
  top: 'boundsTop'
} as const satisfies Record<ActiveSelectionScaleEdge, string>

for (const controlCase of ACTIVE_SELECTION_SCALE_CONTROL_CASES) {
  test(`${controlCase.title} прилипает подвижными гранями и сохраняет неподвижные`, async({
    activeSelectionShapeScaleSetup: setup,
    selection,
    shapes,
    snapping
  }) => {
    const point = {
      x: setup.initial.selection.centerX,
      y: setup.initial.selection.centerY
    }
    const expectedGuides: SnappingGuideInfo[] = []

    if (controlCase.horizontalGuide) {
      point.x = setup.guides[controlCase.horizontalGuide]
      expectedGuides.push({ type: 'vertical', position: point.x })
    }
    if (controlCase.verticalGuide) {
      point.y = setup.guides[controlCase.verticalGuide]
      expectedGuides.push({ type: 'horizontal', position: point.y })
    }

    await selection.scaling.startFromControl({ control: controlCase.control })
    await selection.scaling.dragControlToScenePoint({ point })

    const live = await selection.getCompositionSnapshot()
    const guideState = await snapping.getGuideState()

    for (const movingEdge of [controlCase.horizontalGuide, controlCase.verticalGuide]) {
      if (!movingEdge) continue

      expect(live.selection[ACTIVE_SELECTION_BOUNDS_FIELDS[movingEdge]])
        .toBeCloseTo(setup.guides[movingEdge], 2)
    }
    for (const fixedEdge of controlCase.fixedEdges) {
      expect(live.selection[ACTIVE_SELECTION_BOUNDS_FIELDS[fixedEdge]])
        .toBeCloseTo(setup.initial.selection[ACTIVE_SELECTION_BOUNDS_FIELDS[fixedEdge]], 5)
    }
    expect(guideState.guides).toEqual(expect.arrayContaining(expectedGuides))
    expect(guideState.guides).toHaveLength(expectedGuides.length)
    expect(guideState.spacingGuides).toHaveLength(0)
    const committed = await selection.scaling.finish()
    const committedShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))

    for (const field of Object.values(ACTIVE_SELECTION_BOUNDS_FIELDS)) {
      expect(committed[field]).toBeCloseTo(live.selection[field], 5)
    }
    for (const shape of committedShapes) {
      expect(shape.width).toBeCloseTo(shape.groupBoundsWidth, 5)
      expect(shape.height).toBeCloseTo(shape.groupBoundsHeight, 5)
      expect(shape.scaleX).toBeCloseTo(1, 10)
      expect(shape.scaleY).toBeCloseTo(1, 10)
    }
  })
}

for (const controlCase of MIXED_SELECTION_SCALE_CONTROL_CASES) {
  test(`в смешанном выделении ${controlCase.title} не вызывает скачка повёрнутых шейпов`, async({
    rotatedMixedShapeScaleSetup: setup,
    selection
  }) => {
    const baselineGeometry = await selection.getChildSceneGeometry()
    const fixedPoint = await selection.scaling.getControlScenePoint({ control: controlCase.oppositeControl })

    await selection.scaling.startFromControl({ control: controlCase.control })
    await selection.scaling.dragControlBy({
      deltaX: controlCase.outwardDeltaX,
      deltaY: controlCase.outwardDeltaY,
      pointerSteps: 1
    })

    const live = await selection.getCompositionSnapshot()
    const liveGeometry = await selection.getChildSceneGeometry()
    const liveFixedPoint = await selection.scaling.getControlScenePoint({ control: controlCase.oppositeControl })

    expect(Math.abs(liveFixedPoint.x - fixedPoint.x))
      .toBeLessThanOrEqual(ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE)
    expect(Math.abs(liveFixedPoint.y - fixedPoint.y))
      .toBeLessThanOrEqual(ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE)

    for (const id of setup.shapeIds) {
      expectRotatedShapeLiveGeometry({
        baselineShape: requireSelectionShapeSnapshot({ composition: setup.initial, id }),
        baselineScene: requireSelectionChildSceneGeometry({ geometries: baselineGeometry, id }),
        changesHeight: controlCase.changesHeight,
        changesWidth: controlCase.changesWidth,
        currentShape: requireSelectionShapeSnapshot({ composition: live, id }),
        currentScene: requireSelectionChildSceneGeometry({ geometries: liveGeometry, id }),
        selectionAngle: setup.initial.selection.angle
      })
    }

    await selection.scaling.finish()
    const committed = await selection.getCompositionSnapshot()
    const committedGeometry = await selection.getChildSceneGeometry()

    expectRotatedShapesCommitted({
      baseline: setup.initial,
      committed,
      committedGeometry,
      liveGeometry,
      shapeIds: setup.shapeIds
    })
    expectSelectionFrameToMatchLiveState({ committed, live })
  })
}

for (const controlCase of ACTIVE_SELECTION_SCALE_CONTROL_CASES) {
  test(`${controlCase.title} не вызывает скачка и не деформирует повёрнутые шейпы`, async({
    rotatedShapeScaleSetup: setup,
    selection
  }) => {
    const baselineGeometry = await selection.getChildSceneGeometry()
    const fixedPoint = await selection.scaling.getControlScenePoint({ control: controlCase.oppositeControl })

    await selection.scaling.startFromControl({ control: controlCase.control })
    await selection.scaling.dragControlBy({
      deltaX: controlCase.outwardDeltaX,
      deltaY: controlCase.outwardDeltaY,
      pointerSteps: 1
    })

    const live = await selection.getCompositionSnapshot()
    const liveGeometry = await selection.getChildSceneGeometry()
    const liveFixedPoint = await selection.scaling.getControlScenePoint({ control: controlCase.oppositeControl })

    expect(Math.abs(liveFixedPoint.x - fixedPoint.x))
      .toBeLessThanOrEqual(ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE)
    expect(Math.abs(liveFixedPoint.y - fixedPoint.y))
      .toBeLessThanOrEqual(ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE)

    for (const id of setup.shapeIds) {
      expectRotatedShapeLiveGeometry({
        baselineShape: requireSelectionShapeSnapshot({ composition: setup.initial, id }),
        baselineScene: requireSelectionChildSceneGeometry({ geometries: baselineGeometry, id }),
        changesHeight: controlCase.changesHeight,
        changesWidth: controlCase.changesWidth,
        currentShape: requireSelectionShapeSnapshot({ composition: live, id }),
        currentScene: requireSelectionChildSceneGeometry({ geometries: liveGeometry, id }),
        selectionAngle: setup.initial.selection.angle
      })
    }

    await selection.scaling.finish()
    const committed = await selection.getCompositionSnapshot()
    const committedGeometry = await selection.getChildSceneGeometry()

    expectRotatedShapesCommitted({
      baseline: setup.initial,
      committed,
      committedGeometry,
      liveGeometry,
      shapeIds: setup.shapeIds
    })
    expectSelectionFrameToMatchLiveState({ committed, live })
  })
}
