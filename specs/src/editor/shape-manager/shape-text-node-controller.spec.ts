import ShapeTextNodeController from '../../../../src/editor/shape-manager/text/shape-text-node-controller'
import {
  createShapeManagerEditorStub
} from '../../../test-utils/shape/manager-spec-helpers'

describe('shape text node controller', () => {
  it('создаёт textbox как внутренний узел шейпа без canvas lifecycle', () => {
    const editor = createShapeManagerEditorStub()
    const controller = new ShapeTextNodeController({
      resolveTextManager: () => editor.textManager as never
    })

    const textNode = controller.create({
      text: 'Shape text',
      width: 240,
      align: 'center'
    })

    expect(textNode.shapeNodeType).toBe('text')
    expect(textNode.autoExpand).toBe(false)
    expect(editor.textManager.addText).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Shape text',
        width: 240,
        align: 'center',
        autoExpand: false
      }),
      {
        withoutAdding: true,
        withoutSave: true,
        withoutSelection: true,
        emitLifecycleEvents: false
      }
    )
  })

  it('очищает признак внутреннего обновления, если TextManager выбросил ошибку', () => {
    const editor = createShapeManagerEditorStub()
    const controller = new ShapeTextNodeController({
      resolveTextManager: () => editor.textManager as never
    })
    const textNode = controller.create({
      text: 'Shape text',
      width: 240,
      align: 'left'
    })

    editor.textManager.updateText.mockImplementation(() => {
      expect(controller.isInternalUpdate({ textNode })).toBe(true)
      throw new Error('Text update failed')
    })

    expect(() => controller.applyUpdates({
      textNode,
      text: 'Updated shape text'
    })).toThrow('Text update failed')
    expect(controller.isInternalUpdate({ textNode })).toBe(false)
    expect(editor.textManager.updateText).toHaveBeenCalledTimes(1)
  })

  it('отличает визуальные стили от изменений, влияющих на размер текста', () => {
    const editor = createShapeManagerEditorStub()
    const controller = new ShapeTextNodeController({
      resolveTextManager: () => editor.textManager as never
    })

    expect(controller.hasSizeAffectingStyleChanges({
      textStyle: {
        color: '#ffffff',
        opacity: 0.5
      }
    })).toBe(false)
    expect(controller.hasSizeAffectingStyleChanges({
      textStyle: {
        fontSize: 48
      }
    })).toBe(true)
  })
})
