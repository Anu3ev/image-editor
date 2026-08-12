import type {
  TemplateDefinition,
  TextAddParams,
  TextInlineStyle,
  TextLineDefaults,
  TextResizeGuideAxis,
  TextResizeSide,
  TextScaleDragStep,
  TextScaleHandleCase
} from '../../types'

/** Один браузерный сценарий боковой ручки и направляющей в координатах сцены. */
export type TextSideResizeControlCase = Readonly<{
  angle: number
  axis: TextResizeGuideAxis
  guideType: 'horizontal' | 'vertical'
  side: TextResizeSide
  title: string
}>

/** Обе боковые ручки без поворота и после поворота на 90 градусов. */
export const TEXT_SIDE_RESIZE_CONTROL_CASES: readonly TextSideResizeControlCase[] = Object.freeze([
  {
    angle: 0,
    axis: 'x',
    guideType: 'vertical',
    side: 'right',
    title: 'правая ручка обычного текста прилипает к вертикальной направляющей'
  },
  {
    angle: 0,
    axis: 'x',
    guideType: 'vertical',
    side: 'left',
    title: 'левая ручка обычного текста прилипает к вертикальной направляющей'
  },
  {
    angle: 90,
    axis: 'y',
    guideType: 'horizontal',
    side: 'right',
    title: 'правая ручка повёрнутого текста прилипает к горизонтальной направляющей'
  },
  {
    angle: 90,
    axis: 'y',
    guideType: 'horizontal',
    side: 'left',
    title: 'левая ручка повёрнутого текста прилипает к горизонтальной направляющей'
  }
])

/** Микродвижения указателя внутри зоны удержания повёрнутого текста. */
export const TEXT_SIDE_RESIZE_HOLD_STEPS = Object.freeze([
  Object.freeze({ deltaX: 1, deltaY: 0 }),
  Object.freeze({ deltaX: 1, deltaY: 0 }),
  Object.freeze({ deltaX: 1, deltaY: 0 })
])

/** Допуски проверок изменения ширины отдельного текста. */
export const TEXT_RESIZING_TOLERANCE = {
  anchor: 1.5,
  mouseupJump: 1.5
}

/** Целевая внутренняя ширина текста для сценариев с переносом строк. */
export const TEXT_RESIZING_REGRESSION_WIDTH = 125

/** Ширина меньше самой длинной строки для проверки упора боковой ручки. */
export const TEXT_RESIZING_MINIMUM_WIDTH_PROBE = 20

/** Дальнейшее движение боковой ручки после упора в минимальную ширину. */
export const TEXT_RESIZING_MINIMUM_WIDTH_HOLD_DELTA = 8

/** Настройки текста из сценария с упором боковой ручки в минимальную ширину строки. */
export const TEXT_RESIZING_MINIMUM_WIDTH_ADD_OPTIONS: TextAddParams = {
  text: 'Новый текст',
  autoExpand: false,
  fontFamily: 'Open Sans',
  fontSize: 48,
  lineHeight: 1.16,
  width: 240,
  left: 281,
  top: 352
}

/** Целевая внутренняя ширина текста для сценариев со скейлингом после ручного сужения. */
export const TEXT_SCALING_REGRESSION_WIDTH = 180

/** Коэффициент вертикального скейлинга для проверки сохранения ручной ширины. */
export const TEXT_VERTICAL_SCALING_FACTOR = 1.6

/** Коэффициенты диагонального скейлинга для проверки новой базовой ширины. */
export const TEXT_DIAGONAL_SCALING_FACTORS = {
  scaleX: 1.35,
  scaleY: 1.35
}

/** Коэффициент горизонтального скейлинга для проверки текущей базовой ширины. */
export const TEXT_HORIZONTAL_SCALING_FACTOR = 1.35

/** Последовательность сужения текста скейлингом для проверки промежуточных состояний. */
export const TEXT_HORIZONTAL_SCALING_NARROW_STEPS = [
  0.92,
  0.62,
  0.42
]

