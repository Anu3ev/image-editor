export type BrowserObject = Record<string, unknown>

export type BrowserGroupObject = BrowserObject & {
  getObjects: () => unknown
}

export type BrowserBoundedObject = BrowserObject & {
  getBoundingRect: () => unknown
}

export type BrowserOriginPointObject = BrowserBoundedObject & {
  getPointByOrigin: (originX: string, originY: string) => unknown
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
  locked?: unknown
  flipX?: unknown
  flipY?: unknown
  shapeComposite?: unknown
  shapePresetKey?: unknown
  shapeTextAutoExpand?: unknown
  shapeAlignHorizontal?: unknown
  shapeAlignVertical?: unknown
  shapePaddingTop?: unknown
  shapePaddingRight?: unknown
  shapePaddingBottom?: unknown
  shapePaddingLeft?: unknown
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
  lineHeight?: unknown
  underline?: unknown
  linethrough?: unknown
  uppercase?: unknown
  autoExpand?: unknown
  splitByGrapheme?: unknown
  isEditing?: unknown
  evented?: unknown
  lockMovementX?: unknown
  lockMovementY?: unknown
  selectionStart?: unknown
  selectionEnd?: unknown
  textLines?: unknown
  backgroundColor?: unknown
  backgroundOpacity?: unknown
  backgroundType?: unknown
  paddingTop?: unknown
  paddingRight?: unknown
  paddingBottom?: unknown
  paddingLeft?: unknown
  radiusTopLeft?: unknown
  radiusTopRight?: unknown
  radiusBottomRight?: unknown
  radiusBottomLeft?: unknown
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

export type BrowserSnappingGuideInfo = {
  type: 'vertical' | 'horizontal'
  position: number
}

export type BrowserSnappingSpacingGuideInfo = {
  type: 'vertical' | 'horizontal'
  axis: number
  refStart: number
  refEnd: number
  activeStart: number
  activeEnd: number
  distance: number
}

export type BrowserSnappingGuideState = {
  guides: BrowserSnappingGuideInfo[]
  spacingGuides: BrowserSnappingSpacingGuideInfo[]
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
  serializeBackgroundObject: BrowserSerializer
  serializeShapeObject: BrowserSerializer
  serializeShapeTextObject: BrowserSerializer
  serializeShapeScaleSnapshot: BrowserSerializer
  serializeTextObject: BrowserSerializer
  serializeTextResizeSnapshot: BrowserSerializer
  serializeSnappingObjectSnapshot: BrowserSerializer
  getInteractionBlockerState: () => Record<string, unknown>
  resolveShapeNode: (group: unknown) => BrowserObject | null
  resolveTarget: (objectIndex?: number, id?: string) => unknown
  resolveCanvasObject: (objectIndex?: number, id?: string) => unknown
  getSnappingGuideState: () => BrowserSnappingGuideState
  getTextSelectionStyles: (params: BrowserTextSelectionStyleParams) => BrowserTextSelectionStyleInfo | null
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
    canvas: {
      upperCanvasEl: {
        style: {
          pointerEvents: string
        }
      }
      lowerCanvasEl: {
        style: {
          pointerEvents: string
        }
      }
    }
    canvasManager: {
      getObjects: () => unknown
    }
    backgroundManager: {
      backgroundObject: unknown
    }
    interactionBlocker: {
      isBlocked: boolean
      overlayMask: unknown
    }
    shapeManager: {
      getTextNode: (params: { target: unknown }) => unknown
    }
    snappingManager: unknown
  }
  __editorHelpers: BrowserEditorHelpers
}
