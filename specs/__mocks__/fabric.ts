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
  private objects: any[]
  constructor(objects: any[], options: any) {
    this.objects = objects || []
  }

  getObjects() {
    return this.objects
  }
}

export class FabricObject {
  constructor(public options: any = {}) {}
}

export interface CanvasOptions {
  // Keep it open for tests; real types are not required here
  [key: string]: any
}

export default { Canvas, Pattern, Rect, ActiveSelection, FabricObject }
