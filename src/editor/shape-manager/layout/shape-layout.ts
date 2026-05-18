/* eslint-disable no-use-before-define, @typescript-eslint/no-use-before-define */
import { resizeShapeNode } from '../creation/shape-node-factory'
import {
  MIN_SHAPE_TEXT_FRAME_SIZE,
  normalizeShapeLayoutPadding,
  normalizeShapeUserPadding
} from './shape-padding'
import {
  resolveAppliedShapePadding,
  resolveTextFrameWidth
} from './shape-layout-padding'
import {
  measureShapeTextFrameLayout,
  measureTextboxHeightForFrame,
  measureTextboxLayoutForFrame,
  resolveMinimumTextFrameWidth,
  resolveSplitByGraphemeForFrame,
  resolveVerticalTop
} from './shape-text-measurement'
import {
  ShapeLayoutInput,
  ShapeTextMeasurementCache,
  ShapePadding,
  ShapeTextWrapPolicy,
  ShapeVerticalAlign
} from '../types'

export { measureShapeTextFrameLayout }

/**
 * Минимальный размер текстового frame, общий для layout и padding расчётов.
 */
const MIN_TEXT_FRAME_SIZE = MIN_SHAPE_TEXT_FRAME_SIZE

/**
 * Допуск для проверки заполненности text frame.
 */
const TEXT_FRAME_FILL_EPSILON = 0.5

/**
 * Лимит итераций при пересчёте padding, зависящего от auto-fit размеров.
 */
const MAX_DYNAMIC_PADDING_LAYOUT_ITERATIONS = 24

/**
 * Лимит бинарного поиска минимальной валидной ширины.
 */
const MAX_WIDTH_SEARCH_ITERATIONS = 20

/**
 * Лимит расширения верхней границы поиска ширины.
 */
const MAX_WIDTH_BOUND_EXPANSIONS = 16

/**
 * Геометрия внутреннего text frame в координатах shape-группы.
 */
