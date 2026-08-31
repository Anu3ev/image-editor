import '../../../test-utils/shape/manager-module-mocks'
import { ActiveSelection, Group } from 'fabric'
import ShapeManager from '../../../../src/editor/shape-manager'
import ShapeLifecycleController from '../../../../src/editor/shape-manager/lifecycle/shape-lifecycle-controller'
import ShapeScalingController from '../../../../src/editor/shape-manager/scaling/shape-scaling-controller'
import {
  createShapeManagerEditorStub,
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape/manager-spec-helpers'
import {
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape/factories'

describe('shape-manager', () => {
  const mocks = getShapeManagerUnitMocks()

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('подписывается на canvas-события при создании и снимает подписки при destroy', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const onEvents = (editor.canvas.on as jest.Mock).mock.calls.map((call) => call[0])
    expect(onEvents).toEqual(expect.arrayContaining([
      'object:scaling',
      'object:modified',
      'mouse:down',
      'mouse:up',
      'text:editing:entered',
      'text:editing:exited',
      'text:changed',
      'editor:before:text-updated',
      'editor:text-updated'
    ]))

    manager.destroy()

    const offEvents = (editor.canvas.off as jest.Mock).mock.calls.map((call) => call[0])
    expect(offEvents).toEqual(expect.arrayContaining([
      'object:scaling',
      'object:modified',
      'mouse:down',
      'mouse:up',
      'text:editing:entered',
      'text:editing:exited',
      'text:changed',
      'editor:before:text-updated',
      'editor:text-updated'
    ]))
  })

  it('add добавляет shape-группу на canvas и сохраняет историю', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })

    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    expect(group).toBeInstanceOf(Group)
    expect(editor.canvas.add).toHaveBeenCalledWith(group)
    expect(editor.canvas.setActiveObject).toHaveBeenCalledWith(group)
    expect(editor.historyManager.suspendHistory).toHaveBeenCalledTimes(1)
    expect(editor.historyManager.resumeHistory).toHaveBeenCalledTimes(1)
    expect(editor.historyManager.saveState).toHaveBeenCalledTimes(1)
  })

  it('remove удаляет shape-группу и сохраняет history state', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const group = await manager.add({
      presetKey: 'square',
      options: {
        text: 'shape text'
      }
    })

    if (!group) {
      throw new Error('shape group should be created')
    }

    editor.canvas._currentTransform = { target: group }

    const result = manager.remove({
      target: group
    })

    expect(result).toBe(true)
    expect(editor.canvas.endCurrentTransform).toHaveBeenCalledTimes(1)
    expect(editor.canvas.remove).toHaveBeenCalledWith(group)
    expect(editor.canvas.endCurrentTransform.mock.invocationCallOrder[0]).toBeLessThan(
      editor.canvas.remove.mock.invocationCallOrder[0]
    )
    expect(editor.historyManager.saveState).toHaveBeenCalled()
  })

  it('remove не завершает преобразование другого объекта', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({ editor: editor as never })
    const group = await manager.add({ presetKey: 'square' })
    const transformedObject = new Group([], {})

    editor.canvas._currentTransform = { target: transformedObject }

    const result = manager.remove({ target: group })

    expect(result).toBe(true)
    expect(editor.canvas.endCurrentTransform).not.toHaveBeenCalled()
    expect(editor.canvas.remove).toHaveBeenCalledWith(group)
    expect(editor.canvas.getObjects()).not.toContain(group)
  })

  it('remove завершает скейлинг общего выделения и снимает его до удаления дочернего шейпа', async() => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({ editor: editor as never })
    const first = await manager.add({ presetKey: 'square' })
    const second = await manager.add({ presetKey: 'square' })

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    if (!first || !second) throw new Error('Для общего выделения должны быть созданы два шейпа')

    const selection = new ActiveSelection([first, second])

    editor.canvas.setActiveObject(selection)
    editor.canvas._currentTransform = { target: selection }

    const result = manager.remove({ target: first })

    expect(result).toBe(true)
    expect(editor.canvas.endCurrentTransform).toHaveBeenCalledTimes(1)
    expect(editor.canvas.discardActiveObject).toHaveBeenCalledTimes(1)
    expect(editor.canvas.getActiveObject()).toBeNull()
    expect(editor.canvas.endCurrentTransform.mock.invocationCallOrder[0]).toBeLessThan(
      editor.canvas.discardActiveObject.mock.invocationCallOrder[0]
    )
    expect(editor.canvas.discardActiveObject.mock.invocationCallOrder[0]).toBeLessThan(
      editor.canvas.remove.mock.invocationCallOrder[0]
    )
    expect(editor.canvas.getObjects()).toEqual([second])
  })

  it('не включает повёрнутый дочерний шейп в общий путь скейлинга выделения', () => {
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const first = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })
    const second = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })
    const selection = new ActiveSelection([first, second])

    expect(manager.supportsActiveSelectionScaling({ selection })).toBe(true)

    first.angle = 135

    expect(manager.supportsActiveSelectionScaling({ selection })).toBe(false)
  })

  it('очищает временное состояние прерванного скейлинга выделения из шейпов', () => {
    const clearSelectionStateSpy = jest.spyOn(
      ShapeScalingController.prototype,
      'clearActiveSelectionState'
    )
    const clearShapeStateSpy = jest.spyOn(ShapeScalingController.prototype, 'clearState')
    const cancelResizeSpy = jest.spyOn(ShapeLifecycleController.prototype, 'cancelResize')
    const editor = createShapeManagerEditorStub()
    const manager = new ShapeManager({
      editor: editor as never
    })
    const first = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })
    const second = createMockShapeGroup({
      shape: createMockShapeNode(),
      text: createMockShapeTextbox()
    })
    const selection = new ActiveSelection([first, second])

    manager.clearActiveSelectionScalePreviewState({
      selection,
      children: [first, second]
    })

    expect(clearSelectionStateSpy).toHaveBeenCalledTimes(1)
    expect(clearSelectionStateSpy).toHaveBeenCalledWith({ selection })
    expect(clearShapeStateSpy).toHaveBeenCalledTimes(2)
    expect(clearShapeStateSpy).toHaveBeenNthCalledWith(1, { group: first })
    expect(clearShapeStateSpy).toHaveBeenNthCalledWith(2, { group: second })
    expect(cancelResizeSpy).toHaveBeenCalledTimes(2)
    expect(cancelResizeSpy).toHaveBeenNthCalledWith(1, { group: first })
    expect(cancelResizeSpy).toHaveBeenNthCalledWith(2, { group: second })
  })
})
