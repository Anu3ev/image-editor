import { BackgroundTextbox } from '../../../../../src/editor/text-manager/background-textbox'
import {
  areTextCornerScaleCanonicalStatesEqual,
  captureTextCornerScaleCanonicalState
} from '../../../../../src/editor/text-manager/scaling/text-corner-scale-state'

/** Создаёт текст с двумя источниками переопределённого размера шрифта. */
function createTextboxWithFontSizeOverrides(): BackgroundTextbox {
  const textbox = new BackgroundTextbox('Первая\nВторая', {
    fontSize: 32,
    width: 180
  })

  textbox.styles = {
    1: {
      0: { fontSize: 18 }
    }
  }
  textbox.lineFontDefaults = {
    0: { fontSize: 28 },
    1: { fontSize: 20 }
  }

  return textbox
}

it('считает одинаковыми размеры шрифта в посимвольных стилях и настройках строк', () => {
  const expected = createTextboxWithFontSizeOverrides()
  const actual = createTextboxWithFontSizeOverrides()
  const expectedState = captureTextCornerScaleCanonicalState({ textbox: expected })
  const actualState = captureTextCornerScaleCanonicalState({ textbox: actual })

  expect(expectedState.inlineFontSizes).toEqual([{ key: '1:0', value: 18 }])
  expect(expectedState.lineFontSizes).toEqual([
    { key: '0', value: 28 },
    { key: '1', value: 20 }
  ])
  expect(areTextCornerScaleCanonicalStatesEqual({ actual: actualState, expected: expectedState })).toBe(true)
})

it('отличает изменённый размер в посимвольном стиле и настройку размера строки', () => {
  const textbox = createTextboxWithFontSizeOverrides()
  const expected = captureTextCornerScaleCanonicalState({ textbox })

  textbox.styles = {
    1: {
      0: { fontSize: 18.5 }
    }
  }
  const changedInlineStyle = captureTextCornerScaleCanonicalState({ textbox })

  textbox.styles = {
    1: {
      0: { fontSize: 18 }
    }
  }
  textbox.lineFontDefaults = {
    0: { fontSize: 28 },
    1: { fontSize: 20.5 }
  }
  const changedLineDefaults = captureTextCornerScaleCanonicalState({ textbox })

  expect(areTextCornerScaleCanonicalStatesEqual({ actual: changedInlineStyle, expected })).toBe(false)
  expect(areTextCornerScaleCanonicalStatesEqual({ actual: changedLineDefaults, expected })).toBe(false)
})