type ShapeTextFrame = {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Итог layout текста внутри фигуры: размеры группы, padding, frame и режим переноса.
 */
export type ResolvedShapeTextLayout = {
  width: number
  height: number
  appliedPadding: ShapePadding
  appliedUserPadding: ShapePadding
  frame: ShapeTextFrame
  splitByGrapheme: boolean
  textTop: number
  wrapPolicy?: ShapeTextWrapPolicy
}

/**
 * Layout самого text frame без итоговых размеров shape-группы.
 */
type ShapeTextFrameLayout = {
  frame: ShapeTextFrame
  splitByGrapheme: boolean
  textTop: number
}

/**
 * Resolver padding для layout-расчётов, зависящих только от ширины.
 */
type ResolvePaddingForWidth = ({ width }: {
  width: number
}) => ShapePadding

/**
 * Resolver padding для layout-расчётов, зависящих от ширины и высоты.
 */
type ResolvePaddingForSize = ({ width, height }: {
  width: number
  height: number
}) => ShapePadding

/**
 * Resolver внутреннего text inset для конкретного размера shape.
 */
type ResolveInternalShapeTextInset = ({ width, height }: {
  width: number
  height: number
}) => ShapePadding

/**
 * Проверка валидности ширины shape для текущего текста и padding.
 */
type ResolveShapeWidthValidity = ({ width }: {
  width: number
}) => boolean

/**
 * Итог разрешения размеров shape-текста до сборки полного layout результата.
 */
type ShapeTextLayoutResolution = {
  width: number
  height: number
  appliedPadding: ShapePadding
  appliedUserPadding: ShapePadding
}

/**
 * Параметры resolveShapeTextLayout без Fabric group/shape, потому что расчёт чистый.
 */
type ResolveShapeTextLayoutParams = Omit<ShapeLayoutInput, 'group' | 'shape' | 'alignH'>

/**
 * Параметры layout-расчёта при фиксированной ширине shape.
 */
type ResolveShapeTextFixedWidthLayoutParams = {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  alignV: ShapeVerticalAlign
  padding: ShapePadding
  wrapPolicy?: ShapeTextWrapPolicy
  internalShapeTextInset?: ShapePadding
  resolveInternalShapeTextInset?: ShapeLayoutInput['resolveInternalShapeTextInset']
  expandShapeHeightToFitText?: boolean
  changedPadding?: ShapeLayoutInput['changedPadding']
  measurementCache?: ShapeTextMeasurementCache
}

/**
 * Параметры применения fixed-width layout к реальным Fabric объектам.
 */
type ApplyFixedWidthShapeTextLayoutParams = {
  group: ShapeLayoutInput['group']
  shape: ShapeLayoutInput['shape']
  text: ShapeLayoutInput['text']
  width: number
  height: number
  alignH: ShapeLayoutInput['alignH']
  alignV: ShapeLayoutInput['alignV']
  padding: ShapePadding
  wrapPolicy?: ShapeTextWrapPolicy
  internalShapeTextInset?: ShapePadding
  resolveInternalShapeTextInset?: ShapeLayoutInput['resolveInternalShapeTextInset']
  expandShapeHeightToFitText?: boolean
  changedPadding?: ShapeLayoutInput['changedPadding']
}

/**
 * Параметры сборки итогового состояния text frame.
 */
type ResolveShapeTextLayoutStateParams = {
  text: ShapeLayoutInput['text']
  alignV: ShapeVerticalAlign
  width: number
  height: number
  appliedPadding: ShapePadding
  appliedUserPadding: ShapePadding
  wrapPolicy?: ShapeTextWrapPolicy
}

/**
 * Параметры разрешения итоговых размеров shape при текущем text layout.
 */
type ResolveShapeTextLayoutResolutionParams = {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  padding: ShapePadding
  wrapPolicy?: ShapeTextWrapPolicy
  internalShapeTextInset?: ShapePadding
  resolveInternalShapeTextInset?: ResolveInternalShapeTextInset
  shapeTextAutoExpandEnabled?: boolean
  montageAreaWidth?: number | null
  expandShapeHeightToFitText?: boolean
  changedPadding?: ShapeLayoutInput['changedPadding']
}

/**
 * Применяет layout для композиции shape + text,
 * сохраняя ручные базовые размеры отдельно от фактического auto-fit размера
 * и пересчитывая derived inset формы на каждом шаге layout.
 * При preserveAspectRatio=true подбирает итоговый размер с сохранением заданного
 * соотношения сторон. При shapeTextAutoExpand=true не допускает лишний перенос строк,
 * а при выключенном режиме сохраняет пропорции, но допускает перенос по общему
 * shape-layout контракту.
 */
function resolveShapeTextLayoutState({
  text,
  alignV,
  width,
  height,
  appliedPadding,
  appliedUserPadding,
  wrapPolicy
}: ResolveShapeTextLayoutStateParams): ResolvedShapeTextLayout {
  const {
    frame,
    splitByGrapheme,
    textTop
  } = resolveShapeTextFrameLayout({
    text,
    width,
    height,
    alignV,
    padding: appliedPadding,
    wrapPolicy
  })

  return {
    width,
    height,
    appliedPadding,
    appliedUserPadding,
    frame,
    splitByGrapheme,
    textTop,
    wrapPolicy
  }
}

/**
 * Возвращает итоговый layout текста внутри shape c учетом авто-fit логики commit-path.
 * Width/height могут быть расширены, если этого требует базовый текстовый контракт.
 */
export const resolveShapeTextLayout = ({
  text,
  width,
  height,
  alignV,
  padding,
  wrapPolicy,
  internalShapeTextInset,
  resolveInternalShapeTextInset,
  preserveAspectRatio,
  shapeTextAutoExpandEnabled,
  montageAreaWidth,
  expandShapeHeightToFitText = true,
  changedPadding
}: ResolveShapeTextLayoutParams): ResolvedShapeTextLayout => {
  const {
    width: resolvedWidth,
    height: resolvedHeight,
    appliedPadding,
    appliedUserPadding
  } = preserveAspectRatio
    ? resolveShapeTextLayoutResolutionForAspectRatio({
      text,
      width,
      height,
      padding,
      wrapPolicy,
      internalShapeTextInset,
      resolveInternalShapeTextInset,
      shapeTextAutoExpandEnabled,
      montageAreaWidth,
      expandShapeHeightToFitText,
      changedPadding
    })
    : resolveShapeTextLayoutResolution({
      text,
      width,
      height,
      padding,
      wrapPolicy,
      internalShapeTextInset,
      resolveInternalShapeTextInset,
      expandShapeHeightToFitText,
      changedPadding
    })

  return resolveShapeTextLayoutState({
    text,
    alignV,
    width: resolvedWidth,
    height: resolvedHeight,
    appliedPadding,
    appliedUserPadding,
    wrapPolicy
  })
}

/**
 * Возвращает preview-layout текста внутри shape для already-chosen width.
 * В отличие от commit-path, ширина не расширяется и может меняться только applied padding и высота.
 */
export const resolveShapeTextFixedWidthLayout = ({
  text,
  width,
  height,
  alignV,
  padding,
  wrapPolicy,
  internalShapeTextInset,
  resolveInternalShapeTextInset,
  expandShapeHeightToFitText = true,
  changedPadding,
  measurementCache
}: ResolveShapeTextFixedWidthLayoutParams): ResolvedShapeTextLayout => {
  const requestedUserPadding = normalizeShapeUserPadding({
    padding
  })
  const normalizedInternalShapeTextInset = normalizeShapeLayoutPadding({
    padding: internalShapeTextInset
  })
  const fixedWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  let resolvedHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const measureTextboxHeight = ({ text: targetText, frameWidth }: {
    text: ShapeLayoutInput['text']
    frameWidth: number
  }) => measureTextboxHeightForFrame({
    text: targetText,
    frameWidth,
    wrapPolicy,
    measurementCache
  })
  let resolvedPaddingLayout = resolveAppliedShapePadding({
    text,
    width: fixedWidth,
    height: resolvedHeight,
    padding: requestedUserPadding,
    internalShapeTextInset: resolveCurrentInternalShapeTextInset({
      width: fixedWidth,
      height: resolvedHeight,
      internalShapeTextInset: normalizedInternalShapeTextInset,
      resolveInternalShapeTextInset
    }),
    expandShapeHeightToFitText,
    changedPadding,
    measureTextboxHeightForFrame: measureTextboxHeight,
    resolveMinimumTextFrameWidth: ({ text: targetText }) => resolveMinimumTextFrameWidth({
      text: targetText,
      measurementCache
    })
  })

  for (let iteration = 0; iteration < MAX_DYNAMIC_PADDING_LAYOUT_ITERATIONS; iteration += 1) {
    const nextHeight = Math.max(resolvedHeight, resolvedPaddingLayout.requiredHeight)

    if (nextHeight <= resolvedHeight + TEXT_FRAME_FILL_EPSILON) {
      break
    }

    resolvedHeight = nextHeight
    resolvedPaddingLayout = resolveAppliedShapePadding({
      text,
      width: fixedWidth,
      height: resolvedHeight,
      padding: requestedUserPadding,
      internalShapeTextInset: resolveCurrentInternalShapeTextInset({
        width: fixedWidth,
        height: resolvedHeight,
        internalShapeTextInset: normalizedInternalShapeTextInset,
        resolveInternalShapeTextInset
      }),
      expandShapeHeightToFitText,
      changedPadding,
      measureTextboxHeightForFrame: measureTextboxHeight,
      resolveMinimumTextFrameWidth: ({ text: targetText }) => resolveMinimumTextFrameWidth({
        text: targetText,
        measurementCache
      })
    })
  }

  return resolveShapeTextLayoutState({
    text,
    alignV,
    width: fixedWidth,
    height: resolvedHeight,
    appliedPadding: resolvedPaddingLayout.appliedPadding,
    appliedUserPadding: resolvedPaddingLayout.appliedUserPadding,
    wrapPolicy
  })
}

/**
 * Применяет уже рассчитанный shape/text layout к Fabric group, shape и text.
 */
function applyResolvedShapeTextLayout({
  group,
  shape,
  text,
  alignH,
  alignV,
  resolvedLayout
}: {
  group: ShapeLayoutInput['group']
  shape: ShapeLayoutInput['shape']
  text: ShapeLayoutInput['text']
  alignH: ShapeLayoutInput['alignH']
  alignV: ShapeLayoutInput['alignV']
  resolvedLayout: ResolvedShapeTextLayout
}): void {
  const manualBaseWidth = Math.max(
    MIN_TEXT_FRAME_SIZE,
    group.shapeManualBaseWidth ?? resolvedLayout.width
  )
  const manualBaseHeight = Math.max(
    MIN_TEXT_FRAME_SIZE,
    group.shapeManualBaseHeight ?? resolvedLayout.height
  )
  const {
    width: finalWidth,
    height: finalHeight,
    appliedUserPadding,
    frame,
    splitByGrapheme,
    textTop
  } = resolvedLayout

  resizeShapeNode({
    shape,
    width: finalWidth,
    height: finalHeight,
    rounding: group.shapeRounding,
    strokeWidth: group.shapeStrokeWidth
  })

  text.set({
    autoExpand: false,
    width: frame.width,
    textAlign: alignH,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    left: frame.left,
    top: textTop,
    originX: 'left',
    originY: 'top',
    splitByGrapheme
  })

  text.initDimensions()

  text.setCoords()
  shape.setCoords()

  group.shapeBaseWidth = finalWidth
  group.shapeBaseHeight = finalHeight
  group.shapeManualBaseWidth = manualBaseWidth
  group.shapeManualBaseHeight = manualBaseHeight
  group.shapePaddingTop = appliedUserPadding.top
  group.shapePaddingRight = appliedUserPadding.right
  group.shapePaddingBottom = appliedUserPadding.bottom
  group.shapePaddingLeft = appliedUserPadding.left
  group.shapeAlignHorizontal = alignH
  group.shapeAlignVertical = alignV

  group.set({
    width: finalWidth,
    height: finalHeight,
    scaleX: 1,
    scaleY: 1
  })

  group.set('dirty', true)
  group.setCoords()
}

/**
 * Применяет итоговый layout shape + text.
 * Использует общий auto-fit commit-контракт и при необходимости расширяет размер shape по тексту.
 */
export const applyShapeTextLayout = ({
  group,
  shape,
  text,
  width,
  height,
  alignH,
  alignV,
  padding,
  wrapPolicy,
  internalShapeTextInset,
  resolveInternalShapeTextInset,
  preserveAspectRatio,
  shapeTextAutoExpandEnabled,
  montageAreaWidth,
  expandShapeHeightToFitText = true,
  changedPadding
}: ShapeLayoutInput): void => {
  const isShapeTextAutoExpandEnabled = shapeTextAutoExpandEnabled
    ?? group.shapeTextAutoExpand !== false
  const resolvedLayout = resolveShapeTextLayout({
    text,
    width,
    height,
    alignV,
    padding,
    wrapPolicy,
    internalShapeTextInset,
    resolveInternalShapeTextInset,
    preserveAspectRatio,
    shapeTextAutoExpandEnabled: isShapeTextAutoExpandEnabled,
    montageAreaWidth,
    expandShapeHeightToFitText,
    changedPadding
  })

  applyResolvedShapeTextLayout({
    group,
    shape,
    text,
    alignH,
    alignV,
    resolvedLayout
  })
}

/**
 * Применяет итоговый layout shape + text в fixed-width режиме.
 * Переданная ширина считается уже выбранной текущим контрактом объекта и не расширяется.
 */
export const applyFixedWidthShapeTextLayout = ({
  group,
  shape,
  text,
  width,
  height,
  alignH,
  alignV,
  padding,
  wrapPolicy,
  internalShapeTextInset,
  resolveInternalShapeTextInset,
  expandShapeHeightToFitText = true,
  changedPadding
}: ApplyFixedWidthShapeTextLayoutParams): void => {
  const resolvedLayout = resolveShapeTextFixedWidthLayout({
    text,
    width,
    height,
    alignV,
    padding,
    wrapPolicy,
    internalShapeTextInset,
    resolveInternalShapeTextInset,
    expandShapeHeightToFitText,
    changedPadding
  })

  applyResolvedShapeTextLayout({
    group,
    shape,
    text,
    alignH,
    alignV,
    resolvedLayout
  })
}

/**
 * Разрешает layout текста в режиме сохранения соотношения сторон shape.
 */
function resolveShapeTextLayoutResolutionForAspectRatio({
  text,
  width,
  height,
  padding,
  wrapPolicy,
  internalShapeTextInset,
  resolveInternalShapeTextInset,
  shapeTextAutoExpandEnabled = true,
  montageAreaWidth,
  expandShapeHeightToFitText = true,
  changedPadding
}: ResolveShapeTextLayoutResolutionParams): ShapeTextLayoutResolution {
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const safeMontageAreaWidth = Number.isFinite(montageAreaWidth) && (montageAreaWidth ?? 0) > 0
    ? Math.max(MIN_TEXT_FRAME_SIZE, montageAreaWidth ?? MIN_TEXT_FRAME_SIZE)
    : null

  if (!hasShapeTextContent({ text })) {
    return resolveShapeTextLayoutResolution({
      text,
      width: safeWidth,
      height: safeHeight,
      padding,
      wrapPolicy,
      internalShapeTextInset,
      resolveInternalShapeTextInset,
      expandShapeHeightToFitText,
      changedPadding
    })
  }

  const aspectRatio = safeHeight / safeWidth
  const resolveCandidateLayout = ({ width: candidateWidth }: {
    width: number
  }): {
    candidateHeight: number
    frameWidth: number
    layoutResolution: ShapeTextLayoutResolution
  } => {
    const candidateHeight = Math.max(
      MIN_TEXT_FRAME_SIZE,
      candidateWidth * aspectRatio
    )
    const layoutResolution = resolveShapeTextLayoutResolution({
      text,
      width: candidateWidth,
      height: candidateHeight,
      padding,
      wrapPolicy,
      internalShapeTextInset,
      resolveInternalShapeTextInset,
      expandShapeHeightToFitText,
      changedPadding
    })

    return {
      candidateHeight,
      frameWidth: resolveTextFrameWidth({
        width: candidateWidth,
        padding: layoutResolution.appliedPadding
      }),
      layoutResolution
    }
  }

  const fitsCandidateBounds = ({
    candidateWidth,
    candidateHeight,
    layoutResolution
  }: {
    candidateWidth: number
    candidateHeight: number
    layoutResolution: ShapeTextLayoutResolution
  }): boolean => {
    if (layoutResolution.width > candidateWidth + TEXT_FRAME_FILL_EPSILON) {
      return false
    }

    if (layoutResolution.height > candidateHeight + TEXT_FRAME_FILL_EPSILON) {
      return false
    }

    return true
  }

  if (!shapeTextAutoExpandEnabled) {
    const isWidthValid = ({ width: candidateWidth }: { width: number }): boolean => {
      const {
        candidateHeight,
        layoutResolution
      } = resolveCandidateLayout({
        width: candidateWidth
      })

      return fitsCandidateBounds({
        candidateWidth,
        candidateHeight,
        layoutResolution
      })
    }

    let maximumWidth = safeMontageAreaWidth
      ? Math.max(safeWidth, safeMontageAreaWidth)
      : safeWidth

    if (!isWidthValid({ width: maximumWidth })) {
      maximumWidth = resolveValidShapeWidthUpperBound({
        minimumWidth: maximumWidth,
        isWidthValid
      })
    }

    const resolvedWidth = resolveMinimumValidShapeWidth({
      minimumWidth: safeWidth,
      maximumWidth,
      isWidthValid
    })

    const { layoutResolution } = resolveCandidateLayout({
      width: resolvedWidth
    })

    return layoutResolution
  }

  const isWidthValid = ({
    width: candidateWidth,
    requiredFrameWidth
  }: {
    width: number
    requiredFrameWidth?: number
  }): boolean => {
    const {
      candidateHeight,
      frameWidth,
      layoutResolution
    } = resolveCandidateLayout({
      width: candidateWidth
    })

    if (!fitsCandidateBounds({
      candidateWidth,
      candidateHeight,
      layoutResolution
    })) return false

    if (requiredFrameWidth !== undefined && frameWidth < requiredFrameWidth - TEXT_FRAME_FILL_EPSILON) {
      return false
    }

    const validation = measureTextboxLayoutForFrame({
      text,
      frameWidth,
      wrapPolicy
    })

    return !validation.hasWrappedLines
  }

  const maximumWidth = safeMontageAreaWidth
    ? Math.max(safeWidth, safeMontageAreaWidth)
    : resolveValidShapeWidthUpperBound({
      minimumWidth: safeWidth,
      isWidthValid: ({ width: candidateWidth }) => isWidthValid({ width: candidateWidth })
    })
  const maximumCandidateLayout = resolveCandidateLayout({
    width: maximumWidth
  })
  const maximumMeasurement = measureTextboxLayoutForFrame({
    text,
    frameWidth: maximumCandidateLayout.frameWidth,
    wrapPolicy
  })

  if (maximumMeasurement.hasWrappedLines) {
    return maximumCandidateLayout.layoutResolution
  }

  const requiredFrameWidth = Math.max(
    MIN_TEXT_FRAME_SIZE,
    maximumMeasurement.longestLineWidth
  )

  const resolvedWidth = resolveMinimumValidShapeWidth({
    minimumWidth: safeWidth,
    maximumWidth,
    isWidthValid: ({ width: candidateWidth }) => isWidthValid({
      width: candidateWidth,
      requiredFrameWidth
    })
  })

  const { layoutResolution } = resolveCandidateLayout({
    width: resolvedWidth
  })

  return layoutResolution
}

/**
 * Возвращает целевую ширину shape для режима shapeTextAutoExpand,
 * измеряя текст на максимально допустимой ширине монтажной области,
 * даже если effective padding зависит от candidate width,
 * и не позволяя сужаться ниже ручной базовой ширины.
 */
export const resolveShapeTextAutoExpandWidthForText = ({
  text,
  currentWidth,
  minimumWidth,
  padding,
  wrapPolicy,
  montageAreaWidth,
  resolvePaddingForWidth
}: {
  text: ShapeLayoutInput['text']
  currentWidth: number
  minimumWidth: number
  padding?: ShapePadding
  wrapPolicy?: ShapeTextWrapPolicy
  montageAreaWidth: number
  resolvePaddingForWidth?: ResolvePaddingForWidth
}): number => {
  const safeCurrentWidth = Math.max(MIN_TEXT_FRAME_SIZE, currentWidth)
  const safeMinimumWidth = Math.max(MIN_TEXT_FRAME_SIZE, minimumWidth)
  if (!hasShapeTextContent({ text })) return safeMinimumWidth

  const safeMontageAreaWidth = Number.isFinite(montageAreaWidth) && montageAreaWidth > 0
    ? Math.max(MIN_TEXT_FRAME_SIZE, montageAreaWidth)
    : Math.max(safeCurrentWidth, safeMinimumWidth)
  const effectiveMaxShapeWidth = Math.max(safeMinimumWidth, safeMontageAreaWidth)
  const maxMeasurementPadding = resolveCurrentPaddingForWidth({
    width: effectiveMaxShapeWidth,
    padding,
    resolvePaddingForWidth
  })
  const maxFrameWidth = resolveTextFrameWidth({
    width: effectiveMaxShapeWidth,
    padding: maxMeasurementPadding
  })

  const maxShapeWidth = effectiveMaxShapeWidth
  const maxMeasurement = measureTextboxLayoutForFrame({
    text,
    frameWidth: maxFrameWidth,
    wrapPolicy
  })

  if (maxMeasurement.hasWrappedLines) return maxShapeWidth

  const requiredFrameWidth = Math.max(
    MIN_TEXT_FRAME_SIZE,
    maxMeasurement.longestLineWidth
  )

  return resolveMinimumValidShapeWidth({
    minimumWidth: safeMinimumWidth,
    maximumWidth: maxShapeWidth,
    isWidthValid: ({ width }) => {
      const currentPadding = resolveCurrentPaddingForWidth({
        width,
        padding,
        resolvePaddingForWidth
      })
      const frameWidth = resolveTextFrameWidth({
        width,
        padding: currentPadding
      })

      if (frameWidth < requiredFrameWidth - TEXT_FRAME_FILL_EPSILON) {
        return false
      }

      const validation = measureTextboxLayoutForFrame({
        text,
        frameWidth,
        wrapPolicy
      })

      return !validation.hasWrappedLines
    }
  })
}

/**
 * Возвращает минимальную ширину shape, при которой в текстовом фрейме помещается один символ.
 */
export const resolveMinimumShapeWidthForText = ({
  text,
  padding,
  resolvePaddingForWidth,
  measurementCache
}: {
  text: ShapeLayoutInput['text']
  padding?: ShapePadding
  resolvePaddingForWidth?: ResolvePaddingForWidth
  measurementCache?: ShapeTextMeasurementCache
}): number => {
  if (!hasShapeTextContent({
    text
  })) return MIN_TEXT_FRAME_SIZE

  const minimumFrameWidth = resolveMinimumTextFrameWidth({
    text,
    measurementCache
  })
  const minimumSearchWidth = Math.max(MIN_TEXT_FRAME_SIZE, minimumFrameWidth)
  const isWidthValid: ResolveShapeWidthValidity = ({ width }) => {
    const currentPadding = resolveCurrentPaddingForWidth({
      width,
      padding,
      resolvePaddingForWidth
    })
    const frameWidth = resolveTextFrameWidth({
      width,
      padding: currentPadding
    })

    return frameWidth >= minimumFrameWidth - TEXT_FRAME_FILL_EPSILON
  }
  const maximumWidth = resolveValidShapeWidthUpperBound({
    minimumWidth: minimumSearchWidth,
    isWidthValid
  })

  return resolveMinimumValidShapeWidth({
    minimumWidth: minimumSearchWidth,
    maximumWidth,
    isWidthValid
  })
}

/**
 * Вычисляет текстовый фрейм, режим переноса и вертикальную позицию текста
 * для уже примененного padding.
 */
export const resolveShapeTextFrameLayout = ({
  text,
  width,
  height,
  alignV,
  wrapPolicy,
  padding
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  alignV: ShapeVerticalAlign
  wrapPolicy?: ShapeTextWrapPolicy
  padding: ShapePadding
}): ShapeTextFrameLayout => {
  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const appliedPadding = normalizeShapeLayoutPadding({
    padding
  })
  const frame = createTextFrame({
    width: safeWidth,
    height: safeHeight,
    padding: appliedPadding
  })
  const splitByGrapheme = resolveSplitByGraphemeForFrame({
    text,
    frameWidth: frame.width,
    wrapPolicy
  })
  const measuredHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: frame.width,
    splitByGrapheme,
    wrapPolicy
  })
  const textTop = resolveVerticalTop({
    alignV,
    frameHeight: frame.height,
    frameTop: frame.top,
    textHeight: measuredHeight
  })

  return {
    frame,
    splitByGrapheme,
    textTop
  }
}

