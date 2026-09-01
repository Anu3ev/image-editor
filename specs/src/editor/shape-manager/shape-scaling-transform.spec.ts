import type { Transform } from 'fabric'
import { resolveShapeScaleActionAxes } from '../../../../src/editor/shape-manager/scaling/shape-scaling-transform'

describe('определение осей скейлинга шейпа', () => {
  it('не считает наклон за боковую ручку скейлинга', () => {
    const horizontalSkew = resolveShapeScaleActionAxes({
      transform: { action: 'skewY', corner: 'mr' } as Transform
    })
    const verticalSkew = resolveShapeScaleActionAxes({
      transform: { action: 'skewX', corner: 'mt' } as Transform
    })

    expect(horizontalSkew.canScaleWidth).toBe(false)
    expect(horizontalSkew.canScaleHeight).toBe(false)
    expect(verticalSkew.canScaleWidth).toBe(false)
    expect(verticalSkew.canScaleHeight).toBe(false)
  })

  it('сохраняет обычные оси боковых ручек', () => {
    const horizontalScale = resolveShapeScaleActionAxes({
      transform: { action: 'scaleX', corner: 'mr' } as Transform
    })
    const verticalScale = resolveShapeScaleActionAxes({
      transform: { action: 'scaleY', corner: 'mb' } as Transform
    })

    expect(horizontalScale.canScaleWidth).toBe(true)
    expect(horizontalScale.canScaleHeight).toBe(false)
    expect(verticalScale.canScaleWidth).toBe(false)
    expect(verticalScale.canScaleHeight).toBe(true)
  })
})
