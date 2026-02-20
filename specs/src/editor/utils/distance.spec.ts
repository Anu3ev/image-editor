import { resolveDisplayDistance } from '../../../../src/editor/utils/distance'

describe('resolveDisplayDistance', () => {
  it('округляет дробные расстояния вниз для стабильного отображения', () => {
    expect(resolveDisplayDistance({ distance: 43.999999 })).toBe(44)
    expect(resolveDisplayDistance({ distance: 43.000001 })).toBe(43)
  })

  it('возвращает 0 для отрицательных и невалидных значений', () => {
    expect(resolveDisplayDistance({ distance: -5 })).toBe(0)
    expect(resolveDisplayDistance({ distance: Number.NaN })).toBe(0)
    expect(resolveDisplayDistance({ distance: Number.POSITIVE_INFINITY })).toBe(0)
  })
})