/**
 * Возвращает true, если текст заполняет всю доступную высоту фрейма.
 */
export const isShapeTextFrameFilled = ({
  text,
  width,
  height,
  wrapPolicy,
  padding
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  wrapPolicy?: ShapeTextWrapPolicy
  padding: ShapePadding
}): boolean => {
  if (!hasShapeTextContent({
    text
  })) return false

  const {
    frame
  } = resolveShapeTextFrameLayout({
    text,
    width,
    height,
    alignV: 'top',
    wrapPolicy,
    padding
  })

  const measuredHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: frame.width,
    wrapPolicy
  })

  return measuredHeight >= frame.height - TEXT_FRAME_FILL_EPSILON
}

/**
 * Возвращает минимальную высоту shape, чтобы текст помещался в текстовый фрейм.
 * Для пустого текста высота не раздувается и остается равной переданному safe-height.
 */
export const resolveRequiredShapeHeightForText = ({
  text,
  width,
  height,
  padding,
  wrapPolicy,
  resolvePaddingForSize,
  measurementCache
}: {
  text: ShapeLayoutInput['text']
  width: number
  height: number
  padding: ShapePadding
  wrapPolicy?: ShapeTextWrapPolicy
  resolvePaddingForSize?: ResolvePaddingForSize
  measurementCache?: ShapeTextMeasurementCache
}): number => {
  const safeHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  if (!hasShapeTextContent({
    text
  })) return safeHeight

  const safeWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  let requiredHeight = safeHeight

  for (let iteration = 0; iteration < MAX_DYNAMIC_PADDING_LAYOUT_ITERATIONS; iteration += 1) {
    const currentPadding = resolveCurrentPaddingForSize({
      width: safeWidth,
      height: requiredHeight,
      padding,
      resolvePaddingForSize
    })
    const frameWidth = resolveTextFrameWidth({
      width: safeWidth,
      padding: currentPadding
    })
    const measuredHeight = measureTextboxHeightForFrame({
      text,
      frameWidth,
      wrapPolicy,
      measurementCache
    })
    const nextHeight = Math.max(
      safeHeight,
      measuredHeight + currentPadding.top + currentPadding.bottom
    )

    if (nextHeight <= requiredHeight + TEXT_FRAME_FILL_EPSILON) {
      return nextHeight
    }

    requiredHeight = nextHeight
  }

  return requiredHeight
}

