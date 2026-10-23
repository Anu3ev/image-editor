import { Rect } from 'fabric'

import {
  resolveScaleAxisSnaps,
  resolveScaleUpdatePlan
} from '../../../../../src/editor/snapping-manager/scaling/legacy-scale-snapping'
import {
  createAxisSnapResult,
  createEmptyAxisSnapResult,
  createScalingBounds,
  findReferenceScaleX,
  getReferenceBoundsWidth
} from '../../../../test-utils/snapping/snapping-scaling'

describe('Прежний расчёт прилипания при скейлинге', () => {
  it('для правого верхнего control использует верхнюю грань для snap по высоте, даже если originY уже указывает на top', () => {
    const snapState = resolveScaleAxisSnaps({
      bounds: createScalingBounds({
        left: 0,
        top: 2,
        width: 512,
        height: 510
      }),
      corner: 'tr',
      originX: 'left',
      originY: 'top',
      shouldSnapX: true,
      shouldSnapY: true,
      threshold: 5,
      anchors: {
        vertical: [512],
        horizontal: [0]
      }
    })

    expect(snapState).not.toBeNull()
    if (!snapState) {
      throw new Error('Snap state для правого верхнего control должен существовать')
    }

    expect(snapState.verticalSnap.guidePosition).toBe(512)
    expect(snapState.horizontalSnap.guidePosition).toBe(0)
    expect(snapState.horizontalSnap.candidate).toEqual({
      edge: 'top',
      position: 2
    })
  })

  it('для левого нижнего control использует нижнюю грань для snap по высоте, даже если originY уже указывает на bottom', () => {
    const snapState = resolveScaleAxisSnaps({
      bounds: createScalingBounds({
        left: 2,
        top: 0,
        width: 510,
        height: 510
      }),
      corner: 'bl',
      originX: 'right',
      originY: 'bottom',
      shouldSnapX: true,
      shouldSnapY: true,
      threshold: 5,
      anchors: {
        vertical: [0],
        horizontal: [512]
      }
    })

    expect(snapState).not.toBeNull()
    if (!snapState) {
      throw new Error('Snap state для левого нижнего control должен существовать')
    }

    expect(snapState.verticalSnap.guidePosition).toBe(0)
    expect(snapState.horizontalSnap.guidePosition).toBe(512)
    expect(snapState.horizontalSnap.candidate).toEqual({
      edge: 'bottom',
      position: 510
    })
  })

  it('при vertical snap side-control пересчитывает обе scale-оси одним коэффициентом', () => {
    const plan = resolveScaleUpdatePlan({
      target: new Rect({ width: 100, height: 100, strokeWidth: 0 }),
      bounds: createScalingBounds({
        left: 10,
        top: 20,
        width: 100,
        height: 100
      }),
      originX: 'left',
      originY: 'bottom',
      scaleX: 1,
      scaleY: 1,
      shouldUseUniformScaleSnap: true,
      verticalSnap: createEmptyAxisSnapResult(),
      horizontalSnap: createAxisSnapResult({
        edge: 'top',
        position: 20,
        guidePosition: 40
      })
    })

    expect(plan).not.toBeNull()
    if (!plan) {
      throw new Error('Scale plan для vertical snap должен существовать')
    }

    expect(plan.guides).toEqual([
      {
        type: 'horizontal',
        position: 40
      }
    ])
    expect(plan.snapGuards).toEqual([
      {
        type: 'horizontal',
        edge: 'top',
        position: 40
      }
    ])
    expect(plan.nextScaleX).toBeCloseTo(0.8, 5)
    expect(plan.nextScaleY).toBeCloseTo(0.8, 5)
  })

  it('при horizontal snap side-control пересчитывает обе scale-оси одним коэффициентом', () => {
    const plan = resolveScaleUpdatePlan({
      target: new Rect({ width: 100, height: 100, strokeWidth: 0 }),
      bounds: createScalingBounds({
        left: 20,
        top: 10,
        width: 100,
        height: 100
      }),
      originX: 'right',
      originY: 'top',
      scaleX: 1,
      scaleY: 1,
      shouldUseUniformScaleSnap: true,
      verticalSnap: createAxisSnapResult({
        edge: 'left',
        position: 20,
        guidePosition: 40
      }),
      horizontalSnap: createEmptyAxisSnapResult()
    })

    expect(plan).not.toBeNull()
    if (!plan) {
      throw new Error('Scale plan для horizontal snap должен существовать')
    }

    expect(plan.guides).toEqual([
      {
        type: 'vertical',
        position: 40
      }
    ])
    expect(plan.snapGuards).toEqual([
      {
        type: 'vertical',
        edge: 'left',
        position: 40
      }
    ])
    expect(plan.nextScaleX).toBeCloseTo(0.8, 5)
    expect(plan.nextScaleY).toBeCloseTo(0.8, 5)
  })

  it('при uniform snap по двум осям передаёт guards для обоих активных краёв', () => {
    const plan = resolveScaleUpdatePlan({
      target: new Rect({ width: 100, height: 100, strokeWidth: 0 }),
      bounds: createScalingBounds({
        left: 0,
        top: 0,
        width: 100,
        height: 100
      }),
      originX: 'left',
      originY: 'top',
      scaleX: 1,
      scaleY: 1,
      shouldUseUniformScaleSnap: true,
      verticalSnap: createAxisSnapResult({
        edge: 'right',
        position: 100,
        guidePosition: 80
      }),
      horizontalSnap: createAxisSnapResult({
        edge: 'bottom',
        position: 100,
        guidePosition: 80
      })
    })

    expect(plan).not.toBeNull()
    if (!plan) {
      throw new Error('Scale plan для uniform snap по двум осям должен существовать')
    }

    expect(plan.guides).toEqual([
      {
        type: 'vertical',
        position: 80
      }
    ])
    expect(plan.snapGuards).toEqual([
      {
        type: 'vertical',
        edge: 'right',
        position: 80
      },
      {
        type: 'horizontal',
        edge: 'bottom',
        position: 80
      }
    ])
    expect(plan.nextScaleX).toBeCloseTo(0.8, 5)
    expect(plan.nextScaleY).toBeCloseTo(0.8, 5)
  })

  it('при раздельном snap по осям передаёт guards для обоих активных краёв', () => {
    const plan = resolveScaleUpdatePlan({
      target: new Rect({ width: 100, height: 100, strokeWidth: 0 }),
      bounds: createScalingBounds({
        left: 0,
        top: 0,
        width: 100,
        height: 100
      }),
      originX: 'left',
      originY: 'top',
      scaleX: 1,
      scaleY: 1,
      shouldUseUniformScaleSnap: false,
      verticalSnap: createAxisSnapResult({
        edge: 'right',
        position: 100,
        guidePosition: 80
      }),
      horizontalSnap: createAxisSnapResult({
        edge: 'bottom',
        position: 100,
        guidePosition: 70
      })
    })

    expect(plan).not.toBeNull()
    if (!plan) {
      throw new Error('Scale plan для раздельного snap по осям должен существовать')
    }

    expect(plan.guides).toEqual([
      {
        type: 'vertical',
        position: 80
      },
      {
        type: 'horizontal',
        position: 70
      }
    ])
    expect(plan.snapGuards).toEqual([
      {
        type: 'vertical',
        edge: 'right',
        position: 80
      },
      {
        type: 'horizontal',
        edge: 'bottom',
        position: 70
      }
    ])
    expect(plan.nextScaleX).toBeCloseTo(0.8, 5)
    expect(plan.nextScaleY).toBeCloseTo(0.7, 5)
  })

  describe('skewed and rotated objects', () => {
    /** Tangent of the 20° skew used by the skewed objects below. */
    const SKEW_TANGENT = Math.tan((20 * Math.PI) / 180)

    it('scales a horizontally skewed object so its bounds reach a vertical guide', () => {
      const boundsWidth = 200 + (120 * SKEW_TANGENT)
      const plan = resolveScaleUpdatePlan({
        target: new Rect({ width: 200, height: 120, skewX: 20, strokeWidth: 0 }),
        bounds: createScalingBounds({ left: 0, top: 0, width: boundsWidth, height: 120 }),
        originX: 'left',
        originY: 'top',
        scaleX: 1,
        scaleY: 1,
        shouldUseUniformScaleSnap: false,
        verticalSnap: createAxisSnapResult({ edge: 'right', position: boundsWidth, guidePosition: 300 }),
        horizontalSnap: createEmptyAxisSnapResult()
      })

      expect(plan?.nextScaleX).toBeCloseTo(300 / boundsWidth, 10)
    })

    it('scales a vertically skewed object so its bounds reach a horizontal guide', () => {
      const boundsHeight = 120 + (200 * SKEW_TANGENT)
      const plan = resolveScaleUpdatePlan({
        target: new Rect({ width: 200, height: 120, skewY: 20, strokeWidth: 0 }),
        bounds: createScalingBounds({ left: 0, top: 0, width: 200, height: boundsHeight }),
        originX: 'left',
        originY: 'top',
        scaleX: 1,
        scaleY: 1,
        shouldUseUniformScaleSnap: false,
        verticalSnap: createEmptyAxisSnapResult(),
        horizontalSnap: createAxisSnapResult({ edge: 'bottom', position: boundsHeight, guidePosition: 250 })
      })

      expect(plan?.nextScaleY).toBeCloseTo(250 / boundsHeight, 10)
    })

    it('matches an independently composed transform for a rotated, skewed and flipped object', () => {
      const geometry = {
        width: 200, height: 120, angle: 30, skewX: 15, skewY: 10, flipX: true, flipY: false, scaleY: 1
      }
      const boundsWidth = getReferenceBoundsWidth({ geometry, scaleX: 1 })
      const plan = resolveScaleUpdatePlan({
        target: new Rect({ ...geometry, strokeWidth: 0 }),
        bounds: createScalingBounds({ left: 0, top: 0, width: boundsWidth, height: 200 }),
        originX: 'left',
        originY: 'top',
        scaleX: 1,
        scaleY: 1,
        shouldUseUniformScaleSnap: false,
        verticalSnap: createAxisSnapResult({ edge: 'right', position: boundsWidth, guidePosition: 300 }),
        horizontalSnap: createEmptyAxisSnapResult()
      })

      expect(plan?.nextScaleX).toBeCloseTo(
        findReferenceScaleX({ geometry, targetWidth: 300, minScale: 0.5, maxScale: 3 }),
        8
      )
    })

    it('keeps the rotated bounds formula for an object without skew', () => {
      const radians = (30 * Math.PI) / 180
      const boundsWidth = (200 * Math.cos(radians)) + (120 * Math.sin(radians))
      const plan = resolveScaleUpdatePlan({
        target: new Rect({ width: 200, height: 120, angle: 30, strokeWidth: 0 }),
        bounds: createScalingBounds({ left: 0, top: 0, width: boundsWidth, height: 160 }),
        originX: 'left',
        originY: 'top',
        scaleX: 1,
        scaleY: 1,
        shouldUseUniformScaleSnap: false,
        verticalSnap: createAxisSnapResult({ edge: 'right', position: boundsWidth, guidePosition: 300 }),
        horizontalSnap: createEmptyAxisSnapResult()
      })

      expect(plan?.nextScaleX).toBeCloseTo((300 - (120 * Math.sin(radians))) / (200 * Math.cos(radians)), 10)
    })
  })
})
