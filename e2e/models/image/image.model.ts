/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  EditorObjectInfo,
  ImageScaleSnapshot,
  ObjectTargetParams,
  SnappingObjectSnapshot
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import { ImageScalingSession } from './image-scaling-session'

/** RGBA pixel color in a data-URL image. */
type ImagePixelColor = {
  red: number
  green: number
  blue: number
  alpha: number
}

/** Dimensions of the image in a data URL. */
type ImageDataUrlSize = {
  width: number
  height: number
}

/** Exported-file summary with initial bytes for checking its actual format. */
type CanvasFileExportInfo = {
  contentType: string
  fileName: string
  format: string
  header: number[]
}

/** Header length sufficient to check PNG, JPEG, WEBP, and PDF. */
const EXPORTED_FILE_HEADER_LENGTH = 12

/** Source of the live image object in Fabric. */
type ImageSourceInfo = {
  id: string | null
  src: string | null
  elementSrc: string | null
  runtimeSrc: string
  width: number
  height: number
  sourceWidth: number
  sourceHeight: number
}

/** Image transformation matrix in scene coordinates. */
type ImageTransformMatrix = [number, number, number, number, number, number]

/** Initial fitting method for the imported image. */
type ImageImportScale = 'image-contain' | 'image-cover' | 'scale-montage'

/** Complete description of a colored raster source for tests. */
type ColorGridImageParams = {
  width: number
  height: number
  topLeftFill: string
  topRightFill: string
  bottomLeftFill: string
  bottomRightFill: string
  scale: ImageImportScale
  withoutSelection: boolean
}

export class ImageModel {
  private readonly page: Page

  /** Complete image-resize lifecycle. */
  readonly scaling: ImageScalingSession

  constructor(page: Page) {
    this.page = page
    this.scaling = new ImageScalingSession(page)
  }

  /** Adds a raster image of the specified size through the public ImageManager API. */
  async addFilledImage(
    params: {
      width: number
      height: number
      fill?: string
      scale?: ImageImportScale
      withoutSelection?: boolean
    }
  ): Promise<EditorObjectInfo | null> {
    const {
      width,
      height,
      fill = '#f28f3b',
      scale = 'image-contain',
      withoutSelection = false
    } = params

    return this._addImageFromColorGrid({
      width,
      height,
      topLeftFill: fill,
      topRightFill: fill,
      bottomLeftFill: fill,
      bottomRightFill: fill,
      scale,
      withoutSelection
    })
  }

  /** Adds an image with four colored regions through the public ImageManager API. */
  async addColorGridImage(
    params: {
      width: number
      height: number
      topLeftFill: string
      topRightFill: string
      bottomLeftFill?: string
      bottomRightFill?: string
      scale?: ImageImportScale
      withoutSelection?: boolean
    }
  ): Promise<EditorObjectInfo | null> {
    const {
      width,
      height,
      topLeftFill,
      topRightFill,
      bottomLeftFill = topLeftFill,
      bottomRightFill = topRightFill,
      scale = 'image-contain',
      withoutSelection = false
    } = params

    return this._addImageFromColorGrid({
      width,
      height,
      topLeftFill,
      topRightFill,
      bottomLeftFill,
      bottomRightFill,
      scale,
      withoutSelection
    })
  }

