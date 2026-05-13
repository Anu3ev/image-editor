import { ActiveSelection } from 'fabric'
import TransformManager from '../../../../src/editor/transform-manager'
import { createManagerTestMocks } from '../../../test-utils/editor-helpers'
import {
  createOpacityActiveSelection,
  createOpacityObjectMock,
  createShapeGroupOpacityTarget
} from '../../../test-utils/transform-manager-helpers'

describe('TransformManager', () => {
  let mockEditor: any
  let transformManager: TransformManager
  let mockCanvas: any

  beforeEach(() => {
    const mocks = createManagerTestMocks()
    mockEditor = mocks.mockEditor
    mockCanvas = mocks.mockCanvas
    mockEditor.shapeManager.setOpacity = jest.fn()

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
    it('для обычного одиночного объекта устанавливает Fabric opacity', () => {
      const mockObject = createOpacityObjectMock()
      mockCanvas.getActiveObject.mockReturnValue(mockObject.object)

      transformManager.setActiveObjectOpacity({ opacity: 0.5 })

      expect(mockObject.setMock).toHaveBeenCalledWith('opacity', 0.5)
      expect(mockEditor.shapeManager.setOpacity).not.toHaveBeenCalled()
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-opacity-changed', {
        object: mockObject.object,
        opacity: 0.5,
        withoutSave: undefined
      })
    })

    it('для общего выделения применяет обычный opacity и shape opacity через разные контракты', () => {
      const ordinaryObject = createOpacityObjectMock()
      const {
        group: shapeGroup
      } = createShapeGroupOpacityTarget()
      const mockActiveSelection = createOpacityActiveSelection({
        objects: [
          ordinaryObject.object,
          shapeGroup
        ]
      })

      mockEditor.shapeManager.setOpacity.mockReturnValue(shapeGroup)

      mockCanvas.getActiveObject.mockReturnValue(mockActiveSelection)

      transformManager.setActiveObjectOpacity({ opacity: 0.7 })

      expect(ordinaryObject.setMock).toHaveBeenCalledWith('opacity', 0.7)
      expect(mockEditor.shapeManager.setOpacity).toHaveBeenCalledWith({
        target: shapeGroup,
        opacity: 0.7,
        withoutSave: true
      })
      expect(mockEditor.historyManager.saveState).toHaveBeenCalledTimes(1)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-opacity-changed', {
        object: mockActiveSelection,
        opacity: 0.7,
        withoutSave: undefined
      })
    })

    it('для одиночной shape-группы меняет прозрачность через ShapeManager', () => {
      const {
        group: shapeGroup
      } = createShapeGroupOpacityTarget()

      mockEditor.shapeManager.setOpacity.mockReturnValue(shapeGroup)
      mockCanvas.getActiveObject.mockReturnValue(shapeGroup)

      transformManager.setActiveObjectOpacity({ opacity: 0.6 })

      expect(mockEditor.shapeManager.setOpacity).toHaveBeenCalledWith({
        target: shapeGroup,
        opacity: 0.6,
        withoutSave: true
      })
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalledTimes(1)
    })

    it('для внутреннего объекта shape-группы обновляет всю фигуру через ShapeManager', () => {
      const {
        group: shapeGroup,
        shape
      } = createShapeGroupOpacityTarget()

      mockEditor.shapeManager.setOpacity.mockReturnValue(shapeGroup)

      transformManager.setActiveObjectOpacity({
        object: shape,
        opacity: 0.65
      })

      expect(mockEditor.shapeManager.setOpacity).toHaveBeenCalledWith({
        target: shapeGroup,
        opacity: 0.65,
        withoutSave: true
      })
      expect(mockCanvas.getActiveObject).not.toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalledTimes(1)
    })

    it('использует переданный обычный объект вместо активного', () => {
      const specificObject = createOpacityObjectMock()

      transformManager.setActiveObjectOpacity({
        object: specificObject.object,
        opacity: 0.3
      })

      expect(specificObject.setMock).toHaveBeenCalledWith('opacity', 0.3)
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

    it('должен материализовать fitted standalone text через textManager', () => {
      const commitStandaloneTextScaleMock = mockEditor.textManager.commitStandaloneTextScale as jest.Mock
      const commitRehydratedShapeLayoutMock = mockEditor.shapeManager.commitRehydratedShapeLayout as jest.Mock
      const textObject = {
        width: 200,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        type: 'textbox',
        set: jest.fn((nextValues) => {
          Object.assign(textObject, nextValues)
        }),
        setCoords: jest.fn()
      }

      mockCanvas.getActiveObject.mockReturnValue(textObject)
      commitStandaloneTextScaleMock.mockReturnValue(true)
      commitRehydratedShapeLayoutMock.mockReturnValue(false)

      transformManager.fitObject()

      expect(commitStandaloneTextScaleMock).toHaveBeenCalledWith({
        target: textObject
      })
      expect(commitRehydratedShapeLayoutMock).toHaveBeenCalledWith({
        target: textObject
      })
      expect(textObject.setCoords).toHaveBeenCalledTimes(1)
    })

    it('должен передать scale fitted-шейпа в materialization текста внутри фигуры', () => {
      const commitStandaloneTextScaleMock = mockEditor.textManager.commitStandaloneTextScale as jest.Mock
      const commitRehydratedShapeLayoutMock = mockEditor.shapeManager.commitRehydratedShapeLayout as jest.Mock
      const shapeObject = {
        width: 200,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        shapeComposite: true,
        set: jest.fn((nextValues) => {
          Object.assign(shapeObject, nextValues)
        }),
        setCoords: jest.fn()
      }

      mockCanvas.getActiveObject.mockReturnValue(shapeObject)
      commitStandaloneTextScaleMock.mockReturnValue(false)
      commitRehydratedShapeLayoutMock.mockReturnValue(true)

      transformManager.fitObject()

      expect(shapeObject.scaleX).toBe(2)
      expect(shapeObject.scaleY).toBe(2)
      expect(commitRehydratedShapeLayoutMock).toHaveBeenCalledWith({
        target: shapeObject,
        textScale: 2
      })
      expect(shapeObject.setCoords).toHaveBeenCalledTimes(1)
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

    it('не должен пересобирать ActiveSelection при fitAsOneObject если children не требуют materialization', () => {
      const obj1 = { id: 'obj1', type: 'rect' }
      const obj2 = { id: 'obj2', type: 'circle' }
      const mockActiveSelection = new ActiveSelection([obj1 as any, obj2 as any], {}) as any
      mockActiveSelection.getObjects = jest.fn().mockReturnValue([obj1, obj2])

      mockCanvas.getActiveObject.mockReturnValue(mockActiveSelection)

      const fitSingleObjectSpy = jest.spyOn(transformManager as any, '_fitSingleObject').mockImplementation()

      transformManager.fitObject({ fitAsOneObject: true })

      expect(mockCanvas.discardActiveObject).not.toHaveBeenCalled()
      expect(mockCanvas.setActiveObject).not.toHaveBeenCalled()
      expect(mockEditor.textManager.commitStandaloneTextScale).not.toHaveBeenCalled()
      expect(mockEditor.shapeManager.commitRehydratedShapeLayout).not.toHaveBeenCalled()
      expect(fitSingleObjectSpy).toHaveBeenCalledWith(mockActiveSelection, 'contain')
    })

    it('должен материализовать eligible children и пересобрать ActiveSelection при fitAsOneObject', () => {
      const commitStandaloneTextScaleMock = mockEditor.textManager.commitStandaloneTextScale as jest.Mock
      const commitRehydratedShapeLayoutMock = mockEditor.shapeManager.commitRehydratedShapeLayout as jest.Mock
      const textChild = {
        id: 'text-child',
        type: 'textbox',
        setCoords: jest.fn()
      }
      const genericChild = {
        id: 'generic-child',
        type: 'rect',
        setCoords: jest.fn()
      }
      const mockActiveSelection = new ActiveSelection([textChild as any, genericChild as any], {}) as any

      mockActiveSelection.getObjects = jest.fn().mockReturnValue([textChild, genericChild])
      mockCanvas.getActiveObject.mockReturnValue(mockActiveSelection)

      commitStandaloneTextScaleMock.mockImplementation(({ target }) => {
        return target === textChild
      })
      commitRehydratedShapeLayoutMock.mockReturnValue(false)

      const fitSingleObjectSpy = jest.spyOn(transformManager as any, '_fitSingleObject').mockImplementation()

      transformManager.fitObject({ fitAsOneObject: true })

      expect(fitSingleObjectSpy).toHaveBeenCalledWith(mockActiveSelection, 'contain')
      expect(mockCanvas.discardActiveObject).toHaveBeenCalledTimes(1)
      expect(commitStandaloneTextScaleMock).toHaveBeenCalledWith({
        target: textChild
      })
      expect(textChild.setCoords).not.toHaveBeenCalled()
      expect(genericChild.setCoords).toHaveBeenCalledTimes(1)
      expect(mockCanvas.setActiveObject).toHaveBeenCalledWith(expect.any(ActiveSelection))
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
      expect(mockEditor.canvasManager.centerObjectToMontageArea).toHaveBeenCalledWith({ object: mockObject })
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
