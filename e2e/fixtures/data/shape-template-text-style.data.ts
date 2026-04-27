import type { TemplateDefinition } from '../../types'

export const SHAPE_TEMPLATE_STANDARD_TEXT = '69\nЧасов музыки'

export const SHAPE_TEMPLATE_LONG_TEXT = 'Премиальное качество\nПремиальное качество'

export const SHAPE_TEMPLATE_THREE_LINE_TEXT = 'Премиальное качество\nПремиальное качество\nПремиальное качество'

export const SHAPE_TEMPLATE_FIRST_LINE_STYLE = {
  fontFamily: 'Exo 2',
  fontSize: 17.066666666666666,
  fill: '#333333',
  fontWeight: 'bold'
} as const

export const SHAPE_TEMPLATE_SECOND_LINE_STYLE = {
  fontFamily: 'Oswald',
  fontSize: 11.377777777777778,
  fill: '#333333',
  fontWeight: 'normal'
} as const

export const SHAPE_TEMPLATE_SECOND_LINE_WORD = 'качество'

export const SHAPE_TEMPLATE_SECOND_LINE_WORD_STYLE_UPDATE = {
  bold: true,
  italic: true,
  strikethrough: true,
  underline: true,
  strokeColor: '#ff0000',
  strokeWidth: 1
} as const

export const SHAPE_TEMPLATE_SECOND_LINE_WORD_EXPECTED_STYLE = {
  ...SHAPE_TEMPLATE_SECOND_LINE_STYLE,
  fontStyle: 'italic',
  fontWeight: 'bold',
  linethrough: true,
  stroke: '#ff0000',
  strokeWidth: 1,
  underline: true
} as const

const shapeTextTemplateRectNode = {
  rx: 7.466666666666667,
  ry: 7.466666666666667,
  id: 'rect-kKqdy1L8IXp3ZsEkmY8mZ',
  width: 109.037,
  height: 59.7333,
  originX: 'center',
  originY: 'center',
  evented: false,
  selectable: false,
  lockMovementX: false,
  lockMovementY: false,
  lockRotation: false,
  lockScalingX: false,
  lockScalingY: false,
  lockSkewingX: false,
  lockSkewingY: false,
  shapeNodeType: 'shape',
  type: 'Rect',
  version: '7.2.0',
  left: 0,
  top: 0,
  fill: '#EBE4ED',
  stroke: '#000000',
  strokeWidth: 0,
  strokeDashArray: null,
  strokeLineCap: 'round',
  strokeDashOffset: 0,
  strokeLineJoin: 'round',
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
  backgroundColor: '',
  fillRule: 'nonzero',
  paintFirst: 'fill',
  globalCompositeOperation: 'source-over',
  skewX: 0,
  skewY: 0
}

const shapeTextTemplateTextNodeBase = {
  fontSize: 22.755555555555556,
  fontWeight: 'bold',
  fontFamily: 'Arial',
  fontStyle: 'normal',
  lineHeight: 1.16,
  text: '69\nЧасов музыки',
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
  id: 'background-textbox-KctuDksC1CjBhChWsfT5C',
  width: 109,
  height: 35,
  originX: 'left',
  originY: 'top',
  editable: true,
  evented: false,
  selectable: false,
  lockMovementX: false,
  lockMovementY: false,
  lockRotation: false,
  lockScalingX: false,
  lockScalingY: false,
  lockSkewingX: false,
  lockSkewingY: false,
  lineFontDefaults: {
    0: {
      fontFamily: 'Exo 2',
      fontSize: 17.066666666666666,
      fill: '#333333',
      fontWeight: 'bold'
    },
    1: {
      fontFamily: 'Oswald',
      fontSize: 11.377777777777778,
      fill: '#333333',
      fontWeight: 'normal'
    }
  },
  textCaseRaw: '69\nЧасов музыки',
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
  shapeNodeType: 'text',
  type: 'background-textbox',
  version: '7.2.0',
  left: -54.5185,
  top: -17.5,
  fill: '#000000',
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
  skewY: 0
}