/**
 * Возвращает true, если textbox содержит видимый текстовый контент.
 */
function hasShapeTextContent({
  text
}: {
  text: ShapeLayoutInput['text']
}): boolean {
  const rawText = text.text ?? ''

  return rawText.trim().length > 0
}

/**
 * Возвращает padding для текущей ширины, учитывая optional resolver.
 */
function resolveCurrentPaddingForWidth({
  width,
  padding,
  resolvePaddingForWidth
}: {
  width: number
  padding?: ShapePadding
  resolvePaddingForWidth?: ResolvePaddingForWidth
}): ShapePadding {
  if (!resolvePaddingForWidth) {
    return normalizeShapeLayoutPadding({
      padding
    })
  }

  return normalizeShapeLayoutPadding({
    padding: resolvePaddingForWidth({
      width: Math.max(MIN_TEXT_FRAME_SIZE, width)
    })
  })
}

/**
 * Возвращает padding для текущего размера, учитывая optional resolver.
 */
function resolveCurrentPaddingForSize({
  width,
  height,
  padding,
  resolvePaddingForSize
}: {
  width: number
  height: number
  padding?: ShapePadding
  resolvePaddingForSize?: ResolvePaddingForSize
}): ShapePadding {
  if (!resolvePaddingForSize) {
    return normalizeShapeLayoutPadding({
      padding
    })
  }

  return normalizeShapeLayoutPadding({
    padding: resolvePaddingForSize({
      width: Math.max(MIN_TEXT_FRAME_SIZE, width),
      height: Math.max(MIN_TEXT_FRAME_SIZE, height)
    })
  })
}

