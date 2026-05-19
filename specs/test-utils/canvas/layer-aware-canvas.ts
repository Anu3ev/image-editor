import { createCanvasStub } from './canvas-stub'

export const createLayerAwareCanvasMock = () => {
  let objects: any[] = []

  const canvas = {
    ...createCanvasStub(),

    getObjects: jest.fn(() => [...objects]),
    setObjects: (newObjects: any[]) => {
      objects = [...newObjects]
    },
    add: jest.fn((obj: any) => {
      objects.push(obj)
    }),
    remove: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > -1) {
        objects.splice(index, 1)
      }
    }),

    bringObjectToFront: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > -1) {
        objects.splice(index, 1)
        objects.push(obj)
      }
    }),

    bringObjectForward: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > -1 && index < objects.length - 1) {
        objects.splice(index, 1)
        objects.splice(index + 1, 0, obj)
      }
    }),

    sendObjectToBack: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > -1) {
        objects.splice(index, 1)
        objects.unshift(obj)
      }
    }),

    sendObjectBackwards: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > 0) {
        objects.splice(index, 1)
        objects.splice(index - 1, 0, obj)
      }
    }),

    moveObjectTo: jest.fn((obj: any, targetIndex: number) => {
      const currentIndex = objects.indexOf(obj)
      if (currentIndex > -1) {
        objects.splice(currentIndex, 1)
        objects.splice(targetIndex, 0, obj)
      }
    }),

    indexOf: jest.fn((obj: any) => objects.indexOf(obj)),

    insertAt: jest.fn((obj: any, index: number) => {
      objects.splice(index, 0, obj)
    }),

    getActiveObject: jest.fn(() => null),
    getActiveObjects: jest.fn(() => [])
  }

  canvas.clear = jest.fn(() => {
    objects = []
  })

  return canvas as any
}
