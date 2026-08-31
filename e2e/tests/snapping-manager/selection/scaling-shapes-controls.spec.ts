import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'
import {
  ACTIVE_SELECTION_SCALE_CONTROL_CASES,
  type ActiveSelectionScaleEdge
} from '../../../fixtures/data/active-selection-scaling.data'

/** Поля точных границ общего выделения по именам сценических граней. */
const ACTIVE_SELECTION_BOUNDS_FIELDS = {
  bottom: 'boundsBottom',
  left: 'boundsLeft',
  right: 'boundsRight',
  top: 'boundsTop'
} as const satisfies Record<ActiveSelectionScaleEdge, string>

/** Одна ожидаемая направляющая после скейлинга общего выделения. */
type ExpectedScaleGuide = {
  position: number
  type: 'horizontal' | 'vertical'
}

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
    const expectedGuides: ExpectedScaleGuide[] = []

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
