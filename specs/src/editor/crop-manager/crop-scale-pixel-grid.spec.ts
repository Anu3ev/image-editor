import type { Transform } from 'fabric'

import { applyCropScalingStep } from '../../../../src/editor/crop-manager/snapping/crop-scale-pixel-grid'
import {
  createSourceScaledCropFrame,
  getRoundedDisplaySize,
  SOURCE_BOUNDS,
  RECTANGULAR_SOURCE_BOUNDS,
  SOURCE_BOUNDARY_GUIDE_CASES
} from '../../../test-utils/crop/pixel-grid'

describe('Округление crop в пикселях источника', () => {
  for (const cropCase of SOURCE_BOUNDARY_GUIDE_CASES) {
    it(`для crop frame с размером в source-пикселях у ${cropCase.title} удерживает размер на guide`, () => {
      const target = createSourceScaledCropFrame({
        width: 667,
        height: 667,
        scaleX: 0.5112,
        scaleY: 0.5112,
        sourceScaleX: 0.512,
        sourceScaleY: 0.512,
        sourceBounds: SOURCE_BOUNDS
      })

      applyCropScalingStep({
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
    const target = createSourceScaledCropFrame({
      width: 667,
      height: 667,
      scaleX: 0.256,
      scaleY: 0.256,
      sourceScaleX: 0.512,
      sourceScaleY: 0.512,
      sourceBounds: SOURCE_BOUNDS
    })

    applyCropScalingStep({
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
    const target = createSourceScaledCropFrame({
      width: 1000,
      height: 667,
      scaleX: 0.256,
      scaleY: 0.256,
      sourceScaleX: 0.512,
      sourceScaleY: 0.512,
      sourceBounds: RECTANGULAR_SOURCE_BOUNDS
    })

    applyCropScalingStep({
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
    const target = createSourceScaledCropFrame({
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

    applyCropScalingStep({
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
    const target = createSourceScaledCropFrame({
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

    applyCropScalingStep({
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
    const target = createSourceScaledCropFrame({
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

    applyCropScalingStep({
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

  it('для свободного crop frame не уводит верхнюю сторону с guide при округлении scale', () => {
    const rawScaleY = 255.752 / 512
    const fixedBottom = 512
    const target = createSourceScaledCropFrame({
      width: 512,
      height: 512,
      scaleX: 0.5,
      scaleY: rawScaleY,
      sourceScaleX: 1,
      sourceScaleY: 1,
      left: 0,
      top: fixedBottom - (512 * rawScaleY)
    })

    applyCropScalingStep({
      target,
      preservePlacement: {
        placement: {
          left: 0,
          top: fixedBottom,
          originX: 'left',
          originY: 'bottom'
        },
        applyPlacement: () => {
          target.set({
            left: 0,
            top: fixedBottom - (512 * Math.abs(target.scaleY ?? 1))
          })
          target.setCoords()
        }
      },
      snapGuards: [
        {
          type: 'vertical',
          edge: 'right',
          position: 256
        },
        {
          type: 'horizontal',
          edge: 'top',
          position: 256.248
        }
      ]
    })

    const displaySize = getRoundedDisplaySize({ target })
    const bounds = target.getObjectSnappingBounds()

    expect(displaySize.width).toBe(256)
    expect(displaySize.height).toBe(256)
    expect(bounds.top).toBeCloseTo(256.248, 6)
    expect(target.scaleX).toBeCloseTo(0.5, 6)
    expect(target.scaleY).toBeCloseTo(rawScaleY, 6)
  })
})
