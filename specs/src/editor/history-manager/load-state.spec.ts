import type { Canvas } from 'fabric'
import type { CanvasFullState } from '../../../../src/editor/history-manager'
import {
  applyCustomDataFromState,
  cloneCustomData,
  createLoadSafeState
} from '../../../../src/editor/history-manager/load-state'
import { createHistoryCanvasState } from '../../../test-utils/history-helpers'

describe('history-manager/load-state', () => {
  it('createLoadSafeState создаёт независимую копию и сериализует customData', () => {
    const state = createHistoryCanvasState({
      overrides: {
        objects: [{
          id: 'object-1',
          customData: {
            nested: {
              color: '#ffffff'
            }
          }
        }] as CanvasFullState['objects']
      }
    })

    const safeState = createLoadSafeState({ state })
    const [safeObject] = safeState.objects as Array<Record<string, unknown>>
    const [originalObject] = state.objects as Array<Record<string, unknown>>

    expect(safeObject.customData).toBe(JSON.stringify({
      nested: {
        color: '#ffffff'
      }
    }))
    expect(originalObject.customData).toEqual({
      nested: {
        color: '#ffffff'
      }
    })
    expect(safeState).not.toBe(state)
  })

  it('applyCustomDataFromState восстанавливает customData по id и по индексу без общих ссылок', () => {
    const state = createHistoryCanvasState({
      overrides: {
        objects: [
          {
            id: 'object-by-id',
            customData: {
              nested: {
                value: 1
              }
            }
          },
          {
            customData: {
              nested: {
                value: 2
              }
            }
          }
        ] as CanvasFullState['objects']
      }
    })
    const canvasObjects = [
      {
        id: 'object-by-id'
      },
      {
        id: undefined
      }
    ] as Array<Record<string, unknown>>
    const canvas = {
      getObjects: jest.fn(() => canvasObjects)
    } as unknown as Canvas

    applyCustomDataFromState({
      state,
      canvas
    })

    expect(canvasObjects[0].customData).toEqual({
      nested: {
        value: 1
      }
    })
    expect(canvasObjects[1].customData).toEqual({
      nested: {
        value: 2
      }
    })
    expect(canvasObjects[0].customData).not.toBe((state.objects[0] as Record<string, unknown>).customData)
    expect(canvasObjects[1].customData).not.toBe((state.objects[1] as Record<string, unknown>).customData)

    const firstCanvasCustomData = canvasObjects[0].customData as {
      nested: {
        value: number
      }
    }

    firstCanvasCustomData.nested.value = 10

    expect(((state.objects[0] as Record<string, unknown>).customData as {
      nested: {
        value: number
      }
    }).nested.value).toBe(1)
  })

  it('cloneCustomData возвращает глубокую копию объекта', () => {
    const customData = {
      nested: {
        width: 120
      }
    }

    const clonedCustomData = cloneCustomData({ customData }) as {
      nested: {
        width: number
      }
    }

    clonedCustomData.nested.width = 240

    expect(customData.nested.width).toBe(120)
  })
})
