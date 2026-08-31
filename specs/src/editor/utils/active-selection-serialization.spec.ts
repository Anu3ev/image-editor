import {
  ActiveSelection,
  FabricObject,
  util
} from 'fabric'
import { withActiveSelectionTransformForSerialization } from '../../../../src/editor/utils/active-selection-serialization'

afterEach(() => {
  jest.clearAllMocks()
})

it('сериализует дочерний объект с преобразованием общей рамки и восстанавливает исходные свойства', () => {
  const object = new FabricObject({
    angle: 0,
    left: 10,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    top: 20
  })
  const selection = new ActiveSelection([object])
  const addTransformMock = util.addTransformToObject as jest.MockedFunction<
    typeof util.addTransformToObject
  >

  object.set({ group: selection })
  addTransformMock.mockImplementationOnce((target) => {
    target.set({ angle: 25, left: 110, scaleX: 1.8, scaleY: 0.7, skewX: 12, top: 70 })
  })

  const serialized = withActiveSelectionTransformForSerialization({
    object,
    selection,
    callback: () => ({
      angle: object.angle,
      left: object.left,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
      skewX: object.skewX,
      top: object.top
    })
  })

  expect(serialized).toEqual({ angle: 25, left: 110, scaleX: 1.8, scaleY: 0.7, skewX: 12, top: 70 })
  expect(addTransformMock).toHaveBeenCalledWith(object, selection.calcOwnMatrix())
  expect(object).toMatchObject({ angle: 0, left: 10, scaleX: 1, scaleY: 1, skewX: 0, top: 20 })
  expect(object.group).toBe(selection)
})

it('восстанавливает дочерний объект после ошибки сериализации', () => {
  const object = new FabricObject({ left: 15, scaleX: 1, scaleY: 1, top: 25 })
  const selection = new ActiveSelection([object])
  const addTransformMock = util.addTransformToObject as jest.MockedFunction<
    typeof util.addTransformToObject
  >

  object.set({ group: selection })
  addTransformMock.mockImplementationOnce((target) => {
    target.set({ left: 90, scaleX: 2, top: 120 })
  })

  expect(() => withActiveSelectionTransformForSerialization({
    object,
    selection,
    callback: () => {
      throw new Error('Ошибка сериализации')
    }
  })).toThrow('Ошибка сериализации')
  expect(object).toMatchObject({ left: 15, scaleX: 1, scaleY: 1, top: 25 })
  expect(object.group).toBe(selection)
})
