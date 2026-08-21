import {
  resolveCropProportionalSourceScaleLimit,
  resolveCropSourceScaleAnchor,
  resolveCropSourceAxisScaleLimit
} from '../../../../src/editor/crop-manager/domain/crop-source-scale'

/** Реальные Fabric origins и неподвижные стороны для всех ручек crop-области. */
const CROP_CONTROL_ANCHOR_CASES = [
  {
    title: 'левой верхней ручки',
    corner: 'tl',
    originX: 'right',
    originY: 'bottom',
    anchorX: 'max',
    anchorY: 'max',
    anchorAfterFlipX: 'min',
    anchorAfterFlipY: 'min'
  },
  {
    title: 'правой верхней ручки',
    corner: 'tr',
    originX: 'left',
    originY: 'bottom',
    anchorX: 'min',
    anchorY: 'max',
    anchorAfterFlipX: 'max',
    anchorAfterFlipY: 'min'
  },
  {
    title: 'левой нижней ручки',
    corner: 'bl',
    originX: 'right',
    originY: 'top',
    anchorX: 'max',
    anchorY: 'min',
    anchorAfterFlipX: 'min',
    anchorAfterFlipY: 'max'
  },
  {
    title: 'правой нижней ручки',
    corner: 'br',
    originX: 'left',
    originY: 'top',
    anchorX: 'min',
    anchorY: 'min',
    anchorAfterFlipX: 'max',
    anchorAfterFlipY: 'max'
  },
  {
    title: 'левой боковой ручки',
    corner: 'ml',
    originX: 'right',
    originY: 'center',
    anchorX: 'max',
    anchorY: 'center',
    anchorAfterFlipX: 'min',
    anchorAfterFlipY: 'center'
  },
  {
    title: 'правой боковой ручки',
    corner: 'mr',
    originX: 'left',
    originY: 'center',
    anchorX: 'min',
    anchorY: 'center',
    anchorAfterFlipX: 'max',
    anchorAfterFlipY: 'center'
  },
  {
    title: 'верхней боковой ручки',
    corner: 'mt',
    originX: 'center',
    originY: 'bottom',
    anchorX: 'center',
    anchorY: 'max',
    anchorAfterFlipX: 'center',
    anchorAfterFlipY: 'min'
  },
  {
    title: 'нижней боковой ручки',
    corner: 'mb',
    originX: 'center',
    originY: 'top',
    anchorX: 'center',
    anchorY: 'min',
    anchorAfterFlipX: 'center',
    anchorAfterFlipY: 'max'
  }
] as const

describe('неподвижная сторона crop resize в координатах source', () => {
  it.each(CROP_CONTROL_ANCHOR_CASES)('для $title учитывает флип только по его оси', ({
    corner,
    originX,
    originY,
    anchorX,
    anchorY,
    anchorAfterFlipX,
    anchorAfterFlipY
  }) => {
    const transform = {
      corner,
      originX,
      originY
    } as const
    const regularAnchorX = resolveCropSourceScaleAnchor({
      source: { flipX: false, flipY: false },
      transform,
      axis: 'x'
    })
    const regularAnchorY = resolveCropSourceScaleAnchor({
      source: { flipX: false, flipY: false },
      transform,
      axis: 'y'
    })
    const horizontalFlipAnchorX = resolveCropSourceScaleAnchor({
      source: { flipX: true, flipY: false },
      transform,
      axis: 'x'
    })
    const horizontalFlipAnchorY = resolveCropSourceScaleAnchor({
      source: { flipX: true, flipY: false },
      transform,
      axis: 'y'
    })
    const verticalFlipAnchorX = resolveCropSourceScaleAnchor({
      source: { flipX: false, flipY: true },
      transform,
      axis: 'x'
    })
    const verticalFlipAnchorY = resolveCropSourceScaleAnchor({
      source: { flipX: false, flipY: true },
      transform,
      axis: 'y'
    })

    expect(regularAnchorX).toBe(anchorX)
    expect(regularAnchorY).toBe(anchorY)
    expect(horizontalFlipAnchorX).toBe(anchorAfterFlipX)
    expect(horizontalFlipAnchorY).toBe(anchorY)
    expect(verticalFlipAnchorX).toBe(anchorX)
    expect(verticalFlipAnchorY).toBe(anchorAfterFlipY)
  })

  it('для реальной угловой ручки сохраняет центр после флипа при скейлинге от центра', () => {
    const transform = {
      corner: 'tr',
      originX: 'center',
      originY: 'center'
    } as const

    expect(resolveCropSourceScaleAnchor({ source: null, transform, axis: 'x' })).toBe('center')
    expect(resolveCropSourceScaleAnchor({ source: null, transform, axis: 'y' })).toBe('center')
    expect(resolveCropSourceScaleAnchor({
      source: { flipX: true, flipY: true }, transform, axis: 'x'
    })).toBe('center')
    expect(resolveCropSourceScaleAnchor({
      source: { flipX: true, flipY: true }, transform, axis: 'y'
    })).toBe('center')
  })
})

