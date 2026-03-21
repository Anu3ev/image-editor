import type {
  EditorObjectInfo,
  ObjectTargetParams
} from './editor.types'

/** Направление обычной направляющей прилипания. */
export type SnappingGuideAxis = 'vertical' | 'horizontal'

/** Сериализованная обычная направляющая прилипания. */
export interface SnappingGuideInfo {
  type: SnappingGuideAxis
  position: number
}

/** Сериализованная направляющая равноудалённости. */
export interface SnappingSpacingGuideInfo {
  type: SnappingGuideAxis
  axis: number
  refStart: number
  refEnd: number
  activeStart: number
  activeEnd: number
  distance: number
}

/** Текущее состояние направляющих SnappingManager. */
export interface SnappingGuideState {
  guides: SnappingGuideInfo[]
  spacingGuides: SnappingSpacingGuideInfo[]
}

/** Snapshot объекта canvas с текущим bounding box для snapping-assertions. */
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

/** Параметры начала интерактивного перетаскивания объекта. */
export type SnappingDragStartParams = ObjectTargetParams

/** Параметры одного live-шага перетаскивания по внутренним координатам объекта. */
export interface SnappingDragMoveParams extends ObjectTargetParams {
  left: number
  top: number
  ctrlKey?: boolean
}

/** Параметры одного live-шага перетаскивания по границам объекта. */
export interface SnappingDragBoundsParams extends ObjectTargetParams {
  left: number
  top: number
  ctrlKey?: boolean
}

/** Параметры одного live-шага перетаскивания по центру bounding box. */
export interface SnappingDragCenterParams extends ObjectTargetParams {
  centerX: number
  centerY: number
  ctrlKey?: boolean
}
