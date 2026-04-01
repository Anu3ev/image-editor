import {
  Point,
  controlsUtils,
  type Transform
} from 'fabric'
import { BackgroundTextbox } from '../../src/editor/text-manager/background-textbox'
import TextScalingController from '../../src/editor/text-manager/scaling/text-scaling'
import { createTextManagerTestSetup } from './editor-helpers'
import { createMockShapeTextbox } from './shape-helpers'

type TextOriginX = 'left' | 'center' | 'right'
type TextOriginY = 'top' | 'center' | 'bottom'

type CreateTextScalingTransformOptions = {
  textbox: BackgroundTextbox
  action?: string
  corner?: string
  originX?: TextOriginX
  originY?: TextOriginY
  scaleX?: number
  scaleY?: number
  signX?: number
  signY?: number
}

type CreateTextScalingRuntimeSetupOptions = {
  autoExpand?: boolean
  fontSize?: number
  left?: number
  originX?: TextOriginX
  originY?: TextOriginY
  text?: string
  top?: number
  width?: number
}

export type TextScalingRuntimeSetup = ReturnType<typeof createTextManagerTestSetup> & {
  canvasManager: ReturnType<typeof createTextManagerTestSetup>['editor']['canvasManager']
  controller: TextScalingController
  persistScaledTextbox: jest.Mock
  textbox: BackgroundTextbox
}

/**
 * Создаёт тестовый setup для TextScalingController с обычным текстовым объектом.
 */
export const createTextScalingRuntimeSetup = (
  {
    text = 'Новый текст',
    width = 160,
    fontSize = 48,
    autoExpand = false,
    left = 40,
    top = 60,
    originX = 'left',
    originY = 'top'
  }: CreateTextScalingRuntimeSetupOptions = {}
): TextScalingRuntimeSetup => {
  const setup = createTextManagerTestSetup()
  const textbox = setup.textManager.addText({
    text,
    width,
    fontSize,
    autoExpand,
    left,
    top,
    originX,
    originY
  }) as BackgroundTextbox
  const persistScaledTextbox = jest.fn()
  const controller = new TextScalingController({
    canvas: setup.canvas as never,
    canvasManager: setup.editor.canvasManager as never,
    persistScaledTextbox
  })

  return {
    ...setup,
    canvasManager: setup.editor.canvasManager,
    controller,
    persistScaledTextbox,
    textbox
  }
}

/**
 * Создаёт transform-стаб для unit-сценариев object:scaling и mouse:move.
 */
export const createTextScalingTransform = (
  {
    textbox,
    action = 'scale',
    corner = 'br',
    originX = 'left',
    originY = 'top',
    scaleX = 1,
    scaleY = 1,
    signX = 1,
    signY = 1
  }: CreateTextScalingTransformOptions
): Transform => ({
  target: textbox,
  action,
  corner,
  originX,
  originY,
  scaleX,
  scaleY,
  signX,
  signY,
  original: {
    left: textbox.left,
    top: textbox.top,
    width: textbox.width,
    height: textbox.height,
    originX,
    originY,
    scaleX: 1,
    scaleY: 1
  }
} as never)

/**
 * Подменяет локальную точку transform для unit-сценариев с движением мыши.
 */
export const mockTextScalingLocalPoint = (
  {
    x,
    y
  }: {
    x: number
    y: number
  }
): jest.SpyInstance => {
  return jest.spyOn(controlsUtils, 'getLocalPoint').mockReturnValue(new Point(x, y) as never)
}

/**
 * Помещает transform в текущее состояние canvas для сценариев mouse:move.
 */
export const setCurrentTextScalingTransform = (
  {
    canvas,
    transform
  }: {
    canvas: TextScalingRuntimeSetup['canvas']
    transform: Transform
  }
): void => {
  canvas._currentTransform = transform
}

/**
 * Создаёт текстовый узел внутри фигуры для проверок, что standalone scaling его не трогает.
 */
export const createShapeOwnedScalingTextbox = (): ReturnType<typeof createMockShapeTextbox> => {
  const textbox = createMockShapeTextbox({
    text: 'Текст внутри фигуры',
    width: 180,
    fontSize: 30
  })

  textbox.group = {
    shapeComposite: true
  } as never

  return textbox
}

/**
 * Создаёт текстовый объект с разными размерами строк и фоновыми отступами.
 */
export const createStyledScalingTextbox = (
  {
    fontSize = 36,
    left = 40,
    top = 60,
    width = 137
  }: {
    fontSize?: number
    left?: number
    top?: number
    width?: number
  } = {}
): BackgroundTextbox => {
  const textbox = new BackgroundTextbox('69\nЧасов музыки', {
    width,
    fontSize,
    left,
    top,
    originX: 'left',
    originY: 'top',
    paddingTop: 21,
    paddingRight: 12,
    paddingBottom: 30,
    paddingLeft: 12,
    radiusTopLeft: 24,
    radiusTopRight: 24,
    radiusBottomRight: 24,
    radiusBottomLeft: 24
  })

  textbox.styles = {
    1: {
      0: {
        fontSize: 24,
        fill: '#333333'
      }
    }
  }
  textbox.lineFontDefaults = {
    1: {
      fontFamily: 'Open Sans',
      fontSize: 24
    }
  }

  return textbox
}