describe('ограничение proportional scale внутри source', () => {
  it('ограничивает рост сверху фиксированным нижним краем source', () => {
    const scale = resolveCropProportionalSourceScaleLimit({
      sourceSize: {
        width: 1000,
        height: 667
      },
      startRect: {
        left: -150,
        top: -150,
        width: 300,
        height: 300
      },
      anchorX: 'center',
      anchorY: 'max'
    })

    expect(scale).toBeCloseTo(483.5 / 300, 5)
    expect(300 * scale).toBeCloseTo(483.5, 5)
  })

  it('не даёт квадрату вырасти шире source-высоты при горизонтальном скейлинге', () => {
    const scale = resolveCropProportionalSourceScaleLimit({
      sourceSize: {
        width: 1000,
        height: 667
      },
      startRect: {
        left: -450,
        top: -25,
        width: 50,
        height: 50
      },
      anchorX: 'min',
      anchorY: 'center'
    })

    expect(scale).toBeCloseTo(667 / 50, 5)
    expect(scale).toBeLessThan(950 / 50)
  })

  it('для скейлинга по диагонали выбирает ближайшую source-границу', () => {
    const scale = resolveCropProportionalSourceScaleLimit({
      sourceSize: {
        width: 1000,
        height: 667
      },
      startRect: {
        left: -150,
        top: -150,
        width: 300,
        height: 300
      },
      anchorX: 'min',
      anchorY: 'max'
    })

    expect(scale).toBeCloseTo(483.5 / 300, 5)
    expect(scale).toBeLessThan(650 / 300)
  })

  it('возвращает 1, если frame уже почти упёрся в source', () => {
    const scale = resolveCropProportionalSourceScaleLimit({
      sourceSize: {
        width: 1000,
        height: 667
      },
      startRect: {
        left: -333,
        top: -333,
        width: 666,
        height: 666
      },
      anchorX: 'center',
      anchorY: 'center'
    })

    expect(scale).toBe(1)
    expect(scale).toBeLessThan(667 / 666)
  })

  it('не разрешает рост, если source-rect уже занял всю высоту source', () => {
    const scale = resolveCropProportionalSourceScaleLimit({
      sourceSize: {
        width: 1000,
        height: 667
      },
      startRect: {
        left: -333.5,
        top: -333.5,
        width: 667,
        height: 667
      },
      anchorX: 'center',
      anchorY: 'center'
    })

    expect(scale).toBe(1)
    expect(667 * scale).toBe(667)
  })

  it('не разрешает рост, если source-rect уже занял всю ширину source', () => {
    const scale = resolveCropProportionalSourceScaleLimit({
      sourceSize: {
        width: 1000,
        height: 667
      },
      startRect: {
        left: -500,
        top: -100,
        width: 1000,
        height: 200
      },
      anchorX: 'center',
      anchorY: 'center'
    })

    expect(scale).toBe(1)
    expect(1000 * scale).toBe(1000)
  })
})

describe('ограничение независимого axis scale внутри source', () => {
  it('ограничивает свободный рост сверху фиксированным нижним краем source', () => {
    const scale = resolveCropSourceAxisScaleLimit({
      sourceSize: {
        width: 1000,
        height: 667
      },
      startRect: {
        left: -255.5,
        top: -151,
        width: 511,
        height: 302
      },
      axis: 'y',
      anchor: 'max'
    })

    expect(scale).toBeCloseTo(484.5 / 302, 5)
    expect(302 * scale).toBeCloseTo(484.5, 5)
  })

  it('не ограничивает свободный рост горизонтальной оси высотой source', () => {
    const scale = resolveCropSourceAxisScaleLimit({
      sourceSize: {
        width: 1000,
        height: 667
      },
      startRect: {
        left: -150,
        top: -333.5,
        width: 300,
        height: 667
      },
      axis: 'x',
      anchor: 'center'
    })

    expect(scale).toBeCloseTo(1000 / 300, 5)
    expect(scale).toBeGreaterThan(1)
  })

  it('считает почти прижатую к левой границе область стоящей на source-границе при растягивании вправо', () => {
    const startWidth = 833
    const scale = resolveCropSourceAxisScaleLimit({
      sourceSize: {
        width: 1000,
        height: 667
      },
      startRect: {
        left: -499.4,
        top: -333.5,
        width: startWidth,
        height: 667
      },
      axis: 'x',
      anchor: 'min'
    })

    expect(startWidth * scale).toBeCloseTo(1000, 5)
    expect(scale).toBeGreaterThan(1)
  })
})
