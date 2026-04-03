import { Group, Point, Textbox } from 'fabric'

const CHAR_WIDTH_RATIO = 0.55
const SPACE_WIDTH_RATIO = 0.3

type GroupOrigin = 'left' | 'center' | 'right' | 'top' | 'bottom'

type MockCanvas = {
  add: jest.Mock
  remove: jest.Mock
  on: jest.Mock
  off: jest.Mock
  requestRenderAll: jest.Mock
  setActiveObject: jest.Mock
  getActiveObject: jest.Mock
  getObjects: jest.Mock
  getCenterPoint: jest.Mock
}

type PlacementOriginX = 'left' | 'center' | 'right'
type PlacementOriginY = 'top' | 'center' | 'bottom'

type MockShapeNode = {
  shapeNodeType: 'shape'
  width: number
  height: number
  opacity: number
  set: jest.Mock
  setCoords: jest.Mock
}

type MockShapeTextbox = Textbox & {
  shapeNodeType: 'text'
  dynamicMinWidth: number
  autoExpand: boolean
  splitByGrapheme: boolean
  set: jest.Mock
  initDimensions: jest.Mock
  calcTextHeight: jest.Mock
  calcTextWidth: jest.Mock
  setCoords: jest.Mock
  enterEditing: jest.Mock
  exitEditing: jest.Mock
  selectAll: jest.Mock
}

type MockShapeGroup = Group & {
  shapeComposite: boolean
  shapePresetKey: string
  shapeBaseWidth: number
  shapeBaseHeight: number
  shapeManualBaseWidth: number
  shapeManualBaseHeight: number
  shapeAlignHorizontal: 'left' | 'center' | 'right' | 'justify'
  shapeAlignVertical: 'top' | 'middle' | 'bottom'
  shapePaddingTop: number
  shapePaddingRight: number
  shapePaddingBottom: number
  shapePaddingLeft: number
  shapeStrokeWidth: number
  shapeOpacity: number
  shapeRounding: number
  shapeCanRound: boolean
  shapeScalingNoopTransform?: boolean
}

type RenderedTextboxLayout = {
  dynamicMinWidth: number
  lineWidths: number[]
  lines: string[]
}

/**
 * Создаёт минимальный canvas-стаб для shape-тестов.
 */
export const createMockCanvas = (): MockCanvas => {
  const objects: Array<unknown> = []
  let activeObject: unknown = null

  return {
    add: jest.fn((object: unknown) => {
      objects.push(object)
    }),
    remove: jest.fn((object: unknown) => {
      const objectIndex = objects.indexOf(object)
      if (objectIndex >= 0) {
        objects.splice(objectIndex, 1)
      }
    }),
    on: jest.fn(),
    off: jest.fn(),
    requestRenderAll: jest.fn(),
    setActiveObject: jest.fn((object: unknown) => {
      activeObject = object
    }),
    getActiveObject: jest.fn(() => activeObject),
    getObjects: jest.fn(() => [...objects]),
    getCenterPoint: jest.fn(() => new Point(256, 256))
  }
}

/**
 * Создаёт shape-узел с set/setCoords.
 */
export const createMockShapeNode = ({
  width = 180,
  height = 180,
  opacity = 1
}: {
  width?: number
  height?: number
  opacity?: number
} = {}): MockShapeNode => {
  const shape = {
    shapeNodeType: 'shape' as const,
    width,
    height,
    opacity,
    set: jest.fn((updates: Partial<MockShapeNode>) => {
      Object.assign(shape, updates)
    }),
    setCoords: jest.fn()
  }

  return shape
}

/**
 * Эмулирует перенос текста, близкий к поведению Textbox: по словам, а при splitByGrapheme по символам.
 */
