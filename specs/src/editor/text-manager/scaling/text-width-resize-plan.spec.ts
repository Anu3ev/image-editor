import {
  createTextWidthMeasurement,
  createTextWidthSnapPlan
} from '../../../../test-utils/text/width-resize-plan'
import {
  resolveTextWidthSnapMeasurement,
  type TextWidthMeasurementSource
} from '../../../../../src/editor/text-manager/scaling/text-width-resize-plan'

it('уточняет ширину после изменения переноса строк', () => {
  const measuredWidths: number[] = []
  const measurer: TextWidthMeasurementSource = {
    measure: ({ width }) => {
      measuredWidths.push(width)

      return createTextWidthMeasurement({ width, right: width < 105 ? 303 : 304 })
    }
  }

  const measurement = resolveTextWidthSnapMeasurement({
    plan: createTextWidthSnapPlan(),
    measurer
  })

  expect(measuredWidths).toEqual([104, 105])
  expect(measurement?.width).toBe(105)
  expect(measurement?.projection.bounds.right).toBe(304)
})

it('отклоняет прилипание, если перенос строк не позволяет достичь направляющей', () => {
  const measuredWidths: number[] = []
  const measurer: TextWidthMeasurementSource = {
    measure: ({ width }) => {
      measuredWidths.push(width)

      return createTextWidthMeasurement({ width, right: width < 105 ? 303 : 305 })
    }
  }

  const measurement = resolveTextWidthSnapMeasurement({
    plan: createTextWidthSnapPlan(),
    measurer
  })

  expect(measurement).toBeNull()
  expect(measuredWidths).toEqual([104, 105])
})
