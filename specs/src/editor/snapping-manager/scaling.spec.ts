import {
  resolveScaleAxisSnaps,
  resolveScaleUpdatePlan,
  shouldUseUniformScaleSnap
} from '../../../../src/editor/snapping-manager/scaling'
import {
  createAxisSnapResult,
  createCropFrameTarget,
  createEmptyAxisSnapResult,
  createScalingBounds,
  createScalingEvent
} from '../../../test-utils/shared/snapping-scaling'

describe('SnappingManager scaling contract', () => {
  it('для side-control crop frame с включённым preserveAspectRatio включает uniform snap и отключает его с Shift', () => {
    const target = createCropFrameTarget({
      preserveAspectRatio: true
    })

    const withoutShift = shouldUseUniformScaleSnap({
      target,
      event: createScalingEvent(),
      isCornerHandle: false
    })
    const withShift = shouldUseUniformScaleSnap({
      target,
      event: createScalingEvent({ shiftKey: true }),
      isCornerHandle: false
    })

    expect(withoutShift).toBe(true)
    expect(withShift).toBe(false)
  })

  it('для side-control crop frame с выключенным preserveAspectRatio включает uniform snap только с Shift', () => {
    const target = createCropFrameTarget({
      preserveAspectRatio: false
    })

    const withoutShift = shouldUseUniformScaleSnap({
      target,
      event: createScalingEvent(),
      isCornerHandle: false
    })
    const withShift = shouldUseUniformScaleSnap({
      target,
      event: createScalingEvent({ shiftKey: true }),
      isCornerHandle: false
    })

    expect(withoutShift).toBe(false)
    expect(withShift).toBe(true)
  })

  it('для corner-control crop frame с выключенным preserveAspectRatio включает uniform snap только с Shift', () => {
    const target = createCropFrameTarget({
      preserveAspectRatio: false
    })

    const withoutShift = shouldUseUniformScaleSnap({
      target,
      event: createScalingEvent(),
      isCornerHandle: true
    })
    const withShift = shouldUseUniformScaleSnap({
      target,
      event: createScalingEvent({ shiftKey: true }),
      isCornerHandle: true
    })

    expect(withoutShift).toBe(false)
    expect(withShift).toBe(true)
  })

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
      target: createCropFrameTarget(),
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
    expect(plan.nextScaleX).toBeCloseTo(0.8, 5)
    expect(plan.nextScaleY).toBeCloseTo(0.8, 5)
  })

  it('при horizontal snap side-control пересчитывает обе scale-оси одним коэффициентом', () => {
    const plan = resolveScaleUpdatePlan({
      target: createCropFrameTarget(),
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
    expect(plan.nextScaleX).toBeCloseTo(0.8, 5)
    expect(plan.nextScaleY).toBeCloseTo(0.8, 5)
  })
})
