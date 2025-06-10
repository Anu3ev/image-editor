import { ActiveSelection, FabricImage, Group } from 'fabric';
import { ImageEditor } from '../index';
import { ExtendedFabricObject } from './fabric-extensions';

/**
 * Параметры события editor:canvas-exported
 */
export type CanvasExportedPayload = {
  image: File | Blob | Base64URLString
  format: string
  contentType: string
  fileName: string
}

/**
 * Параметры события editor:object-exported
 */
export type CanvasObjectExportedPayload = {
  object: ExtendedFabricObject
  image: File | Blob | Base64URLString
  format: string
  contentType: string
  fileName: string
}


export type CanvasImportedImagePayload = {
  image: FabricImage
  format: string
  contentType: string
  scale: number
  withoutSave?: boolean
  source?: File | String
}

/**
 * Общий тип для warning и error
 */
export type ErrorItem = {
  code: string
  origin?: string
  method?: string
  message?: string
  data?: object
}

/**
 * Параметры событий:
 * - editor:display-canvas-width-changed
 * - editor:display-canvas-height-changed
 * - editor:display-wrapper-width-changed
 * - editor:display-wrapper-height-changed
 * - editor:display-container-width-changed
 * - editor:display-container-height-changed
 */
export type DisplayDimensionsChangedPayload = {
  element: 'canvas' | 'wrapper' | 'container',
  value: string | number
}

/**
 * Параметры события editor:object-fitted
 */
export type ObjectFittedPayload = {
  object?: ExtendedFabricObject
  type?: 'contain' | 'cover'
  withoutSave?: boolean
  fitAsOneObject?: boolean
}

/**
 * Параметры события editor:montage-area-scaled-to-image
 */
export type MontageAreaScaledToImagePayload = {
  object: ExtendedFabricObject
  width: number
  height: number
  preserveAspectRatio?: boolean
  withoutSave?: boolean
}

/**
 * Параметры события editor:canvas-updated
 */
export type CanvasUpdatedPayload = {
  width: number
  height: number
}

/**
 * Параметры события editor:objects-grouped
 */
export type ObjectsGroupedPayload = {
  object: ExtendedFabricObject
  group: Group
  withoutSave: boolean
}

/**
 * Параметры события editor:objects-ungrouped
 */
export type ObjectsUngroupedPayload = {
  object: Group,
  selection: ActiveSelection,
  withoutSave: booelean
}

/**
 * Параметры события editor:objects-deleted
 */
export type ObjectsDeletedPayload = {
  objects: ExtendedFabricObject[]
  withoutSave: boolean
}

/**
 * Параметры события editor:history-state-loaded
 * @todo: Заменить object на тип который будет соответствовать объекту состояния истории, когда класс будет переписан на TS
 */
export type HistoryStateLoadedPayload = {
  fullState: object,
  currentIndex: number,
  totalChangesCount: number,
  baseStateChangesCount: number,
  patchesCount: number,
  patches: object[]
}

declare module 'fabric' {
  interface CanvasEvents {
    /**
     * Срабатывает после успешной инициализации и рендера редактора.
     */
    'editor:ready': ImageEditor

    /**
     * Предупреждение о том, что что-то пошло не так
     */
    'editor:warning': ErrorItem

    /**
     * Ошибка, которая произошла в редакторе.
     */
    'editor:error': ErrorItem

    /**
     * Информационное сообщение
     */
    'editor:info': string

    /**
     * Успешное выполнение операции.
     */
    'editor:success': string

    /**
     * Срабатывает после экспорта канваса в файл или base64.
     */
    'editor:canvas-exported': CanvasExportedPayload

    /**
     * Срабатывает после успешного импорта изображения в редактор.
     */
    'editor:image-imported': CanvasImportedImagePayload

    /**
     * Срабатывает после изменения внутренней ширины канваса (для экспорта).
     */
    'editor:resolution-width-changed': string | number

    /**
     * Срабатывает после изменения внутренней высоты канваса (для экспорта).
     */
    'editor:resolution-height-changed': string | number

    /**
     * Срабатывает, когда изменяется CSS ширина самого канваса (upper и lower canvas).
     */
    'editor:display-canvas-width-changed': DisplayDimensionsChangedPayload

    /**
     * Срабатывает, когда изменяется CSS высота самого канваса (upper и lower canvas).
     */
    'editor:display-canvas-height-changed': DisplayDimensionsChangedPayload

    /**
     * Срабатывает, когда изменяется CSS ширина обертки канваса.
     */
    'editor:display-wrapper-width-changed': DisplayDimensionsChangedPayload

    /**
     * Срабатывает, когда изменяется CSS высота обертки канваса.
     */
    'editor:display-wrapper-height-changed': DisplayDimensionsChangedPayload

