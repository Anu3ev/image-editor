import { Point, Textbox, type FabricObject } from 'fabric'
import { english, type Translate } from '../i18n'

/** Object dimensions in the coordinates defined by its current geometry contract. */
export type Dimensions = {
  width: number
  height: number
}

/** Object edges and centers calculated in scene coordinates. */
export type ObjectBounds = {
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  centerY: number
}

/** Method for reading exact bounds or rounded bounds compatible with legacy code. */
type VisualBoundsMode = 'exact' | 'compatible'

/**
 * Returns a numeric value or fallback if value is invalid.
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
 * Converts an absolute coordinate/dimension to a relative fraction (0..1) of the artboard dimensions.
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
 * Returns the object's normalized placement point (0..1).
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
 * Converts a normalized placement point (0..1) back to absolute canvas coordinates.
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
 * Calculates the object's normalized placement point (0..1) relative to bounds.
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
 * Rounds the object's position and scale so that its visual dimensions and coordinates are integer pixels.
 * For text, scale is not quantized: TextManager owns the canonical geometry of standalone-textbox.
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
 * Checks whether custom bounds can be used in geometry calculations.
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
 * Collects the object's bounds and calculates centers from the same exact values.
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
 * Validates the object's exact bounds before use.
 */
function assertExactObjectBounds({
  t = english,
  bounds,
  source
}: {
  t?: Translate
  bounds: ObjectBounds
  source: string
}): void {
  const { left, right, top, bottom } = bounds
  const hasFiniteEdges = Number.isFinite(left)
    && Number.isFinite(right)
    && Number.isFinite(top)
    && Number.isFinite(bottom)

  if (!hasFiniteEdges) {
    throw new Error(t('geometry.errors.nonFiniteEdges', { source }))
  }

  if (right < left || bottom < top) {
    throw new Error(t('geometry.errors.unorderedEdges', { source }))
  }
}

/**
 * Returns the object's visual bounds without custom snapping geometry.
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
 * Returns the object's exact bounds in scene coordinates, accounting for its transformation.
 * Invalid custom bounds cause an error instead of being replaced with different geometry.
 */
export const getObjectExactBounds = ({
  t = english,
  object
}: {
  t?: Translate
  object?: FabricObject | null
}): ObjectBounds | null => {
  if (!object) return null

  const customBounds = object.getObjectSnappingBounds?.()
  if (customBounds) {
    assertExactObjectBounds({
      t,
      bounds: customBounds,
      source: t('geometry.labels.customSnappingBounds')
    })

    return createObjectBounds(customBounds)
  }

  const visualBounds = getObjectVisualBounds({ object, mode: 'exact' })
  if (!visualBounds) return null

  assertExactObjectBounds({
    t,
    bounds: visualBounds,
    source: t('geometry.labels.visualBounds')
  })

  return visualBounds
}

/**
 * Returns the object's bounding box, accounting for its transformation and rounding to integer pixels.
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
