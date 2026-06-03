import { applyScalingStep } from '../../../../src/editor/snapping-manager/pixel-grid'
import {
  createSourceScaledRect,
  getRoundedDisplaySize
} from '../../../test-utils/shared/pixel-grid'

/** Source bounds тестового изображения после пересчёта в scene-пиксели. */
const SOURCE_BOUNDS = {
  left: 0,
  top: 0,
  right: 342,
  bottom: 342,
  centerX: 171,
  centerY: 171
} as const

/** Внешние source-границы, которые test fixture может проверить без отдельной placement-модели. */
const SOURCE_BOUNDARY_GUIDE_CASES = [
  {
    title: 'нижней границы source',
    snapGuard: {
      type: 'horizontal',
      edge: 'bottom',
      position: SOURCE_BOUNDS.bottom
    }
  },
  {
    title: 'правой границы source',
    snapGuard: {
      type: 'vertical',
      edge: 'right',
      position: SOURCE_BOUNDS.right
    }
  }
] as const

describe('SnappingManager pixel-grid contract', () => {
  for (const cropCase of SOURCE_BOUNDARY_GUIDE_CASES) {
    it(`для crop frame с размером в source-пикселях у ${cropCase.title} удерживает размер на guide`, () => {
      const target = createSourceScaledRect({
        width: 667,
        height: 667,
        scaleX: 0.5112,
        scaleY: 0.5112,
        sourceScaleX: 0.512,
        sourceScaleY: 0.512,
        sourceBounds: SOURCE_BOUNDS
      })

      applyScalingStep({
        target,
        snapGuards: [
          cropCase.snapGuard
        ]
      })

      const displaySize = getRoundedDisplaySize({ target })

      expect(displaySize.width).toBe(667)
      expect(displaySize.height).toBe(667)
      expect(target.scaleX).toBeCloseTo(0.512, 6)
      expect(target.scaleY).toBeCloseTo(0.512, 6)
    })
  }

  it('для crop frame с размером в source-пикселях оставляет размер внутри guide вместо округления вверх', () => {
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
