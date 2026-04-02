import {
  getShapePreset,
  isShapePresetRoundable,
  resolvePresetKeyForRounding,
  resolveInternalShapeTextInset
} from '../../../../src/editor/shape-manager/shape-presets'

describe('shape-presets', () => {
  it('возвращает пресет по ключу', () => {
    const preset = getShapePreset({
      presetKey: 'circle'
    })

    expect(preset).not.toBeNull()
    expect(preset?.key).toBe('circle')
    expect(preset?.type).toBe('ellipse')
  })

  it('возвращает null для неизвестного ключа', () => {
    const preset = getShapePreset({
      presetKey: 'unknown-shape-key'
    })

    expect(preset).toBeNull()
  })

  it('для квадратной фигуры возвращает нулевой внутренний отступ', () => {
    const preset = getShapePreset({
      presetKey: 'square'
    })

    if (!preset) {
      throw new Error('square preset is required for this test')
    }

    const inset = resolveInternalShapeTextInset({
      preset,
      width: 180,
      height: 120
    })

    expect(inset).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    })
  })

  it('переводит внутренний отступ формы из пресета в пиксели', () => {
    const preset = getShapePreset({
      presetKey: 'circle'
    })

    if (!preset) {
      throw new Error('circle preset is required for this test')
    }

    const inset = resolveInternalShapeTextInset({
      preset,
      width: 200,
      height: 100
    })

    expect(inset).toEqual({
      top: 24,
      right: 48,
      bottom: 24,
      left: 48
    })
  })

  it('для rect скругление не меняет ключ пресета', () => {
    const preset = getShapePreset({
      presetKey: 'square'
    })

    if (!preset) {
      throw new Error('square preset is required for this test')
    }

    const presetKey = resolvePresetKeyForRounding({
      preset,
      rounding: 16
    })

    expect(presetKey).toBe('square')
  })

  it('корректно определяет roundable/non-roundable пресеты', () => {
    const squarePreset = getShapePreset({
      presetKey: 'square'
    })
    const circlePreset = getShapePreset({
      presetKey: 'circle'
    })
    const heartPreset = getShapePreset({
      presetKey: 'heart'
    })
    const badgePreset = getShapePreset({
      presetKey: 'badge'
    })

    if (!squarePreset || !circlePreset || !heartPreset || !badgePreset) {
      throw new Error('shape presets are required for this test')
    }

    expect(isShapePresetRoundable({
      preset: squarePreset
    })).toBe(true)

    expect(isShapePresetRoundable({
      preset: circlePreset
    })).toBe(false)

    expect(isShapePresetRoundable({
      preset: heartPreset
    })).toBe(false)

    expect(isShapePresetRoundable({
      preset: badgePreset
    })).toBe(true)
  })
})
