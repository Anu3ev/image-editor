import {
  ShapePadding,
  ShapePaddingChangeMap
} from '../types'

/**
 * Минимальный размер текстового фрейма внутри фигуры.
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

/**
 * Нормализует layout-level padding в px без округления до целых значений.
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
 * Нормализует пользовательский padding в целые пиксели.
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
 * Мержит partial override в текущее пользовательское padding-состояние.
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
 * Складывает derived inset и пользовательский padding по сторонам.
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
 * Собирает карту полей padding, которые пришли в override явно.
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
