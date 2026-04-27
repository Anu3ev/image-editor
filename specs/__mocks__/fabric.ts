// Minimal manual mock for fabric to be used in tests via moduleNameMapper.
// We don't emulate full FabricJS, only the pieces the tests interact with.

export class Point {
  public x: number

  public y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  scalarAdd(value: number) {
    return new Point(this.x + value, this.y + value)
  }
}

export class Canvas {
  public el: any

  public options: any

  public clipPath: any = null

  public dispose = jest.fn()

  public on = jest.fn()

  public off = jest.fn()

  public add = jest.fn()

  public centerObject = jest.fn()

  public setActiveObject = jest.fn()

  public getActiveObject = jest.fn().mockReturnValue(null)

  public requestRenderAll = jest.fn()

  public getViewportPoint = jest.fn().mockReturnValue(new Point(0, 0))

  constructor(el: any, options: any) {
    this.el = el
    this.options = options
  }

  // Define as prototype method to allow spying via jest.spyOn(Canvas.prototype, 'fire')
  public fire(_event: any, _payload?: any) {
    // no-op in mock; jest will spy on prototype
  }
}

export class Pattern {
  public options: any

  constructor(options: any) {
    this.options = options
  }
}

export class FitContentLayout {
  calcBoundingBox(_objects: unknown[], _context: unknown) {
    return undefined
  }
}

export class Rect {
  private props: Record<string, any>

  constructor(options: Record<string, any>) {
    this.props = { ...options }
    Object.assign(this, options)
  }

  get(key: string) {
    return this.props[key]
  }

  set(props: Record<string, any>) {
    Object.assign(this.props, props)
    Object.assign(this, props)
  }

  setCoords() {
    // noop in mock
  }

  getPointByOrigin(originX: 'left' | 'center' | 'right', originY: 'top' | 'center' | 'bottom') {
    const width = (this as any).width ?? 0
    const height = (this as any).height ?? 0
    let x = (this as any).left ?? 0
    let y = (this as any).top ?? 0

    if (originX === 'center') {
      x += width / 2
    } else if (originX === 'right') {
      x += width
    }

    if (originY === 'center') {
      y += height / 2
    } else if (originY === 'bottom') {
      y += height
    }

    return new Point(x, y)
  }

  setPositionByOrigin(
    point: { x: number; y: number },
    originX: 'left' | 'center' | 'right',
    originY: 'top' | 'center' | 'bottom'
  ) {
    const width = (this as any).width ?? 0
    const height = (this as any).height ?? 0
    let left = point.x
    let top = point.y

    if (originX === 'center') {
      left -= width / 2
    } else if (originX === 'right') {
      left -= width
    }

    if (originY === 'center') {
      top -= height / 2
    } else if (originY === 'bottom') {
      top -= height
    }

    this.set({
      left,
      top
    })
  }
}

export class Control {
  actionHandler?: (...args: unknown[]) => unknown

  offsetX = 0

  offsetY = 0

  constructor(options: Record<string, unknown> = {}) {
    Object.assign(this, options)
  }
}

export class ActiveSelection {
  type = 'activeSelection'

  canvas: any = null

  private objects: any[]

  constructor(objects: any[], public options: any = {}) {
    this.objects = objects || []
    Object.assign(this, options)
  }

  getObjects() {
    return this.objects
  }

  forEachObject(callback: (obj: any) => void) {
    this.objects.forEach(callback)
  }

  set(key: string | Record<string, any>, value?: any) {
    if (typeof key === 'string') {
      (this as any)[key] = value
      return
    }
    Object.assign(this, key)
  }

  async clone() {
    // Глубокое копирование objects и options для избежания shared references
    const clonedObjects = this.objects.map((obj) => ({ ...obj }))
    const clonedOptions = { ...this.options }

    const cloned = new ActiveSelection(clonedObjects, clonedOptions)
    cloned.set = jest.fn().mockImplementation((newProps) => {
      Object.assign(cloned, newProps)
    })
    return cloned
  }

  toObject() {
    return { ...this.options }
  }

  toCanvasElement() {
    return {
      toDataURL: () => `data:image/png;base64,mockData-${this.type}`
    }
  }
}

export class Group {
  type = 'group'

  id = ''

  left = 0

  top = 0

  width = 100

  height = 100

  controls: Record<string, unknown> = {}

  _objects: any[] = []

  constructor(objects: any[] | undefined, public options: any = {}) {
    this._objects = objects ?? []

    for (let index = 0; index < this._objects.length; index += 1) {
      const object = this._objects[index]
      if (object && typeof object === 'object') {
        object.group = this
      }
    }

    Object.assign(this, options)
  }

