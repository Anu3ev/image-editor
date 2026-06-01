import {
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
