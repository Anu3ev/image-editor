import type { ObjectTargetParams } from './editor.types'
import type { SnappingObjectSnapshot } from './snapping.types'

/** Standard Fabric image-resize handle. */
export type ImageScaleControl =
  | 'tl'
  | 'mt'
  | 'tr'
  | 'ml'
  | 'mr'
  | 'bl'
  | 'mb'
  | 'br'

/** Image-geometry point in canvas-scene coordinates. */
export interface ImageScalePoint {
  x: number
  y: number
}

/** Modifier keys for a real image-resize pointer gesture. */
export interface ImageScaleModifiers {
  altKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
}

/** Options for starting image resize through a specific handle. */
export interface ImageScaleStartParams extends ObjectTargetParams, ImageScaleModifiers {
  control: ImageScaleControl
}

/** Options for active-handle movement in viewport pixels. */
export interface ImageScaleMoveByParams extends ImageScaleModifiers {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Options for moving the active handle to a canvas-scene point. */
export interface ImageScaleMoveToParams extends ImageScaleModifiers {
  point: ImageScalePoint
  pointerSteps?: number
}

/** Image-object geometry and standard controls during a scaling gesture. */
export interface ImageScaleSnapshot extends SnappingObjectSnapshot {
  centerPoint: ImageScalePoint
  controlPoints: Record<ImageScaleControl, ImageScalePoint>
  skewX: number
  skewY: number
}
