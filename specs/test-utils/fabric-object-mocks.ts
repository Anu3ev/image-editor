import {
  ActiveSelection,
  Group,
  Point,
  Textbox
} from 'fabric'

import { BackgroundTextbox } from '../../src/editor/text-manager/background-textbox'

type DecorationType = 'underline' | 'linethrough'

type DecorationRenderSetupOptions = {
  text: string
  type: DecorationType
  strokeByIndex: string[]
  strokeWidth?: number
  fill?: string
}

type DecorationStyleReaderOptions = {
  textbox: any
  type: DecorationType
  strokeByIndex: string[]
  strokeWidth: number
  fill: string
}

type DecorationCharBounds = Array<{
  left: number
  width: number
  kernedWidth: number
  height: number
  deltaY: number
}>

/**
 * Создаёт базовый fabric-like object с clone/set/setCoords контрактом для юнит-тестов.
 */
export const createMockFabricObject = (props: any = {}) => {
  const mockObject = {
    type: 'object',
    id: 'mock-object',
    left: 0,
    top: 0,
    locked: false,
    evented: true,
    ...props,
    clone: jest.fn().mockImplementation(async() => {
      // Глубокое копирование для избежания shared references
      const cloned = { ...mockObject, ...JSON.parse(JSON.stringify(props)) }
      // Создаем новый мок для клонированного объекта
      cloned.set = jest.fn().mockImplementation((newProps) => {
        Object.assign(cloned, newProps)
      })
      cloned.setCoords = jest.fn()
      cloned.toObject = jest.fn().mockReturnValue({ ...props })
      cloned.toCanvasElement = jest.fn().mockReturnValue({
        toDataURL: () => 'data:image/png;base64,mockData'
      })
      return cloned
    }),
    set: jest.fn().mockImplementation((newProps) => {
      Object.assign(mockObject, newProps)
    }),
    setCoords: jest.fn(),
    toObject: jest.fn().mockReturnValue(props),
    toCanvasElement: jest.fn().mockReturnValue({
      toDataURL: () => 'data:image/png;base64,mockData'
    })
  }
  return mockObject
}

/**
 * Создаёт мок ActiveSelection с тем же контрактом clone/set/forEachObject,
 * который используется production-кодом при работе с выделением.
 */
export const createMockActiveSelection = (objects: any[], props: any = {}) => {
  const mockSelection = new ActiveSelection(objects, props) as any

  // Добавляем методы моков
  mockSelection.clone = jest.fn().mockImplementation(async() => {
    // Глубокое копирование для избежания shared references
    const clonedObjects = objects.map((object) => {
      const clonedObject = { ...object }

      clonedObject.set = jest.fn().mockImplementation((newProps) => {
        Object.assign(clonedObject, newProps)
      })
      clonedObject.setCoords = jest.fn()

      return clonedObject
    })
    const clonedProps = JSON.parse(JSON.stringify(props))
    const cloned = new ActiveSelection(clonedObjects, clonedProps) as any
    cloned.set = jest.fn().mockImplementation((newProps) => {
      Object.assign(cloned, newProps)
    })
    cloned.setCoords = jest.fn()
    cloned.forEachObject = jest.fn().mockImplementation((callback) => {
      clonedObjects.forEach(callback)
    })
    cloned.toObject = jest.fn().mockReturnValue(clonedProps)
    cloned.toCanvasElement = jest.fn().mockReturnValue({
      toDataURL: () => 'data:image/png;base64,mockData'
    })
    return cloned
  })

  mockSelection.set = jest.fn().mockImplementation((newProps) => {
    Object.assign(mockSelection, newProps)
  })
  mockSelection.setCoords = jest.fn()

  mockSelection.toObject = jest.fn().mockReturnValue(props)
  mockSelection.toCanvasElement = jest.fn().mockReturnValue({
    toDataURL: () => 'data:image/png;base64,mockData'
  })

  mockSelection.forEachObject = jest.fn().mockImplementation((callback) => {
    objects.forEach(callback)
  })

  return mockSelection
}

/**
 * Создаёт Group на реальном mock-классе Fabric, чтобы тесты не расходились
 * с runtime-контрактом контейнера объектов.
 */
export const createMockGroup = (objects: any[] = [], props: any = {}) => {
  // Используем реальный класс Group из мока
  const mockGroup = new Group(objects, {
    id: props.id || 'mock-group',
    left: props.left || 0,
    top: props.top || 0,
    width: props.width || 100,
    height: props.height || 100,
    ...props
  })

  return mockGroup
}

