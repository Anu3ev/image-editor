import type { ObjectTargetParams } from './editor.types'

/** Active crop-mode variant in e2e snapshots. */
export type CropModeInfo = 'canvas' | 'image'

/** Crop-frame controls used in e2e drag scenarios. */
export type CropControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

/** Crop-frame dimensions or aspect ratio in e2e scenarios. */
export interface CropSizeInfo {
  width: number
  height: number
}

/** Crop rect in result coordinates of the active crop session. */
export interface CropRectInfo {
  left: number
  top: number
  width: number
  height: number
}

/** Crop-session runtime settings visible through the manager's public state. */
export interface CropSessionOptionsInfo {
  allowFrameOverflow: boolean
  showGrid: boolean
  showDimmedArea: boolean
  cancelOnSelectionClear: boolean
  preserveAspectRatio: boolean
}

/** Serialized runtime crop-frame state. */
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

/** Serialized public crop-mode state for e2e assertions. */
export interface CropStateInfo {
  mode: CropModeInfo
  targetId: string | null
  options: CropSessionOptionsInfo
  effectivePreserveAspectRatio: boolean
  rect: CropRectInfo
  frame: CropFrameInfo
}

/** Image pixel/source state after applying an image crop. */
export interface CropImageSourceInfo {
  id: string | null
  width: number
  height: number
  cropX: number
  cropY: number
  sourceWidth: number
  sourceHeight: number
}

/** Color of one lower Fabric canvas pixel. */
export interface CropCanvasPixelInfo {
  red: number
  green: number
  blue: number
  alpha: number
}

/** Visual state of the active crop session's transient dimming. */
export interface CropDimmingOverlaySnapshot {
  hasOverlayImage: boolean
  overlayVpt: boolean
  controlsAboveOverlay: boolean
  insideFrame: CropCanvasPixelInfo | null
  outsideFrame: CropCanvasPixelInfo | null
  outsideMontage: CropCanvasPixelInfo
}

/** Options for starting crop mode through the e2e model. */
export interface CropStartParams extends ObjectTargetParams {
  size?: CropSizeInfo
  aspectRatio?: CropSizeInfo
  allowFrameOverflow?: boolean
  showGrid?: boolean
  showDimmedArea?: boolean
  cancelOnSelectionClear?: boolean
  preserveAspectRatio?: boolean
}

/** Options for interactive crop-frame resize from a control. */
export interface CropResizeFromControlParams {
  control: CropControlKey
  widthRatio: number
  heightRatio: number
  shiftKey?: boolean
}
