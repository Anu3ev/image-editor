import { Point, Textbox, type FabricObject } from 'fabric'

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
 * Возвращает нормализованную placement-точку объекта (0..1).
 */
export const resolveNormalizedPlacement = ({
  object,
  baseWidth,
  baseHeight,
  useRelativePositions
}: {
  object: FabricObject
  baseWidth: number
  baseHeight: number
  useRelativePositions: boolean
}): { x: number; y: number } => {
  return {
    x: normalizeStoredValue({
      value: object.left,
      dimension: baseWidth,
      useRelativePositions
    }),
    y: normalizeStoredValue({
      value: object.top,
      dimension: baseHeight,
      useRelativePositions
    })
  }
}

/**
 * Преобразует нормализованную placement-точку (0..1) обратно в абсолютные координаты на полотне.
 */
export const denormalizePlacement = ({
  normalizedX,
  normalizedY,
  bounds
}: {
  normalizedX: number
  normalizedY: number
  bounds: { left: number; top: number; width: number; height: number }
}): Point => {
  const {
    left,
    top,
    width,
    height
  } = bounds

  return new Point(
    left + (normalizedX * width),
    top + (normalizedY * height)
  )
}

/**
 * Рассчитывает нормализованную placement-точку объекта (0..1) относительно bounds.
 */
export const calculateNormalizedPlacement = ({
  object,
  bounds
}: {
  object: FabricObject
  bounds: { left: number; top: number; width: number; height: number } | null
}): { x: number; y: number } | null => {
  if (!bounds) return null

  try {
    const originX = object.originX ?? 'center'
    const originY = object.originY ?? 'center'
    const placementPoint = object.getPointByOrigin(originX, originY)

    const { left, top, width, height } = bounds

    return {
      x: (placementPoint.x - left) / width,
      y: (placementPoint.y - top) / height
    }
  } catch {
    return null
  }
}

/**
 * Округляет позицию и масштаб объекта так, чтобы визуальные размеры и координаты были целыми пикселями.
 * Для текста scale не квантизируется: канонической геометрией standalone-textbox владеет TextManager.
 */
export const snapObjectToPixelGrid = ({
  object
}: {
  object: FabricObject
}): void => {
  const {
    left = 0,
    top = 0,
    width = 0,
    height = 0,
    scaleX = 1,
    scaleY = 1,
    strokeWidth = 0,
    strokeUniform = false
  } = object

  const objectType = typeof object.type === 'string' ? object.type.toLowerCase() : ''
  const isTextbox = object instanceof Textbox
    || objectType === 'textbox'
    || objectType === 'background-textbox'
  const strokeContribution = strokeUniform ? 0 : strokeWidth
  const effectiveWidth = width + strokeContribution
  const effectiveHeight = height + strokeContribution

  const snappedLeft = Math.round(left)
  const snappedTop = Math.round(top)

  const updates: Partial<Record<string, number>> = {
    left: snappedLeft,
    top: snappedTop
  }

  if (!isTextbox) {
    if (effectiveWidth > 0) {
      updates.scaleX = Math.max(1, Math.round(effectiveWidth * scaleX)) / effectiveWidth
    }

    if (effectiveHeight > 0) {
      updates.scaleY = Math.max(1, Math.round(effectiveHeight * scaleY)) / effectiveHeight
    }
  }

  object.set(updates)
  object.setCoords()
}

/**
 * Проверяет, что кастомные bounds можно использовать в геометрических расчётах.
 */
function isFiniteObjectBounds({ bounds }: { bounds: ObjectBounds }): boolean {
  return Number.isFinite(bounds.left)
    && Number.isFinite(bounds.right)
    && Number.isFinite(bounds.top)
    && Number.isFinite(bounds.bottom)
    && Number.isFinite(bounds.centerX)
    && Number.isFinite(bounds.centerY)
}

/**
 * Возвращает visual bounding box объекта без custom snapping bounds.
 */
function getObjectVisualBounds({
  object
}: {
  object: FabricObject
}): ObjectBounds | null {
  try {
    object.setCoords()
    const rect = object.getBoundingRect()
    const {
      left: rawLeft = 0,
      top: rawTop = 0,
      width = 0,
      height = 0
    } = rect

    const left = rawLeft
    const top = rawTop

    return {
      left,
      right: left + width,
      top,
      bottom: top + height,
      centerX: left + (width / 2),
      centerY: top + (height / 2)
    }
  } catch {
    return null
  }
}

/**
 * Возвращает точный bounding box объекта с учётом трансформации.
 */
export const getObjectExactBounds = ({
  object
}: {
  object?: FabricObject | null
}): ObjectBounds | null => {
  if (!object) return null

  const customBounds = object.getObjectSnappingBounds?.()
  if (customBounds && isFiniteObjectBounds({ bounds: customBounds })) {
    return customBounds
  }

  return getObjectVisualBounds({ object })
}

/**
 * Возвращает bounding box объекта с учётом трансформации и округлением до целых пикселей.
 */
export const getObjectBounds = ({
  object
}: {
  object?: FabricObject | null
}): ObjectBounds | null => {
  if (!object) return null

  const customBounds = object.getObjectSnappingBounds?.()
  if (customBounds && isFiniteObjectBounds({ bounds: customBounds })) {
    return customBounds
  }

  const bounds = getObjectVisualBounds({ object })
  if (!bounds) return null

  const roundedWidth = Math.round(bounds.right - bounds.left)
  const roundedHeight = Math.round(bounds.bottom - bounds.top)
  const right = bounds.left + roundedWidth
  const bottom = bounds.top + roundedHeight

  return {
    left: bounds.left,
    right,
    top: bounds.top,
    bottom,
    centerX: bounds.left + (roundedWidth / 2),
    centerY: bounds.top + (roundedHeight / 2)
  }
}
