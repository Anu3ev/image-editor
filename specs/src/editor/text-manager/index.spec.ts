import { nanoid } from 'nanoid'
import TextManager from '../../../../src/editor/text-manager'
import HistoryManager from '../../../../src/editor/history-manager'
import type { EditorFontDefinition } from '../../../../src/editor/types/font'
import { Textbox } from 'fabric'

jest.mock('nanoid')

type Handler = (payload: any) => void

type TextManagerTestSetup = {
  editor: any
  canvas: any
  historyManager: HistoryManager
  textManager: TextManager
  getObjects: () => Textbox[]
}

const createSimpleDiffPatcher = () => ({
  diff: jest.fn((prev: any, next: any) => {
    const prevStr = JSON.stringify(prev)
    const nextStr = JSON.stringify(next)
    if (prevStr === nextStr) return null
    return { next: JSON.parse(nextStr) }
  }),
  patch: jest.fn((state: any, diff: any) => {
    if (!diff) {
      return JSON.parse(JSON.stringify(state))
    }
    return JSON.parse(JSON.stringify(diff.next))
  })
})

const serializeTextbox = (textbox: Textbox) => ({
  type: 'textbox',
  id: textbox.id,
  text: textbox.text,
  textCaseRaw: textbox.textCaseRaw,
  uppercase: textbox.uppercase,
  fontFamily: textbox.fontFamily,
  fontSize: textbox.fontSize,
  fontWeight: textbox.fontWeight,
  fontStyle: textbox.fontStyle,
  underline: textbox.underline,
  linethrough: textbox.linethrough,
  textAlign: textbox.textAlign,
  fill: textbox.fill,
  stroke: textbox.stroke,
  strokeWidth: textbox.strokeWidth,
  opacity: textbox.opacity,
  left: textbox.left,
  top: textbox.top,
  width: textbox.width,
  height: textbox.height,
  angle: textbox.angle,
  scaleX: textbox.scaleX,
  scaleY: textbox.scaleY,
  originX: textbox.originX,
  originY: textbox.originY
})

const createTextManagerTestSetup = (): TextManagerTestSetup => {
  const handlers: Record<string, Handler[]> = {}
  let objects: Textbox[] = []
  let activeObject: Textbox | null = null

  const dispatch = (event: string, payload: any) => {
    const list = handlers[event]
    if (!list) return
    list.forEach((handler) => handler(payload))
  }

  const fireMock = jest.fn((event: string, payload: any) => {
    dispatch(event, payload)
  })

  const canvas = {
    clipPath: null,
    on: jest.fn((event: string, handler: Handler) => {
      handlers[event] = handlers[event] || []
      handlers[event]?.push(handler)
    }),
    off: jest.fn((event: string, handler: Handler) => {
      const list = handlers[event]
      if (!list) return
      handlers[event] = list.filter((registered) => registered !== handler)
    }),
    add: jest.fn((obj: Textbox) => {
      objects.push(obj)
      activeObject = obj
      dispatch('object:added', { target: obj })
    }),
    remove: jest.fn((obj: Textbox) => {
      objects = objects.filter((item) => item !== obj)
      dispatch('object:removed', { target: obj })
    }),
    centerObject: jest.fn((obj: Textbox) => {
      if (obj.left === undefined) obj.left = 400
      if (obj.top === undefined) obj.top = 300
    }),
    setActiveObject: jest.fn((obj: Textbox) => {
      activeObject = obj
    }),
    getActiveObject: jest.fn(() => activeObject),
    requestRenderAll: jest.fn(),
    fire: fireMock,
    getObjects: jest.fn(() => [...objects]),
    getWidth: jest.fn(() => 800),
    getHeight: jest.fn(() => 600),
    renderAll: jest.fn(),
    setDimensions: jest.fn(),
    setViewportTransform: jest.fn(),
    toDatalessObject: jest.fn(() => ({
      version: '5.0.0',
      width: 800,
      height: 600,
      clipPath: null,
      objects: objects.map((obj) => serializeTextbox(obj))
    })),
    loadFromJSON: jest.fn(async (
      state: any,
      reviver?: (serializedObj: any, fabricObject: any) => void
    ) => {
      const serializedObjects = state?.objects ?? []
      objects = serializedObjects.map((data: any) => {
        const textbox = new Textbox(data.text ?? '', data)
        if (typeof data.textCaseRaw !== 'undefined') {
          textbox.textCaseRaw = data.textCaseRaw
        }
        if (typeof data.uppercase !== 'undefined') {
          textbox.uppercase = data.uppercase
        }
        if (reviver) {
          reviver(data, textbox as any)
        }
        return textbox
      })
      activeObject = objects[objects.length - 1] ?? null
    })
  } as any

  const fonts: EditorFontDefinition[] = [{
    family: 'Roboto',
    source: '/fonts/roboto.woff2'
  }]

  const editor = {
    canvas,
    options: {
      maxHistoryLength: 10,
      fonts
    },
    canvasManager: {
      updateCanvas: jest.fn()
    },
    interactionBlocker: {
      overlayMask: null,
      refresh: jest.fn(),
      isBlocked: false
    },
    backgroundManager: {
      backgroundObject: null,
      removeBackground: jest.fn(),
      refresh: jest.fn()
    },
    montageArea: {
      id: 'montage-area',
      width: 400,
      height: 300
    },
    errorManager: {
      emitError: jest.fn()
    }
  } as any

  const historyManager = new HistoryManager({ editor })
  historyManager.diffPatcher = createSimpleDiffPatcher() as any
  editor.historyManager = historyManager

  const textManager = new TextManager({ editor })

  return {
    editor,
    canvas,
    historyManager,
    textManager,
    getObjects: () => [...objects]
  }
}

