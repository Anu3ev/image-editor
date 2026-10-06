import type { FabricImage, FabricObject, Rect } from 'fabric'
import type { CropFrame } from './domain/crop-frame'

/**
 * Crop manager operating modes.
 */
export type CropMode = 'canvas' | 'image'

/**
 * Crop frame size in the local coordinate system of the crop source.
 */
export type CropSize = {
  width: number
  height: number
}

/**
 * Crop frame aspect ratio. Values are interpreted as the width / height ratio.
 */
export type CropAspectRatio = {
  width: number
  height: number
}

/**
 * Method for scaling the crop frame to the artboard.
 */
export type CropFrameFitType = 'contain' | 'cover'

/**
 * Options for starting an artboard crop.
 */
export type StartCanvasCropOptions = {
  size?: CropSize
  /** Visible aspect ratio of the crop area on the canvas. */
  aspectRatio?: CropAspectRatio
  allowFrameOverflow?: boolean
  showGrid?: boolean
  showDimmedArea?: boolean
  cancelOnSelectionClear?: boolean
  preserveAspectRatio?: boolean
}

/**
 * Options for starting an image crop.
 */
export type StartImageCropOptions = {
  target?: FabricImage
  size?: CropSize
  /** Visible aspect ratio of the crop area on the canvas. */
  aspectRatio?: CropAspectRatio
  allowFrameOverflow?: boolean
  showGrid?: boolean
  showDimmedArea?: boolean
  cancelOnSelectionClear?: boolean
  preserveAspectRatio?: boolean
}

/**
 * Runtime settings for the active crop session.
 */
export type CropSessionOptions = {
  allowFrameOverflow: boolean
  showGrid: boolean
  showDimmedArea: boolean
  cancelOnSelectionClear: boolean
  preserveAspectRatio: boolean
}

/**
 * Parameters for toggling aspect ratio preservation for the active crop area.
 */
export type SetCropPreserveAspectRatioOptions = {
  preserveAspectRatio: boolean
  keepCurrentResizeMode?: boolean
}

/**
 * Crop rect in result coordinates: relative to the artboard top-left for canvas crops,
 * relative to the top-left of the currently visible image area for image crops.
 */
export type CropRect = {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Saved object interactivity state while crop mode is active.
 */
export type CropObjectInteractivity = {
  object: FabricObject
  selectable: boolean
  evented: boolean
}

/**
 * Crop frame geometry restored only within a live resize session.
 */
export type CropFrameTransformState = {
  left: number
  top: number
  scaleX: number
  scaleY: number
}

/**
 * Shared runtime fields of a crop session. Not serialized or included in history.
 */
type BaseCropSession = {
  source: FabricObject
  frame: CropFrame
  options: CropSessionOptions
  previousActiveObject: FabricObject | null
  interactivity: CropObjectInteractivity[]
  sourceBoundFrameState: CropFrameTransformState | null
  effectivePreserveAspectRatio: boolean
}

/**
 * Runtime crop mode session for the artboard.
 */
export type CanvasCropSession = BaseCropSession & {
  mode: 'canvas'
  target: null
}

/**
 * Runtime crop mode session for an image.
 */
export type ImageCropSession = BaseCropSession & {
  mode: 'image'
  target: FabricImage
}

/**
 * Runtime crop mode session. Not serialized or included in history.
 */
export type CropSession = CanvasCropSession | ImageCropSession

/**
 * Public state of the active crop mode.
 */
export type CropState = {
  mode: CropMode
  frame: Rect
  options: CropSessionOptions
  target: FabricImage | null
  effectivePreserveAspectRatio: boolean
  rect: CropRect
}

/**
 * Result of applying crop mode.
 */
export type CropApplyResult = {
  mode: CropMode
  target: FabricImage | null
  rect: CropRect
}
