// Minimal manual mock for fabric to be used in tests via moduleNameMapper.
// We don't emulate full FabricJS, only the pieces the tests interact with.

export class Canvas {
  public clipPath: any = null

  public dispose = jest.fn()

  public on = jest.fn()

  public off = jest.fn()

  public add = jest.fn()

  public centerObject = jest.fn()

  public setActiveObject = jest.fn()

  public getActiveObject = jest.fn().mockReturnValue(null)

  public requestRenderAll = jest.fn()

  constructor(public el: any, public options: any) {}

  // Define as prototype method to allow spying via jest.spyOn(Canvas.prototype, 'fire')
  public fire(_event: any, _payload?: any) {
    // no-op in mock; jest will spy on prototype
  }
}

export class Pattern {
  constructor(public options: any) {}
}

export class Point {
  constructor(public x: number, public y: number) {}

  scalarAdd(value: number) {
    return new Point(this.x + value, this.y + value)
  }
}

export class Rect {
  private props: Record<string, any>

  constructor(options: Record<string, any>) {
    this.props = { ...options }
  }

  get(key: string) {
    return this.props[key]
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

  set(props: any) {
    Object.assign(this, props)
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

  _objects: any[] = []

  constructor(objects: any[] = [], public options: any = {}) {
    this._objects = objects
    Object.assign(this, options)
  }

  getObjects() {
    return this._objects
  }

  removeAll() {
    const objects = [...this._objects]
    this._objects = []
    return objects
  }

  set(props: any) {
    Object.assign(this, props)
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

export const controlsUtils = {
  createObjectDefaultControls: jest.fn(() => ({})),
  createTextboxDefaultControls: jest.fn(() => ({}))
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

  set(props: any) {
    Object.assign(this, props)
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
    return Cls ? new Cls(obj.text ?? '', obj) : obj
  })
}

export default {
  Canvas,
  Pattern,
  Rect,
  ActiveSelection,
  Group,
  FabricObject,
  FabricImage,
  Gradient,
  Textbox,
  InteractiveFabricObject,
  controlsUtils,
  Color,
  classRegistry,
  util
}
