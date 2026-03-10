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
  shapeAlignHorizontal: 'left' | 'center' | 'right'
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
  textAlign?: 'left' | 'center' | 'right'
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
  group.shapePaddingTop = 0.2
  group.shapePaddingRight = 0.2
  group.shapePaddingBottom = 0.2
  group.shapePaddingLeft = 0.2
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

  group.setPositionByOrigin = jest.fn((
    point: Point,
    originX: GroupOrigin,
    originY: GroupOrigin
  ) => {
    if (originX === 'center' && originY === 'center') {
      group.left = point.x
      group.top = point.y
    }
  }) as never

  const textWithGroup = text as { group?: Group }
  textWithGroup.group = group

  return group
}

/**
 * Создаёт редактор-стаб для unit-тестов ShapeManager.
 */
export const createShapeManagerEditorStub = ({
  canvas
}: {
  canvas?: MockCanvas
} = {}) => {
  const resolvedCanvas = canvas ?? createMockCanvas()

  return {
    canvas: resolvedCanvas,
    textManager: {
      addText: jest.fn((style: Record<string, unknown>) => createMockShapeTextbox({
        text: String(style.text ?? ''),
        width: Number(style.width) || 180,
        textAlign: (style.align as 'left' | 'center' | 'right') ?? 'center'
      })),
      updateText: jest.fn()
    },
    historyManager: {
      suspendHistory: jest.fn(),
      resumeHistory: jest.fn(),
      saveState: jest.fn()
    }
  }
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
