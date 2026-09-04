import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'
import {
  ACTIVE_SELECTION_TEXT_SCALE_CONTROL_CASES,
  type ActiveSelectionScaleEdge
} from '../../../fixtures/data/active-selection-scaling.data'
import type { SnappingGuideInfo } from '../../../types'

/** Поля точных границ общего выделения. */
const ACTIVE_SELECTION_BOUNDS_FIELDS = {
  bottom: 'boundsBottom',
  left: 'boundsLeft',
  right: 'boundsRight',
  top: 'boundsTop'
} as const satisfies Record<ActiveSelectionScaleEdge, string>

/** Ручки, для которых отдельно проверяется вертикальная направляющая. */
const TEXT_CONTROLS_WITH_VERTICAL_GUIDE = new Set(['ml', 'mr', 'tl', 'br'])

/** Опорные объекты, которые убирают конкурирующую ось угловой ручки. */
const TEXT_SCALE_REFERENCE_IDS = {
  horizontal: ['active-selection-scale-top-reference', 'active-selection-scale-bottom-reference'],
  vertical: ['active-selection-scale-left-reference', 'active-selection-scale-right-reference']
} as const

test('у общего выделения из текстов доступны две боковые и четыре угловые ручки', async({
  activeSelectionTextScaleSetup: setup,
  selection
}) => {
  const capability = await selection.scaling.getCapability()
  const expectedHandles = ACTIVE_SELECTION_TEXT_SCALE_CONTROL_CASES
    .map(({ control }) => control)
    .sort()

  expect(capability.targetType).toBe('activeselection')
  expect([...capability.childIds].sort()).toEqual([...setup.textIds].sort())
  expect([...capability.availableScaleHandles].sort()).toEqual(expectedHandles)
  expect(capability.availableScaleHandles).toHaveLength(6)
})

for (const controlCase of ACTIVE_SELECTION_TEXT_SCALE_CONTROL_CASES) {
  const checksVerticalGuide = TEXT_CONTROLS_WITH_VERTICAL_GUIDE.has(controlCase.control)
  const movingEdge = checksVerticalGuide ? controlCase.horizontalGuide : controlCase.verticalGuide
  const competingReferences = checksVerticalGuide
    ? TEXT_SCALE_REFERENCE_IDS.horizontal
    : TEXT_SCALE_REFERENCE_IDS.vertical
  if (!movingEdge) throw new Error('Каждая ручка должна проверять одну подвижную грань')

  test(`${controlCase.title} прилипает подвижной гранью и сохраняет неподвижные`, async({
    activeSelectionTextScaleSetup: setup,
    selection,
    shapes,
    snapping
  }) => {
    const point = { x: setup.initial.selection.centerX, y: setup.initial.selection.centerY }
    point.x = controlCase.horizontalGuide ? setup.guides[controlCase.horizontalGuide] : point.x
    point.y = controlCase.verticalGuide ? setup.guides[controlCase.verticalGuide] : point.y

    if (controlCase.horizontalGuide && controlCase.verticalGuide) {
      for (const id of competingReferences) expect(await shapes.remove({ id })).toBe(true)
    }

    await selection.scaling.startFromControl({ control: controlCase.control })
    await selection.scaling.dragControlToScenePoint({ point })

    const live = await selection.getCompositionSnapshot()
    const guideState = await snapping.getGuideState()
    const expectedGuide: SnappingGuideInfo = checksVerticalGuide
      ? { type: 'vertical', position: setup.guides[movingEdge] }
      : { type: 'horizontal', position: setup.guides[movingEdge] }

    expect(live.selection[ACTIVE_SELECTION_BOUNDS_FIELDS[movingEdge]])
      .toBeCloseTo(setup.guides[movingEdge], 2)
    for (const fixedEdge of controlCase.fixedEdges) {
      expect(live.selection[ACTIVE_SELECTION_BOUNDS_FIELDS[fixedEdge]])
        .toBeCloseTo(setup.initial.selection[ACTIVE_SELECTION_BOUNDS_FIELDS[fixedEdge]], 5)
    }
    expect(guideState.guides).toEqual([expectedGuide])
    expect(guideState.spacingGuides).toHaveLength(0)

    await selection.scaling.finish()
  })

  test(`${controlCase.title} сохраняет геометрию после mouseup`, async({
    activeSelectionTextScaleSetup: setup,
    selection,
    shapes,
    text
  }) => {
    const initialTexts = await Promise.all(setup.textIds.map((id) => text.scaling.getSnapshot({ id })))
    const point = { x: setup.initial.selection.centerX, y: setup.initial.selection.centerY }
    point.x = controlCase.horizontalGuide ? setup.guides[controlCase.horizontalGuide] : point.x
    point.y = controlCase.verticalGuide ? setup.guides[controlCase.verticalGuide] : point.y

    if (controlCase.horizontalGuide && controlCase.verticalGuide) {
      for (const id of competingReferences) expect(await shapes.remove({ id })).toBe(true)
    }

    await selection.scaling.startFromControl({ control: controlCase.control })
    await selection.scaling.dragControlToScenePoint({ point })
    const live = await selection.getTextCompositionSnapshot()
    await selection.scaling.finish()
    const committed = await selection.getTextCompositionSnapshot()

    for (const field of Object.values(ACTIVE_SELECTION_BOUNDS_FIELDS)) {
      expect(committed.selection[field]).toBeCloseTo(live.selection[field], 5)
    }
    for (const [index, committedText] of committed.children.entries()) {
      const initialText = initialTexts[index]
      const liveText = live.children.find(({ id }) => id === committedText.id)
      if (!initialText || !liveText) throw new Error('Снимки должны содержать оба текста')

      expect(committedText.scaleX).toBeCloseTo(1, 10)
      expect(committedText.scaleY).toBeCloseTo(1, 10)
      expect(committedText.width).toBeCloseTo(liveText.width, 5)
      expect(committedText.height).toBeCloseTo(liveText.height, 5)
      expect(committedText.fontSize).toBeCloseTo(liveText.fontSize, 5)
      expect(committedText.boundsLeft).toBeCloseTo(liveText.boundsLeft, 5)
      expect(committedText.boundsTop).toBeCloseTo(liveText.boundsTop, 5)

      if (!controlCase.changesHeight) {
        expect(committedText.fontSize).toBeCloseTo(initialText.fontSize, 5)
      }
    }
  })
}
