/* eslint-disable max-len */
import type { EditorFontDefinition } from './types/font'

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
  },
  {
    family: 'Anonymous Pro',
    source: 'url(https://fonts.gstatic.com/s/anonymouspro/v22/rP2Bp2a15UIB7Un-bOeISG3pHl829RH9.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Anonymous Pro',
    source: 'url(https://fonts.gstatic.com/s/anonymouspro/v22/rP2Bp2a15UIB7Un-bOeISG3pHls29Q.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Anonymous Pro',
    source: 'url(https://fonts.gstatic.com/s/anonymouspro/v22/rP2cp2a15UIB7Un-bOeISG3pFuAT4Crc7ZOy.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Anonymous Pro',
    source: 'url(https://fonts.gstatic.com/s/anonymouspro/v22/rP2cp2a15UIB7Un-bOeISG3pFuAT4C7c7Q.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'El Messiri',
    source: 'url(https://fonts.gstatic.com/s/elmessiri/v25/K2F0fZBRmr9vQ1pHEey6MomAAhLz.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400 700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'El Messiri',
    source: 'url(https://fonts.gstatic.com/s/elmessiri/v25/K2F0fZBRmr9vQ1pHEey6Mo2AAg.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400 700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Exo 2',
    source: 'url(https://fonts.gstatic.com/s/exo2/v26/7cHmv4okm5zmbtYsK-4E4Q.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Exo 2',
    source: 'url(https://fonts.gstatic.com/s/exo2/v26/7cHmv4okm5zmbtYoK-4.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9C4kDNxMZdWfMOD5Vn9LjNYTLHdQ.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9C4kDNxMZdWfMOD5Vn9LjJYTI.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnWKneQhf6TF0.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '200',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnWKneRhf6.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '200',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnPKreQhf6TF0.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnPKreRhf6.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9E4kDNxMZdWfMOD5Vvk4jLeTY.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9E4kDNxMZdWfMOD5Vvl4jL.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnZKveQhf6TF0.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '500',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnZKveRhf6.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '500',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnSKzeQhf6TF0.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '600',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnSKzeRhf6.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '600',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnLK3eQhf6TF0.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnLK3eRhf6.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnMK7eQhf6TF0.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '800',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnMK7eRhf6.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '800',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnFK_eQhf6TF0.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Fira Sans',
    source: 'url(https://fonts.gstatic.com/s/firasans/v18/va9B4kDNxMZdWfMOD5VnFK_eRhf6.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Istok Web',
    source: 'url(https://fonts.gstatic.com/s/istokweb/v26/3qTvojGmgSyUukBzKslpAmt_xkI.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Istok Web',
    source: 'url(https://fonts.gstatic.com/s/istokweb/v26/3qTvojGmgSyUukBzKslpBmt_.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Istok Web',
    source: 'url(https://fonts.gstatic.com/s/istokweb/v26/3qTqojGmgSyUukBzKslhvU5q_WMVUBc.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Istok Web',
    source: 'url(https://fonts.gstatic.com/s/istokweb/v26/3qTqojGmgSyUukBzKslhvU5q-WMV.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Jost',
    source: 'url(https://fonts.gstatic.com/s/jost/v20/92zatBhPNqw73oDd4iYl.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Jost',
    source: 'url(https://fonts.gstatic.com/s/jost/v20/92zatBhPNqw73oTd4g.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Jura',
    source: 'url(https://fonts.gstatic.com/s/jura/v34/z7NbdRfiaC4VXcBJURRD.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Jura',
    source: 'url(https://fonts.gstatic.com/s/jura/v34/z7NbdRfiaC4VXcRJUQ.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Lobster',
    source: 'url(https://fonts.gstatic.com/s/lobster/v32/neILzCirqoswsqX9zoamM5Ez.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Lobster',
    source: 'url(https://fonts.gstatic.com/s/lobster/v32/neILzCirqoswsqX9zoKmMw.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Manrope',
    source: 'url(https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggOxSuXd.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '200 800',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Manrope',
    source: 'url(https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '200 800',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Montserrat',
    source: 'url(https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459W1hyzbi.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Montserrat',
    source: 'url(https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Neucha',
    source: 'url(https://fonts.gstatic.com/s/neucha/v18/q5uGsou0JOdh94bfuQltOxU.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Neucha',
    source: 'url(https://fonts.gstatic.com/s/neucha/v18/q5uGsou0JOdh94bfvQlt.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Noto Serif',
    source: 'url(https://fonts.gstatic.com/s/notoserif/v33/ga6daw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTYf-D33Esw.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Noto Serif',
    source: 'url(https://fonts.gstatic.com/s/notoserif/v33/ga6daw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTYf6D30.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Open Sans',
    source: 'url(https://fonts.gstatic.com/s/opensans/v44/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSumu1aB.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 800',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Open Sans',
    source: 'url(https://fonts.gstatic.com/s/opensans/v44/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-muw.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 800',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'PT Serif',
    source: 'url(https://fonts.gstatic.com/s/ptserif/v19/EJRVQgYoZZY2vCFuvAFSzr-tdg.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'PT Serif',
    source: 'url(https://fonts.gstatic.com/s/ptserif/v19/EJRVQgYoZZY2vCFuvAFWzr8.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'PT Serif',
    source: 'url(https://fonts.gstatic.com/s/ptserif/v19/EJRSQgYoZZY2vCFuvAnt66qWVyvHpA.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'PT Serif',
    source: 'url(https://fonts.gstatic.com/s/ptserif/v19/EJRSQgYoZZY2vCFuvAnt66qSVys.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '700',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Playfair',
    source: 'url(https://fonts.gstatic.com/s/playfair/v10/0nk2C9D7PO4KhmUJ5_zTZ-wCMUXynAK-5UQzVItagFk.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Playfair',
    source: 'url(https://fonts.gstatic.com/s/playfair/v10/0nk2C9D7PO4KhmUJ5_zTZ-wCMUXynAK-5UQzUIta.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '300 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Press Start 2P',
    source: 'url(https://fonts.gstatic.com/s/pressstart2p/v16/e3t4euO8T-267oIAQAu6jDQyK3nRivN04w.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Press Start 2P',
    source: 'url(https://fonts.gstatic.com/s/pressstart2p/v16/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '400',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Raleway',
    source: 'url(https://fonts.gstatic.com/s/raleway/v37/1Ptug8zYS_SKggPNyCkIT5lu.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Raleway',
    source: 'url(https://fonts.gstatic.com/s/raleway/v37/1Ptug8zYS_SKggPNyC0ITw.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  },
  {
    family: 'Roboto',
    source: 'url(https://fonts.gstatic.com/s/roboto/v50/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3iUBGEe.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: CYRILLIC_RANGE
    }
  },
  {
    family: 'Roboto',
    source: 'url(https://fonts.gstatic.com/s/roboto/v50/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3yUBA.woff2) format("woff2")',
    descriptors: {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
      unicodeRange: LATIN_RANGE
    }
  }
]

export default defaultFonts
