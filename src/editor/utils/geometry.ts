import { Point, Textbox, type FabricObject } from 'fabric'

/** Размер объекта в координатах его текущего геометрического контракта. */
export type Dimensions = {
  width: number
  height: number
}

/** Грани объекта и центры, рассчитанные в координатах сцены. */
export type ObjectBounds = {
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  centerY: number
}

/** Способ чтения точных или совместимых со старым кодом округлённых границ. */
type VisualBoundsMode = 'exact' | 'compatible'

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
 * Собирает границы объекта и рассчитывает центры из тех же точных значений.
 */
function createObjectBounds({
  left,
  right,
  top,
  bottom
}: {
  left: number
  right: number
  top: number
  bottom: number
}): ObjectBounds {
  return {
    left,
    right,
    top,
    bottom,
    centerX: left + ((right - left) / 2),
    centerY: top + ((bottom - top) / 2)
  }
}

/**
 * Проверяет точные границы объекта перед использованием.
 */
function assertExactObjectBounds({
  bounds,
  source
}: {
  bounds: ObjectBounds
  source: 'custom snapping bounds' | 'visual bounds'
}): void {
  const { left, right, top, bottom } = bounds
  const hasFiniteEdges = Number.isFinite(left)
    && Number.isFinite(right)
    && Number.isFinite(top)
    && Number.isFinite(bottom)

  if (!hasFiniteEdges) {
    throw new Error(`Invalid ${source}: edges must be finite`)
  }

  if (right < left || bottom < top) {
    throw new Error(`Invalid ${source}: edges must be ordered`)
  }
}

/**
 * Возвращает видимые границы объекта без пользовательской геометрии прилипания.
 */
function getObjectVisualBounds({
  object,
  mode
}: {
  object: FabricObject
  mode: VisualBoundsMode
}): ObjectBounds | null {
  try {
    object.setCoords()
    const rect = object.getBoundingRect()
    const left = mode === 'compatible' ? rect.left ?? 0 : rect.left
    const top = mode === 'compatible' ? rect.top ?? 0 : rect.top
    const width = mode === 'compatible' ? rect.width ?? 0 : rect.width
    const height = mode === 'compatible' ? rect.height ?? 0 : rect.height

    return createObjectBounds({
      left,
      right: left + width,
      top,
      bottom: top + height
    })
  } catch {
    return null
  }
}

/**
 * Возвращает точные границы объекта в координатах сцены с учётом трансформации.
 * Некорректные пользовательские границы приводят к ошибке вместо подмены другой геометрией.
 */
export const getObjectExactBounds = ({
  object
}: {
  object?: FabricObject | null
}): ObjectBounds | null => {
  if (!object) return null

  const customBounds = object.getObjectSnappingBounds?.()
  if (customBounds) {
    assertExactObjectBounds({
      bounds: customBounds,
      source: 'custom snapping bounds'
    })

    return createObjectBounds(customBounds)
  }

  const visualBounds = getObjectVisualBounds({ object, mode: 'exact' })
  if (!visualBounds) return null

  assertExactObjectBounds({
    bounds: visualBounds,
    source: 'visual bounds'
  })

  return visualBounds
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

  const bounds = getObjectVisualBounds({ object, mode: 'compatible' })
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