  /** Creates a colored raster source and adds it through the public ImageManager API. */
  private async _addImageFromColorGrid(params: ColorGridImageParams): Promise<EditorObjectInfo | null> {
    return this.page.evaluate(async({
      width,
      height,
      topLeftFill,
      topRightFill,
      bottomLeftFill,
      bottomRightFill,
      scale,
      withoutSelection
    }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) return null

      context.fillStyle = topLeftFill
      context.fillRect(0, 0, width / 2, height / 2)
      context.fillStyle = topRightFill
      context.fillRect(width / 2, 0, width / 2, height / 2)
      context.fillStyle = bottomLeftFill
      context.fillRect(0, height / 2, width / 2, height / 2)
      context.fillStyle = bottomRightFill
      context.fillRect(width / 2, height / 2, width / 2, height / 2)

      const result = await editor.imageManager.importImage({
        source: canvas.toDataURL('image/png'),
        scale,
        withoutSelection
      })
      if (!result?.image) return null

      return helpers.serializeEditorObject(result.image)
    }, params)
  }

  /** Exports an image object to a data URL through the public ImageManager API. */
  async exportObjectAsBase64(params: ObjectTargetParams = {}): Promise<string> {
    const dataUrl = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return editor.imageManager.exportObjectAsImageFile({
        object: target,
        contentType: 'image/png',
        exportAsBase64: true
      }).then((result: { image?: unknown } | null) => (
        typeof result?.image === 'string' ? result.image : null
      ))
    }, params)

    expect(dataUrl, 'экспорт image-объекта должен вернуть data URL').not.toBeNull()
    if (!dataUrl) {
      throw new Error('Не удалось экспортировать image-объект в data URL')
    }

    return dataUrl
  }

  /** Exports the entire artboard to a data URL through the public ImageManager API. */
  async exportCanvasAsBase64(params: { contentType?: string } = {}): Promise<string> {
    const dataUrl = await this.page.evaluate(({ contentType = 'image/png' }) => {
      const { editor } = window as any

      return editor.imageManager.exportCanvasAsImageFile({
        contentType,
        exportAsBase64: true
      }).then((result: { image?: unknown } | null) => (
        typeof result?.image === 'string' ? result.image : null
      ))
    }, params)

    expect(dataUrl, 'экспорт монтажной области должен вернуть data URL').not.toBeNull()
    if (!dataUrl) {
      throw new Error('Не удалось экспортировать монтажную область в data URL')
    }

    return dataUrl
  }

  /** Exports the artboard to a File and returns metadata with the result's initial bytes. */
  async exportCanvasAsFile(
    params: {
      contentType: string
      fileName: string
    }
  ): Promise<CanvasFileExportInfo> {
    const result = await this.page.evaluate(async({ contentType, fileName, headerLength }) => {
      const { editor } = window as any
      const exported = await editor.imageManager.exportCanvasAsImageFile({
        contentType,
        fileName
      })

      if (!exported || !(exported.image instanceof File)) return null

      const fileBuffer = await exported.image.slice(0, headerLength).arrayBuffer()
      const header = Array.from(new Uint8Array(fileBuffer))

      return {
        contentType: exported.contentType,
        fileName: exported.fileName,
        format: exported.format,
        header
      }
    }, {
      ...params,
      headerLength: EXPORTED_FILE_HEADER_LENGTH
    })

    expect(result, 'экспорт монтажной области должен вернуть файл').not.toBeNull()
    if (!result) {
      throw new Error('Не удалось экспортировать монтажную область в файл')
    }

    expect(result.header, 'экспортированный файл должен содержать заголовок').not.toHaveLength(0)

    return result
  }

  /** Returns image dimensions from a data URL. */
  async getDataUrlSize(params: { dataUrl: string }): Promise<ImageDataUrlSize> {
    const size = await this.page.evaluate(async({ dataUrl }) => {
      const image = new Image()

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Не удалось загрузить data URL изображение'))
        image.src = dataUrl
      })

      return {
        width: image.width,
        height: image.height
      }
    }, params)

    expect(size, 'размер изображения должен читаться из data URL').not.toBeNull()

    return size
  }

  /** Returns a pixel color from an image data URL. */
  async getDataUrlPixelColor(params: { dataUrl: string, x: number, y: number }): Promise<ImagePixelColor> {
    const pixel = await this.page.evaluate(async({ dataUrl, x, y }) => {
      const image = new Image()

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Не удалось загрузить data URL изображение'))
        image.src = dataUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height

      const context = canvas.getContext('2d')
      if (!context) return null

      context.drawImage(image, 0, 0)

      const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data

      return {
        red,
        green,
        blue,
        alpha
      }
    }, params)

    expect(pixel, 'цвет пикселя должен читаться из data URL').not.toBeNull()
    if (!pixel) {
      throw new Error('Не удалось прочитать цвет пикселя из data URL')
    }

    return pixel
  }

  /** Returns the current image state by ID or canvas index. */
  async getObject(params: ObjectTargetParams = {}): Promise<EditorObjectInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeEditorObject(target)
    }, params)
  }

  /** Returns an image snapshot with its current bounding box. */
  async getSnapshot(params: ObjectTargetParams = {}): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot изображения').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Returns the actual image-rendering matrix in scene coordinates. */
  async getTransformMatrix(params: ObjectTargetParams = {}): Promise<ImageTransformMatrix> {
    const matrix = await this.page.evaluate(({ objectIndex, id }) => {
      const { __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target || typeof target.calcTransformMatrix !== 'function') return null

      return target.calcTransformMatrix()
    }, params)

    expect(matrix, 'у изображения должна существовать матрица преобразования').not.toBeNull()
    expect(matrix).toHaveLength(6)
    expect(matrix?.every(Number.isFinite), 'компоненты матрицы изображения должны быть конечными').toBe(true)
    if (!matrix) throw new Error('Не удалось получить матрицу преобразования изображения')

    return matrix as ImageTransformMatrix
  }

  /** Returns the image's runtime source. */
  async getSourceInfo(params: ObjectTargetParams = {}): Promise<ImageSourceInfo> {
    const info = await this.page.evaluate((targetParams) => {
      const runtimeWindow = window as any
      const target = runtimeWindow.__editorHelpers.resolveCanvasObject(
        targetParams.objectIndex,
        targetParams.id
      )
      if (!target) return null

      const source = target.getElement?.()
      const elementSrc = typeof source?.src === 'string' ? source.src : null
      const rawSrc = typeof target.getSrc === 'function'
        ? target.getSrc()
        : target.src ?? null
      const src = typeof rawSrc === 'string' ? rawSrc : null

      return {
        id: target.id ?? null,
        src,
        elementSrc,
        runtimeSrc: src ?? elementSrc ?? '',
        width: target.width ?? 0,
        height: target.height ?? 0,
        sourceWidth: source?.naturalWidth ?? source?.width ?? 0,
        sourceHeight: source?.naturalHeight ?? source?.height ?? 0
      }
    }, params)

    expect(info, 'должно существовать runtime source-состояние изображения').not.toBeNull()
    if (!info) {
      throw new Error('Не удалось получить runtime source-состояние изображения')
    }

    return info
  }

  /** Sets a regular scalable image stroke for a scaling scenario. */
  async setStroke({
    stroke,
    strokeWidth,
    ...targetParams
  }: {
    stroke: string
    strokeWidth: number
  } & ObjectTargetParams): Promise<ImageScaleSnapshot> {
    expect(stroke.length, 'цвет обводки изображения не должен быть пустым').toBeGreaterThan(0)
    expect(strokeWidth, 'толщина обводки изображения должна быть положительной').toBeGreaterThan(0)

    const strokeState = await this.page.evaluate(({ objectIndex, id, ...style }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.set({
        ...style,
        strokeUniform: false
      })
      target.setCoords()
      editor.canvas.renderAll()

      return {
        strokeUniform: target.strokeUniform,
        strokeWidth: target.strokeWidth
      }
    }, {
      stroke,
      strokeWidth,
      ...targetParams
    })

    expect(strokeState, 'изображение должно существовать для установки обводки').not.toBeNull()
    expect(strokeState?.strokeUniform, 'обычная обводка должна масштабироваться вместе с Image')
      .toBe(false)
    expect(strokeState?.strokeWidth).toBe(strokeWidth)

    await waitForCanvasRender({ page: this.page })

    return this.scaling.getSnapshot(targetParams)
  }

  /** Sets the image's absolute angle through the public TransformManager. */
  async setAngle(params: { angle: number } & ObjectTargetParams): Promise<void> {
    expect(Number.isFinite(params.angle), 'угол изображения должен быть конечным числом').toBe(true)
    if (!Number.isFinite(params.angle)) {
      throw new Error('Угол изображения должен быть конечным числом')
    }

    const updated = await this.page.evaluate(({ angle, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return false

      editor.transformManager.setAngle(target, angle)

      return true
    }, params)

    expect(updated, 'изображение должно существовать для изменения угла').toBe(true)
    await waitForCanvasRender({ page: this.page })
  }

  /** Flips the image along the selected axis through the public TransformManager. */
  async flip(
    params: { axis: 'x' | 'y' } & ObjectTargetParams
  ): Promise<EditorObjectInfo> {
    const result = await this.page.evaluate(({ axis, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const previousValue = axis === 'x' ? target.flipX : target.flipY

      editor.canvas.setActiveObject(target)
      if (axis === 'x') {
        editor.transformManager.flipX()
      } else {
        editor.transformManager.flipY()
      }

      return {
        previousValue,
        image: helpers.serializeEditorObject(target)
      }
    }, params)

    expect(result, 'изображение должно существовать для отражения').not.toBeNull()
    if (!result) throw new Error('Изображение должно существовать для отражения')

    const nextValue = params.axis === 'x' ? result.image.flipX : result.image.flipY

    expect(nextValue, 'состояние отражения изображения должно измениться').toBe(!result.previousValue)
    await waitForCanvasRender({ page: this.page })

    return result.image
  }

  /** Moves the top-left corner of the image bounds to canvas-scene coordinates. */
  async moveBoundsTo(
    params: { left: number, top: number } & ObjectTargetParams
  ): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({
      objectIndex,
      id,
      left,
      top
    }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.set({ left, top })
      target.setCoords()
      editor.canvas.renderAll()

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    await waitForCanvasRender({ page: this.page })
    expect(snapshot, 'должен существовать snapshot изображения после переноса').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Checks that the image was added and returns an object with a required ID. */
  checkCreation(params: { imageObject: EditorObjectInfo | null }): EditorObjectInfo & { id: string } {
    const { imageObject } = params

    expect(imageObject, 'изображение должно быть добавлено').not.toBeNull()
    expect(imageObject?.type, 'объект должен быть изображением').toBe('image')
    expect(imageObject?.id, 'у импортированного изображения должен быть id').toBeDefined()

    return imageObject as EditorObjectInfo & { id: string }
  }
}
