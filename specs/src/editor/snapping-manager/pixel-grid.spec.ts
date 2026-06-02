import { applyScalingStep } from '../../../../src/editor/snapping-manager/pixel-grid'
import {
  createSourceScaledRect,
  getRoundedDisplaySize
} from '../../../test-utils/shared/pixel-grid'

describe('SnappingManager pixel-grid contract', () => {
  it('для source-size crop frame оставляет размер внутри guide вместо округления вверх', () => {
    const target = createSourceScaledRect({
      width: 667,
      height: 667,
      scaleX: 0.256,
      scaleY: 0.256,
      sourceScaleX: 0.512,
      sourceScaleY: 0.512
    })

    applyScalingStep({
      target,
      snapGuards: [
        {
          type: 'horizontal',
          edge: 'bottom',
          position: 171
        }
      ]
    })

    const displaySize = getRoundedDisplaySize({ target })

    expect(displaySize.width).toBe(333)
    expect(displaySize.height).toBe(333)
    expect(target.scaleX).toBeCloseTo(0.255616, 6)
    expect(target.scaleY).toBeCloseTo(0.255616, 6)
  })
})
