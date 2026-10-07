import type { SnappingObjectSnapshot } from './snapping.types'
import type { ShapeScaleSnapshot, ShapeTextInfo } from './shape.types'
import type { TextResizeSnapshot } from './text.types'

/** Handle used to resize the active composite object. */
export type SelectionControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

/** Direction of repeated active-selection shrinkage to domain limits. */
export type SelectionMinimumScaleDirection =
  | Readonly<{ axis: 'horizontal' }>
  | Readonly<{ axis: 'vertical' }>
  | Readonly<{ axis: 'diagonal', corner: 'tr' | 'br' }>

/** State of one shape after another active-selection shrink step. */
export interface SelectionMinimumShapeState {
  id: string
  lineCount: number
  snapshot: ShapeScaleSnapshot
}

/** Shape state at one stage of repeated active-selection scaling. */
export interface SelectionMinimumScaleState {
  label: string
  shapes: readonly SelectionMinimumShapeState[]
}

/** Child-object snapshot with local properties protected during scaling. */
export interface SelectionCompositionChildSnapshot extends SnappingObjectSnapshot {
  cropX: number
  cropY: number
  id: string
  originX: string
  originY: string
  skewX: number
  skewY: number
}

/** Snapshot of the active composite object and its direct children. */
export interface SelectionCompositionSnapshot {
  selection: SnappingObjectSnapshot
  children: SelectionCompositionChildSnapshot[]
}

/** Canonical properties of standalone text objects and their active-selection frame. */
export interface SelectionTextCompositionSnapshot {
  selection: SnappingObjectSnapshot
  children: TextResizeSnapshot[]
}

/** Child object's visible geometry in scene coordinates. */
export interface SelectionChildSceneGeometrySnapshot {
  angle: number
  centerX: number
  centerY: number
  height: number
  id: string
  leftEdgeLength: number
  orthogonality: number
  scaleX: number
  scaleY: number
  sceneAngle: number
  skewX: number
  skewY: number
  topEdgeLength: number
  width: number
}

/** State of images and text objects in one active selection, with their visible geometry. */
export interface SelectionImageTextCompositionSnapshot {
  selection: SnappingObjectSnapshot
  images: Array<{
    geometry: SelectionChildSceneGeometrySnapshot
    snapshot: SelectionCompositionChildSnapshot
  }>
  texts: Array<{
    geometry: SelectionChildSceneGeometrySnapshot
    snapshot: TextResizeSnapshot
  }>
}

/** State of the full mixed composition with children's canonical and visible geometry. */
export interface SelectionMixedCompositionSnapshot {
  selection: SnappingObjectSnapshot
  images: Array<{
    geometry: SelectionChildSceneGeometrySnapshot
    snapshot: SelectionCompositionChildSnapshot
  }>
  shapes: Array<{
    geometry: SelectionChildSceneGeometrySnapshot
    snapshot: ShapeScaleSnapshot
    text: ShapeTextInfo
  }>
  texts: Array<{
    geometry: SelectionChildSceneGeometrySnapshot
    snapshot: TextResizeSnapshot
  }>
}
