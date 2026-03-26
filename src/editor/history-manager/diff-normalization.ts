import type { FabricObject } from 'fabric'
import type { CanvasFullState } from './types'

/**
 * Делает глубокую копию состояния canvas.
 */
export function cloneState({ state }: { state: CanvasFullState }): CanvasFullState {
  return JSON.parse(JSON.stringify(state)) as CanvasFullState
}

/**
 * Нормализует значение для стабильной сериализации.
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
 * Делает устойчивую сериализацию значения с сортировкой ключей объектов.
 */
export function stableStringify({ value }: { value: unknown }): string {
  const normalizedValue = normalizeStableValue({ value })
  return JSON.stringify(normalizedValue)
}

/**
 * Проверяет, равны ли два состояния после нормализации.
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
 * Находит объект по id в массиве объектов canvas.
 */
export function getObjectById({
  objects,
  id
}: {
  objects: FabricObject[]
  id: string
}): FabricObject | null {
  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index] as FabricObject & { id?: string }
    if (object.id === id) return object
  }

  return null
}

/**
 * Возвращает размеры монтажной области из списка объектов.
 */
export function getMontageAreaSize({
  objects
}: {
  objects: FabricObject[]
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
 * Собирает плоский список объектов состояния, включая вложенные объекты групп.
 */
export function collectNestedCanvasObjects({ objects }: { objects: FabricObject[] }): FabricObject[] {
  const collectedObjects: FabricObject[] = []
  const queue = [...objects]

  for (let index = 0; index < queue.length; index += 1) {
    const object = queue[index]
    collectedObjects.push(object)

    const groupObject = object as FabricObject & {
      objects?: FabricObject[]
    }
    const childObjects = Array.isArray(groupObject.objects) ? groupObject.objects : []

    for (let childIndex = 0; childIndex < childObjects.length; childIndex += 1) {
      queue.push(childObjects[childIndex])
    }
  }

  return collectedObjects
}

/**
 * Нормализует backgroundColor у текстовых объектов без фона, чтобы избежать шумовых diff.
 */
export function normalizeTextBackground({ objects }: { objects: FabricObject[] }): void {
  const allObjects = collectNestedCanvasObjects({ objects })

  for (let index = 0; index < allObjects.length; index += 1) {
    const object = allObjects[index] as FabricObject & {
      type?: string
      backgroundOpacity?: number
      backgroundColor?: string | null
      textBackgroundColor?: string | null
    }
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
 * Игнорирует изменения размеров canvas, если размер монтажной области не менялся.
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
 * Подготавливает состояния для расчёта diff: нормализует только технический шум,
 * который не относится к persisted scene state.
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
