import type { ObjectTargetParams } from './editor.types'

/** Режим активного crop mode в e2e-снимках. */
export type CropModeInfo = 'canvas' | 'image'

/** Controls crop frame, которые используются в e2e drag-сценариях. */
export type CropControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

/** Размер crop frame или aspect ratio в e2e-сценариях. */
export interface CropSizeInfo {
  width: number
  height: number
}

/** Crop rect в координатах результата активной crop session. */
export interface CropRectInfo {
  left: number
  top: number
  width: number
  height: number
}

/** Runtime-настройки crop session, видимые через публичное состояние менеджера. */
export interface CropSessionOptionsInfo {
  allowFrameOverflow: boolean
  showGrid: boolean
  cancelOnSelectionClear: boolean
}

/** Сериализованное состояние runtime crop frame. */
export interface CropFrameInfo {
  id: string | null
  type: string
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  angle: number
}

/** Сериализованное публичное состояние crop mode для e2e assertions. */
export interface CropStateInfo {
  mode: CropModeInfo
  targetId: string | null
  options: CropSessionOptionsInfo
  rect: CropRectInfo
  frame: CropFrameInfo
}

/** Pixel/source-состояние изображения после применения image crop. */
export interface CropImageSourceInfo {
  id: string | null
  width: number
  height: number
  cropX: number
  cropY: number
  sourceWidth: number
  sourceHeight: number
}

/** Параметры старта crop mode через e2e-модель. */
export interface CropStartParams extends ObjectTargetParams {
  size?: CropSizeInfo
  aspectRatio?: CropSizeInfo
  allowFrameOverflow?: boolean
  showGrid?: boolean
  cancelOnSelectionClear?: boolean
}

/** Параметры интерактивного resize crop frame из control. */
export interface CropResizeFromControlParams {
  control: CropControlKey
  widthRatio: number
  heightRatio: number
  shiftKey?: boolean
}
