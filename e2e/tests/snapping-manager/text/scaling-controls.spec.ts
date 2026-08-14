import { test, expect } from '../../../fixtures/editor.fixture'
import {
  TEXT_CORNER_SCALE_CONTROL_CASES,
  TEXT_CORNER_SCALE_GUIDE_TOLERANCE,
  TEXT_CORNER_SCALE_GROWING_FIELDS,
  TEXT_CORNER_SCALE_TARGET_MULTIPLIER
} from '../../../fixtures/data/text-resizing.data'
import { createTextCornerScaleSetup } from '../../../fixtures/text-corner-scaling.fixture'

for (const controlCase of TEXT_CORNER_SCALE_CONTROL_CASES) {
  test(controlCase.title, async({ editorModel, shapes, snapping, text }) => {
    const setup = await createTextCornerScaleSetup({
      corner: controlCase.corner,
      editorModel,
      shapes,
      snapping,
      text
    })

    const live = await test.step('Подвести угловую ручку к двум направляющим', async() => {
      await text.scaling.start({ corner: controlCase.corner, id: setup.textId })
      const expanded = await text.scaling.continueBy({
        ...controlCase.outwardStep,
        ctrlKey: true
      })

      for (const field of TEXT_CORNER_SCALE_GROWING_FIELDS) {
        expect(expanded[field]).toBeGreaterThan(setup.initial[field])
      }
      expect((await snapping.getGuideState()).guides).toHaveLength(0)

      return text.scaling.dragToScale({
        scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER
      })
    })

    await test.step('Проверить геометрию текста и направляющие во время скейлинга', async() => {
      const guideState = await snapping.getGuideState()
      expect(Math.abs(live[controlCase.movingEdgeX] - setup.snapPoint.x))
        .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
      expect(Math.abs(live[controlCase.movingEdgeY] - setup.snapPoint.y))
        .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        { type: 'vertical', position: setup.snapPoint.x },
        { type: 'horizontal', position: setup.snapPoint.y }
      ]))
      expect(guideState.guides).toHaveLength(2)
      expect(live[controlCase.fixedPoint.x]).toBeCloseTo(setup.initial[controlCase.fixedPoint.x], 5)
      expect(live[controlCase.fixedPoint.y]).toBeCloseTo(setup.initial[controlCase.fixedPoint.y], 5)
      for (const field of TEXT_CORNER_SCALE_GROWING_FIELDS) {
        expect(live[field]).toBeGreaterThan(setup.initial[field])
      }
      expect(live.width / setup.initial.width).toBeCloseTo(TEXT_CORNER_SCALE_TARGET_MULTIPLIER, 2)
      expect(live.fontSize / setup.initial.fontSize).toBeCloseTo(TEXT_CORNER_SCALE_TARGET_MULTIPLIER, 2)
      expect(live.lineCount).toBe(setup.initial.lineCount)
      expect(live.scaleX).toBe(1)
      expect(live.scaleY).toBe(1)
      expect(guideState.spacingGuides).toHaveLength(0)
    })

    await test.step('Проверить сохранение геометрии после отпускания мыши', async() => {
      const committed = await text.scaling.finish({ id: setup.textId })
      const clearedGuides = await snapping.getGuideState()

      expect(committed).toEqual(live)
      expect(clearedGuides.guides).toHaveLength(0)
      expect(clearedGuides.spacingGuides).toHaveLength(0)
    })
  })
}
