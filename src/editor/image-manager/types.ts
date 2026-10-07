import type {
  Canvas,
  FabricImage,
  FabricObject,
  Rect
} from 'fabric'
import type { Translate } from '../i18n'
import type { EditorOptions } from '../types/options'

/** Successful image import result. */
export type SuccessulImageImportResult = {
  image: FabricImage | FabricObject
  format: string
  contentType: string
  scale: string
  withoutSave: boolean
  source?: File | string
  fromClipboard: boolean
  isBackground: boolean
  withoutSelection: boolean
  withoutAdding: boolean
  customData: object | null
}

/** Successful canvas or individual object export result. */
export type SuccessfulExportResult = {
  image: File | Blob | Base64URLString
  format: string
  contentType: string
  fileName: string
}

/** Options for importing an image into the editor. */
export type ImportImageOptions = {
  source: File | string,
  scale?: 'image-contain' | 'image-cover' | 'scale-montage',
  withoutSave?: boolean,
  fromClipboard?: boolean,
  isBackground?: boolean,
  withoutSelection?: boolean
  withoutAdding?: boolean,
  customData?: object
}

/** Options for resizing an image to the specified bounds. */
export type ResizeImageToBoundariesOptions = {
  dataURL: string,
  sizeType?: 'max' | 'min',
  contentType?: string,
  quality?: number,
  maxWidth?: number,
  maxHeight?: number,
  minWidth?: number,
  minHeight?: number,
  asBase64?: boolean,
  asBlob?: boolean,
  emitMessage?: boolean
}

/** Options for exporting an individual Fabric object. */
export type ExportObjectAsImageFileParameters = {
  object?: FabricObject,
  fileName?: string,
  contentType?: string,
  exportAsBase64?: boolean,
  exportAsBlob?: boolean
}

/** Options for exporting the entire artboard. */
export type exportCanvasAsImageFileOptions = {
  fileName?: string,
  contentType?: string,
  exportAsBase64?: boolean,
  exportAsBlob?: boolean
}

/** Error or warning payload that ImageManager passes to ErrorManager. */
export interface ImageManagerErrorPayload {
  code: string
  origin?: string
  method?: string
  message?: string
  data?: object
}

/** Minimal ErrorManager contract required by ImageManager. */
export interface ImageManagerErrorManager {
  emitError(payload: ImageManagerErrorPayload): void
  emitWarning(payload: ImageManagerErrorPayload): void
}

/** Minimal HistoryManager contract required by ImageManager. */
export interface ImageManagerHistoryManager {
  suspendHistory(): void
  resumeHistory(): void
  saveState(): void
}

/** Minimal WorkerManager contract required by ImageManager. */
export interface ImageManagerWorkerManager {
  post(
    action: string,
    payload: object,
    transferables?: Transferable[]
  ): Promise<File | Blob | Base64URLString>
}

/** Minimal ModuleLoader contract required by ImageManager. */
export interface ImageManagerModuleLoader {
  loadModule<T extends object = object>(name: string): Promise<T>
}

/** Minimal CanvasManager contract required by ImageManager. */
export interface ImageManagerCanvasManager {
  getMontageAreaSceneBounds(): {
    left: number
    top: number
    width: number
    height: number
  }
  centerObjectToMontageArea({ object }: { object: FabricObject }): void
  scaleMontageAreaToImage({
    object,
    withoutSave
  }: {
    object: FabricObject
    withoutSave?: boolean
  }): void
}

/** Minimal TransformManager contract required by ImageManager. */
export interface ImageManagerTransformManager {
  fitObject({
    object,
    type,
    withoutSave
  }: {
    object: FabricObject
    type: 'contain' | 'cover'
    withoutSave?: boolean
  }): void
}

/** Minimal InteractionBlocker contract required by ImageManager. */
export interface ImageManagerInteractionBlocker {
  isBlocked: boolean
  overlayMask?: FabricObject | null
}

/** Local editor port needed only by ImageManager. */
export interface ImageManagerEditor {
  readonly t: Translate
  options: EditorOptions
  canvas: Canvas
  montageArea: Rect
  moduleLoader: ImageManagerModuleLoader
  workerManager: ImageManagerWorkerManager
  errorManager: ImageManagerErrorManager
  historyManager: ImageManagerHistoryManager
  transformManager: ImageManagerTransformManager
  canvasManager: ImageManagerCanvasManager
  interactionBlocker?: ImageManagerInteractionBlocker
}
