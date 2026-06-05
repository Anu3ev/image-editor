import type { Transform } from 'fabric'

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

/** Source bounds прямоугольного изображения 1000x667 после scale 0.512 и округления source guides. */
const RECTANGULAR_SOURCE_BOUNDS = {
  left: 0,
  top: 0,
  right: 512,
  bottom: 342,
  centerX: 256,
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

  it('для crop frame с размером в source-пикселях округляет половину нечётного source вверх', () => {
    const target = createSourceScaledRect({
      width: 667,
      height: 667,
      scaleX: 0.256,
      scaleY: 0.256,
      sourceScaleX: 0.512,
      sourceScaleY: 0.512,
      sourceBounds: SOURCE_BOUNDS
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

    expect(displaySize.width).toBe(334)
    expect(displaySize.height).toBe(334)
    expect(target.scaleX).toBeCloseTo(0.256, 6)
    expect(target.scaleY).toBeCloseTo(0.256, 6)
  })

  it('для прямоугольного crop frame у внутреннего guide оставляет raw-размер на guide', () => {
    const target = createSourceScaledRect({
      width: 1000,
      height: 667,
      scaleX: 0.256,
      scaleY: 0.256,
      sourceScaleX: 0.512,
      sourceScaleY: 0.512,
      sourceBounds: RECTANGULAR_SOURCE_BOUNDS
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

    expect(displaySize.width).toBe(500)
    expect(displaySize.height).toBe(334)
    expect(target.scaleX).toBeCloseTo(0.256, 6)
    expect(target.scaleY).toBeCloseTo(0.256, 6)
  })

  it('для прямоугольного crop frame у source-границы не оставляет raw-размер на 1 пиксель меньше', () => {
    const rawScale = 0.25566
    const fixedRight = 256
    const target = createSourceScaledRect({
      width: 1000,
      height: 667,
      scaleX: rawScale,
      scaleY: rawScale,
      sourceScaleX: 0.512,
      sourceScaleY: 0.512,
      left: fixedRight - (1000 * rawScale),
      top: 195,
      sourceBounds: RECTANGULAR_SOURCE_BOUNDS
    })

    applyScalingStep({
      target,
      preservePlacement: {
        placement: {
          left: target.left ?? 0,
          top: target.top ?? 0,
          originX: 'left',
          originY: 'top'
        },
        applyPlacement: () => {
          target.set({
            left: fixedRight - (1000 * Math.abs(target.scaleX ?? 1))
          })
          target.setCoords()
        }
      },
      snapGuards: [
        {
          type: 'vertical',
          edge: 'left',
          position: RECTANGULAR_SOURCE_BOUNDS.left
        }
      ]
    })

    const displaySize = getRoundedDisplaySize({ target })

    expect(displaySize.width).toBe(500)
    expect(displaySize.height).toBe(334)
    expect(target.scaleX).toBeCloseTo(0.256, 6)
    expect(target.scaleY).toBeCloseTo(0.256, 6)
  })

  it('для source-scaled crop frame у внутренних guide возвращает scale со старта transform', () => {
    const rawScale = 0.21959820089955023
    const originalScale = 0.22030584707646178
    const target = createSourceScaledRect({
      width: 1000,
      height: 667,
      scaleX: rawScale,
      scaleY: rawScale,
      sourceScaleX: 0.512,
      sourceScaleY: 0.512,
      left: 256 - (1000 * rawScale),
      top: 195,
      sourceBounds: RECTANGULAR_SOURCE_BOUNDS
    })
    const transform = {
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      original: {
        scaleX: originalScale,
        scaleY: originalScale
      }
    } as Transform

    applyScalingStep({
      target,
      transform,
      snapGuards: [
        {
          type: 'vertical',
          edge: 'right',
          position: 256
        },
        {
          type: 'horizontal',
          edge: 'top',
          position: 195
        }
      ]
    })

    const displaySize = getRoundedDisplaySize({ target })

    expect(displaySize.width).toBe(430)
    expect(displaySize.height).toBe(287)
    expect(target.scaleX).toBeCloseTo(originalScale, 6)
    expect(transform.scaleX).toBeCloseTo(originalScale, 6)
  })

  it('для source-scaled crop frame у внутренних guide не возвращает исходный scale при переходе на следующий source-пиксель', () => {
    const rawScale = 0.21959820089955023
    const originalScale = 0.22030584707646178
    const nextSourcePixelGuidePosition = 219.5
    const target = createSourceScaledRect({
      width: 1000,
      height: 667,
      scaleX: rawScale,
      scaleY: rawScale,
      sourceScaleX: 0.512,
      sourceScaleY: 0.512,
      left: nextSourcePixelGuidePosition - (1000 * rawScale),
      top: 195,
      sourceBounds: RECTANGULAR_SOURCE_BOUNDS
    })
    const transform = {
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      original: {
        scaleX: originalScale,
        scaleY: originalScale
      }
    } as Transform

    applyScalingStep({
      target,
      transform,
      snapGuards: [
        {
          type: 'vertical',
          edge: 'right',
          position: nextSourcePixelGuidePosition
        },
        {
          type: 'horizontal',
          edge: 'top',
          position: 195
        }
      ]
    })

    const displaySize = getRoundedDisplaySize({ target })

    expect(displaySize.width).toBe(429)
    expect(displaySize.height).toBe(286)
    expect(target.scaleX).not.toBeCloseTo(originalScale, 6)
    expect(transform.scaleX).not.toBeCloseTo(originalScale, 6)
  })
})
