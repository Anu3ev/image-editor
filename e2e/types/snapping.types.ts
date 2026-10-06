import type {
  EditorObjectInfo,
  ObjectTargetParams
} from './editor.types'

/** Mutually exclusive choice of a canvas object by ID or index, or the current active object. */
export type SnappingTargetParams =
  | (ObjectTargetParams & { activeObject?: never })
  | { activeObject: true; id?: never; objectIndex?: never }

/** Direction of a regular snapping guide. */
export type SnappingGuideAxis = 'vertical' | 'horizontal'

/** Serialized regular snapping guide. */
export interface SnappingGuideInfo {
  type: SnappingGuideAxis
  position: number
}

/** Serialized equal-spacing guide. */
export interface SnappingSpacingGuideInfo {
  type: SnappingGuideAxis
  axis: number
  refStart: number
  refEnd: number
  activeStart: number
  activeEnd: number
  distance: number
}

/** Current guide state of the snapping manager. */
export interface SnappingGuideState {
  guides: SnappingGuideInfo[]
  spacingGuides: SnappingSpacingGuideInfo[]
}

/** Object snapshot with current bounds for testing snapping. */
export interface SnappingObjectSnapshot extends EditorObjectInfo {
  boundsLeft: number
  boundsTop: number
  boundsWidth: number
  boundsHeight: number
  boundsRight: number
  boundsBottom: number
  centerX: number
  centerY: number
}

/** Options for starting an interactive object drag. */
export type SnappingDragStartParams = SnappingTargetParams

/** Options for one drag step using the object's internal coordinates. */
export type SnappingDragMoveParams = SnappingTargetParams & {
  left: number
  top: number
  ctrlKey?: boolean
}

/** Options for one drag step using object bounds. */
export type SnappingDragBoundsParams = SnappingTargetParams & {
  left: number
  top: number
  ctrlKey?: boolean
}

/** Object-bounds position during a snap hold. */
export type SnappingDragBoundsPosition = Readonly<{
  left: number
  top: number
}>

/** Options for a complete drag with several steps within the hold. */
export type SnappingDragBoundsWithHoldParams = SnappingDragBoundsParams & {
  heldPositions: readonly SnappingDragBoundsPosition[]
}

/** Object and guide state at one drag step. */
export type SnappingObservedDragStep = Readonly<{
  snapshot: SnappingObjectSnapshot
  guides: SnappingGuideState
}>

/** Observable states of a complete drag with a hold. */
export type SnappingDragHoldTrace = Readonly<{
  acquired: SnappingObservedDragStep
  held: readonly SnappingObservedDragStep[]
  committed: SnappingObjectSnapshot
}>

/** Options for one drag step using the center of the object's bounds. */
export type SnappingDragCenterParams = SnappingTargetParams & {
  centerX: number
  centerY: number
  ctrlKey?: boolean
}