function measureTextbox({
  text,
  width,
  fontSize,
  lineHeight,
  splitByGrapheme
}: {
  text: string
  width: number
  fontSize: number
  lineHeight: number
  splitByGrapheme: boolean
}): {
  lines: number
  dynamicMinWidth: number
} {
  if (!text) {
    return {
      lines: 0,
      dynamicMinWidth: 0
    }
  }

  const safeWidth = Math.max(1, width)
  const charWidth = Math.max(1, fontSize * CHAR_WIDTH_RATIO)
  const spaceWidth = Math.max(1, fontSize * SPACE_WIDTH_RATIO)
  const paragraphs = text.split('\n')
  let lineCount = 0
  let maxUnbreakableWidth = 0

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex]

    if (!paragraph) {
      lineCount += 1
      continue
    }

    if (splitByGrapheme) {
      const charsPerLine = Math.max(1, Math.floor(safeWidth / charWidth))
      lineCount += Math.ceil(paragraph.length / charsPerLine)
      maxUnbreakableWidth = Math.max(maxUnbreakableWidth, charWidth)
      continue
    }

    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lineCount += 1
      continue
    }

    let currentLineWidth = 0
    for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
      const word = words[wordIndex]
      const wordWidth = word.length * charWidth
      maxUnbreakableWidth = Math.max(maxUnbreakableWidth, wordWidth)

      if (currentLineWidth === 0) {
        currentLineWidth = wordWidth
        continue
      }

      if (currentLineWidth + spaceWidth + wordWidth <= safeWidth) {
        currentLineWidth += spaceWidth + wordWidth
        continue
      }

      lineCount += 1
      currentLineWidth = wordWidth
    }

    lineCount += 1
  }

  const minHeight = lineCount > 0
    ? lineCount * fontSize * lineHeight
    : 0

  if (!Number.isFinite(minHeight)) {
    return {
      lines: 0,
      dynamicMinWidth: 0
    }
  }

  return {
    lines: lineCount,
    dynamicMinWidth: maxUnbreakableWidth
  }
}

/**
 * Эмулирует перенос строк для shape-textbox в тестах auto-expand helper'а.
 */
export function measureRenderedTextboxLayout({
  text,
  frameWidth,
  fontSize,
  splitByGrapheme
}: {
  text: string
  frameWidth: number
  fontSize: number
  splitByGrapheme: boolean
}): RenderedTextboxLayout {
  if (!text) {
    return {
      dynamicMinWidth: 0,
      lineWidths: [],
      lines: []
    }
  }

  const charWidth = Math.max(1, fontSize * CHAR_WIDTH_RATIO)
  const spaceWidth = Math.max(1, fontSize * SPACE_WIDTH_RATIO)
  const paragraphs = text.split('\n')
  const lineWidths: number[] = []
  const lines: string[] = []
  let dynamicMinWidth = 0

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex]

    if (!paragraph) {
      lines.push('')
      lineWidths.push(0)
      continue
    }

    if (splitByGrapheme) {
      const charsPerLine = Math.max(1, Math.floor(frameWidth / charWidth))

      for (let start = 0; start < paragraph.length; start += charsPerLine) {
        const chunk = paragraph.slice(start, start + charsPerLine)
        lines.push(chunk)
        lineWidths.push(chunk.length * charWidth)
      }

      dynamicMinWidth = Math.max(dynamicMinWidth, charWidth)
      continue
    }

    const words = paragraph.split(/\s+/).filter(Boolean)

    if (!words.length) {
      lines.push('')
      lineWidths.push(0)
      continue
    }

    let currentLine = words[0]
    let currentWidth = words[0].length * charWidth
    dynamicMinWidth = Math.max(dynamicMinWidth, currentWidth)

    for (let wordIndex = 1; wordIndex < words.length; wordIndex += 1) {
      const word = words[wordIndex]
      const wordWidth = word.length * charWidth
      dynamicMinWidth = Math.max(dynamicMinWidth, wordWidth)

      if (currentWidth + spaceWidth + wordWidth <= frameWidth) {
        currentLine += ` ${word}`
        currentWidth += spaceWidth + wordWidth
        continue
      }

      lines.push(currentLine)
      lineWidths.push(currentWidth)
      currentLine = word
      currentWidth = wordWidth
    }

    lines.push(currentLine)
    lineWidths.push(currentWidth)
  }

  return {
    dynamicMinWidth,
    lineWidths,
    lines
  }
}

/**
 * Создаёт textbox-узел со стабильным расчётом переносов и высоты.
 */
