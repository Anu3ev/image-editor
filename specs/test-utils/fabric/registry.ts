import { Point, Textbox } from 'fabric'

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