/** Создаёт последовательность движений указателя для сужения текста за угловую ручку. */
const createTextScaleDragSteps = ({
  deltaX,
  deltaY,
  count
}: {
  deltaX: number
  deltaY: number
  count: number
}): TextScaleDragStep[] => {
  const steps: TextScaleDragStep[] = []

  for (let index = 0; index < count; index += 1) {
    steps.push({
      deltaX,
      deltaY,
      pointerSteps: 1
    })
  }

  return steps
}

/** Сценарии сужения текста настоящей мышью для проверки переносов строк на каждом движении. */
export const TEXT_DIAGONAL_SCALING_NARROW_DRAG_CASES = [
  {
    title: 'правый верхний угол',
    corner: 'tr',
    steps: createTextScaleDragSteps({
      deltaX: -7,
      deltaY: 3,
      count: 7
    })
  },
  {
    title: 'правый нижний угол',
    corner: 'br',
    steps: createTextScaleDragSteps({
      deltaX: -7,
      deltaY: -3,
      count: 7
    })
  },
  {
    title: 'левый верхний угол',
    corner: 'tl',
    steps: createTextScaleDragSteps({
      deltaX: 7,
      deltaY: 3,
      count: 7
    })
  },
  {
    title: 'левый нижний угол',
    corner: 'bl',
    steps: createTextScaleDragSteps({
      deltaX: 7,
      deltaY: -3,
      count: 7
    })
  }
] satisfies TextScaleHandleCase[]

/** Минимальный размер шрифта при скейлинге отдельного текста. */
export const TEXT_SCALING_MINIMUM_FONT_SIZE = 8

/** Коэффициент для проверки дальнейшего сужения после упора в минимум без отпускания ручки. */
export const TEXT_DIAGONAL_MINIMUM_PROBE_SCALING_FACTOR = 0.05

/** Коэффициент для возврата текста назад без завершения текущего диагонального скейлинга. */
export const TEXT_DIAGONAL_RECOVERY_SCALING_FACTOR = 1.35

/** Коэффициент для повторного увеличения текста после фиксации минимального размера. */
export const TEXT_DIAGONAL_REEXPAND_SCALING_FACTOR = 1.5

/** Конфигурация однострочного текста для проверки упора в минимум при диагональном скейлинге. */
export const TEXT_MINIMUM_SCALING_ADD_OPTIONS: TextAddParams = {
  text: 'TEST',
  autoExpand: false,
  fontFamily: 'Exo 2',
  fontSize: 12,
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
  width: 120,
  left: 281,
  top: 352
}

/** Настройки отдельного текста, воспроизводящие ошибку переноса строк при сужении. */
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

/** Диапазон второй строки regression text-объекта для проверки inline-стилей. */
export const TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION = {
  start: 3,
  end: 15
}

/** JSON шаблона с отдельным текстом из сценария с переносом строк при сужении. */
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

/** JSON шаблона из сценария, где отдельный текст дрожит при сужении за правый верхний угол. */
export const TEXT_TOP_RIGHT_SCALING_REGRESSION_TEMPLATE: TemplateDefinition = {
  id: 'template-li-6iWreVuR-zClIK1_iN',
  meta: {
    baseWidth: 512,
    baseHeight: 512,
    positionsNormalized: true
  },
  objects: [
    {
      fontSize: 54.28960333834419,
      fontWeight: 'normal',
      fontFamily: 'Arial',
      fontStyle: 'normal',
      lineHeight: 1.16,
      text: 'Новый текст',
      charSpacing: 0,
      textAlign: 'left',
      styles: [],
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
      id: 'background-textbox-X2r5MeYF_jIApB8Xk2RHd',
      width: 313,
      height: 133,
      originX: 'center',
      originY: 'center',
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
      textCaseRaw: 'Новый текст',
      uppercase: false,
      autoExpand: true,
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
      left: 0.5048828125000002,
      top: 0.7562030782926384,
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
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateAnchorX: 'center',
      _templateAnchorY: 'end'
    }
  ]
}
