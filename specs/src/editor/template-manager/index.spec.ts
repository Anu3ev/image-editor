import { util } from 'fabric'
import TemplateManager from '../../../../src/editor/template-manager'
import { ShapeGroupObject, registerShapeGroup } from '../../../../src/editor/shape-manager/shape-group'
import {
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'
import {
  createShapeTemplateDefinition,
  createTemplateManagerTestSetup
} from '../../../test-utils/template-manager-helpers'

describe('TemplateManager', () => {
  beforeEach(() => {
    registerShapeGroup()
    jest.clearAllMocks()
  })

  it('applyTemplate materialize shape-group и сохраняет его runtime state', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const text = createMockShapeTextbox({ text: 'Template text' })
    const group = new ShapeGroupObject([
      createMockShapeNode() as never,
      text
    ], {
      left: 100,
      top: 100,
      shapePresetKey: 'square'
    })
    const enlivenObjectsSpy = jest.spyOn(util, 'enlivenObjects').mockResolvedValue([group])

    const result = await manager.applyTemplate({
      template: createShapeTemplateDefinition()
    })

    expect(enlivenObjectsSpy).toHaveBeenCalled()
    expect(result).toEqual([group])
    expect(editor.canvas.add).toHaveBeenCalledWith(group)
    expect(editor.canvas.setActiveObject).toHaveBeenCalledWith(group)
    expect(group).toBeInstanceOf(ShapeGroupObject)
    expect(group.shapeComposite).toBe(true)
    expect(text.selectable).toBe(false)
    expect(text.evented).toBe(false)
    expect(editor.historyManager.suspendHistory).toHaveBeenCalled()
    expect(editor.historyManager.resumeHistory).toHaveBeenCalled()
    expect(editor.historyManager.saveState).toHaveBeenCalled()
  })

  it('applyTemplate применяет background object через backgroundManager отдельно от content objects', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const backgroundObject = createMockShapeNode() as never
    backgroundObject.id = 'background'
    backgroundObject.backgroundType = 'color'
    backgroundObject.fill = '#ff0055'
    const contentObject = new ShapeGroupObject([
      createMockShapeNode() as never,
      createMockShapeTextbox({ text: 'Template text' })
    ], {
      left: 100,
      top: 100,
      shapePresetKey: 'square'
    })
    jest.spyOn(util, 'enlivenObjects')
      .mockResolvedValueOnce([backgroundObject])
      .mockResolvedValueOnce([contentObject])

    const result = await manager.applyTemplate({
      template: {
        id: 'template-2',
        meta: {
          baseWidth: 400,
          baseHeight: 300,
          positionsNormalized: true
        },
        objects: [
          { type: 'rect', id: 'background', backgroundType: 'color', fill: '#ff0055' },
          { type: 'shape-group', left: 100, top: 100, shapePresetKey: 'square' }
        ]
      }
    })

    expect(editor.backgroundManager.setColorBackground).toHaveBeenCalledWith({
      color: '#ff0055',
      customData: undefined,
      fromTemplate: true,
      withoutSave: true
    })
    expect(editor.canvas.add).toHaveBeenCalledWith(contentObject)
    expect(result).toEqual([contentObject])
  })

  it('applyTemplate возвращает null и warning для пустого шаблона', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()

    const result = await manager.applyTemplate({
      template: {
        id: 'template-empty',
        meta: {
          baseWidth: 400,
          baseHeight: 300
        },
        objects: []
      }
    })

    expect(result).toBeNull()
    expect(editor.errorManager.emitWarning).toHaveBeenCalled()
  })
})
