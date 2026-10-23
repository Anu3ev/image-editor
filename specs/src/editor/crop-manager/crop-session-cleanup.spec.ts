import { ActiveSelection, Rect } from 'fabric'

import { createActiveCropManager, createScalingCropManager } from '../../../test-utils/crop/manager'

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

it('keeps a newly selected ActiveSelection when the selection change ends crop mode', () => {
  const { cropManager, editor } = createActiveCropManager()
  const multiSelection = new ActiveSelection([new Rect({ width: 40, height: 40 }), new Rect({ width: 20, height: 20 })])
  editor.canvas.getActiveObject = jest.fn(() => multiSelection)
  const discardActiveObject = jest.spyOn(editor.canvas, 'discardActiveObject')
  const setActiveObject = jest.spyOn(editor.canvas, 'setActiveObject')

  cropManager['_handleCanvasSelectionChanged']()

  expect(cropManager.isActive).toBe(false)
  expect(discardActiveObject).not.toHaveBeenCalled()
  expect(setActiveObject).not.toHaveBeenCalled()
})

it('returns to the previous object when a new selection includes the crop frame', () => {
  const { cropManager, editor, session } = createActiveCropManager()
  const previousObject = new Rect({ width: 40, height: 40 })
  session.previousActiveObject = previousObject
  editor.canvas.getObjects = jest.fn(() => [previousObject])
  editor.canvas.getActiveObject = jest.fn(() => new ActiveSelection([previousObject, session.frame]))
  const setActiveObject = jest.spyOn(editor.canvas, 'setActiveObject')

  cropManager['_handleCanvasSelectionChanged']()

  expect(cropManager.isActive).toBe(false)
  expect(setActiveObject).toHaveBeenCalledWith(previousObject)
})
