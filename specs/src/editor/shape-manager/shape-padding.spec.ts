import {
  getShapePaddingChangeMap,
  mergeShapePadding,
  normalizeShapeLayoutPadding,
  normalizeShapeUserPadding,
  resolveShapeStrokeTextInset,
  resolveShapeTextContentInset,
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

  it('без видимой обводки не добавляет внутренний отступ для текста', () => {
    const padding = resolveShapeStrokeTextInset({
      stroke: '#00ff00',
      strokeWidth: 0
    })

    expect(padding).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    })
  })

  it('видимая обводка добавляет внутренний отступ по всем сторонам', () => {
    const padding = resolveShapeStrokeTextInset({
      stroke: '#00ff00',
      strokeWidth: 6
    })

    expect(padding).toEqual({
      top: 6,
      right: 6,
      bottom: 6,
      left: 6
    })
  })

  it('нулевая обводка не меняет внутренний отступ формы', () => {
    const padding = resolveShapeTextContentInset({
      baseInset: {
        top: 24,
        right: 48,
        bottom: 24,
        left: 48
      },
      stroke: '#00ff00',
      strokeWidth: 0
    })

    expect(padding).toEqual({
      top: 24,
      right: 48,
      bottom: 24,
      left: 48
    })
  })

  it('складывает внутренний отступ формы и обводку в один внутренний отступ текста', () => {
    const padding = resolveShapeTextContentInset({
      baseInset: {
        top: 24,
        right: 48,
        bottom: 24,
        left: 48
      },
      stroke: '#00ff00',
      strokeWidth: 10
    })

    expect(padding).toEqual({
      top: 34,
      right: 58,
      bottom: 34,
      left: 58
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
