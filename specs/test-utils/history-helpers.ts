import type { Canvas } from 'fabric'
import type { CanvasFullState } from '../../src/editor/history-manager'
import type { SnapshotObject } from '../../src/editor/history-manager/types'

export type HistorySnapshotTextObject = SnapshotObject & {
  id: string
  type: string
  isEditing?: boolean
}

export type HistorySnapshotGroupObject = SnapshotObject & {
  id: string
  type: string
  shapeComposite: true
  getObjects: () => SnapshotObject[]
}

/**
 * Создаёт базовое сериализованное состояние canvas для unit-тестов history.
 */
export function createHistoryCanvasState({
  overrides = {}
}: {
  overrides?: Partial<CanvasFullState>
} = {}): CanvasFullState {
  return {
    clipPath: null,
    width: 800,
    height: 600,
    version: '5.0.0',
    objects: [],
    ...overrides
  }
}

/**
 * Создаёт runtime-объект текста для snapshot/history-тестов.
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
  } as HistorySnapshotTextObject
}

/**
 * Создаёт runtime shape-группу с дочерними объектами для snapshot/history-тестов.
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
  childObjects?: SnapshotObject[]
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
  } as HistorySnapshotGroupObject

  for (let index = 0; index < childObjects.length; index += 1) {
    const childObject = childObjects[index] as SnapshotObject & {
      group?: SnapshotObject
    }
    childObject.group = group
  }

  return group
}

/**
 * Создаёт canvas-стаб для snapshot helper-тестов.
 */
export function createSnapshotCanvas({
  objects
}: {
  objects: SnapshotObject[]
}): Canvas {
  return {
    getObjects: jest.fn(() => objects)
  } as unknown as Canvas
}

/**
 * Сериализует runtime shape-группу в plain object без циклических ссылок.
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
      text: (text as HistorySnapshotTextObject & { text?: string }).text,
      selectable: text.selectable,
      evented: text.evented,
      lockMovementX: text.lockMovementX,
      lockMovementY: text.lockMovementY
    }]
  }
}
