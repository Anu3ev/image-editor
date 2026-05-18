import { resolveShapeScalingTextWrapPolicy } from '../../../../src/editor/shape-manager/scaling/shape-scaling-layout'

describe('shape scaling wrap policy', () => {
  it('при пропорциональном скейлинге сохраняет перенос по символам, если он уже был в начале drag', () => {
    expect(resolveShapeScalingTextWrapPolicy({
      isProportionalScaling: true,
      startTextSplitByGrapheme: true
    })).toBeUndefined()
    expect(resolveShapeScalingTextWrapPolicy({
      isProportionalScaling: true,
      startTextSplitByGrapheme: false
    })).toBe('words-only')
    expect(resolveShapeScalingTextWrapPolicy({
      isProportionalScaling: false,
      startTextSplitByGrapheme: true
    })).toBeUndefined()
  })
})