  getObjects() {
    return this._objects
  }

  add(...objects: any[]) {
    this._objects.push(...objects)

    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index]
      if (object && typeof object === 'object') {
        object.group = this
      }
    }

    return this._objects.length
  }

  insertAt(index: number, ...objects: any[]) {
    this._objects.splice(index, 0, ...objects)

    for (let indexOffset = 0; indexOffset < objects.length; indexOffset += 1) {
      const object = objects[indexOffset]
      if (object && typeof object === 'object') {
        object.group = this
      }
    }

    return this._objects.length
  }

  remove(...objects: any[]) {
    const removed: any[] = []

    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index]
      const objectIndex = this._objects.indexOf(object)
      if (objectIndex < 0) {
        continue
      }

      this._objects.splice(objectIndex, 1)
      removed.push(object)

      if (object && typeof object === 'object' && object.group === this) {
        object.group = null
      }
    }

    return removed
  }

  removeAll() {
    const objects = [...this._objects]
    this._objects = []

    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index]
      if (object && typeof object === 'object' && object.group === this) {
        object.group = null
      }
    }

    return objects
  }

  set(props: any) {
    Object.assign(this, props)
  }

  setCoords() {
    // noop in mock
  }

  getCenterPoint() {
    return this.getPointByOrigin('center', 'center')
  }

  getPointByOrigin(originX: 'left' | 'center' | 'right', originY: 'top' | 'center' | 'bottom') {
    const width = (this.width ?? 0) * ((this as any).scaleX ?? 1)
    const height = (this.height ?? 0) * ((this as any).scaleY ?? 1)
    let x = this.left ?? 0
    let y = this.top ?? 0

    if (originX === 'center') {
      x += width / 2
    } else if (originX === 'right') {
      x += width
    }

    if (originY === 'center') {
      y += height / 2
    } else if (originY === 'bottom') {
      y += height
    }

    return new Point(x, y)
  }

  setPositionByOrigin(
    point: { x: number; y: number },
    originX: 'left' | 'center' | 'right',
    originY: 'top' | 'center' | 'bottom'
  ) {
    const width = (this.width ?? 0) * ((this as any).scaleX ?? 1)
    const height = (this.height ?? 0) * ((this as any).scaleY ?? 1)
    let nextLeft = point.x
    let nextTop = point.y

    if (originX === 'center') {
      nextLeft -= width / 2
    } else if (originX === 'right') {
      nextLeft -= width
    }

    if (originY === 'center') {
      nextTop -= height / 2
    } else if (originY === 'bottom') {
      nextTop -= height
    }

    this.left = nextLeft
    this.top = nextTop
  }

  async clone() {
    const clonedObjects = this._objects.map((obj) => ({ ...obj }))
    const clonedOptions = { ...this.options }
    return new Group(clonedObjects, clonedOptions)
  }

  toObject() {
    return { ...this.options }
  }
}

export class FabricObject {
  constructor(public options: any = {}) {
    Object.assign(this, options)
  }

  transformMatrixKey() {
    const {
      left = 0,
      top = 0,
      width = 0,
      height = 0,
      scaleX = 1,
      scaleY = 1,
      angle = 0
    } = this as any

    return [left, top, width, height, scaleX, scaleY, angle]
  }

  set(key: string | Record<string, any>, value?: any) {
    if (typeof key === 'string') {
      (this as any)[key] = value
      return
    }
    Object.assign(this, key)
  }

  setCoords() {
    // noop in mock
  }

  /**
   * Возвращает относительную точку центра объекта.
   */
  public getRelativeCenterPoint() {
    const {
      left = 0,
      top = 0,
      width = 0,
      height = 0,
      scaleX = 1,
      scaleY = 1
    } = this as any
    const resolvedWidth = width * scaleX
    const resolvedHeight = height * scaleY

    return new Point(left + (resolvedWidth / 2), top + (resolvedHeight / 2))
  }

  /**
   * Переводит точку из центра в координаты origin объекта.
   */
  public translateToOriginPoint(
    point: { x: number; y: number },
    originX: 'left' | 'center' | 'right',
    originY: 'top' | 'center' | 'bottom'
  ) {
    const {
      width = 0,
      height = 0,
      scaleX = 1,
      scaleY = 1
    } = this as any
    const resolvedWidth = width * scaleX
    const resolvedHeight = height * scaleY

    let nextX = point.x
    let nextY = point.y

    if (originX === 'left') {
      nextX -= resolvedWidth / 2
    }
    if (originX === 'right') {
      nextX += resolvedWidth / 2
    }
    if (originY === 'top') {
      nextY -= resolvedHeight / 2
    }
    if (originY === 'bottom') {
      nextY += resolvedHeight / 2
    }

    return new Point(nextX, nextY)
  }

