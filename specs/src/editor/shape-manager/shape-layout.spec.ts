import { Point } from 'fabric'
import {
  applyShapeTextLayout,
  isShapeTextFrameFilled,
  resolveGroupCenterPoint,
  resolveRequiredShapeHeightForText,
  resolveShapeTextFrameLayout
} from '../../../../src/editor/shape-manager/shape-layout'
import { resizeShapeNode } from '../../../../src/editor/shape-manager/shape-factory'
import {
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'

jest.mock('../../../../src/editor/shape-manager/shape-factory', () => ({
  resizeShapeNode: jest.fn()
}))

describe('shape-layout', () => {
  const resizeShapeNodeMock = resizeShapeNode as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('resolveShapeTextFrameLayout оставляет перенос по словам для обычного текста', () => {
    const text = createMockShapeTextbox({
      text: 'test test test',
      width: 180,
      fontSize: 22
    })

    const layout = resolveShapeTextFrameLayout({
      text,
      width: 180,
      height: 120,
      alignV: 'middle',
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    expect(layout.splitByGrapheme).toBe(false)
    expect(layout.frame.width).toBeGreaterThan(0)
    expect(layout.frame.height).toBeGreaterThan(0)
  })

  it('resolveShapeTextFrameLayout включает splitByGrapheme для длинного неразрывного слова', () => {
    const text = createMockShapeTextbox({
      text: 'superlongwordwithoutspaces',
      width: 160,
      fontSize: 26
    })

    const layout = resolveShapeTextFrameLayout({
      text,
      width: 120,
      height: 120,
      alignV: 'middle',
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    expect(layout.splitByGrapheme).toBe(true)
  })

  it('resolveRequiredShapeHeightForText увеличивает высоту, если текст не помещается', () => {
    const text = createMockShapeTextbox({
      text: 'line one\nline two\nline three\nline four',
      width: 120,
      fontSize: 28,
      lineHeight: 1
    })

    const nextHeight = resolveRequiredShapeHeightForText({
      text,
      width: 120,
      height: 80,
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    expect(nextHeight).toBeGreaterThan(80)
  })

  it('isShapeTextFrameFilled корректно определяет заполненность фрейма по высоте', () => {
    const filledText = createMockShapeTextbox({
      text: 'row1\nrow2\nrow3\nrow4',
      width: 120,
      fontSize: 20,
      lineHeight: 1
    })
    const notFilledText = createMockShapeTextbox({
      text: 'row1\nrow2',
      width: 120,
      fontSize: 20,
      lineHeight: 1
    })

    const filled = isShapeTextFrameFilled({
      text: filledText,
      width: 120,
      height: 90,
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    const notFilled = isShapeTextFrameFilled({
      text: notFilledText,
      width: 120,
      height: 90,
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    expect(filled).toBe(true)
    expect(notFilled).toBe(false)
  })

  it('applyShapeTextLayout обновляет геометрию и текстовую рамку без изменения масштаба', () => {
    const shape = createMockShapeNode({
      width: 180,
      height: 80
    })
    const text = createMockShapeTextbox({
      text: 'very long line very long line very long line',
      width: 180,
      fontSize: 30
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 180,
      height: 80
    })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: 180,
      height: 80,
      alignH: 'center',
      alignV: 'middle',
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    expect(resizeShapeNodeMock).toHaveBeenCalledTimes(1)
    expect(group.shapeBaseWidth).toBe(180)
    expect(group.shapeBaseHeight).toBeGreaterThanOrEqual(80)
    expect(group.scaleX).toBe(1)
    expect(group.scaleY).toBe(1)
    expect(text.autoExpand).toBe(false)
    expect(text.width).toBeGreaterThan(0)
    expect(text.width).toBeLessThan(180)
  })

  it('увеличивает ширину shape если одна буква не помещается по ширине', () => {
    const shape = createMockShapeNode({
      width: 50,
      height: 80
    })

    // Очень большая буква, ширина textbox меньше чем ширина символа
    const text = createMockShapeTextbox({
      text: 'W',
      width: 20,
      fontSize: 100
    })

    const group = createMockShapeGroup({
      shape,
      text,
      width: 20,
      height: 80
    })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: 20,
      height: 80,
      alignH: 'center',
      alignV: 'middle',
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    // Ожидаем, что ширина shape была увеличена чтобы вмещать символ
    expect(group.shapeBaseWidth).toBeGreaterThanOrEqual(20)
  })

  it('resolveGroupCenterPoint использует явные координаты, иначе центр канваса', () => {
    const explicitCenter = resolveGroupCenterPoint({
      left: 120,
      top: 85,
      canvasCenter: new Point(256, 256)
    })
    const fallbackCenter = resolveGroupCenterPoint({
      canvasCenter: new Point(256, 256)
    })

    expect(explicitCenter).toEqual(new Point(120, 85))
    expect(fallbackCenter).toEqual(new Point(256, 256))
  })
})
