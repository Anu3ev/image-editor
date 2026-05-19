import '../../../test-utils/shape/manager-module-mocks'
import { Group } from 'fabric'
import ShapeManager from '../../../../src/editor/shape-manager'
import {
  createShapeManagerEditorStub,
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape/manager-spec-helpers'

describe('shape-manager', () => {
  const mocks = getShapeManagerUnitMocks()

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
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

    const result = manager.remove({
      target: group
    })

    expect(result).toBe(true)
    expect(editor.canvas.remove).toHaveBeenCalledWith(group)
    expect(editor.historyManager.saveState).toHaveBeenCalled()
  })
})
