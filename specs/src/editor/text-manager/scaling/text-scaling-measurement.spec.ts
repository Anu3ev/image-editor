import { BackgroundTextbox } from '../../../../../src/editor/text-manager/background-textbox'
import { createTextScalingMeasurementTextbox } from '../../../../../src/editor/text-manager/scaling/text-scaling-measurement'

it('сохраняет дробную исходную ширину в измерительной копии', () => {
  const target = new BackgroundTextbox('Дробная ширина', {
    autoExpand: true,
    width: 101
  })
  target.width = 101.25
  target.minWidth = 47.5

  const measurement = createTextScalingMeasurementTextbox({ target })

  expect(target.width).toBe(101.25)
  expect(measurement.width).toBe(101.25)
  expect(measurement.minWidth).toBe(47.5)
  expect(measurement.autoExpand).toBe(true)
})
