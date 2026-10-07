import { FabricObject, FabricImage, Point } from 'fabric'
import { ImageEditor } from '../index'
import { GroupedObjectsData, UngroupedObjectsData } from '../grouping-manager'
import type {
  BeforeShapeUpdatedPayload,
  ShapeAddedPayload,
  ShapeUpdatedPayload
} from '../shape-manager/types'
import type {
  TextAddedPayload,
  BeforeTextUpdatedPayload,
  TextUpdatedPayload
} from '../text-manager/types'
import type {
  CropApplyResult,
  CropState
} from '../crop-manager/types'
import type { PanViewportState } from '../pan-constraint-manager'

/**
 * Parameters for the editor:canvas-exported event
 */
export type CanvasExportedPayload = {
  image: File | Blob | Base64URLString
  format: string
  contentType: string
  fileName: string
}

/**
 * Parameters for the editor:object-exported event
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
 * Shared type for warning and error
 */
export type ErrorItem = {
  code: string
  origin?: string
  method?: string
  message?: string
  data?: object
}

/**
 * Parameters for the following events:
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
 * Parameters for the editor:object-fitted event
 */
export type ObjectFittedPayload = {
  object?: FabricObject
  type?: 'contain' | 'cover'
  withoutSave?: boolean
  fitAsOneObject?: boolean
}

/**
 * Parameters for the editor:montage-area-scaled-to-image event
 */
export type MontageAreaScaledToImagePayload = {
  object: FabricObject
  width: number
  height: number
  preserveAspectRatio?: boolean
  withoutSave?: boolean
}

/**
 * Parameters for the editor:canvas-updated event
 */
export type CanvasUpdatedPayload = {
  width: number
  height: number
}

/**
 * Parameters for the editor:pan-changed event
 */
export type PanChangedPayload = {
  panState: PanViewportState
  viewportTransform: number[]
}

/**
 * Parameters for the editor:objects-deleted event
 */
export type ObjectsDeletedPayload = {
  objects: FabricObject[]
  withoutSave?: boolean
}

/**
 * Parameters for the editor:objects-delete-skipped event
 */
export type ObjectsDeleteSkippedPayload = {
  skippedObjects: FabricObject[]
  requestedObjects: FabricObject[]
  withoutSave?: boolean
}

/**
 * Parameters for the editor:history-state-loaded event
 * @todo: Replace object with a type matching the history state object once the class has been rewritten in TS
 */
export type HistoryStateLoadedPayload = {
  fullState: object,
  currentIndex: number,
  totalChangesCount: number,
  baseStateChangesCount: number,
  patchesCount: number,
  patches: object[]
}

/**
 * The action that changed the observed history state.
 */
export type HistoryChangedAction = 'save' | 'undo' | 'redo'

/**
 * Compact history state for external controls, autosave, and dirty-state tracking.
 */
