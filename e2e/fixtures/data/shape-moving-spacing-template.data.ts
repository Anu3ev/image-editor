/* eslint-disable quote-props, quotes -- Базовый объект дословно сохраняет сериализованные данные пользователя. */
import type {
  TemplateDefinition,
  TemplateObjectData
} from '../../types'

/** Якорь нормализованного положения одного шейпа в шаблоне. */
type ShapeTemplateAnchor = 'start' | 'center' | 'end'

/** Изменяемая геометрия и идентификаторы одного сериализованного шейпа. */
type ShapeTemplateParams = {
  id: string
  shapeNodeId: string
  textNodeId: string
  size: number
  baseSize?: number
  left: number
  top: number
  anchorX: ShapeTemplateAnchor
  anchorY: ShapeTemplateAnchor
}

/** Полная сериализованная форма шейпа из приложенного шаблона. */
const BASE_SPACING_SHAPE = {
  "subTargetCheck": true,
  "interactive": true,
  "id": "shape-TlZBnsY4dzsQoUo0IZvIV",
  "width": 102,
  "height": 102,
  "originX": "center",
  "originY": "center",
  "evented": true,
  "selectable": true,
  "lockMovementX": false,
  "lockMovementY": false,
  "lockRotation": false,
  "lockScalingX": false,
  "lockScalingY": false,
  "lockSkewingX": false,
  "lockSkewingY": false,
  "shapeComposite": true,
  "shapePresetKey": "square",
  "shapeBaseWidth": 102,
  "shapeBaseHeight": 102,
  "shapeManualBaseWidth": 102,
  "shapeManualBaseHeight": 102,
  "shapeReplaceBoxWidth": 102,
  "shapeReplaceBoxHeight": 102,
  "shapeTextAutoExpand": false,
  "shapeLayoutSignature": "v1:ab:1t45nzk:1iag7rh",
  "shapeAlignHorizontal": "center",
  "shapeAlignVertical": "middle",
  "shapePaddingTop": 0,
  "shapePaddingRight": 0,
  "shapePaddingBottom": 0,
  "shapePaddingLeft": 0,
  "shapeFill": "#B0B5BF",
  "shapeStroke": "#000000",
  "shapeStrokeWidth": 0,
  "shapeStrokeDashArray": null,
  "shapeOpacity": 1,
  "shapeRounding": 0,
  "type": "shape-group",
  "version": "7.4.0",
  "left": 0.232421875,
  "top": 0.53125,
  "fill": "rgb(0,0,0)",
  "stroke": null,
  "strokeWidth": 0,
  "strokeDashArray": null,
  "strokeLineCap": "butt",
  "strokeDashOffset": 0,
  "strokeLineJoin": "miter",
  "strokeUniform": false,
  "strokeMiterLimit": 4,
  "scaleX": 1,
  "scaleY": 1,
  "angle": 0,
  "flipX": false,
  "flipY": false,
  "opacity": 1,
  "shadow": null,
  "visible": true,
  "backgroundColor": "",
  "fillRule": "nonzero",
  "paintFirst": "fill",
  "globalCompositeOperation": "source-over",
  "skewX": 0,
  "skewY": 0,
  "layoutManager": {
    "type": "layoutManager",
    "strategy": "fit-content"
  },
  "objects": [
    {
      "rx": 0,
      "ry": 0,
      "id": "rect-HCMyAYfa6HxqsrfZuXN0d",
      "width": 102,
      "height": 102,
      "originX": "center",
      "originY": "center",
      "evented": false,
      "selectable": false,
      "lockMovementX": false,
      "lockMovementY": false,
      "lockRotation": false,
      "lockScalingX": false,
      "lockScalingY": false,
      "lockSkewingX": false,
      "lockSkewingY": false,
      "shapeNodeType": "shape",
      "type": "Rect",
      "version": "7.4.0",
      "left": 0,
      "top": 0,
      "fill": "#B0B5BF",
      "stroke": "#000000",
      "strokeWidth": 0,
      "strokeDashArray": null,
      "strokeLineCap": "round",
      "strokeDashOffset": 0,
      "strokeLineJoin": "round",
      "strokeUniform": true,
      "strokeMiterLimit": 4,
      "scaleX": 1,
      "scaleY": 1,
      "angle": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "shadow": null,
      "visible": true,
      "backgroundColor": "",
      "fillRule": "nonzero",
      "paintFirst": "fill",
      "globalCompositeOperation": "source-over",
      "skewX": 0,
      "skewY": 0
    },
    {
      "fontSize": 48,
      "fontWeight": "normal",
      "fontFamily": "Arial",
      "fontStyle": "normal",
      "lineHeight": 1.16,
      "text": "",
      "charSpacing": 0,
      "textAlign": "center",
      "styles": [],
      "pathStartOffset": 0,
      "pathSide": "left",
      "pathAlign": "baseline",
      "underline": false,
      "overline": false,
      "linethrough": false,
      "textBackgroundColor": null,
      "direction": "ltr",
      "textDecorationThickness": 66.667,
      "minWidth": 20,
      "splitByGrapheme": false,
      "id": "background-textbox-tJRgbzoGhhunuUElPk73n",
      "width": 102,
      "height": 54,
      "originX": "left",
      "originY": "top",
      "editable": true,
      "evented": false,
      "selectable": false,
      "lockMovementX": false,
      "lockMovementY": false,
      "lockRotation": false,
      "lockScalingX": false,
      "lockScalingY": false,
      "lockSkewingX": false,
      "lockSkewingY": false,
      "lineFontDefaults": {
        "0": {
          "fontFamily": "Arial",
          "fontSize": 48,
          "fontWeight": "normal",
          "fontStyle": "normal",
          "underline": false,
          "linethrough": false,
          "fill": "#000000"
        }
      },
      "textCaseRaw": "",
      "uppercase": false,
      "autoExpand": false,
      "backgroundOpacity": 1,
      "paddingTop": 0,
      "paddingRight": 0,
      "paddingBottom": 0,
      "paddingLeft": 0,
      "radiusTopLeft": 0,
      "radiusTopRight": 0,
      "radiusBottomRight": 0,
      "radiusBottomLeft": 0,
      "shapeNodeType": "text",
      "type": "background-textbox",
      "version": "7.4.0",
      "left": -51,
      "top": -27,
      "fill": "#000000",
      "stroke": null,
      "strokeWidth": 0,
      "strokeDashArray": null,
      "strokeLineCap": "butt",
      "strokeDashOffset": 0,
      "strokeLineJoin": "miter",
      "strokeUniform": true,
      "strokeMiterLimit": 4,
      "scaleX": 1,
      "scaleY": 1,
      "angle": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "shadow": null,
      "visible": true,
      "backgroundColor": null,
      "fillRule": "nonzero",
      "paintFirst": "fill",
      "globalCompositeOperation": "source-over",
      "skewX": 0,
      "skewY": 0
    }
  ],
  "_templateAnchorX": "start",
  "_templateAnchorY": "center"
} satisfies TemplateObjectData

