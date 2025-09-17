// Minimal manual mock for fabric to be used in tests via moduleNameMapper.
// We don't emulate full FabricJS, only the pieces the tests interact with.

export class Canvas {
  public clipPath: any = null
  public dispose = jest.fn()

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

export class FabricObject {
  constructor(public options: any = {}) {
    Object.assign(this, options)
  }
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

export default { Canvas, Pattern, Rect, ActiveSelection, FabricObject, FabricImage, Gradient }
