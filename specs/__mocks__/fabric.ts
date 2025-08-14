// Minimal manual mock for fabric to be used in tests via moduleNameMapper.
// We don't emulate full FabricJS, only the pieces the tests interact with.

export class Canvas {
  public clipPath: any = null
  public fire = jest.fn()
  public dispose = jest.fn()

  constructor(public el: any, public options: any) {}
}

export class Pattern {
  constructor(public options: any) {}
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

export interface CanvasOptions {
  // Keep it open for tests; real types are not required here
  [key: string]: any
}

export default { Canvas, Pattern, Rect }
