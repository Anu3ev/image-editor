import type { TemplateDefinition } from '../../types'

const PRODUCT_CARD_TEMPLATE_IMAGE_MARKUP = `
  <svg xmlns="http://www.w3.org/2000/svg" width="714" height="714" viewBox="0 0 714 714">
    <defs>
      <linearGradient id="product-image-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#d8b4fe" />
        <stop offset="100%" stop-color="#7c3aed" />
      </linearGradient>
    </defs>
    <rect width="714" height="714" fill="url(#product-image-gradient)" />
    <circle cx="357" cy="312" r="170" fill="#ffffff" fill-opacity="0.88" />
    <rect x="277" y="418" width="160" height="150" rx="42" fill="#111827" />
    <rect x="316" y="200" width="82" height="214" rx="34" fill="#111827" />
    <rect x="240" y="250" width="62" height="160" rx="26" fill="#111827" />
    <rect x="412" y="250" width="62" height="160" rx="26" fill="#111827" />
  </svg>
`

const PRODUCT_CARD_TEMPLATE_IMAGE_SOURCE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  PRODUCT_CARD_TEMPLATE_IMAGE_MARKUP
)}`

/** Базовое разрешение шаблона product card. */
export const PRODUCT_CARD_TEMPLATE_BASE_RESOLUTION = {
  width: 810,
  height: 1080
} as const

/** Уменьшенное разрешение для проверки нормализованных позиций шаблона. */
export const PRODUCT_CARD_TEMPLATE_COMPACT_RESOLUTION = {
  width: 405,
  height: 540
} as const

/** Увеличенное разрешение для проверки шаблона после смены montage resolution. */
export const PRODUCT_CARD_TEMPLATE_EXPANDED_RESOLUTION = {
  width: 1080,
  height: 1440
} as const

/** Количество обычных объектов, которые должен вставить product card template. */
export const PRODUCT_CARD_TEMPLATE_OBJECT_COUNT = 7

/** Индексы объектов product card template в порядке их вставки на canvas. */
export const PRODUCT_CARD_TEMPLATE_INDEXES = {
  card: 0,
  image: 1,
  title: 2,
  subtitle: 3,
  featureRight: 4,
  featureCenter: 5,
  featureLeft: 6
} as const

/** Технический допуск для проверок геометрии template-объектов. */
export const TEMPLATE_BOUNDS_TOLERANCE = 2

/** Допуск для сравнений нормализованных позиций между разными размерами монтажной области. */
export const TEMPLATE_RELATIVE_TOLERANCE = 0.025

/** Допуск для проверок выравнивания блоков в одной линии. */
export const TEMPLATE_ALIGNMENT_TOLERANCE = 4

/** Базовое разрешение для шаблона с standalone text у верхней границы. */
export const TEMPLATE_STANDALONE_TEXT_BASE_RESOLUTION = {
  width: 810,
  height: 1080
} as const

/** Квадратное разрешение для regression-проверки standalone text из шаблона. */
export const TEMPLATE_STANDALONE_TEXT_SQUARE_RESOLUTION = {
  width: 1000,
  height: 1000
} as const

/** Уменьшенное квадратное разрешение для проверки standalone text после scale down. */
export const TEMPLATE_STANDALONE_TEXT_COMPACT_RESOLUTION = {
  width: 512,
  height: 512
} as const

/** Высокое разрешение с горизонтальными полями для regression-проверки centered standalone text. */
export const TEMPLATE_STANDALONE_TEXT_TALL_RESOLUTION = {
  width: 910,
  height: 1200
} as const

/** Количество объектов в шаблоне со standalone text. */
export const TEMPLATE_STANDALONE_TEXT_OBJECT_COUNT = 1

/** Шаблон со standalone text, который должен оставаться по центру сверху на разных разрешениях. */
export const TEMPLATE_STANDALONE_TEXT_TEMPLATE: TemplateDefinition = {
  id: 'template-standalone-text-alignment',
  meta: {
    baseWidth: 810,
    baseHeight: 1080,
    positionsNormalized: true
  },
  objects: [
    {
      fontSize: 72,
      fontWeight: 'normal',
      fontFamily: 'Open Sans',
      fontStyle: 'normal',
      lineHeight: 1.16,
      text: 'ЖЕНСКАЯ СУМКА ИЗ КОЖИ БЛА БЛА БЛА БЛА БЛАБЛА БЛА БЛА БЛА',
      charSpacing: 0,
      textAlign: 'center',
      styles: [],
      pathStartOffset: 0,
      pathSide: 'left',
      pathAlign: 'baseline',
      underline: false,
      overline: false,
      linethrough: false,
      textBackgroundColor: null,
      direction: 'ltr',
      textDecorationThickness: 66.667,
      minWidth: 20,
      splitByGrapheme: false,
      id: 'background-textbox-iPaS7YLnTRKxLVc_2hpMt',
      customData: {
        handle: 'title',
        template: '{{text}}',
        variables: [
          {
            name: 'text',
            description: 'Заголовок товара',
            maxChars: 30
          }
        ]
      },
      width: 758,
      height: 364,
      originX: 'left',
      originY: 'top',
      editable: true,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      textCaseRaw: 'женская сумка из кожи',
      uppercase: true,
      autoExpand: false,
      backgroundOpacity: 1,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      radiusTopLeft: 0,
      radiusTopRight: 0,
      radiusBottomRight: 0,
      radiusBottomLeft: 0,
      type: 'background-textbox',
      version: '7.2.0',
      left: 0.03209876543209877,
      top: 0.04351851851851852,
      fill: '#333333',
      stroke: null,
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: true,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: null,
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateAnchorX: 'center',
      _templateAnchorY: 'start'
    }
  ]
}

/** Новый заголовок для проверки редактирования текста после применения шаблона. */
export const PRODUCT_CARD_TEMPLATE_UPDATED_TITLE = 'НАУШНИКИ SONY'

/** Цвет фона, который должен быть применён как background-object, а не как обычный canvas-объект. */
export const PRODUCT_CARD_TEMPLATE_BACKGROUND_COLOR = '#fcf4ff'

/** Базовое разрешение для шаблона с текстом внутри фигуры. */
export const TEMPLATE_SHAPE_TEXT_BASE_RESOLUTION = {
  width: 810,
  height: 1080
} as const

/** Увеличенное разрешение для проверки масштаба текста внутри фигуры из шаблона. */
export const TEMPLATE_SHAPE_TEXT_LARGE_RESOLUTION = {
  width: 4096,
  height: 4096
} as const

/** Коэффициент масштабирования шаблона с текстом внутри фигуры на большом разрешении. */
export const TEMPLATE_SHAPE_TEXT_LARGE_SCALE = Math.min(
  TEMPLATE_SHAPE_TEXT_LARGE_RESOLUTION.width / TEMPLATE_SHAPE_TEXT_BASE_RESOLUTION.width,
  TEMPLATE_SHAPE_TEXT_LARGE_RESOLUTION.height / TEMPLATE_SHAPE_TEXT_BASE_RESOLUTION.height
)

/** Допуск для проверок масштаба текста внутри фигуры после применения шаблона. */
export const TEMPLATE_SHAPE_TEXT_SCALE_TOLERANCE = 1.5

/** Фигура с длинным текстом для проверки сохранения и повторного применения шаблона. */
export const TEMPLATE_SHAPE_LONG_TEXT_OPTIONS = {
  id: 'template-shape-long-text',
  left: 292,
  top: 814,
  width: 230,
  height: 124,
  shapeTextAutoExpand: false,
  text: 'Премиальное качество\nПремиальное качество',
  textStyle: {
    fontFamily: 'Exo 2',
    fontSize: 48,
    bold: true,
    color: '#333333'
  },
  fill: '#EBE4ED',
  rounding: 25,
  alignH: 'center',
  alignV: 'middle'
} as const

/** Фигура для проверки масштабирования текста внутри шаблона на другом разрешении. */
export const TEMPLATE_SHAPE_TEXT_SCALE_OPTIONS = {
  id: 'template-shape-text-scale',
  left: 292,
  top: 814,
  width: 230,
  height: 124,
  shapeTextAutoExpand: false,
  text: 'Премиум',
  textStyle: {
    fontFamily: 'Exo 2',
    fontSize: 24,
    bold: true,
    color: '#333333'
  },
  fill: '#EBE4ED',
  rounding: 25,
  alignH: 'center',
  alignV: 'middle'
} as const

/** Полный шаблон product card для e2e-проверок применения готового шаблона. */
export const PRODUCT_CARD_TEMPLATE: TemplateDefinition = {
  id: 'template-2',
  meta: {
    baseWidth: 810,
    baseHeight: 1080,
    positionsNormalized: true
  },
  objects: [
    {
      rx: 36,
      ry: 36,
      id: 'rect-AaC1NbVQpxv910CTixQ4J',
      format: 'svg',
      width: 714,
      height: 608,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      type: 'Rect',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.05864197530864197,
      top: 0.24228898148148148,
      fill: {
        type: 'linear',
        coords: {
          x1: 0,
          y1: 0,
          x2: 541.132,
          y2: 735.231
        },
        colorStops: [
          {
            offset: 1,
            color: 'rgb(181,29,252)',
            opacity: 1
          },
          {
            offset: 0,
            color: 'rgb(130,29,252)',
            opacity: 1
          }
        ],
        offsetX: 0,
        offsetY: 0,
        gradientUnits: 'pixels',
        gradientTransform: [
          1,
          0,
          0,
          1,
          0,
          0
        ]
      },
      stroke: null,
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: false,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      svgMarkup: `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="715"
          height="609"
          viewBox="0 0 715 609">
            <g transform="matrix(1 0 0 1 0 31.473)" id="rect-AaC1NbVQpxv910CTixQ4J"  >
