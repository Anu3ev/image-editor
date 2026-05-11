import {
  applyShapeTextLayout,
  isShapeTextFrameFilled,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText,
  resolveShapeTextLayout,
  resolveShapeTextFixedWidthLayout,
  resolveShapeTextAutoExpandWidthForText,
  resolveShapeTextFrameLayout
} from '../../../../src/editor/shape-manager/layout/shape-layout'
import { resizeShapeNode } from '../../../../src/editor/shape-manager/creation/shape-node-factory'
import {
  getShapePreset,
  resolveInternalShapeTextInset
} from '../../../../src/editor/shape-manager/domain/shape-presets'
import {
  createMeasuredAutoExpandTextbox,
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox,
  measureRenderedTextboxLayout
} from '../../../test-utils/shape-helpers'

jest.mock('../../../../src/editor/shape-manager/creation/shape-node-factory', () => ({
  resizeShapeNode: jest.fn()
}))

describe('shape-layout', () => {
  const textFramePadding = {
    top: 12,
    right: 12,
    bottom: 12,
    left: 12
  }
  const zeroShapePadding = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
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

  it('resolveShapeTextFrameLayout уважает words-only wrap policy для scaling layout', () => {
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
      padding: textFramePadding,
      wrapPolicy: 'words-only'
    })

    expect(layout.splitByGrapheme).toBe(false)
    expect(layout.frame.width).toBeGreaterThan(0)
    expect(layout.frame.height).toBeGreaterThan(0)
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

  it('resolveRequiredShapeHeightForText не меняет итоговую высоту из-за стартовой высоты', () => {
    const preset = getShapePreset({
      presetKey: 'arrow-right-fat'
    })

    if (!preset) {
      throw new Error('arrow-right-fat preset is required for this test')
    }

    const text = createMockShapeTextbox({
      text: 'TEST\nTEST\nTEST\nTEST',
      width: preset.width,
      fontSize: 48,
      lineHeight: 1.16
    })
    const initialHeight = resolveRequiredShapeHeightForText({
      text,
      width: preset.width,
      height: preset.height,
      padding: zeroShapePadding,
      resolvePaddingForSize: ({ width, height }) => resolveInternalShapeTextInset({
        preset,
        width,
        height
      })
    })
    const stabilizedHeight = resolveRequiredShapeHeightForText({
      text,
      width: preset.width,
      height: initialHeight,
      padding: zeroShapePadding,
      resolvePaddingForSize: ({ width, height }) => resolveInternalShapeTextInset({
        preset,
        width,
        height
      })
    })

    expect(Math.abs(stabilizedHeight - initialHeight)).toBeLessThanOrEqual(0.5)
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

  it('resolveShapeTextFixedWidthLayout уменьшает пользовательский right padding, чтобы текст оставался внутри preview-ширины', () => {
    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST',
      width: 160,
      fontSize: 48
    })

    const layout = resolveShapeTextFixedWidthLayout({
      text,
      width: 100,
      height: 80,
      alignV: 'middle',
      padding: {
        top: 0,
        right: 118,
        bottom: 0,
        left: 0
      }
    })
    const renderedLayout = measureRenderedTextboxLayout({
      text: text.text ?? '',
      frameWidth: layout.frame.width,
      fontSize: Number(text.fontSize) || 48,
      splitByGrapheme: layout.splitByGrapheme
    })
    const longestLineWidth = Math.max(0, ...renderedLayout.lineWidths)

    expect(layout.width).toBe(100)
    expect(layout.appliedUserPadding.right).toBeLessThan(118)
    expect(layout.frame.left).toBeGreaterThanOrEqual(-(layout.width / 2) - 0.5)
    expect(layout.frame.left + layout.frame.width).toBeLessThanOrEqual((layout.width / 2) + 0.5)
    expect(longestLineWidth).toBeLessThanOrEqual(layout.frame.width + 0.5)
  })

  it('resolveShapeTextFixedWidthLayout уменьшает пользовательский left padding, чтобы текст оставался внутри preview-ширины', () => {
    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST',
      width: 160,
      fontSize: 48
    })

    const layout = resolveShapeTextFixedWidthLayout({
      text,
      width: 100,
      height: 80,
      alignV: 'middle',
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 118
      }
    })
    const renderedLayout = measureRenderedTextboxLayout({
      text: text.text ?? '',
      frameWidth: layout.frame.width,
      fontSize: Number(text.fontSize) || 48,
      splitByGrapheme: layout.splitByGrapheme
    })
    const longestLineWidth = Math.max(0, ...renderedLayout.lineWidths)

    expect(layout.width).toBe(100)
    expect(layout.appliedUserPadding.left).toBeLessThan(118)
    expect(layout.frame.left).toBeGreaterThanOrEqual(-(layout.width / 2) - 0.5)
    expect(layout.frame.left + layout.frame.width).toBeLessThanOrEqual((layout.width / 2) + 0.5)
    expect(longestLineWidth).toBeLessThanOrEqual(layout.frame.width + 0.5)
  })

  // eslint-disable-next-line max-len
  it('resolveShapeTextFixedWidthLayout при фиксированной высоте уменьшает верхний и нижний padding, чтобы текст остался внутри preview-высоты', () => {
    const text = createMockShapeTextbox({
      text: 'line one\nline two',
      width: 120,
      fontSize: 28,
      lineHeight: 1
    })

    const layout = resolveShapeTextFixedWidthLayout({
      text,
      width: 120,
      height: 100,
      alignV: 'middle',
      padding: {
        top: 40,
        right: 0,
        bottom: 40,
        left: 0
      },
      expandShapeHeightToFitText: false
    })
    const availableTextHeight = layout.height - layout.appliedPadding.top - layout.appliedPadding.bottom

    expect(layout.height).toBe(100)
    expect(layout.appliedUserPadding.top + layout.appliedUserPadding.bottom).toBeLessThan(80)
    expect(layout.frame.top).toBeGreaterThanOrEqual(-(layout.height / 2) - 0.5)
    expect(layout.frame.top + layout.frame.height).toBeLessThanOrEqual((layout.height / 2) + 0.5)
    expect(layout.frame.height).toBeLessThanOrEqual(availableTextHeight + 0.5)
  })

  it('первый layout после ввода текста и первый fixed-width preview дают одну и ту же высоту', () => {
    const preset = getShapePreset({
      presetKey: 'arrow-right-fat'
    })

    if (!preset) {
      throw new Error('arrow-right-fat preset is required for this test')
    }

    const text = createMockShapeTextbox({
      text: 'TEST\nTEST\nTEST\nTEST',
      width: preset.width,
      fontSize: 48,
      lineHeight: 1.16
    })
    const initialLayout = resolveShapeTextLayout({
      text,
      width: preset.width,
      height: preset.height,
      alignV: 'middle',
      padding: zeroShapePadding,
      resolveInternalShapeTextInset: ({ width, height }) => resolveInternalShapeTextInset({
        preset,
        width,
        height
      })
    })
    const previewLayout = resolveShapeTextFixedWidthLayout({
      text,
      width: initialLayout.width,
      height: initialLayout.height,
      alignV: 'middle',
      padding: zeroShapePadding,
      resolveInternalShapeTextInset: ({ width, height }) => resolveInternalShapeTextInset({
        preset,
        width,
        height
      })
    })

    expect(Math.abs(previewLayout.height - initialLayout.height)).toBeLessThanOrEqual(0.5)
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

  it('при сохранении пропорций и включённом авторасширении расширяет фигуру без переноса строки', () => {
    const preset = getShapePreset({
      presetKey: 'arrow-up-fat'
    })

    if (!preset) {
      throw new Error('arrow-up-fat preset is required for this test')
    }

    const shape = createMockShapeNode({
      width: preset.width,
      height: preset.height
    })
    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST X',
      width: preset.width,
      fontSize: 36
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: preset.width,
      height: preset.height,
      presetKey: preset.key
    })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: preset.width,
      height: preset.height,
      alignH: 'center',
      alignV: 'middle',
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      resolveInternalShapeTextInset: ({ width, height }) => resolveInternalShapeTextInset({
        preset,
        width,
        height
      }),
      preserveAspectRatio: true,
      shapeTextAutoExpandEnabled: true,
      montageAreaWidth: 400
    })

    const appliedInset = resolveInternalShapeTextInset({
      preset,
      width: group.shapeBaseWidth,
      height: group.shapeBaseHeight
    })
    const renderedLayout = measureRenderedTextboxLayout({
      text: text.text ?? '',
      frameWidth: Math.max(1, group.shapeBaseWidth - appliedInset.left - appliedInset.right),
      fontSize: Number(text.fontSize) || 36,
      splitByGrapheme: false
    })

    expect(group.shapeBaseWidth).toBeGreaterThan(preset.width)
    expect(group.shapeBaseHeight / group.shapeBaseWidth).toBeCloseTo(preset.height / preset.width, 4)
    expect(renderedLayout.lines).toHaveLength(1)
  })

  it('при сохранении пропорций с выключенным авторасширением оставляет перенос строк внутри фигуры', () => {
    const preset = getShapePreset({
      presetKey: 'star'
    })

    if (!preset) {
      throw new Error('star preset is required for this test')
    }

    const shape = createMockShapeNode({
      width: preset.width,
      height: preset.height
    })
    const text = createMeasuredAutoExpandTextbox({
      text: 'shape text shape text shape text',
      width: preset.width,
      fontSize: 30
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: preset.width,
      height: preset.height,
      presetKey: preset.key
    })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: preset.width,
      height: preset.height,
      alignH: 'center',
      alignV: 'middle',
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      resolveInternalShapeTextInset: ({ width, height }) => resolveInternalShapeTextInset({
        preset,
        width,
        height
      }),
      preserveAspectRatio: true,
      shapeTextAutoExpandEnabled: false,
      montageAreaWidth: 400
    })

    const appliedInset = resolveInternalShapeTextInset({
      preset,
      width: group.shapeBaseWidth,
      height: group.shapeBaseHeight
    })
    const renderedLayout = measureRenderedTextboxLayout({
      text: text.text ?? '',
      frameWidth: Math.max(1, group.shapeBaseWidth - appliedInset.left - appliedInset.right),
      fontSize: Number(text.fontSize) || 30,
      splitByGrapheme: false
    })

    expect(group.shapeBaseHeight / group.shapeBaseWidth).toBeCloseTo(preset.height / preset.width, 4)
    expect(renderedLayout.lines.length).toBeGreaterThan(1)
  })

  it('при подборе ширины учитывает внутренний отступ фигуры на текущем размере, а не на стартовой ширине', () => {
    const preset = getShapePreset({
      presetKey: 'arrow-up-fat'
    })

    if (!preset) {
      throw new Error('arrow-up-fat preset is required for this test')
    }

    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST X',
      width: preset.width,
      fontSize: 36
    })
    const fixedPadding = resolveInternalShapeTextInset({
      preset,
      width: preset.width,
      height: preset.height
    })
    const widthWithFixedPadding = resolveShapeTextAutoExpandWidthForText({
      text,
      currentWidth: preset.width,
      minimumWidth: preset.width,
      padding: fixedPadding,
      montageAreaWidth: 400
    })
    const widthWithDynamicPadding = resolveShapeTextAutoExpandWidthForText({
      text,
      currentWidth: preset.width,
      minimumWidth: preset.width,
      montageAreaWidth: 400,
      resolvePaddingForWidth: ({ width }) => resolveInternalShapeTextInset({
        preset,
        width,
        height: preset.height
      })
    })
    const appliedInset = resolveInternalShapeTextInset({
      preset,
      width: widthWithDynamicPadding,
      height: preset.height
    })
    const renderedLayout = measureRenderedTextboxLayout({
      text: text.text ?? '',
      frameWidth: Math.max(1, widthWithDynamicPadding - appliedInset.left - appliedInset.right),
      fontSize: Number(text.fontSize) || 36,
      splitByGrapheme: false
    })

    expect(widthWithDynamicPadding).toBeGreaterThan(widthWithFixedPadding)
    expect(renderedLayout.lines).toHaveLength(1)
  })

  it('при сохранении пропорций не выходит за ширину монтажной области, если одна строка всё равно не помещается', () => {
    const preset = getShapePreset({
      presetKey: 'arrow-up-fat'
    })

    if (!preset) {
      throw new Error('arrow-up-fat preset is required for this test')
    }

    const shape = createMockShapeNode({
      width: preset.width,
      height: preset.height
    })
    const text = createMeasuredAutoExpandTextbox({
      text: 'SUPERCALIFRAGILISTICEXPIALIDOCIOUS SUPERCALIFRAGILISTICEXPIALIDOCIOUS',
      width: preset.width,
      fontSize: 30
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: preset.width,
      height: preset.height,
      presetKey: preset.key
    })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width: preset.width,
      height: preset.height,
      alignH: 'center',
      alignV: 'middle',
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      resolveInternalShapeTextInset: ({ width, height }) => resolveInternalShapeTextInset({
        preset,
        width,
        height
      }),
      preserveAspectRatio: true,
      shapeTextAutoExpandEnabled: true,
      montageAreaWidth: 160
    })

    const appliedInset = resolveInternalShapeTextInset({
      preset,
      width: group.shapeBaseWidth,
      height: group.shapeBaseHeight
    })
    const renderedLayout = measureRenderedTextboxLayout({
      text: text.text ?? '',
      frameWidth: Math.max(1, group.shapeBaseWidth - appliedInset.left - appliedInset.right),
      fontSize: Number(text.fontSize) || 30,
      splitByGrapheme: false
    })

    expect(group.shapeBaseWidth).toBeLessThanOrEqual(160)
    expect(group.shapeBaseWidth).toBeCloseTo(160, 4)
    expect(renderedLayout.lines.length).toBeGreaterThan(1)
  })
})
