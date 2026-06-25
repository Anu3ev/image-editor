import { nanoid } from 'nanoid'
import { createHistoryManagerTestSetup } from '../../../test-utils/history/manager-setup'
import { createHistoryState } from '../../../test-utils/history/state-fixtures'

jest.mock('nanoid')

describe('loadStateFromFullState', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'patch-id')
  })

  it('ничего не делает если состояние равно null или undefined', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()

    await historyManager.loadStateFromFullState(null as any)
    await historyManager.loadStateFromFullState(undefined as any)

    expect(mockEditor.canvas.loadFromJSON).not.toHaveBeenCalled()
  })

  it('загружает состояние и корректно восстанавливает объекты', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()
    const state = createHistoryState({
      width: 1024,
      height: 768,
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'overlay-mask', type: 'rect', visible: true },
        { id: 'object-1', customData: { foo: 'bar' } },
        { id: 'background', type: 'rect', backgroundType: 'color' }
      ] as any[]
    })

    await historyManager.loadStateFromFullState(state)

    expect(mockEditor.canvas.loadFromJSON).toHaveBeenCalled()
    expect(mockEditor.canvas.renderAll).toHaveBeenCalled()
    expect(mockEditor.canvas.fire).toHaveBeenCalledWith('editor:history-state-loaded', expect.objectContaining({
      fullState: expect.any(Object),
      currentIndex: historyManager.currentIndex,
      totalChangesCount: historyManager.totalChangesCount,
      baseStateChangesCount: historyManager.baseStateChangesCount,
      patchesCount: historyManager.patches.length,
      patches: historyManager.patches
    }))
  })

  it('сериализует customData для loadFromJSON и восстанавливает объект без мутации состояния', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()
    const customData = {
      testProp: true,
      anotherProp: 'value',
      type: 'image',
      src: { file1: 'test', file2: 'test2' },
      nested: { value: 123 }
    }
    const state = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'object-1', customData }
      ] as any[]
    })
    const expectedCustomData = JSON.parse(JSON.stringify(customData)) as object
    const { objects: stateObjects = [] } = state

    await historyManager.loadStateFromFullState(state)

    expect(mockEditor.canvas.loadFromJSON).toHaveBeenCalledTimes(1)

    const loadFromJsonCalls = mockEditor.canvas.loadFromJSON.mock.calls
    const [safeState] = loadFromJsonCalls[0] ?? []
    const safeObjects = safeState?.objects ?? []
    let safeCustomData: unknown

    for (let index = 0; index < safeObjects.length; index += 1) {
      const safeObject = safeObjects[index]
      if (safeObject?.id !== 'object-1') continue
      safeCustomData = safeObject.customData
      break
    }

    expect(typeof safeCustomData).toBe('string')

    let stateCustomData: unknown

    for (let index = 0; index < stateObjects.length; index += 1) {
      const stateObject = stateObjects[index]
      if (stateObject?.id !== 'object-1') continue
      stateCustomData = stateObject.customData
      break
    }

    expect(stateCustomData).toEqual(expectedCustomData)

    const loadedObjects = mockEditor.canvas.getObjects()
    let loadedCustomData: unknown

    for (let index = 0; index < loadedObjects.length; index += 1) {
      const loadedObject = loadedObjects[index]
      if (loadedObject?.id !== 'object-1') continue
      loadedCustomData = loadedObject.customData
      break
    }

    expect(loadedCustomData).toEqual(expectedCustomData)
  })

  it('восстанавливает overlay и скрывает его', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()
    const state = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'overlay-mask', type: 'rect', visible: true }
      ] as any[]
    })

    await historyManager.loadStateFromFullState(state)

    expect(mockEditor.interactionBlocker.overlayMask).toEqual(expect.objectContaining({
      id: 'overlay-mask',
      visible: false
    }))
  })

  it('восстанавливает фоновый объект', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()
    const state = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'background', type: 'rect', backgroundType: 'color' }
      ] as any[]
    })

    await historyManager.loadStateFromFullState(state)

    expect(mockEditor.backgroundManager.removeBackground).not.toHaveBeenCalled()
    expect(mockEditor.backgroundManager.backgroundObject).toEqual(
      expect.objectContaining({ id: 'background' })
    )
  })

  it('удаляет фон если объект отсутствует в состоянии', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()
    const state = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' }
      ] as any[]
    })

    await historyManager.loadStateFromFullState(state)

    expect(mockEditor.backgroundManager.removeBackground).toHaveBeenCalledWith({ withoutSave: true })
  })

  it('текст из истории появляется сразу в итоговом размере', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()
    const commitStandaloneTextScaleMock = mockEditor.textManager.commitStandaloneTextScale as jest.Mock
    const state = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        {
          id: 'text-1',
          type: 'background-textbox',
          left: 0.25,
          top: 0.2,
          width: 137,
          scaleX: 0.6,
          scaleY: 1.4
        },
        {
          id: 'rect-1',
          type: 'rect',
          left: 20,
          top: 30,
          width: 100,
          height: 50
        }
      ] as any[]
    })

    await historyManager.loadStateFromFullState(state)

    expect(commitStandaloneTextScaleMock).toHaveBeenCalledWith({
      target: expect.objectContaining({
        id: 'text-1',
        type: 'background-textbox'
      })
    })
    expect(commitStandaloneTextScaleMock.mock.invocationCallOrder[0]).toBeLessThan(
      mockEditor.canvas.renderAll.mock.invocationCallOrder[0]
    )
  })

  it('фигура из истории пересчитывает layout до отрисовки', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()
    const commitRehydratedShapeLayoutMock = mockEditor.shapeManager.commitRehydratedShapeLayout as jest.Mock
    const state = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        {
          id: 'shape-1',
          type: 'shape-group',
          shapeComposite: true,
          shapePresetKey: 'square'
        }
      ] as any[]
    })

    await historyManager.loadStateFromFullState(state)

    expect(commitRehydratedShapeLayoutMock).toHaveBeenCalledWith({
      target: expect.objectContaining({
        id: 'shape-1',
        type: 'shape-group'
      })
    })
    expect(commitRehydratedShapeLayoutMock.mock.invocationCallOrder[0]).toBeLessThan(
      mockEditor.canvas.renderAll.mock.invocationCallOrder[0]
    )
  })

  it('обновляет canvas если размеры изменились', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup({
      initialCanvasWidth: 800,
      initialCanvasHeight: 600
    })
    const state = createHistoryState({
      width: 1024,
      height: 768,
      objects: [
        { id: 'montage-area', type: 'rect' }
      ] as any[]
    })

    await historyManager.loadStateFromFullState(state)

    expect(mockEditor.canvasManager.updateCanvas).toHaveBeenCalled()
  })

  it('не обновляет canvas если размеры не изменились', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup({
      initialCanvasWidth: 800,
      initialCanvasHeight: 600
    })
    const state = createHistoryState({
      width: 800,
      height: 600,
      objects: [
        { id: 'montage-area', type: 'rect' }
      ] as any[]
    })

    // Очищаем вызовы от предыдущих тестов
    jest.clearAllMocks()

    await historyManager.loadStateFromFullState(state)

    // updateCanvas не должен вызываться, т.к. размеры не изменились
    expect(mockEditor.canvasManager.updateCanvas).not.toHaveBeenCalled()
  })

  it('обновляет canvas если изменилась только ширина', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup({
      initialCanvasWidth: 800,
      initialCanvasHeight: 600
    })
    const state = createHistoryState({
      width: 1024,
      height: 600,
      objects: [
        { id: 'montage-area', type: 'rect' }
      ] as any[]
    })

    jest.clearAllMocks()

    await historyManager.loadStateFromFullState(state)

    expect(mockEditor.canvasManager.updateCanvas).toHaveBeenCalled()
  })

  it('обновляет canvas если изменилась только высота', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup({
      initialCanvasWidth: 800,
      initialCanvasHeight: 600
    })
    const state = createHistoryState({
      width: 800,
      height: 768,
      objects: [
        { id: 'montage-area', type: 'rect' }
      ] as any[]
    })

    jest.clearAllMocks()

    await historyManager.loadStateFromFullState(state)

    expect(mockEditor.canvasManager.updateCanvas).toHaveBeenCalled()
  })

  it('при загрузке состояния с новой resolution пересчитывает defaultZoom', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup({
      initialCanvasWidth: 800,
      initialCanvasHeight: 600
    })
    const state = createHistoryState({
      width: 800,
      height: 600,
      objects: [
        { id: 'montage-area', type: 'rect', width: 600, height: 300 }
      ] as any[]
    })

    jest.clearAllMocks()

    await historyManager.loadStateFromFullState(state)

    expect(mockEditor.zoomManager.calculateAndApplyDefaultZoom).toHaveBeenCalledTimes(1)
    expect(mockEditor.zoomManager.updateDefaultZoom).not.toHaveBeenCalled()
    expect(mockEditor.canvasManager.refreshMontageDerivedState).toHaveBeenCalledTimes(1)
    expect(mockEditor.canvasManager.updateCanvas).not.toHaveBeenCalled()
  })
})
