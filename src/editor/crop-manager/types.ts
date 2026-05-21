import type { FabricImage, FabricObject, Rect } from 'fabric'

/**
 * Режимы работы crop manager.
 */
export type CropMode = 'canvas' | 'image'

/**
 * Размер crop frame в локальных координатах источника кропа.
 */
export type CropSize = {
  width: number
  height: number
}

/**
 * Пропорция crop frame. Значения трактуются как отношение width / height.
 */
export type CropAspectRatio = {
  width: number
  height: number
}

/**
 * Опции старта кропа монтажной области.
 */
export type StartCanvasCropOptions = {
  size?: CropSize
  aspectRatio?: CropAspectRatio
  allowFrameOverflow?: boolean
  showGrid?: boolean
  cancelOnSelectionClear?: boolean
}

/**
 * Опции старта кропа изображения.
 */
export type StartImageCropOptions = {
  target?: FabricImage
  size?: CropSize
  aspectRatio?: CropAspectRatio
  allowFrameOverflow?: boolean
  showGrid?: boolean
  cancelOnSelectionClear?: boolean
}

/**
 * Runtime-настройки активной crop session.
 */
export type CropSessionOptions = {
  allowFrameOverflow: boolean
  showGrid: boolean
  cancelOnSelectionClear: boolean
}

/**
 * Crop rect в координатах результата: для canvas от top-left монтажной области,
 * для image от top-left текущей видимой области изображения.
 */
export type CropRect = {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Сохранённое состояние интерактивности объекта на время crop mode.
 */
export type CropObjectInteractivity = {
  object: FabricObject
  selectable: boolean
  evented: boolean
}

/**
 * Общие runtime-поля crop session. Не сериализуются и не попадают в history.
 */
type BaseCropSession = {
  source: FabricObject
  frame: Rect
  options: CropSessionOptions
  previousActiveObject: FabricObject | null
  interactivity: CropObjectInteractivity[]
}

/**
 * Runtime-сессия crop mode для монтажной области.
 */
export type CanvasCropSession = BaseCropSession & {
  mode: 'canvas'
  target: null
}

/**
 * Runtime-сессия crop mode для изображения.
 */
export type ImageCropSession = BaseCropSession & {
  mode: 'image'
  target: FabricImage
}

/**
 * Runtime-сессия crop mode. Не сериализуется и не попадает в history.
 */
export type CropSession = CanvasCropSession | ImageCropSession

/**
 * Публичное состояние активного crop mode.
 */
export type CropState = {
  mode: CropMode
  frame: Rect
  options: CropSessionOptions
  target: FabricImage | null
  rect: CropRect
}

/**
 * Результат применения crop mode.
 */
export type CropApplyResult = {
  mode: CropMode
  target: FabricImage | null
  rect: CropRect
}
