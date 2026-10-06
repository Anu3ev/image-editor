import type { CanvasFullState } from '../../../src/editor/history-manager'
import type {
  SnapshotCanvas,
  SnapshotObject
} from '../../../src/editor/history-manager/types'
import { createHistoryState } from './state-fixtures'

export interface HistorySnapshotTextObject extends SnapshotObject {
  id: string
  type: string
  text?: string
  isEditing?: boolean
  locked?: boolean
  lockMovementX?: boolean
  lockMovementY?: boolean
  selectable?: boolean
  evented?: boolean
  left?: number
  top?: number
}

type HistorySnapshotChildObject = SnapshotObject

export interface HistorySnapshotGroupObject extends SnapshotObject {
  id: string
  type: string
  shapeComposite: true
  locked?: boolean
  lockMovementX?: boolean
  lockMovementY?: boolean
  selectable?: boolean
  evented?: boolean
  left?: number
  top?: number
  getObjects: () => SnapshotObject[]
}

type HistorySnapshotCanvasObject = HistorySnapshotGroupObject | HistorySnapshotTextObject

/**
 * Creates a base serialized canvas state for history unit tests.
 */
export function createHistoryCanvasState({
  overrides = {}
}: {
  overrides?: Partial<CanvasFullState>
} = {}): CanvasFullState {
  return createHistoryState(overrides)
}

/**
 * Creates a runtime text object for snapshot/history tests.
 */
export function createSnapshotTextObject({
  id = 'text-1',
  type = 'textbox',
  text = '',
  isEditing = false,
  locked = false,
  lockMovementX = false,
  lockMovementY = false,
  selectable = true,
  evented = true,
  left = 0,
  top = 0
}: {
  id?: string
  type?: string
  text?: string
  isEditing?: boolean
  locked?: boolean
  lockMovementX?: boolean
  lockMovementY?: boolean
  selectable?: boolean
  evented?: boolean
  left?: number
  top?: number
} = {}): HistorySnapshotTextObject {
  return {
    id,
    type,
    text,
    isEditing,
    locked,
    lockMovementX,
    lockMovementY,
    selectable,
    evented,
    left,
    top
  }
}

/**
 * Creates a runtime shape group with child objects for snapshot/history tests.
 */
export function createSnapshotShapeGroup({
  id = 'shape-1',
  type = 'group',
  childObjects = [],
  locked = false,
  lockMovementX = false,
  lockMovementY = false,
  selectable = true,
  evented = true,
  left = 0,
  top = 0
}: {
  id?: string
  type?: string
  childObjects?: HistorySnapshotChildObject[]
  locked?: boolean
  lockMovementX?: boolean
  lockMovementY?: boolean
  selectable?: boolean
  evented?: boolean
  left?: number
  top?: number
} = {}): HistorySnapshotGroupObject {
  const group = {
    id,
    type,
    shapeComposite: true as const,
    locked,
    lockMovementX,
    lockMovementY,
    selectable,
    evented,
    left,
    top,
    getObjects: jest.fn(() => childObjects)
  }

  for (let index = 0; index < childObjects.length; index += 1) {
    const childObject = childObjects[index]
    childObject.group = group
  }

  return group
}

/**
 * Creates a canvas stub for snapshot helper tests.
 */
export function createSnapshotCanvas({
  objects
}: {
  objects: HistorySnapshotCanvasObject[]
}): SnapshotCanvas {
  return {
    getObjects: jest.fn(() => objects)
  }
}

/**
 * Serializes a runtime shape group into a plain object without circular references.
 */
export function serializeSnapshotShapeGroupState({
  group,
  text
}: {
  group: HistorySnapshotGroupObject
  text: HistorySnapshotTextObject
}): Record<string, unknown> {
  return {
    id: group.id,
    type: group.type,
    shapeComposite: true,
    selectable: group.selectable,
    evented: group.evented,
    lockMovementX: group.lockMovementX,
    lockMovementY: group.lockMovementY,
    objects: [{
      id: text.id,
      type: text.type,
      text: text.text,
      selectable: text.selectable,
      evented: text.evented,
      lockMovementX: text.lockMovementX,
      lockMovementY: text.lockMovementY
    }]
  }
}

/**
 * Creates a serialized canvas state with one shape group.
 */
export function createSnapshotShapeGroupHistoryState({
  group,
  text
}: {
  group: HistorySnapshotGroupObject
  text: HistorySnapshotTextObject
}): CanvasFullState {
  return createHistoryCanvasState({
    overrides: {
      objects: [serializeSnapshotShapeGroupState({
        group,
        text
      })]
    }
  })
}
