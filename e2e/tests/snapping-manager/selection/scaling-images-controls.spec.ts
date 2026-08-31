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

/** Числовые свойства изображений, которые не меняются при скейлинге общего выделения. */
const IMAGE_LOCAL_NUMERIC_FIELDS = [
  'left',
  'top',
  'width',
  'height',
  'scaleX',
  'scaleY',
  'angle',
  'cropX',
  'cropY',
  'skewX',
  'skewY'
] as const

/** Логические свойства изображений, которые не меняются при скейлинге общего выделения. */
const IMAGE_LOCAL_BOOLEAN_FIELDS = [
  'flipX',
  'flipY'
] as const

/** Точки отсчёта изображений, которые не меняются при скейлинге общего выделения. */
const IMAGE_LOCAL_ORIGIN_FIELDS = [
  'originX',
  'originY'
] as const

/** Одна ожидаемая направляющая после скейлинга общего выделения. */
type ExpectedScaleGuide = {
  position: number
  type: 'horizontal' | 'vertical'
}

for (const controlCase of ACTIVE_SELECTION_SCALE_CONTROL_CASES) {
  test(`${controlCase.title} прилипает подвижными гранями и сохраняет неподвижные`, async({
    activeSelectionImageScaleSetup: setup,
    selection,
    snapping
  }) => {
    const { initial, guides, targetMultiplier } = setup
    const point = {
      x: initial.selection.centerX,
      y: initial.selection.centerY
    }
    const expectedGuides: ExpectedScaleGuide[] = []

    if (controlCase.horizontalGuide) {
      point.x = guides[controlCase.horizontalGuide]
      expectedGuides.push({ type: 'vertical', position: point.x })
    }
    if (controlCase.verticalGuide) {
      point.y = guides[controlCase.verticalGuide]
      expectedGuides.push({ type: 'horizontal', position: point.y })
    }

    await selection.scaling.startFromControl({ control: controlCase.control })
    await selection.scaling.dragControlToScenePoint({ point })

    const live = await selection.getCompositionSnapshot()
    const guideState = await snapping.getGuideState()

    if (controlCase.horizontalGuide) {
      const field = ACTIVE_SELECTION_BOUNDS_FIELDS[controlCase.horizontalGuide]

      expect(live.selection[field]).toBeCloseTo(point.x, 5)
      expect(live.selection.scaleX).toBeCloseTo(targetMultiplier, 5)
    } else {
      expect(live.selection.scaleX).toBeCloseTo(1, 5)
    }
    if (controlCase.verticalGuide) {
      const field = ACTIVE_SELECTION_BOUNDS_FIELDS[controlCase.verticalGuide]

      expect(live.selection[field]).toBeCloseTo(point.y, 5)
      expect(live.selection.scaleY).toBeCloseTo(targetMultiplier, 5)
    } else {
      expect(live.selection.scaleY).toBeCloseTo(1, 5)
    }
    for (const fixedEdge of controlCase.fixedEdges) {
      const field = ACTIVE_SELECTION_BOUNDS_FIELDS[fixedEdge]

      expect(live.selection[field]).toBeCloseTo(initial.selection[field], 5)
    }
    expect(guideState.guides).toEqual(expect.arrayContaining(expectedGuides))
    expect(guideState.guides).toHaveLength(expectedGuides.length)
    expect(guideState.spacingGuides).toHaveLength(0)

    const committed = await selection.scaling.finish()

    expect(committed).toEqual(live.selection)
  })
}

test('при скейлинге общего выделения сохраняет локальную геометрию изображений во время движения ручки и после mouseup', async({
  activeSelectionImageScaleSetup: setup,
  selection
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })

  const live = await selection.getCompositionSnapshot()
  const committedSelection = await selection.scaling.finish()
  const committed = await selection.getCompositionSnapshot()

  expect(committedSelection).toEqual(live.selection)
  expect(committed.selection).toEqual(live.selection)

  for (const [index, liveChild] of live.children.entries()) {
    const initialChild = setup.initial.children[index]
    const committedChild = committed.children[index]
    if (!initialChild || !committedChild) {
      throw new Error('Снимки выделения должны содержать оба изображения')
    }

    expect(liveChild.id).toBe(initialChild.id)
    expect(committedChild.id).toBe(liveChild.id)
    for (const field of IMAGE_LOCAL_NUMERIC_FIELDS) {
      expect(liveChild[field], `${liveChild.id}: локальное поле ${field} не должно меняться`)
        .toBeCloseTo(initialChild[field], 10)
      expect(committedChild[field], `${liveChild.id}: локальное поле ${field} не должно меняться после mouseup`)
        .toBeCloseTo(liveChild[field], 10)
    }
    for (const field of IMAGE_LOCAL_BOOLEAN_FIELDS) {
      expect(liveChild[field]).toBe(initialChild[field])
      expect(committedChild[field]).toBe(liveChild[field])
    }
    for (const field of IMAGE_LOCAL_ORIGIN_FIELDS) {
      expect(liveChild[field]).toBe(initialChild[field])
      expect(committedChild[field]).toBe(liveChild[field])
    }
  }
})
