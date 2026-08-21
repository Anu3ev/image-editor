import { ImageEditor } from '../../../src/editor'

it('завершает сессии общего выделения до уничтожения менеджера прилипания', () => {
  const destructionOrder: string[] = []
  const destroyMock = jest.fn()
  const editor = Object.assign(Object.create(ImageEditor.prototype) as ImageEditor, {
    canvas: { dispose: jest.fn() },
    errorManager: { cleanBuffer: jest.fn() },
    imageManager: { revokeBlobUrls: jest.fn() },
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
    workerManager: { worker: { terminate: jest.fn() } }
  })

  editor.destroy()

  expect(destructionOrder).toEqual(['selection', 'snapping'])
  expect(editor.canvas.dispose).toHaveBeenCalledTimes(1)
})
