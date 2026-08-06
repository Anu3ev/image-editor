import { test, expect } from '../../../fixtures/editor.fixture'
import type { SnappingObjectSnapshot } from '../../../types'
import {
  FOUR_SHAPE_EQUAL_SPACING_TEMPLATE,
  FOUR_SHAPE_VERTICAL_EQUAL_SPACING_TEMPLATE,
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

/** Микросдвиги указателя для проверки удержания после последовательных перемещений. */
const SEQUENTIAL_DRAG_HOLD_SHIFTS = [-0.3, 0, 0.3] as const

/** Точные интервалы исходного шаблона, сохранённые после его применения. */
const FOUR_SHAPE_SPACING_GAPS = [47.25, 47.25, 47.25] as const

/** Первые перемещения разных шейпов в приложенном шаблоне. */
const FOUR_SHAPE_FIRST_DRAG_CASES = [
  {
    title: 'при первом перемещении первого шейпа показывает всю цепочку с подписью 47',
    objectIndex: FOUR_SHAPE_INDEXES.first,
    acquireOffset: -2.5,
    heldOffsets: [-2.9, -2.5, -2.1]
  },
  {
    title: 'при первом перемещении второго шейпа показывает всю цепочку с подписью 47',
    objectIndex: FOUR_SHAPE_INDEXES.second,
    acquireOffset: -3,
    heldOffsets: [-3.4, -3, -2.6]
  },
  {
    title: 'при первом перемещении третьего шейпа показывает всю цепочку с подписью 47',
    objectIndex: FOUR_SHAPE_INDEXES.moving,
    acquireOffset: -3,
    heldOffsets: HELD_SPACING_POINTER_OFFSETS
  },
  {
    title: 'при первом перемещении четвёртого шейпа показывает всю цепочку с подписью 47',
    objectIndex: FOUR_SHAPE_INDEXES.fourth,
    acquireOffset: -3,
    heldOffsets: [-3.4, -3, -2.6]
  }
] as const

/** Последовательности перемещений, в которых подпись цепочки не должна меняться. */
const FOUR_SHAPE_DRAG_SEQUENCES = [
  {
    title: 'после перемещения третьего и четвёртого шейпов повторное перемещение сохраняет подпись 47',
    actions: [
      { objectIndex: FOUR_SHAPE_INDEXES.moving, pointerOffset: -3 },
      { objectIndex: FOUR_SHAPE_INDEXES.fourth, pointerOffset: -3 },
      { objectIndex: FOUR_SHAPE_INDEXES.moving, pointerOffset: -3 }
    ]
  },
  {
    title: 'после перемещения первого, третьего и четвёртого шейпов сохраняется полная цепочка с подписью 47',
    actions: [
      { objectIndex: FOUR_SHAPE_INDEXES.first, pointerOffset: -2.5 },
      { objectIndex: FOUR_SHAPE_INDEXES.moving, pointerOffset: -3 },
      { objectIndex: FOUR_SHAPE_INDEXES.fourth, pointerOffset: -3 },
      { objectIndex: FOUR_SHAPE_INDEXES.first, pointerOffset: -2.5 }
    ]
  },
  {
    title: 'после перемещения четвёртого и третьего шейпов повторное перемещение сохраняет подпись 47',
    actions: [
      { objectIndex: FOUR_SHAPE_INDEXES.fourth, pointerOffset: -3 },
      { objectIndex: FOUR_SHAPE_INDEXES.moving, pointerOffset: -3 },
      { objectIndex: FOUR_SHAPE_INDEXES.fourth, pointerOffset: -3 }
    ]
  }
] as const

/** Точные границы четырёх шейпов исходного шаблона. */
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

    const [acquireOffset, ...heldOffsets] = scenario.rawOffsets
    const trace = await snapping.dragObjectBoundsWithHold({
      objectIndex: TEMPLATE_SHAPE_INDEXES.middle,
      left: expectedLeft + acquireOffset,
      top: middle.boundsTop,
      heldPositions: heldOffsets.map((rawOffset) => ({
        left: expectedLeft + rawOffset,
        top: middle.boundsTop
      }))
    })

    for (const { snapshot: snapped, guides } of [trace.acquired, ...trace.held]) {
      const leftGap = snapped.boundsLeft - left.boundsRight
      const rightGap = right.boundsLeft - snapped.boundsRight

      expect(snapped.boundsLeft).toBeCloseTo(expectedLeft, 5)
      expect(leftGap).toBeCloseTo(rightGap, 5)
      expect(guides.guides).toEqual([{
        type: 'horizontal',
        position: snapped.centerY
      }])
      expect(guides.spacingGuides).toEqual([{
        type: 'horizontal',
        axis: snapped.centerY,
        refStart: left.boundsRight,
        refEnd: snapped.boundsLeft,
        activeStart: snapped.boundsRight,
        activeEnd: right.boundsLeft,
        distance: Math.round(leftGap)
      }])
    }
  })
}