  public getPointByOrigin(
    originX: 'left' | 'center' | 'right',
    originY: 'top' | 'center' | 'bottom'
  ) {
    const {
      left = 0,
      top = 0,
      width = 0,
      height = 0,
      scaleX = 1,
      scaleY = 1
    } = this as any
    const resolvedWidth = width * scaleX
    const resolvedHeight = height * scaleY

    let x = left
    let y = top

    if (originX === 'center') {
      x += resolvedWidth / 2
    }
    if (originX === 'right') {
      x += resolvedWidth
    }
    if (originY === 'center') {
      y += resolvedHeight / 2
    }
    if (originY === 'bottom') {
      y += resolvedHeight
    }

    return new Point(x, y)
  }

  /**
   * Устанавливает позицию объекта по заданному origin.
   */
  public setPositionByOrigin(
    point: { x: number; y: number },
    originX: 'left' | 'center' | 'right',
    originY: 'top' | 'center' | 'bottom'
  ) {
    const {
      width = 0,
      height = 0,
      scaleX = 1,
      scaleY = 1
    } = this as any
    const resolvedWidth = width * scaleX
    const resolvedHeight = height * scaleY

    let nextLeft = point.x
    let nextTop = point.y

    if (originX === 'center') {
      nextLeft -= resolvedWidth / 2
    }
    if (originX === 'right') {
      nextLeft -= resolvedWidth
    }
    if (originY === 'center') {
      nextTop -= resolvedHeight / 2
    }
    if (originY === 'bottom') {
      nextTop -= resolvedHeight
    }

    const target = this as any
    target.left = nextLeft
    target.top = nextTop
  }

  _getTransformedDimensions(options: { width?: number; height?: number } = {}) {
    const width = options.width ?? 0
    const height = options.height ?? 0
    const PointCtor = (this as any).Point || Point
    return new PointCtor(width, height)
  }
}

export class InteractiveFabricObject extends FabricObject {}

export class Circle extends FabricObject {}

export class Triangle extends FabricObject {}

export class Ellipse extends FabricObject {}

export class Path extends FabricObject {}

export class Polygon extends FabricObject {}

export class Polyline extends FabricObject {}

export class Textbox extends FabricObject {
  public text?: string

  public id?: string

  public controls: Record<string, any> = {}

  public uppercase?: boolean

  public textCaseRaw?: string

  public fontSize?: number

  public lineHeight?: number

  public width?: number

  public height?: number

  public left?: number

  public top?: number

  public originX?: 'left' | 'center' | 'right'

  public originY?: 'top' | 'center' | 'bottom'

  public dirty = false

  public isEditing = false

  public selectionStart = 0

  public selectionEnd = 0

  public textLines: string[] = []

  private charStyles: Record<number, Record<string, any>> = {}

  static ownDefaults: Record<string, any> = {}

  static type = 'textbox'

  constructor(text: string, options: Record<string, any> = {}) {
    super(options)
    this.text = text
  }

  set(props: Record<string, any>) {
    Object.assign(this, props)
  }

  setCoords() {
    // noop in mock
  }

  getBoundingRect() {
    return {
      left: this.left ?? 0,
      top: this.top ?? 0,
      width: this.width ?? 0,
      height: this.height ?? 0
    }
  }

  getLineWidth(_lineIndex: number) {
    return this.calcTextWidth()
  }

  getPointByOrigin(originX: 'left' | 'center' | 'right', originY: 'top' | 'center' | 'bottom') {
    const width = this.width ?? 0
    const height = this.height ?? 0
    let x = this.left ?? 0
    let y = this.top ?? 0

    if (originX === 'center') {
      x += width / 2
    } else if (originX === 'right') {
      x += width
    }

    if (originY === 'center') {
      y += height / 2
    } else if (originY === 'bottom') {
      y += height
    }

    return new Point(x, y)
  }

