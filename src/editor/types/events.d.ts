import { FabricObject, FabricImage, Group, ActiveSelection, Point } from 'fabric'
import { ImageEditor } from '../index'

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
  object: FabricObject
  image: File | Blob | Base64URLString
  format: string
  contentType: string
  fileName: string
}

export type CanvasImportedImagePayload = {
  image: FabricObject | FabricImage
  format: string
  contentType: string
  scale: string
  withoutSave?: boolean
  source?: File | string
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
  object?: FabricObject
  type?: 'contain' | 'cover'
  withoutSave?: boolean
  fitAsOneObject?: boolean
}

/**
 * Параметры события editor:montage-area-scaled-to-image
 */
export type MontageAreaScaledToImagePayload = {
  object: FabricObject
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
  object: FabricObject
  group: Group
  withoutSave?: boolean
}

/**
 * Параметры события editor:objects-ungrouped
 */
export type ObjectsUngroupedPayload = {
  object: Group,
  selection: ActiveSelection,
  withoutSave?: boolean
}

/**
 * Параметры события editor:objects-deleted
 */
export type ObjectsDeletedPayload = {
  objects: FabricObject[]
  withoutSave?: boolean
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

export type ResolutionWidthChangedPayload = {
  width: string | number,
  preserveProportional?: boolean,
  withoutSave?: boolean,
  adaptCanvasToContainer?: boolean
}

export type ResolutionHeightChangedPayload = {
  height: string | number,
  preserveProportional?: boolean,
  withoutSave?: boolean,
  adaptCanvasToContainer?: boolean
}

/**
 * Параметры события background:changed
 */
export type BackgroundChangedPayload = {
  type: 'color' | 'gradient' | 'image'
  color?: string
  gradientParams?: import('../background-manager').GradientBackground // новый формат градиента
  imageSource?: string | File,
  backgroundObject?: FabricImage | FabricObject | null
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
    'editor:resolution-width-changed': ResolutionWidthChangedPayload

    /**
     * Срабатывает после изменения внутренней высоты канваса (для экспорта).
     */
    'editor:resolution-height-changed': ResolutionHeightChangedPayload

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
    'editor:undo': HistoryStateLoadedPayload

    /**
     * Срабатывает после успешного выполнения операции повтора (redo).
     */
    'editor:redo': HistoryStateLoadedPayload

    /**
     * Срабатывает после полного очищения канваса.
     */
    'editor:cleared',

    /**
     * Срабатывает, когда все объекты на канвасе выделены.
     */
    'editor:all-objects-selected': { selected: FabricObject }

    /**
     * Срабатывает после копирования объекта.
     */
    'editor:object-copied': { object: FabricObject }

    /**
     * Срабатывает после вставки объекта.
     */
    'editor:object-pasted': { object: FabricObject }

    /**
     * Срабатывает после нажатия на кнопку "Создать копию" в тулбаре выделенного объекта.
     */
    'editor:object-duplicated': { object: FabricObject }

    /**
     * Срабатывает после поворота объекта.
     */
    'editor:object-rotated': { object: FabricObject, angle: number, withoutSave?: boolean }

    /**
     * Срабатывает после горизонтального отражения объекта.
     */
    'editor:object-flipped-x': { object: FabricObject, withoutSave?: boolean }

    /**
     * Срабатывает после вертикального отражения объекта.
     */
    'editor:object-flipped-y': { object: FabricObject, withoutSave?: boolean }

    /**
     * Срабатывает после поднятия объекта на передний план.
     */
    'editor:object-bring-to-front': { object: FabricObject, withoutSave?: boolean }

    /**
     * Срабатывает после перемещения объекта на один уровень вперёд.
     */
    'editor:object-bring-forward': { object: FabricObject, withoutSave?: boolean }

    /**
     * Срабатывает после отправки объекта на задний план.
     */
    'editor:object-send-to-back': { object: FabricObject, withoutSave?: boolean }

    /**
     * Срабатывает после перемещения объекта на один уровень назад.
     */
    'editor:object-send-backwards': { object: FabricObject, withoutSave?: boolean }

    /**
     * Срабатывает при изменении зума канваса.
     */
    'editor:zoom-changed': {
      currentZoom: number,
      zoom?: number,
      point: Point
    }

    /**
     * Срабатывает при изменении прозрачности объекта.
     */
    'editor:object-opacity-changed': {
      object: FabricObject
      opacity: number,
      withoutSave?: boolean
    }

    /**
     * Срабатывает после установки дефолтного масштаба и зума канваса.
     */
    'editor:default-scale-set',

    /**
     * Блокировка объекта
     */
    'editor:object-locked': {
      object: FabricObject
      skipInnerObjects?: boolean
      withoutSave?: boolean
    }

    /**
     * Разблокировка объекта
     */
    'editor:object-unlocked': {
      object: FabricObject
      withoutSave?: boolean
    }

    /**
     * Сброс объекта к исходному состоянию
     */
    'editor:object-reset': {
      object: FabricObject,
      alwaysFitObject?: boolean,
      withoutSave?: boolean
    }

    /**
     * Блокировка взаимодействия с монтажной областью
     */
    'editor:disabled': void

    /**
     * Разблокировка взаимодействия с монтажной областью
     */
    'editor:enabled': void

    /**
     * Срабатывает при изменении фона.
     */
    'background:changed': BackgroundChangedPayload

    /**
     * Срабатывает при удалении фона.
     */
    'background:removed': void
  }
}