for (const scenario of FOUR_SHAPE_FIRST_DRAG_CASES) {
  test(scenario.title, async({ canvas, snapping, template }) => {
    await canvas.setMontageResolution(TEMPLATE_RESOLUTION)
    const insertedCount = await template.applyTemplate({ template: FOUR_SHAPE_EQUAL_SPACING_TEMPLATE })
    const first = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.first })
    const second = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.second })
    const third = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.moving })
    const fourth = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.fourth })
    const initialObjects = [first, second, third, fourth]
    const target = initialObjects[scenario.objectIndex]

    expect(insertedCount).toBe(4)
    expect([
      second.boundsLeft - first.boundsRight,
      third.boundsLeft - second.boundsRight,
      fourth.boundsLeft - third.boundsRight
    ]).toEqual(FOUR_SHAPE_SPACING_GAPS)

    const trace = await snapping.dragObjectBoundsWithHold({
      objectIndex: scenario.objectIndex,
      left: target.boundsLeft + scenario.acquireOffset,
      top: target.boundsTop,
      heldPositions: scenario.heldOffsets.map((pointerOffset) => ({
        left: target.boundsLeft + pointerOffset,
        top: target.boundsTop
      }))
    })
    const { snapshot: acquired, guides: acquiredGuides } = trace.acquired
    const liveObjects = [...initialObjects]
    liveObjects[scenario.objectIndex] = acquired
    const acquiredIntervalKeys = new Set<string>()
    for (const guide of acquiredGuides.spacingGuides) {
      acquiredIntervalKeys.add(`${guide.refStart}:${guide.refEnd}`)
      acquiredIntervalKeys.add(`${guide.activeStart}:${guide.activeEnd}`)
    }

    await test.step('показывает все интервалы с одной подписью и не меняет размеры шейпа', async() => {
      expect(acquiredGuides.spacingGuides).toHaveLength(2)
      expect(acquiredGuides.spacingGuides.every(({ distance }) => distance === 47)).toBe(true)
      expect([...acquiredIntervalKeys].sort()).toEqual([
        `${liveObjects[0].boundsRight}:${liveObjects[1].boundsLeft}`,
        `${liveObjects[1].boundsRight}:${liveObjects[2].boundsLeft}`,
        `${liveObjects[2].boundsRight}:${liveObjects[3].boundsLeft}`
      ].sort())
      expect(acquired.boundsLeft).toBeCloseTo(target.boundsLeft, 10)
      expect(acquired.boundsWidth).toBeCloseTo(target.boundsWidth, 10)
      expect(acquired.boundsHeight).toBeCloseTo(target.boundsHeight, 10)
      expect(acquired.width).toBeCloseTo(target.width, 10)
      expect(acquired.height).toBeCloseTo(target.height, 10)
      expect(acquired.scaleX).toBeCloseTo(target.scaleX, 10)
      expect(acquired.scaleY).toBeCloseTo(target.scaleY, 10)
    })

    await test.step('сохраняет положение и гайды во время удержания и после mouseup', async() => {
      for (const held of trace.held) {
        expect(held.snapshot.boundsLeft).toBeCloseTo(acquired.boundsLeft, 5)
        expect(held.snapshot.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
        expect(held.guides.spacingGuides).toEqual(acquiredGuides.spacingGuides)
      }

      expect(trace.committed.boundsLeft).toBeCloseTo(acquired.boundsLeft, 10)
      expect(trace.committed.boundsWidth).toBeCloseTo(acquired.boundsWidth, 10)
      expect(trace.committed.boundsHeight).toBeCloseTo(acquired.boundsHeight, 10)
      expect(trace.committed.width).toBeCloseTo(target.width, 10)
      expect(trace.committed.height).toBeCloseTo(target.height, 10)
      expect(trace.committed.scaleX).toBeCloseTo(acquired.scaleX, 10)
      expect(trace.committed.scaleY).toBeCloseTo(acquired.scaleY, 10)
    })
  })
}

