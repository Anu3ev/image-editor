import type { EditorFontDefinition } from '../../../../src/editor/types/font'
import {
  createFontManagerTestSetup,
  resetFontManagerRegistry
} from '../../../test-utils/editor-helpers'

describe('FontManager', () => {
  beforeEach(() => {
    resetFontManagerRegistry()
    jest.clearAllMocks()
  })

  it('загружает шрифты через FontFace API при наличии поддержки', async () => {
    const font: EditorFontDefinition = {
      family: 'Test Font',
      source: 'https://example.com/fonts/test-font.woff2',
      descriptors: {
        style: 'normal',
        weight: '400',
        display: 'swap'
      }
    }

    const setup = createFontManagerTestSetup({ fonts: [font] })
    const loadedFace = { family: font.family }
    const loadMock = jest.fn().mockResolvedValue(loadedFace)
    const FontFaceMock = jest.fn().mockImplementation((family, source, descriptors) => {
      expect(family).toBe(font.family)
      expect(source).toBe("url('https://example.com/fonts/test-font.woff2')")
      expect(descriptors).toEqual(font.descriptors)
      return {
        load: loadMock
      }
    })

    setup.setFontFaceMock(FontFaceMock)

    try {
      await setup.fontManager.loadFonts()

      expect(FontFaceMock).toHaveBeenCalledTimes(1)
      expect(loadMock).toHaveBeenCalledTimes(1)
      expect(setup.fontSet.add).toHaveBeenCalledWith(loadedFace)
      expect(setup.appendChildSpy).not.toHaveBeenCalled()

      await setup.fontManager.loadFonts()
      expect(FontFaceMock).toHaveBeenCalledTimes(1)
    } finally {
      setup.restore()
    }
  })

  it('Инжектит в DOM @font-face когда FontFace API недоступен', async () => {
    const font: EditorFontDefinition = {
      family: 'Fallback Font',
      source: "url('https://example.com/fonts/fallback.woff2')",
      descriptors: {
        style: 'normal',
        weight: '400',
        display: 'swap',
        unicodeRange: 'U+0000-00FF'
      }
    }

    const setup = createFontManagerTestSetup({ fonts: [font] })
    setup.setFontFaceMock(undefined)

    try {
      await setup.fontManager.loadFonts()

      expect(setup.appendChildSpy).toHaveBeenCalledTimes(1)
      expect(setup.fontSet.add).not.toHaveBeenCalled()

      const styleElement = setup.styleElements[0]
      expect(styleElement).toBeDefined()
      expect(styleElement.textContent).toContain('@font-face')
      expect(styleElement.textContent).toContain("font-family: 'Fallback Font'")
      expect(styleElement.textContent).toContain("src: url('https://example.com/fonts/fallback.woff2')")

      await setup.fontManager.loadFonts()
      expect(setup.appendChildSpy).toHaveBeenCalledTimes(1)
    } finally {
      setup.restore()
    }
  })

  it('не загружает шрифт повторно если он уже есть в FontFaceSet', async () => {
    const font: EditorFontDefinition = {
      family: 'Existing Font',
      source: 'https://example.com/fonts/existing.woff2',
      descriptors: {
        style: 'normal',
        weight: '400',
        display: 'swap'
      }
    }

    const existingFace = {
      family: 'Existing Font',
      style: 'normal',
      weight: '400',
      stretch: 'normal',
      unicodeRange: 'U+0-10FFFF',
      variant: 'normal',
      featureSettings: 'normal',
      display: 'swap'
    }

    const setup = createFontManagerTestSetup({
      fonts: [font],
      existingFontFaces: [existingFace]
    })

    const FontFaceMock = jest.fn()
    setup.setFontFaceMock(FontFaceMock)

    try {
      await setup.fontManager.loadFonts()

      expect(setup.fontSet.forEach).toHaveBeenCalledTimes(1)
      expect(FontFaceMock).not.toHaveBeenCalled()
      expect(setup.fontSet.add).not.toHaveBeenCalled()
      expect(setup.appendChildSpy).not.toHaveBeenCalled()
    } finally {
      setup.restore()
    }
  })
})
