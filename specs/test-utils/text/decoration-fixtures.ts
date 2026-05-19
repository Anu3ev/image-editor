import { BackgroundTextbox } from '../../../src/editor/text-manager/background-textbox'
import { createMockContext } from '../fabric/context'

type DecorationType = 'underline' | 'linethrough'

type DecorationRenderSetupOptions = {
  text: string
  type: DecorationType
  strokeByIndex: string[]
  strokeWidth?: number
  fill?: string
}

type DecorationStyleReaderOptions = {
  textbox: any
  type: DecorationType
  strokeByIndex: string[]
  strokeWidth: number
  fill: string
}

type DecorationCharBounds = Array<{
  left: number
  width: number
  kernedWidth: number
  height: number
  deltaY: number
}>

/**
 * Создаёт BackgroundTextbox с переопределённым чтением стилей для декораций.
 */
export const createDecorationTextbox = ({
  stroke = '#ff0000',
  strokeWidth = 2,
  fill = '#000000'
}: {
  stroke?: string | null
  strokeWidth?: number
  fill?: string
} = {}) => {
  const textbox = new BackgroundTextbox('Test')
  const state = {
    stroke,
    strokeWidth,
    fill
  }
  const textboxAny = textbox as any

  textboxAny.getValueOfPropertyAt = (
    _lineIndex: number,
    _charIndex: number,
    property: string
  ) => {
    const {
      strokeWidth: currentStrokeWidth,
      stroke: currentStroke,
      fill: currentFill
    } = state

    if (property === 'strokeWidth') return currentStrokeWidth
    if (property === 'stroke') return currentStroke
    if (property === 'fill') return currentFill
    return undefined
  }

  return { textbox, state }
}

/**
 * Строит char bounds в виде равномерной линейки, достаточной для unit-тестов декораций.
 */
const createDecorationCharBounds = (charsLength: number): DecorationCharBounds => {
  const charBounds: DecorationCharBounds = []

  for (let index = 0; index < charsLength; index += 1) {
    charBounds.push({
      left: index * 10,
      width: 10,
      kernedWidth: 10,
      height: 10,
      deltaY: 0
    })
  }

  return charBounds
}

/**
 * Заполняет internal Textbox-поля минимальным layout-состоянием,
 * которое требуется decoration renderer.
 */
const prepareDecorationTextboxLayout = ({
  textbox,
  chars,
  charBounds,
  type
}: {
  textbox: any
  chars: string[]
  charBounds: DecorationCharBounds
  type: DecorationType
}) => {
  textbox._textLines = [chars]
  textbox.__charBounds = [charBounds]
  textbox.offsets = { underline: 0, linethrough: 0, overline: 0 }
  textbox._fontSizeFraction = 0
  textbox.direction = 'ltr'
  textbox.width = chars.length * 10
  textbox._getWidthOfCharSpacing = () => 0
  textbox._getLineLeftOffset = () => 0
  textbox._getTopOffset = () => 0
  textbox._getLeftOffset = () => 0
  textbox.getHeightOfLine = () => 10
  textbox.getHeightOfChar = () => 10
  textbox.styleHas = () => true
  textbox._removeShadow = jest.fn()
  textbox[type] = true
}

/**
 * Подменяет style-reader так, чтобы декорации читали stroke/fill из тестовых данных.
 */
const setDecorationStyleReader = ({
  textbox,
  type,
  strokeByIndex,
  strokeWidth,
  fill
}: DecorationStyleReaderOptions) => {
  const fallbackStrokeIndex = Math.max(strokeByIndex.length - 1, 0)

  textbox.getValueOfPropertyAt = (
    _lineIndex: number,
    charIndex: number,
    property: string
  ) => {
    if (property === type) return true
    if (property === 'textDecorationThickness') return 100
    if (property === 'deltaY') return 0
    if (property === 'strokeWidth') return strokeWidth
    if (property === 'stroke') {
      const strokeAtIndex = strokeByIndex[charIndex]
      const fallbackStroke = strokeByIndex[fallbackStrokeIndex]
      return strokeAtIndex ?? fallbackStroke
    }
    if (property === 'fill') return fill
    return undefined
  }
}

/**
 * Возвращает mock canvas context и собирает фактические fillStyle,
 * которыми отрисовывались декорации.
 */
const createTrackedMockContext = () => {
  const ctx = createMockContext()
  const fillStyles: string[] = []

  ctx.fillRect = function fillRect() {
    fillStyles.push(ctx.fillStyle as string)
  }

  return {
    ctx,
    fillStyles
  }
}

/**
 * Готовит BackgroundTextbox и контекст для проверки цветов декораций.
 */
export const createDecorationRenderSetup = ({
  text,
  type,
  strokeByIndex,
  strokeWidth = 2,
  fill = '#000000'
}: DecorationRenderSetupOptions) => {
  const textbox = new BackgroundTextbox(text, { fontSize: 10, lineHeight: 1 })
  const chars = text.split('')
  const charBounds = createDecorationCharBounds(chars.length)
  const textboxAny = textbox as any

  prepareDecorationTextboxLayout({
    textbox: textboxAny,
    chars,
    charBounds,
    type
  })
  setDecorationStyleReader({
    textbox: textboxAny,
    type,
    strokeByIndex,
    strokeWidth,
    fill
  })

  const { ctx, fillStyles } = createTrackedMockContext()

  return { textbox, ctx, fillStyles }
}
