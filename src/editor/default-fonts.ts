/* eslint-disable max-len */
import type { EditorFontDefinition } from './types/font'

const LATIN_RANGE = [
  'U+0000-00FF',
  'U+0131',
  'U+0152-0153',
  'U+02BB-02BC',
  'U+02C6',
  'U+02DA',
  'U+02DC',
  'U+0304',
  'U+0308',
  'U+0329',
  'U+2000-206F',
  'U+20AC',
  'U+2122',
  'U+2191',
  'U+2193',
  'U+2212',
  'U+2215',
  'U+FEFF',
  'U+FFFD'
].join(', ')

const CYRILLIC_RANGE = [
  'U+0301',
  'U+0400-045F',
  'U+0490-0491',
  'U+04B0-04B1',
  'U+2116'
].join(', ')

/**
 * Набор дефолтных шрифтов (Latin + Cyrillic) с прямыми ссылками на Google Fonts.
 * При необходимости добавить другие начертания или диапазоны, дублируйте записи
 * и изменяйте unicodeRange/weight/style.
 */
export const defaultFonts: EditorFontDefinition[] = [
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
    family: 'Alegreya Sans',
    source: 'url(https://fonts.gstatic.com/s/alegreyasans/v26/5aUz9_-1phKLFgshYDvh6Vwt7V5tvXVX.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Alegreya Sans',
    source: 'url(https://fonts.gstatic.com/s/alegreyasans/v26/5aUz9_-1phKLFgshYDvh6Vwt7VptvQ.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Alegreya Sans',
    source: 'url(https://fonts.gstatic.com/s/alegreyasans/v26/5aUu9_-1phKLFgshYDvh6Vwt5eFIqE52i1dC.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Alegreya Sans',
    source: 'url(https://fonts.gstatic.com/s/alegreyasans/v26/5aUu9_-1phKLFgshYDvh6Vwt5eFIqEp2iw.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Oswald',
    source: 'url(https://fonts.gstatic.com/s/oswald/v57/TK3iWkUHHAIjg752HT8Ghe4.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '200 700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Oswald',
    source: 'url(https://fonts.gstatic.com/s/oswald/v57/TK3iWkUHHAIjg752GT8G.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '200 700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Merriweather',
    source: 'url(https://fonts.gstatic.com/s/merriweather/v33/u-4t0qyriQwlOrhSvowK_l5UcA6ht3ZEqezpPbXEE5pRlK3G.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Merriweather',
    source: 'url(https://fonts.gstatic.com/s/merriweather/v33/u-4t0qyriQwlOrhSvowK_l5UcA6ht3ZEqezpPbXEE55RlA.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Caveat',
    source: 'url(https://fonts.gstatic.com/s/caveat/v23/Wnz6HAc5bAfYB2Q7YjYYmg8.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400 700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Caveat',
    source: 'url(https://fonts.gstatic.com/s/caveat/v23/Wnz6HAc5bAfYB2Q7ZjYY.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400 700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Cormorant',
    source: 'url(https://fonts.gstatic.com/s/cormorant/v24/H4clBXOCl9bbnla_nHIq65u9uqc.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Cormorant',
    source: 'url(https://fonts.gstatic.com/s/cormorant/v24/H4clBXOCl9bbnla_nHIq75u9.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Comfortaa',
    source: 'url(https://fonts.gstatic.com/s/comfortaa/v47/1Ptsg8LJRfWJmhDAuUs4SYFqPfE.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Comfortaa',
    source: 'url(https://fonts.gstatic.com/s/comfortaa/v47/1Ptsg8LJRfWJmhDAuUs4TYFq.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Didact Gothic',
    source: 'url(https://fonts.gstatic.com/s/didactgothic/v21/ahcfv8qz1zt6hCC5G4F_P4ASlU-YpnLl.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Didact Gothic',
    source: 'url(https://fonts.gstatic.com/s/didactgothic/v21/ahcfv8qz1zt6hCC5G4F_P4ASlUuYpg.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Arimo',
    source: 'url(https://fonts.gstatic.com/s/arimo/v35/P5sMzZCDf9_T_10dxCF8jA.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400 700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Arimo',
    source: 'url(https://fonts.gstatic.com/s/arimo/v35/P5sMzZCDf9_T_10ZxCE.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400 700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Bitter',
    source: 'url(https://fonts.gstatic.com/s/bitter/v40/rax8HiqOu8IVPmn7e4xpPDk.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Bitter',
    source: 'url(https://fonts.gstatic.com/s/bitter/v40/rax8HiqOu8IVPmn7f4xp.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  }
]

export default defaultFonts