/**
 * Создаёт ClipboardEvent-подобный объект с настраиваемым clipboardData.
 */
export const createMockClipboardEvent = (data: any = {}) => ({
  clipboardData: {
    items: data.items || [],
    getData: data.getData || jest.fn().mockReturnValue(''),
    ...data
  }
} as ClipboardEvent)

/**
 * Возвращает объект, который падает на clone().
 * Нужен для негативных сценариев clipboard/history.
 */
export const createFailingMockObject = (errorMessage = 'Mock clone failed') => {
  const mockObject = createMockFabricObject({ type: 'rect', id: 'failing-object' })
  mockObject.clone.mockRejectedValue(new Error(errorMessage))
  return mockObject
}

/**
 * Возвращает ClipboardEvent без clipboardData для fail-fast сценариев.
 */
export const createEmptyClipboardEvent = () => ({
  clipboardData: null
} as any as ClipboardEvent)

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

/**
 * Создаёт минимальный мок CanvasRenderingContext2D для рендера.
 */
export const createMockContext = (): CanvasRenderingContext2D => {
  const ctx: any = {
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    _fillStyle: undefined as string | undefined
  }

  Object.defineProperty(ctx, 'fillStyle', {
    get: () => ctx._fillStyle,
    set: (value) => {
      ctx._fillStyle = value
    }
  })

  return ctx as CanvasRenderingContext2D
}

/**
 * Добавляет недостающие методы в mock-классы Fabric для тестов.
 */
export const ensureFabricHelpers = (): void => {
  const { prototype: pointPrototype } = Point
  if (!pointPrototype.scalarAdd) {
    pointPrototype.scalarAdd = function addScalar(value: number) {
      return new Point(this.x + value, this.y + value)
    }
  }

  const { prototype: textboxPrototype } = Textbox
  if (!textboxPrototype.toObject) {
    textboxPrototype.toObject = function toObject() {
      const { constructor } = this as any
      return { ...this, type: constructor?.type ?? 'textbox' }
    }
  }
}

/**
 * Создаёт BackgroundTextbox с переопределённым чтением стилей для декораций.
 */
export const createDecorationTextbox = ({
  stroke = '#ff0000',
  strokeWidth = 2,
  fill = '#000000'
}: {
  stroke?: string | null
  strokeWidth?: number
  fill?: string
} = {}) => {
  const textbox = new BackgroundTextbox('Test')
  const state = {
    stroke,
    strokeWidth,
    fill
  }
  const textboxAny = textbox as any

  textboxAny.getValueOfPropertyAt = (
    _lineIndex: number,
    _charIndex: number,
    property: string
  ) => {
    const {
      strokeWidth: currentStrokeWidth,
      stroke: currentStroke,
      fill: currentFill
    } = state

    if (property === 'strokeWidth') return currentStrokeWidth
    if (property === 'stroke') return currentStroke
    if (property === 'fill') return currentFill
    return undefined
  }

  return { textbox, state }
}

/**
 * Строит char bounds в виде равномерной линейки, достаточной для unit-тестов декораций.
 */
const createDecorationCharBounds = (charsLength: number): DecorationCharBounds => {
  const charBounds: DecorationCharBounds = []

  for (let index = 0; index < charsLength; index += 1) {
    charBounds.push({
      left: index * 10,
      width: 10,
      kernedWidth: 10,
      height: 10,
      deltaY: 0
    })
  }

  return charBounds
}

/**
 * Заполняет internal Textbox-поля минимальным layout-состоянием,
 * которое требуется decoration renderer.
 */
const prepareDecorationTextboxLayout = ({
  textbox,
  chars,
  charBounds,
  type
}: {
  textbox: any
  chars: string[]
  charBounds: DecorationCharBounds
  type: DecorationType
}) => {
  textbox._textLines = [chars]
  textbox.__charBounds = [charBounds]
  textbox.offsets = { underline: 0, linethrough: 0, overline: 0 }
  textbox._fontSizeFraction = 0
  textbox.direction = 'ltr'
  textbox.width = chars.length * 10
  textbox._getWidthOfCharSpacing = () => 0
  textbox._getLineLeftOffset = () => 0
  textbox._getTopOffset = () => 0
  textbox._getLeftOffset = () => 0
  textbox.getHeightOfLine = () => 10
  textbox.getHeightOfChar = () => 10
  textbox.styleHas = () => true
  textbox._removeShadow = jest.fn()
  textbox[type] = true
}

/**
 * Подменяет style-reader так, чтобы декорации читали stroke/fill из тестовых данных.
 */