const shapeTextTemplateGroupBase = {
  subTargetCheck: true,
  interactive: true,
  id: 'shape-group-L0XKsuWYytLVaGdCxzg8K',
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
  width: 109.037,
  height: 59.7333,
  originX: 'right',
  originY: 0.5,
  evented: true,
  selectable: true,
  lockMovementX: false,
  lockMovementY: false,
  lockRotation: false,
  lockScalingX: false,
  lockScalingY: false,
  lockSkewingX: false,
  lockSkewingY: false,
  shapeComposite: true,
  shapePresetKey: 'square',
  shapeBaseWidth: 109.03703703703704,
  shapeBaseHeight: 59.733333333333334,
  shapeManualBaseWidth: 109.03703703703704,
  shapeManualBaseHeight: 59.733333333333334,
  shapeReplaceBoxWidth: 109.03703703703704,
  shapeReplaceBoxHeight: 59.733333333333334,
  shapeTextAutoExpand: false,
  shapeAlignHorizontal: 'center',
  shapeAlignVertical: 'middle',
  shapePaddingTop: 0,
  shapePaddingRight: 0,
  shapePaddingBottom: 0,
  shapePaddingLeft: 0,
  shapeFill: '#EBE4ED',
  shapeStroke: '#000000',
  shapeStrokeWidth: 0,
  shapeStrokeDashArray: null,
  shapeOpacity: 1,
  shapeRounding: 25,
  type: 'shape-group',
  version: '7.2.0',
  left: 0.607421875,
  top: 0.5,
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
  layoutManager: {
    type: 'layoutManager',
    strategy: 'fit-content'
  },
  objects: [shapeTextTemplateRectNode, shapeTextTemplateTextNodeBase],
  _templateAnchorX: 'center',
  _templateAnchorY: 'center'
}

export function replaceTextInsideShapeTemplate(params: {
  template: TemplateDefinition
  text: string
}): TemplateDefinition {
  const {
    template,
    text
  } = params

  let textNodeUpdated = false

  const objects = template.objects.map((object) => {
    if (object.type !== 'shape-group' || !Array.isArray(object.objects)) {
      return object
    }

    const nextObjects = object.objects.map((nestedObject) => {
      if (nestedObject.shapeNodeType !== 'text') {
        return nestedObject
      }

      textNodeUpdated = true

      return {
        ...nestedObject,
        text
      }
    })

    return {
      ...object,
      objects: nextObjects
    }
  })

  if (!textNodeUpdated) {
    throw new Error('В шаблоне должен существовать текст внутри фигуры для замены текста')
  }

  return {
    ...template,
    objects
  }
}

export const SHAPE_TEMPLATE_WITH_STANDARD_TEXT_IN_FIGURE = {
  id: 'template-LLpPBJZT99sgNHtvJ36HJ-standard-text',
  meta: {
    baseWidth: 512,
    baseHeight: 512,
    positionsNormalized: true
  },
  objects: [shapeTextTemplateGroupBase]
} satisfies TemplateDefinition

export const SHAPE_TEMPLATE_WITH_LONG_TEXT_IN_FIGURE = {
  id: 'template-LLpPBJZT99sgNHtvJ36HJ',
  meta: {
    baseWidth: 512,
    baseHeight: 512,
    positionsNormalized: true
  },
  objects: [
    {
      ...shapeTextTemplateGroupBase,
      objects: [
        shapeTextTemplateRectNode,
        {
          ...shapeTextTemplateTextNodeBase,
          text: SHAPE_TEMPLATE_LONG_TEXT
        }
      ]
    }
  ]
} satisfies TemplateDefinition

export const SHAPE_TEMPLATE_WITH_THREE_LINE_TEXT_IN_FIGURE = {
  id: 'template-LLpPBJZT99sgNHtvJ36HJ-three-lines',
  meta: {
    baseWidth: 512,
    baseHeight: 512,
    positionsNormalized: true
  },
  objects: [
    {
      ...shapeTextTemplateGroupBase,
      objects: [
        shapeTextTemplateRectNode,
        {
          ...shapeTextTemplateTextNodeBase,
          text: SHAPE_TEMPLATE_THREE_LINE_TEXT
        }
      ]
    }
  ]
} satisfies TemplateDefinition
