import {
  applyShapeStyle,
  createShapeNode
} from '../../src/editor/shape-manager/shape-factory'
import {
  applyShapeTextLayout,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText,
  resolveShapeTextAutoExpandWidthForText,
  resolveShapeTextFixedWidthLayout,
  resolveShapeTextFrameLayout
} from '../../src/editor/shape-manager/layout/shape-layout'
import {
  applyShapeTextLayoutToMockGroup,
  applyTextStyleToShapeText,
  createMockShapeNode,
  createShapeManagerEditorStub,
  getCanvasEventPayloads,
  getCanvasHandler,
  getRequiredCanvasHandler
} from './shape-helpers'

export const getShapeManagerUnitMocks = () => ({
  applyShapeStyleMock: applyShapeStyle as jest.Mock,
  applyShapeTextLayoutMock: applyShapeTextLayout as jest.Mock,
  createShapeNodeMock: createShapeNode as jest.Mock,
  resolveMinimumShapeWidthForTextMock: resolveMinimumShapeWidthForText as jest.Mock,
  resolveRequiredShapeHeightForTextMock: resolveRequiredShapeHeightForText as jest.Mock,
  resolveShapeTextAutoExpandWidthForTextMock: resolveShapeTextAutoExpandWidthForText as jest.Mock,
  resolveShapeTextFixedWidthLayoutMock: resolveShapeTextFixedWidthLayout as jest.Mock,
  resolveShapeTextFrameLayoutMock: resolveShapeTextFrameLayout as jest.Mock
})

export const resetShapeManagerUnitMocks = ({
  applyShapeTextLayoutMock,
  createShapeNodeMock,
  resolveMinimumShapeWidthForTextMock,
  resolveRequiredShapeHeightForTextMock,
  resolveShapeTextAutoExpandWidthForTextMock,
  resolveShapeTextFixedWidthLayoutMock,
  resolveShapeTextFrameLayoutMock
}: ReturnType<typeof getShapeManagerUnitMocks>): void => {
  jest.clearAllMocks()

  createShapeNodeMock.mockImplementation(async() => createMockShapeNode())
  applyShapeTextLayoutMock.mockImplementation(applyShapeTextLayoutToMockGroup)
  resolveMinimumShapeWidthForTextMock.mockImplementation(() => 1)
  resolveRequiredShapeHeightForTextMock.mockImplementation(({
    height
  }: {
    height: number
  }) => Math.max(1, height))
  resolveShapeTextFrameLayoutMock.mockImplementation(({
    width,
    padding
  }: {
    width: number
    padding?: {
      left?: number
      right?: number
    }
  }) => ({
    frame: {
      left: padding?.left ?? 0,
      width: Math.max(1, width - (padding?.left ?? 0) - (padding?.right ?? 0))
    },
    splitByGrapheme: false,
    textTop: 0
  }))
  resolveShapeTextFixedWidthLayoutMock.mockImplementation(({
    width,
    height
  }: {
    width: number
    height: number
  }) => ({
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
      left: 0,
      top: 0,
      width: Math.max(1, width),
      height: Math.max(1, height)
    },
    splitByGrapheme: false,
    textTop: 0
  }))
  resolveShapeTextAutoExpandWidthForTextMock.mockImplementation(({
    currentWidth,
    minimumWidth
  }: {
    currentWidth: number
    minimumWidth: number
  }) => Math.max(currentWidth, minimumWidth))
}

export {
  applyShapeTextLayoutToMockGroup,
  applyTextStyleToShapeText,
  createMockShapeNode,
  createShapeManagerEditorStub,
  getCanvasEventPayloads,
  getCanvasHandler,
  getRequiredCanvasHandler
}
