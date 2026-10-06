import type {
  TemplateDefinition,
  TextAddParams,
  TextCornerScaleHandle,
  TextInlineStyle,
  TextLineDefaults,
  TextResizeGuideAxis,
  TextResizeSide,
  TextScaleDragStep,
  TextScaleHandleCase
} from '../../types'

/** Horizontal boundary controlled by the text's corner handle. */
type TextCornerScaleHorizontalEdge = 'boundsLeft' | 'boundsRight'

/** Vertical boundary controlled by the text's corner handle. */
type TextCornerScaleVerticalEdge = 'boundsTop' | 'boundsBottom'

/** Coordinate of the text's fixed corner during scaling. */
type TextCornerScaleFixedPoint = Readonly<{
  x: 'leftTopX' | 'leftBottomX' | 'rightTopX' | 'rightBottomX'
  y: 'leftTopY' | 'leftBottomY' | 'rightTopY' | 'rightBottomY'
}>

/** Observable contract of one standalone-text corner handle. */
export type TextCornerScaleControlCase = Readonly<{
  corner: TextCornerScaleHandle
  fixedPoint: TextCornerScaleFixedPoint
  movingEdgeX: TextCornerScaleHorizontalEdge
  movingEdgeY: TextCornerScaleVerticalEdge
  outwardStep: Readonly<{
    deltaX: number
    deltaY: number
  }>
  title: string
}>

/** All standalone-text corner handles and their opposite fixed points. */
export const TEXT_CORNER_SCALE_CONTROL_CASES = [
  {
    corner: 'tl',
    fixedPoint: { x: 'rightBottomX', y: 'rightBottomY' },
    movingEdgeX: 'boundsLeft',
    movingEdgeY: 'boundsTop',
    outwardStep: { deltaX: -24, deltaY: -24 },
    title: 'левая верхняя ручка прилипает по обеим осям'
  },
  {
    corner: 'tr',
    fixedPoint: { x: 'leftBottomX', y: 'leftBottomY' },
    movingEdgeX: 'boundsRight',
    movingEdgeY: 'boundsTop',
    outwardStep: { deltaX: 24, deltaY: -24 },
    title: 'правая верхняя ручка прилипает по обеим осям'
  },
  {
    corner: 'bl',
    fixedPoint: { x: 'rightTopX', y: 'rightTopY' },
    movingEdgeX: 'boundsLeft',
    movingEdgeY: 'boundsBottom',
    outwardStep: { deltaX: -24, deltaY: 24 },
    title: 'левая нижняя ручка прилипает по обеим осям'
  },
  {
    corner: 'br',
    fixedPoint: { x: 'leftTopX', y: 'leftTopY' },
    movingEdgeX: 'boundsRight',
    movingEdgeY: 'boundsBottom',
    outwardStep: { deltaX: 24, deltaY: 24 },
    title: 'правая нижняя ручка прилипает по обеим осям'
  }
] as const satisfies readonly TextCornerScaleControlCase[]

/** Factor that distinguishes the target snap from the initial text size. */
export const TEXT_CORNER_SCALE_TARGET_MULTIPLIER = 1.25

/** Allowed difference between the final text edge and the selected guide in scene coordinates. */
export const TEXT_CORNER_SCALE_GUIDE_TOLERANCE = 0.1

/** Canonical properties that grow proportionally during text scaling. */
export const TEXT_CORNER_SCALE_GROWING_FIELDS = [
  'width',
  'height',
  'fontSize',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'radiusTopLeft',
  'radiusTopRight',
  'radiusBottomRight',
  'radiusBottomLeft'
] as const

/** Successive pointer movements within the corner-scaling snap-hold zone. */
export const TEXT_CORNER_SCALE_HOLD_STEPS = [
  { deltaX: 0, deltaY: 0 },
  { deltaX: 1, deltaY: 1 },
  { deltaX: -1, deltaY: -1 }
] as const

/** Offset beyond the initial and opposite edges of the reference shape. */
export const TEXT_CORNER_SCALE_RELEASE_DELTA = 72

/** Text properties that must not change within a single snap hold. */
export const TEXT_CORNER_SCALE_STABLE_FIELDS = [
  'boundsLeft',
  'boundsTop',
  'boundsRight',
  'boundsBottom',
  'boundsWidth',
  'boundsHeight',
  'width',
  'height',
  'fontSize',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'radiusTopLeft',
  'radiusTopRight',
  'radiusBottomRight',
  'radiusBottomLeft',
  'lineCount'
] as const

