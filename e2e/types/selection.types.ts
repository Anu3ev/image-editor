import type { SnappingObjectSnapshot } from './snapping.types'

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
