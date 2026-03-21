import type { FabricObject } from 'fabric'

/**
 * Полное сериализованное состояние canvas для history.
 */
export type CanvasFullState = {
  clipPath: object | null
  height: number
  width: number
  objects: FabricObject[]
  version: string
}

/**
 * Fabric-объект с runtime-свойствами, которые участвуют в нормализации snapshot.
 */
export type SnapshotObject = FabricObject & {
  locked?: boolean
  lockMovementX?: boolean
  lockMovementY?: boolean
  evented?: boolean
  selectable?: boolean
  shapeComposite?: boolean
  type?: string
  getObjects?: () => FabricObject[]
  group?: SnapshotObject
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