export const createMockShapeTextbox = ({
  text = '',
  width = 180,
  fontSize = 48,
  lineHeight = 1.16,
  textAlign = 'center'
}: {
  text?: string
  width?: number
  fontSize?: number
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right' | 'justify'
} = {}): MockShapeTextbox => {
  const textbox = new Textbox(text, {
    width,
    fontSize,
    lineHeight,
    textAlign,
    originX: 'left',
    originY: 'top'
  }) as MockShapeTextbox

  textbox.shapeNodeType = 'text'
  textbox.autoExpand = false
  textbox.splitByGrapheme = false
  textbox.dynamicMinWidth = 0

  const baseSet = Textbox.prototype.set.bind(textbox)
  textbox.set = jest.fn((updates: Record<string, unknown>) => {
    baseSet(updates)
  }) as never
  textbox.setCoords = jest.fn() as never

  textbox.enterEditing = jest.fn(() => {
    textbox.isEditing = true
  }) as never
  textbox.exitEditing = jest.fn(() => {
    textbox.isEditing = false
  }) as never
  textbox.selectAll = jest.fn(() => {
    const content = textbox.text ?? ''
    textbox.selectionStart = 0
    textbox.selectionEnd = content.length
  }) as never

  textbox.initDimensions = jest.fn(() => {
    const {
      lines,
      dynamicMinWidth
    } = measureTextbox({
      text: textbox.text ?? '',
      width: Math.max(1, Number(textbox.width) || 1),
      fontSize: Number(textbox.fontSize) || fontSize,
      lineHeight: Number(textbox.lineHeight) || lineHeight,
      splitByGrapheme: Boolean(textbox.splitByGrapheme)
    })

    textbox.dynamicMinWidth = dynamicMinWidth
    textbox.height = lines > 0
      ? lines * (Number(textbox.fontSize) || fontSize) * (Number(textbox.lineHeight) || lineHeight)
      : 0
  }) as never

  textbox.calcTextHeight = jest.fn(() => Number(textbox.height) || 0) as never
  textbox.calcTextWidth = jest.fn(() => Number(textbox.width) || 0) as never

  textbox.initDimensions()

  return textbox
}

/**
 * Создаёт textbox с предсказуемым переносом строк для тестов auto-expand helper'а.
 */
export function createMeasuredAutoExpandTextbox({
  text,
  width,
  fontSize = 48,
  lineHeight = 1.16
}: {
  text: string
  width: number
  fontSize?: number
  lineHeight?: number
}): MockShapeTextbox {
  const textbox = createMockShapeTextbox({
    text,
    width,
    fontSize,
    lineHeight
  })
  let renderedLayout: RenderedTextboxLayout = {
    dynamicMinWidth: 0,
    lineWidths: [],
    lines: []
  }

  textbox.getLineWidth = jest.fn((lineIndex: number) => renderedLayout.lineWidths[lineIndex] ?? 0) as never
  textbox.initDimensions = jest.fn(() => {
    renderedLayout = measureRenderedTextboxLayout({
      text: textbox.text ?? '',
      frameWidth: Math.max(1, Number(textbox.width) || 1),
      fontSize: Number(textbox.fontSize) || fontSize,
      splitByGrapheme: Boolean(textbox.splitByGrapheme)
    })

    textbox.dynamicMinWidth = renderedLayout.dynamicMinWidth
    textbox.textLines = renderedLayout.lines
    textbox.height = renderedLayout.lines.length > 0
      ? renderedLayout.lines.length * (Number(textbox.fontSize) || fontSize) * (Number(textbox.lineHeight) || lineHeight)
      : 0
  }) as never

  textbox.initDimensions()

  return textbox
}

/**
 * Создаёт shape-группу с метаданными и внутренними узлами.
 */
