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

/** Текущее состояние направляющих менеджера прилипания. */
export interface SnappingGuideState {
  guides: SnappingGuideInfo[]
  spacingGuides: SnappingSpacingGuideInfo[]
}

/** Снимок объекта с текущими границами для проверки прилипания. */
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

/** Параметры одного шага перетаскивания по внутренним координатам объекта. */
export interface SnappingDragMoveParams extends ObjectTargetParams {
  left: number
  top: number
  ctrlKey?: boolean
}

/** Параметры одного шага перетаскивания по границам объекта. */
export interface SnappingDragBoundsParams extends ObjectTargetParams {
  left: number
  top: number
  ctrlKey?: boolean
}

/** Положение границ объекта во время удержания прилипания. */
export type SnappingDragBoundsPosition = Readonly<{
  left: number
  top: number
}>

/** Параметры полного перетаскивания с несколькими шагами внутри удержания. */
export interface SnappingDragBoundsWithHoldParams extends SnappingDragBoundsParams {
  heldPositions: readonly SnappingDragBoundsPosition[]
}

/** Состояние объекта и направляющих на одном шаге перетаскивания. */
export type SnappingObservedDragStep = Readonly<{
  snapshot: SnappingObjectSnapshot
  guides: SnappingGuideState
}>

/** Наблюдаемые состояния полного перетаскивания с удержанием. */
export type SnappingDragHoldTrace = Readonly<{
  acquired: SnappingObservedDragStep
  held: readonly SnappingObservedDragStep[]
  committed: SnappingObjectSnapshot
}>

/** Параметры одного шага перетаскивания по центру границ объекта. */
export interface SnappingDragCenterParams extends ObjectTargetParams {
  centerX: number
  centerY: number
  ctrlKey?: boolean
}
