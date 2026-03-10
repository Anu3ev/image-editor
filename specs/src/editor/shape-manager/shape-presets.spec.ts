import {
  getShapePreset,
  isShapePresetRoundable,
  resolvePresetKeyForRounding,
  resolveShapePadding
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

  it('корректно объединяет preset padding и пользовательский override', () => {
    const preset = getShapePreset({
      presetKey: 'square'
    })

    if (!preset) {
      throw new Error('square preset is required for this test')
    }

    const padding = resolveShapePadding({
      preset,
      overridePadding: {
        left: 0.1,
        top: 0.05
      }
    })

    expect(padding).toEqual({
      top: 0.05,
      right: 0.2,
      bottom: 0.2,
      left: 0.1
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

