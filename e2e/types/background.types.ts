import type { EditorObjectInfo } from './editor.types'

/** Сериализованная информация о фоновом объекте редактора. */
export interface BackgroundObjectInfo extends EditorObjectInfo {
  backgroundType: string
  hasGradientFill: boolean
  boundsLeft: number
  boundsTop: number
  boundsWidth: number
  boundsHeight: number
  boundsRight: number
  boundsBottom: number
  boundsCenterX: number
  boundsCenterY: number
}
