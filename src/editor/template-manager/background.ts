import { FabricObject } from 'fabric'
import { english, type Translate } from '../i18n'

import type { ImageEditor } from '../index'
import { errorCodes } from '../error-manager/error-codes'
import { convertGradientToOptions } from '../utils/gradient'

interface BackgroundExtractableObject {
  id?: unknown
}

/** Result of separating the background object from the other template objects. */
interface ExtractedTemplateBackgroundObject<T extends BackgroundExtractableObject> {
  backgroundObject: T | null
  contentObjects: T[]
}

/**
 * Splits the template object list into background and regular content.
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
 * Creates a shallow copy of customData or returns undefined.
 */
function cloneCustomData(customData: unknown): Record<string, unknown> | undefined {
  if (!customData || typeof customData !== 'object') return undefined
  return { ...(customData as Record<string, unknown>) }
}

/**
 * Applies a color background from the template.
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
 * Applies a gradient background from the template.
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
 * Applies an image background from the template.
 */
function applyImageTemplateBackground({
  backgroundObject,
  customData,
  backgroundManager
}: {
  backgroundObject: FabricObject
  customData?: Record<string, unknown>
  backgroundManager: ImageEditor['backgroundManager']
}): boolean {
  backgroundManager.setPreparedImageBackground({
    image: backgroundObject,
    customData,
    fromTemplate: true,
    withoutSave: true
  })

  return true
}

/**
 * Applies the template background object through BackgroundManager.
 */
export function applyTemplateBackgroundObject({
  t = english,
  backgroundObject,
  backgroundManager,
  errorManager
}: {
  t?: Translate
  backgroundObject: FabricObject
  backgroundManager: ImageEditor['backgroundManager']
  errorManager: ImageEditor['errorManager']
}): boolean {
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
        customData,
        backgroundManager
      })
    }
  } catch (error) {
    errorManager.emitWarning({
      origin: 'TemplateManager',
      method: 'applyTemplate',
      code: errorCodes.TEMPLATE_MANAGER.APPLY_FAILED,
      message: t('template.warnings.backgroundApplyFailed'),
      data: error as object
    })
  }

  return false
}
