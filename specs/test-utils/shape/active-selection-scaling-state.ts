import {
  applyFixedWidthShapeTextLayout,
  applyShapeTextLayout,
  measureShapeTextFrameLayout,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText,
  resolveShapeTextFixedWidthLayout
} from '../../../src/editor/shape-manager/layout/shape-layout'
import { isShapeGroup } from '../../../src/editor/shape-manager/domain/shape-reference'

/** Observable dependencies for calculating the layout of a multi-object selection of shapes. */
export type ActiveSelectionScalingStateMocks = Readonly<{
  applyShapeTextLayoutMock: jest.MockedFunction<typeof applyShapeTextLayout>
}>

/** Returns a stable text measurement result for the specified shape size. */
function createResolvedTextLayout({ width, height }: { width: number, height: number }) {
  return {
    width,
    height,
    appliedPadding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    appliedUserPadding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    frame: {
      left: -60,
      top: -40,
      width: 120,
      height: 120
    },
    splitByGrapheme: false,
    textTop: -20
  }
}

/** Applies calculated dimensions to the test shape group. */
function applyResolvedShapeLayout({
  group,
  width,
  height
}: Parameters<typeof applyShapeTextLayout>[0]): void {
  group.width = width
  group.height = height
  group.shapeBaseWidth = width
  group.shapeBaseHeight = height
}

/** Configures predictable text measurement for unit tests of multi-object selections of shapes. */
export function configureActiveSelectionScalingStateMocks(): ActiveSelectionScalingStateMocks {
  const applyFixedWidthShapeTextLayoutMock = jest.mocked(applyFixedWidthShapeTextLayout)
  const applyShapeTextLayoutMock = jest.mocked(applyShapeTextLayout)
  const measureShapeTextFrameLayoutMock = jest.mocked(measureShapeTextFrameLayout)
  const resolveMinimumShapeWidthForTextMock = jest.mocked(resolveMinimumShapeWidthForText)
  const resolveRequiredShapeHeightForTextMock = jest.mocked(resolveRequiredShapeHeightForText)
  const resolveShapeTextFixedWidthLayoutMock = jest.mocked(resolveShapeTextFixedWidthLayout)
  const isShapeGroupMock = jest.mocked(isShapeGroup)

  jest.clearAllMocks()
  isShapeGroupMock.mockImplementation((target) => {
    return (target as { shapeComposite?: boolean } | null | undefined)?.shapeComposite === true
  })
  measureShapeTextFrameLayoutMock.mockReturnValue({
    measuredHeight: 100,
    renderedLineCount: 1,
    longestLineWidth: 100,
    requiresGraphemeSplit: false
  })
  resolveMinimumShapeWidthForTextMock.mockReturnValue(100)
  resolveRequiredShapeHeightForTextMock.mockImplementation(({ height }) => height)
  resolveShapeTextFixedWidthLayoutMock.mockImplementation(createResolvedTextLayout)
  applyShapeTextLayoutMock.mockImplementation(applyResolvedShapeLayout)
  applyFixedWidthShapeTextLayoutMock.mockImplementation(applyResolvedShapeLayout)

  return Object.freeze({ applyShapeTextLayoutMock })
}
