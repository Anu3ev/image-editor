import {
  FabricObject,
  CanvasOptions,
  RectProps,
  CircleProps,
  CanvasEvents
} from 'fabric';

import { ImageEditor } from '../index';

/**
 * Интерфейс опций редактора изображений.
 * @interface IEditorOptions
 * @extends {Partial<CanvasOptions>}
 */
export interface IEditorOptions extends Partial<CanvasOptions> {
  /**
   * Ширина рабочей области редактора.
   */
  montageAreaWidth: number
  /**
   * Высота рабочей области редактора.
   */
  montageAreaHeight: number
  /**
   * Backstore ширина канваса.
   * Может быть задана в пикселях или как 'auto' для автоматической подстройки.
   */
  canvasBackstoreWidth: string | number
  /**
   * Backstore высота канваса.
   * Может быть задана в пикселях или как 'auto' для автоматической подстройки.
   */
  canvasBackstoreHeight: string | number
  /**
   * CSS ширина канваса.
   * Может быть задана в пикселях или как '100%' для растягивания на всю ширину контейнера.
   */
  canvasCSSWidth: string
  /**
   * CSS высота канваса.
   * Может быть задана в пикселях или как '100%' для растягивания на всю высоту контейнера.
   */
  canvasCSSHeight: string
  /**
   * CSS ширина обертки канваса.
   * Может быть задана в пикселях или как '100%' для растягивания на всю ширину контейнера.
   */
  canvasWrapperWidth: string
  /**
   * CSS высота обертки канваса.
   * Может быть задана в пикселях или как '100%' для растягивания на всю высоту контейнера.
   */
  canvasWrapperHeight: string
  /**
   * Ширина контейнера редактора.
   * Может быть задана в пикселях или как 'fit-content' для автоматической подстройки.
   */
  editorContainerWidth: string
  /**
   * Высота контейнера редактора.
   * Может быть задана в пикселях или как '100%' для растягивания на всю высоту родительского элемента.
   */
  editorContainerHeight: string

  /**
   * Максимальная длина истории действий в редакторе.
   * Используется для ограничения размера истории и предотвращения переполнения памяти.
   * Если значение меньше 1, то история не будет сохраняться.
   */
  maxHistoryLength: number

  /**
   * Тип скейлинга для объектов.
   * Может быть 'image-contain', 'image-cover' или 'scale-montage'.
   * 'image-contain' - сохраняет пропорции изображения, масштабируя его так, чтобы оно полностью помещалось в рабочую область.
   * 'image-cover' - сохраняет пропорции изображения, масштабируя его так, чтобы оно полностью заполняло рабочую область.
   * 'scale-montage' - масштабирует изображение в зависимости от размера рабочей области.
   */
  scaleType: string
  /**
   * Показывать панель инструментов для выделенного объекта.
   */
  showToolbar: boolean
  /**
   * Настройки панели инструментов выделенного объекта.
   * Можно передать массив с названиями действий или объект с настройками, кастомными иконками и обработчиками.
   * Увидеть все настройки можно здесь: ui/toolbar-manager/default-config
   */
  toolbar: {
    lockedActions: Array<{ name: string; handle: string }>
    actions: Array<{ name: string; handle: string }>
  },
  /**
   * JSON объект с начальными состоянием редактора.
   */
  initialStateJSON: object | null
  /**
   * Объект изображения с которым редактор будет инициализирован.
   * Может содержать:
   *  - {String} source - URL изображения (обязательный)
   *  - {String} scale - Тип скейлинга (image-contain/image-cover/scale-montage)
   *  - {Boolean} withoutSave - Не сохранять состояние редактора (по умолчанию false)
   *  - {String} contentType - Тип контента (например, 'image/png')
   */
  initialImage: {
    source: string
    scale: string
    withoutSave: boolean,
    contentType: string
  } | null
  /**
   * Дефолтный масштаб для редактора.
   * Используется при инициализации канваса.
   */
  defaultScale: number
  /**
   * Минимальный масштаб для редактора.
   * Используется для ограничения зума.
   */
  minZoom: number
  /**
   * Максимальный масштаб для редактора.
   * Используется для ограничения зума.
   */
  maxZoom: number
  /**
   * Максимальная кратность зума относительно текущего defaultZoom.
   * Используется для ограничения зума.
   */
  maxZoomFactor: number
  /**
   * Шаг зума для увеличения/уменьшения масштаба.
   * Используется при зуме по колесику мыши или по кнопкам.
   */
  zoomRatio: number
  /**
   * Массив допустимых форматов изображений для загрузки в редактор.
   */
  acceptContentTypes: string[]
  /**
   * Цвет маски наложения при блокировке редактора.
   * Используется для затемнения рабочей области при блокировке.
   * Например, 'rgba(136, 136, 136, 0.6)'.
   */
  overlayMaskColor: string

