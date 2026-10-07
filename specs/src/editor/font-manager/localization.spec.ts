import FontManager from '../../../../src/editor/font-manager'
import { createTranslator } from '../../../../src/editor/i18n'
import { createFontManagerTestSetup, resetFontManagerRegistry } from '../../../test-utils/managers/font'

describe('FontManager localization', () => {
  beforeEach(() => resetFontManagerRegistry())
  afterEach(() => jest.restoreAllMocks())

  it('localizes font-load warnings and preserves the original error', async() => {
    const setup = createFontManagerTestSetup()
    const error = new Error('Custom font failure')
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    setup.setFontFaceMock(jest.fn(() => ({ load: () => Promise.reject(error) })))
    const font = { family: '<Custom Font>', source: 'https://example.com/custom.woff2' }
    const t = createTranslator('ru')
    try {
      await new FontManager([font], t).loadFonts()
      expect(warn).toHaveBeenCalledWith(t('fonts.warnings.fontFaceLoadFailed', { family: font.family }), error)
    } finally {
      setup.restore()
    }
  })

  it('localizes FontFaceSet warnings using the same instance translator', async() => {
    const setup = createFontManagerTestSetup()
    const error = new Error('Custom set failure')
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    setup.fontSet.forEach.mockImplementation(() => { throw error })
    setup.setFontFaceMock(undefined)
    const t = createTranslator('ru')
    try {
      await new FontManager([{ family: 'Example', source: 'https://example.com/font.woff2' }], t).loadFonts()
      expect(warn).toHaveBeenCalledWith(t('fonts.warnings.fontFaceSetCheckFailed'), error)
    } finally {
      setup.restore()
    }
  })
})
