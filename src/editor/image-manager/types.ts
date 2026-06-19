import type {
  Canvas,
  CanvasOptions,
  FabricImage,
  FabricObject,
  Rect
} from 'fabric'

/** Успешный результат импорта изображения. */
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

/** Успешный результат экспорта canvas или отдельного объекта. */
export type SuccessfulExportResult = {
  image: File | Blob | Base64URLString
  format: string
  contentType: string
  fileName: string
}

/** Опции импорта изображения в редактор. */
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

/** Опции изменения размера изображения до заданных границ. */
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

/** Опции экспорта отдельного Fabric-объекта. */
export type ExportObjectAsImageFileParameters = {
  object?: FabricObject,
  fileName?: string,
  contentType?: string,
  exportAsBase64?: boolean,
  exportAsBlob?: boolean
}

/** Опции экспорта всей монтажной области. */
export type exportCanvasAsImageFileOptions = {
  fileName?: string,
  contentType?: string,
  exportAsBase64?: boolean,
  exportAsBlob?: boolean
}

/** Payload ошибки или предупреждения, который ImageManager передаёт в ErrorManager. */
export interface ImageManagerErrorPayload {
  code: string
  origin?: string
  method?: string
  message?: string
  data?: object
}

/** Минимальный контракт ErrorManager, который нужен ImageManager. */
export interface ImageManagerErrorManager {
  emitError(payload: ImageManagerErrorPayload): void
  emitWarning(payload: ImageManagerErrorPayload): void
}

/** Минимальный контракт HistoryManager, который нужен ImageManager. */
export interface ImageManagerHistoryManager {
  suspendHistory(): void
  resumeHistory(): void
  saveState(): void
}

/** Минимальный контракт WorkerManager, который нужен ImageManager. */
export interface ImageManagerWorkerManager {
  post(
    action: string,
    payload: object,
    transferables?: Transferable[]
  ): Promise<File | Blob | Base64URLString>
}

/** Минимальный контракт ModuleLoader, который нужен ImageManager. */
export interface ImageManagerModuleLoader {
  loadModule<T extends object = object>(name: string): Promise<T>
}

/** Минимальный контракт CanvasManager, который нужен ImageManager. */
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

/** Минимальный контракт TransformManager, который нужен ImageManager. */
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

/** Минимальный контракт InteractionBlocker, который нужен ImageManager. */
export interface ImageManagerInteractionBlocker {
  isBlocked: boolean
  overlayMask?: FabricObject | null
}

/** Локальный порт редактора, который нужен только ImageManager. */
export interface ImageManagerEditor {
  options: CanvasOptions
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
