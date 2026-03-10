import { Textbox, type Canvas } from 'fabric'
import type {
  SnapshotInteractivityState,
  SnapshotObject
} from './types'

/**
 * Возвращает дочерние объекты группы в snapshot-формате.
 */
export function getChildSnapshotObjects({ object }: { object: SnapshotObject }): SnapshotObject[] {
  if (typeof object.getObjects !== 'function') return []

  return object.getObjects() as SnapshotObject[]
}

/**
 * Проверяет, содержит ли список объектов текст в режиме редактирования.
 */
export function hasEditingTextInObjects({ objects }: { objects: SnapshotObject[] }): boolean {
  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index] as Textbox
    if (!object.isEditing) continue

    return true
  }

  return false
}

/**
 * Проверяет, является ли объект текстовым для целей history snapshot.
 */
export function isTextSnapshotObject({ object }: { object: SnapshotObject }): boolean {
  const type = typeof object.type === 'string' ? object.type.toLowerCase() : ''

  return type === 'textbox'
    || type === 'background-textbox'
    || typeof (object as Textbox).isEditing === 'boolean'
}

/**
 * Создаёт снимок интерактивности объекта для последующего восстановления.
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
 * Нормализует shape-группу, если внутри неё сейчас редактируется текст.
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
 * Нормализует текст внутри shape-группы во время активного text-edit.
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
  const { isEditing } = object as Textbox
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
 * Временно снимает lock-свойства у обычного текстового объекта для сериализации snapshot.
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
 * Нормализует интерактивность объектов перед сериализацией snapshot.
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
 * Собирает плоский список объектов canvas вместе с дочерними объектами групп.
 */
export function collectSnapshotObjects({ canvas }: { canvas: Canvas }): SnapshotObject[] {
  const queue = [...canvas.getObjects?.() ?? []] as SnapshotObject[]
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
 * Восстанавливает интерактивность объектов после завершения snapshot.
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
 * Выполняет callback с временно нормализованной интерактивностью объектов для history snapshot.
 */
export function withNormalizedInteractivityForSnapshot<T>({
  canvas,
  callback
}: {
  canvas: Canvas
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