/**
 * Возвращает внутренний shape text inset для текущего размера.
 */
function resolveCurrentInternalShapeTextInset({
  width,
  height,
  internalShapeTextInset,
  resolveInternalShapeTextInset
}: {
  width: number
  height: number
  internalShapeTextInset?: ShapePadding
  resolveInternalShapeTextInset?: ResolveInternalShapeTextInset
}): ShapePadding {
  if (!resolveInternalShapeTextInset) {
    return normalizeShapeLayoutPadding({
      padding: internalShapeTextInset
    })
  }

  return normalizeShapeLayoutPadding({
    padding: resolveInternalShapeTextInset({
      width: Math.max(MIN_TEXT_FRAME_SIZE, width),
      height: Math.max(MIN_TEXT_FRAME_SIZE, height)
    })
  })
}

/**
 * Итеративно разрешает итоговые размеры shape и padding для текущего текста.
 */
function resolveShapeTextLayoutResolution({
  text,
  width,
  height,
  padding,
  wrapPolicy,
  internalShapeTextInset,
  resolveInternalShapeTextInset,
  expandShapeHeightToFitText = true,
  changedPadding
}: ResolveShapeTextLayoutResolutionParams): ShapeTextLayoutResolution {
  const requestedUserPadding = normalizeShapeUserPadding({
    padding
  })
  const normalizedInternalShapeTextInset = normalizeShapeLayoutPadding({
    padding: internalShapeTextInset
  })
  let finalWidth = Math.max(MIN_TEXT_FRAME_SIZE, width)
  let finalHeight = Math.max(MIN_TEXT_FRAME_SIZE, height)
  const measureTextboxHeight = ({ text: targetText, frameWidth }: {
    text: ShapeLayoutInput['text']
    frameWidth: number
  }) => measureTextboxHeightForFrame({
    text: targetText,
    frameWidth,
    wrapPolicy
  })
  let resolvedPaddingLayout = resolveAppliedShapePadding({
    text,
    width: finalWidth,
    height: finalHeight,
    padding: requestedUserPadding,
    internalShapeTextInset: resolveCurrentInternalShapeTextInset({
      width: finalWidth,
      height: finalHeight,
      internalShapeTextInset: normalizedInternalShapeTextInset,
      resolveInternalShapeTextInset
    }),
    expandShapeHeightToFitText,
    changedPadding,
    measureTextboxHeightForFrame: measureTextboxHeight,
    resolveMinimumTextFrameWidth
  })

  for (let iteration = 0; iteration < MAX_DYNAMIC_PADDING_LAYOUT_ITERATIONS; iteration += 1) {
    const nextWidth = Math.max(finalWidth, resolvedPaddingLayout.requiredWidth)
    const nextHeight = Math.max(finalHeight, resolvedPaddingLayout.requiredHeight)

    if (
      nextWidth <= finalWidth + TEXT_FRAME_FILL_EPSILON
      && nextHeight <= finalHeight + TEXT_FRAME_FILL_EPSILON
    ) {
      break
    }

    finalWidth = nextWidth
    finalHeight = nextHeight
    resolvedPaddingLayout = resolveAppliedShapePadding({
      text,
      width: finalWidth,
      height: finalHeight,
      padding: requestedUserPadding,
      internalShapeTextInset: resolveCurrentInternalShapeTextInset({
        width: finalWidth,
        height: finalHeight,
        internalShapeTextInset: normalizedInternalShapeTextInset,
        resolveInternalShapeTextInset
      }),
      expandShapeHeightToFitText,
      changedPadding,
      measureTextboxHeightForFrame: measureTextboxHeight,
      resolveMinimumTextFrameWidth
    })
  }

  return {
    width: finalWidth,
    height: finalHeight,
    appliedPadding: resolvedPaddingLayout.appliedPadding,
    appliedUserPadding: resolvedPaddingLayout.appliedUserPadding
  }
}

