import CanvasManager from '../../src/editor/canvas-manager'
import TemplateManager, { TemplateDefinition } from '../../src/editor/template-manager'
import { createEditorStub } from './editor-helpers'

type BaseEditorStub = ReturnType<typeof createEditorStub>

type MontageBounds = {
  left: number
  top: number
  width: number
  height: number
}

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
 * Создаёт TemplateManager setup с настраиваемой монтажной областью и placement-стратегией.
 */
export const createTemplateManagerTestSetup = ({
  montageBounds = {
    left: 100,
    top: 50,
    width: 400,
    height: 300
  },
  useRealCanvasManager = false
}: {
  montageBounds?: MontageBounds
  useRealCanvasManager?: boolean
} = {}): {
  manager: TemplateManager
  editor: TemplateManagerEditorStub
} => {
  const {
    left,
    top,
    width,
    height
  } = montageBounds
  const editor = createEditorStub() as TemplateManagerEditorStub

  editor.montageArea.getBoundingRect = jest.fn(() => ({
    left,
    top,
    width,
    height
  }))
  editor.montageArea.width = width
  editor.montageArea.height = height
  editor.montageArea.left = left
  editor.montageArea.top = top
  editor.montageArea.getScaledWidth = jest.fn(() => width)
  editor.montageArea.getScaledHeight = jest.fn(() => height)

  editor.backgroundManager = {
    ...editor.backgroundManager,
    setColorBackground: jest.fn(),
    setGradientBackground: jest.fn(),
    setImageBackground: jest.fn()
  }

  if (useRealCanvasManager) {
    editor.canvasManager = new CanvasManager({ editor: editor as never }) as never
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
