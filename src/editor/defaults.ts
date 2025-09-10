import { CanvasOptions } from 'fabric'

export const defaults: Partial<CanvasOptions> = {
  /**
   * Опции редактора
   */
  preserveObjectStacking: true,
  controlsAboveOverlay: true,
  centeredRotation: true,
  enableRetinaScaling: false,

  /*
   * Кастомные опции
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
  toolbar: {
    lockedActions: [{
      name: 'Разблокировать',
      handle: 'unlock'
    }],
    actions: [
      {
        name: 'Создать копию',
        handle: 'copyPaste'
      },
      {
        name: 'Заблокировать',
        handle: 'lock'
      },
      {
        name: 'На передний план',
        handle: 'bringToFront'
      },
      {
        name: 'На задний план',
        handle: 'sendToBack'
      },
      {
        name: 'На один уровень вверх',
        handle: 'bringForward'
      },
      {
        name: 'На один уровень вниз',
        handle: 'sendBackwards'
      },
      {
        name: 'Удалить',
        handle: 'delete'
      }
    ]
  },
  initialStateJSON: null,
  initialImage: null,
  defaultScale: 0.5,
  minZoom: 0.1,
  maxZoom: 2,
  zoomRatio: 0.1,
  overlayMaskColor: 'rgba(136, 136, 136, 0.6)',

  /*
   * Настройки слушателей событий
   */
  adaptCanvasToContainerOnResize: true,
  bringToFrontOnSelection: false,
  mouseWheelZooming: true,
  canvasDragging: true,
  copyObjectsByHotkey: true,
  pasteImageFromClipboard: true,
  undoRedoByHotKeys: true,
  selectAllByHotkey: true,
  deleteObjectsByHotkey: true,
  resetObjectFitByDoubleClick: true,
  keyboardIgnoreSelectors: []
}
