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
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox,
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

export const createShapeRehydrationTarget = ({
  width = 200,
  height = 100,
  scaleX = 1,
  scaleY = 1,
  manualWidth = width,
  manualHeight = height,
  replaceBoxWidth = width,
  replaceBoxHeight = height
}: {
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  manualWidth?: number
  manualHeight?: number
  replaceBoxWidth?: number
  replaceBoxHeight?: number
} = {}) => {
  const shape = createMockShapeNode({
    width,
    height
  })
  const text = createMockShapeTextbox({
    text: 'Shape text',
    width
  })
  const group = createMockShapeGroup({
    shape,
    text,
    width,
    height
  })

  group.scaleX = scaleX
  group.scaleY = scaleY
  group.shapeManualBaseWidth = manualWidth
  group.shapeManualBaseHeight = manualHeight
  group.shapeReplaceBoxWidth = replaceBoxWidth
  group.shapeReplaceBoxHeight = replaceBoxHeight

  return {
    group,
    shape,
    text
  }
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
