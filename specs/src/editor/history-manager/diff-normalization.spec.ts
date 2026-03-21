import type { CanvasFullState } from '../../../../src/editor/history-manager'
import {
  cloneState,
  prepareStatesForDiff,
  stableStringify
} from '../../../../src/editor/history-manager/diff-normalization'
import { createHistoryCanvasState } from '../../../test-utils/history-helpers'

describe('history-manager/diff-normalization', () => {
  it('stableStringify возвращает одинаковую строку для объектов с разным порядком ключей', () => {
    const firstValue = {
      b: 2,
      a: 1,
      nested: {
        d: 4,
        c: 3
      }
    }
    const secondValue = {
      nested: {
        c: 3,
        d: 4
      },
      a: 1,
      b: 2
    }

    expect(stableStringify({ value: firstValue })).toBe(stableStringify({ value: secondValue }))
  })

  it('cloneState создаёт независимую глубокую копию состояния', () => {
    const state = createHistoryCanvasState({
      overrides: {
        objects: [{
          id: 'object-1',
          left: 10,
          customData: {
            nested: {
              value: 1
            }
          }
        }] as CanvasFullState['objects']
      }
    })

    const clonedState = cloneState({ state })
    const [clonedObject] = clonedState.objects as Array<Record<string, unknown>>
    const clonedCustomData = clonedObject.customData as {
      nested: {
        value: number
      }
    }

    clonedCustomData.nested.value = 5

    const [originalObject] = state.objects as Array<Record<string, unknown>>
    const originalCustomData = originalObject.customData as {
      nested: {
        value: number
      }
    }

    expect(originalCustomData.nested.value).toBe(1)
  })

  it('prepareStatesForDiff игнорирует backgroundColor если фон текста выключен', () => {
    const prevState = createHistoryCanvasState({
      overrides: {
        objects: [{
          id: 'text-1',
          type: 'textbox',
          backgroundOpacity: 0,
          backgroundColor: '#ffffff',
          textBackgroundColor: ''
        }] as CanvasFullState['objects']
      }
    })
    const nextState = createHistoryCanvasState({
      overrides: {
        objects: [{
          id: 'text-1',
          type: 'textbox',
          backgroundOpacity: 0,
          backgroundColor: '#000000',
          textBackgroundColor: '#111111'
        }] as CanvasFullState['objects']
      }
    })

    const normalized = prepareStatesForDiff({
      prevState,
      nextState
    })
    const [prevTextObject] = normalized.prevState.objects as Array<Record<string, unknown>>
    const [nextTextObject] = normalized.nextState.objects as Array<Record<string, unknown>>

    expect(prevTextObject.backgroundColor).toBeNull()
    expect(nextTextObject.backgroundColor).toBeNull()
    expect(prevTextObject.textBackgroundColor).toBeNull()
    expect(nextTextObject.textBackgroundColor).toBeNull()
  })

  it('prepareStatesForDiff сохраняет backgroundColor если фон текста включен', () => {
    const prevState = createHistoryCanvasState({
      overrides: {
        objects: [{
          id: 'text-1',
          type: 'textbox',
          backgroundOpacity: 1,
          backgroundColor: '#ffffff'
        }] as CanvasFullState['objects']
      }
    })
    const nextState = createHistoryCanvasState({
      overrides: {
        objects: [{
          id: 'text-1',
          type: 'textbox',
          backgroundOpacity: 1,
          backgroundColor: '#000000'
        }] as CanvasFullState['objects']
      }
    })

    const normalized = prepareStatesForDiff({
      prevState,
      nextState
    })
    const [prevTextObject] = normalized.prevState.objects as Array<Record<string, unknown>>
    const [nextTextObject] = normalized.nextState.objects as Array<Record<string, unknown>>

    expect(prevTextObject.backgroundColor).toBe('#ffffff')
    expect(nextTextObject.backgroundColor).toBe('#000000')
  })

  it('prepareStatesForDiff игнорирует resize canvas без изменения монтажной области', () => {
    const prevState = createHistoryCanvasState({
      overrides: {
        width: 800,
        height: 600,
        objects: [{
          id: 'montage-area',
          type: 'rect',
          width: 400,
          height: 300,
          left: 100,
          top: 50
        }] as CanvasFullState['objects']
      }
    })
    const nextState = createHistoryCanvasState({
      overrides: {
        width: 900,
        height: 700,
        objects: [{
          id: 'montage-area',
          type: 'rect',
          width: 400,
          height: 300,
          left: 100,
          top: 50
        }] as CanvasFullState['objects']
      }
    })

    const normalized = prepareStatesForDiff({
      prevState,
      nextState
    })

    expect(normalized.nextState.width).toBe(800)
    expect(normalized.nextState.height).toBe(600)
  })

  it('prepareStatesForDiff игнорирует одинаковый сдвиг монтажной области и пользовательского объекта', () => {
    const prevState = createHistoryCanvasState({
      overrides: {
        objects: [
          {
            id: 'montage-area',
            type: 'rect',
            left: 100,
            top: 50,
            width: 400,
            height: 300
          },
          {
            id: 'object-1',
            type: 'rect',
            left: 120,
            top: 70
          }
        ] as CanvasFullState['objects']
      }
    })
    const nextState = createHistoryCanvasState({
      overrides: {
        objects: [
          {
            id: 'montage-area',
            type: 'rect',
            left: 140,
            top: 90,
            width: 400,
            height: 300
          },
          {
            id: 'object-1',
            type: 'rect',
            left: 160,
            top: 110
          }
        ] as CanvasFullState['objects']
      }
    })

    const normalized = prepareStatesForDiff({
      prevState,
      nextState
    })
    const [, normalizedObject] = normalized.nextState.objects as Array<Record<string, unknown>>

    expect(normalizedObject.left).toBe(120)
    expect(normalizedObject.top).toBe(70)
  })

  it('prepareStatesForDiff сохраняет реальное изменение объекта поверх общего сдвига', () => {
    const prevState = createHistoryCanvasState({
      overrides: {
        objects: [
          {
            id: 'montage-area',
            type: 'rect',
            left: 100,
            top: 50,
            width: 400,
            height: 300
          },
          {
            id: 'object-1',
            type: 'rect',
            left: 120,
            top: 70
          }
        ] as CanvasFullState['objects']
      }
    })
    const nextState = createHistoryCanvasState({
      overrides: {
        objects: [
          {
            id: 'montage-area',
            type: 'rect',
            left: 140,
            top: 90,
            width: 400,
            height: 300
          },
          {
            id: 'object-1',
            type: 'rect',
            left: 165,
            top: 118
          }
        ] as CanvasFullState['objects']
      }
    })

    const normalized = prepareStatesForDiff({
      prevState,
      nextState
    })
    const [, normalizedObject] = normalized.nextState.objects as Array<Record<string, unknown>>

    expect(normalizedObject.left).toBe(125)
    expect(normalizedObject.top).toBe(78)
  })
})
