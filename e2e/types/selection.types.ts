import type { SnappingObjectSnapshot } from './snapping.types'
import type { ShapeScaleSnapshot } from './shape.types'
import type { TextResizeSnapshot } from './text.types'

/** Ручка, за которую можно изменить размер активного составного объекта. */
export type SelectionControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

/** Направление повторного уменьшения общего выделения до доменных ограничений. */
export type SelectionMinimumScaleDirection =
  | Readonly<{ axis: 'horizontal' }>
  | Readonly<{ axis: 'vertical' }>
  | Readonly<{ axis: 'diagonal', corner: 'tr' | 'br' }>

/** Состояние одного шейпа после очередного уменьшения общего выделения. */
export interface SelectionMinimumShapeState {
  id: string
  lineCount: number
  snapshot: ShapeScaleSnapshot
}

/** Состояние шейпов на одном этапе повторного скейлинга общего выделения. */
export interface SelectionMinimumScaleState {
  label: string
  shapes: readonly SelectionMinimumShapeState[]
}

/** Снимок дочернего объекта с локальными свойствами, защищёнными во время скейлинга. */
export interface SelectionCompositionChildSnapshot extends SnappingObjectSnapshot {
  cropX: number
  cropY: number
  id: string
  originX: string
  originY: string
  skewX: number
  skewY: number
}

/** Снимок активного составного объекта и его прямых дочерних объектов. */
export interface SelectionCompositionSnapshot {
  selection: SnappingObjectSnapshot
  children: SelectionCompositionChildSnapshot[]
}

/** Канонические свойства отдельных текстов и рамка их общего выделения. */
export interface SelectionTextCompositionSnapshot {
  selection: SnappingObjectSnapshot
  children: TextResizeSnapshot[]
}

/** Видимая геометрия дочернего объекта в координатах сцены. */
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

/** Состояние изображений и текстов в одном общем выделении вместе с их видимой геометрией. */
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
