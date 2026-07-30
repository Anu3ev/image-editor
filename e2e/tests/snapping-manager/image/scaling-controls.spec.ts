import { test, expect } from '../../../fixtures/image-scaling.fixture'
import {
  SNAPPING_IMAGE_SCALE_CONTROL_CASES
} from '../../../fixtures/data/snapping-image-scaling.data'
import type { SnappingGuideInfo } from '../../../types'

for (const scaleCase of SNAPPING_IMAGE_SCALE_CONTROL_CASES) {
  test(scaleCase.title, async({ imageScaleReferenceSetup: setup, images, snapping }) => {
    const { started, live } = await test.step('Прилипнуть выбранной внешней гранью', async() => {
      const startedSnapshot = await images.scaling.startFromControl({
        control: scaleCase.control,
        id: setup.imageId
      })
      const controlPoint = startedSnapshot.controlPoints[scaleCase.control]
      const point = {
        x: scaleCase.xGuide ? setup.guides[scaleCase.xGuide] : controlPoint.x,
        y: scaleCase.yGuide ? setup.guides[scaleCase.yGuide] : controlPoint.y
      }
      const liveSnapshot = await images.scaling.dragControlToScenePoint({ point })

      return { live: liveSnapshot, started: startedSnapshot }
    })

    await test.step('Проверить live-геометрию и направляющие', async() => {
      if (scaleCase.xGuide) {
        const edge = scaleCase.xGuide === 'left' ? live.boundsLeft : live.boundsRight
        expect(edge).toBeCloseTo(setup.guides[scaleCase.xGuide], 5)
      }
      if (scaleCase.yGuide) {
        const edge = scaleCase.yGuide === 'top' ? live.boundsTop : live.boundsBottom
        expect(edge).toBeCloseTo(setup.guides[scaleCase.yGuide], 5)
      }

      const fixedBefore = started.controlPoints[scaleCase.fixedControl]
      const fixedAfter = live.controlPoints[scaleCase.fixedControl]
      const expectedGuides: SnappingGuideInfo[] = []

      if (scaleCase.xGuide) {
        expectedGuides.push({ type: 'vertical', position: setup.guides[scaleCase.xGuide] })
      }
      if (scaleCase.yGuide) {
        expectedGuides.push({ type: 'horizontal', position: setup.guides[scaleCase.yGuide] })
      }

      const guideState = await snapping.getGuideState()

      expect(fixedAfter.x).toBeCloseTo(fixedBefore.x, 5)
      expect(fixedAfter.y).toBeCloseTo(fixedBefore.y, 5)
      expect(live.width).toBe(setup.baseline.width)
      expect(live.height).toBe(setup.baseline.height)
      expect(guideState.guides).toHaveLength(expectedGuides.length)
      expect(guideState.guides).toEqual(expect.arrayContaining(expectedGuides))
      expect(guideState.spacingGuides).toHaveLength(0)
    })

    await test.step('Сохранить live-геометрию после mouseup', async() => {
      const committed = await images.scaling.finish({ id: setup.imageId })
      const clearedGuides = await snapping.getGuideState()

      expect(committed).toEqual(live)
      expect(committed.controlPoints[scaleCase.fixedControl])
        .toEqual(started.controlPoints[scaleCase.fixedControl])
      expect(clearedGuides.guides).toHaveLength(0)
      expect(clearedGuides.spacingGuides).toHaveLength(0)
    })
  })
}
