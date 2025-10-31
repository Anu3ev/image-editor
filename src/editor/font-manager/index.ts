import type { EditorFontDefinition } from '../types/font'

type MaybeDocument = typeof document | undefined

type DescriptorSnapshot = {
  style: string
  weight: string
  stretch: string
  unicodeRange: string
  variant: string
  featureSettings: string
  display: string
}

type InjectFontFaceParams = {
  font: EditorFontDefinition
  source: string
  doc: Document
  registrationKey: string
}

/**
 * Менеджер загрузки пользовательских шрифтов.
 */
export default class FontManager {
  private static registeredFontKeys = new Set<string>()

  private static readonly descriptorDefaults: DescriptorSnapshot = {
    style: 'normal',
    weight: '400',
    stretch: 'normal',
    unicodeRange: 'U+0-10FFFF',
    variant: 'normal',
    featureSettings: 'normal',
    display: 'swap'
  }

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
    const normalizedSource = FontManager.normalizeFontSource(source)
    const descriptorSnapshot = FontManager.getDescriptorSnapshot(font.descriptors)
    const registrationKey = FontManager.getFontRegistrationKey(family, normalizedSource, descriptorSnapshot)

    if (FontManager.registeredFontKeys.has(registrationKey)) return

    if (FontManager.isFontFaceAlreadyApplied(doc, family, descriptorSnapshot)) {
      FontManager.registeredFontKeys.add(registrationKey)
      return
    }

    if (supportsFontFace && doc.fonts && typeof doc.fonts.add === 'function') {
      try {
        const fontFace = new FontFace(family, normalizedSource, font.descriptors)
        const loadedFace = await fontFace.load()
        doc.fonts.add(loadedFace)
        FontManager.registeredFontKeys.add(registrationKey)
        return
      } catch (error) {
        console.warn(`Не удалось загрузить шрифт "${family}" через FontFace API`, error)
      }
    }

    FontManager.injectFontFace({
      font,
      source: normalizedSource,
      doc,
      registrationKey
    })
  }

  private static injectFontFace({
    font,
    source,
    doc,
    registrationKey
  }: InjectFontFaceParams): void {
    const { descriptors } = font
    const family = font.family?.trim()
    if (!family) return

    const styleElement = doc.createElement('style')
    styleElement.setAttribute('data-editor-font', family)
    styleElement.setAttribute('data-editor-font-key', registrationKey)

    const descriptorLines = FontManager.descriptorsToCss(descriptors)
    const cssLines = [
      '@font-face {',
      `  font-family: ${FontManager.formatFontFamilyForCss(family)};`,
      `  src: ${source};`,
      ...descriptorLines.map((line) => `  ${line}`),
      '}'
    ]

    styleElement.textContent = cssLines.join('\n')
    doc.head.appendChild(styleElement)

    FontManager.registeredFontKeys.add(registrationKey)
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

  private static normalizeDescriptorValue(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : fallback
    }

    if (value === undefined || value === null) {
      return fallback
    }

    const stringified = `${value}`.trim()
    return stringified.length > 0 ? stringified : fallback
  }

  private static normalizeFamilyName(family?: string): string {
    if (!family) return ''
    return family.trim().replace(/^['"]+|['"]+$/g, '').toLowerCase()
  }

  private static getDescriptorSnapshot(descriptors?: Partial<FontFaceDescriptors>): DescriptorSnapshot {
    const defaults = FontManager.descriptorDefaults

    return {
      style: FontManager.normalizeDescriptorValue(descriptors?.style, defaults.style),
      weight: FontManager.normalizeDescriptorValue(descriptors?.weight, defaults.weight),
      stretch: FontManager.normalizeDescriptorValue(descriptors?.stretch, defaults.stretch),
      unicodeRange: FontManager.normalizeDescriptorValue(descriptors?.unicodeRange, defaults.unicodeRange),
      variant: FontManager.normalizeDescriptorValue(descriptors?.variant, defaults.variant),
      featureSettings: FontManager.normalizeDescriptorValue(descriptors?.featureSettings, defaults.featureSettings),
      display: FontManager.normalizeDescriptorValue(descriptors?.display, defaults.display)
    }
  }

  private static areDescriptorSnapshotsEqual(a: DescriptorSnapshot, b: DescriptorSnapshot): boolean {
    return (
      a.style === b.style &&
      a.weight === b.weight &&
      a.stretch === b.stretch &&
      a.unicodeRange === b.unicodeRange &&
      a.variant === b.variant &&
      a.featureSettings === b.featureSettings &&
      a.display === b.display
    )
  }

  private static getFontRegistrationKey(family: string, normalizedSource: string, descriptors: DescriptorSnapshot): string {
    const normalizedFamily = FontManager.normalizeFamilyName(family)

    return [
      normalizedFamily,
      normalizedSource,
      descriptors.style,
      descriptors.weight,
      descriptors.stretch,
      descriptors.unicodeRange,
      descriptors.variant,
      descriptors.featureSettings,
      descriptors.display
    ].join('::')
  }

  private static isFontFaceAlreadyApplied(doc: Document, family: string, descriptors: DescriptorSnapshot): boolean {
    const fontSet = doc.fonts
    if (!fontSet || typeof fontSet.forEach !== 'function') return false

    const targetFamily = FontManager.normalizeFamilyName(family)
    let matched = false

    try {
      fontSet.forEach((fontFace) => {
        if (matched) return

        const existingFamily = FontManager.normalizeFamilyName(fontFace.family)
        if (existingFamily !== targetFamily) return

        const existingDescriptors = FontManager.getDescriptorSnapshot({
          style: fontFace.style,
          weight: fontFace.weight,
          stretch: fontFace.stretch,
          unicodeRange: fontFace.unicodeRange,
          variant: fontFace.variant,
          featureSettings: fontFace.featureSettings,
          display: fontFace.display
        })

        if (FontManager.areDescriptorSnapshotsEqual(descriptors, existingDescriptors)) {
          matched = true
        }
      })
    } catch (error) {
      console.warn('Не удалось проверить, загружен ли шрифт ранее через FontFaceSet', error)
      return false
    }

    return matched
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
