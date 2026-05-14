import {
  ActiveSelection,
  Canvas,
  FabricImage,
  FabricObject,
  Point,
  Textbox,
  loadSVGFromString,
  util
} from 'fabric'
import { nanoid } from 'nanoid'

import { ImageEditor } from '../index'
import { errorCodes } from '../error-manager/error-codes'
import { OBJECT_SERIALIZATION_PROPS } from '../history-manager'
import {
  denormalizePlacement,
  resolveNormalizedPlacement,
  snapObjectToPixelGrid,
  toNumber,
  type Dimensions
} from '../utils/geometry'
import { materializeObjectIdentity } from '../utils/object-identity'
import {
  convertGradientToOptions
} from '../utils/gradient'

type Bounds = {
  left: number
  top: number
  width: number
  height: number
}

type PointInfo = {
  x: number
  y: number
}

type TemplatePlaceholder = {
  id: string
  label?: string
  type: 'text' | 'image'
}

type ImageFit = 'contain' | 'stretch'

type ImageRestorePlan = {
  nextProps: Record<string, number>
  targetWidth: number
  targetHeight: number
  baseScaleX: number
  baseScaleY: number
  hasIntrinsicSize: boolean
}

type ImageRestorePropsParams = {
  imageFit: ImageFit
  intrinsicWidth: number
  intrinsicHeight: number
  targetWidth: number
  targetHeight: number
  baseScaleX: number
  baseScaleY: number
}

export type TemplateMeta = {
  baseWidth: number
  baseHeight: number
  previewId?: string
  requiredFonts?: string[]
  placeholders?: TemplatePlaceholder[]
  positionsNormalized?: boolean
  [key: string]: unknown
}

const TEMPLATE_ANCHOR_X_KEY = '_templateAnchorX'
const TEMPLATE_ANCHOR_Y_KEY = '_templateAnchorY'

type TemplateAnchor = 'start' | 'center' | 'end'

type TemplateAnchors = {
  _templateAnchorX?: TemplateAnchor
  _templateAnchorY?: TemplateAnchor
}

type TemplateCustomData = Record<string, unknown> & {
  templateField?: string
  text?: string
  imageFit?: ImageFit
}

export type TemplateObjectData = Record<string, unknown> & {
  left?: number
  top?: number
  scaleX?: number
  scaleY?: number
  svgMarkup?: string
  customData?: TemplateCustomData
  _templateAnchorX?: TemplateAnchor
  _templateAnchorY?: TemplateAnchor
}

export type TemplateDefinition = {
  id: string
  meta: TemplateMeta
  objects: TemplateObjectData[]
}

export type SerializeTemplateOptions = {
  templateId?: string
  previewId?: string
  meta?: Partial<Omit<TemplateMeta, 'baseWidth' | 'baseHeight'>>
  withBackground?: boolean
}

export type ApplyTemplateOptions = {
  template: TemplateDefinition
  data?: Record<string, string>
}

type BoundingRectReadableObject = FabricObject & {
  getBoundingRect: (absolute?: boolean, calculate?: boolean) => Bounds
}

