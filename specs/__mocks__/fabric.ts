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
    const clonedObjects = this.objects.map(obj => ({ ...obj }))
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
    const clonedObjects = this._objects.map(obj => ({ ...obj }))
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
}

export class InteractiveFabricObject extends FabricObject {}

export class Textbox extends FabricObject {
  public text?: string
  public id?: string
  public controls: Record<string, any> = {}
  public uppercase?: boolean
  public textCaseRaw?: string
  public fontSize?: number
  public width?: number
  public left?: number
  public dirty = false
  public isEditing = false
  public selectionStart = 0
  public selectionEnd = 0
  private charStyles: Record<number, Record<string, any>> = {}

  static ownDefaults: Record<string, any> = {}

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

  calcTextWidth() {
    return this.width ?? 0
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
      styles.push({ ...(this.charStyles[i] ?? {}) })
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
  controlsUtils
}
