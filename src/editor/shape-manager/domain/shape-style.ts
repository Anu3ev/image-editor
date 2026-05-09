import type {
  ShapeAddOptions,
  ShapeGroupLike,
  ShapeUpdateOptions,
  ShapeVisualStyle
} from '../types'

/**
 * Заливка shape-узла по умолчанию.
 */
const DEFAULT_SHAPE_FILL = '#B4B7BD'

/**
 * Толщина обводки по умолчанию для фигуры без stroke.
 */
const DEFAULT_SHAPE_STROKE_WIDTH = 0

/**
 * Прозрачность фигуры по умолчанию.
 */
const DEFAULT_SHAPE_OPACITY = 1

/**
 * Возвращает итоговый стиль фигуры с учетом переданных и сохраненных значений.
 */
export function resolveShapeStyle({
  options,
  fallback
}: {
  options: Pick<
    ShapeAddOptions | ShapeUpdateOptions,
    'fill' | 'stroke' | 'strokeWidth' | 'strokeDashArray' | 'opacity'
  >
  fallback: ShapeGroupLike | null
}): ShapeVisualStyle {
  const {
    fill,
    stroke,
    strokeWidth,
    strokeDashArray,
    opacity
  } = options

  const dashArray = strokeDashArray !== undefined
    ? strokeDashArray
    : fallback?.shapeStrokeDashArray

  return {
    fill: fill ?? fallback?.shapeFill ?? DEFAULT_SHAPE_FILL,
    stroke: stroke ?? fallback?.shapeStroke ?? null,
    strokeWidth: strokeWidth ?? fallback?.shapeStrokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH,
    strokeDashArray: dashArray ?? null,
    opacity: opacity ?? fallback?.shapeOpacity ?? DEFAULT_SHAPE_OPACITY
  }
}
