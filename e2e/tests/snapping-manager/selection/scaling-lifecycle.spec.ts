import { test, expect } from '../../../fixtures/editor.fixture'
import type { ShapeScaleSnapshot, SnappingObjectSnapshot } from '../../../types'

/** Допуск дрейфа неподвижного угла из-за округления координат указателя браузером. */
const ACTIVE_SELECTION_ANCHOR_TOLERANCE = 0.1

/** Точность сравнения live-геометрии до сериализации в истории. */
const LIVE_GEOMETRY_PRECISION = 8

/** Точность сравнения геометрии после сериализации в истории. */
const HISTORY_GEOMETRY_PRECISION = 3

/** Идентификаторы шейпов, входящих в общее выделение. */
const SELECTION_SHAPE_IDS = ['left-shape', 'right-shape'] as const

/** Поля шейпа, которые должны восстанавливаться через undo/redo. */
const HISTORY_SHAPE_FIELDS = [
  'width',
  'height',
  'scaleX',
  'scaleY',
  'groupBoundsLeft',
  'groupBoundsTop',
  'groupBoundsWidth',
  'groupBoundsHeight'
] as const

/** Состояния двух шейпов в порядке их расположения на canvas. */
type SelectionChildren = readonly [ShapeScaleSnapshot, ShapeScaleSnapshot]

/** Геометрия общего выделения до движения угловой ручки. */
let baselineSelection: SnappingObjectSnapshot

/** Геометрия обоих шейпов до движения угловой ручки. */
let baselineChildren: SelectionChildren

test.beforeEach(async({
  editorModel,
  selection,
  shapes
}) => {
  const montage = await editorModel.getMontageAreaBounds()
  const leftShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: SELECTION_SHAPE_IDS[0],
      left: montage.left + 90,
      top: montage.top + 120,
      width: 80,
      height: 60,
      text: ''
    }
  })
  const rightShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: SELECTION_SHAPE_IDS[1],
      left: montage.left + 250,
      top: montage.top + 210,
      width: 100,
      height: 70,
      text: ''
    }
  })

  shapes.checkCreation({ shape: leftShape, presetKey: 'square' })
  shapes.checkCreation({ shape: rightShape, presetKey: 'square' })
  await editorModel.selectAllObjects()

  baselineSelection = await selection.getSnapshot()
  baselineChildren = await Promise.all([
    shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[0] }),
    shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[1] })
  ])
})

