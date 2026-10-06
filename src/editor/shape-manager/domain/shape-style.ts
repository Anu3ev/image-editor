import type {
  ShapeAddOptions,
  ShapeGroupLike,
  ShapeUpdateOptions,
  ShapeVisualStyle
} from '../types'

/**
 * Default shape-node fill.
 */
const DEFAULT_SHAPE_FILL = '#B4B7BD'

/**
 * Default outline width for a shape without a stroke.
 */
const DEFAULT_SHAPE_STROKE_WIDTH = 0

/**
 * Default shape opacity.
 */
const DEFAULT_SHAPE_OPACITY = 1

/**
 * Returns the effective shape style, accounting for supplied and saved values.
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
