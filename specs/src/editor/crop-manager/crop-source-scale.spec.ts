import {
  resolveCropProportionalSourceScaleLimit,
  resolveCropSourceAxisScaleLimit
} from '../../../../src/editor/crop-manager/domain/crop-source-scale'

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
})
