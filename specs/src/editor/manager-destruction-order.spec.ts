import { ImageEditor } from '../../../src/editor'

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

it('удаляет созданный canvas и глобальную ссылку перед повторной инициализацией', () => {
  document.body.innerHTML = '<div id="host"><canvas id="host-canvas"></canvas></div>'
  const host = document.getElementById('host')!
  const editor = Object.assign(Object.create(ImageEditor.prototype) as ImageEditor, {
    containerId: 'host-canvas',
    options: { editorContainer: host },
    canvas: { dispose: jest.fn() }
  })
  window.host = editor

  editor.destroy()
  editor.destroy()

  expect(host.childElementCount).toBe(0)
  expect(window.host).toBeUndefined()
  expect(editor.canvas.dispose).toHaveBeenCalledTimes(1)
  document.body.innerHTML = ''
})
