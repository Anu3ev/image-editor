import { Point, type FabricObject } from 'fabric'

export type Dimensions = {
  width: number
  height: number
}

export type ObjectBounds = {
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  centerY: number
}

/**
 * Возвращает числовое значение или fallback, если value некорректно.
 */
export const toNumber = ({
  value,
  fallback = 0
}: {
  value: unknown
  fallback?: number
}): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return fallback
  }

  return 0
}

/**
 * Преобразует абсолютное значение координаты/размера в относительную долю (0..1) от размеров монтажной области.
 */
export const normalizeStoredValue = ({
  value,
  dimension,
  useRelativePositions
}: {
  value: unknown
  dimension: number
  useRelativePositions: boolean
}): number => {
  const numericValue = toNumber({ value })

  if (useRelativePositions) return numericValue

  const safeDimension = dimension || 1
  return numericValue / safeDimension
}

/**
 * Вычисляет центр объекта в нормализованных координатах (0..1), используя сохранённые или фактические позиции.
 */
export const resolveNormalizedCenter = ({
  object,
  baseWidth,
  baseHeight,
  useRelativePositions,
  centerKeys
}: {
  object: FabricObject
  baseWidth: number
  baseHeight: number
  useRelativePositions: boolean
  centerKeys: { x: string; y: string }
}): { x: number; y: number } => {
  const objectRecord = object as Record<string, unknown>
  const hasStoredCenter = typeof objectRecord[centerKeys.x] === 'number'
    && typeof objectRecord[centerKeys.y] === 'number'

  if (hasStoredCenter) {
    return {
      x: normalizeStoredValue({
        value: objectRecord[centerKeys.x],
        dimension: baseWidth,
        useRelativePositions
      }),
      y: normalizeStoredValue({
        value: objectRecord[centerKeys.y],
        dimension: baseHeight,
        useRelativePositions
      })
    }
  }

  const { left, top, width, height } = object

  const normalizedLeft = normalizeStoredValue({
    value: left,
    dimension: baseWidth,
    useRelativePositions
  })
  const normalizedTop = normalizeStoredValue({
    value: top,
    dimension: baseHeight,
    useRelativePositions
  })
  const normalizedWidth = toNumber({ value: width }) / (baseWidth || 1)
  const normalizedHeight = toNumber({ value: height }) / (baseHeight || 1)

  return {
    x: normalizedLeft + (normalizedWidth / 2),
    y: normalizedTop + (normalizedHeight / 2)
  }
}

/**
 * Преобразует нормализованный центр (0..1) обратно в абсолютные координаты на полотне.
 */
export const denormalizeCenter = ({
  normalizedX,
  normalizedY,
  bounds,
  targetSize,
  montageArea
}: {
  normalizedX: number
  normalizedY: number
  bounds: { left: number; top: number; width: number; height: number }
  targetSize: Dimensions
  montageArea: FabricObject | null
}): Point => {
  const { left, top, width, height } = bounds

  if (!montageArea) {
    const { width: targetWidth, height: targetHeight } = targetSize
    const x = left + normalizedX * (targetWidth || width)
    const y = top + normalizedY * (targetHeight || height)

    return new Point(x, y)
  }

  // КЛЮЧ: денормализуем относительно левого верхнего угла bounds
  const absoluteX = left + (normalizedX * width)
  const absoluteY = top + (normalizedY * height)

  return new Point(absoluteX, absoluteY)
}

/**
 * Рассчитывает нормализованный центр объекта (0..1) относительно монтажной области.
 */
export const calculateNormalizedCenter = ({
  object,
  montageArea,
  bounds
}: {
  object: FabricObject
  montageArea: FabricObject | null
  bounds: { left: number; top: number; width: number; height: number } | null
}): { x: number; y: number } | null => {
  if (!montageArea || !bounds) return null

  try {
    const centerPoint = object.getCenterPoint()

    const { left, top, width, height } = bounds

    const offsetX = centerPoint.x - left
    const offsetY = centerPoint.y - top

    const normalizedX = offsetX / width
    const normalizedY = offsetY / height

    return {
      x: normalizedX,
      y: normalizedY
    }
  } catch {
    return null
  }
}

/**
 * Возвращает bounding box объекта с учётом трансформации.
 */
export const getObjectBounds = ({
  object
}: {
  object?: FabricObject | null
}): ObjectBounds | null => {
  if (!object) return null

  try {
    object.setCoords()
    const rect = object.getBoundingRect(false, true)
    const {
      left = 0,
      top = 0,
      width = 0,
      height = 0
    } = rect

    const right = left + width
    const bottom = top + height
    const centerX = left + (width / 2)
    const centerY = top + (height / 2)

    return {
      left,
      right,
      top,
      bottom,
      centerX,
      centerY
    }
  } catch {
    return null
  }
}