  setPositionByOrigin(
    point: Point,
    originX: 'left' | 'center' | 'right',
    originY: 'top' | 'center' | 'bottom'
  ) {
    const width = this.width ?? 0
    const height = this.height ?? 0
    let left = point.x
    let top = point.y

    if (originX === 'center') {
      left -= width / 2
    } else if (originX === 'right') {
      left -= width
    }

    if (originY === 'center') {
      top -= height / 2
    } else if (originY === 'bottom') {
      top -= height
    }

    this.left = left
    this.top = top
  }

  /**
   * Пересчитывает размеры и строки текста в мок-окружении.
   */
  initDimensions() {
    const { text = '' } = this
    const lineCount = text ? text.split('\n').length : 0
    this.textLines = lineCount ? text.split('\n') : ['']

    const nextWidth = this.calcTextWidth()
    if (typeof nextWidth === 'number') {
      this.width = nextWidth
    }

    const nextHeight = this.calcTextHeight()
    if (typeof nextHeight === 'number') {
      this.height = nextHeight
    }
  }

  /**
   * Возвращает приблизительную высоту текста для мок-рендера.
   */
  calcTextHeight() {
    const {
      text = '',
      fontSize = 0,
      lineHeight = 1
    } = this

    if (!text) return 0

    const lineCount = text.split('\n').length
    if (!lineCount) return 0

    const safeFontSize = typeof fontSize === 'number' ? fontSize : 0
    const safeLineHeight = typeof lineHeight === 'number' ? lineHeight : 1

    return lineCount * safeFontSize * safeLineHeight
  }

  calcTextWidth() {
    return this.width ?? 0
  }

  toObject() {
    return { ...this, type: (this as any).constructor?.type ?? Textbox.type }
  }

  setControlsVisibility = jest.fn()

  setSelectionStyles(styles: Record<string, any>, start: number, end?: number) {
    const safeEnd = typeof end === 'number' ? end : start + 1
    for (let i = start; i < safeEnd; i += 1) {
      const existing = this.charStyles[i] ?? {}
      this.charStyles[i] = { ...existing, ...styles }
    }
  }

  getSelectionStyles(start: number, end?: number): Array<Record<string, any>> {
    const safeEnd = typeof end === 'number' ? end : start + 1
    const styles: Array<Record<string, any>> = []
    for (let i = start; i < safeEnd; i += 1) {
      styles.push({ ...this.charStyles[i] ?? {} })
    }
    return styles
  }

  __getCharStyles() {
    return this.charStyles
  }
}

type MockTextStyle = Record<string, any>
type MockTextStyles = Record<string, Record<string, MockTextStyle>>
type MockTextStyleRange = {
  start: number
  end: number
  style: MockTextStyle
}

const cloneMockStyles = (styles: MockTextStyles): MockTextStyles => JSON.parse(JSON.stringify(styles)) as MockTextStyles

const areMockStylesEqual = ({
  left,
  right
}: {
  left: MockTextStyle
  right: MockTextStyle
}): boolean => {
  const keys = [...new Set([
    ...Object.keys(left),
    ...Object.keys(right)
  ])]

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]
    if (!key) continue
    if (left[key] !== right[key]) return false
  }

  return true
}

// Fabric сериализует runtime styles в массив диапазонов и обратно.
// Для unit-моков нам достаточно стабильного round-trip без полного паритета с библиотекой.
const stylesToArray = (styles: MockTextStyles = {}, text = ''): MockTextStyleRange[] => {
  const lines = text.split('\n')
  const ranges: MockTextStyleRange[] = []
  let charIndex = -1
  let previousStyle: MockTextStyle = {}

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? ''
    const lineStyles = styles[lineIndex] ?? {}

    for (let charIndexInLine = 0; charIndexInLine < line.length; charIndexInLine += 1) {
      charIndex += 1
      const currentStyle = lineStyles[charIndexInLine] ?? {}

      if (Object.keys(currentStyle).length === 0) {
        previousStyle = {}
        continue
      }

      if (!ranges.length || !areMockStylesEqual({ left: previousStyle, right: currentStyle })) {
        ranges.push({
          start: charIndex,
          end: charIndex + 1,
          style: { ...currentStyle }
        })
      } else {
        ranges[ranges.length - 1].end += 1
      }

      previousStyle = currentStyle
    }

    charIndex += 1
    previousStyle = {}
  }

  return ranges
}

