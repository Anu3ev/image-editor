import ToolbarManager from '../../../../../src/editor/ui/toolbar-manager'
import { resolveShapeGroupFromTarget } from '../../../../../src/editor/shape-manager/domain/shape-reference'
import { createManagerTestMocks } from '../../../../test-utils/editor-helpers'
import {
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../../test-utils/shape-helpers'

jest.mock('../../../../../src/editor/shape-manager/domain/shape-reference', () => ({
  resolveShapeGroupFromTarget: jest.fn()
}))

const resolveShapeGroupFromTargetMock = resolveShapeGroupFromTarget as jest.Mock

describe('ToolbarManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('во время редактирования текста внутри фигуры позиционирует тулбар и выполняет действия по всей фигуре', () => {
    const {
      mockCanvas,
      mockEditor
    } = createManagerTestMocks()
    const actionHandler = jest.fn()
    const shape = createMockShapeNode()
    const text = createMockShapeTextbox({
      text: 'Текст внутри фигуры'
    })
    const group = createMockShapeGroup({
      shape,
      text
    })

    mockEditor.options.showToolbar = true
    mockEditor.options.toolbar = {
      actions: [{
        name: 'Проверить target',
        handle: 'inspectTarget'
      }],
      handlers: {
        inspectTarget: actionHandler
      }
    }

    group.getBoundingRect = jest.fn(() => ({
      left: 40,
      top: 20,
      width: 180,
      height: 180
    })) as never
    group.getCenterPoint = jest.fn(() => ({
      x: 130,
      y: 110
    })) as never

    mockCanvas.getActiveObject.mockReturnValue(text)
    resolveShapeGroupFromTargetMock.mockReturnValue(group)

    const toolbarManager = new ToolbarManager({
      editor: mockEditor
    })
    const afterRenderCall = mockCanvas.on.mock.calls.find(([
      event
    ]: [string, (...args: unknown[]) => void]) => event === 'after:render')

    if (!afterRenderCall) {
      throw new Error('ToolbarManager должен подписаться на after:render')
    }

    const [, updateToolbar] = afterRenderCall
    updateToolbar()

    const button = toolbarManager.el.querySelector('button') as HTMLButtonElement
    button.click()

    expect(toolbarManager.currentTarget).toBe(group)
    expect(group.setCoords).toHaveBeenCalled()
    expect(text.setCoords).not.toHaveBeenCalled()
    expect(actionHandler).toHaveBeenCalledWith(mockEditor, group)
  })
})