for (const scenario of FOUR_SHAPE_DRAG_SEQUENCES) {
  test(scenario.title, async({ canvas, snapping, template }) => {
    await canvas.setMontageResolution(TEMPLATE_RESOLUTION)
    const insertedCount = await template.applyTemplate({ template: FOUR_SHAPE_EQUAL_SPACING_TEMPLATE })
    const objects: SnappingObjectSnapshot[] = []

    for (let objectIndex = 0; objectIndex < 4; objectIndex += 1) {
      objects.push(await snapping.getObjectSnapshot({ objectIndex }))
    }

    expect(insertedCount).toBe(4)
    expect(objects).toHaveLength(4)

    for (const [actionIndex, action] of scenario.actions.entries()) {
      await test.step(`перемещение ${actionIndex + 1}: шейп ${action.objectIndex + 1}`, async() => {
        const target = objects[action.objectIndex]
        const trace = await snapping.dragObjectBoundsWithHold({
          objectIndex: action.objectIndex,
          left: target.boundsLeft + action.pointerOffset,
          top: target.boundsTop,
          heldPositions: SEQUENTIAL_DRAG_HOLD_SHIFTS.map((holdShift) => ({
            left: target.boundsLeft + action.pointerOffset + holdShift,
            top: target.boundsTop
          }))
        })
        const { snapshot: live, guides: guideState } = trace.acquired
        const liveObjects = [...objects]
        const intervalKeys = new Set<string>()
        liveObjects[action.objectIndex] = live

        for (const guide of guideState.spacingGuides) {
          intervalKeys.add(`${guide.refStart}:${guide.refEnd}`)
          intervalKeys.add(`${guide.activeStart}:${guide.activeEnd}`)
        }

        expect(guideState.spacingGuides).toHaveLength(2)
        expect(guideState.spacingGuides.every(({ distance }) => distance === 47)).toBe(true)
        expect([...intervalKeys].sort()).toEqual([
          `${liveObjects[0].boundsRight}:${liveObjects[1].boundsLeft}`,
          `${liveObjects[1].boundsRight}:${liveObjects[2].boundsLeft}`,
          `${liveObjects[2].boundsRight}:${liveObjects[3].boundsLeft}`
        ].sort())
        expect(live.boundsLeft).toBeCloseTo(target.boundsLeft, 10)
        expect(live.boundsWidth).toBeCloseTo(target.boundsWidth, 10)
        expect(live.boundsHeight).toBeCloseTo(target.boundsHeight, 10)
        expect(live.width).toBeCloseTo(target.width, 10)
        expect(live.height).toBeCloseTo(target.height, 10)

        expect(trace.held).toHaveLength(SEQUENTIAL_DRAG_HOLD_SHIFTS.length)
        for (const held of trace.held) {
          expect(held.snapshot.boundsLeft).toBeCloseTo(live.boundsLeft, 5)
          expect(held.snapshot.boundsRight).toBeCloseTo(live.boundsRight, 5)
          expect(held.guides.spacingGuides).toEqual(guideState.spacingGuides)
        }

        expect(trace.committed.boundsLeft).toBeCloseTo(live.boundsLeft, 10)
        expect(trace.committed.boundsWidth).toBeCloseTo(target.boundsWidth, 10)
        expect(trace.committed.boundsHeight).toBeCloseTo(target.boundsHeight, 10)
        expect(trace.committed.width).toBeCloseTo(target.width, 10)
        expect(trace.committed.height).toBeCloseTo(target.height, 10)
        expect(trace.committed.scaleX).toBeCloseTo(target.scaleX, 10)
        expect(trace.committed.scaleY).toBeCloseTo(target.scaleY, 10)

        objects[action.objectIndex] = trace.committed
        expect([
          objects[1].boundsLeft - objects[0].boundsRight,
          objects[2].boundsLeft - objects[1].boundsRight,
          objects[3].boundsLeft - objects[2].boundsRight
        ]).toEqual(FOUR_SHAPE_SPACING_GAPS)
      })
    }
  })
}