    /**
     * Срабатывает, когда изменяется CSS ширина контейнера редактора.
     */
    'editor:display-container-width-changed': DisplayDimensionsChangedPayload

    /**
     * Срабатывает, когда изменяется CSS высота контейнера редактора.
     */
    'editor:display-container-height-changed': DisplayDimensionsChangedPayload

    /**
     * Срабатывает при масштабировании изображения (подгонка под монтажную область) в режиме 'contain' или 'cover'.
     */
    'editor:object-fitted': ObjectFittedPayload

    /**
     * Срабатывает, когда масштабируется монтажная область (канвас) под размеры изображения.
     */
    'editor:montage-area-scaled-to-image': MontageAreaScaledToImagePayload

    /**
     * Срабатывает при ресайзе и последующем обновлении канваса.
     */
    'editor:canvas-updated': CanvasUpdatedPayload

    /**
     * Срабатывает после экспорта отдельного объекта в файл или base64.
     */
    'editor:object-exported': CanvasObjectExportedPayload

    /**
     * Срабатывает при группировке выбранных объектов.
     */
    'editor:objects-grouped': ObjectsGroupedPayload

    /**
     * Срабатывает при разгруппировке объектов.
     */
    'editor:objects-ungrouped': ObjectsUngroupedPayload

    /**
     * Срабатывает при удалении выбранных объектов с канваса.
     */
    'editor:objects-deleted': ObjectsDeletedPayload

    /**
     * Срабатывает после загрузки состояния канваса (из JSON истории).
     */
    'editor:history-state-loaded': HistoryStateLoadedPayload

    /**
     * Срабатывает после успешного выполнения операции отмены (undo).
     */
    'editor:undo': {
      state: HistoryManager['state']
      previousState: HistoryManager['state'] | null
      nextState: HistoryManager['state'] | null
    }

    /**
     * Срабатывает после успешного выполнения операции повтора (redo).
     */
    'editor:redo': {
      state: HistoryManager['state']
      previousState: HistoryManager['state'] | null
      nextState: HistoryManager['state'] | null
    }

    /**
     * Срабатывает после полного очищения канваса.
     */
    'editor:cleared': {
      clearedObjects: ExtendedFabricObject[]
      clearedShapes: ExtendedFabricObject[]
      clearedLayers: ExtendedFabricObject[]
    }

    /**
     * Срабатывает, когда все объекты на канвасе выделены.
     */
    'editor:all-objects-selected': ExtendedFabricObject[]
    /**
     * Срабатывает после копирования объекта.
     */
    'editor:object-copied': ExtendedFabricObject
    /**
     * Срабатывает после вставки объекта.
     */
    'editor:object-pasted': ExtendedFabricObject
    /**
     * Срабатывает после поворота объекта.
     */
    'editor:object-rotated': ExtendedFabricObject
    /**
     * Срабатывает после горизонтального отражения объекта.
     */
    'editor:object-flipped-x': ExtendedFabricObject
    /**
     * Срабатывает после вертикального отражения объекта.
     */
    'editor:object-flipped-y': ExtendedFabricObject
    /**
     * Срабатывает после поднятия объекта на передний план.
     */
    'editor:object-bring-to-front': ExtendedFabricObject
    /**
     * Срабатывает после перемещения объекта на один уровень вперёд.
     */
    'editor:object-bring-forward': ExtendedFabricObject
    /**
     * Срабатывает после отправки объекта на задний план.
     */
    'editor:object-send-to-back': ExtendedFabricObject
    /**
     * Срабатывает после перемещения объекта на один уровень назад.
     */
    'editor:object-send-backwards': ExtendedFabricObject
    /**
     * Срабатывает при изменении зума канваса.
     */
    'editor:zoom-changed': {
      zoom: number
      scale: number
    }
    /**
     * Срабатывает при изменении прозрачности объекта.
     */
    'editor:object-opacity-changed': {
      object: ExtendedFabricObject
      opacity: number
    }
    /**
     * Срабатывает после установки дефолтного масштаба и зума канваса.
     */
    'editor:default-scale-set': {
      defaultScale: number
      defaultZoom: number
    }
    /**
     * Блокировка объекта
     */
    'editor:object-locked': ExtendedFabricObject
    /**
     * Разблокировка объекта
     */
    'editor:object-unlocked': ExtendedFabricObject
    /**
     * Сброс объекта к исходному состоянию
     */
    'editor:object-reset': ExtendedFabricObject
    /**
     * Срабатывает после успешного импорта изображения в редактор.
     */
    'editor:image-imported': File | Blob | string
  }
}


// export interface CustomEvents {
//   customEvents: [
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
