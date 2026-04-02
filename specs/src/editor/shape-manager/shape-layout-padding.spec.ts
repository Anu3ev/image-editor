import {
  resolveAppliedShapePadding,
  resolveTextFrameWidth
} from '../../../../src/editor/shape-manager/layout/shape-layout-padding'
import { createMockShapeTextbox } from '../../../test-utils/shape-helpers'

describe('shape-layout-padding', () => {
  it('при изменении правого отступа сохраняет левый насколько это возможно', () => {
    const text = createMockShapeTextbox({
      text: 'test'
    })

    const layout = resolveAppliedShapePadding({
      text,
      width: 100,
      height: 80,
      padding: {
        top: 0,
        right: 50,
        bottom: 0,
        left: 20
      },
      internalShapeTextInset: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      expandShapeHeightToFitText: true,
      changedPadding: {
        right: true
      },
      measureTextboxHeightForFrame: () => 20,
      resolveMinimumTextFrameWidth: () => 60
    })

    expect(layout.appliedUserPadding.left).toBe(20)
    expect(layout.appliedUserPadding.right).toBe(20)
  })

  it('при изменении обеих горизонтальных сторон ужимает их вместе', () => {
    const text = createMockShapeTextbox({
      text: 'test'
    })

    const layout = resolveAppliedShapePadding({
      text,
      width: 100,
      height: 80,
      padding: {
        top: 0,
        right: 50,
        bottom: 0,
        left: 30
      },
      internalShapeTextInset: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      expandShapeHeightToFitText: true,
      changedPadding: {
        right: true,
        left: true
      },
      measureTextboxHeightForFrame: () => 20,
      resolveMinimumTextFrameWidth: () => 60
    })

    expect(layout.appliedUserPadding.left).toBe(15)
    expect(layout.appliedUserPadding.right).toBe(25)
  })

  it('останавливает горизонтальный отступ раньше, если текст перестаёт помещаться по высоте', () => {
    const text = createMockShapeTextbox({
      text: 'test'
    })
    const measureTextboxHeightForFrame = ({
      frameWidth
    }: {
      frameWidth: number
    }): number => 200 - frameWidth

    const layout = resolveAppliedShapePadding({
      text,
      width: 120,
      height: 100,
      padding: {
        top: 0,
        right: 100,
        bottom: 0,
        left: 0
      },
      internalShapeTextInset: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      expandShapeHeightToFitText: false,
      changedPadding: {
        right: true
      },
      measureTextboxHeightForFrame,
      resolveMinimumTextFrameWidth: () => 20
    })
    const frameWidth = resolveTextFrameWidth({
      width: 120,
      padding: layout.appliedPadding
    })
    const measuredHeight = measureTextboxHeightForFrame({
      frameWidth
    })

    expect(layout.requiredHeight).toBe(100)
    expect(layout.appliedUserPadding.right).toBeLessThan(100)
    expect(frameWidth).toBeGreaterThan(20)
    expect(measuredHeight).toBeLessThanOrEqual(100.5)
  })

  it('уменьшает верхний и нижний отступ, когда текущей высоты не хватает', () => {
    const text = createMockShapeTextbox({
      text: 'test'
    })

    const layout = resolveAppliedShapePadding({
      text,
      width: 100,
      height: 100,
      padding: {
        top: 40,
        right: 0,
        bottom: 40,
        left: 0
      },
      internalShapeTextInset: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      expandShapeHeightToFitText: false,
      changedPadding: {
        top: true,
        bottom: true
      },
      measureTextboxHeightForFrame: () => 80,
      resolveMinimumTextFrameWidth: () => 20
    })

    expect(layout.requiredHeight).toBe(100)
    expect(layout.appliedUserPadding.top).toBe(10)
    expect(layout.appliedUserPadding.bottom).toBe(10)
  })

  it('добавляет внутренний отступ формы к layout, но отдельно сохраняет только пользовательский', () => {
    const text = createMockShapeTextbox({
      text: 'test'
    })

    const layout = resolveAppliedShapePadding({
      text,
      width: 200,
      height: 200,
      padding: {
        top: 0,
        right: 5,
        bottom: 0,
        left: 10
      },
      internalShapeTextInset: {
        top: 24,
        right: 20,
        bottom: 24,
        left: 20
      },
      expandShapeHeightToFitText: true,
      measureTextboxHeightForFrame: () => 40,
      resolveMinimumTextFrameWidth: () => 20
    })

    expect(layout.appliedPadding).toEqual({
      top: 24,
      right: 25,
      bottom: 24,
      left: 30
    })
    expect(layout.appliedUserPadding).toEqual({
      top: 0,
      right: 5,
      bottom: 0,
      left: 10
    })
  })

  it('просит увеличить ширину шейпа, если обязательный внутренний отступ не помещается', () => {
    const text = createMockShapeTextbox({
      text: 'T'
    })

    const layout = resolveAppliedShapePadding({
      text,
      width: 30,
      height: 80,
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      internalShapeTextInset: {
        top: 0,
        right: 20,
        bottom: 0,
        left: 20
      },
      expandShapeHeightToFitText: true,
      measureTextboxHeightForFrame: () => 20,
      resolveMinimumTextFrameWidth: () => 10
    })

    expect(layout.requiredWidth).toBe(50)
    expect(layout.appliedPadding.left).toBe(20)
    expect(layout.appliedPadding.right).toBe(20)
    expect(layout.appliedUserPadding.left).toBe(0)
    expect(layout.appliedUserPadding.right).toBe(0)
  })

  it('при нехватке места съедает только пользовательский отступ, а обязательный сохраняет', () => {
    const text = createMockShapeTextbox({
      text: 'T'
    })

    const layout = resolveAppliedShapePadding({
      text,
      width: 70,
      height: 80,
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 30
      },
      internalShapeTextInset: {
        top: 0,
        right: 20,
        bottom: 0,
        left: 20
      },
      expandShapeHeightToFitText: true,
      changedPadding: {
        left: true
      },
      measureTextboxHeightForFrame: () => 20,
      resolveMinimumTextFrameWidth: () => 20
    })

    expect(layout.appliedPadding.left).toBe(30)
    expect(layout.appliedPadding.right).toBe(20)
    expect(layout.appliedUserPadding.left).toBe(10)
    expect(layout.appliedUserPadding.right).toBe(0)
    expect(layout.requiredWidth).toBe(60)
  })
})