export const createMockShapeGroup = ({
  shape,
  text,
  left = 400,
  top = 300,
  width = 180,
  height = 180,
  presetKey = 'square'
}: {
  shape: MockShapeNode
  text: MockShapeTextbox
  left?: number
  top?: number
  width?: number
  height?: number
  presetKey?: string
}): MockShapeGroup => {
  const group = new Group([shape, text], {
    left,
    top,
    width,
    height
  }) as MockShapeGroup

  group.shapeComposite = true
  group.shapePresetKey = presetKey
  group.shapeBaseWidth = width
  group.shapeBaseHeight = height
  group.shapeManualBaseWidth = width
  group.shapeManualBaseHeight = height
  group.shapeAlignHorizontal = 'center'
  group.shapeAlignVertical = 'middle'
  group.shapePaddingTop = 0
  group.shapePaddingRight = 0
  group.shapePaddingBottom = 0
  group.shapePaddingLeft = 0
  group.shapeStrokeWidth = 0
  group.shapeOpacity = 1
  group.shapeRounding = 0
  group.shapeCanRound = true
  group.scaleX = 1
  group.scaleY = 1
  group.flipX = false
  group.flipY = false
  group.lockScalingFlip = true
  group.centeredScaling = false
  group.setCoords = jest.fn() as never

  group.getCenterPoint = jest.fn(() => new Point(
    Number(group.left) || 0,
    Number(group.top) || 0
  )) as never
  group.getRelativeCenterPoint = jest.fn(() => new Point(
    Number(group.left) || 0,
    Number(group.top) || 0
  )) as never
  group.translateToOriginPoint = jest.fn((
    point: Point,
    originX: PlacementOriginX,
    originY: PlacementOriginY
  ) => {
    const groupWidth = (group.width ?? 0) * (group.scaleX ?? 1)
    const groupHeight = (group.height ?? 0) * (group.scaleY ?? 1)
    let nextX = point.x
    let nextY = point.y

    if (originX === 'left') {
      nextX -= groupWidth / 2
    } else if (originX === 'right') {
      nextX += groupWidth / 2
    }

    if (originY === 'top') {
      nextY -= groupHeight / 2
    } else if (originY === 'bottom') {
      nextY += groupHeight / 2
    }

    return new Point(nextX, nextY)
  }) as never

  group.setPositionByOrigin = jest.fn((
    point: Point,
    originX: GroupOrigin,
    originY: GroupOrigin
  ) => {
    const groupWidth = (group.width ?? 0) * (group.scaleX ?? 1)
    const groupHeight = (group.height ?? 0) * (group.scaleY ?? 1)
    let nextLeft = point.x
    let nextTop = point.y

    if (originX === 'left') {
      nextLeft += groupWidth / 2
    } else if (originX === 'right') {
      nextLeft -= groupWidth / 2
    }

    if (originY === 'top') {
      nextTop += groupHeight / 2
    } else if (originY === 'bottom') {
      nextTop -= groupHeight / 2
    }

    group.left = nextLeft
    group.top = nextTop
  }) as never
  group.getPointByOrigin = jest.fn((
    originX: PlacementOriginX,
    originY: PlacementOriginY
  ) => {
    const groupWidth = (group.width ?? 0) * (group.scaleX ?? 1)
    const groupHeight = (group.height ?? 0) * (group.scaleY ?? 1)
    let x = group.left ?? 0
    let y = group.top ?? 0

    if (originX === 'left') {
      x -= groupWidth / 2
    } else if (originX === 'right') {
      x += groupWidth / 2
    }

    if (originY === 'top') {
      y -= groupHeight / 2
    } else if (originY === 'bottom') {
      y += groupHeight / 2
    }

    return new Point(x, y)
  }) as never

  const textWithGroup = text as { group?: Group }
  textWithGroup.group = group

  return group
}

/**
 * Создаёт редактор-стаб для unit-тестов ShapeManager,
 * при необходимости сразу добавляя монтажную область для веток auto-expand.
 */