  /**
   * Контейнер редактора, в котором будет создан канвас.
   * Используется для адаптации размеров канваса к размерам контейнера.
   */
  editorContainer?: HTMLElement

  /**
   * Коллбэк, который будет вызван при готовности редактора.
   * Используется для выполнения действий после полной инициализации редактора.
   */
  _onReadyCallback?: Function


  /**
   * Настройки слушателей событий.
   */

  /**
   * Адаптировать канвас при изменении размеров контейнера (например, при изменении размеров окна браузера).
   */
  adaptCanvasToContainerOnResize: boolean
  /**
   * Поднимать объект на передний план по оси Z при выделении.
   * Если true, то при выделении объекта он будет подниматься на передний план.
   */
  bringToFrontOnSelection: boolean
  /**
   * Зум по CTRL + колесико мыши.
   */
  mouseWheelZooming: boolean
  /**
   * Реэжим перемещения по канвасу при зажатой клавише пробел.
   */
  canvasDragging: boolean
  /**
   * Копирование объектов по сочетанию клавиш Ctrl + C.
   */
  copyObjectsByHotkey: boolean
  /**
   * Вставка изображения из буфера обмена при нажатии Ctrl + V.
   */
  pasteImageFromClipboard: boolean
  /**
   * Отмена/повтор действия по сочетанию клавиш Ctrl + Z / Ctrl + Y.
   */
  undoRedoByHotKeys: boolean
  /**
   * Выделение всех объектов по сочетанию клавиш Ctrl + A.
   */
  selectAllByHotkey: boolean
  /**
   * Удаление объектов по сочетанию клавиш Delete.
   */
  deleteObjectsByHotkey: boolean
  /**
   * Сброс параметров объекта по двойному клику.
   * Если true, то при двойном клике по объекту будут сбрасываться его угол поворота, размеры, объект будет вписан в рабочую область.
   */
  resetObjectFitByDoubleClick: boolean
}



// TODO: Расширить интерфейс CanvasEvents для поддержки новых событий редактора

// declare module 'fabric' {
//   interface CanvasEvents {
//     'editor:ready': (editor: ImageEditor) => void
//     'editor:warning': (data: any) => void
//     'editor:error': (data: any) => void
//   }
// }
// export interface CustomEvents {
//   customEvents: [
//     /*
//      * Предупреждение о том, что что-то пошло не так
//      */
//     'editor:warning',

//     /*
//      * Ошибка, которая произошла в редакторе.
//      */
//     'editor:error',

//     /*
//      * Информационное сообщение
//      */
//     'editor:info',

//     /*
//      * Успешное выполнение операции.
//      */
//     'editor:success',

//     /*
//      * Срабатывает после успешной инициализации и рендера редактора.
//      * Важно: событие срабатывает только после полной инициализации редактора, а не после создания экземпляра класса.
//      */
//     'editor:ready',

//     /*
//      * Срабатывает после изменения внутренней ширины канваса (для экспорта).
//      */
//     'editor:resolution-width-changed',

//     /*
//      * Срабатывает после изменения внутренней высоты канваса (для экспорта).
//      */
//     'editor:resolution-height-changed',

//     /*
//      * Срабатывает, когда изменяется CSS ширина самого канваса (upper и lower canvas).
//      */
//     'editor:display-canvas-width-changed',

//     /*
//      * Срабатывает, когда изменяется CSS высота самого канваса (upper и lower canvas).
//      */
//     'editor:display-canvas-height-changed',

//     /*
//      * Срабатывает, когда изменяется CSS ширина обертки канваса.
//      */
//     'editor:display-wrapper-width-changed',

//     /*
//      * Срабатывает, когда изменяется CSS высота обертки канваса.
//      */
//     'editor:display-wrapper-height-changed',

//     /*
//      * Срабатывает, когда изменяется CSS ширина контейнера редактора.
//      */
//     'editor:display-container-width-changed',

//     /*
//      * Срабатывает, когда изменяется CSS высота контейнера редактора.
//      */
//     'editor:display-container-height-changed',

//     /*
//      * Срабатывает при масштабировании изображения (подгонка под монтажную область) в режиме 'contain' или 'cover'.
//      */
//     'editor:image-fitted',

