import { test, expect } from '../../../fixtures/editor.fixture'

test.describe('Прилипание при скейлинге повёрнутого шейпа', () => {
  test('при микродвижении за правый верхний угол удерживает две направляющие без изменения размера', async({
    shapes,
    snapping
  }) => {
    const activeId = 'rotated-shape-on-guides'
    const referenceId = 'rotated-shape-guide-source'
    const activeShape = await shapes.addAtBounds({
      presetKey: 'square',
      options: {
        id: activeId,
        left: 220,
        top: 180,
        width: 180,
        height: 120,
        text: ''
      }
    })
    shapes.checkCreation({ shape: activeShape, presetKey: 'square' })
    await shapes.setAngle({ id: activeId, angle: 30 })
    const initial = await shapes.getScaleSnapshot({ id: activeId })

    const referenceShape = await shapes.addAtBounds({
      presetKey: 'square',
      options: {
        id: referenceId,
        left: initial.groupBoundsRight,
        top: initial.groupBoundsTop,
        width: 40,
        height: 40,
        text: ''
      }
    })
    shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })
    const reference = await shapes.getScaleSnapshot({ id: referenceId })

    expect(reference.groupBoundsLeft).toBeCloseTo(initial.groupBoundsRight, 5)
    expect(reference.groupBoundsTop).toBeCloseTo(initial.groupBoundsTop, 5)

    await shapes.startScaleFromCorner({ id: activeId, corner: 'tr' })
    const live = await shapes.dragActiveScaleHandleBy({ deltaX: -1, deltaY: 1 })
    const guideState = await snapping.getGuideState()

    expect(live.groupBoundsRight).toBeCloseTo(initial.groupBoundsRight, 2)
    expect(live.groupBoundsTop).toBeCloseTo(initial.groupBoundsTop, 2)
    expect(live.groupBoundsWidth).toBeCloseTo(initial.groupBoundsWidth, 2)
    expect(live.groupBoundsHeight).toBeCloseTo(initial.groupBoundsHeight, 2)
    expect(guideState.guides).toEqual(expect.arrayContaining([
      { type: 'vertical', position: reference.groupBoundsLeft },
      { type: 'horizontal', position: reference.groupBoundsTop }
    ]))

    const final = await shapes.finishScale({ id: activeId })

    expect(final.groupBoundsWidth).toBeCloseTo(live.groupBoundsWidth, 5)
    expect(final.groupBoundsHeight).toBeCloseTo(live.groupBoundsHeight, 5)
    expect((await snapping.getGuideState()).guides).toHaveLength(0)
  })
})
