import {
  normalizeShapeRounding,
  resolveShapeRoundingRatio
} from '../../../../src/editor/shape-manager/shape-rounding'

describe('shape-rounding', () => {
  it('normalizeShapeRounding ограничивает значение диапазоном от 0 до 100', () => {
    expect(normalizeShapeRounding({
      rounding: -10
    })).toBe(0)

    expect(normalizeShapeRounding({
      rounding: 42
    })).toBe(42)

    expect(normalizeShapeRounding({
      rounding: 999999
    })).toBe(100)
  })

  it('resolveShapeRoundingRatio считает коэффициент из уже нормализованного значения', () => {
    expect(resolveShapeRoundingRatio({
      rounding: -10
    })).toBe(0)

    expect(resolveShapeRoundingRatio({
      rounding: 25
    })).toBe(0.25)

    expect(resolveShapeRoundingRatio({
      rounding: 999999
    })).toBe(1)
  })
})