test('после перемещения третьего шейпа Alt показывает те же 47 пикселей до четвёртого', async({
  canvas,
  measurement,
  snapping,
  template
}) => {
  await canvas.setMontageResolution(TEMPLATE_RESOLUTION)
  await template.applyTemplate({ template: FOUR_SHAPE_EQUAL_SPACING_TEMPLATE })
  const moved = await test.step('перемещает третий шейп с удержанием', async() => {
    const initialThird = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.moving })
    const thirdTrace = await snapping.dragObjectBoundsWithHold({
      objectIndex: FOUR_SHAPE_INDEXES.moving,
      left: initialThird.boundsLeft - 3,
      top: initialThird.boundsTop,
      heldPositions: SEQUENTIAL_DRAG_HOLD_SHIFTS.map((holdShift) => ({
        left: initialThird.boundsLeft - 3 + holdShift,
        top: initialThird.boundsTop
      }))
    })

    expect(thirdTrace.acquired.guides.spacingGuides).toHaveLength(2)
    expect(thirdTrace.held.every(({ guides }) => guides.spacingGuides.length === 2)).toBe(true)

    return {
      third: await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.moving }),
      fourth: await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.fourth }),
      spacingGuides: thirdTrace.acquired.guides.spacingGuides
    }
  })

  await test.step('сравнивает подпись прилипания с расстоянием по Alt', async() => {
    const measurementState = await measurement.showDistanceBetweenObjects({
      active: { objectIndex: FOUR_SHAPE_INDEXES.moving },
      target: { objectIndex: FOUR_SHAPE_INDEXES.fourth }
    })
    const [measurementGuide] = measurementState.guides
    if (!measurementGuide) {
      throw new Error('Между третьим и четвёртым шейпами должна быть направляющая расстояния')
    }

    expect(measurementState.isTargetMontageArea).toBe(false)
    expect(measurementState.guides).toHaveLength(1)
    expect(measurementGuide).toEqual({
      type: 'horizontal',
      axis: (Math.max(moved.third.boundsTop, moved.fourth.boundsTop)
        + Math.min(moved.third.boundsBottom, moved.fourth.boundsBottom)) / 2,
      start: moved.third.boundsRight,
      end: moved.fourth.boundsLeft,
      distance: FOUR_SHAPE_SPACING_GAPS[2],
      displayDistance: 47
    })
    expect(moved.spacingGuides.every(({ distance }) => distance === measurementGuide.displayDistance)).toBe(true)
  })
})

