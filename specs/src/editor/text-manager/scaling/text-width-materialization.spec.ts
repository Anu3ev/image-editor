import { BackgroundTextbox } from '../../../../../src/editor/text-manager/background-textbox'
import { applyCanonicalTextboxWidth } from '../../../../../src/editor/text-manager/scaling/text-width-materialization'

it('применяет дробную ширину одним штатным обновлением Fabric', () => {
  const textbox = new BackgroundTextbox('Текст', { autoExpand: true, width: 120 })
  const setSpy = jest.spyOn(textbox, 'set')

  const appliedWidth = applyCanonicalTextboxWidth({ textbox, width: 126.625 })

  expect(setSpy).toHaveBeenCalledTimes(1)
  expect(setSpy).toHaveBeenCalledWith({ width: 126.625 })
  expect(appliedWidth).toBe(126.625)
  expect(textbox.width).toBe(126.625)
  expect(textbox.autoExpand).toBe(false)
})

it('не позволяет ширине стать меньше одного пикселя', () => {
  const textbox = new BackgroundTextbox('', {
    autoExpand: true,
    dynamicMinWidth: 0,
    width: 120
  })

  const appliedWidth = applyCanonicalTextboxWidth({ textbox, width: -10 })

  expect(appliedWidth).toBe(1)
  expect(textbox.width).toBe(1)
  expect(textbox.autoExpand).toBe(false)
})

it('не позволяет ширине стать меньше самой длинной строки', () => {
  const textbox = new BackgroundTextbox('Новый текст', {
    autoExpand: true,
    dynamicMinWidth: 72.625,
    width: 240
  })

  const appliedWidth = applyCanonicalTextboxWidth({ textbox, width: 20 })

  expect(appliedWidth).toBe(72.625)
  expect(textbox.width).toBe(72.625)
  expect(textbox.autoExpand).toBe(false)
})
