import type { EditorFontDefinition } from '../types/font'

type MaybeDocument = typeof document | undefined

/**
 * Менеджер загрузки пользовательских шрифтов.
 */
export default class FontManager {
  private static registeredFontFamilies = new Set<string>()

  private fonts: EditorFontDefinition[]

  constructor(fonts: EditorFontDefinition[] = []) {
    this.fonts = fonts
  }

  public setFonts(fonts: EditorFontDefinition[]): void {
    this.fonts = fonts
  }

  public async loadFonts(): Promise<void> {
    const fonts = this.fonts ?? []
    if (!fonts.length) return

    const doc: MaybeDocument = typeof document !== 'undefined' ? document : undefined
    if (!doc) return

    const loadTasks = fonts.map((font) => FontManager.loadFont(font, doc))

    await Promise.allSettled(loadTasks)
  }

  private static async loadFont(font: EditorFontDefinition, doc: Document): Promise<void> {
    const supportsFontFace = typeof FontFace !== 'undefined'
    const family = font.family?.trim()
    const source = font.source?.trim()

    if (!family || !source) return
    if (FontManager.registeredFontFamilies.has(family)) return

    const familyForCheck = FontManager.formatFontFamilyForCheck(family)
    if (doc.fonts && typeof doc.fonts.check === 'function' && doc.fonts.check(`1em ${familyForCheck}`)) {
      FontManager.registeredFontFamilies.add(family)
      return
    }

    const normalizedSource = FontManager.normalizeFontSource(source)

    if (supportsFontFace) {
      try {
        const fontFace = new FontFace(family, normalizedSource, font.descriptors)
        const loadedFace = await fontFace.load()
        doc.fonts.add(loadedFace)
        FontManager.registeredFontFamilies.add(family)
        return
      } catch (error) {
        console.warn(`Не удалось загрузить шрифт "${family}" через FontFace API`, error)
      }
    }

    FontManager.injectFontFace(font, normalizedSource, doc)
  }

  private static injectFontFace(font: EditorFontDefinition, normalizedSource: string, doc: Document): void {
    const { family, descriptors } = font
    if (!family) return
    if (FontManager.registeredFontFamilies.has(family)) return

    const styleElement = doc.createElement('style')
    styleElement.setAttribute('data-editor-font', family)

    const descriptorLines = FontManager.descriptorsToCss(descriptors)
    const cssLines = [
      '@font-face {',
      `  font-family: ${FontManager.formatFontFamilyForCss(family)};`,
      `  src: ${normalizedSource};`,
      ...descriptorLines.map((line) => `  ${line}`),
      '}'
    ]

    styleElement.textContent = cssLines.join('\n')
    doc.head.appendChild(styleElement)

    FontManager.registeredFontFamilies.add(family)
  }

  private static normalizeFontSource(source: string): string {
    const trimmed = source.trim()
    if (/^(url|local)\(/i.test(trimmed)) return trimmed

    const escapedSource = trimmed.replace(/'/g, "\\'")
    return `url('${escapedSource}')`
  }

  private static formatFontFamilyForCss(family: string): string {
    const escaped = family.replace(/'/g, "\\'")
    return `'${escaped}'`
  }

  private static formatFontFamilyForCheck(family: string): string {
    const escaped = family.replace(/"/g, '\\"')
    return /\s/.test(family) ? `"${escaped}"` : family
  }

  private static descriptorsToCss(descriptors?: FontFaceDescriptors): string[] {
    if (!descriptors) return []

    const descriptorMap: Partial<Record<keyof FontFaceDescriptors, string>> = {
      style: 'font-style',
      weight: 'font-weight',
      stretch: 'font-stretch',
      unicodeRange: 'unicode-range',
      variant: 'font-variant',
      featureSettings: 'font-feature-settings',
      display: 'font-display',
      ascentOverride: 'ascent-override',
      descentOverride: 'descent-override',
      lineGapOverride: 'line-gap-override'
    }

    return Object.entries(descriptors)
      .filter(([, value]) => value !== undefined && value !== null && `${value}`.length > 0)
      .map(([key, value]) => {
        const cssKey = descriptorMap[key as keyof FontFaceDescriptors] ?? key
        return `${cssKey}: ${value};`
      })
  }
}
