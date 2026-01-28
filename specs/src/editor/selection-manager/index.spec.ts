import { ActiveSelection } from 'fabric'
import SelectionManager from '../../../../src/editor/selection-manager'
import { emitCanvasEvent } from '../../../test-utils/canvas-events'
import { mouse, ptr } from '../../../test-utils/events'
import { createSelectionObject, createSelectionTestSetup } from '../../../test-utils/selection-helpers'

describe('SelectionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('selectionKey', () => {
    it('ставит Ctrl/Cmd по умолчанию', () => {
      const { editor } = createSelectionTestSetup()
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      expect(editor.canvas.selectionKey).toEqual(['ctrlKey', 'metaKey'])
    })

    it('берёт selectionKey из опций', () => {
      const { editor } = createSelectionTestSetup()
      editor.options.selectionKey = 'shiftKey'
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      expect(editor.canvas.selectionKey).toEqual('shiftKey')
    })
  })

  describe('редактирование текста', () => {
    it('отключает мультиселект при входе в редактирование', () => {
      const { editor } = createSelectionTestSetup()
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'text:editing:entered',
        payload: {}
      })

      expect(editor.canvas.selectionKey).toBeNull()
    })

    it('восстанавливает мультиселект при выходе из редактирования', () => {
      const { editor } = createSelectionTestSetup()
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'text:editing:entered',
        payload: {}
      })

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'text:editing:exited',
        payload: {}
      })

      expect(editor.canvas.selectionKey).toEqual(['ctrlKey', 'metaKey'])
    })
  })

  describe('поведение при выделении заблокированных объектов', () => {
    it('массовое выделение оставляет только незаблокированные объекты', () => {
      const { editor } = createSelectionTestSetup()
      const lockedObject = createSelectionObject({ locked: true })
      const unlockedA = createSelectionObject({ locked: false })
      const unlockedB = createSelectionObject({ locked: false })

      editor.canvasManager.getObjects.mockReturnValue([lockedObject, unlockedA, unlockedB])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      const activeSelection = new ActiveSelection([lockedObject, unlockedA, unlockedB], { canvas: editor.canvas })
      editor.canvas.setActiveObject(activeSelection)
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:created',
        payload: { selected: [lockedObject], e: mouse('mousedown') }
      })

      const call = (editor.canvas.setActiveObject as jest.Mock).mock.calls[0][0]
      expect(call).toBeInstanceOf(ActiveSelection)
      expect(call.getObjects()).toHaveLength(2)
      expect(call.getObjects()).toEqual(expect.arrayContaining([unlockedA, unlockedB]))
      expect(editor.objectLockManager.lockObject).not.toHaveBeenCalled()
    })

    it('разрешает массовое выделение только заблокированных объектов', () => {
      const { editor } = createSelectionTestSetup()
      const lockedA = createSelectionObject({ locked: true })
      const lockedB = createSelectionObject({ locked: true })

      editor.canvasManager.getObjects.mockReturnValue([lockedA, lockedB])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      const activeSelection = new ActiveSelection([lockedA, lockedB], { canvas: editor.canvas })
      editor.canvas.setActiveObject(activeSelection)
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:created',
        payload: { selected: [lockedA], e: mouse('mousedown') }
      })

      const call = (editor.canvas.setActiveObject as jest.Mock).mock.calls[0][0]
      expect(call).toBeInstanceOf(ActiveSelection)
      expect(call.getObjects()).toHaveLength(2)
      expect(call.getObjects()).toEqual(expect.arrayContaining([lockedA, lockedB]))
      expect(editor.objectLockManager.lockObject).toHaveBeenCalledWith(expect.objectContaining({
        object: expect.any(ActiveSelection),
        skipInnerObjects: true,
        withoutSave: true
      }))
    })

    it('не добавляет заблокированные объекты при Ctrl, если есть незаблокированные', () => {
      const { editor } = createSelectionTestSetup()
      const lockedObject = createSelectionObject({ locked: true })
      const unlockedObject = createSelectionObject({ locked: false })

      editor.canvasManager.getObjects.mockReturnValue([lockedObject, unlockedObject])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      const activeSelection = new ActiveSelection([lockedObject, unlockedObject], { canvas: editor.canvas })
      editor.canvas.setActiveObject(activeSelection)
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:updated',
        payload: { selected: [lockedObject], e: mouse('mousedown', { ctrlKey: true }) }
      })

      const call = (editor.canvas.setActiveObject as jest.Mock).mock.calls[0][0]
      expect(call).toBe(unlockedObject)
      expect(editor.objectLockManager.lockObject).not.toHaveBeenCalled()
    })

    it('добавляет заблокированные объекты при Ctrl, если выделение только из них', () => {
      const { editor } = createSelectionTestSetup()
      const lockedA = createSelectionObject({ locked: true })
      const lockedB = createSelectionObject({ locked: true })

      editor.canvasManager.getObjects.mockReturnValue([lockedA, lockedB])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      const activeSelection = new ActiveSelection([lockedA, lockedB], { canvas: editor.canvas })
      editor.canvas.setActiveObject(activeSelection)
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:updated',
        payload: { selected: [lockedB], e: mouse('mousedown', { ctrlKey: true }) }
      })

      const call = (editor.canvas.setActiveObject as jest.Mock).mock.calls[0][0]
      expect(call).toBeInstanceOf(ActiveSelection)
      expect(call.getObjects()).toHaveLength(2)
      expect(call.getObjects()).toEqual(expect.arrayContaining([lockedA, lockedB]))
      expect(editor.objectLockManager.lockObject).toHaveBeenCalledWith(expect.objectContaining({
        object: expect.any(ActiveSelection),
        skipInnerObjects: true,
        withoutSave: true
      }))
    })
  })

  describe('сброс выделения при клике по пустой области', () => {
    it('не сбрасывает выделение при зажатом Ctrl/Cmd', () => {
      const { editor } = createSelectionTestSetup()
      const unlockedObject = createSelectionObject({ locked: false })

      editor.canvasManager.getObjects.mockReturnValue([unlockedObject])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      editor.canvas.setActiveObject(unlockedObject)
      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:created',
        payload: { selected: [unlockedObject], e: mouse('mousedown') }
      })
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:cleared',
        payload: { e: mouse('mousedown', { ctrlKey: true }) }
      })

      expect(editor.canvas.setActiveObject).toHaveBeenCalledWith(unlockedObject)
    })

    it('сбрасывает выделение без модификаторов', () => {
      const { editor } = createSelectionTestSetup()
      const unlockedObject = createSelectionObject({ locked: false })

      editor.canvasManager.getObjects.mockReturnValue([unlockedObject])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      editor.canvas.setActiveObject(unlockedObject)
      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:created',
        payload: { selected: [unlockedObject], e: mouse('mousedown') }
      })
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:cleared',
        payload: { e: mouse('mousedown') }
      })

      expect(editor.canvas.setActiveObject).not.toHaveBeenCalled()
    })

    it('восстанавливает только существующие объекты', () => {
      const { editor } = createSelectionTestSetup()
      const existingObject = createSelectionObject({ locked: false })
      const removedObject = createSelectionObject({ locked: false })

      editor.canvasManager.getObjects.mockReturnValue([existingObject, removedObject])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      const activeSelection = new ActiveSelection([existingObject, removedObject], { canvas: editor.canvas })
      editor.canvas.setActiveObject(activeSelection)
      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:created',
        payload: { selected: [existingObject, removedObject], e: mouse('mousedown') }
      })

      editor.canvasManager.getObjects.mockReturnValue([existingObject])
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:cleared',
        payload: { e: mouse('mousedown', { ctrlKey: true }) }
      })

      expect(editor.canvas.setActiveObject).toHaveBeenCalledWith(existingObject)
    })
  })

  describe('массовое выделение областью с Ctrl/Cmd', () => {
    it('добавляет незаблокированные объекты к текущему выделению', () => {
      const { editor } = createSelectionTestSetup()
      const baseObject = createSelectionObject({ locked: false })
      const addedA = createSelectionObject({ locked: false })
      const addedB = createSelectionObject({ locked: false })

      editor.canvasManager.getObjects.mockReturnValue([baseObject, addedA, addedB])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      editor.canvas.setActiveObject(baseObject)
      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'mouse:down',
        payload: ptr(mouse('mousedown', { ctrlKey: true }))
      })

      const selectionBox = new ActiveSelection([addedA, addedB], { canvas: editor.canvas })
      editor.canvas.setActiveObject(selectionBox)
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:created',
        payload: { selected: [addedA, addedB], e: mouse('mousedown', { ctrlKey: true }) }
      })

      const call = (editor.canvas.setActiveObject as jest.Mock).mock.calls[0][0]
      expect(call).toBeInstanceOf(ActiveSelection)
      expect(call.getObjects()).toHaveLength(3)
      expect(call.getObjects()).toEqual(expect.arrayContaining([baseObject, addedA, addedB]))
    })

    it('добавляет только заблокированные объекты, если база залочена', () => {
      const { editor } = createSelectionTestSetup()
      const baseLocked = createSelectionObject({ locked: true })
      const addedLocked = createSelectionObject({ locked: true })
      const addedUnlocked = createSelectionObject({ locked: false })

      editor.canvasManager.getObjects.mockReturnValue([baseLocked, addedLocked, addedUnlocked])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      editor.canvas.setActiveObject(baseLocked)
      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'mouse:down',
        payload: ptr(mouse('mousedown', { ctrlKey: true }))
      })

      const selectionBox = new ActiveSelection([addedLocked, addedUnlocked], { canvas: editor.canvas })
      editor.canvas.setActiveObject(selectionBox)
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:created',
        payload: { selected: [addedLocked, addedUnlocked], e: mouse('mousedown', { ctrlKey: true }) }
      })

      const call = (editor.canvas.setActiveObject as jest.Mock).mock.calls[0][0]
      expect(call).toBeInstanceOf(ActiveSelection)
      expect(call.getObjects()).toHaveLength(2)
      expect(call.getObjects()).toEqual(expect.arrayContaining([baseLocked, addedLocked]))
      expect(call.getObjects()).not.toEqual(expect.arrayContaining([addedUnlocked]))
      expect(editor.objectLockManager.lockObject).toHaveBeenCalledWith(expect.objectContaining({
        object: expect.any(ActiveSelection),
        skipInnerObjects: true,
        withoutSave: true
      }))
    })

    it('не меняет выделение, если в рамке нет объектов', () => {
      const { editor } = createSelectionTestSetup()
      const baseObject = createSelectionObject({ locked: false })

      editor.canvasManager.getObjects.mockReturnValue([baseObject])
      // eslint-disable-next-line no-new
      new SelectionManager({ editor })

      editor.canvas.setActiveObject(baseObject)
      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'mouse:down',
        payload: ptr(mouse('mousedown', { ctrlKey: true }))
      })
      const setActiveObjectMock = editor.canvas.setActiveObject as jest.Mock
      setActiveObjectMock.mockClear()

      emitCanvasEvent({
        canvas: editor.canvas,
        event: 'selection:created',
        payload: { selected: [], e: mouse('mousedown', { ctrlKey: true }) }
      })

      expect(editor.canvas.setActiveObject).not.toHaveBeenCalled()
    })
  })
})
