/**
 * Full serialized canvas state for history.
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
 * Runtime object with fields used in history snapshot normalization.
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
 * Snapshot of object interactivity for temporary normalization before serialization.
 */
export type SnapshotInteractivityState = {
  object: SnapshotObject
  lockMovementX?: boolean
  lockMovementY?: boolean
  selectable?: boolean
  evented?: boolean
}