<linearGradient
  id="SVGID_10"
  gradientUnits="userSpaceOnUse"
  gradientTransform="matrix(1 0 0 1 -357 -304)"
  x1="0"
  y1="0"
  x2="541.132"
  y2="735.231">
<stop offset="0%" style="stop-color:rgb(130,29,252);stop-opacity: 1"/>
<stop offset="100%" style="stop-color:rgb(181,29,252);stop-opacity: 1"/>
</linearGradient>
<rect
  style="
    stroke: none;
    stroke-width: 1;
    stroke-dasharray: none;
    stroke-linecap: butt;
    stroke-dashoffset: 0;
    stroke-linejoin: miter;
    stroke-miterlimit: 4;
    fill: url(#SVGID_10);
    fill-rule: nonzero;
    opacity: 1;"
  x="-357"
  y="-304"
  rx="36"
  ry="36"
  width="714"
  height="608" />
</g>

        </svg>
      `,
      _templateCenterX: 0.5,
      _templateCenterY: 0.5242334259259259,
      _templateAnchorX: 'center',
      _templateAnchorY: 'center'
    },
    {
      cropX: 0,
      cropY: 0,
      id: 'image-iyJ9s-3eqom83znFpeUod',
      customData: {
        handle: 'main-image'
      },
      format: 'png',
      width: 714,
      height: 714,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      type: 'Image',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.05946308641975308,
      top: 0.14657537037037038,
      fill: 'rgb(0,0,0)',
      stroke: null,
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: false,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      src: PRODUCT_CARD_TEMPLATE_IMAGE_SOURCE,
      crossOrigin: 'anonymous',
      filters: [],
      _templateCenterX: 0.5002038271604938,
      _templateCenterY: 0.477130925925926,
      _templateAnchorX: 'center',
      _templateAnchorY: 'center'
    },
    {
      fontSize: 48,
      fontWeight: 'bold',
      fontFamily: 'Exo 2',
      fontStyle: 'normal',
      lineHeight: 1.16,
      text: 'НАУШНИКИ BOSE',
      charSpacing: 0,
      textAlign: 'left',
      styles: [],
      pathStartOffset: 0,
      pathSide: 'left',
      pathAlign: 'baseline',
      underline: false,
      overline: false,
      linethrough: false,
      textBackgroundColor: null,
      direction: 'ltr',
      textDecorationThickness: 66.667,
      minWidth: 20,
      splitByGrapheme: false,
      id: 'background-textbox-7Tz_ae7P52Mm3afrC6Qme',
      customData: {
        handle: 'title',
        template: '{{text}}',
        variables: [
          {
            name: 'text',
            description: 'Заголовок товара',
            maxChars: 25
          }
        ]
      },
      width: 714,
      height: 54,
      editable: true,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      textCaseRaw: 'Наушники Bose',
      uppercase: true,
      autoExpand: false,
      backgroundOpacity: 1,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      radiusTopLeft: 0,
      radiusTopRight: 0,
      radiusBottomRight: 0,
      radiusBottomLeft: 0,
      type: 'background-textbox',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.05966987654320989,
      top: 0.044813240740740744,
      fill: '#333333',
      stroke: null,
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: true,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: null,
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.5004106172839506,
      _templateCenterY: 0.06981324074074075,
      _templateAnchorX: 'center',
      _templateAnchorY: 'start'
    },
    {
      fontSize: 36,
      fontWeight: 'normal',
      fontFamily: 'Exo 2',
      fontStyle: 'normal',
      lineHeight: 1.16,
      text: 'Беспроводные наушники с\nшумоподавлением',
      charSpacing: 0,
      textAlign: 'left',
      styles: [],
      pathStartOffset: 0,
      pathSide: 'left',
      pathAlign: 'baseline',
      underline: false,
      overline: false,
      linethrough: false,
      textBackgroundColor: null,
      direction: 'ltr',
      textDecorationThickness: 66.667,
      minWidth: 20,
      splitByGrapheme: false,
      id: 'background-textbox-4q5ljMYw8C_vNWoyQSOdX',
      customData: {
        handle: 'subtitle',
        template: '{{text}}',
        variables: [
          {
            name: 'text',
            description: 'Подзаголовок товара или краткое описание (например, удобные тапочки из натуральной кожи)',
            maxChars: 50
          }
        ]
      },
      width: 714,
      height: 88,
      editable: true,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      textCaseRaw: 'Беспроводные наушники с\nшумоподавлением',
      uppercase: false,
      autoExpand: false,
      backgroundOpacity: 1,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      radiusTopLeft: 0,
      radiusTopRight: 0,
      radiusBottomRight: 0,
      radiusBottomLeft: 0,
      type: 'background-textbox',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.05925925925925926,
      top: 0.10972222222222222,
      fill: '#848484',
      stroke: null,
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: true,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: null,
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.5,
      _templateCenterY: 0.15046296296296297,
      _templateAnchorX: 'center',
      _templateAnchorY: 'start'
    },
    {
      customData: {
        handle: 'characteristics-block-3',
        template: '{{value}}\n{{label}}',
        variables: [
          {
            name: 'value',
            description: 'Значение характеристики (например, HIRES)',
            maxChars: 8
          },
          {
            name: 'label',
            description: 'Название характеристики (например, Аудио)',
            maxChars: 16
          }
        ]
      },
      fontSize: 36,
      fontWeight: 'bold',
      fontFamily: 'Exo 2',
      fontStyle: 'normal',
      lineHeight: 1.16,
      text: 'HIRES\nАудио',
      charSpacing: 0,
      textAlign: 'center',
      styles: [
        {
          start: 5,
          end: 10,
          style: {
            fontFamily: 'Open Sans',
            fontSize: 24,
            fill: '#333333',
            fontWeight: 'normal'
          }
        }
      ],
      pathStartOffset: 0,
      pathSide: 'left',
      pathAlign: 'baseline',
      underline: false,
      overline: false,
      linethrough: false,
      textBackgroundColor: '',
      direction: 'ltr',
      textDecorationThickness: 66.667,
      minWidth: 20,
      splitByGrapheme: false,
      id: 'text-ylngpHc_otdFAsAntKJ8Z',
      width: 206,
      height: 74,
      editable: true,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      lineFontDefaults: {
        1: {
          fontFamily: 'Open Sans',
          fontSize: 24
        }
      },
      textCaseRaw: 'HIRES\nАудио',
      uppercase: false,
      autoExpand: false,
      backgroundOpacity: 1,
      paddingTop: 21,
      paddingRight: 12,
      paddingBottom: 30,
      paddingLeft: 12,
      radiusTopLeft: 24,
      radiusTopRight: 24,
      radiusBottomRight: 24,
      radiusBottomLeft: 24,
      type: 'background-textbox',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.6567901234567901,
      top: 0.8296296296296296,
      fill: '#333333',
      stroke: null,
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: true,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '#EBE4ED',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.7987654320987654,
      _templateCenterY: 0.8875,
      _templateAnchorX: 'end',
      _templateAnchorY: 'end'
    },
    {
      customData: {
        handle: 'characteristics-block-2',
        template: '{{value}}\n{{label}}',
        variables: [
          {
            name: 'value',
            description: 'Значение характеристики (например, 69)',
            maxChars: 8
          },
          {
            name: 'label',
            description: 'Название характеристики (например, Часов музыки)',
            maxChars: 16
          }
        ]
      },
      fontSize: 36,
      fontWeight: 'bold',
      fontFamily: 'Exo 2',
      fontStyle: 'normal',
      lineHeight: 1.16,
      text: '69\nЧасов музыки',
      charSpacing: 0,
      textAlign: 'center',
      styles: [
        {
          start: 2,
          end: 14,
          style: {
            fontFamily: 'Open Sans',
            fontSize: 24,
            fill: '#333333',
            fontWeight: 'normal'
          }
        }
      ],
      pathStartOffset: 0,
      pathSide: 'left',
      pathAlign: 'baseline',
      underline: false,
      overline: false,
      linethrough: false,
      textBackgroundColor: '',
      direction: 'ltr',
      textDecorationThickness: 66.667,
      minWidth: 20,
      splitByGrapheme: false,
      id: 'background-textbox-J6vGAXn67vn4oeAI5sdxm',
      width: 206,
      height: 74,
      editable: true,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      lineFontDefaults: {
        1: {
          fontFamily: 'Open Sans',
          fontSize: 24
        }
      },
      textCaseRaw: '69\nЧасов музыки',
      uppercase: false,
      autoExpand: false,
      backgroundOpacity: 1,
      paddingTop: 21,
      paddingRight: 12,
      paddingBottom: 30,
      paddingLeft: 12,
      radiusTopLeft: 24,
      radiusTopRight: 24,
      radiusBottomRight: 24,
      radiusBottomLeft: 24,
      type: 'background-textbox',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.35802469135802467,
      top: 0.8296296296296296,
      fill: '#333333',
      stroke: null,
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: true,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '#EBE4ED',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.5,
      _templateCenterY: 0.8875,
      _templateAnchorX: 'center',
      _templateAnchorY: 'end'
    },
    {
      customData: {
        handle: 'characteristics-block-1',
        template: '{{value}}\n{{label}}',
        variables: [
          {
            name: 'value',
            description: 'Значение характеристики (например, 5.4)',
            maxChars: 8
          },
          {
            name: 'label',
            description: 'Название характеристики (например, Bluetooth)',
            maxChars: 16
          }
        ]
      },
      fontSize: 36,
      fontWeight: 'bold',
      fontFamily: 'Exo 2',
      fontStyle: 'normal',
      lineHeight: 1.16,
      text: '5.4\nBluetooth',
      charSpacing: 0,
      textAlign: 'center',
      styles: [
        {
          start: 3,
          end: 12,
          style: {
            fontSize: 24,
            fontWeight: 'normal',
            fontFamily: 'Open Sans',
            fontStyle: 'normal',
            underline: false,
            overline: false,
            linethrough: false,
            stroke: null,
            strokeWidth: 0,
            fill: '#333333',
            deltaY: 0,
            textBackgroundColor: '',
            textDecorationThickness: 66.667
          }
        }
      ],
      pathStartOffset: 0,
      pathSide: 'left',
      pathAlign: 'baseline',
      underline: false,
      overline: false,
      linethrough: false,
      textBackgroundColor: '',
      direction: 'ltr',
      textDecorationThickness: 66.667,
      minWidth: 20,
      splitByGrapheme: false,
      id: 'background-textbox-J7AZqWBgTgzxt3Oc-8dOW',
      width: 206,
      height: 74,
      editable: true,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      lineFontDefaults: {
        1: {
          fontFamily: 'Open Sans',
          fontSize: 24
        }
      },
      textCaseRaw: '5.4\nBluetooth',
      uppercase: false,
      autoExpand: false,
      backgroundOpacity: 1,
      paddingTop: 21,
      paddingRight: 12,
      paddingBottom: 30,
      paddingLeft: 12,
      radiusTopLeft: 24,
      radiusTopRight: 24,
      radiusBottomRight: 24,
      radiusBottomLeft: 24,
      type: 'background-textbox',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.05925925925925926,
      top: 0.8296296296296296,
      fill: '#333333',
      stroke: null,
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: true,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '#EBE4ED',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.20123456790123456,
      _templateCenterY: 0.8875,
      _templateAnchorX: 'start',
      _templateAnchorY: 'end'
    },
    {
      rx: 0,
      ry: 0,
      id: 'background',
      backgroundId: 'background-GZy7ANceowMod8IleDgdC',
      customData: {},
      backgroundType: 'color',
      width: 100,
      height: 100,
      evented: false,
      selectable: false,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      type: 'Rect',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: -0.17333333333333345,
      top: -0.005000000000000084,
      fill: '#fcf4ff',
      stroke: null,
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: false,
      strokeMiterLimit: 4,
      scaleX: 10.8,
      scaleY: 10.8,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.5,
      _templateCenterY: 0.5,
      _templateAnchorX: 'center',
      _templateAnchorY: 'center'
    }
  ]
}

/** Базовое разрешение для e2e-проверок serializeSelection -> applyTemplate. */
export const TEMPLATE_ROUNDTRIP_BASE_RESOLUTION = {
  width: 512,
  height: 512
} as const

/** Увеличенное разрешение для проверки нормализованных позиций после roundtrip. */
export const TEMPLATE_ROUNDTRIP_EXPANDED_RESOLUTION = {
  width: 768,
  height: 768
} as const

/** Допуск для проверок позиций после serialize/apply на том же размере. */
export const TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE = 2

/** Допуск для проверок относительных позиций после serialize/apply на другом размере. */
export const TEMPLATE_ROUNDTRIP_RELATIVE_TOLERANCE = 0.025

/** Первая фигура для e2e-сценариев с несколькими выделенными объектами. */
export const TEMPLATE_ROUNDTRIP_LEFT_SHAPE = {
  id: 'template-roundtrip-left-shape',
  left: 116,
  top: 196,
  width: 142,
  height: 121,
  fill: '#22C55E'
} as const

/** Вторая фигура для e2e-сценариев с несколькими выделенными объектами. */
export const TEMPLATE_ROUNDTRIP_RIGHT_SHAPE = {
  id: 'template-roundtrip-right-shape',
  left: 305,
  top: 191,
  width: 127,
  height: 131,
  fill: '#EF4444'
} as const

/** Фигура для смешанного шаблона из shape и standalone text. */
export const TEMPLATE_ROUNDTRIP_MIXED_SHAPE = {
  id: 'template-roundtrip-mixed-shape',
  left: 72,
  top: 132,
  width: 188,
  height: 148,
  fill: '#2563EB'
} as const

/** Текст для смешанного шаблона из shape и standalone text. */
export const TEMPLATE_ROUNDTRIP_MIXED_TEXT = {
  id: 'template-roundtrip-mixed-text',
  text: 'Скидка 30%',
  left: 288,
  top: 168,
  originX: 'left',
  originY: 'top',
  fontSize: 48,
  color: '#111827'
} as const
