import { nanoid } from 'nanoid'
import {
  addCircleToCanvas,
  addRectangleToCanvas,
  addTriangleToCanvas
} from '../../../../src/editor/utils/primitive-shapes'
import { snapObjectToPixelGrid } from '../../../../src/editor/utils/geometry'
import { createCanvasStub } from '../../../test-utils/editor-helpers'

jest.mock('nanoid')
jest.mock('../../../../src/editor/utils/geometry', () => ({
  snapObjectToPixelGrid: jest.fn()
}))

describe('primitive-shapes', () => {
  const nanoidMock = nanoid as jest.MockedFunction<typeof nanoid>
  const snapObjectToPixelGridMock = snapObjectToPixelGrid as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    nanoidMock.mockReturnValue('generated-id')
  })

  it('addRectangleToCanvas центрирует, снапает, добавляет и выбирает объект по умолчанию', () => {
    const canvas = createCanvasStub()

    const rect = addRectangleToCanvas({
      canvas,
      options: {
        width: 200,
        height: 100
      }
    })

    expect(rect.get('id')).toBe('rect-generated-id')
    expect(canvas.centerObject).toHaveBeenCalledWith(rect)
    expect(snapObjectToPixelGridMock).toHaveBeenCalledWith({ object: rect })
    expect(canvas.add).toHaveBeenCalledWith(rect)
    expect(canvas.setActiveObject).toHaveBeenCalledWith(rect)
    expect(canvas.renderAll).toHaveBeenCalled()
  })

  it('addRectangleToCanvas возвращает объект без добавления при withoutAdding', () => {
    const canvas = createCanvasStub()

    const rect = addRectangleToCanvas({
      canvas,
      flags: {
        withoutAdding: true
      }
    })

    expect(rect.get('id')).toBe('rect-generated-id')
    expect(canvas.add).not.toHaveBeenCalled()
    expect(canvas.setActiveObject).not.toHaveBeenCalled()
    expect(canvas.renderAll).not.toHaveBeenCalled()
  })

  it('addCircleToCanvas не центрирует объект если заданы left и top', () => {
    const canvas = createCanvasStub()

    const circle = addCircleToCanvas({
      canvas,
      options: {
        left: 10,
        top: 20,
        radius: 30
      }
    })

    expect(circle.id).toBe('circle-generated-id')
    expect(canvas.centerObject).not.toHaveBeenCalled()
    expect(canvas.add).toHaveBeenCalledWith(circle)
    expect(canvas.renderAll).toHaveBeenCalled()
  })

  it('addTriangleToCanvas не выбирает объект при withoutSelection', () => {
    const canvas = createCanvasStub()

    const triangle = addTriangleToCanvas({
      canvas,
      flags: {
        withoutSelection: true
      }
    })

    expect(triangle.id).toBe('triangle-generated-id')
    expect(canvas.add).toHaveBeenCalledWith(triangle)
    expect(canvas.setActiveObject).not.toHaveBeenCalled()
    expect(canvas.renderAll).toHaveBeenCalled()
  })
})
