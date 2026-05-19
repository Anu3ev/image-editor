import { ActiveSelection, Textbox } from 'fabric'
import HistoryManager from '../../../src/editor/history-manager'
import TextManager from '../../../src/editor/text-manager'
import type { EditorFontDefinition } from '../../../src/editor/types/font'
import { createSimpleDiffPatcher } from '../shared/diff-patcher'
import { createCanvasManagerTestStub } from '../editor/editor-stub'
import type { AnyFn } from '../shared/types'

const serializeTextboxState = (textbox: Textbox) => {
  const textboxWithCharStyles = textbox as Textbox & {
    __getCharStyles?: () => unknown
  }

  return {
    type: 'textbox',
    id: textbox.id,
    selectable: textbox.selectable,
    evented: textbox.evented,
    backgroundId: textbox.backgroundId,
    customData: textbox.customData,
    backgroundType: textbox.backgroundType,
    format: textbox.format,
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
    originY: textbox.originY,
    locked: textbox.locked,
    lockMovementX: textbox.lockMovementX,
    lockMovementY: textbox.lockMovementY,
    lockRotation: textbox.lockRotation,
    lockScalingX: textbox.lockScalingX,
    lockScalingY: textbox.lockScalingY,
    lockSkewingX: textbox.lockSkewingX,
    lockSkewingY: textbox.lockSkewingY,
    styles: (() => {
      if (typeof textboxWithCharStyles.__getCharStyles !== 'function') return undefined
      const charStyles = textboxWithCharStyles.__getCharStyles()
      if (!charStyles || typeof charStyles !== 'object') return undefined
      return JSON.parse(JSON.stringify(charStyles))
    })()
  }
}

export type TextManagerTestSetupOptions = {
  fonts?: EditorFontDefinition[]
  maxHistoryLength?: number
}

export type TextManagerTestSetupResult = {
  editor: any
  canvas: any
  historyManager: HistoryManager
  textManager: TextManager
  getObjects: () => Textbox[]
}

export const createTextManagerTestSetup = (
  options: TextManagerTestSetupOptions = {}
): TextManagerTestSetupResult => {
  const {
    fonts = [{
      family: 'Roboto',
      source: '/fonts/roboto.woff2'
    }],
    maxHistoryLength = 10
  } = options

  const handlers: Record<string, AnyFn[]> = {}
  let objects: Textbox[] = []
  let activeObject: Textbox | null = null

  const dispatch = (event: string, payload: any) => {
    const registered = handlers[event]
    if (!registered) return
    registered.forEach((handler) => handler(payload))
  }

  const fireMock = jest.fn((event: string, payload: any) => {
    dispatch(event, payload)
  })

  const canvas = {
    clipPath: null,
    on: jest.fn((event: string, handler: AnyFn) => {
      handlers[event] = handlers[event] || []
      handlers[event]!.push(handler)
    }),
    off: jest.fn((event: string, handler: AnyFn) => {
      const registered = handlers[event]
      if (!registered) return
      handlers[event] = registered.filter((item) => item !== handler)
    }),
    add: jest.fn((textbox: Textbox) => {
      objects.push(textbox)
      activeObject = textbox
      dispatch('object:added', { target: textbox })
    }),
    remove: jest.fn((textbox: Textbox) => {
      objects = objects.filter((item) => item !== textbox)
      dispatch('object:removed', { target: textbox })
    }),
    centerObject: jest.fn((textbox: Textbox) => {
      if (textbox.left === undefined) textbox.left = 400
      if (textbox.top === undefined) textbox.top = 300
    }),
    setActiveObject: jest.fn((textbox: Textbox) => {
      activeObject = textbox
    }),
    discardActiveObject: jest.fn(() => {
      if (activeObject && (activeObject as any).type === 'activeSelection') {
        const selection = activeObject as unknown as ActiveSelection
        const selectionObjects = selection.getObjects()
        const { scaleX = 1, scaleY = 1 } = selection

        selectionObjects.forEach((obj: any) => {
          const currentScaleX = obj.scaleX ?? 1
          const currentScaleY = obj.scaleY ?? 1

          obj.scaleX = currentScaleX * scaleX
          obj.scaleY = currentScaleY * scaleY
        })
      }
      activeObject = null
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
      objects: objects.map((textbox) => serializeTextboxState(textbox))
    })),
    loadFromJSON: jest.fn(async(
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

  const montageArea = {
    id: 'montage-area',
    width: 400,
    height: 300,
    left: 200,
    top: 150,
    setCoords: jest.fn(),
    getBoundingRect: jest.fn(() => ({
      left: 0,
      top: 0,
      width: 400,
      height: 300
    }))
  }

  const editor = {
    canvas,
    options: {
      fonts,
      maxHistoryLength
    },
    canvasManager: createCanvasManagerTestStub({
      canvas,
      montageArea,
      getObjects: () => objects
    }),
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
    montageArea,
    errorManager: {
      emitError: jest.fn()
    },
    snappingManager: {
      applyTextResizingSnap: jest.fn()
    },
    shapeManager: {
      commitRehydratedShapeLayout: jest.fn()
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