/** Собирает конечную сериализованную форму одного шейпа из шаблона. */
function createSpacingShape({
  id,
  shapeNodeId,
  textNodeId,
  size,
  baseSize = size,
  left,
  top,
  anchorX,
  anchorY
}: ShapeTemplateParams): TemplateObjectData {
  const shape = structuredClone(BASE_SPACING_SHAPE)
  const nodes = shape.objects
  if (!Array.isArray(nodes) || nodes.length !== 2) {
    throw new Error('Шейп из шаблона должен содержать фигуру и текст')
  }

  const [shapeNode, textNode] = nodes
  if (!shapeNode || !textNode || typeof shapeNode !== 'object' || typeof textNode !== 'object') {
    throw new Error('Вложенные узлы шейпа должны быть объектами')
  }

  Object.assign(shape, {
    id,
    width: size,
    height: size,
    shapeBaseWidth: baseSize,
    shapeBaseHeight: baseSize,
    shapeManualBaseWidth: baseSize,
    shapeManualBaseHeight: baseSize,
    shapeReplaceBoxWidth: baseSize,
    shapeReplaceBoxHeight: baseSize,
    left,
    top,
    _templateAnchorX: anchorX,
    _templateAnchorY: anchorY
  })
  Object.assign(shapeNode, { id: shapeNodeId, width: size, height: size })
  Object.assign(textNode, { id: textNodeId, width: size, left: -(size / 2) })

  return shape
}

