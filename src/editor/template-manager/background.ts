import {
  FabricImage,
  FabricObject
} from 'fabric'

import type { ImageEditor } from '../index'
import { errorCodes } from '../error-manager/error-codes'
import { convertGradientToOptions } from '../utils/gradient'

interface BackgroundExtractableObject {
  id?: unknown
}

interface SerializedTemplateBackgroundObject {
  [key: string]: unknown
  src?: unknown
  customData?: Record<string, unknown>
}

/** Результат отделения background-объекта от остальных объектов шаблона. */
interface ExtractedTemplateBackgroundObject<T extends BackgroundExtractableObject> {
  backgroundObject: T | null
  contentObjects: T[]
}

/**
 * Делит список template-объектов на фон и обычный контент.
 */
export function extractTemplateBackgroundObject<T extends BackgroundExtractableObject>({
  objects
}: {
  objects: T[]
}): ExtractedTemplateBackgroundObject<T> {
  const index = objects.findIndex((object) => object.id === 'background')

  if (index === -1) {
    return { backgroundObject: null, contentObjects: objects }
  }

  const backgroundObject = objects[index]
  const contentObjects = objects.filter((_, itemIndex) => itemIndex !== index)

  return { backgroundObject, contentObjects }
}

/**
 * Проверяет, что source является runtime-only ссылкой текущей сессии.
 */
function isTemporaryImageSource({ source }: { source: string }): boolean {
  return source.startsWith('blob:')
}

/**
 * Возвращает непустой persisted source или null.
 */
function getPersistentImageSource(source: unknown): string | null {
  if (typeof source !== 'string') return null

  const imageSource = source.trim()
  if (!imageSource || isTemporaryImageSource({ source: imageSource })) return null

  return imageSource
}

/**
 * Возвращает стабильный source из preset-map или строкового customData.src.
 */
function getPresetImageSource(source: unknown): string | null {
  const directSource = getPersistentImageSource(source)
  if (directSource) return directSource

  if (!source || typeof source !== 'object') return null

  const sourceMap = source as Record<string, unknown>
  const preferredSource = getPersistentImageSource(sourceMap['4096x4096'])
    || getPersistentImageSource(sourceMap['1920x1920'])

  if (preferredSource) return preferredSource

  return Object.values(sourceMap)
    .map((value) => getPersistentImageSource(value))
    .find((value): value is string => Boolean(value))
    || null
}

/**
 * Возвращает persisted source image-фона из исходного serialized объекта.
 */
function getSerializedBackgroundImageSource(
  object: SerializedTemplateBackgroundObject | null
): string | null {
  if (!object) return null

  const { customData } = object
  const objectSource = getPersistentImageSource(object.src)
  if (objectSource) return objectSource

  const originalUrl = getPersistentImageSource(customData?.originalUrl)
  if (originalUrl) return originalUrl

  return getPresetImageSource(customData?.src)
}

/**
 * Создаёт неглубокую копию customData или возвращает undefined.
 */
function cloneCustomData(customData: unknown): Record<string, unknown> | undefined {
  if (!customData || typeof customData !== 'object') return undefined
  return { ...(customData as Record<string, unknown>) }
}

/**
 * Извлекает runtime src изображения из FabricImage или его исходного элемента.
 */
function getRuntimeImageSource(image: FabricObject): string | null {
  const imageObject = image as FabricImage

  if ('getSrc' in image && typeof imageObject.getSrc === 'function') {
    const src = imageObject.getSrc()
    if (src) return src
  }

  if ('getElement' in image && typeof imageObject.getElement === 'function') {
    const element = imageObject.getElement()

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
 * Применяет цветовой background из шаблона.
 */
function applyColorTemplateBackground({
  fill,
  customData,
  backgroundManager
}: {
  fill: unknown
  customData?: Record<string, unknown>
  backgroundManager: ImageEditor['backgroundManager']
}): boolean {
  if (typeof fill !== 'string') return false

  backgroundManager.setColorBackground({
    color: fill,
    customData,
    fromTemplate: true,
    withoutSave: true
  })

  return true
}

/**
 * Применяет градиентный background из шаблона.
 */
function applyGradientTemplateBackground({
  fill,
  customData,
  backgroundManager
}: {
  fill: unknown
  customData?: Record<string, unknown>
  backgroundManager: ImageEditor['backgroundManager']
}): boolean {
  const gradient = convertGradientToOptions(fill)

  if (!gradient) return false

  backgroundManager.setGradientBackground({
    gradient,
    customData,
    fromTemplate: true,
    withoutSave: true
  })

  return true
}

/**
 * Применяет image background из шаблона.
 */
async function applyImageTemplateBackground({
  backgroundObject,
  serializedBackgroundObject,
  customData,
  backgroundManager
}: {
  backgroundObject: FabricObject
  serializedBackgroundObject: SerializedTemplateBackgroundObject | null
  customData?: Record<string, unknown>
  backgroundManager: ImageEditor['backgroundManager']
}): Promise<boolean> {
  const imageSource = getSerializedBackgroundImageSource(serializedBackgroundObject)
    || getRuntimeImageSource(backgroundObject)

  if (!imageSource) return false

  await backgroundManager.setImageBackground({
    imageSource,
    customData,
    fromTemplate: true,
    withoutSave: true
  })

  return true
}

/**
 * Применяет background-объект шаблона через BackgroundManager.
 */
export async function applyTemplateBackgroundObject({
  backgroundObject,
  serializedBackgroundObject,
  backgroundManager,
  errorManager
}: {
  backgroundObject: FabricObject
  serializedBackgroundObject: SerializedTemplateBackgroundObject | null
  backgroundManager: ImageEditor['backgroundManager']
  errorManager: ImageEditor['errorManager']
}): Promise<boolean> {
  try {
    const { fill, customData: rawCustomData } = backgroundObject
    const { backgroundType } = backgroundObject as FabricObject & { backgroundType?: unknown }
    const customData = cloneCustomData(rawCustomData)

    if (backgroundType === 'color') {
      return applyColorTemplateBackground({
        fill,
        customData,
        backgroundManager
      })
    }

    if (backgroundType === 'gradient') {
      return applyGradientTemplateBackground({
        fill,
        customData,
        backgroundManager
      })
    }

    if (backgroundType === 'image') {
      return applyImageTemplateBackground({
        backgroundObject,
        serializedBackgroundObject,
        customData,
        backgroundManager
      })
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
