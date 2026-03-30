import TemplateManager, { TemplateDefinition } from '../../src/editor/template-manager'
import { createEditorStub } from './editor-helpers'

type BaseEditorStub = ReturnType<typeof createEditorStub>

type TemplateManagerEditorStub = BaseEditorStub & {
  montageArea: BaseEditorStub['montageArea'] & {
    getBoundingRect: jest.Mock
    getScaledWidth: jest.Mock
    getScaledHeight: jest.Mock
  }
  backgroundManager: BaseEditorStub['backgroundManager'] & {
    setColorBackground: jest.Mock
    setGradientBackground: jest.Mock
    setImageBackground: jest.Mock
  }
}

/**
 * Создаёт test setup для unit-тестов TemplateManager.applyTemplate.
 */
export const createTemplateManagerTestSetup = (): {
  manager: TemplateManager
  editor: TemplateManagerEditorStub
} => {
  const editor = createEditorStub() as TemplateManagerEditorStub

  editor.montageArea.getBoundingRect = jest.fn(() => ({
    left: 100,
    top: 50,
    width: 400,
    height: 300
  }))
  editor.montageArea.getScaledWidth = jest.fn(() => 400)
  editor.montageArea.getScaledHeight = jest.fn(() => 300)

  editor.backgroundManager = {
    ...editor.backgroundManager,
    setColorBackground: jest.fn(),
    setGradientBackground: jest.fn(),
    setImageBackground: jest.fn()
  }

  return {
    manager: new TemplateManager({ editor: editor as never }),
    editor
  }
}

/**
 * Создаёт минимальный template definition для тестов вставки shape-group.
 */
export const createShapeTemplateDefinition = (): TemplateDefinition => ({
  id: 'template-1',
  meta: {
    baseWidth: 400,
    baseHeight: 300,
    positionsNormalized: true
  },
  objects: [
    {
      type: 'shape-group',
      left: 100,
      top: 100,
      shapePresetKey: 'square'
    }
  ]
})