/**
 * Находит верхнюю границу ширины, при которой shape layout становится валидным.
 */
function resolveValidShapeWidthUpperBound({
  minimumWidth,
  isWidthValid
}: {
  minimumWidth: number
  isWidthValid: ResolveShapeWidthValidity
}): number {
  let upperBound = Math.max(MIN_TEXT_FRAME_SIZE, minimumWidth)

  if (isWidthValid({ width: upperBound })) {
    return upperBound
  }

  for (let iteration = 0; iteration < MAX_WIDTH_BOUND_EXPANSIONS; iteration += 1) {
    upperBound = Math.max(upperBound + 1, upperBound * 2)

    if (isWidthValid({ width: upperBound })) {
      return upperBound
    }
  }

  return upperBound
}

/**
 * Ищет минимальную валидную ширину shape внутри найденного диапазона.
 */
function resolveMinimumValidShapeWidth({
  minimumWidth,
  maximumWidth,
  isWidthValid
}: {
  minimumWidth: number
  maximumWidth: number
  isWidthValid: ResolveShapeWidthValidity
}): number {
  let low = Math.max(MIN_TEXT_FRAME_SIZE, minimumWidth)
  let high = Math.max(low, maximumWidth)

  if (isWidthValid({ width: low })) return low

  if (!isWidthValid({ width: high })) return high

  for (let iteration = 0; iteration < MAX_WIDTH_SEARCH_ITERATIONS; iteration += 1) {
    if (high - low <= TEXT_FRAME_FILL_EPSILON) {
      break
    }

    const candidateWidth = low + (high - low) / 2

    if (isWidthValid({ width: candidateWidth })) {
      high = candidateWidth
      continue
    }

    low = candidateWidth
  }

  return high
}

/**
 * Создаёт text frame в локальных координатах shape-группы.
 */
function createTextFrame({
  width,
  height,
  padding
}: {
  width: number
  height: number
  padding: ShapePadding
}): ShapeTextFrame {
  const leftPadding = Math.max(0, padding.left)
  const rightPadding = Math.max(0, padding.right)
  const topPadding = Math.max(0, padding.top)
  const bottomPadding = Math.max(0, padding.bottom)

  const left = -width / 2 + leftPadding
  const top = -height / 2 + topPadding
  const frameWidth = Math.max(MIN_TEXT_FRAME_SIZE, width - leftPadding - rightPadding)
  const frameHeight = Math.max(MIN_TEXT_FRAME_SIZE, height - topPadding - bottomPadding)

  return {
    left,
    top,
    width: frameWidth,
    height: frameHeight
  }
}
