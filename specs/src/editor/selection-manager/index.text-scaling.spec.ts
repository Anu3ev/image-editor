import { ActiveSelection, Rect } from 'fabric'

import SelectionManager from '../../../../src/editor/selection-manager'
import ActiveSelectionScaleInteractionController from '../../../../src/editor/selection-manager/scaling/active-selection-scale-interaction-controller' // eslint-disable-line max-len
import { createSelectionTestSetup } from '../../../test-utils/managers/selection'

afterEach(jest.restoreAllMocks)

it('фиксирует выделение из текстов внутри защищённой общей сессии', () => {
  const beginCommitSpy = jest
    .spyOn(ActiveSelectionScaleInteractionController.prototype, 'beginTextSelectionCommit')
    .mockReturnValue(true)
  const finishCommitSpy = jest
    .spyOn(ActiveSelectionScaleInteractionController.prototype, 'finishTextSelectionCommit')
    .mockReturnValue(true)
  const { editor } = createSelectionTestSetup()
  const manager = new SelectionManager({ editor })
  const selection = new ActiveSelection([new Rect(), new Rect()], { canvas: editor.canvas })
  const commit = jest.fn()

  expect(manager.commitTextSelectionScale({ selection, commit })).toBe(true)
  expect(beginCommitSpy).toHaveBeenCalledWith({ selection })
  expect(commit).toHaveBeenCalledTimes(1)
  expect(finishCommitSpy).toHaveBeenCalledWith({ selection })

  manager.destroy()
})

it('не запускает фиксацию для выделения без общей текстовой сессии', () => {
  const beginCommitSpy = jest
    .spyOn(ActiveSelectionScaleInteractionController.prototype, 'beginTextSelectionCommit')
    .mockReturnValue(false)
  const finishCommitSpy = jest
    .spyOn(ActiveSelectionScaleInteractionController.prototype, 'finishTextSelectionCommit')
    .mockReturnValue(false)
  const { editor } = createSelectionTestSetup()
  const manager = new SelectionManager({ editor })
  const selection = new ActiveSelection([new Rect(), new Rect()], { canvas: editor.canvas })
  const commit = jest.fn()

  expect(manager.commitTextSelectionScale({ selection, commit })).toBe(false)
  expect(beginCommitSpy).toHaveBeenCalledWith({ selection })
  expect(commit).not.toHaveBeenCalled()
  expect(finishCommitSpy).not.toHaveBeenCalled()

  manager.destroy()
})

it('завершает защищённую сессию, если фиксация текста завершилась ошибкой', () => {
  jest.spyOn(ActiveSelectionScaleInteractionController.prototype, 'beginTextSelectionCommit')
    .mockReturnValue(true)
  const finishCommitSpy = jest
    .spyOn(ActiveSelectionScaleInteractionController.prototype, 'finishTextSelectionCommit')
    .mockReturnValue(true)
  const { editor } = createSelectionTestSetup()
  const manager = new SelectionManager({ editor })
  const selection = new ActiveSelection([new Rect(), new Rect()], { canvas: editor.canvas })
  const commit = jest.fn(() => {
    throw new Error('Ошибка фиксации')
  })

  expect(() => manager.commitTextSelectionScale({ selection, commit })).toThrow('Ошибка фиксации')
  expect(commit).toHaveBeenCalledTimes(1)
  expect(finishCommitSpy).toHaveBeenCalledWith({ selection })

  manager.destroy()
})
