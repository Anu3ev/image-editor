import { test, expect } from '../../../fixtures/editor.fixture'
import {
  FOUR_SHAPE_EQUAL_SPACING_TEMPLATE,
  MIDDLE_SHAPE_79_SPACING_TEMPLATE,
  MIDDLE_SHAPE_85_SPACING_TEMPLATE
} from '../../../fixtures/data/shape-moving-spacing-template.data'

/** Количество шейпов в шаблоне из пользовательского сценария. */
const TEMPLATE_SHAPE_COUNT = 3

/** Размер монтажной области, для которого сохранены приложенные шаблоны. */
const TEMPLATE_RESOLUTION = { width: 512, height: 512 } as const

/** Индексы шейпов в порядке их вставки из приложенного шаблона. */
const TEMPLATE_SHAPE_INDEXES = {
  left: 0,
  middle: 1,
  right: 2
} as const

/** Индексы шейпов из шаблона с тремя равными интервалами. */
const FOUR_SHAPE_INDEXES = {
  first: 0,
  second: 1,
  moving: 2,
  fourth: 3
} as const

/** Смещения указателя, которые остаются внутри одного удержания равноудалённости. */
const HELD_SPACING_POINTER_OFFSETS = [-2.9, -2.5, -2.3] as const

/** Точные границы четырёх шейпов до привязки шаблона к пиксельной сетке. */
const FOUR_SHAPE_TEMPLATE_GEOMETRY = [
  { id: 'fractional-shape-1', left: -29.875, top: 229, width: 102, height: 102 },
  { id: 'fractional-shape-2', left: 119.375, top: 236.375, width: 87.25, height: 87.25 },
  { id: 'fractional-shape-3', left: 253.875, top: 230.375, width: 100.625, height: 100.625 },
  { id: 'fractional-shape-4', left: 401.75, top: 229, width: 102, height: 102 }
] as const

/** Пользовательские шаблоны и положения указателя внутри зоны прилипания. */
const TEMPLATE_SPACING_CASES = [
  {
    title: 'средний шейп размером 79 × 79 удерживается на одинаковом расстоянии от соседних шейпов',
    template: MIDDLE_SHAPE_79_SPACING_TEMPLATE,
    rawOffsets: [3.2, 3.6, 4.1]
  },
  {
    title: 'средний шейп размером 85 × 85 удерживается на одинаковом расстоянии от соседних шейпов',
    template: MIDDLE_SHAPE_85_SPACING_TEMPLATE,
    rawOffsets: [3.2, 3.6, 4.1]
  }
] as const

for (const scenario of TEMPLATE_SPACING_CASES) {
  test(scenario.title, async({ canvas, snapping, template }) => {
    await canvas.setMontageResolution(TEMPLATE_RESOLUTION)
    const insertedCount = await template.applyTemplate({ template: scenario.template })
    const left = await snapping.getObjectSnapshot({ objectIndex: TEMPLATE_SHAPE_INDEXES.left })
    const middle = await snapping.getObjectSnapshot({ objectIndex: TEMPLATE_SHAPE_INDEXES.middle })
    const right = await snapping.getObjectSnapshot({ objectIndex: TEMPLATE_SHAPE_INDEXES.right })
    const expectedLeft = left.boundsRight
      + ((right.boundsLeft - left.boundsRight - middle.boundsWidth) / 2)

    expect(insertedCount).toBe(TEMPLATE_SHAPE_COUNT)
    expect(middle.boundsWidth).toBeLessThan(left.boundsWidth)
    expect(middle.boundsWidth).toBeLessThan(right.boundsWidth)

    await snapping.startObjectDrag({ objectIndex: TEMPLATE_SHAPE_INDEXES.middle })

    for (const rawOffset of scenario.rawOffsets) {
      const snapped = await snapping.dragObjectBoundsTo({
        objectIndex: TEMPLATE_SHAPE_INDEXES.middle,
        left: expectedLeft + rawOffset,
        top: middle.boundsTop
      })
      const guideState = await snapping.getGuideState()
      const leftGap = snapped.boundsLeft - left.boundsRight
      const rightGap = right.boundsLeft - snapped.boundsRight

      expect(snapped.boundsLeft).toBeCloseTo(expectedLeft, 5)
      expect(leftGap).toBeCloseTo(rightGap, 5)
      expect(guideState.guides).toEqual([{
        type: 'horizontal',
        position: snapped.centerY
      }])
      expect(guideState.spacingGuides).toEqual([{
        type: 'horizontal',
        axis: snapped.centerY,
        refStart: left.boundsRight,
        refEnd: snapped.boundsLeft,
        activeStart: snapped.boundsRight,
        activeEnd: right.boundsLeft,
        distance: Math.round(leftGap)
      }])
    }

    await snapping.finishPointerInteraction()
  })
}