/** One browser scenario for a side handle and a guide in scene coordinates. */
export type TextSideResizeControlCase = Readonly<{
  angle: number
  axis: TextResizeGuideAxis
  guideType: 'horizontal' | 'vertical'
  side: TextResizeSide
  title: string
}>

/** Both side handles without rotation and after a 90-degree rotation. */
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

/** Pointer micro-movements within the rotated text's snap-hold zone. */
export const TEXT_SIDE_RESIZE_HOLD_STEPS = Object.freeze([
  Object.freeze({ deltaX: 1, deltaY: 0 }),
  Object.freeze({ deltaX: 1, deltaY: 0 }),
  Object.freeze({ deltaX: 1, deltaY: 0 })
])

/** Tolerances for standalone-text width-change checks. */
export const TEXT_RESIZING_TOLERANCE = {
  anchor: 1.5,
  mouseupJump: 1.5
}

/** Target internal text width for line-wrapping scenarios. */
export const TEXT_RESIZING_REGRESSION_WIDTH = 125

/** Width smaller than the longest line for testing the side-handle limit. */
export const TEXT_RESIZING_MINIMUM_WIDTH_PROBE = 20

/** Further side-handle movement after reaching the minimum width. */
export const TEXT_RESIZING_MINIMUM_WIDTH_HOLD_DELTA = 8

/** Text settings from the scenario where the side handle reaches the minimum line width. */
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

/** Target internal text width for scaling scenarios after manual narrowing. */
export const TEXT_SCALING_REGRESSION_WIDTH = 180

/** Vertical scale factor for testing manual-width preservation. */
export const TEXT_VERTICAL_SCALING_FACTOR = 1.6

/** Diagonal scale factors for testing the new base width. */
export const TEXT_DIAGONAL_SCALING_FACTORS = {
  scaleX: 1.35,
  scaleY: 1.35
}

/** Horizontal scale factor for testing the current base width. */
export const TEXT_HORIZONTAL_SCALING_FACTOR = 1.35

/** Sequence of text-narrowing scale operations for testing intermediate states. */
export const TEXT_HORIZONTAL_SCALING_NARROW_STEPS = [
  0.92,
  0.62,
  0.42
]

/** Creates a pointer-movement sequence for narrowing text with a corner handle. */
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

/** Real-mouse text-narrowing scenarios for checking line wrapping on every movement. */
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

/** Minimum font size when scaling standalone text. */
export const TEXT_SCALING_MINIMUM_FONT_SIZE = 8

/** Factor for testing further narrowing after reaching the minimum without releasing the handle. */
export const TEXT_DIAGONAL_MINIMUM_PROBE_SCALING_FACTOR = 0.05

/** Pointer position below the minimum size for testing a new corner-scaling gesture. */
export const TEXT_CORNER_SCALE_BELOW_MINIMUM_MULTIPLIER = 0.5

/** Factor for restoring the text without ending the current diagonal-scaling gesture. */
export const TEXT_DIAGONAL_RECOVERY_SCALING_FACTOR = 1.35

/** Factor for enlarging text again after committing the minimum size. */
export const TEXT_DIAGONAL_REEXPAND_SCALING_FACTOR = 1.5

/** Single-line text configuration for testing the minimum limit during diagonal scaling. */
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

/** Standalone-text settings that reproduce the line-wrapping error during narrowing. */
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

/** Inline style of the regression text object's second line. */
export const TEXT_RESIZING_REGRESSION_SECOND_LINE_STYLE: TextInlineStyle = {
  fontFamily: 'Open Sans',
  fontSize: 24,
  fill: '#333333',
  fontWeight: 'normal'
}

/** Default line styles for the regression text object. */
export const TEXT_RESIZING_REGRESSION_LINE_DEFAULTS: TextLineDefaults = {
  1: {
    fontFamily: 'Open Sans',
    fontSize: 24
  }
}

/** Second-line range of the regression text object for testing inline styles. */
export const TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION = {
  start: 3,
  end: 15
}

/** Template JSON with standalone text from the line-wrapping-during-narrowing scenario. */
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

/** Template JSON from the scenario where standalone text jitters when narrowed from the top-right corner. */
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
