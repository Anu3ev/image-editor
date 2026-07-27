import ShapeGroupFactory from '../../../../src/editor/shape-manager/creation/shape-group-factory'
import { getShapePreset } from '../../../../src/editor/shape-manager/domain/shape-presets'
import { getShapeNodes } from '../../../../src/editor/shape-manager/domain/shape-nodes'
import ShapeLayoutController from '../../../../src/editor/shape-manager/layout/shape-layout-controller'
import ShapeTextNodeController from '../../../../src/editor/shape-manager/text/shape-text-node-controller'
import {
  createShapeManagerEditorStub
} from '../../../test-utils/shape/manager-spec-helpers'

describe('shape group factory', () => {
  it('создаёт готовую off-canvas группу без добавления на canvas и сохранения истории', async() => {
    const editor = createShapeManagerEditorStub()
    const layoutController = new ShapeLayoutController({
      editor: editor as never
    })
    const textNodeController = new ShapeTextNodeController({
      resolveTextManager: () => editor.textManager as never
    })
    const factory = new ShapeGroupFactory({
      layoutController,
      textNodeController
    })
    const basePreset = getShapePreset({ presetKey: 'square' })

    if (!basePreset) {
      throw new Error('Square preset должен существовать для factory-теста')
    }

    const group = await factory.createForAdd({
      basePreset,
      options: {
        id: 'factory-shape',
        width: 240,
        height: 160,
        text: 'Shape text',
        textPadding: {
          left: 12,
          right: 18
        },
        shapeTextAutoExpand: false
      }
    })
    const { shape, text } = getShapeNodes({ group })

    expect(shape?.shapeNodeType).toBe('shape')
    expect(text?.shapeNodeType).toBe('text')
    expect(group.shapeBaseWidth).toBe(240)
    expect(group.shapeBaseHeight).toBe(160)
    expect(group.shapeManualBaseWidth).toBe(240)
    expect(group.shapeReplaceBoxWidth).toBe(240)
    expect(group.shapePaddingLeft).toBe(12)
    expect(group.shapePaddingRight).toBe(18)
    expect(editor.canvas.add).not.toHaveBeenCalled()
    expect(editor.historyManager.saveState).not.toHaveBeenCalled()
  })
})
