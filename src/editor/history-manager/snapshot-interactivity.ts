import type {
  SnapshotCanvas,
  SnapshotInteractivityState,
  SnapshotObject
} from './types'

/**
 * Returns a group's child objects in snapshot format.
 */
export function getChildSnapshotObjects({ object }: { object: SnapshotObject }): SnapshotObject[] {
  if (typeof object.getObjects !== 'function') return []

  return object.getObjects()
}

/**
 * Checks whether the object list contains text in editing mode.
 */
export function hasEditingTextInObjects({ objects }: { objects: SnapshotObject[] }): boolean {
  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    if (!object.isEditing) continue

    return true
  }

  return false
}

/**
 * Checks whether an object is a text object for history snapshot purposes.
 */
export function isTextSnapshotObject({ object }: { object: SnapshotObject }): boolean {
  const type = typeof object.type === 'string' ? object.type.toLowerCase() : ''

  return type === 'textbox'
    || type === 'background-textbox'
    || typeof object.isEditing === 'boolean'
}

/**
 * Creates a snapshot of an object's interactivity for later restoration.
 */
export function createSnapshotInteractivityState({
  object,
  withEvented = false
}: {
  object: SnapshotObject
  withEvented?: boolean
}): SnapshotInteractivityState {
  const snapshotState: SnapshotInteractivityState = {
    object,
    lockMovementX: object.lockMovementX,
    lockMovementY: object.lockMovementY,
    selectable: object.selectable
  }

  if (withEvented) {
    snapshotState.evented = object.evented
  }

  return snapshotState
}

/**
 * Normalizes a shape group if text inside it is currently being edited.
 */
export function normalizeShapeGroupForSnapshot({
  object,
  snapshotStates
}: {
  object: SnapshotObject
  snapshotStates: SnapshotInteractivityState[]
}): boolean {
  if (object.shapeComposite !== true) return false

  const childObjects = getChildSnapshotObjects({ object })
  const hasEditingText = hasEditingTextInObjects({ objects: childObjects })
  if (!hasEditingText) return false

  snapshotStates.push(createSnapshotInteractivityState({ object }))

  object.lockMovementX = false
  object.lockMovementY = false
  object.selectable = true

  return true
}

/**
 * Normalizes text inside a shape group during active text editing.
 */
export function normalizeEditingShapeTextForSnapshot({
  object,
  snapshotStates
}: {
  object: SnapshotObject
  snapshotStates: SnapshotInteractivityState[]
}): boolean {
  if (!isTextSnapshotObject({ object })) return false

  const parentGroup = object.group
  const { isEditing } = object
  const isShapeText = parentGroup?.shapeComposite === true
  const parentLocked = Boolean(parentGroup?.locked)

  if (!isShapeText || parentLocked || !isEditing) return false

  snapshotStates.push(createSnapshotInteractivityState({
    object,
    withEvented: true
  }))

  object.lockMovementX = false
  object.lockMovementY = false
  object.selectable = false
  object.evented = false

  return true
}

/**
 * Temporarily clears movement locks on a regular text object for snapshot serialization.
 */
export function normalizeLockedTextObjectForSnapshot({
  object,
  snapshotStates
}: {
  object: SnapshotObject
  snapshotStates: SnapshotInteractivityState[]
}): boolean {
  if (!isTextSnapshotObject({ object })) return false

  const lockMovementX = Boolean(object.lockMovementX)
  const lockMovementY = Boolean(object.lockMovementY)
  if (!lockMovementX && !lockMovementY) return false

  snapshotStates.push(createSnapshotInteractivityState({ object }))

  object.lockMovementX = false
  object.lockMovementY = false
  object.selectable = true

  return true
}

/**
 * Normalizes object interactivity before snapshot serialization.
 */
export function normalizeSnapshotObjects({
  objects
}: {
  objects: SnapshotObject[]
}): SnapshotInteractivityState[] {
  const snapshotStates: SnapshotInteractivityState[] = []

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    if (object.locked) continue

    const shapeGroupHandled = normalizeShapeGroupForSnapshot({
      object,
      snapshotStates
    })
    if (shapeGroupHandled) continue

    const editingShapeTextHandled = normalizeEditingShapeTextForSnapshot({
      object,
      snapshotStates
    })
    if (editingShapeTextHandled) continue

    normalizeLockedTextObjectForSnapshot({
      object,
      snapshotStates
    })
  }

  return snapshotStates
}

/**
 * Builds a flat list of canvas objects including group children.
 */
export function collectSnapshotObjects({ canvas }: { canvas: SnapshotCanvas }): SnapshotObject[] {
  const queue = [...canvas.getObjects?.() ?? []]
  const objects: SnapshotObject[] = []

  for (let index = 0; index < queue.length; index += 1) {
    const object = queue[index]
    objects.push(object)

    const childObjects = getChildSnapshotObjects({ object })
    for (let childIndex = 0; childIndex < childObjects.length; childIndex += 1) {
      queue.push(childObjects[childIndex])
    }
  }

  return objects
}

/**
 * Restores object interactivity after the snapshot is complete.
 */
export function restoreSnapshotInteractivity({
  snapshotStates
}: {
  snapshotStates: SnapshotInteractivityState[]
}): void {
  for (let index = 0; index < snapshotStates.length; index += 1) {
    const {
      object,
      lockMovementX,
      lockMovementY,
      selectable,
      evented
    } = snapshotStates[index]

    object.lockMovementX = lockMovementX
    object.lockMovementY = lockMovementY
    object.selectable = selectable

    if (evented === undefined) continue

    object.evented = evented
  }
}

/**
 * Runs a callback with temporarily normalized object interactivity for a history snapshot.
 */
export function withNormalizedInteractivityForSnapshot<T>({
  canvas,
  callback
}: {
  canvas: SnapshotCanvas
  callback: () => T
}): T {
  const objects = collectSnapshotObjects({ canvas })
  const snapshotStates = normalizeSnapshotObjects({ objects })

  try {
    return callback()
  } finally {
    restoreSnapshotInteractivity({ snapshotStates })
  }
}
