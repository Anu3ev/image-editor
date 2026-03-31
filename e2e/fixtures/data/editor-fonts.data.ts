import type { EditorFontDefinition } from '../../../src/editor/types/font'

const LATIN_RANGE = [
  'U+0000-00FF',
  'U+0100-02BA',
  'U+02BB-02BC',
  'U+02BD-02C5',
  'U+02C7-02CC',
  'U+02CE-02D7',
  'U+02DD-02FF',
  'U+02C6',
  'U+02DC',
  'U+0304',
  'U+0308',
  'U+0329',
  'U+1D00-1DBF',
  'U+1E00-1E9F',
  'U+1EF2-1EFF',
  'U+2000-206F',
  'U+2020',
  'U+20A0-20AB',
  'U+20AD-20C0',
  'U+2113',
  'U+2122',
  'U+2191',
  'U+2193',
  'U+2212',
  'U+2215',
  'U+2C60-2C7F',
  'U+A720-A7FF',
  'U+FEFF',
  'U+FFFD'
].join(', ')

const CYRILLIC_RANGE = [
  'U+0301',
  'U+0400-052F',
  'U+1C80-1C8A',
  'U+20B4',
  'U+2DE0-2DFF',
  'U+A640-A69F',
  'U+FE2E-FE2F',
  'U+2116'
].join(', ')

const TEST_FONT_PATH_PREFIX = '/__e2e/fonts'

/** Локальный набор шрифтов для e2e, чтобы ready-path редактора не зависел от внешней сети. */
export const E2E_EDITOR_FONTS: EditorFontDefinition[] = [
  {
    family: 'Arial',
    source: 'local("Arial"), local("Liberation Sans"), local("DejaVu Sans")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap'
    }
  },
  {
    family: 'Exo 2',
    source: `url('${TEST_FONT_PATH_PREFIX}/exo2-cyrillic.woff2') format("woff2")`,
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Exo 2',
    source: `url('${TEST_FONT_PATH_PREFIX}/exo2-latin.woff2') format("woff2")`,
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Open Sans',
    source: `url('${TEST_FONT_PATH_PREFIX}/open-sans-cyrillic.woff2') format("woff2")`,
    descriptors: {
      style: 'normal',
      weight: '300 800',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Open Sans',
    source: `url('${TEST_FONT_PATH_PREFIX}/open-sans-latin.woff2') format("woff2")`,
    descriptors: {
      style: 'normal',
      weight: '300 800',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Roboto',
    source: `url('${TEST_FONT_PATH_PREFIX}/roboto-cyrillic.woff2') format("woff2")`,
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Roboto',
    source: `url('${TEST_FONT_PATH_PREFIX}/roboto-latin.woff2') format("woff2")`,
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Oswald',
    source: `url('${TEST_FONT_PATH_PREFIX}/oswald-cyrillic.woff2') format("woff2")`,
    descriptors: {
      style: 'normal',
      weight: '200 700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Oswald',
    source: `url('${TEST_FONT_PATH_PREFIX}/oswald-latin.woff2') format("woff2")`,
    descriptors: {
      style: 'normal',
      weight: '200 700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  }
]

/** Разрешённые локальные файлы test-only шрифтов, которые fixture может отдать браузеру. */
export const E2E_EDITOR_FONT_FILES = new Set([
  'exo2-cyrillic.woff2',
  'exo2-latin.woff2',
  'open-sans-cyrillic.woff2',
  'open-sans-latin.woff2',
  'roboto-cyrillic.woff2',
  'roboto-latin.woff2',
  'oswald-cyrillic.woff2',
  'oswald-latin.woff2'
])