export const createShapeManagerEditorStub = ({
  canvas,
  montageAreaWidth
}: {
  canvas?: MockCanvas
  montageAreaWidth?: number
} = {}) => {
  const resolvedCanvas = canvas ?? createMockCanvas()
  const resolvedMontageAreaWidth = Number.isFinite(montageAreaWidth)
    ? Math.max(1, Number(montageAreaWidth))
    : 400
  const montageArea = {
    width: resolvedMontageAreaWidth,
    height: 300,
    left: resolvedMontageAreaWidth / 2,
    top: 150,
    setCoords: jest.fn(),
    getBoundingRect: jest.fn(() => ({
      left: 0,
      top: 0,
      width: resolvedMontageAreaWidth,
      height: 300
    }))
  }

  return {
    canvas: resolvedCanvas,
    canvasManager: {
      centerObjectToMontageArea: jest.fn(({ object }: { object: Group }) => {
        object.setPositionByOrigin(new Point(montageArea.left, montageArea.top), 'center', 'center')
        object.setCoords()
      }),
      getMontageAreaSceneCenter: jest.fn(() => new Point(montageArea.left, montageArea.top)),
      getObjectPlacement: jest.fn(({
        object,
        originX,
        originY
      }: {
        object: Group
        originX?: PlacementOriginX
        originY?: PlacementOriginY
      }) => {
        const resolvedOriginX = originX ?? object.originX ?? 'center'
        const resolvedOriginY = originY ?? object.originY ?? 'center'
        const point = object.getPointByOrigin(resolvedOriginX, resolvedOriginY)

        return {
          left: point.x,
          top: point.y,
          originX: resolvedOriginX,
          originY: resolvedOriginY
        }
      }),
      getMontageAreaSceneBounds: jest.fn(() => ({
        left: 0,
        top: 0,
        right: montageArea.width,
        bottom: montageArea.height,
        width: montageArea.width,
        height: montageArea.height,
        center: new Point(montageArea.left, montageArea.top)
      })),
      resolveObjectPlacement: jest.fn(({
        object,
        left,
        top,
        originX,
        originY,
        fallbackPoint
      }: {
        object: Group
        left?: number
        top?: number
        originX?: PlacementOriginX
        originY?: PlacementOriginY
        fallbackPoint?: Point
      }) => {
        const resolvedOriginX = originX ?? object.originX ?? 'center'
        const resolvedOriginY = originY ?? object.originY ?? 'center'
        const basePoint = fallbackPoint ?? object.getPointByOrigin(resolvedOriginX, resolvedOriginY)

        return {
          left: left ?? basePoint.x,
          top: top ?? basePoint.y,
          originX: resolvedOriginX,
          originY: resolvedOriginY
        }
      }),
      applyObjectPlacement: jest.fn(({
        object,
        placement
      }: {
        object: Group
        placement: {
          left: number
          top: number
          originX: PlacementOriginX
          originY: PlacementOriginY
        }
      }) => {
        object.originX = placement.originX
        object.originY = placement.originY
        object.setPositionByOrigin(
          new Point(placement.left, placement.top),
          placement.originX,
          placement.originY
        )
        object.setCoords()
      })
    },
    textManager: {
      addText: jest.fn((style: Record<string, unknown>) => createMockShapeTextbox({
        text: String(style.text ?? ''),
        width: Number(style.width) || 180,
        textAlign: (style.align as 'left' | 'center' | 'right' | 'justify') ?? 'center'
      })),
      updateText: jest.fn()
    },
    historyManager: {
      suspendHistory: jest.fn(),
      resumeHistory: jest.fn(),
      saveState: jest.fn()
    },
    montageArea
  }
}

/**
 * Возвращает зарегистрированный canvas-handler по имени события.
 */
export const getCanvasHandler = <TPayload = unknown>({
  canvas,
  eventName
}: {
  canvas: {
    on: jest.Mock
  }
  eventName: string
}): ((payload: TPayload) => void) | null => {
  const calls = canvas.on.mock.calls

  for (let callIndex = 0; callIndex < calls.length; callIndex += 1) {
    const [
      currentEventName,
      handler
    ] = calls[callIndex]

    if (currentEventName === eventName && typeof handler === 'function') {
      return handler as (payload: TPayload) => void
    }
  }

  return null
}

/**
 * Применяет text style к mock textbox в shape unit-тестах.
 */
export const applyTextStyleToShapeText = ({
  target,
  style
}: {
  target: {
    set: (updates: Record<string, unknown>) => void
    autoExpand?: boolean
  }
  style: Record<string, unknown>
}): void => {
  const nextStyle: Record<string, unknown> = {}
  const styleKeys = Object.keys(style)

  for (let index = 0; index < styleKeys.length; index += 1) {
    const key = styleKeys[index]
    const value = style[key]

    if (key === 'align') {
      nextStyle.textAlign = value
      continue
    }

    nextStyle[key] = value
  }

  target.set(nextStyle)
  target.autoExpand = false
}
