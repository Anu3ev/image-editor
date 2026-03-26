import {
  applyShapeTextLayout,
  isShapeTextFrameFilled,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText,
  resolveShapeTextAutoExpandWidthForText,
  resolveShapeTextFrameLayout
} from '../../../../src/editor/shape-manager/shape-layout'
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })
    const singleCharMinimumWidth = resolveMinimumShapeWidthForText({
      text: singleCharText,
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    expect(multiCharMinimumWidth).toBe(singleCharMinimumWidth)
  })

  it('resolveMinimumShapeWidthForText возвращает 1px для пустого текста', () => {
    const text = createMockShapeTextbox({
      text: ''
    })

    const minimumWidth = resolveMinimumShapeWidthForText({
      text,
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    expect(minimumWidth).toBe(1)
  })

  it('resolveMinimumShapeWidthForText возвращает 1px для текста из пробелов', () => {
    const text = createMockShapeTextbox({
      text: '   '
    })

    const minimumWidth = resolveMinimumShapeWidthForText({
      text,
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      },
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      },
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      },
      montageAreaWidth: 120
    })

    expect(nextWidth).toBe(120)
  })

  it('подбирает ширину без временного переноса строки на следующую строку', () => {
    const padding = {
      top: 0.2,
      right: 0.2,
      bottom: 0.2,
      left: 0.2
    }
    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST TEST',
      width: 160
    })

    const nextWidth = resolveShapeTextAutoExpandWidthForText({
      text,
      currentWidth: 160,
      minimumWidth: 120,
      padding,
      montageAreaWidth: 400
    })
    const frameWidth = Math.max(1, nextWidth - Math.min(nextWidth * 0.2, 12) - Math.min(nextWidth * 0.2, 12))
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      },
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    expect(group.shapeBaseWidth).toBe(180)
    expect(group.shapeBaseHeight).toBe(120)
    expect(group.shapeManualBaseWidth).toBe(180)
    expect(group.shapeManualBaseHeight).toBe(80)
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
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
      padding: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    })

    expect(group.shapeBaseHeight).toBe(80)
    expect(group.shapeManualBaseHeight).toBe(80)
    expect(group.height).toBe(80)
  })
})
