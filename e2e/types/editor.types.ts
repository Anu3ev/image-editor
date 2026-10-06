/** Serialized canvas-object representation for test assertions */
export interface EditorObjectInfo {
  id?: string
  type: string
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  angle: number
  fill: string | null
  stroke: string | null
  strokeWidth: number
  opacity: number
  visible: boolean
  selectable: boolean
  locked: boolean
  flipX: boolean
  flipY: boolean
}

/** Canvas-state snapshot */
export interface CanvasStateInfo {
  width: number
  height: number
  zoom: number
  objectCount: number
}

/** Offset and zoom of the current canvas viewportTransform */
export interface CanvasViewportTransformInfo {
  x: number
  y: number
  zoom: number
}

/** Basic element bounds in canvas viewport coordinates. */
export interface ViewportBoundsInfo {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
  centerX: number
  centerY: number
}

/** DOM state of one viewport scrollbar. */
export interface ViewportScrollbarAxisInfo {
  thumb: ViewportBoundsInfo
  track: ViewportBoundsInfo
  visible: boolean
}

/** DOM state of the editor's viewport scrollbars. */
export interface ViewportScrollbarInfo {
  horizontal: ViewportScrollbarAxisInfo
  vertical: ViewportScrollbarAxisInfo
}

/** Pan state along one viewport axis. */
export interface ViewportPanAxisInfo {
  canPan: boolean
  current: number
  max: number
  min: number
  ratio: number
  scrollDistance: number
}

/** Viewport pan state. */
export interface ViewportPanInfo {
  canPan: boolean
  horizontal: ViewportPanAxisInfo
  vertical: ViewportPanAxisInfo
}

/** Artboard information */
export interface MontageAreaInfo {
  width: number
  height: number
  left: number
  top: number
}

/** DOM object-size indicator state. */
export interface ObjectSizeIndicatorInfo {
  visible: boolean
  text: string
  width: number | null
  height: number | null
}

/** Visible DOM object-size indicator state with parsed numbers. */
export interface VisibleObjectSizeIndicatorInfo extends ObjectSizeIndicatorInfo {
  visible: true
  width: number
  height: number
}

/** Artboard bounds in canvas-scene coordinates. */
export interface MontageAreaBoundsInfo {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
  centerX: number
  centerY: number
}

/** Artboard and canvas-viewport bounds in browser client coordinates. */
export interface MontageAreaViewportBoundsInfo {
  montageLeft: number
  montageTop: number
  montageWidth: number
  montageHeight: number
  montageRight: number
  montageBottom: number
  montageCenterX: number
  montageCenterY: number
  viewportLeft: number
  viewportTop: number
  viewportWidth: number
  viewportHeight: number
  viewportRight: number
  viewportBottom: number
  viewportCenterX: number
  viewportCenterY: number
}

/** Options for identifying the target object in models */
export interface ObjectTargetParams {
  objectIndex?: number
  id?: string
}

/** Event for objects skipped during deletion, recorded by the e2e helper. */
export interface DeleteSkippedEventInfo {
  requestedCount: number
  requestedIds: Array<string | null>
  skippedCount: number
  skippedIds: Array<string | null>
  withoutSave: boolean | null
}

/** Options for serializing a template from the current selection */
export interface SerializeTemplateParams {
  templateId?: string
  previewId?: string
  withBackground?: boolean
}

/** Minimal template-object description for e2e tests */
export interface TemplateObjectData {
  [key: string]: unknown
}

/** Minimal template description for e2e tests */
export interface TemplateDefinition {
  id: string
  meta: Record<string, unknown>
  objects: TemplateObjectData[]
}

/** Result of destroying and remounting the editor in the same container. */
export interface EditorRemountInfo {
  previousEditorId: string
  editorId: string
  registrationRemoved: boolean
  replacementRegistered: boolean
  previousCanvasConnected: boolean
  previousUpperCanvasConnected: boolean
  canvasCount: number
}
