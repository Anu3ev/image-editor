import { Point, type Transform } from 'fabric'
import { BackgroundTextbox } from '../../../src/editor/text-manager/background-textbox'
import type { EditorTextbox } from '../../../src/editor/text-manager/types'
import type { ObjectBounds } from '../../../src/editor/utils/geometry'
import type { TextWidthResizeControlKey } from '../../../src/editor/text-manager/scaling/text-width-resize-projection'

/** Параметры геометрии для модульной проверки изменения ширины текста. */
type TextWidthResizeProjectionFixtureParams = Readonly<{
  angle?: number
  centered?: boolean
  controlKey: TextWidthResizeControlKey
  scaleX?: number
  width?: number
}>

/** Управляемое исходное состояние изменения ширины текста. */
export type TextWidthResizeProjectionFixture = Readonly<{
  bounds: ObjectBounds
  textbox: EditorTextbox
  transform: Transform
}>

/** Центр согласованной тестовой геометрии в координатах сцены. */
const TEXT_WIDTH_RESIZE_CENTER = Object.freeze({ x: 200, y: 260 })

/** Каноническая высота тестового текста. */
const TEXT_WIDTH_RESIZE_HEIGHT = 60

/** Рассчитывает видимую рамку из той же матрицы, которая передаётся в проекцию. */
function createTextWidthResizeBounds({
  angle,
  scaleX,
  width
}: {
  angle: number
  scaleX: number
  width: number
}): ObjectBounds {
  const radians = angle * (Math.PI / 180)
  const halfWidth = (Math.abs(Math.cos(radians) * scaleX) * width) / 2
    + (Math.abs(Math.sin(radians)) * TEXT_WIDTH_RESIZE_HEIGHT) / 2
  const halfHeight = (Math.abs(Math.sin(radians) * scaleX) * width) / 2
    + (Math.abs(Math.cos(radians)) * TEXT_WIDTH_RESIZE_HEIGHT) / 2
  const { x: centerX, y: centerY } = TEXT_WIDTH_RESIZE_CENTER

  return Object.freeze({
    left: centerX - halfWidth,
    right: centerX + halfWidth,
    top: centerY - halfHeight,
    bottom: centerY + halfHeight,
    centerX,
    centerY
  })
}

/** Создаёт полное преобразование Fabric для боковой ручки. */
function createTextWidthResizeTransform({
  angle,
  centered,
  controlKey,
  radians,
  scaleX,
  textbox,
  width
}: {
  angle: number
  centered: boolean
  controlKey: TextWidthResizeControlKey
  radians: number
  scaleX: number
  textbox: EditorTextbox
  width: number
}): Transform {
  let originX: Transform['originX'] = controlKey === 'mr' ? 'left' : 'right'
  if (centered) originX = 'center'
  const originY = 'center'

  return {
    action: 'resizing',
    actionPerformed: false,
    altKey: centered,
    corner: controlKey,
    ex: 0,
    ey: 0,
    height: TEXT_WIDTH_RESIZE_HEIGHT,
    lastX: 0,
    lastY: 0,
    offsetX: 0,
    offsetY: 0,
    originX,
    originY,
    original: {
      angle,
      flipX: false,
      flipY: false,
      left: TEXT_WIDTH_RESIZE_CENTER.x,
      originX,
      originY,
      scaleX,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      top: TEXT_WIDTH_RESIZE_CENTER.y
    },
    scaleX,
    scaleY: 1,
    shiftKey: false,
    skewX: 0,
    skewY: 0,
    target: textbox,
    theta: radians,
    width
  }
}

/** Создаёт Textbox с управляемой матрицей, границами и неподвижной точкой. */
export function createTextWidthResizeProjectionFixture({
  angle = 0,
  centered = false,
  controlKey,
  scaleX = 1,
  width = 120
}: TextWidthResizeProjectionFixtureParams): TextWidthResizeProjectionFixture {
  const bounds = createTextWidthResizeBounds({ angle, scaleX, width })
  const textbox = new BackgroundTextbox('Текст', {
    width,
    height: TEXT_WIDTH_RESIZE_HEIGHT,
    left: TEXT_WIDTH_RESIZE_CENTER.x,
    top: TEXT_WIDTH_RESIZE_CENTER.y,
    originX: 'center',
    originY: 'center',
    angle,
    scaleX
  }) as EditorTextbox
  const radians = angle * (Math.PI / 180)
  const matrix = [
    Math.cos(radians) * scaleX,
    Math.sin(radians) * scaleX,
    -Math.sin(radians),
    Math.cos(radians),
    TEXT_WIDTH_RESIZE_CENTER.x,
    TEXT_WIDTH_RESIZE_CENTER.y
  ] as const
  const direction = controlKey === 'mr' ? -1 : 1
  const fixedAnchor = centered
    ? new Point(TEXT_WIDTH_RESIZE_CENTER.x, TEXT_WIDTH_RESIZE_CENTER.y)
    : new Point(
      TEXT_WIDTH_RESIZE_CENTER.x + ((direction * matrix[0] * width) / 2),
      TEXT_WIDTH_RESIZE_CENTER.y + ((direction * matrix[1] * width) / 2)
    )

  textbox.calcTransformMatrix = jest.fn(() => [...matrix])
  textbox.getBoundingRect = jest.fn(() => ({
    left: bounds.left,
    top: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top
  }))
  textbox.getPointByOrigin = jest.fn(() => fixedAnchor)

  const transform = createTextWidthResizeTransform({
    angle,
    centered,
    controlKey,
    radians,
    scaleX,
    textbox,
    width
  })

  return Object.freeze({
    bounds,
    textbox,
    transform
  })
}