export default class TemplateManager {
  /**
   * Инстанс редактора
   */
  public editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Сериализует текущее выделение в описание шаблона.
   * @returns описание шаблона или null, если нечего сохранять
   */
  public serializeSelection({
    templateId,
    previewId,
    meta = {},
    withBackground = false
  }: SerializeTemplateOptions = {}): TemplateDefinition | null {
    const {
      canvas,
      montageArea,
      errorManager,
      backgroundManager
    } = this.editor
    const activeObject = canvas.getActiveObject()
    const objectsToSerialize = TemplateManager._collectObjects(activeObject)
    const { backgroundObject } = backgroundManager ?? {}
    const backgroundObjects = withBackground && backgroundObject ? [backgroundObject] : []
    const serializableObjects = [...objectsToSerialize, ...backgroundObjects]

    if (!serializableObjects.length) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'serializeSelection',
        code: errorCodes.TEMPLATE_MANAGER.NO_OBJECTS_SELECTED,
        message: 'Нет объектов для сериализации шаблона'
      })
      return null
    }

    const referenceBounds = TemplateManager._getBounds(montageArea)
    const baseSize = TemplateManager._getMontageSize({ montageArea, bounds: referenceBounds })
    const baseWidth = baseSize.width
    const baseHeight = baseSize.height

    const serializedObjects = serializableObjects
      .map((object) => this._serializeObject({
        object,
        bounds: referenceBounds,
        baseWidth,
        baseHeight
      }))
    const inheritedPreviewId = typeof meta.previewId === 'string'
      ? meta.previewId
      : undefined

    const templateMeta: TemplateMeta = {
      ...meta,
      baseWidth,
      baseHeight,
      positionsNormalized: true,
      previewId: previewId ?? inheritedPreviewId
    }

    const template: TemplateDefinition = {
      id: templateId ?? `template-${nanoid()}`,
      meta: templateMeta,
      objects: serializedObjects
    }

    return template
  }

  /**
   * Применяет шаблон к монтажной области без очистки текущих объектов.
   * @param options
   * @param options.template - описание шаблона.
   * Standalone text и shape-композиции после rehydration приводятся к канонической геометрии
   * до добавления на canvas, чтобы template-path не оставлял смешанное width/scale состояние.
   */
  public async applyTemplate({
    template
  }: ApplyTemplateOptions): Promise<FabricObject[] | null> {
    const {
      canvas,
      montageArea,
      historyManager,
      errorManager,
      backgroundManager,
      shapeManager,
      textManager
    } = this.editor

    const { objects, meta: templateMeta, id: templateId } = template ?? {}

    if (!objects?.length) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.INVALID_TEMPLATE,
        message: 'Шаблон не содержит объектов'
      })
      return null
    }

    const montageBounds = TemplateManager._getBounds(montageArea)

    if (!montageBounds) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.INVALID_TARGET,
        message: 'Не удалось определить границы монтажной области'
      })
      return null
    }

    // Нормализуем метаданные и вычисляем масштаб относительно текущей монтажной области
    const targetSize = TemplateManager._getMontageSize({ montageArea, bounds: montageBounds })
    const meta = TemplateManager._normalizeMeta({ meta: templateMeta, fallback: targetSize })
    const scale = TemplateManager._calculateScale({ meta, target: targetSize })
    const useRelativePositions = Boolean(meta.positionsNormalized)

    let shouldSaveHistory = false
    let backgroundApplied = false

    historyManager.suspendHistory()

    try {
      // Восстанавливаем Fabric-объекты из сохранённых данных шаблона
      const enlivenedObjects = await TemplateManager._enlivenObjects({
        objects,
        baseWidth: meta.baseWidth,
        baseHeight: meta.baseHeight,
        useRelativePositions
      })

      if (!enlivenedObjects.length) {
        errorManager.emitWarning({
          origin: 'TemplateManager',
          method: 'applyTemplate',
          code: errorCodes.TEMPLATE_MANAGER.INVALID_TEMPLATE,
          message: 'Не удалось создать объекты шаблона'
        })
        return null
      }

      // Отделяем фон от контента, фон применяем через менеджер фона
      const { backgroundObject, contentObjects } = TemplateManager._extractBackgroundObject(enlivenedObjects)

      if (backgroundObject) {
        backgroundApplied = await TemplateManager._applyBackgroundFromObject({
          backgroundObject,
          backgroundManager,
          errorManager
        })
      }

      // Материализуем type-specific geometry, трансформируем координаты и добавляем объекты на канвас
      const insertedObjects = contentObjects.map((object) => {
        this._adaptTextboxWidth({
          object,
          baseWidth: meta.baseWidth
        })

        this._transformObject({
          object,
          scale,
          bounds: montageBounds,
          baseWidth: meta.baseWidth,
          baseHeight: meta.baseHeight,
          useRelativePositions
        })

        textManager.commitStandaloneTextScale({
          target: object
        })
        shapeManager.commitRehydratedShapeLayout({
          target: object,
          textScale: scale
        })

        snapObjectToPixelGrid({ object })

        materializeObjectIdentity({
          rootObject: object
        })

        canvas.add(object)

        return object
      })

      if (!insertedObjects.length && !backgroundApplied) return null

      shouldSaveHistory = insertedObjects.length > 0 || backgroundApplied

      if (insertedObjects.length) {
        TemplateManager._activateObjects({ canvas, objects: insertedObjects })
      }

      canvas.requestRenderAll()
      canvas.fire('editor:template-applied', {
        template,
        objects: insertedObjects,
        bounds: montageBounds
      })

      return insertedObjects
    } catch (error) {
      errorManager.emitError({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.APPLY_FAILED,
        message: 'Ошибка применения шаблона',
        data: {
          templateId,
          error
        }
      })
      return null
    } finally {
      historyManager.resumeHistory()
      if (shouldSaveHistory) {
        historyManager.saveState()
      }
    }
  }

  /**
   * Подготавливает объекты для сериализации.
   */
  private static _collectObjects(
    object?: FabricObject | ActiveSelection | null
  ): FabricObject[] {
    if (!object) return []

    if (object instanceof ActiveSelection) {
      return object.getObjects()
    }

    return [object]
  }

  /**
   * Возвращает габариты объекта.
   */
  private static _getBounds(object?: FabricObject | null): Bounds | null {
    if (!object) return null

    try {
      // Принудительно пересчитываем координаты перед получением bounds
      object.setCoords()
      const rect = TemplateManager._getBoundingRect(object)
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }
    } catch {
      return null
    }
  }

  /**
   * Возвращает scene bounds объекта через runtime-сигнатуру Fabric.
   */
  private static _getBoundingRect(object: FabricObject): Bounds {
    const readableObject = object as BoundingRectReadableObject

    return readableObject.getBoundingRect(false, true)
  }

  /**
   * Превращает plain-описание объектов в Fabric объекты.
   */
  private static async _enlivenObjects({
    objects,
    baseWidth,
    baseHeight,
    useRelativePositions
  }: {
    objects: TemplateObjectData[]
    baseWidth: number
    baseHeight: number
    useRelativePositions: boolean
  }): Promise<FabricObject[]> {
    const revivedList = await Promise.all(objects.map(async(serialized) => {
      if (TemplateManager._hasSerializedSvgMarkup(serialized)) {
        const revived = await TemplateManager._reviveSvgObject(serialized)
        if (revived) {
          TemplateManager._restoreImageScale({
            revived,
            serialized,
            baseWidth,
            baseHeight,
            useRelativePositions
          })
          return revived
        }
      }

      const enlivened = await util.enlivenObjects<FabricObject>([serialized])
      const revived = enlivened?.[0]

      if (revived) {
        TemplateManager._restoreImageScale({
          revived,
          serialized,
          baseWidth,
          baseHeight,
          useRelativePositions
        })
        return revived
      }

      return null
    }))

    return revivedList.filter((object): object is FabricObject => Boolean(object))
  }

  /**
   * Восстанавливает масштаб изображения, если его фактический размер отличается от сериализованного.
   */
  private static _restoreImageScale({
    revived,
    serialized,
    baseWidth,
    baseHeight,
    useRelativePositions
  }: {
    revived: FabricObject
    serialized: TemplateObjectData
    baseWidth: number
    baseHeight: number
    useRelativePositions: boolean
  }): void {
    const objectType = typeof revived.type === 'string' ? revived.type.toLowerCase() : ''

    if (objectType !== 'image') return

    const image = revived as FabricImage
    const plan = TemplateManager._createImageRestorePlan({ image, serialized })

    if (!plan.hasIntrinsicSize) {
      image.set(plan.nextProps)
      return
    }

    const originalCenter = TemplateManager._resolveImageTemplateCenter({
      image,
      serialized,
      plan,
      baseWidth,
      baseHeight,
      useRelativePositions
    })

    image.set(plan.nextProps)
    TemplateManager._restoreImageTemplateCenter({
      image,
      center: originalCenter,
      baseWidth,
      baseHeight,
      useRelativePositions
    })
  }

  /**
   * Собирает план восстановления размера изображения по serialized box и новому intrinsic size.
   */
  private static _createImageRestorePlan({
    image,
    serialized
  }: {
    image: FabricImage
    serialized: TemplateObjectData
  }): ImageRestorePlan {
    const {
      width: intrinsicWidth,
      height: intrinsicHeight
    } = TemplateManager._getImageIntrinsicSize({ image })
    const {
      width: serializedWidth,
      height: serializedHeight,
      scaleX: serializedScaleX,
      scaleY: serializedScaleY,
      customData
    } = serialized
    const targetWidth = toNumber({ value: serializedWidth, fallback: intrinsicWidth })
    const targetHeight = toNumber({ value: serializedHeight, fallback: intrinsicHeight })
    const baseScaleX = toNumber({ value: serializedScaleX, fallback: image.scaleX || 1 })
    const baseScaleY = toNumber({ value: serializedScaleY, fallback: image.scaleY || 1 })
    const imageFit = TemplateManager._resolveImageFit({ customData })
    const nextProps = TemplateManager._resolveImageRestoreProps({
      imageFit,
      intrinsicWidth,
      intrinsicHeight,
      targetWidth,
      targetHeight,
      baseScaleX,
      baseScaleY
    })

    const hasIntrinsicWidth = intrinsicWidth > 0
    const hasIntrinsicHeight = intrinsicHeight > 0

    return {
      nextProps,
      targetWidth,
      targetHeight,
      baseScaleX,
      baseScaleY,
      hasIntrinsicSize: hasIntrinsicWidth && hasIntrinsicHeight
    }
  }

  /**
   * Возвращает фактический размер нового изображения.
   */
  private static _getImageIntrinsicSize({ image }: { image: FabricImage }): Dimensions {
    const element = 'getElement' in image && typeof image.getElement === 'function'
      ? image.getElement()
      : null

    const {
      naturalWidth = 0,
      naturalHeight = 0,
      width: elementWidth = 0,
      height: elementHeight = 0
    } = element instanceof HTMLImageElement
      ? element
      : {
        naturalWidth: 0,
        naturalHeight: 0,
        width: 0,
        height: 0
      }

    return {
      width: toNumber({ value: naturalWidth || elementWidth || image.width, fallback: 0 }),
      height: toNumber({ value: naturalHeight || elementHeight || image.height, fallback: 0 })
    }
  }

  /**
   * Возвращает свойства размера и scale, которые должны быть применены к восстановленному изображению.
   */
  private static _resolveImageRestoreProps({
    imageFit,
    intrinsicWidth,
    intrinsicHeight,
    targetWidth,
    targetHeight,
    baseScaleX,
    baseScaleY
  }: ImageRestorePropsParams): Record<string, number> {
    const targetDisplayWidth = targetWidth * baseScaleX
    const targetDisplayHeight = targetHeight * baseScaleY
    const hasIntrinsicWidth = intrinsicWidth > 0
    const hasIntrinsicHeight = intrinsicHeight > 0
    const nextProps: Record<string, number> = {}

    if (hasIntrinsicWidth) {
      nextProps.width = intrinsicWidth
    }

    if (hasIntrinsicHeight) {
      nextProps.height = intrinsicHeight
    }

    if (!hasIntrinsicWidth || !hasIntrinsicHeight) {
      return nextProps
    }

    if (imageFit === 'stretch') {
      TemplateManager._applyStretchedImageScale({
        nextProps,
        intrinsicWidth,
        intrinsicHeight,
        targetDisplayWidth,
        targetDisplayHeight
      })
      return nextProps
    }

    TemplateManager._applyContainedImageScale({
      nextProps,
      intrinsicWidth,
      intrinsicHeight,
      targetDisplayWidth,
      targetDisplayHeight
    })

    return nextProps
  }

  /**
   * Добавляет независимый scale по осям для stretch-режима.
   */
  private static _applyStretchedImageScale({
    nextProps,
    intrinsicWidth,
    intrinsicHeight,
    targetDisplayWidth,
    targetDisplayHeight
  }: {
    nextProps: Record<string, number>
    intrinsicWidth: number
    intrinsicHeight: number
    targetDisplayWidth: number
    targetDisplayHeight: number
  }): void {
    const nextScaleX = targetDisplayWidth > 0 ? targetDisplayWidth / intrinsicWidth : null
    const nextScaleY = targetDisplayHeight > 0 ? targetDisplayHeight / intrinsicHeight : null

    if (nextScaleX && nextScaleX > 0) {
      nextProps.scaleX = nextScaleX
    }

    if (nextScaleY && nextScaleY > 0) {
      nextProps.scaleY = nextScaleY
    }
  }

  /**
   * Добавляет единый scale для contain-режима.
   */
  private static _applyContainedImageScale({
    nextProps,
    intrinsicWidth,
    intrinsicHeight,
    targetDisplayWidth,
    targetDisplayHeight
  }: {
    nextProps: Record<string, number>
    intrinsicWidth: number
    intrinsicHeight: number
    targetDisplayWidth: number
    targetDisplayHeight: number
  }): void {
    if (targetDisplayWidth <= 0 || targetDisplayHeight <= 0) return

    const containScale = Math.min(targetDisplayWidth / intrinsicWidth, targetDisplayHeight / intrinsicHeight)

    if (Number.isFinite(containScale) && containScale > 0) {
      nextProps.scaleX = containScale
      nextProps.scaleY = containScale
    }
  }

  /**
   * Вычисляет центр исходной template-области изображения в координатах template-base.
   */
  private static _resolveImageTemplateCenter({
    image,
    serialized,
    plan,
    baseWidth,
    baseHeight,
    useRelativePositions
  }: {
    image: FabricImage
    serialized: TemplateObjectData
    plan: ImageRestorePlan
    baseWidth: number
    baseHeight: number
    useRelativePositions: boolean
  }): PointInfo {
    const originalProps = {
      left: image.left,
      top: image.top,
      width: image.width,
      height: image.height,
      scaleX: image.scaleX,
      scaleY: image.scaleY
    }
    const placement = TemplateManager._resolveTemplatePlacement({
      image,
      serialized,
      baseWidth,
      baseHeight,
      useRelativePositions
    })

    image.set({
      left: placement.x,
      top: placement.y,
      width: plan.targetWidth,
      height: plan.targetHeight,
      scaleX: plan.baseScaleX,
      scaleY: plan.baseScaleY
    })

    const center = image.getPointByOrigin('center', 'center')

    image.set(originalProps)

    return {
      x: center.x,
      y: center.y
    }
  }

  /**
   * Возвращает template-placement в координатах base-size, даже если в template он хранится нормализованным.
   */
  private static _resolveTemplatePlacement({
    image,
    serialized,
    baseWidth,
    baseHeight,
    useRelativePositions
  }: {
    image: FabricImage
    serialized: TemplateObjectData
    baseWidth: number
    baseHeight: number
    useRelativePositions: boolean
  }): PointInfo {
    const left = toNumber({ value: serialized.left, fallback: image.left || 0 })
    const top = toNumber({ value: serialized.top, fallback: image.top || 0 })

    if (!useRelativePositions) {
      return {
        x: left,
        y: top
      }
    }

    return {
      x: left * (baseWidth || 1),
      y: top * (baseHeight || 1)
    }
  }

  /**
   * Возвращает восстановленное изображение в ту же систему координат, где его ждёт общий transform.
   */
  private static _restoreImageTemplateCenter({
    image,
    center,
    baseWidth,
    baseHeight,
    useRelativePositions
  }: {
    image: FabricImage
    center: PointInfo
    baseWidth: number
    baseHeight: number
    useRelativePositions: boolean
  }): void {
    image.setPositionByOrigin(new Point(center.x, center.y), 'center', 'center')

    if (!useRelativePositions) return

    image.set({
      left: toNumber({ value: image.left, fallback: 0 }) / (baseWidth || 1),
      top: toNumber({ value: image.top, fallback: 0 }) / (baseHeight || 1)
    })
  }

  /**
   * Определяет режим вписывания изображения при восстановлении.
   */
  private static _resolveImageFit({
    customData
  }: {
    customData?: TemplateCustomData
  }): ImageFit {
    if (!customData || typeof customData !== 'object') return 'contain'

    const { imageFit } = customData

    if (imageFit === 'stretch') return 'stretch'

    return 'contain'
  }

  /**
   * Проверяет, содержит ли сериализованный объект инлайн SVG.
   */
  private static _hasSerializedSvgMarkup(
    object: TemplateObjectData
  ): object is TemplateObjectData & { svgMarkup: string } {
    return typeof object.svgMarkup === 'string' && Boolean(object.svgMarkup.trim())
  }

  /**
   * Восстанавливает SVG-объект из компактного описания.
   */
  private static async _reviveSvgObject(
    serialized: TemplateObjectData & { svgMarkup?: unknown }
  ): Promise<FabricObject | null> {
    const svgMarkup = typeof serialized.svgMarkup === 'string' ? serialized.svgMarkup : null

    if (!svgMarkup) return null

    try {
      const svgData = await loadSVGFromString(svgMarkup)
      const grouped = util.groupSVGElements(svgData.objects as FabricObject[], svgData.options)

      const props = await util.enlivenObjectEnlivables(
        TemplateManager._prepareSerializableProps(serialized)
      )

      grouped.set(props as Record<string, unknown>)
      grouped.setCoords()

      return grouped
    } catch {
      return null
    }
  }

  /**
   * Убирает технические поля сериализации, оставляя только применимые свойства.
   */
  private static _prepareSerializableProps(serialized: TemplateObjectData): Record<string, unknown> {
    const rest = { ...(serialized as Record<string, unknown>) }

    delete rest.svgMarkup
    delete rest.objects
    delete rest.path
    delete rest.paths
    delete rest.type
    delete rest.version

    return rest
  }

  /**
   * Определяет, что объект представляет SVG.
   */
  private static _isSvgObject(object: FabricObject): boolean {
    return object.format === 'svg'
  }

  /**
   * Превращает объект в компактную SVG-строку, добавляя корневой тег при необходимости.
   */
  private static _extractSvgMarkup(object: FabricObject): string | null {
    const toSvg = (object as FabricObject & { toSVG?: () => string }).toSVG
    if (typeof toSvg !== 'function') return null

    try {
      const svgContent = toSvg.call(object)
      if (!svgContent) return null

      const hasRoot = /<svg[\s>]/i.test(svgContent)
      if (hasRoot) return svgContent

      const { width, height } = TemplateManager._getBoundingRect(object)
      const safeWidth = width || object.width || 0
      const safeHeight = height || object.height || 0

      return `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="${safeWidth}"
          height="${safeHeight}"
          viewBox="0 0 ${safeWidth} ${safeHeight}">
            ${svgContent}
        </svg>
      `
    } catch {
      return null
    }
  }

  /**
   * Трансформирует объект в координаты целевой области.
   */
  private _transformObject({
    object,
    scale,
    bounds,
    baseWidth,
    baseHeight,
    useRelativePositions
  }: {
    object: FabricObject
    scale: number
    bounds: Bounds
    baseWidth: number
    baseHeight: number
    useRelativePositions: boolean
  }): void {
    const objectWithTemplateAnchors = object as FabricObject & TemplateAnchors
    const { x: normalizedX, y: normalizedY } = resolveNormalizedPlacement({
      object,
      baseWidth,
      baseHeight,
      useRelativePositions
    })
    const { scaleX, scaleY } = object
    const currentScaleX = toNumber({ value: scaleX, fallback: 1 })
    const currentScaleY = toNumber({ value: scaleY, fallback: 1 })

    const positioningBounds = TemplateManager._getPositioningBounds({
      bounds,
      baseWidth,
      baseHeight,
      scale,
      useRelativePositions,
      anchorX: TemplateManager._resolveAnchor(objectWithTemplateAnchors, TEMPLATE_ANCHOR_X_KEY),
      anchorY: TemplateManager._resolveAnchor(objectWithTemplateAnchors, TEMPLATE_ANCHOR_Y_KEY)
    })

    const absolutePlacement = denormalizePlacement({
      normalizedX,
      normalizedY,
      bounds: positioningBounds
    })

    const nextScaleX = currentScaleX * scale
    const nextScaleY = currentScaleY * scale
    const originX = object.originX ?? 'center'
    const originY = object.originY ?? 'center'

    object.set({
      scaleX: nextScaleX,
      scaleY: nextScaleY
    })

    this.editor.canvasManager.applyObjectPlacement({
      object,
      placement: {
        left: absolutePlacement.x,
        top: absolutePlacement.y,
        originX,
        originY
      }
    })

    delete objectWithTemplateAnchors._templateAnchorX
    delete objectWithTemplateAnchors._templateAnchorY
  }

  /**
   * Возвращает bounds, в которых должны позиционироваться нормализованные объекты.
   * Для нормализованных позиций используем размеры сцены после масштабирования (letterbox/pillarbox).
   */
  private static _getPositioningBounds({
    bounds,
    baseWidth,
    baseHeight,
    scale,
    useRelativePositions,
    anchorX,
    anchorY
  }: {
    bounds: Bounds
    baseWidth: number
    baseHeight: number
    scale: number
    useRelativePositions: boolean
    anchorX: TemplateAnchor
    anchorY: TemplateAnchor
  }): Bounds {
    if (!useRelativePositions) return bounds

    const scaledWidth = (baseWidth || bounds.width) * scale
    const scaledHeight = (baseHeight || bounds.height) * scale
    const leftoverX = bounds.width - scaledWidth
    const leftoverY = bounds.height - scaledHeight

    const offsetX = bounds.left + TemplateManager._calculateAnchorOffset(anchorX, leftoverX)
    const offsetY = bounds.top + TemplateManager._calculateAnchorOffset(anchorY, leftoverY)

    return {
      left: offsetX,
      top: offsetY,
      width: scaledWidth,
      height: scaledHeight
    }
  }

  private static _calculateAnchorOffset(anchor: TemplateAnchor, leftover: number): number {
    if (leftover <= 0) return 0
    if (anchor === 'end') return leftover
    if (anchor === 'center') return leftover / 2
    return 0
  }

  private static _resolveAnchor(
    objectWithTemplateAnchors: TemplateAnchors,
    key: typeof TEMPLATE_ANCHOR_X_KEY | typeof TEMPLATE_ANCHOR_Y_KEY
  ): TemplateAnchor {
    const value = objectWithTemplateAnchors[key]
    if (value === 'center' || value === 'end' || value === 'start') return value
    return 'start'
  }

  private static _detectAnchor({ start, end }: { start: number; end: number }): TemplateAnchor {
    const touchesStart = start <= 0.05
    const touchesEnd = end >= 0.95
    const exceedsStart = start < 0
    const exceedsEnd = end > 1
    const span = end - start
    const marginStart = Math.max(0, start)
    const marginEnd = Math.max(0, 1 - end)
    const balanced = Math.abs(marginStart - marginEnd) <= 0.02 // допуск ~2%

    if ((touchesStart && touchesEnd) || (exceedsStart && exceedsEnd)) {
      if (balanced || span >= 0.9) return 'center'
      return marginStart <= marginEnd ? 'start' : 'end'
    }

    if (touchesStart || exceedsStart) return 'start'
    if (touchesEnd || exceedsEnd) return 'end'

    const diff = marginStart - marginEnd
    const nearCenter = Math.abs(diff) <= 0.1
    if (nearCenter) return 'center'
    return diff < 0 ? 'start' : 'end'
  }

  /**
   * Нормализует мета-данные шаблона.
   */
  private static _normalizeMeta({
    meta,
    fallback
  }: {
    meta: TemplateMeta | undefined
    fallback: Dimensions
  }): TemplateMeta {
    const { width, height } = fallback
    const { baseWidth = width, baseHeight = height, ...rest } = meta || {}

    // Подставляем дефолтные размеры монтажной области, если в шаблоне они отсутствуют
    return {
      baseWidth,
      baseHeight,
      ...rest
    }
  }

  /**
   * Возвращает коэффициент масштабирования.
   */
  private static _calculateScale({
    meta,
    target
  }: {
    meta: TemplateMeta
    target: Dimensions
  }): number {
    const { width, height } = target
    const { baseWidth, baseHeight } = meta

    // Масштаб определяется минимальным коэффициентом по ширине/высоте
    const widthRatio = width / (baseWidth || width || 1)
    const heightRatio = height / (baseHeight || height || 1)

    return Math.min(widthRatio, heightRatio)
  }

  /**
   * Делает активным список объектов.
   */
  private static _activateObjects({
    canvas,
    objects
  }: {
    canvas: Canvas
    objects: FabricObject[]
  }): void {
    if (!objects.length) return

    canvas.discardActiveObject()

    if (objects.length === 1) {
      canvas.setActiveObject(objects[0])
      return
    }

    const selection = new ActiveSelection(objects, { canvas })
    canvas.setActiveObject(selection)
  }

  /**
   * Подгоняет ширину текстового объекта под фактическую длину строк
   * в координатах исходного template-base и сохраняет выравнивание по якорю.
   */
  private _adaptTextboxWidth({
    object,
    baseWidth
  }: {
    object: FabricObject
    baseWidth: number
  }): void {
    if (!(object instanceof Textbox)) return

    const textValue = typeof object.text === 'string' ? object.text : ''
    if (!textValue) return

    const templateBaseWidth = toNumber({ value: baseWidth, fallback: 0 })
    const textWidth = toNumber({ value: object.width, fallback: 0 })
    if (!templateBaseWidth || !textWidth) return

    object.setCoords()
    const textboxWithTemplateAnchors = object as Textbox & TemplateAnchors
    const anchorX = TemplateManager._resolveAnchor(textboxWithTemplateAnchors, TEMPLATE_ANCHOR_X_KEY)
    const storedPlacementX = typeof object.left === 'number'
      ? object.left
      : null
    const originX = object.originX ?? 'center'
    const originY = object.originY ?? 'center'
    const originalPlacement = object.getPointByOrigin(originX, originY)
    const originalRect = TemplateManager._getBoundingRect(object)
    const originalCenterX = originalRect.left + (originalRect.width / 2)
    const originalRight = originalRect.left + originalRect.width

    object.set('width', templateBaseWidth)
    object.initDimensions()

    const longestLineWidth = TemplateManager._getLongestLineWidth({
      textbox: object,
      text: textValue
    })
    const nextWidth = longestLineWidth > textWidth ? longestLineWidth + 1 : textWidth

    object.set('width', nextWidth)
    object.initDimensions()
    object.setPositionByOrigin(originalPlacement, originX, originY)
    object.setCoords()

    if (storedPlacementX === null) return

    const finalRect = TemplateManager._getBoundingRect(object)
    const finalCenterX = finalRect.left + (finalRect.width / 2)
    const finalRight = finalRect.left + finalRect.width
    let nextPlacementX = storedPlacementX

    if (anchorX === 'start') {
      nextPlacementX += (originalRect.left - finalRect.left) / templateBaseWidth
    } else if (anchorX === 'center') {
      nextPlacementX += (originalCenterX - finalCenterX) / templateBaseWidth
    } else if (anchorX === 'end') {
      nextPlacementX += (originalRight - finalRight) / templateBaseWidth
    }

    object.left = nextPlacementX
  }

  /**
   * Возвращает ширину самой длинной строки текстового объекта.
   */
  private static _getLongestLineWidth({
    textbox,
    text
  }: {
    textbox: Textbox
    text: string
  }): number {
    const {
      textLines
    } = textbox as unknown as { textLines?: string[] }
    const lineCount = Array.isArray(textLines) && textLines.length > 0
      ? textLines.length
      : Math.max(text.split('\n').length, 1)

    let longestLineWidth = 0
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const lineWidth = textbox.getLineWidth(lineIndex)
      if (lineWidth > longestLineWidth) {
        longestLineWidth = lineWidth
      }
    }

    return longestLineWidth
  }

  /**
   * Сериализует объект относительно монтажной области.
   */
  private _serializeObject({
    object,
    bounds,
    baseWidth,
    baseHeight
  }: {
    object: FabricObject
    bounds: Bounds | null
    baseWidth: number
    baseHeight: number
  }): TemplateObjectData {
    const serialized = object.toDatalessObject([...OBJECT_SERIALIZATION_PROPS]) as TemplateObjectData

    if (TemplateManager._isSvgObject(object)) {
      const svgMarkup = TemplateManager._extractSvgMarkup(object)

      if (svgMarkup) {
        serialized.svgMarkup = svgMarkup
        delete (serialized as Record<string, unknown>).objects
        delete (serialized as Record<string, unknown>).path
      }
    }

    if (!bounds) return serialized

    const {
      left: boundsLeft,
      top: boundsTop,
      width: boundsWidth,
      height: boundsHeight
    } = bounds
    const rect = TemplateManager._getBoundingRect(object)
    const safeWidth = baseWidth || boundsWidth || 1
    const safeHeight = baseHeight || boundsHeight || 1
    const placement = this.editor.canvasManager.getObjectPlacement({ object })
    const placementForStorage = {
      x: (placement.left - boundsLeft) / safeWidth,
      y: (placement.top - boundsTop) / safeHeight
    }

    const normalizedLeft = (rect.left - boundsLeft) / safeWidth
    const normalizedTop = (rect.top - boundsTop) / safeHeight
    const normalizedRight = normalizedLeft + (rect.width / safeWidth)
    const normalizedBottom = normalizedTop + (rect.height / safeHeight)

    serialized[TEMPLATE_ANCHOR_X_KEY] = TemplateManager._detectAnchor({
      start: normalizedLeft,
      end: normalizedRight
    })
    serialized[TEMPLATE_ANCHOR_Y_KEY] = TemplateManager._detectAnchor({
      start: normalizedTop,
      end: normalizedBottom
    })

    serialized.left = placementForStorage.x
    serialized.top = placementForStorage.y

    return serialized
  }

  /**
   * Делит список объектов на фон и контент по id === 'background'.
   */
  private static _extractBackgroundObject(objects: FabricObject[]): {
    backgroundObject: FabricObject | null
    contentObjects: FabricObject[]
  } {
    const index = objects.findIndex((object) => object.id === 'background')

    if (index === -1) {
      return { backgroundObject: null, contentObjects: objects }
    }

    const backgroundObject = objects[index]
    const contentObjects = objects.filter((_, i) => i !== index)

    return { backgroundObject, contentObjects }
  }

  /**
   * Применяет фоновый объект шаблона к текущему холсту через BackgroundManager.
   */
  private static async _applyBackgroundFromObject({
    backgroundObject,
    backgroundManager,
    errorManager
  }: {
    backgroundObject: FabricObject
    backgroundManager: ImageEditor['backgroundManager']
    errorManager: ImageEditor['errorManager']
  }): Promise<boolean> {
    try {
      const { fill, customData: rawCustomData } = backgroundObject
      const { backgroundType } = (backgroundObject as FabricObject & { backgroundType?: unknown })
      const customData = TemplateManager._cloneCustomData(rawCustomData)

      if (backgroundType === 'color' && typeof fill === 'string') {
        backgroundManager.setColorBackground({
          color: fill,
          customData,
          fromTemplate: true,
          withoutSave: true
        })
        return true
      }

      if (backgroundType === 'gradient') {
        const gradient = convertGradientToOptions(fill)

        if (gradient) {
          backgroundManager.setGradientBackground({
            gradient,
            customData,
            fromTemplate: true,
            withoutSave: true
          })
          return true
        }
      }

      if (backgroundType === 'image') {
        const src = TemplateManager._getImageSource(backgroundObject)

        if (src) {
          await backgroundManager.setImageBackground({
            imageSource: src,
            customData,
            fromTemplate: true,
            withoutSave: true
          })
          return true
        }
      }
    } catch (error) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.APPLY_FAILED,
        message: 'Не удалось применить фон из шаблона',
        data: error as object
      })
    }

    return false
  }

  /**
   * Возвращает размеры монтажной области с учётом размеров маркера и его bounds.
   */
  private static _getMontageSize({
    montageArea,
    bounds
  }: {
    montageArea?: FabricObject | null
    bounds?: Bounds | null
  }): Dimensions {
    const boundsWidth = bounds?.width || 0
    const boundsHeight = bounds?.height || 0

    if (montageArea) {
      return {
        width: montageArea.getScaledWidth?.() || montageArea.width || boundsWidth,
        height: montageArea.getScaledHeight?.() || montageArea.height || boundsHeight
      }
    }

    return {
      width: boundsWidth,
      height: boundsHeight
    }
  }

  /**
   * Создаёт неглубокую копию customData или возвращает undefined.
   */
  private static _cloneCustomData(customData: unknown): Record<string, unknown> | undefined {
    if (!customData || typeof customData !== 'object') return undefined
    return { ...(customData as Record<string, unknown>) }
  }

  /**
   * Извлекает src изображения из FabricImage или его исходного элемента.
   */
  private static _getImageSource(image: FabricObject): string | null {
    const asImage = image as FabricImage

    if ('getSrc' in image && typeof asImage.getSrc === 'function') {
      const src = asImage.getSrc()
      if (src) return src
    }

    if ('getElement' in image && typeof asImage.getElement === 'function') {
      const element = asImage.getElement()

      if (element instanceof HTMLImageElement) {
        return element.currentSrc || element.src || null
      }
    }

    const imageWithSource = image as FabricObject & { src?: unknown }
    if (typeof imageWithSource.src === 'string') {
      return imageWithSource.src
    }

    return null
  }

  /**
   * Оживляет сериализованный объект, восстанавливая вложенные описания (градиенты, клиппаты и т.д.).
   * @param serialized - исходное сериализованное описание Fabric-объекта
   * @returns оживлённый объект с восстановленными вложенными структурами
   */
  // eslint-disable-next-line class-methods-use-this
  public enlivenObjectEnlivables<T extends Record<string, unknown>>(serialized: T): Promise<T> {
    return util.enlivenObjectEnlivables(serialized) as Promise<T>
  }
}