test('при микродвижениях не меняет набор интервалов в шаблоне с четырьмя шейпами', async({
  canvas,
  snapping,
  template
}) => {
  await canvas.setMontageResolution(TEMPLATE_RESOLUTION)
  const insertedCount = await template.applyTemplate({ template: FOUR_SHAPE_EQUAL_SPACING_TEMPLATE })
  const first = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.first })
  const second = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.second })
  const moving = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.moving })

  expect(insertedCount).toBe(4)
  expect(moving.boundsWidth).toBeGreaterThan(0)

  await snapping.startObjectDrag({ objectIndex: FOUR_SHAPE_INDEXES.moving })
  const acquired = await snapping.dragObjectBoundsTo({
    objectIndex: FOUR_SHAPE_INDEXES.moving,
    left: moving.boundsLeft - 3,
    top: moving.boundsTop
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquiredGuides.spacingGuides).toEqual([{
    type: 'horizontal',
    axis: acquired.centerY,
    refStart: first.boundsRight,
    refEnd: second.boundsLeft,
    activeStart: second.boundsRight,
    activeEnd: acquired.boundsLeft,
    distance: Math.round(second.boundsLeft - first.boundsRight)
  }])

  for (const pointerOffset of HELD_SPACING_POINTER_OFFSETS) {
    const held = await snapping.dragObjectBoundsTo({
      objectIndex: FOUR_SHAPE_INDEXES.moving,
      left: moving.boundsLeft + pointerOffset,
      top: moving.boundsTop
    })
    const heldGuides = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(acquired.boundsLeft, 5)
    expect(held.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
    expect(heldGuides.spacingGuides).toEqual(acquiredGuides.spacingGuides)
  }

  await snapping.finishPointerInteraction()
})

test('при дробной геометрии из шаблона удерживает все три одинаковых интервала', async({
  editorModel,
  shapes,
  snapping
}) => {
  const montage = await editorModel.getMontageAreaBounds()

  for (const geometry of FOUR_SHAPE_TEMPLATE_GEOMETRY) {
    const shape = await shapes.addAtBounds({
      presetKey: 'square',
      options: {
        ...geometry,
        left: montage.left + geometry.left,
        top: montage.top + geometry.top,
        text: ''
      }
    })

    expect(shape).not.toBeNull()
  }

  const firstId = FOUR_SHAPE_TEMPLATE_GEOMETRY[FOUR_SHAPE_INDEXES.first].id
  const secondId = FOUR_SHAPE_TEMPLATE_GEOMETRY[FOUR_SHAPE_INDEXES.second].id
  const movingId = FOUR_SHAPE_TEMPLATE_GEOMETRY[FOUR_SHAPE_INDEXES.moving].id
  const fourthId = FOUR_SHAPE_TEMPLATE_GEOMETRY[FOUR_SHAPE_INDEXES.fourth].id
  const first = await snapping.getObjectSnapshot({ id: firstId })
  const second = await snapping.getObjectSnapshot({ id: secondId })
  const moving = await snapping.getObjectSnapshot({ id: movingId })
  const fourth = await snapping.getObjectSnapshot({ id: fourthId })

  await snapping.startObjectDrag({ id: movingId })
  const acquired = await snapping.dragObjectBoundsTo({
    id: movingId,
    left: moving.boundsLeft - 3,
    top: moving.boundsTop
  })
  const acquiredGuides = await snapping.getGuideState()
  const referenceGap = second.boundsLeft - first.boundsRight

  expect(acquiredGuides.spacingGuides).toHaveLength(2)
  expect(acquiredGuides.spacingGuides.every(({ distance }) => distance === 47)).toBe(true)
  expect(acquired.boundsLeft - second.boundsRight).toBeCloseTo(referenceGap, 5)
  expect(fourth.boundsLeft - acquired.boundsRight).toBeCloseTo(referenceGap, 5)
  expect(acquiredGuides.spacingGuides.some(({ activeStart, activeEnd }) => {
    return Math.abs(activeStart - acquired.boundsRight) < 1e-5 && activeEnd > activeStart
  })).toBe(true)

  for (const pointerOffset of HELD_SPACING_POINTER_OFFSETS) {
    const held = await snapping.dragObjectBoundsTo({
      id: movingId,
      left: moving.boundsLeft + pointerOffset,
      top: moving.boundsTop
    })
    const heldGuides = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(acquired.boundsLeft, 5)
    expect(held.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
    expect(heldGuides.spacingGuides).toEqual(acquiredGuides.spacingGuides)
  }

  await snapping.finishPointerInteraction()
})
