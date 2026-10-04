import { createScalingCropManager } from '../../../test-utils/crop/manager'

it('при ошибке завершения скейлинга закрывает crop и возвращает обычное редактирование', () => {
  const { cropManager, editor, endTransform, controller, source, frame, canvas, transform } = createScalingCropManager()
  const failure = new Error('Ошибка завершения Fabric transform')
  endTransform.mockImplementationOnce(() => { throw failure })
  const remove = jest.spyOn(canvas, 'remove')

  expect(() => cropManager.cancel()).toThrow(failure)
  expect(cropManager.isActive).toBe(false)
  expect(controller.ownsTransform(transform)).toBe(false)
  expect(remove).toHaveBeenCalledWith(frame)
  expect(source.selectable).toBe(true)
  expect(source.evented).toBe(true)
  expect(editor.historyManager.resumeHistory).toHaveBeenCalledTimes(1)
  expect(editor.toolbar.showAfterTemporary).toHaveBeenCalledTimes(1)
  expect(cropManager.cancel()).toBe(false)
  expect(editor.historyManager.resumeHistory).toHaveBeenCalledTimes(1)
  expect(editor.historyManager.saveState).not.toHaveBeenCalled()
})