const stylesFromArray = (styles: MockTextStyleRange[] | MockTextStyles | undefined, text = ''): MockTextStyles => {
  if (!styles) return {}

  if (!Array.isArray(styles)) {
    return cloneMockStyles(styles)
  }

  const lines = text.split('\n')
  const stylesObject: MockTextStyles = {}
  let globalCharIndex = -1
  let rangeIndex = 0

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? ''

    for (let charIndexInLine = 0; charIndexInLine < line.length; charIndexInLine += 1) {
      globalCharIndex += 1

      while (styles[rangeIndex] && styles[rangeIndex].end <= globalCharIndex) {
        rangeIndex += 1
      }

      const currentRange = styles[rangeIndex]
      if (!currentRange) continue
      if (currentRange.start > globalCharIndex || globalCharIndex >= currentRange.end) continue

      if (!stylesObject[lineIndex]) {
        stylesObject[lineIndex] = {}
      }

      stylesObject[lineIndex][charIndexInLine] = { ...currentRange.style }
    }

    globalCharIndex += 1
  }

  return stylesObject
}

export const controlsUtils = {
  createObjectDefaultControls: jest.fn(() => ({})),
  createTextboxDefaultControls: jest.fn(() => ({})),
  wrapWithFireEvent: jest.fn((_eventName: string, handler: unknown) => handler),
  wrapWithFixedAnchor: jest.fn((handler: unknown) => handler),
  scalingEqually: jest.fn(() => true),
  getLocalPoint: jest.fn((_transform, _originX, _originY, x: number, y: number) => new Point(x, y))
}

export class Gradient {
  type: string

  gradientUnits: string

  coords: any

  colorStops: any[]

  constructor(public options: any = {}) {
    this.type = options.type || 'linear'
    this.gradientUnits = options.gradientUnits || 'percentage'
    this.coords = options.coords || {}
    this.colorStops = options.colorStops || []
    Object.assign(this, options)
  }
}

export class FabricImage {
  type = 'image'

  constructor(public options: any = {}) {
    Object.assign(this, options)
  }

  set(key: string | Record<string, any>, value?: any) {
    if (typeof key === 'string') {
      (this as any)[key] = value
      return
    }
    Object.assign(this, key)
  }

  getElement(): HTMLImageElement | HTMLCanvasElement {
    const element = (this as any).element
    if (element) return element

    const img = new Image()
    img.src = (this as any).src || ''
    return img
  }

  static fromURL(url: string, options?: any): Promise<FabricImage> {
    return Promise.resolve(new FabricImage({
      src: url,
      type: 'image',
      ...options
    }))
  }
}

export interface CanvasOptions {
  // Keep it open for tests; real types are not required here
  [key: string]: any
}

export class Color {
  private r: number

  private g: number

  private b: number

  private a = 1

  constructor(value: string) {
    if (!/^#?[0-9a-f]{6}$/i.test(value)) {
      throw new Error('Invalid color')
    }
    const hex = value.replace('#', '')
    this.r = parseInt(hex.slice(0, 2), 16)
    this.g = parseInt(hex.slice(2, 4), 16)
    this.b = parseInt(hex.slice(4, 6), 16)
  }

  setAlpha(alpha: number) {
    this.a = alpha
  }

  toRgba() {
    return `rgba(${this.r},${this.g},${this.b},${this.a})`
  }
}

const registry = new Map<string, any>()

export const classRegistry = {
  setClass(Cls: any, name?: string) {
    registry.set(name ?? Cls?.type ?? Cls?.name, Cls)
  },
  getClass(name: string) {
    return registry.get(name)
  }
}

export const util = {
  enlivenObjects: async(objects: any[]) => objects.map((obj) => {
    const Cls = classRegistry.getClass(obj.type)
    if (!Cls) return obj

    const normalizedObject = {
      ...obj,
      styles: stylesFromArray(obj.styles, obj.text ?? '')
    }

    return new Cls(normalizedObject.text ?? '', normalizedObject)
  }),
  enlivenObjectEnlivables: async(options: any) => options,
  groupSVGElements: jest.fn((objects: any[], options: any = {}) => new Group(objects, options)),
  stylesFromArray,
  stylesToArray
}

export const loadSVGFromURL = jest.fn(async(_url: string) => ({
  objects: [],
  options: {}
}))

export const loadSVGFromString = jest.fn(async(_svg: string) => ({
  objects: [],
  options: {}
}))

export default {
  Canvas,
  Pattern,
  Rect,
  Circle,
  Triangle,
  Ellipse,
  Path,
  Polygon,
  Polyline,
  ActiveSelection,
  Group,
  FabricObject,
  FabricImage,
  Gradient,
  Textbox,
  FitContentLayout,
  InteractiveFabricObject,
  controlsUtils,
  Color,
  classRegistry,
  util,
  loadSVGFromURL,
  loadSVGFromString
}