/** Первый пользовательский шаблон со средним шейпом 79 × 79. */
export const MIDDLE_SHAPE_79_SPACING_TEMPLATE = {
  id: 'template-G6ndKV6n9BeZ9osWdB4fW',
  meta: {
    baseWidth: 512,
    baseHeight: 512,
    positionsNormalized: true
  },
  objects: [
    createSpacingShape({
      id: 'shape-TlZBnsY4dzsQoUo0IZvIV',
      shapeNodeId: 'rect-HCMyAYfa6HxqsrfZuXN0d',
      textNodeId: 'background-textbox-tJRgbzoGhhunuUElPk73n',
      size: 102,
      left: 0.099609375,
      top: 0.677734375,
      anchorX: 'start',
      anchorY: 'end'
    }),
    createSpacingShape({
      id: 'shape-group-6glnV4GBnDFsCgigyFZnk',
      shapeNodeId: 'rect-PmO2X6SIDaR2kcFM4vTYM',
      textNodeId: 'background-textbox-TyxBw2p9vUqkIlCCGEEgV',
      size: 79,
      left: 0.384765625,
      top: 0.693359375,
      anchorX: 'start',
      anchorY: 'end'
    }),
    createSpacingShape({
      id: 'shape-group-laj1pwPJepBHXWWjd164H',
      shapeNodeId: 'rect-WA1OwjSJBg6P7BPEKs3Ni',
      textNodeId: 'background-textbox-SZn5_iiZeYGlYCsXw6KrY',
      size: 102,
      left: 0.646484375,
      top: 0.693359375,
      anchorX: 'end',
      anchorY: 'end'
    })
  ]
} satisfies TemplateDefinition

/** Второй пользовательский шаблон со средним шейпом 85 × 85. */
export const MIDDLE_SHAPE_85_SPACING_TEMPLATE = {
  id: 'template-lhr3pBQZl-kjdIa1Mcjpn',
  meta: {
    baseWidth: 512,
    baseHeight: 512,
    positionsNormalized: true
  },
  objects: [
    createSpacingShape({
      id: 'shape-TlZBnsY4dzsQoUo0IZvIV',
      shapeNodeId: 'rect-HCMyAYfa6HxqsrfZuXN0d',
      textNodeId: 'background-textbox-tJRgbzoGhhunuUElPk73n',
      size: 102,
      left: 0.232421875,
      top: 0.53125,
      anchorX: 'start',
      anchorY: 'center'
    }),
    createSpacingShape({
      id: 'shape-group-6glnV4GBnDFsCgigyFZnk',
      shapeNodeId: 'rect-PmO2X6SIDaR2kcFM4vTYM',
      textNodeId: 'background-textbox-TyxBw2p9vUqkIlCCGEEgV',
      size: 85,
      baseSize: 84.99999999999999,
      left: 0.51953125,
      top: 0.546875,
      anchorX: 'center',
      anchorY: 'center'
    }),
    createSpacingShape({
      id: 'shape-group-laj1pwPJepBHXWWjd164H',
      shapeNodeId: 'rect-WA1OwjSJBg6P7BPEKs3Ni',
      textNodeId: 'background-textbox-SZn5_iiZeYGlYCsXw6KrY',
      size: 102,
      left: 0.822265625,
      top: 0.546875,
      anchorX: 'end',
      anchorY: 'center'
    })
  ]
} satisfies TemplateDefinition

