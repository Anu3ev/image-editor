export type BrowserObject = Record<string, unknown>

export type BrowserGroupObject = BrowserObject & {
  getObjects: () => unknown
}

export type BrowserBoundedObject = BrowserObject & {
  getBoundingRect: () => unknown
}

export type BrowserShapeNodeObject = BrowserObject & {
  shapeNodeType?: string
  strokeUniform?: unknown
  strokeWidth?: unknown
}

export type BrowserSerializableObject = BrowserObject & {
  id?: unknown
  type?: unknown
  left?: unknown
  top?: unknown
  width?: unknown
  height?: unknown
  scaleX?: unknown
  scaleY?: unknown
  angle?: unknown
  fill?: unknown
  stroke?: unknown
  strokeWidth?: unknown
  opacity?: unknown
  visible?: unknown
  selectable?: unknown
  flipX?: unknown
  flipY?: unknown
  shapeComposite?: unknown
  shapePresetKey?: unknown
  shapeAlignHorizontal?: unknown
  shapeAlignVertical?: unknown
  shapeFill?: unknown
  shapeStroke?: unknown
  shapeStrokeWidth?: unknown
  shapeOpacity?: unknown
  shapeRounding?: unknown
  text?: unknown
  textAlign?: unknown
  fontFamily?: unknown
  fontSize?: unknown
  fontWeight?: unknown
  fontStyle?: unknown
  underline?: unknown
  linethrough?: unknown
  uppercase?: unknown
  isEditing?: unknown
  evented?: unknown
  lockMovementX?: unknown
  lockMovementY?: unknown
  selectionStart?: unknown
  selectionEnd?: unknown
  getSelectionStyles?: (...args: unknown[]) => unknown
}

export type BrowserTextSelectionStyleInfo = {
  fill: string | null
  stroke: string | null
  strokeWidth: number | null
  fontSize: number | null
  fontWeight: string | null
  fontStyle: string | null
  underline: boolean | null
  linethrough: boolean | null
}

export type BrowserTextSelectionStyleParams = {
  objectIndex?: number
  id?: string
  start?: number
  end?: number
}

export type BrowserSerializer = (obj: unknown) => Record<string, unknown>

export interface BrowserEditorHelpers {
  serializeEditorObject: BrowserSerializer
  serializeShapeObject: BrowserSerializer
  serializeShapeTextObject: BrowserSerializer
  serializeShapeScaleSnapshot: BrowserSerializer
  resolveShapeNode: (group: unknown) => BrowserObject | null
  resolveTarget: (objectIndex?: number, id?: string) => unknown
  resolveCanvasObject: (objectIndex?: number, id?: string) => unknown
  getShapeTextSelectionStyles: (params: BrowserTextSelectionStyleParams) => BrowserTextSelectionStyleInfo | null
}

export interface BoundsInfo {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
}

export interface NullableBoundsInfo {
  left: number | null
  top: number | null
  width: number | null
  height: number | null
}

export interface BrowserEditorWindow extends Window {
  editor: {
    canvasManager: {
      getObjects: () => unknown
    }
  }
  __editorHelpers: BrowserEditorHelpers
}
