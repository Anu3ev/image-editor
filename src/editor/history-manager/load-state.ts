import type { Canvas } from 'fabric'
import type { CanvasFullState } from './types'

/**
 * Делает глубокую копию customData, чтобы избежать общих ссылок.
 */
export function cloneCustomData({ customData }: { customData: object }): object {
  return JSON.parse(JSON.stringify(customData)) as object
}

/**
 * Создаёт безопасную копию состояния для загрузки в canvas.
 */
export function createLoadSafeState({ state }: { state: CanvasFullState }): CanvasFullState {
  const clonedState = JSON.parse(JSON.stringify(state)) as CanvasFullState
  const { objects = [] } = clonedState

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    const { customData } = object

    if (!customData || typeof customData !== 'object') continue

    object.customData = JSON.stringify(customData)
  }

  return clonedState
}

/**
 * Восстанавливает customData на объектах canvas из состояния history.
 */
export function applyCustomDataFromState({
  state,
  canvas
}: {
  state: CanvasFullState
  canvas: Canvas
}): void {
  const { objects: stateObjects = [] } = state
  const customDataById = new Map<string, object>()
  const customDataByIndex = new Map<number, object>()

  for (let index = 0; index < stateObjects.length; index += 1) {
    const stateObject = stateObjects[index]
    const { customData, id } = stateObject

    if (!customData || typeof customData !== 'object') continue

    if (typeof id === 'string') {
      customDataById.set(id, customData)
      continue
    }

    customDataByIndex.set(index, customData)
  }

  const canvasObjects = canvas.getObjects?.() ?? []

  for (let index = 0; index < canvasObjects.length; index += 1) {
    const canvasObject = canvasObjects[index]
    const { id } = canvasObject
    let customData: object | undefined

    if (typeof id === 'string') {
      customData = customDataById.get(id)
    }

    if (!customData) {
      customData = customDataByIndex.get(index)
    }

    if (!customData) continue

    canvasObject.customData = cloneCustomData({ customData })
  }
}
