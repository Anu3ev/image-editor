import { ActiveSelection } from 'fabric'
import TransformManager from '../../../../src/editor/transform-manager'
import { createManagerTestMocks } from '../../../test-utils/editor-helpers'

describe('TransformManager', () => {
  let mockEditor: any
  let transformManager: TransformManager
  let mockCanvas: any

  beforeEach(() => {
    const mocks = createManagerTestMocks()
    mockEditor = mocks.mockEditor
    mockCanvas = mocks.mockCanvas

    transformManager = new TransformManager({ editor: mockEditor })
  })

  describe('constructor', () => {
    it('должен инициализировать TransformManager с правильными параметрами', () => {
      expect(transformManager.editor).toBe(mockEditor)
      expect(transformManager.options).toBe(mockEditor.options)
    })
  })

  describe('rotate', () => {
    it('должен повернуть активный объект на заданный угол', () => {
      const mockObject = {
        angle: 0,
        rotate: jest.fn(),
        setCoords: jest.fn()
      }
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      transformManager.rotate(90)

      expect(mockObject.rotate).toHaveBeenCalledWith(90)
      expect(mockObject.setCoords).toHaveBeenCalled()
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-rotated', {
        object: mockObject,
        withoutSave: undefined,
        angle: 90
      })
    })

    it('должен складывать углы при повторном вызове', () => {
      const mockObject = {
        angle: 45,
        rotate: jest.fn(),
        setCoords: jest.fn()
      }
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      transformManager.rotate(90)

      expect(mockObject.rotate).toHaveBeenCalledWith(135)
    })

    it('не должен сохранять состояние при withoutSave: true', () => {
      const mockObject = {
        angle: 0,
        rotate: jest.fn(),
        setCoords: jest.fn()
      }
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      transformManager.rotate(90, { withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-rotated', {
        object: mockObject,
        withoutSave: true,
        angle: 90
      })
    })

    it('не должен делать ничего если нет активного объекта', () => {
      mockCanvas.getActiveObject.mockReturnValue(null)

      transformManager.rotate(90)

      expect(mockCanvas.renderAll).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })
  })

  describe('flipX', () => {
    it('должен отразить объект по горизонтали', () => {
      const mockObject = {
        flipX: false
      }
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      transformManager.flipX()

      expect(mockObject.flipX).toBe(true)
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-flipped-x', {
        object: mockObject,
        withoutSave: undefined
      })
    })

    it('должен переключать flipX при повторном вызове', () => {
      const mockObject = {
        flipX: true
      }
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      transformManager.flipX()

      expect(mockObject.flipX).toBe(false)
    })
  })

  describe('flipY', () => {
    it('должен отразить объект по вертикали', () => {
      const mockObject = {
        flipY: false
      }
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      transformManager.flipY()

      expect(mockObject.flipY).toBe(true)
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-flipped-y', {
        object: mockObject,
        withoutSave: undefined
      })
    })
  })

  describe('setActiveObjectOpacity', () => {
    it('должен установить прозрачность для одиночного объекта', () => {
      const mockObject = {
        set: jest.fn()
      }
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      transformManager.setActiveObjectOpacity({ opacity: 0.5 })

      expect(mockObject.set).toHaveBeenCalledWith('opacity', 0.5)
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-opacity-changed', {
        object: mockObject,
        opacity: 0.5,
        withoutSave: undefined
      })
    })

    it('должен установить прозрачность для всех объектов в ActiveSelection', () => {
      const obj1 = { set: jest.fn() }
      const obj2 = { set: jest.fn() }
      const mockActiveSelection = new ActiveSelection([obj1 as any, obj2 as any], {}) as any
      mockActiveSelection.getObjects = jest.fn().mockReturnValue([obj1, obj2])

      mockCanvas.getActiveObject.mockReturnValue(mockActiveSelection)

      transformManager.setActiveObjectOpacity({ opacity: 0.7 })

      expect(obj1.set).toHaveBeenCalledWith('opacity', 0.7)
      expect(obj2.set).toHaveBeenCalledWith('opacity', 0.7)
    })

    it('должен использовать переданный объект вместо активного', () => {
      const specificObject = {
        set: jest.fn()
      }

      transformManager.setActiveObjectOpacity({
        object: specificObject as any,
        opacity: 0.3
      })

      expect(specificObject.set).toHaveBeenCalledWith('opacity', 0.3)
    })
  })

  describe('fitObject', () => {
    it('должен подогнать размер одиночного объекта', () => {
      const mockObject = {
        width: 800,
        height: 600,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        set: jest.fn()
      }
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      const fitSingleObjectSpy = jest.spyOn(transformManager as any, '_fitSingleObject').mockImplementation()

      transformManager.fitObject()

      expect(fitSingleObjectSpy).toHaveBeenCalledWith(mockObject, 'contain')
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
    })

    it('должен обработать ActiveSelection как отдельные объекты по умолчанию', () => {
      const obj1 = { id: 'obj1' }
      const obj2 = { id: 'obj2' }
      const mockActiveSelection = new ActiveSelection([obj1 as any, obj2 as any], {}) as any
      mockActiveSelection.getObjects = jest.fn().mockReturnValue([obj1, obj2])

      mockCanvas.getActiveObject.mockReturnValue(mockActiveSelection)

      const fitSingleObjectSpy = jest.spyOn(transformManager as any, '_fitSingleObject').mockImplementation()

      transformManager.fitObject()

      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(fitSingleObjectSpy).toHaveBeenCalledWith(obj1, 'contain')
      expect(fitSingleObjectSpy).toHaveBeenCalledWith(obj2, 'contain')
      expect(mockCanvas.setActiveObject).toHaveBeenCalledWith(expect.any(ActiveSelection))
    })

    it('должен обработать ActiveSelection как один объект при fitAsOneObject: true', () => {
      const obj1 = { id: 'obj1' }
      const obj2 = { id: 'obj2' }
      const mockActiveSelection = new ActiveSelection([obj1 as any, obj2 as any], {}) as any
      mockActiveSelection.getObjects = jest.fn().mockReturnValue([obj1, obj2])

      mockCanvas.getActiveObject.mockReturnValue(mockActiveSelection)

      const fitSingleObjectSpy = jest.spyOn(transformManager as any, '_fitSingleObject').mockImplementation()

      transformManager.fitObject({ fitAsOneObject: true })

      expect(mockCanvas.discardActiveObject).not.toHaveBeenCalled()
      expect(fitSingleObjectSpy).toHaveBeenCalledWith(mockActiveSelection, 'contain')
    })
  })

  describe('resetObject', () => {
    it('должен сбросить объект к дефолтным значениям', () => {
      const mockObject = {
        locked: false,
        type: 'rect',
        width: 200,
        height: 150,
        set: jest.fn()
      } as any

      transformManager.resetObject({ object: mockObject })

      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockObject.set).toHaveBeenCalledWith({
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        angle: 0
      })
      expect(mockCanvas.centerObject).toHaveBeenCalledWith(mockObject)
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
    })

    it('не должен делать ничего для заблокированного объекта', () => {
      const mockObject = {
        locked: true,
        set: jest.fn()
      } as any

      transformManager.resetObject({ object: mockObject })

      expect(mockObject.set).not.toHaveBeenCalled()
      expect(mockCanvas.renderAll).not.toHaveBeenCalled()
    })

    it('должен использовать активный объект если объект не передан', () => {
      const mockObject = {
        locked: false,
        type: 'rect',
        width: 200,
        height: 150,
        set: jest.fn()
      } as any
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      transformManager.resetObject()

      expect(mockObject.set).toHaveBeenCalled()
    })

    it('должен вызвать fitObject при alwaysFitObject: true', () => {
      const mockObject = {
        locked: false,
        type: 'image',
        width: 200,
        height: 150,
        set: jest.fn()
      } as any

      const fitObjectSpy = jest.spyOn(transformManager, 'fitObject').mockImplementation()

      transformManager.resetObject({ object: mockObject, alwaysFitObject: true })

      expect(fitObjectSpy).toHaveBeenCalledWith({
        object: mockObject,
        withoutSave: true,
        fitAsOneObject: true
      })
    })
  })

  describe('resetObjects', () => {
    it('должен сбросить все объекты', () => {
      const obj1 = { id: 'obj1' }
      const obj2 = { id: 'obj2' }
      mockEditor.canvasManager.getObjects.mockReturnValue([obj1, obj2])

      const resetObjectSpy = jest.spyOn(transformManager, 'resetObject').mockImplementation()

      transformManager.resetObjects()

      expect(resetObjectSpy).toHaveBeenCalledWith({ object: obj1 })
      expect(resetObjectSpy).toHaveBeenCalledWith({ object: obj2 })
    })
  })

})