export type HistoryChangedPayload = {
  action: HistoryChangedAction
  currentIndex: number
  totalChangesCount: number
  baseStateChangesCount: number
  patchesCount: number
  canUndo: boolean
  canRedo: boolean
  hasUnsavedChanges: boolean
  currentChangePosition: number
  patchId?: string
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
 * Parameters for the background:changed event
 */
export type BackgroundChangedPayload = {
  type: 'color' | 'gradient' | 'image'
  color?: string
  gradientParams?: import('../background-manager').GradientBackground // new gradient format
  imageSource?: string | File,
  backgroundObject?: FabricImage | FabricObject | null
  customData?: object
  fromTemplate?: boolean
  withoutSave?: boolean
}

export type BackgroundRemovedPayload = {
  withoutSave?: boolean
}

export type ExternalImagePasteImportOptions = Partial<
  Omit<import('../image-manager').ImportImageOptions, 'source' | 'fromClipboard'>
>

export type ExternalImagePastePendingPayload = {
  imageSource: string | File,
  defer: () => {
    resolve: (importOptions?: ExternalImagePasteImportOptions | null) => void
    reject: (error?: unknown) => void
  }
}

export type TemplateAppliedPayload = {
  template: import('../template-manager').TemplateDefinition
  objects: FabricObject[]
  bounds: {
    left: number
    top: number
    width: number
    height: number
  }
}

declare module 'fabric' {
  interface CanvasEvents {
    /**
     * Fires after the editor has been successfully initialized and rendered.
     */
    'editor:ready': ImageEditor

    /**
     * A warning that something went wrong
     */
    'editor:warning': ErrorItem

    /**
     * An error that occurred in the editor.
     */
    'editor:error': ErrorItem

    /**
     * An informational message
     */
    'editor:info': string

    /**
     * Successful completion of an operation.
     */
    'editor:success': string

    /**
     * Fires after exporting the canvas to a file or base64.
     */
    'editor:canvas-exported': CanvasExportedPayload

    /**
     * Fires after successfully importing an image into the editor.
     */
    'editor:image-imported': CanvasImportedImagePayload

    /**
     * Fires after changing the internal canvas width (for export).
     */
    'editor:resolution-width-changed': ResolutionWidthChangedPayload

    /**
     * Fires after changing the internal canvas height (for export).
     */
    'editor:resolution-height-changed': ResolutionHeightChangedPayload

    /**
     * Fires when the CSS width of the canvas itself changes (upper and lower canvas).
     */
    'editor:display-canvas-width-changed': DisplayDimensionsChangedPayload

    /**
     * Fires when the CSS height of the canvas itself changes (upper and lower canvas).
     */
    'editor:display-canvas-height-changed': DisplayDimensionsChangedPayload

    /**
     * Fires when the CSS width of the canvas wrapper changes.
     */
    'editor:display-wrapper-width-changed': DisplayDimensionsChangedPayload

    /**
     * Fires when the CSS height of the canvas wrapper changes.
     */
    'editor:display-wrapper-height-changed': DisplayDimensionsChangedPayload

    /**
     * Fires when the CSS width of the editor container changes.
     */
    'editor:display-container-width-changed': DisplayDimensionsChangedPayload

    /**
     * Fires when the CSS height of the editor container changes.
     */
    'editor:display-container-height-changed': DisplayDimensionsChangedPayload

    /**
     * Fires when an image is scaled (fitted to the artboard) in 'contain' or 'cover' mode.
     */
    'editor:object-fitted': ObjectFittedPayload

    /**
     * Fires when the artboard (canvas) is scaled to the image dimensions.
     */
    'editor:montage-area-scaled-to-image': MontageAreaScaledToImagePayload

    /**
     * Fires when the canvas is resized and subsequently updated.
     */
    'editor:canvas-updated': CanvasUpdatedPayload

    /**
     * Fires after exporting an individual object to a file or base64.
     */
    'editor:object-exported': CanvasObjectExportedPayload

    /**
     * Fires when the selected objects are grouped.
     */
    'editor:objects-grouped': GroupedObjectsData

    /**
     * Fires when objects are ungrouped.
     */
    'editor:objects-ungrouped': UngroupedObjectsData

    /**
     * Fires when the selected objects are deleted from the canvas.
     */
    'editor:objects-deleted': ObjectsDeletedPayload

    /**
     * Fires when some objects cannot be deleted through editor operations.
     */
    'editor:objects-delete-skipped': ObjectsDeleteSkippedPayload

    /**
     * Fires after loading the canvas state (from history JSON).
     */
    'editor:history-state-loaded': HistoryStateLoadedPayload

    /**
     * Fires after an actual change to the history state.
     */
    'editor:history-changed': HistoryChangedPayload

    /**
     * Fires after the public text-addition operation completes successfully.
     */
    'editor:text-added': TextAddedPayload

    /**
     * Fires before a programmatic text update is committed to history.
     * Allows aggregate owners to synchronize derived state.
     */
    'editor:before:text-updated': BeforeTextUpdatedPayload

    /**
     * Fires after a programmatic text update completes.
     */
    'editor:text-updated': TextUpdatedPayload

    /**
     * Fires after the public shape-composition addition operation completes successfully.
     */
    'editor:shape-added': ShapeAddedPayload

    /**
     * Fires after entering crop mode.
     */
    'editor:crop:started': CropState | null

    /**
     * Fires when the crop frame changes.
     */
    'editor:crop:changed': CropState | null

    /**
     * Fires after the crop is applied.
     */
    'editor:crop:applied': CropApplyResult

    /**
     * Fires after exiting crop mode without applying the crop.
     */
    'editor:crop:cancelled': {
      mode: 'canvas' | 'image'
      target: FabricImage | null
    }

    /**
     * Fires before a shape-composition update is committed to history.
     */
    'editor:before:shape-updated': BeforeShapeUpdatedPayload

    /**
     * Fires after a shape-composition update completes.
     */
    'editor:shape-updated': ShapeUpdatedPayload

    /**
     * Fires after an undo operation completes successfully.
     */
    'editor:undo': HistoryStateLoadedPayload

    /**
     * Fires after a redo operation completes successfully.
     */
    'editor:redo': HistoryStateLoadedPayload

    /**
     * Fires after the canvas has been completely cleared.
     */
    'editor:cleared': void,

    /**
     * Fires when all objects on the canvas are selected.
     */
    'editor:all-objects-selected': { selected: FabricObject }

    /**
     * Fires after an object is copied.
     */
    'editor:object-copied': { object: FabricObject }

    /**
     * Fires after an object is pasted.
     */
    'editor:object-pasted': {
      imageSource?: string | File,
      object: FabricObject,
      fromInternalClipboard: boolean,
      clipboardObject?: FabricObject | null
     }

    /**
     * Fires before pasting an image from the external clipboard.
     * Allows the paste to be deferred and customData to be supplied.
     */
    'editor:external-image-paste-pending': ExternalImagePastePendingPayload

    /**
     * Fires after clicking the "Create a copy" button in the selected object's toolbar.
     */
    'editor:object-duplicated': { targetObject: FabricObject, clonedObject: FabricObject }

    /**
     * Fires after an object is rotated.
     */
    'editor:object-rotated': { object: FabricObject, angle: number, withoutSave?: boolean }

    /**
     * Fires after an object is flipped horizontally.
     */
    'editor:object-flipped-x': { object: FabricObject, withoutSave?: boolean }

    /**
     * Fires after an object is flipped vertically.
     */
    'editor:object-flipped-y': { object: FabricObject, withoutSave?: boolean }

    /**
     * Fires after an object is brought to the front.
     */
    'editor:object-bring-to-front': { object: FabricObject, withoutSave?: boolean }

    /**
     * Fires after an object is brought forward by one level.
     */
    'editor:object-bring-forward': { object: FabricObject, withoutSave?: boolean }

    /**
     * Fires after an object is sent to the back.
     */
    'editor:object-send-to-back': { object: FabricObject, withoutSave?: boolean }

    /**
     * Fires after an object is sent backward by one level.
     */
    'editor:object-send-backwards': { object: FabricObject, withoutSave?: boolean }

    /**
     * Fires when the canvas zoom changes.
     */
    'editor:zoom-changed': {
      currentZoom: number,
      zoom?: number,
      point: Point
    }

    /**
     * Fires when viewportTransform changes through panning.
     */
    'editor:pan-changed': PanChangedPayload

    /**
     * Fires when an object's opacity changes.
     */
    'editor:object-opacity-changed': {
      object: FabricObject
      opacity: number,
      withoutSave?: boolean
    }

    /**
     * Fires after the default canvas scale and zoom are set.
     */
    'editor:default-scale-set': void,

    /**
     * Locking an object
     */
    'editor:object-locked': {
      object: FabricObject
      skipInnerObjects?: boolean
      withoutSave?: boolean
    }

    /**
     * Unlocking an object
     */
    'editor:object-unlocked': {
      object: FabricObject
      withoutSave?: boolean
    }

    /**
     * Resetting an object to its initial state
     */
    'editor:object-reset': {
      object: FabricObject,
      alwaysFitObject?: boolean,
      withoutSave?: boolean
    }

    /**
     * Locking interaction with the artboard
     */
    'editor:disabled': void

    /**
     * Unlocking interaction with the artboard
     */
    'editor:enabled': void

    /**
     * Fires when the background changes.
     */
    'editor:background:changed': BackgroundChangedPayload

    /**
     * Fires when the background is removed.
     */
    'editor:background:removed': BackgroundRemovedPayload

    /**
     * Fires after a template is applied to the current artboard.
     */
    'editor:template-applied': TemplateAppliedPayload
  }
}
