import FontManager from '../../../../src/editor/font-manager'
import { createFontManagerTestSetup, resetFontManagerRegistry } from '../../../test-utils/managers/font'

describe('FontManager technical warnings', () => {
  beforeEach(() => resetFontManagerRegistry())
  afterEach(() => jest.restoreAllMocks())

  it('reports English font-load warnings and preserves the original error', async() => {
    const setup = createFontManagerTestSetup()
    const error = new Error('Custom font failure')
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    setup.setFontFaceMock(jest.fn(() => ({ load: () => Promise.reject(error) })))
    const font = { family: '<Custom Font>', source: 'https://example.com/custom.woff2' }
    try {
      await new FontManager([font]).loadFonts()
      expect(warn).toHaveBeenCalledWith(`Failed to load font "${font.family}" using the FontFace API`, error)
    } finally {
      setup.restore()
    }
  })

  it('reports English FontFaceSet warnings with the original error', async() => {
    const setup = createFontManagerTestSetup()
    const error = new Error('Custom set failure')
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    setup.fontSet.forEach.mockImplementation(() => { throw error })
    setup.setFontFaceMock(undefined)
    try {
      await new FontManager([{ family: 'Example', source: 'https://example.com/font.woff2' }]).loadFonts()
      expect(warn).toHaveBeenCalledWith('Failed to check whether the font was already loaded through FontFaceSet', error)
    } finally {
      setup.restore()
    }
  })
})
