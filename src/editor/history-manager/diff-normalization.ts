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
 * Возвращает набор id объектов, которые не должны сдвигаться при нормализации.
 */
export function getTranslationIgnoredIds(): Set<string> {
  return new Set(['montage-area', 'overlay-mask', 'background'])
}

/**
 * Возвращает позицию clipPath из состояния, если она доступна.
 */
export function getClipPathPosition({
  clipPath
}: {
  clipPath: object | null
}): { left: number; top: number } | null {
  if (!clipPath || typeof clipPath !== 'object') return null

  const { left, top } = clipPath as { left?: number; top?: number }
  if (typeof left !== 'number' || typeof top !== 'number') return null

  return { left, top }
}

/**
 * Возвращает позицию монтажной области из списка объектов.
 */
export function getMontageAreaPosition({
  objects
}: {
  objects: FabricObject[]
}): { left: number; top: number } {
  const montageObject = getObjectById({
    objects,
    id: 'montage-area'
  })
  if (!montageObject) {
    return { left: 0, top: 0 }
  }

  const { left = 0, top = 0 } = montageObject
  return { left, top }
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
      || type === 'i-text'
      || type === 'text'
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
 * Компенсирует смещение монтажной области, чтобы не сохранять ресайз как изменение history.
 */
export function normalizeTranslation({
  prevState,
  nextState
}: {
  prevState: CanvasFullState
  nextState: CanvasFullState
}): void {
  const { objects: prevObjects, clipPath: prevClipPath } = prevState
  const { objects: nextObjects, clipPath: nextClipPath } = nextState
  const {
    left: prevMontageLeft,
    top: prevMontageTop
  } = getMontageAreaPosition({ objects: prevObjects })
  const {
    left: nextMontageLeft,
    top: nextMontageTop
  } = getMontageAreaPosition({ objects: nextObjects })

  const deltaX = nextMontageLeft - prevMontageLeft
  const deltaY = nextMontageTop - prevMontageTop
  if (deltaX === 0 && deltaY === 0) return

  const montageObject = getObjectById({
    objects: nextObjects,
    id: 'montage-area'
  })
  if (montageObject) {
    montageObject.left = prevMontageLeft
    montageObject.top = prevMontageTop
  }

  const prevClipPathPosition = getClipPathPosition({ clipPath: prevClipPath })
  if (prevClipPathPosition && nextClipPath && typeof nextClipPath === 'object') {
    const { left, top } = prevClipPathPosition
    const clipPathObject = nextClipPath as { left?: number; top?: number }

    clipPathObject.left = left
    clipPathObject.top = top
  }

  const ignoredIds = getTranslationIgnoredIds()
  for (let index = 0; index < nextObjects.length; index += 1) {
    const object = nextObjects[index] as FabricObject & { id?: string }
    const { id } = object

    if (id && ignoredIds.has(id)) continue

    if (typeof object.left === 'number') {
      object.left -= deltaX
    }

    if (typeof object.top === 'number') {
      object.top -= deltaY
    }
  }
}

/**
 * Подготавливает состояния для расчёта diff: нормализует технические изменения
 * и компенсирует смещения при ресайзе окна.
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
  normalizeTranslation({
    prevState: normalizedPrevState,
    nextState: normalizedNextState
  })

  return {
    prevState: normalizedPrevState,
    nextState: normalizedNextState
  }
}