//     /*
//      * Срабатывает, когда масштабируется монтажная область (канвас) под размеры изображения.
//      */
//     'editor:canvas-scaled',

//     /*
//      * Срабатывает при ресайзе и последующем обновлении канваса.
//      */
//     'editor:canvas-updated',

//     /*
//      * Срабатывает после экспорта канваса в файл или base64.
//      */
//     'editor:canvas-exported',

//     /*
//      * Срабатывает после экспорта отдельного объекта в файл или base64.
//      */
//     'editor:object-exported',

//     /*
//      * Срабатывает при группировке выбранных объектов.
//      */
//     'editor:objects-grouped',

//     /*
//      * Срабатывает при разгруппировке объектов.
//      */
//     'editor:objects-ungrouped',

//     /*
//      * Срабатывает при удалении выбранных объектов с канваса.
//      */
//     'editor:objects-deleted',

//     /*
//      * Срабатывает после загрузки состояния канваса (из JSON истории).
//      */
//     'editor:history-state-loaded',

//     /*
//      * Срабатывает после успешного выполнения операции отмены (undo).
//      */
//     'editor:undo',

//     /*
//      * Срабатывает после успешного выполнения операции повтора (redo).
//      */
//     'editor:redo',

//     /*
//      * Срабатывает после полного очищения канваса.
//      */
//     'editor:cleared',

//     /*
//      * Срабатывает, когда все объекты на канвасе выделены.
//      */
//     'editor:all-objects-selected',

//     /*
//      * Срабатывает после копирования объекта.
//      */
//     'editor:object-copied',

//     /*
//      * Срабатывает после вставки объекта.
//      */
//     'editor:object-pasted',

//     /*
//      * Срабатывает после поворота объекта.
//      */
//     'editor:object-rotated',

//     /*
//      * Срабатывает после горизонтального отражения объекта.
//      */
//     'editor:object-flipped-x',

//     /*
//      * Срабатывает после вертикального отражения объекта.
//      */
//     'editor:object-flipped-y',

//     /*
//      * Срабатывает после поднятия объекта на передний план.
//      */
//     'editor:object-bring-to-front',

//     /*
//      * Срабатывает после перемещения объекта на один уровень вперёд.
//      */
//     'editor:object-bring-forward',

//     /*
//      * Срабатывает после отправки объекта на задний план.
//      */
//     'editor:object-send-to-back',

//     /*
//      * Срабатывает после перемещения объекта на один уровень назад.
//      */
//     'editor:object-send-backwards',

//     /*
//      * Срабатывает при изменении зума канваса.
//      */
//     'editor:zoom-changed',

//     /*
//      * Срабатывает при изменении прозрачности объекта.
//      */
//     'editor:object-opacity-changed',

//     /*
//      * Срабатывает после установки дефолтного масштаба и зума канваса.
//      */
//     'editor:default-scale-set',

//     /**
//      * Блокировка объекта
//      */
//     'editor:object-locked',

//     /**
//      * Разблокировка объекта
//      */
//     'editor:object-unlocked',

//     /**
//      * Сброс объекта к исходному состоянию
//      */
//     'editor:object-reset',

//     /**
//      * Срабатывает после успешного импорта изображения в редактор.
//      */
//     'editor:image-imported'
//   ]
// }

/**
 * Расширенный интерфейс для объектов Fabric.js с дополнительными свойствами.
 * @interface ExtendedFabricObject
 * @extends {FabricObject}
 * @property {string} [id] - Уникальный идентификатор объекта.
 * @property {boolean} [locked] - Флаг блокировки объекта.
 */
export interface ExtendedFabricObject extends FabricObject {
  /**
   * Уникальный идентификатор объекта.
   */
  id?: string;
  /**
   * Флаг блокировки объекта.
   * Если true, то объект не может быть изменен или удален.
   */
  locked?: boolean;
}

/**
 * Расширенные свойства для прямоугольника.
 * @interface ExtendedRectProps
 * @extends {RectProps}
 * @property {string} [id] - Уникальный идентификатор.
 */
export interface ExtendedRectProps extends RectProps {
  /**
   * Уникальный идентификатор.
   */
  id?: string;
}

/**
 * Расширенные свойства для круга.
 * @interface ExtendedCircleProps
 * @extends {CircleProps}
 * @property {string} [id] - Уникальный идентификатор.
 */
export interface ExtendedCircleProps extends CircleProps {
  /**
   * Уникальный идентификатор.
   */
  id?: string;
}