const setDecorationStyleReader = ({
  textbox,
  type,
  strokeByIndex,
  strokeWidth,
  fill
}: DecorationStyleReaderOptions) => {
  const fallbackStrokeIndex = Math.max(strokeByIndex.length - 1, 0)

  textbox.getValueOfPropertyAt = (
    _lineIndex: number,
    charIndex: number,
    property: string
  ) => {
    if (property === type) return true
    if (property === 'textDecorationThickness') return 100
    if (property === 'deltaY') return 0
    if (property === 'strokeWidth') return strokeWidth
    if (property === 'stroke') {
      const strokeAtIndex = strokeByIndex[charIndex]
      const fallbackStroke = strokeByIndex[fallbackStrokeIndex]
      return strokeAtIndex ?? fallbackStroke
    }
    if (property === 'fill') return fill
    return undefined
  }
}

/**
 * Возвращает mock canvas context и собирает фактические fillStyle,
 * которыми отрисовывались декорации.
 */
const createTrackedMockContext = () => {
  const ctx = createMockContext()
  const fillStyles: string[] = []

  ctx.fillRect = function fillRect() {
    fillStyles.push(ctx.fillStyle as string)
  }

  return {
    ctx,
    fillStyles
  }
}

/**
 * Готовит BackgroundTextbox и контекст для проверки цветов декораций.
 */
export const createDecorationRenderSetup = ({
  text,
  type,
  strokeByIndex,
  strokeWidth = 2,
  fill = '#000000'
}: DecorationRenderSetupOptions) => {
  const textbox = new BackgroundTextbox(text, { fontSize: 10, lineHeight: 1 })
  const chars = text.split('')
  const charBounds = createDecorationCharBounds(chars.length)
  const textboxAny = textbox as any

  prepareDecorationTextboxLayout({
    textbox: textboxAny,
    chars,
    charBounds,
    type
  })
  setDecorationStyleReader({
    textbox: textboxAny,
    type,
    strokeByIndex,
    strokeWidth,
    fill
  })

  const { ctx, fillStyles } = createTrackedMockContext()

  return { textbox, ctx, fillStyles }
}

/**
 * Глобальный clipboard mock для тестов copy/paste сценариев.
 */
export const mockNavigatorClipboard = {
  writeText: jest.fn(),
  write: jest.fn(),
  readText: jest.fn()
}

/**
 * Mock ClipboardItem с минимальным контрактом, который ожидает ClipboardManager.
 */
export const mockClipboardItem = jest.fn().mockImplementation((data) => ({
  types: Object.keys(data),
  getType: jest.fn()
}))

/**
 * Mock FileReader для сценариев вставки файлов из буфера обмена.
 */
export class MockFileReader {
  result: string | null = null

  onload: ((event: any) => void) | null = null

  readAsDataURL(_blob: Blob): void {
    setTimeout(() => {
      this.result = 'data:image/png;base64,mockBase64Data'
      if (this.onload) {
        this.onload({ target: this })
      }
    }, 0)
  }
}

/**
 * DOMParser mock для HTML clipboard payload.
 */
export const mockQuerySelector = jest.fn()
export const mockDOMParser = {
  parseFromString: jest.fn().mockReturnValue({
    querySelector: mockQuerySelector
  })
}

/**
 * atob mock для base64 clipboard payload.
 */
export const mockAtob = jest.fn().mockImplementation((_base64: string) => 'mock-binary-data')

/**
 * Blob mock для тестов, где clipboard создаёт бинарный payload.
 */
export const mockBlob = jest.fn().mockImplementation((data, options) => ({
  type: options?.type || 'application/octet-stream',
  size: 100
}))

/**
 * Устанавливает полный набор browser API mock-объектов для clipboard тестов.
 */
export const setupBrowserMocks = () => {
  Object.defineProperty(global, 'navigator', {
    value: { clipboard: mockNavigatorClipboard },
    writable: true
  })

  Object.defineProperty(global, 'ClipboardItem', {
    value: mockClipboardItem,
    writable: true
  })

  Object.defineProperty(global, 'FileReader', {
    value: MockFileReader,
    writable: true
  })

  Object.defineProperty(global, 'DOMParser', {
    value: jest.fn().mockImplementation(() => mockDOMParser),
    writable: true
  })

  Object.defineProperty(global, 'atob', {
    value: mockAtob,
    writable: true
  })

  Object.defineProperty(global, 'Blob', {
    value: mockBlob,
    writable: true
  })
}