describe('TextManager', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'mocked-id')
  })

  describe('addText', () => {
    it('создаёт текстовый объект, центрирует, выделяет и сохраняет историю', () => {
      const {
        canvas,
        historyManager,
        textManager,
        getObjects
      } = createTextManagerTestSetup()

      historyManager.saveState()
      canvas.on('object:added', () => historyManager.saveState())
      const saveSpy = jest.spyOn(historyManager, 'saveState')

      const textbox = textManager.addText({ text: 'Привет' })

      expect(canvas.add).toHaveBeenCalledWith(textbox)
      expect(canvas.centerObject).toHaveBeenCalledWith(textbox)
      expect(canvas.setActiveObject).toHaveBeenCalledWith(textbox)
      expect(canvas.requestRenderAll).toHaveBeenCalledTimes(1)

      expect(textbox.id).toBe('text-mocked-id')
      expect(textbox.text).toBe('Привет')
      expect(textbox.textCaseRaw).toBe('Привет')

      expect(canvas.fire).toHaveBeenCalledWith('editor:text-added', expect.objectContaining({
        textbox,
        options: expect.objectContaining({ text: 'Привет' })
      }))

      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(historyManager.totalChangesCount).toBe(1)
      expect(historyManager.currentIndex).toBe(1)
      expect(getObjects()).toHaveLength(1)

      const state = historyManager.getFullState()
      expect(state.objects).toHaveLength(1)
      expect(state.objects?.[0]?.text).toBe('Привет')
    })
  })

  describe('updateText', () => {
    it('обновляет стиль текста, сохраняет историю и отправляет событие', () => {
      const {
        canvas,
        historyManager,
        textManager,
        getObjects
      } = createTextManagerTestSetup()

      historyManager.saveState()
      canvas.on('object:added', () => historyManager.saveState())

      const baseTextbox = textManager.addText({ text: 'до обновления' })

      const saveSpy = jest.spyOn(historyManager, 'saveState')
      canvas.requestRenderAll.mockClear()
      canvas.fire.mockClear()

      textManager.updateText(baseTextbox, {
        text: 'после обновления',
        fontFamily: 'Roboto',
        fontSize: 72,
        bold: true,
        italic: true,
        underline: true,
        uppercase: true,
        strikethrough: true,
        align: 'center',
        color: '#ff0000',
        strokeColor: '#00ff00',
        strokeWidth: 3,
        opacity: 0.5
      })

      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(canvas.requestRenderAll).toHaveBeenCalledTimes(1)
      expect(canvas.fire).toHaveBeenCalledWith('editor:text-updated', expect.objectContaining({
        textbox: baseTextbox,
        target: baseTextbox,
        style: expect.objectContaining({ text: 'после обновления' }),
        before: expect.objectContaining({ text: 'до обновления' }),
        after: expect.objectContaining({ text: 'ПОСЛЕ ОБНОВЛЕНИЯ' })
      }))

      expect(baseTextbox.text).toBe('ПОСЛЕ ОБНОВЛЕНИЯ')
      expect(baseTextbox.textCaseRaw).toBe('после обновления')
      expect(baseTextbox.uppercase).toBe(true)
      expect(baseTextbox.fontFamily).toBe('Roboto')
      expect(baseTextbox.fontSize).toBe(72)
      expect(baseTextbox.fontWeight).toBe('bold')
      expect(baseTextbox.fontStyle).toBe('italic')
      expect(baseTextbox.underline).toBe(true)
      expect(baseTextbox.linethrough).toBe(true)
      expect(baseTextbox.textAlign).toBe('center')
      expect(baseTextbox.fill).toBe('#ff0000')
      expect(baseTextbox.stroke).toBe('#00ff00')
      expect(baseTextbox.strokeWidth).toBe(3)
      expect(baseTextbox.opacity).toBe(0.5)

      expect(historyManager.totalChangesCount).toBe(2)
      expect(historyManager.currentIndex).toBe(2)
      expect(getObjects()).toHaveLength(1)

      saveSpy.mockClear()
      canvas.requestRenderAll.mockClear()

      textManager.updateText(baseTextbox, { text: 'без истории' }, {
        withoutSave: true,
        skipRender: true
      })

      expect(saveSpy).not.toHaveBeenCalled()
      expect(canvas.requestRenderAll).not.toHaveBeenCalled()
      expect(baseTextbox.text).toBe('БЕЗ ИСТОРИИ')
      expect(historyManager.totalChangesCount).toBe(2)
    })
  })

  describe('HistoryManager интеграция', () => {
    it('поддерживает undo/redo для добавления и обновления текста', async () => {
      const {
        canvas,
        historyManager,
        textManager,
        getObjects
      } = createTextManagerTestSetup()

      historyManager.saveState()
      canvas.on('object:added', () => historyManager.saveState())

      const textbox = textManager.addText({ text: 'версия 1' })
      expect(getObjects()).toHaveLength(1)
      expect(getObjects()[0]?.text).toBe('версия 1')

      textManager.updateText(textbox, { text: 'версия 2' })
      expect(getObjects()[0]?.text).toBe('версия 2')

      await historyManager.undo()
      expect(getObjects()).toHaveLength(1)
      expect(getObjects()[0]?.text).toBe('версия 1')

      await historyManager.undo()
      expect(getObjects()).toHaveLength(0)

      await historyManager.redo()
      expect(getObjects()).toHaveLength(1)
      expect(getObjects()[0]?.text).toBe('версия 1')

      await historyManager.redo()
      expect(getObjects()).toHaveLength(1)
      expect(getObjects()[0]?.text).toBe('версия 2')
    })
  })
})
