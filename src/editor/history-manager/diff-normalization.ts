import type {
  CanvasFullState,
  CanvasStateObject
} from './types'

/**
 * Creates a deep copy of the canvas state.
 */
export function cloneState({ state }: { state: CanvasFullState }): CanvasFullState {
  return JSON.parse(JSON.stringify(state)) as CanvasFullState
}

/**
 * Normalizes a value for stable serialization.
 */
function normalizeStableValue({ value }: { value: unknown }): unknown {
  if (Array.isArray(value)) {
    const normalizedArray: unknown[] = []

    for (let index = 0; index < value.length; index += 1) {
      normalizedArray.push(normalizeStableValue({ value: value[index] }))
    }

    return normalizedArray
  }

  if (value && typeof value === 'object') {
    const normalizedObject: Record<string, unknown> = {}
    const keys = Object.keys(value).sort()

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]
      normalizedObject[key] = normalizeStableValue({
        value: (value as Record<string, unknown>)[key]
      })
    }

    return normalizedObject
  }

  return value
}

/**
 * Serializes a value deterministically with sorted object keys.
 */
export function stableStringify({ value }: { value: unknown }): string {
  const normalizedValue = normalizeStableValue({ value })
  return JSON.stringify(normalizedValue)
}

/**
 * Checks whether two states are equal after normalization.
 */
export function areStatesEqual({
  prevState,
  nextState
}: {
  prevState: CanvasFullState
  nextState: CanvasFullState
}): boolean {
  const prevStable = stableStringify({ value: prevState })
  const nextStable = stableStringify({ value: nextState })

  return prevStable === nextStable
}

/**
 * Finds an object by id in the canvas object array.
 */
export function getObjectById({
  objects,
  id
}: {
  objects: CanvasStateObject[]
  id: string
}): CanvasStateObject | null {
  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    if (object.id === id) return object
  }

  return null
}

/**
 * Returns the artboard dimensions from the object list.
 */
export function getMontageAreaSize({
  objects
}: {
  objects: CanvasStateObject[]
}): { width: number; height: number } {
  const montageObject = getObjectById({
    objects,
    id: 'montage-area'
  })
  if (!montageObject) {
    return { width: 0, height: 0 }
  }

  const { width = 0, height = 0 } = montageObject
  return { width, height }
}

/**
 * Builds a flat list of state objects, including nested group objects.
 */
export function collectNestedCanvasObjects({ objects }: { objects: CanvasStateObject[] }): CanvasStateObject[] {
  const collectedObjects: CanvasStateObject[] = []
  const queue = [...objects]

  for (let index = 0; index < queue.length; index += 1) {
    const object = queue[index]
    collectedObjects.push(object)

    const childObjects = Array.isArray(object.objects) ? object.objects : []

    for (let childIndex = 0; childIndex < childObjects.length; childIndex += 1) {
      queue.push(childObjects[childIndex])
    }
  }

  return collectedObjects
}

/**
 * Normalizes backgroundColor on text objects without a background to avoid noisy diffs.
 */
export function normalizeTextBackground({ objects }: { objects: CanvasStateObject[] }): void {
  const allObjects = collectNestedCanvasObjects({ objects })

  for (let index = 0; index < allObjects.length; index += 1) {
    const object = allObjects[index]
    const {
      type,
      backgroundOpacity: rawBackgroundOpacity,
      backgroundColor: rawBackgroundColor,
      textBackgroundColor: rawTextBackgroundColor
    } = object
    const backgroundOpacity = typeof rawBackgroundOpacity === 'number' ? rawBackgroundOpacity : 0
    const backgroundColor = typeof rawBackgroundColor === 'string' ? rawBackgroundColor : ''
    const textBackgroundColor = typeof rawTextBackgroundColor === 'string' ? rawTextBackgroundColor : ''
    const isTextObject = type === 'textbox'
      || type === 'background-textbox'
    const hasBackgroundColor = backgroundColor.length > 0 || textBackgroundColor.length > 0

    if (!isTextObject) continue
    if (backgroundOpacity > 0 && hasBackgroundColor) continue

    object.backgroundColor = null
    object.textBackgroundColor = null
  }
}

/**
 * Ignores canvas dimension changes if the artboard size has not changed.
 */
export function normalizeCanvasSize({
  prevState,
  nextState
}: {
  prevState: CanvasFullState
  nextState: CanvasFullState
}): void {
  const { width: prevWidth, height: prevHeight, objects: prevObjects } = prevState
  const { objects: nextObjects } = nextState
  const {
    width: prevMontageWidth,
    height: prevMontageHeight
  } = getMontageAreaSize({ objects: prevObjects })

  const {
    width: nextMontageWidth,
    height: nextMontageHeight
  } = getMontageAreaSize({ objects: nextObjects })
  const montageSizeChanged = prevMontageWidth !== nextMontageWidth
    || prevMontageHeight !== nextMontageHeight

  if (montageSizeChanged) return

  nextState.width = prevWidth
  nextState.height = prevHeight
}

/**
 * Prepares states for diff calculation: normalizes only technical noise
 * that is unrelated to persisted scene state.
 */
export function prepareStatesForDiff({
  prevState,
  nextState
}: {
  prevState: CanvasFullState
  nextState: CanvasFullState
}): { prevState: CanvasFullState; nextState: CanvasFullState } {
  const normalizedPrevState = cloneState({ state: prevState })
  const normalizedNextState = cloneState({ state: nextState })

  normalizeTextBackground({ objects: normalizedPrevState.objects })
  normalizeTextBackground({ objects: normalizedNextState.objects })
  normalizeCanvasSize({
    prevState: normalizedPrevState,
    nextState: normalizedNextState
  })

  return {
    prevState: normalizedPrevState,
    nextState: normalizedNextState
  }
}