test('в вертикальной цепочке удерживает три равных интервала и показывает те же 47 пикселей по Alt', async({
  canvas,
  measurement,
  snapping,
  template
}) => {
  await canvas.setMontageResolution(TEMPLATE_RESOLUTION)
  await template.applyTemplate({ template: FOUR_SHAPE_VERTICAL_EQUAL_SPACING_TEMPLATE })
  const moved = await test.step('перемещает третий шейп по вертикали и проверяет удержание', async() => {
    const initialThird = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.moving })
    const fourth = await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.fourth })
    const trace = await snapping.dragObjectBoundsWithHold({
      objectIndex: FOUR_SHAPE_INDEXES.moving,
      left: initialThird.boundsLeft,
      top: initialThird.boundsTop - 3,
      heldPositions: SEQUENTIAL_DRAG_HOLD_SHIFTS.map((holdShift) => ({
        left: initialThird.boundsLeft,
        top: initialThird.boundsTop - 3 + holdShift
      }))
    })

    expect(trace.acquired.guides.spacingGuides).toHaveLength(2)
    expect(trace.acquired.guides.spacingGuides.every(({ type, distance }) => {
      return type === 'vertical' && distance === 47
    })).toBe(true)
    for (const held of trace.held) {
      expect(held.snapshot.boundsTop).toBeCloseTo(trace.acquired.snapshot.boundsTop, 5)
      expect(held.guides.spacingGuides).toEqual(trace.acquired.guides.spacingGuides)
    }

    return {
      third: await snapping.getObjectSnapshot({ objectIndex: FOUR_SHAPE_INDEXES.moving }),
      fourth,
      spacingGuides: trace.acquired.guides.spacingGuides
    }
  })

  await test.step('сравнивает вертикальную подпись прилипания с расстоянием по Alt', async() => {
    const measurementState = await measurement.showDistanceBetweenObjects({
      active: { objectIndex: FOUR_SHAPE_INDEXES.moving },
      target: { objectIndex: FOUR_SHAPE_INDEXES.fourth }
    })
    const [measurementGuide] = measurementState.guides
    if (!measurementGuide) {
      throw new Error('Между третьим и четвёртым шейпами должна быть вертикальная направляющая расстояния')
    }

    expect(measurementState.isTargetMontageArea).toBe(false)
    expect(measurementState.guides).toHaveLength(1)
    expect(measurementGuide).toEqual({
      type: 'vertical',
      axis: (Math.max(moved.third.boundsLeft, moved.fourth.boundsLeft)
        + Math.min(moved.third.boundsRight, moved.fourth.boundsRight)) / 2,
      start: moved.third.boundsBottom,
      end: moved.fourth.boundsTop,
      distance: FOUR_SHAPE_SPACING_GAPS[2],
      displayDistance: 47
    })
    expect(moved.spacingGuides.every(({ distance }) => distance === measurementGuide.displayDistance)).toBe(true)
  })
})

test('при прямом создании шейпов с дробной геометрией удерживает все три одинаковых интервала', async({
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

  const trace = await snapping.dragObjectBoundsWithHold({
    id: movingId,
    left: moving.boundsLeft - 3,
    top: moving.boundsTop,
    heldPositions: HELD_SPACING_POINTER_OFFSETS.map((pointerOffset) => ({
      left: moving.boundsLeft + pointerOffset,
      top: moving.boundsTop
    }))
  })
  const { snapshot: acquired, guides: acquiredGuides } = trace.acquired
  const referenceGap = second.boundsLeft - first.boundsRight

  expect(acquiredGuides.spacingGuides).toHaveLength(2)
  expect(acquiredGuides.spacingGuides.every(({ distance }) => distance === 47)).toBe(true)
  expect(acquired.boundsLeft - second.boundsRight).toBeCloseTo(referenceGap, 5)
  expect(fourth.boundsLeft - acquired.boundsRight).toBeCloseTo(referenceGap, 5)
  expect(acquiredGuides.spacingGuides.some(({ activeStart, activeEnd }) => {
    return Math.abs(activeStart - acquired.boundsRight) < 1e-5 && activeEnd > activeStart
  })).toBe(true)

  for (const held of trace.held) {
    expect(held.snapshot.boundsLeft).toBeCloseTo(acquired.boundsLeft, 5)
    expect(held.snapshot.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
    expect(held.guides.spacingGuides).toEqual(acquiredGuides.spacingGuides)
  }
})
