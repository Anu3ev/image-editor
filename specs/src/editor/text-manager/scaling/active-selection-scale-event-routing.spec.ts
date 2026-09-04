import { ActiveSelection } from 'fabric'

import { createTextManagerTestSetup } from '../../../../test-utils/text/manager-setup'

afterEach(jest.restoreAllMocks)

it('фиксирует поддерживаемое выделение через общего владельца и не запускает прежнюю фиксацию', () => {
  const setup = createTextManagerTestSetup()
  const first = setup.textManager.addText({ text: 'Первый' })
  const second = setup.textManager.addText({ text: 'Второй' })
  const selection = new ActiveSelection([first, second], { canvas: setup.canvas })
  const transform = { target: selection }
  const commitTextSelectionScaleMock = setup.editor.selectionManager.commitTextSelectionScale as jest.Mock
  commitTextSelectionScaleMock.mockImplementation(({ commit }: { commit: () => void }) => {
    commit()
    return true
  })
  const commitActiveSelectionScalingSpy = jest
    .spyOn(setup.textManager, 'commitActiveSelectionScaling')
    .mockReturnValue(true)
  const legacyCommitSpy = jest
    .spyOn(setup.textManager['scalingController'], 'handleObjectModified')
    .mockImplementation(() => {})

  setup.canvas.fire('object:modified', { target: selection, transform })

  expect(commitTextSelectionScaleMock).toHaveBeenCalledWith({
    selection,
    commit: expect.any(Function)
  })
  expect(commitActiveSelectionScalingSpy).toHaveBeenCalledWith({ selection, transform })
  expect(legacyCommitSpy).not.toHaveBeenCalled()

  setup.textManager.destroy()
})

it('сохраняет прежнюю фиксацию для выделения без общей текстовой сессии', () => {
  const setup = createTextManagerTestSetup()
  const first = setup.textManager.addText({ text: 'Первый' })
  const second = setup.textManager.addText({ text: 'Второй' })
  const selection = new ActiveSelection([first, second], { canvas: setup.canvas })
  const commitTextSelectionScaleMock = setup.editor.selectionManager.commitTextSelectionScale as jest.Mock
  commitTextSelectionScaleMock.mockReturnValue(false)
  const commitActiveSelectionScalingSpy = jest.spyOn(setup.textManager, 'commitActiveSelectionScaling')
  const legacyCommitSpy = jest
    .spyOn(setup.textManager['scalingController'], 'handleObjectModified')
    .mockImplementation(() => {})
  const event = { target: selection }

  setup.canvas.fire('object:modified', event)

  expect(commitTextSelectionScaleMock).toHaveBeenCalledWith({
    selection,
    commit: expect.any(Function)
  })
  expect(commitActiveSelectionScalingSpy).not.toHaveBeenCalled()
  expect(legacyCommitSpy).toHaveBeenCalledWith(event)

  setup.textManager.destroy()
})
