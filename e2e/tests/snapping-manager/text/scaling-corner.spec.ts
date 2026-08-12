import { test, expect } from '../../../fixtures/editor.fixture'
import { createRotatedTextCornerScaleSetup } from '../../../fixtures/text-corner-scaling.fixture'

/** Поля, которые не должны меняться при удержании угловой ручки на направляющей. */
const STABLE_TEXT_SCALE_FIELDS = [
  'boundsLeft',
  'boundsTop',
  'boundsRight',
  'boundsBottom',
  'boundsWidth',
  'boundsHeight',
  'width',
  'fontSize'
] as const

test.describe('Скейлинг отдельного текста за угловую ручку', () => {
  test.fixme('при неподвижной ручке повёрнутый текст сохраняет размер и направляющую', async({
    editorModel,
    shapes,
    snapping,
    text
  }) => {
    const setup = await createRotatedTextCornerScaleSetup({ editorModel, shapes, snapping, text })

    expect(setup.initial.angle).toBeCloseTo(55, 5)
    expect(setup.reference.boundsLeft).toBeCloseTo(setup.initial.boundsRight, 5)

    const held = await text.dragScaleHandleBy({
      id: setup.textId,
      corner: 'br',
      deltaX: -1,
      deltaY: -1,
      pointerSteps: 1
    })
    const heldGuides = await snapping.getGuideState()
    const repeated = await text.continueScaleHandleBy({ deltaX: 0, deltaY: 0 })
    const repeatedGuides = await snapping.getGuideState()

    for (const field of STABLE_TEXT_SCALE_FIELDS) {
      expect(repeated[field]).toBeCloseTo(held[field], 5)
    }
    for (const guideState of [heldGuides, repeatedGuides]) {
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'vertical', position: setup.reference.boundsLeft })
      ]))
    }

    const committed = await text.finishScale({ id: setup.textId })
    const clearedGuides = await snapping.getGuideState()
    for (const field of STABLE_TEXT_SCALE_FIELDS) {
      expect(committed[field]).toBeCloseTo(repeated[field], 5)
    }
    expect(clearedGuides.guides).toHaveLength(0)
    expect(clearedGuides.spacingGuides).toHaveLength(0)
  })
})
