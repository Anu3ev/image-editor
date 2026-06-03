/**
 * Полное сериализованное состояние canvas для history.
 */
export type CanvasStateObject = {
  [key: string]: unknown
  id?: string
  type?: string
  width?: number
  height?: number
  customData?: object | string
  objects?: CanvasStateObject[]
}

export type CanvasFullState = {
  clipPath: object | null
  height: number
  width: number
  objects: CanvasStateObject[]
  version: string
}

/**
 * Runtime-объект с полями, которые участвуют в нормализации history snapshot.
 */
export interface SnapshotObject {
  isEditing?: boolean
  locked?: boolean
  lockMovementX?: boolean
  lockMovementY?: boolean
  evented?: boolean
  selectable?: boolean
  shapeComposite?: boolean
  type?: string
  getObjects?: () => SnapshotObject[]
  group?: SnapshotObject
}

export interface SnapshotCanvas {
  getObjects?: () => SnapshotObject[]
}

/**
 * Снимок интерактивности объекта для временной нормализации перед сериализацией.
 */
export type SnapshotInteractivityState = {
  object: SnapshotObject
  lockMovementX?: boolean
  lockMovementY?: boolean
  selectable?: boolean
  evented?: boolean
}
