import { ImageEditor } from '../../../src/editor'
import { createFullOptions } from '../../test-utils/editor/options'

it('завершает сессии общего выделения до уничтожения менеджера прилипания', () => {
  const destructionOrder: string[] = []
  const destroyMock = jest.fn()
  const editor = Object.assign(Object.create(ImageEditor.prototype) as ImageEditor, {
    canvas: { dispose: jest.fn() },
    errorManager: { cleanBuffer: jest.fn() },
    imageManager: { destroy: jest.fn() },
    listeners: { destroy: destroyMock },
    selectionManager: {
      destroy: jest.fn(() => destructionOrder.push('selection'))
    },
    shapeManager: { destroy: destroyMock },
    snappingManager: {
      destroy: jest.fn(() => destructionOrder.push('snapping'))
    },
    textManager: { destroy: destroyMock },
    toolbar: { destroy: destroyMock },
    workerManager: { terminate: jest.fn() }
  })

  editor.destroy()

  expect(destructionOrder).toEqual(['selection', 'snapping'])
  expect(editor.canvas.dispose).toHaveBeenCalledTimes(1)
})

it('освобождает созданные ресурсы один раз, даже если другой шаг очистки завершился ошибкой', async() => {
  const failure = new Error('Listener cleanup failed')
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const editor = Object.assign(Object.create(ImageEditor.prototype) as ImageEditor, {
    listeners: { destroy: jest.fn(() => { throw failure }) },
    canvas: { dispose: jest.fn().mockRejectedValue(new Error('Disposal failed')) },
    workerManager: { terminate: jest.fn() },
    imageManager: { destroy: jest.fn() }
  })

  expect(() => editor.destroy()).not.toThrow()
  editor.destroy()
  await Promise.resolve()

  expect(editor.workerManager.terminate).toHaveBeenCalledTimes(1)
  expect(editor.canvas.dispose).toHaveBeenCalledTimes(1)
  expect(editor.imageManager.destroy).toHaveBeenCalledTimes(1)
  expect(log).toHaveBeenCalledTimes(2)
  log.mockRestore()
})

it('сохраняет canvas и регистрацию вызывающего кода при прямом создании редактора', () => {
  document.body.innerHTML = '<div id="host"><canvas id="host-canvas"></canvas></div>'
  const host = document.getElementById('host')!
  const init = jest.spyOn(ImageEditor.prototype, 'init').mockResolvedValue()
  const editor = new ImageEditor('host-canvas', createFullOptions({ editorContainer: host }))
  Object.assign(editor, { canvas: { dispose: jest.fn() } })
  window.host = editor

  editor.destroy()
  editor.destroy()

  expect(host.childElementCount).toBe(1)
  expect(window.host).toBe(editor)
  expect(editor.canvas.dispose).toHaveBeenCalledTimes(1)
  init.mockRestore()
  delete window.host
  document.body.innerHTML = ''
})
