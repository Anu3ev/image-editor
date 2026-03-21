import type {
  TemplateDefinition,
  TextAddParams,
  TextInlineStyle,
  TextLineDefaults
} from '../../types'

/** Допуски для standalone text resize assertions. */
export const TEXT_RESIZING_TOLERANCE = {
  anchor: 1.5,
  mouseupJump: 1.5
}

/** Целевая внутренняя ширина текста для reflow-сценариев resize. */
export const TEXT_RESIZING_REGRESSION_WIDTH = 125

/** Конфигурация standalone text-объекта, воспроизводящая resize/reflow регрессию. */
export const TEXT_RESIZING_REGRESSION_ADD_OPTIONS: TextAddParams = {
  text: '69\nЧасов музыки',
  autoExpand: false,
  fontFamily: 'Exo 2',
  fontSize: 36,
  bold: true,
  lineHeight: 1.16,
  align: 'center',
  color: '#333333',
  backgroundColor: '#EBE4ED',
  backgroundOpacity: 1,
  paddingTop: 21,
  paddingRight: 12,
  paddingBottom: 30,
  paddingLeft: 12,
  radiusTopLeft: 24,
  radiusTopRight: 24,
  radiusBottomRight: 24,
  radiusBottomLeft: 24,
  width: 333,
  left: 281,
  top: 352
}

/** Inline-стиль второй строки regression text-объекта. */
export const TEXT_RESIZING_REGRESSION_SECOND_LINE_STYLE: TextInlineStyle = {
  fontFamily: 'Open Sans',
  fontSize: 24,
  fill: '#333333',
  fontWeight: 'normal'
}

/** Дефолтные стили строки для regression text-объекта. */
export const TEXT_RESIZING_REGRESSION_LINE_DEFAULTS: TextLineDefaults = {
  1: {
    fontFamily: 'Open Sans',
    fontSize: 24
  }
}

/** Template JSON standalone text-объекта из регрессии resize/reflow. */
export const TEXT_RESIZING_REGRESSION_TEMPLATE: TemplateDefinition = {
  id: 'template-tpKVnnCeBLwc7PcNTWW21',
  meta: {
    baseWidth: 810,
    baseHeight: 1080,
    positionsNormalized: true
  },
  objects: [
    {
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
      id: 'background-textbox-RK0CZZ4-rOeh7j6QvT53E',
      customData: {
        handle: 'characteristics-block-2',
        template: '{{value}}\n{{label}}',
        variables: [
          {
            name: 'value',
            description: 'Значение характеристики',
            maxChars: 8
          },
          {
            name: 'label',
            description: 'Название характеристики',
            maxChars: 16
          }
        ]
      },
      width: 333,
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
      version: '7.2.0',
      originX: 'left',
      originY: 'top',
      left: 0.2802469135802469,
      top: 0.44212962962962965,
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
      _templateCenterX: 0.5006172839506173,
      _templateCenterY: 0.5,
      _templateAnchorX: 'center',
      _templateAnchorY: 'center'
    }
  ]
}
