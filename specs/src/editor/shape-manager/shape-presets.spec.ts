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

  it('возвращает новые пресеты, добавленные из SVG-референсов', () => {
    expect(getShapePreset({ presetKey: 'pie' })?.key).toBe('pie')
    expect(getShapePreset({ presetKey: 'star-16' })?.key).toBe('star-16')
    expect(getShapePreset({ presetKey: 'arrow-left' })?.key).toBe('arrow-left')
    expect(getShapePreset({ presetKey: 'arrow-up' })?.key).toBe('arrow-up')
    expect(getShapePreset({ presetKey: 'arrow-down' })?.key).toBe('arrow-down')
    expect(getShapePreset({ presetKey: 'banner' })?.key).toBe('banner')
    expect(getShapePreset({ presetKey: 'ribbon' })?.key).toBe('ribbon')
  })

  it('сохраняет ожидаемые пропорции у новых стрелок, banner и ribbon', () => {
    const arrowUpPreset = getShapePreset({
      presetKey: 'arrow-up'
    })
    const arrowLeftPreset = getShapePreset({
      presetKey: 'arrow-left'
    })
    const bannerPreset = getShapePreset({
      presetKey: 'banner'
    })
    const ribbonPreset = getShapePreset({
      presetKey: 'ribbon'
    })

    if (!arrowUpPreset || !arrowLeftPreset || !bannerPreset || !ribbonPreset) {
      throw new Error('shape presets are required for this test')
    }

    expect(arrowUpPreset.width).toBe(140)
    expect(arrowUpPreset.height).toBe(180)
    expect(arrowLeftPreset.width).toBe(180)
    expect(arrowLeftPreset.height).toBe(140)
    expect(bannerPreset.width).toBe(180)
    expect(bannerPreset.height).toBe(120)
    expect(ribbonPreset.width).toBeCloseTo(127.0588, 4)
    expect(ribbonPreset.height).toBe(180)
  })

  it('считает асимметричный внутренний отступ для новых стрелок и banner', () => {
    const arrowUpPreset = getShapePreset({
      presetKey: 'arrow-up'
    })
    const bannerPreset = getShapePreset({
      presetKey: 'banner'
    })

    if (!arrowUpPreset || !bannerPreset) {
      throw new Error('shape presets are required for this test')
    }

    expect(resolveInternalShapeTextInset({
      preset: arrowUpPreset,
      width: 140,
      height: 180
    })).toEqual({
      top: 68.4,
      right: 28,
      bottom: 18,
      left: 28
    })

    const bannerInset = resolveInternalShapeTextInset({
      preset: bannerPreset,
      width: 180,
      height: 120
    })

    expect(bannerInset.top).toBe(16.8)
    expect(bannerInset.right).toBeCloseTo(46.8, 6)
    expect(bannerInset.bottom).toBe(16.8)
    expect(bannerInset.left).toBeCloseTo(21.6, 6)
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

  it('корректно определяет roundable для новых banner и pie', () => {
    const bannerPreset = getShapePreset({
      presetKey: 'banner'
    })
    const piePreset = getShapePreset({
      presetKey: 'pie'
    })

    if (!bannerPreset || !piePreset) {
      throw new Error('shape presets are required for this test')
    }

    expect(isShapePresetRoundable({
      preset: bannerPreset
    })).toBe(true)
    expect(isShapePresetRoundable({
      preset: piePreset
    })).toBe(false)
  })
})
