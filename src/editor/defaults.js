// API Docs: https://fabricjs.com/api/classes/canvas/

export default {
  // Cохраняют ли объекты свой текущий порядок (z-index) при выделении
  preserveObjectStacking: true,
  // Возможность взаимодействия с объектом за пределами монтажной области
  controlsAboveOverlay: true,
  // Зум по центру
  centeredScaling: true,
  // Поворот объекта по центру
  centeredRotation: true,

  /*
  * Кастомные опции
  */

  // Canvas Montage Area width and height
  montageAreaWidth: 512,
  montageAreaHeight: 512,

  // Canvas backstore width and height
  canvasBackstoreWidth: 'auto',
  canvasBackstoreHeight: 'auto',
  // Canvas (upper & lower) CSS width and height
  canvasCSSWidth: '100%',
  canvasCSSHeight: '100%',
  // Wrapper CSS width and height
  canvasWrapperWidth: '100%',
  canvasWrapperHeight: '100%',
  // Container CSS width and height
  editorContainerWidth: 'fit-content',
  editorContainerHeight: '100%',

  // Максимальная длина истории действий
  maxHistoryLength: 50,

  // Дефолтный тип скейлинга для объектов (cotain/cover)
  scaleType: 'contain',

  // Показывать панель инструментов для выделенного объекта
  showToolbar: true,

  // Настройки панели инструментов выделенного объекта.
  // Можно передать массив с названиями действий или объект с настройками, кастомными иконками и обработчиками
  // ui/toolbar-manager/default-config.js
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

  // Можно передать JSON объект в виде строки для инициализации редактора
  initialStateJSON: null,

  /*
  * Объект изображения с которым редактор будет инициализирован. Может содержать:
  *  - {String} url - URL изображения (обязательный)
  *  - {String} scaleType - Тип скейлинга (image-contain/image-cover/scale-montage)
  *  - {Boolean} withoutSave - Не сохранять состояние редактора (по умолчанию false)
  */
  initialImage: null,

  // Дефолтный масштаб
  defaultScale: 1,

  // Минимальный и максимальный зум
  minZoom: 0.1,
  maxZoom: 2,
  // Максимальная кратность зума относительно текущего defaultZoom
  maxZoomFactor: 2,

  // Шаг зума
  zoomRatio: 0.1,

  overlayMaskColor: 'rgba(136, 136, 136, 0.6)',

  /*
   * Настройки слушателей событий
   */

  // Адаптировать канвас при изменении размеров контейнера (например, при изменении размеров окна браузера)
  adaptCanvasToContainer: true,
  // Поднимать объект на передний план по оси Z при выделении
  bringToFrontOnSelection: false,
  // Зум по колесику мыши
  mouseWheelZooming: true,
  // Перемещение канваса при зажатой кнопке ALT
  canvasDragging: false,
  // Копирование объектов (Ctrl + C, Ctrl + V)
  copyObjectsByHotkey: true,
  // Вставка изображения из буфера обмена
  pasteImageFromClipboard: true,
  // Отмена/повтор действия по сочетанию клавиш (Ctrl + Z, Ctrl + Y)
  undoRedoByHotKeys: true,
  // Выделение всех объектов по сочетанию клавиш (Ctrl + A)
  selectAllByHotkey: true,
  // Удаление объектов по сочетанию клавиш (Delete)
  deleteObjectsByHotkey: true,
  // Сброс параметров объекта по двойному клику
  resetObjectFitByDoubleClick: true
}
