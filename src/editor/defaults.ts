import type { EditorOptions } from './types/options'
import defaultFonts from './default-fonts'

export const defaults: Partial<EditorOptions> = {
  /**
   * Editor options
   */
  preserveObjectStacking: true,
  controlsAboveOverlay: true,
  centeredRotation: true,
  enableRetinaScaling: false,
  selectionKey: ['ctrlKey', 'metaKey'],

  /*
   * Custom options
   */
  montageAreaWidth: 512,
  montageAreaHeight: 512,
  canvasBackstoreWidth: 'auto',
  canvasBackstoreHeight: 'auto',
  canvasCSSWidth: '100%',
  canvasCSSHeight: '100%',
  canvasWrapperWidth: '100%',
  canvasWrapperHeight: '100%',
  editorContainerWidth: 'fit-content',
  editorContainerHeight: '100%',
  maxHistoryLength: 50,
  scaleType: 'contain',
  acceptContentTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/webp'
  ],
  showToolbar: true,
  toolbar: {},
  initialState: null,
  initialImage: null,
  defaultScale: 0.5,
  minZoom: 0.1,
  maxZoom: 2,
  zoomRatio: 0.1,
  overlayMaskColor: 'rgba(136, 136, 136, 0.6)',
  /**
   * Show the object rotation angle next to the pointer while rotating.
   */
  showRotationAngle: true,
  /**
   * Show the current object width and height next to the pointer while scaling.
   */
  showObjectSizeOnScale: true,
  /**
   * Show custom viewport scrollbars for panning a zoomed-in canvas.
   */
  showViewportScrollbars: true,

  /*
   * Event listener settings
   */
  adaptCanvasToContainerOnResize: true,
  mouseWheelZooming: true,
  canvasDragging: true,
  copyObjectsByHotkey: true,
  cutObjectsByHotkey: true,
  duplicateObjectsByHotkey: true,
  pasteImageFromClipboard: true,
  undoRedoByHotKeys: true,
  selectAllByHotkey: true,
  deleteObjectsByHotkey: true,
  resetObjectFitByDoubleClick: true,
  keyboardIgnoreSelectors: [],

  /**
   * List of fonts available in the editor by default.
   */
  fonts: defaultFonts
}
