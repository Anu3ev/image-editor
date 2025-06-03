// src/editor/index.ts

import { Canvas, Rect } from 'fabric'
import { IEditorOptions } from '../defaults'
import Listeners from '../listeners'
import ModuleLoader from '../module-loader'
import WorkerManager from '../worker-manager'
import ToolbarManager from '../ui/toolbar-manager'
import HistoryManager from '../history-manager'
import ImageManager from '../image-manager'
import CanvasManager from '../canvas-manager'
import TransformManager from '../transform-manager'
import InteractionBlocker from '../interaction-blocker'
import LayerManager from '../layer-manager'
import ShapeManager from '../shape-manager'
import ClipboardManager from '../clipboard-manager'
import ObjectLockManager from '../object-lock-manager'
import GroupingManager from '../grouping-manager'
import SelectionManager from '../selection-manager'
import DeletionManager from '../deletion-manager'
import ErrorManager from '../error-manager'

/**
 * Класс редактора изображений.
 * @class
 * @param {string} canvasId - идентификатор канваса
 * @param {object} options - опции и настройки
 *
 * @fires {object} editor:render-complete - событие, которое срабатывает после завершения рендеринга редактора
 */
export interface IImageEditor {
  /**
   * Опции и настройки редактора
   * @type {IEditorOptions}
   */
  readonly options: IEditorOptions

  /**
   * Идентификатор HTML-контейнера.
   * @type {string}
   */
  readonly containerId: string

  /**
   * Уникальный идентификатор редактора.
   * @type {string}
   */
  readonly editorId: string

  /**
   * Буфер обмена для хранения объектов.
   * @type {ClipboardItem | null}
   */
  clipboard: ClipboardItem | null

  /**
   * Масштаб по умолчанию для редактора.
   * @type {number}
   */
  defaultZoom: number

  /**
   * Минимальный масштаб для редактора.
   * @type {number}
   */
  readonly minZoom: number

  /**
   * Максимальный масштаб для редактора.
   * @type {number}
   */
  readonly maxZoom: number

  /**
   * Канвас редактора.
   * @type {Canvas | undefined}
   */
  canvas?: Canvas

  /**
   * Рабочая область, в которой будут размещаться изображения.
   * @type {Rect | undefined}
   */
  montageArea?: Rect

  /**
   * Класс для динамического импорта модулей.
   * @type {ModuleLoader | undefined}
   */
  moduleLoader?: ModuleLoader

  /**
   * Менеджер воркеров для выполнения фоновых задач.
   * @type {WorkerManager | undefined}
   */
  workerManager?: WorkerManager

  /**
   * Менеджер ошибок редактора.
   * @type {ErrorManager | undefined}
   */
  errorManager?: ErrorManager

  /**
   * Менеджер истории операций
   * @type {HistoryManager | undefined}
   */
  historyManager?: HistoryManager

  /**
   * Менеджер панели инструментов
   * @type {ToolbarManager | undefined}
   */
  toolbar?: ToolbarManager

  /**
   * Менеджер трансформаций объектов
   * @type {TransformManager | undefined}
   */
  transformManager?: TransformManager

  /**
   * Менеджер канваса
   * @type {CanvasManager | undefined}
   */
  canvasManager?: CanvasManager

  /**
   * Менеджер изображений
   * @type {ImageManager | undefined}
   */
  imageManager?: ImageManager

  /**
   * Менеджер слоёв
   * @type {LayerManager | undefined}
   */
  layerManager?: LayerManager

  /**
   * Менеджер фигур
   * @type {ShapeManager | undefined}
   */
  shapeManager?: ShapeManager

  /**
   * Блокировщик взаимодействия с канвасом
   * @type {InteractionBlocker | undefined}
   */
  interactionBlocker?: InteractionBlocker

  /**
   * Менеджер буфера обмена
   * @type {ClipboardManager | undefined}
   */
  clipboardManager?: ClipboardManager

  /**
   * Менеджер блокировки объектов
   * @type {ObjectLockManager | undefined}
   */
  objectLockManager?: ObjectLockManager

  /**
   * Менеджер группировки объектов
   * @type {GroupingManager | undefined}
   */
  groupingManager?: GroupingManager

  /**
   * Менеджер выделения объектов
   * @type {SelectionManager | undefined}
   */
  selectionManager?: SelectionManager

  /**
   * Менеджер удаления объектов
   * @type {DeletionManager | undefined}
   */
  deletionManager?: DeletionManager

  /**
   * Слушатели событий редактора
   * @type {Listeners | undefined}
   */
  listeners?: Listeners

  /**
   * Инициализация редактора.
   * Создаёт все необходимые менеджеры и загружает начальное состояние.
   * @returns {Promise<void>}
   */
  init(): Promise<void>

  /**
   * Метод для удаления редактора и всех слушателей.
   */
  destroy(): void

  /**
   * Создаёт монтажную область
   * @private
   * @returns {void}
   */
  _createMonageArea(): void

  /**
   * Создаёт область клиппинга
   * @private
   * @returns {void}
   */
  _createClippingArea(): void
}
