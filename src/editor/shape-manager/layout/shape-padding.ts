import {
  ShapePadding,
  ShapePaddingChangeMap
} from '../types'

/**
 * Minimum text-frame size inside a shape.
 */
export const MIN_SHAPE_TEXT_FRAME_SIZE = 1

function normalizeShapeLayoutPaddingValue({ value }: { value?: number }): number {
  if (!Number.isFinite(value)) return 0

  return Math.max(0, value ?? 0)
}

function normalizeShapeUserPaddingValue({ value }: { value?: number }): number {
  if (!Number.isFinite(value)) return 0

  return Math.max(0, Math.floor(value ?? 0))
}

function hasVisibleShapeStroke({
  stroke,
  strokeWidth
}: {
  stroke?: string | null
  strokeWidth?: number
}): boolean {
  if (stroke === null || stroke === undefined) return false

  return Math.max(0, strokeWidth ?? 0) > 0
}

/**
 * Normalizes layout-level padding to px without rounding to integers.
 */
export function normalizeShapeLayoutPadding({
  padding
}: {
  padding?: Partial<ShapePadding>
}): ShapePadding {
  return {
    top: normalizeShapeLayoutPaddingValue({ value: padding?.top }),
    right: normalizeShapeLayoutPaddingValue({ value: padding?.right }),
    bottom: normalizeShapeLayoutPaddingValue({ value: padding?.bottom }),
    left: normalizeShapeLayoutPaddingValue({ value: padding?.left })
  }
}

/**
 * Normalizes user-defined padding to integer pixels.
 */
export function normalizeShapeUserPadding({
  padding
}: {
  padding?: Partial<ShapePadding>
}): ShapePadding {
  return {
    top: normalizeShapeUserPaddingValue({ value: padding?.top }),
    right: normalizeShapeUserPaddingValue({ value: padding?.right }),
    bottom: normalizeShapeUserPaddingValue({ value: padding?.bottom }),
    left: normalizeShapeUserPaddingValue({ value: padding?.left })
  }
}

/**
 * Returns the stroke's internal inset for the text frame.
 * The current shape geometry model reduces the inner shape dimensions by the full strokeWidth,
 * so the text must exclude the full strokeWidth on each side.
 */
export function resolveShapeStrokeTextInset({
  stroke,
  strokeWidth
}: {
  stroke?: string | null
  strokeWidth?: number
}): ShapePadding {
  if (!hasVisibleShapeStroke({ stroke, strokeWidth })) {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  }

  const safeStrokeInset = Math.max(0, strokeWidth ?? 0)

  return {
    top: safeStrokeInset,
    right: safeStrokeInset,
    bottom: safeStrokeInset,
    left: safeStrokeInset
  }
}

/**
 * Merges a partial override into the current user-defined padding state.
 */
export function mergeShapePadding({
  base,
  override
}: {
  base: ShapePadding
  override?: Partial<ShapePadding>
}): ShapePadding {
  if (!override) return base

  return normalizeShapeUserPadding({
    padding: {
      top: override.top ?? base.top,
      right: override.right ?? base.right,
      bottom: override.bottom ?? base.bottom,
      left: override.left ?? base.left
    }
  })
}

/**
 * Adds the derived inset and user-defined padding for each side.
 */
export function sumShapePadding({
  base,
  addition
}: {
  base?: Partial<ShapePadding>
  addition?: Partial<ShapePadding>
}): ShapePadding {
  const normalizedBase = normalizeShapeLayoutPadding({
    padding: base
  })
  const normalizedAddition = normalizeShapeLayoutPadding({
    padding: addition
  })

  return {
    top: normalizedBase.top + normalizedAddition.top,
    right: normalizedBase.right + normalizedAddition.right,
    bottom: normalizedBase.bottom + normalizedAddition.bottom,
    left: normalizedBase.left + normalizedAddition.left
  }
}

/**
 * Builds the text frame's full internal inset from the shape preset and visible stroke.
 */
export function resolveShapeTextContentInset({
  baseInset,
  stroke,
  strokeWidth
}: {
  baseInset?: Partial<ShapePadding>
  stroke?: string | null
  strokeWidth?: number
}): ShapePadding {
  return sumShapePadding({
    base: baseInset,
    addition: resolveShapeStrokeTextInset({
      stroke,
      strokeWidth
    })
  })
}

/**
 * Builds a map of padding fields explicitly supplied in the override.
 */
export function getShapePaddingChangeMap({
  padding
}: {
  padding?: Partial<ShapePadding>
}): ShapePaddingChangeMap {
  if (!padding) return {}

  const changedPadding: ShapePaddingChangeMap = {}
  const keys = Object.keys(padding) as Array<keyof ShapePadding>

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]
    if (padding[key] === undefined) continue

    changedPadding[key] = true
  }

  return changedPadding
}
