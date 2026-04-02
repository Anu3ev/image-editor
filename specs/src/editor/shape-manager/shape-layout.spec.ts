import {
  applyShapeTextLayout,
  isShapeTextFrameFilled,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText,
  resolveShapeTextAutoExpandWidthForText,
  resolveShapeTextFrameLayout
} from '../../../../src/editor/shape-manager/layout/shape-layout'
import { resizeShapeNode } from '../../../../src/editor/shape-manager/shape-factory'
import {
  createMeasuredAutoExpandTextbox,
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox,
  measureRenderedTextboxLayout
} from '../../../test-utils/shape-helpers'

jest.mock('../../../../src/editor/shape-manager/shape-factory', () => ({
  resizeShapeNode: jest.fn()
}))

describe('shape-layout', () => {
  const textFramePadding = {
    top: 12,
    right: 12,
    bottom: 12,
    left: 12
  }
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
      padding: textFramePadding
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
      padding: textFramePadding
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
      padding: textFramePadding
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
      padding: textFramePadding
    })

    const notFilled = isShapeTextFrameFilled({
      text: notFilledText,
      width: 120,
      height: 90,
      padding: textFramePadding
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
      padding: textFramePadding
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
      padding: textFramePadding
    })

    // Ожидаем, что ширина shape была увеличена чтобы вмещать символ
    expect(group.shapeBaseWidth).toBeGreaterThanOrEqual(20)
  })

  it('увеличивает ширину шейпа, если обводка съедает внутреннее место для текста', () => {
    const shape = createMockShapeNode({
      width: 20,
      height: 120
    })
    const text = createMockShapeTextbox({
      text: 'T',
      width: 20,
      fontSize: 48
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 20,
      height: 120
    })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: 20,
      height: 120,
      alignH: 'center',
      alignV: 'middle',
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
      }
    })

    expect(group.shapeBaseWidth).toBeGreaterThan(20)
    expect(group.shapePaddingLeft).toBe(0)
    expect(group.shapePaddingRight).toBe(0)
    expect(text.width).toBeCloseTo(group.shapeBaseWidth - 40, 4)
  })

  it('resolveMinimumShapeWidthForText считает минимум по одному символу, а не по целому слову', () => {
    const multiCharText = createMockShapeTextbox({
      text: 'TEST',
      width: 200,
      fontSize: 40
    })
    const singleCharText = createMockShapeTextbox({
      text: 'T',
      width: 200,
      fontSize: 40
    })

    const multiCharMinimumWidth = resolveMinimumShapeWidthForText({
      text: multiCharText,
      padding: textFramePadding
    })
    const singleCharMinimumWidth = resolveMinimumShapeWidthForText({
      text: singleCharText,
      padding: textFramePadding
    })

    expect(multiCharMinimumWidth).toBe(singleCharMinimumWidth)
  })

  it('resolveMinimumShapeWidthForText возвращает 1px для пустого текста', () => {
    const text = createMockShapeTextbox({
      text: ''
    })

    const minimumWidth = resolveMinimumShapeWidthForText({
      text,
      padding: textFramePadding
    })

    expect(minimumWidth).toBe(1)
  })

  it('resolveMinimumShapeWidthForText возвращает 1px для текста из пробелов', () => {
    const text = createMockShapeTextbox({
      text: '   '
    })

    const minimumWidth = resolveMinimumShapeWidthForText({
      text,
      padding: textFramePadding
    })

    expect(minimumWidth).toBe(1)
  })

  it('при пустом тексте возвращает ручную базовую ширину', () => {
    const text = createMeasuredAutoExpandTextbox({
      text: '',
      width: 240
    })

    const nextWidth = resolveShapeTextAutoExpandWidthForText({
      text,
      currentWidth: 240,
      minimumWidth: 180,
      padding: textFramePadding,
      montageAreaWidth: 400
    })

    expect(nextWidth).toBe(180)
  })

  it('не сужает шейп ниже ручной базовой ширины, если текст стал короче', () => {
    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST',
      width: 240
    })

    const nextWidth = resolveShapeTextAutoExpandWidthForText({
      text,
      currentWidth: 240,
      minimumWidth: 180,
      padding: textFramePadding,
      montageAreaWidth: 400
    })

    expect(nextWidth).toBe(180)
  })

  it('если текст не помещается даже на максимальной ширине, возвращает максимально доступную ширину', () => {
    const text = createMeasuredAutoExpandTextbox({
      text: 'SUPERCALIFRAGILISTICEXPIALIDOCIOUS',
      width: 120
    })

    const nextWidth = resolveShapeTextAutoExpandWidthForText({
      text,
      currentWidth: 120,
      minimumWidth: 80,
      padding: textFramePadding,
      montageAreaWidth: 120
    })

    expect(nextWidth).toBe(120)
  })

  it('подбирает ширину без временного переноса строки на следующую строку', () => {
    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST TEST',
      width: 160
    })

    const nextWidth = resolveShapeTextAutoExpandWidthForText({
      text,
      currentWidth: 160,
      minimumWidth: 120,
      padding: textFramePadding,
      montageAreaWidth: 400
    })
    const frameWidth = Math.max(1, nextWidth - textFramePadding.left - textFramePadding.right)
    const validation = measureRenderedTextboxLayout({
      text: text.text ?? '',
      frameWidth,
      fontSize: Number(text.fontSize) || 48,
      splitByGrapheme: false
    })

    expect(validation.lines).toHaveLength(1)
  })

  it('если ручная базовая ширина уже больше монтажной области, не сужает шейп обратно', () => {
    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST',
      width: 240
    })

    const nextWidth = resolveShapeTextAutoExpandWidthForText({
      text,
      currentWidth: 240,
      minimumWidth: 220,
      padding: textFramePadding,
      montageAreaWidth: 160
    })

    expect(nextWidth).toBe(220)
  })

  it('resolveRequiredShapeHeightForText возвращает safeHeight для пустого текста', () => {
    const text = createMockShapeTextbox({
      text: ''
    })

    const nextHeight = resolveRequiredShapeHeightForText({
      text,
      width: 120,
      height: 80,
      padding: textFramePadding
    })

    expect(nextHeight).toBe(80)
  })

  it('resolveRequiredShapeHeightForText возвращает safeHeight для текста из пробелов', () => {
    const text = createMockShapeTextbox({
      text: ' \n  '
    })

    const nextHeight = resolveRequiredShapeHeightForText({
      text,
      width: 120,
      height: 80,
      padding: textFramePadding
    })

    expect(nextHeight).toBe(80)
  })

  it('isShapeTextFrameFilled возвращает false для пустого текста', () => {
    const text = createMockShapeTextbox({
      text: ''
    })

    const filled = isShapeTextFrameFilled({
      text,
      width: 120,
      height: 80,
      padding: textFramePadding
    })

    expect(filled).toBe(false)
  })

  it('isShapeTextFrameFilled возвращает false для текста из пробелов', () => {
    const text = createMockShapeTextbox({
      text: '  '
    })

    const filled = isShapeTextFrameFilled({
      text,
      width: 120,
      height: 80,
      padding: textFramePadding
    })

    expect(filled).toBe(false)
  })

  it('applyShapeTextLayout сохраняет manual base размеры отдельно от рассчитанного layout', () => {
    const shape = createMockShapeNode({
      width: 180,
      height: 80
    })
    const text = createMockShapeTextbox({
      text: 'wrap wrap wrap wrap',
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
      height: 120,
      alignH: 'center',
      alignV: 'middle',
      padding: textFramePadding
    })

    expect(group.shapeBaseWidth).toBe(180)
    expect(group.shapeBaseHeight).toBe(120)
    expect(group.shapeManualBaseWidth).toBe(180)
    expect(group.shapeManualBaseHeight).toBe(80)
  })

  it('сохраняет в метаданных только пользовательские отступы без внутреннего отступа формы', () => {
    const shape = createMockShapeNode({
      width: 200,
      height: 200
    })
    const text = createMockShapeTextbox({
      text: 'shape text',
      width: 200,
      fontSize: 28
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 200,
      height: 200
    })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: 200,
      height: 200,
      alignH: 'center',
      alignV: 'middle',
      padding: {
        top: 10,
        right: 12,
        bottom: 14,
        left: 16
      },
      internalShapeTextInset: {
        top: 24,
        right: 20,
        bottom: 24,
        left: 20
      }
    })

    expect(group.shapePaddingTop).toBe(10)
    expect(group.shapePaddingRight).toBe(12)
    expect(group.shapePaddingBottom).toBe(14)
    expect(group.shapePaddingLeft).toBe(16)
  })

  it('при фиксированной высоте уменьшает верхний и нижний отступ, чтобы текст остался внутри шейпа', () => {
    const shape = createMockShapeNode({
      width: 120,
      height: 100
    })
    const text = createMockShapeTextbox({
      text: 'line one\nline two',
      width: 120,
      fontSize: 28,
      lineHeight: 1
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 120,
      height: 100
    })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: 120,
      height: 100,
      alignH: 'center',
      alignV: 'middle',
      padding: {
        top: 40,
        right: 0,
        bottom: 40,
        left: 0
      },
      expandShapeHeightToFitText: false
    })

    const availableTextHeight = group.shapeBaseHeight - group.shapePaddingTop - group.shapePaddingBottom

    expect(group.shapeBaseHeight).toBe(100)
    expect(group.shapePaddingTop + group.shapePaddingBottom).toBeLessThan(80)
    expect(text.height ?? 0).toBeLessThanOrEqual(availableTextHeight + 0.5)
  })

  it('после narrow layout с переносом строк и обратного расширения возвращает actual height к manual base height', () => {
    const shape = createMockShapeNode({
      width: 180,
      height: 80
    })
    const text = createMockShapeTextbox({
      text: 'TEST',
      width: 180,
      fontSize: 48
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
      width: 60,
      height: 80,
      alignH: 'center',
      alignV: 'middle',
      padding: textFramePadding
    })

    expect(group.shapeBaseHeight).toBeGreaterThan(80)
    expect(group.shapeManualBaseHeight).toBe(80)

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: 180,
      height: 80,
      alignH: 'center',
      alignV: 'middle',
      padding: textFramePadding
    })

    expect(group.shapeBaseWidth).toBe(180)
    expect(group.shapeBaseHeight).toBe(80)
    expect(group.shapeManualBaseWidth).toBe(180)
    expect(group.shapeManualBaseHeight).toBe(80)
    expect(group.height).toBe(80)
  })

  it('applyShapeTextLayout не схлопывает empty-text shape до 1px по высоте', () => {
    const shape = createMockShapeNode({
      width: 180,
      height: 80
    })
    const text = createMockShapeTextbox({
      text: '',
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
      padding: textFramePadding
    })

    expect(group.shapeBaseHeight).toBe(80)
    expect(group.shapeManualBaseHeight).toBe(80)
    expect(group.height).toBe(80)
  })
})