test.describe('Изменение размера двух выделенных фигур', () => {
  test('во время скейлинга увеличивает выделение и оба шейпа без сдвига левого верхнего угла', async({
    selection,
    shapes
  }) => {
    const started = await selection.startScaleFromControl({ control: 'br' })
    const liveSelection = await selection.dragActiveScaleHandleBy({
      deltaX: 30,
      deltaY: 20
    })
    const liveChildren = await Promise.all([
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[0] }),
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[1] })
    ])

    expect(started).toEqual(baselineSelection)
    expect(Math.abs(liveSelection.boundsLeft - baselineSelection.boundsLeft))
      .toBeLessThanOrEqual(ACTIVE_SELECTION_ANCHOR_TOLERANCE)
    expect(Math.abs(liveSelection.boundsTop - baselineSelection.boundsTop))
      .toBeLessThanOrEqual(ACTIVE_SELECTION_ANCHOR_TOLERANCE)
    expect(liveSelection.boundsWidth).toBeGreaterThan(baselineSelection.boundsWidth)
    expect(liveSelection.boundsHeight).toBeGreaterThan(baselineSelection.boundsHeight)
    expect(liveSelection.width).toBe(baselineSelection.width)
    expect(liveSelection.height).toBe(baselineSelection.height)
    expect(liveSelection.scaleX).toBeGreaterThan(1)
    expect(liveSelection.scaleY).toBeCloseTo(liveSelection.scaleX, 10)

    for (const [index, liveChild] of liveChildren.entries()) {
      const baselineChild = baselineChildren[index]
      if (!baselineChild) throw new Error('Baseline должен содержать оба выделенных шейпа')

      expect(liveChild.width).toBeCloseTo(baselineChild.width, 10)
      expect(liveChild.height).toBeCloseTo(baselineChild.height, 10)
      expect(liveChild.scaleX).toBeCloseTo(baselineChild.scaleX, 10)
      expect(liveChild.scaleY).toBeCloseTo(baselineChild.scaleY, 10)
      expect(liveChild.groupBoundsWidth).toBeGreaterThan(baselineChild.groupBoundsWidth)
      expect(liveChild.groupBoundsHeight).toBeGreaterThan(baselineChild.groupBoundsHeight)
    }

    await selection.finishScale()
  })

  test('после mouseup сохраняет видимый размер в шейпах без скачка геометрии', async({
    selection,
    shapes
  }) => {
    await selection.startScaleFromControl({ control: 'br' })
    const liveSelection = await selection.dragActiveScaleHandleBy({
      deltaX: 30,
      deltaY: 20
    })
    const liveChildren = await Promise.all([
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[0] }),
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[1] })
    ])
    const committedSelection = await selection.finishScale()
    const committedChildren = await Promise.all([
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[0] }),
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[1] })
    ])

    expect(committedSelection.boundsLeft).toBeCloseTo(liveSelection.boundsLeft, LIVE_GEOMETRY_PRECISION)
    expect(committedSelection.boundsTop).toBeCloseTo(liveSelection.boundsTop, LIVE_GEOMETRY_PRECISION)
    expect(committedSelection.boundsWidth).toBeCloseTo(liveSelection.boundsWidth, LIVE_GEOMETRY_PRECISION)
    expect(committedSelection.boundsHeight).toBeCloseTo(liveSelection.boundsHeight, LIVE_GEOMETRY_PRECISION)
    expect(committedSelection.scaleX).toBe(1)
    expect(committedSelection.scaleY).toBe(1)

    for (const [index, committedChild] of committedChildren.entries()) {
      const baselineChild = baselineChildren[index]
      const liveChild = liveChildren[index]
      if (!baselineChild || !liveChild) {
        throw new Error('Scale-сценарий должен содержать оба выделенных шейпа')
      }

      expect(committedChild.width)
        .toBeCloseTo(baselineChild.width * liveSelection.scaleX, LIVE_GEOMETRY_PRECISION)
      expect(committedChild.height)
        .toBeCloseTo(baselineChild.height * liveSelection.scaleY, LIVE_GEOMETRY_PRECISION)
      expect(committedChild.scaleX).toBe(1)
      expect(committedChild.scaleY).toBe(1)
      expect(committedChild.groupBoundsLeft)
        .toBeCloseTo(liveChild.groupBoundsLeft, LIVE_GEOMETRY_PRECISION)
      expect(committedChild.groupBoundsTop)
        .toBeCloseTo(liveChild.groupBoundsTop, LIVE_GEOMETRY_PRECISION)
      expect(committedChild.groupBoundsWidth)
        .toBeCloseTo(liveChild.groupBoundsWidth, LIVE_GEOMETRY_PRECISION)
      expect(committedChild.groupBoundsHeight)
        .toBeCloseTo(liveChild.groupBoundsHeight, LIVE_GEOMETRY_PRECISION)
    }
  })

  test('показывает размер во время скейлинга и скрывает индикатор и гайды после mouseup', async({
    editorModel,
    selection,
    snapping
  }) => {
    await selection.startScaleFromControl({ control: 'br' })
    const liveSelection = await selection.dragActiveScaleHandleBy({
      deltaX: 30,
      deltaY: 20
    })
    const liveIndicator = await editorModel.requireObjectSizeIndicator()
    const liveGuides = await snapping.getGuideState()

    await selection.finishScale()

    const finalIndicator = await editorModel.getObjectSizeIndicator()
    const finalGuides = await snapping.getGuideState()

    expect(liveIndicator.visible).toBe(true)
    expect(liveIndicator.width).toBe(Math.round(liveSelection.boundsWidth))
    expect(liveIndicator.height).toBe(Math.round(liveSelection.boundsHeight))
    expect(liveGuides).toEqual({ guides: [], spacingGuides: [] })
    expect(finalIndicator.visible).toBe(false)
    expect(finalIndicator.width).toBeNull()
    expect(finalIndicator.height).toBeNull()
    expect(finalGuides).toEqual({ guides: [], spacingGuides: [] })
  })

  test('сохраняет весь жест одной записью и восстанавливает оба шейпа через undo/redo', async({
    history,
    selection,
    shapes
  }) => {
    await history.flushPendingSave()
    const baselinePosition = await history.getPosition()

    await selection.startScaleFromControl({ control: 'br' })
    await selection.dragActiveScaleHandleBy({
      deltaX: 30,
      deltaY: 20
    })
    await selection.finishScale()

    const committedChildren = await Promise.all([
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[0] }),
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[1] })
    ])
    const flushed = await history.flushPendingSave()
    const committedPosition = await history.getPosition()

    expect(flushed).toBe(true)
    expect(committedPosition.patchCount).toBe(baselinePosition.patchCount + 1)
    expect(committedPosition.currentIndex).toBe(baselinePosition.currentIndex + 1)

    await history.undo()
    const undoneChildren = await Promise.all([
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[0] }),
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[1] })
    ])
    await history.redo()
    const redoneChildren = await Promise.all([
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[0] }),
      shapes.getScaleSnapshot({ id: SELECTION_SHAPE_IDS[1] })
    ])

    for (const [index, baselineChild] of baselineChildren.entries()) {
      const committedChild = committedChildren[index]
      const undoneChild = undoneChildren[index]
      const redoneChild = redoneChildren[index]
      if (!committedChild || !undoneChild || !redoneChild) {
        throw new Error('History должна сохранить оба выделенных шейпа')
      }

      for (const field of HISTORY_SHAPE_FIELDS) {
        expect(undoneChild[field], `undo должен восстановить поле ${field}`)
          .toBeCloseTo(baselineChild[field], HISTORY_GEOMETRY_PRECISION)
        expect(redoneChild[field], `redo должен восстановить поле ${field}`)
          .toBeCloseTo(committedChild[field], HISTORY_GEOMETRY_PRECISION)
      }
    }
  })
})
