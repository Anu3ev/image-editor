import {
  getShapePaddingChangeMap,
  mergeShapePadding,
  normalizeShapeLayoutPadding,
  normalizeShapeUserPadding,
  sumShapePadding
} from '../../../../src/editor/shape-manager/layout/shape-padding'

describe('shape-padding', () => {
  it('оставляет внутренний отступ формы в дробных пикселях', () => {
    const padding = normalizeShapeLayoutPadding({
      padding: {
        top: 0.24,
        right: 12.8,
        bottom: -5,
        left: undefined
      }
    })

    expect(padding).toEqual({
      top: 0.24,
      right: 12.8,
      bottom: 0,
      left: 0
    })
  })

  it('приводит пользовательские отступы к неотрицательным целым пикселям', () => {
    const padding = normalizeShapeUserPadding({
      padding: {
        top: 10.9,
        right: -3,
        bottom: Number.NaN,
        left: 4.1
      }
    })

    expect(padding).toEqual({
      top: 10,
      right: 0,
      bottom: 0,
      left: 4
    })
  })

  it('при изменении одной стороны оставляет остальные как были', () => {
    const padding = mergeShapePadding({
      base: {
        top: 2,
        right: 4,
        bottom: 6,
        left: 8
      },
      override: {
        right: 19.7
      }
    })

    expect(padding).toEqual({
      top: 2,
      right: 19,
      bottom: 6,
      left: 8
    })
  })

  it('складывает внутренний отступ формы и пользовательский отступ по сторонам', () => {
    const padding = sumShapePadding({
      base: {
        top: 0.24,
        right: 24,
        bottom: 0.24,
        left: 24
      },
      addition: {
        top: 10,
        right: 5,
        bottom: 10,
        left: 5
      }
    })

    expect(padding).toEqual({
      top: 10.24,
      right: 29,
      bottom: 10.24,
      left: 29
    })
  })

  it('помечает изменёнными только явно переданные стороны', () => {
    const changedPadding = getShapePaddingChangeMap({
      padding: {
        top: 0,
        right: undefined,
        left: 12
      }
    })

    expect(changedPadding).toEqual({
      top: true,
      left: true
    })
  })
})
