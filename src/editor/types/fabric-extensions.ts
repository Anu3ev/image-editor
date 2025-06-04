import { FabricObject, CanvasOptions } from 'fabric';

export interface IEditorOptions extends Partial<CanvasOptions> {
  montageAreaWidth: number
  montageAreaHeight: number
  canvasBackstoreWidth: string | number
  canvasBackstoreHeight: string | number
  canvasCSSWidth: string
  canvasCSSHeight: string
  canvasWrapperWidth: string
  canvasWrapperHeight: string
  editorContainerWidth: string
  editorContainerHeight: string
  scaleType: string
  showToolbar: boolean
  toolbar: {
    lockedActions: Array<{ name: string; handle: string }>
    actions: Array<{ name: string; handle: string }>
  },
  initialStateJSON: object | null
  initialImage: {
    source: string
    scale: string
    withoutSave: boolean,
    contentType: string
  } | null
  defaultScale: number
  minZoom: number
  maxZoom: number
  maxZoomFactor: number
  zoomRatio: number
  overlayMaskColor: string
  adaptCanvasToContainer: boolean
  bringToFrontOnSelection: boolean
  mouseWheelZooming: boolean
  canvasDragging: boolean
  copyObjectsByHotkey: boolean
  pasteImageFromClipboard: boolean
  undoRedoByHotKeys: boolean
  selectAllByHotkey: boolean
  deleteObjectsByHotkey: boolean
  resetObjectFitByDoubleClick: boolean

  editorContainer?: HTMLElement

  _onReadyCallback?: Function
}

export interface ExtendedFabricObject extends FabricObject {
  locked?: boolean;
}

