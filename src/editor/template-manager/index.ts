import {
  ActiveSelection,
  Canvas,
  FabricImage,
  FabricObject,
  Textbox,
  loadSVGFromString,
  util
} from 'fabric'
import { nanoid } from 'nanoid'

import { ImageEditor } from '../index'
import { errorCodes } from '../error-manager/error-codes'
import { OBJECT_SERIALIZATION_PROPS } from '../history-manager'
import {
  calculateNormalizedCenter,
  denormalizeCenter,
  resolveNormalizedCenter,
  toNumber,
  type Dimensions
} from '../utils/geometry'
import {
  convertGradientToOptions
} from '../utils/gradient'

type Bounds = {
  left: number
  top: number
  width: number
  height: number
}

type TemplatePlaceholder = {
  id: string
  label?: string
  type: 'text' | 'image'
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

const TEMPLATE_CENTER_X_KEY = '_templateCenterX'
const TEMPLATE_CENTER_Y_KEY = '_templateCenterY'
const TEMPLATE_ANCHOR_X_KEY = '_templateAnchorX'
const TEMPLATE_ANCHOR_Y_KEY = '_templateAnchorY'

type TemplateAnchor = 'start' | 'center' | 'end'

export type TemplateObjectData = Record<string, unknown> & {
  left?: number
  top?: number
  scaleX?: number
  scaleY?: number
  svgMarkup?: string
  customData?: Record<string, unknown>
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
      .map((object) => TemplateManager._serializeObject({
        object,
        bounds: referenceBounds,
        baseWidth,
        baseHeight,
        montageArea: montageArea ?? null
      }))

    const templateMeta: TemplateMeta = {
      ...meta,
      baseWidth,
      baseHeight,
      positionsNormalized: true,
      previewId: previewId ?? meta.previewId
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
   * @param options.template - описание шаблона
   * @param options.data - данные для заполнения текстов по customData.templateField
   */
  public async applyTemplate({
    template,
    data
  }: ApplyTemplateOptions): Promise<FabricObject[] | null> {
    const {
      canvas,
      montageArea,
      historyManager,
      errorManager,
      backgroundManager
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
      const enlivenedObjects = await TemplateManager._enlivenObjects(objects)

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

      // Применяем текстовые подстановки, трансформируем координаты и добавляем объекты на канвас
      const insertedObjects = contentObjects.map((object) => {
        TemplateManager._applyTextOverrides({ object, data })

        TemplateManager._transformObject({
          object,
          scale,
          bounds: montageBounds,
          targetSize,
          baseWidth: meta.baseWidth,
          baseHeight: meta.baseHeight,
          montageArea,
          useRelativePositions
        })

        object.set({
          id: `${object.type}-${nanoid()}`,
          evented: true
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
      const rect = object.getBoundingRect(false, true)
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
    * Превращает plain-описание объектов в Fabric объекты.
    */
  private static async _enlivenObjects(objects: TemplateObjectData[]): Promise<FabricObject[]> {
    const revivedList = await Promise.all(objects.map(async(serialized) => {
      if (TemplateManager._hasSerializedSvgMarkup(serialized)) {
        const revived = await TemplateManager._reviveSvgObject(serialized)
        if (revived) {
          TemplateManager._restoreImageScale({ revived, serialized })
          return revived
        }
      }

      const enlivened = await util.enlivenObjects<FabricObject>([serialized])
      const revived = enlivened?.[0]

      if (revived) {
        TemplateManager._restoreImageScale({ revived, serialized })
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
    serialized
  }: { revived: FabricObject; serialized: TemplateObjectData }): void {
    const objectType = typeof revived.type === 'string' ? revived.type.toLowerCase() : ''

    if (objectType !== 'image') return

    const {
      width: serializedWidth,
      height: serializedHeight,
      scaleX: serializedScaleX,
      scaleY: serializedScaleY
    } = serialized
    const image = revived as FabricImage

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

    const intrinsicWidth = toNumber({ value: naturalWidth || elementWidth || image.width, fallback: 0 })
    const intrinsicHeight = toNumber({ value: naturalHeight || elementHeight || image.height, fallback: 0 })

    const targetWidth = toNumber({ value: serializedWidth, fallback: intrinsicWidth })
    const targetHeight = toNumber({ value: serializedHeight, fallback: intrinsicHeight })
    const baseScaleX = toNumber({ value: serializedScaleX, fallback: image.scaleX || 1 })
    const baseScaleY = toNumber({ value: serializedScaleY, fallback: image.scaleY || 1 })

    const targetDisplayWidth = targetWidth * baseScaleX
    const targetDisplayHeight = targetHeight * baseScaleY

    const nextScaleX = intrinsicWidth ? targetDisplayWidth / intrinsicWidth : null
    const nextScaleY = intrinsicHeight ? targetDisplayHeight / intrinsicHeight : null

    const nextProps: Record<string, number> = {}

    if (intrinsicWidth > 0) {
      nextProps.width = intrinsicWidth
    }

    if (intrinsicHeight > 0) {
      nextProps.height = intrinsicHeight
    }

    if (nextScaleX && nextScaleX > 0) {
      nextProps.scaleX = nextScaleX
    }

    if (nextScaleY && nextScaleY > 0) {
      nextProps.scaleY = nextScaleY
    }

    image.set(nextProps)
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

      const props = TemplateManager._prepareSerializableProps(serialized)
      const clipPath = await TemplateManager._reviveClipPath(props.clipPath)

      if (clipPath) {
        props.clipPath = clipPath
      } else if ('clipPath' in props) {
        delete (props as Record<string, unknown>).clipPath
      }

      grouped.set(props as Record<string, unknown>)
      grouped.setCoords()

      return grouped
    } catch {
      return null
    }
  }

  /**
   * Восстанавливает clipPath из сериализованного объекта в инстанс FabricObject.
   */
  private static async _reviveClipPath(clipPath: unknown): Promise<FabricObject | null> {
    if (!clipPath || typeof clipPath !== 'object') return null

    try {
      const enlivened = await util.enlivenObjects<FabricObject>([clipPath as object])
      return enlivened?.[0] ?? null
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
    return (object as Record<string, unknown>).format === 'svg'
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

      const { width, height } = object.getBoundingRect(false, true)
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
  private static _transformObject({
    object,
    scale,
    bounds,
    targetSize,
    baseWidth,
    baseHeight,
    montageArea,
    useRelativePositions
  }: {
    object: FabricObject
    scale: number
    bounds: Bounds
    targetSize: Dimensions
    baseWidth: number
    baseHeight: number
    montageArea: FabricObject | null
    useRelativePositions: boolean
  }): void {
    const objectRecord = object as Record<string, unknown>
    const { x: normalizedX, y: normalizedY } = resolveNormalizedCenter({
      object,
      baseWidth,
      baseHeight,
      useRelativePositions,
      centerKeys: {
        x: TEMPLATE_CENTER_X_KEY,
        y: TEMPLATE_CENTER_Y_KEY
      }
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
      anchorX: TemplateManager._resolveAnchor(objectRecord, TEMPLATE_ANCHOR_X_KEY),
      anchorY: TemplateManager._resolveAnchor(objectRecord, TEMPLATE_ANCHOR_Y_KEY)
    })

    const absoluteCenter = denormalizeCenter({
      normalizedX,
      normalizedY,
      bounds: positioningBounds,
      targetSize,
      montageArea
    })

    const nextScaleX = currentScaleX * scale
    const nextScaleY = currentScaleY * scale

    object.set({
      scaleX: nextScaleX,
      scaleY: nextScaleY
    })

    // Перемещаем объект в денормализованный центр и очищаем временные поля центра
    object.setPositionByOrigin(absoluteCenter, 'center', 'center')
    object.setCoords()

    delete objectRecord[TEMPLATE_CENTER_X_KEY]
    delete objectRecord[TEMPLATE_CENTER_Y_KEY]
    delete objectRecord[TEMPLATE_ANCHOR_X_KEY]
    delete objectRecord[TEMPLATE_ANCHOR_Y_KEY]
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

  private static _resolveAnchor(objectRecord: Record<string, unknown>, key: string): TemplateAnchor {
    const value = objectRecord[key]
    if (value === 'center' || value === 'end' || value === 'start') return value
    return 'start'
  }

  private static _detectAnchor({
    start,
    end
  }: {
    center: number
    start: number
    end: number
  }): TemplateAnchor {
    // Базовый сценарий: привязка к ближайшему краю, если объект касается/вылезает за него
    const touchesStart = start <= 0.05
    const touchesEnd = end >= 0.95
    const exceedsStart = start < 0
    const exceedsEnd = end > 1
    const span = end - start
    const marginStart = Math.max(0, start)
    const marginEnd = Math.max(0, 1 - end)

    if ((touchesStart && touchesEnd) || (exceedsStart && exceedsEnd)) {
      if (span >= 0.98) return 'center'
      return marginStart <= marginEnd ? 'start' : 'end'
    }
    if (touchesStart || exceedsStart) return 'start'
    if (touchesEnd || exceedsEnd) return 'end'

    // Иначе — выбираем ближайший край. Центр остаётся только если объект примерно по центру.
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
   * Применяет текстовые значения из customData или переданных данных.
   */
  private static _applyTextOverrides({
    object,
    data
  }: {
    object: FabricObject
    data?: Record<string, string>
  }): void {
    if (!('text' in object)) return

    const customData = object.customData as Record<string, unknown> | undefined
    const { templateField: rawTemplateField, text: rawText } = customData ?? {}

    const templateField = typeof rawTemplateField === 'string' ? rawTemplateField : undefined
    const fallbackText = typeof rawText === 'string' ? rawText : undefined
    const providedText = templateField && data ? data[templateField] : undefined
    const nextValue = providedText ?? fallbackText

    if (typeof nextValue === 'string') {
      (object as Textbox).text = nextValue
    }
  }

  /**
   * Сериализует объект относительно монтажной области.
   */
  private static _serializeObject({
    object,
    bounds,
    baseWidth,
    baseHeight,
    montageArea
  }: {
    object: FabricObject
    bounds: Bounds | null
    baseWidth: number
    baseHeight: number
    montageArea: FabricObject | null
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
    const rect = object.getBoundingRect(false, true)
    const safeWidth = baseWidth || boundsWidth || 1
    const safeHeight = baseHeight || boundsHeight || 1

    const normalizedCenter = calculateNormalizedCenter({
      object,
      montageArea,
      bounds
    })

    const centerForAnchor = normalizedCenter ?? (() => {
      const centerPoint = object.getCenterPoint()
      return {
        x: (centerPoint.x - boundsLeft) / safeWidth,
        y: (centerPoint.y - boundsTop) / safeHeight
      }
    })()

    const normalizedLeft = (rect.left - boundsLeft) / safeWidth
    const normalizedTop = (rect.top - boundsTop) / safeHeight
    const normalizedRight = normalizedLeft + (rect.width / safeWidth)
    const normalizedBottom = normalizedTop + (rect.height / safeHeight)

    serialized[TEMPLATE_CENTER_X_KEY] = centerForAnchor.x
    serialized[TEMPLATE_CENTER_Y_KEY] = centerForAnchor.y
    serialized[TEMPLATE_ANCHOR_X_KEY] = TemplateManager._detectAnchor({
      center: centerForAnchor.x,
      start: normalizedLeft,
      end: normalizedRight
    })
    serialized[TEMPLATE_ANCHOR_Y_KEY] = TemplateManager._detectAnchor({
      center: centerForAnchor.y,
      start: normalizedTop,
      end: normalizedBottom
    })

    serialized.left = normalizedLeft
    serialized.top = normalizedTop

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

    const asRecord = image as Record<string, unknown>
    if (typeof asRecord.src === 'string') {
      return asRecord.src as string
    }

    return null
  }
}
