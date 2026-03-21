import {
  resolveDisplayDistance,
  resolveCommonDisplayDistance,
  MAX_DISPLAY_DISTANCE_DIFF
} from '../../../../src/editor/utils/distance'

describe('resolveDisplayDistance', () => {
  it('округляет дробные расстояния до ближайшего целого', () => {
    expect(resolveDisplayDistance({ distance: 43.999999 })).toBe(44)
    expect(resolveDisplayDistance({ distance: 43.000001 })).toBe(43)
  })

  it('округляет 0.5 вверх', () => {
    expect(resolveDisplayDistance({ distance: 26.5 })).toBe(27)
    expect(resolveDisplayDistance({ distance: 26.49 })).toBe(26)
  })

  it('возвращает 0 для отрицательных и невалидных значений', () => {
    expect(resolveDisplayDistance({ distance: -5 })).toBe(0)
    expect(resolveDisplayDistance({ distance: Number.NaN })).toBe(0)
    expect(resolveDisplayDistance({ distance: Number.POSITIVE_INFINITY })).toBe(0)
  })

  it('возвращает 0 для нулевого расстояния', () => {
    expect(resolveDisplayDistance({ distance: 0 })).toBe(0)
  })

  it('корректно округляет большие числа', () => {
    expect(resolveDisplayDistance({ distance: 1000.7 })).toBe(1001)
    expect(resolveDisplayDistance({ distance: 1000.3 })).toBe(1000)
  })
})

describe('resolveCommonDisplayDistance', () => {
  it('возвращает одинаковые display-значения для одинаковых расстояний', () => {
    const result = resolveCommonDisplayDistance({
      firstDistance: 25,
      secondDistance: 25
    })

    expect(result.firstDisplayDistance).toBe(25)
    expect(result.secondDisplayDistance).toBe(25)
    expect(result.displayDistanceDiff).toBe(0)
    expect(result.commonDisplayDistance).toBe(25)
  })

  it('определяет displayDistanceDiff для расстояний, отличающихся на 1px после округления', () => {
    const result = resolveCommonDisplayDistance({
      firstDistance: 25.3,
      secondDistance: 25.7
    })

    expect(result.firstDisplayDistance).toBe(25)
    expect(result.secondDisplayDistance).toBe(26)
    expect(result.displayDistanceDiff).toBe(1)
  })

  it('определяет displayDistanceDiff > MAX_DISPLAY_DISTANCE_DIFF для далёких расстояний', () => {
    const result = resolveCommonDisplayDistance({
      firstDistance: 25,
      secondDistance: 27
    })

    expect(result.displayDistanceDiff).toBeGreaterThan(MAX_DISPLAY_DISTANCE_DIFF)
  })

  it('возвращает максимальное из двух значений как commonDisplayDistance', () => {
    const result = resolveCommonDisplayDistance({
      firstDistance: 10.3,
      secondDistance: 11.7
    })

    expect(result.commonDisplayDistance).toBe(Math.max(
      result.firstDisplayDistance,
      result.secondDisplayDistance
    ))
  })
})
