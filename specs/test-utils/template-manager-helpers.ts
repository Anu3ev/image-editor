import TemplateManager, { TemplateDefinition } from '../../src/editor/template-manager'
import { createCanvasStub } from './editor-helpers'

type TemplateManagerEditorStub = {
  canvas: ReturnType<typeof createCanvasStub>
  montageArea: {
    width: number
    height: number
    left: number
    top: number
    setCoords: jest.Mock
    getBoundingRect: jest.Mock
    getScaledWidth: jest.Mock
    getScaledHeight: jest.Mock
  }
  historyManager: {
    suspendHistory: jest.Mock
    resumeHistory: jest.Mock
    saveState: jest.Mock
  }
  errorManager: {
    emitWarning: jest.Mock
    emitError: jest.Mock
  }
  backgroundManager: {
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
  const canvas = createCanvasStub()
  const editor = {
    canvas,
    montageArea: {
      width: 400,
      height: 300,
      left: 100,
      top: 50,
      setCoords: jest.fn(),
      getBoundingRect: jest.fn(() => ({
        left: 100,
        top: 50,
        width: 400,
        height: 300
      })),
      getScaledWidth: jest.fn(() => 400),
      getScaledHeight: jest.fn(() => 300)
    },
    historyManager: {
      suspendHistory: jest.fn(),
      resumeHistory: jest.fn(),
      saveState: jest.fn()
    },
    errorManager: {
      emitWarning: jest.fn(),
      emitError: jest.fn()
    },
    backgroundManager: {
      setColorBackground: jest.fn(),
      setGradientBackground: jest.fn(),
      setImageBackground: jest.fn()
    }
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