/** Пользовательский шаблон с четырьмя шейпами и тремя интервалами 47,25 пикселя. */
export const FOUR_SHAPE_EQUAL_SPACING_TEMPLATE = {
  id: 'template-6TbBfhjIdE5FEfuIqDfUh',
  meta: {
    baseWidth: 512,
    baseHeight: 512,
    positionsNormalized: true
  },
  objects: [
    createSpacingShape({
      id: 'shape-group-hF3dwO0hrj9dJZktskbya',
      shapeNodeId: 'rect-abV6WiBXfoGQo9flc4BQb',
      textNodeId: 'background-textbox-8f3WRd1xvQdyrxCVJyvO9',
      size: 102,
      left: 0.041259765625,
      top: 0.546875,
      anchorX: 'start',
      anchorY: 'center'
    }),
    createSpacingShape({
      id: 'shape-group-VrWkQKahgX7-pf8s38470',
      shapeNodeId: 'rect-zvlZvWaJnHuKA1Ohgbzxz',
      textNodeId: 'background-textbox-iqrvAgSpnlZJUfBmv3oHt',
      size: 87.25,
      left: 0.318359375,
      top: 0.546875,
      anchorX: 'start',
      anchorY: 'center'
    }),
    createSpacingShape({
      id: 'shape-group-01nYLcGZN0v0qbB7Kn70b',
      shapeNodeId: 'rect-3Ejkk4b1RRW1WwU2xeTfN',
      textNodeId: 'background-textbox-ih1gV87DjvHfFBISG2q0C',
      size: 100.625,
      left: 0.5941162109375,
      top: 0.5482177734375,
      anchorX: 'end',
      anchorY: 'center'
    }),
    createSpacingShape({
      id: 'shape-group-bc9myWPHG2zUhOiydsTe7',
      shapeNodeId: 'rect--y7Am69QEEEXw9UVfp8wy',
      textNodeId: 'background-textbox-qi73vTKShtMagDsxGWvxX',
      size: 102,
      left: 0.88427734375,
      top: 0.546875,
      anchorX: 'end',
      anchorY: 'center'
    })
  ]
} satisfies TemplateDefinition

/** Вертикальная транспозиция пользовательского шаблона с тремя интервалами 47,25 пикселя. */
export const FOUR_SHAPE_VERTICAL_EQUAL_SPACING_TEMPLATE = {
  id: 'template-four-shape-vertical-equal-spacing',
  meta: {
    baseWidth: 512,
    baseHeight: 512,
    positionsNormalized: true
  },
  objects: [
    createSpacingShape({
      id: 'vertical-shape-group-1',
      shapeNodeId: 'vertical-rect-1',
      textNodeId: 'vertical-background-textbox-1',
      size: 102,
      left: 0.546875,
      top: 0.041259765625,
      anchorX: 'center',
      anchorY: 'start'
    }),
    createSpacingShape({
      id: 'vertical-shape-group-2',
      shapeNodeId: 'vertical-rect-2',
      textNodeId: 'vertical-background-textbox-2',
      size: 87.25,
      left: 0.546875,
      top: 0.318359375,
      anchorX: 'center',
      anchorY: 'start'
    }),
    createSpacingShape({
      id: 'vertical-shape-group-3',
      shapeNodeId: 'vertical-rect-3',
      textNodeId: 'vertical-background-textbox-3',
      size: 100.625,
      left: 0.5482177734375,
      top: 0.5941162109375,
      anchorX: 'center',
      anchorY: 'end'
    }),
    createSpacingShape({
      id: 'vertical-shape-group-4',
      shapeNodeId: 'vertical-rect-4',
      textNodeId: 'vertical-background-textbox-4',
      size: 102,
      left: 0.546875,
      top: 0.88427734375,
      anchorX: 'center',
      anchorY: 'end'
    })
  ]
} satisfies TemplateDefinition
