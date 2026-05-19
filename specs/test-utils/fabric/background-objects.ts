import { createMockFabricObject } from './objects'

/**
 * Создаёт цветной background-объект с предсказуемым bounding rect.
 */
export const createMockBackgroundRect = (props: any = {}) => ({
  ...createMockFabricObject({
    type: 'rect',
    id: 'background',
    backgroundType: 'color',
    backgroundId: `background-${Math.random().toString(36).slice(2, 7)}`,
    fill: '#ffffff',
    selectable: false,
    evented: false,
    ...props
  }),
  getBoundingRect: jest.fn().mockReturnValue({
    left: props.left || 100,
    top: props.top || 50,
    width: props.width || 400,
    height: props.height || 300
  })
})

/**
 * Создаёт background-image объект с предсказуемым bounding rect.
 */
export const createMockBackgroundImage = (props: any = {}) => ({
  ...createMockFabricObject({
    type: 'image',
    id: 'background',
    backgroundType: 'image',
    backgroundId: `background-${Math.random().toString(36).slice(2, 7)}`,
    selectable: false,
    evented: false,
    ...props
  }),
  getBoundingRect: jest.fn().mockReturnValue({
    left: props.left || 100,
    top: props.top || 50,
    width: props.width || 400,
    height: props.height || 300
  })
})
