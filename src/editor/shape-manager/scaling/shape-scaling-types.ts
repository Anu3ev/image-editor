import type {
  Canvas,
  FabricObject,
  Transform
} from 'fabric'
import type {
  ShapeScalingPointerEvent
} from './shape-scaling-layout'

/**
 * Fabric-event payload for live shape-group scaling.
 */
export type ShapeScalingEvent = {
  target?: FabricObject | null
  e?: ShapeScalingPointerEvent
  transform?: Transform | null
}

/**
 * Fabric-event payload for the commit step after a shape-group change.
 */
export type ShapeModifiedEvent = {
  target?: FabricObject | null
  e?: ShapeScalingPointerEvent
  transform?: Transform | null
}

/**
 * Live-scaling decision after checking text and dimension constraints.
 */
export type ShapeScalingDecision = {
  appliedScaleX: number
  appliedScaleY: number
  previewHeight: number
  shouldHandleAsNoop: boolean
  shouldRestoreLastAllowedTransform: boolean
}

/**
 * Scaling direction along an axis relative to the transform origin.
 */
export type ShapeScaleDirection = -1 | 1

/**
 * Fabric canvas with the current transform stored during live interaction.
 */
export type CanvasWithCurrentTransform = Canvas & {
  _currentTransform?: Transform | null
}
