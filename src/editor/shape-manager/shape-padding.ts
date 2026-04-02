import {
  ShapePadding,
  ShapePaddingChangeMap,
  ShapePaddingMode
} from './types'

/**
 * Минимальный размер текстового фрейма внутри фигуры.
 */
export const MIN_SHAPE_TEXT_FRAME_SIZE = 1

/**
 * Актуальная persisted-модель shape padding: в группе хранятся только пользовательские px-значения.
 */
export const SHAPE_PADDING_MODE_USER: ShapePaddingMode = 'user'

/**
 * Верхняя граница legacy ratio-padding из старого контракта сериализации.
 */
export const LEGACY_MAX_SHAPE_PADDING_RATIO = 0.45

const LEGACY_MAX_HORIZONTAL_PADDING_PX = 12
const LEGACY_MAX_VERTICAL_PADDING_PX = 12

type ShapePaddingAxis = 'horizontal' | 'vertical'

/**
 * Возвращает padding в предсказуемом px-формате.
 */
export function normalizeShapePadding({
  padding
}: {
  padding?: Partial<ShapePadding>
}): ShapePadding {
  return {
    top: normalizeShapePaddingValue({ value: padding?.top }),
    right: normalizeShapePaddingValue({ value: padding?.right }),
    bottom: normalizeShapePaddingValue({ value: padding?.bottom }),
    left: normalizeShapePaddingValue({ value: padding?.left })
  }
}

/**
 * Мержит partial override в текущее padding-состояние.
 */
export function mergeShapePadding({
  base,
  override
}: {
  base: ShapePadding
  override?: Partial<ShapePadding>
}): ShapePadding {
  if (!override) return base

  return {
    top: override.top ?? base.top,
    right: override.right ?? base.right,
    bottom: override.bottom ?? base.bottom,
    left: override.left ?? base.left
  }
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
  const normalizedBase = normalizeShapePadding({
    padding: base
  })
  const normalizedAddition = normalizeShapePadding({
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

/**
 * Переводит legacy ratio-padding в пиксели по старым правилам.
 */
export function resolveLegacyShapePaddingPixels({
  value,
  size,
  axis
}: {
  value: number
  size: number
  axis: ShapePaddingAxis
}): number {
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), LEGACY_MAX_SHAPE_PADDING_RATIO)
    : 0
  const safeSize = Number.isFinite(size) && size > 0
    ? size
    : 0
  const maxPadding = axis === 'horizontal'
    ? LEGACY_MAX_HORIZONTAL_PADDING_PX
    : LEGACY_MAX_VERTICAL_PADDING_PX

  return Math.max(0, Math.min(safeSize * safeValue, maxPadding))
}

/**
 * Нормализует padding из сериализованной группы и поддерживает legacy ratio-значения.
 */
export function resolveStoredShapePadding({
  padding,
  width,
  height
}: {
  padding?: Partial<ShapePadding>
  width: number
  height: number
}): ShapePadding {
  return {
    top: resolveStoredShapePaddingValue({
      value: padding?.top,
      size: height,
      axis: 'vertical'
    }),
    right: resolveStoredShapePaddingValue({
      value: padding?.right,
      size: width,
      axis: 'horizontal'
    }),
    bottom: resolveStoredShapePaddingValue({
      value: padding?.bottom,
      size: height,
      axis: 'vertical'
    }),
    left: resolveStoredShapePaddingValue({
      value: padding?.left,
      size: width,
      axis: 'horizontal'
    })
  }
}

/**
 * Возвращает пользовательский padding из сериализованных данных группы.
 * Для новой модели поля уже хранят user-state. Для старой модели поле трактуется как total padding,
 * из которого нужно вычесть derived inset пресета.
 */
export function resolveStoredUserShapePadding({
  padding,
  width,
  height,
  mode,
  textInset
}: {
  padding?: Partial<ShapePadding>
  width: number
  height: number
  mode?: ShapePaddingMode
  textInset?: Partial<ShapePadding>
}): ShapePadding {
  const materializedPadding = resolveStoredShapePadding({
    padding,
    width,
    height
  })
  if (mode === SHAPE_PADDING_MODE_USER) return materializedPadding

  const normalizedInset = normalizeShapePadding({
    padding: textInset
  })

  return {
    top: Math.max(0, materializedPadding.top - normalizedInset.top),
    right: Math.max(0, materializedPadding.right - normalizedInset.right),
    bottom: Math.max(0, materializedPadding.bottom - normalizedInset.bottom),
    left: Math.max(0, materializedPadding.left - normalizedInset.left)
  }
}

/**
 * Ограничивает padding неотрицательными числами.
 */
function normalizeShapePaddingValue({ value }: { value?: number }): number {
  if (!Number.isFinite(value)) return 0

  return Math.max(0, value ?? 0)
}

/**
 * Materialize legacy ratio-padding в px, новые значения оставляет без изменений.
 */
function resolveStoredShapePaddingValue({
  value,
  size,
  axis
}: {
  value?: number
  size: number
  axis: ShapePaddingAxis
}): number {
  const safeValue = normalizeShapePaddingValue({ value })

  if (safeValue > 0 && safeValue < 1 && safeValue <= LEGACY_MAX_SHAPE_PADDING_RATIO) {
    return resolveLegacyShapePaddingPixels({
      value: safeValue,
      size,
      axis
    })
  }

  return safeValue
}
