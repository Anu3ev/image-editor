// @ts-nocheck

import {
  ACTIVE_OBJECT_JSON_SPACES,
  OBJECT_SERIALIZATION_PROPS
} from './constants.js'

/**
 * Инициализирует listeners для сериализации шаблона и активного объекта.
 */
export default ({ editorInstance, controls }) => {
  const {
    serializeTemplateBtn,
    applyTemplateBtn,
    templateJsonInput,
    serializeTemplateWithBackgroundCheckbox,
    loadActiveObjectBtn,
    activeObjectJsonInput,
    saveActiveObjectBtn
  } = controls

  /**
   * Возвращает активный объект, если выбран только один объект.
   */
  const getSingleActiveObject = () => {
    const activeObject = editorInstance.canvas.getActiveObject()
    if (!activeObject) return null

    const { type } = activeObject
    if (type === 'activeSelection') return null

    return activeObject
  }

  /**
   * Записывает значение в textarea шаблона.
   */
  const setTemplateInputValue = ({ value = '' }) => {
    if (!templateJsonInput) return
    templateJsonInput.value = value
  }

  /**
   * Возвращает текущее значение textarea шаблона.
   */
  const getTemplateInputValue = () => templateJsonInput?.value ?? ''

  /**
   * Синхронизирует textarea JSON активного объекта.
   */
  const syncActiveObjectJson = () => {
    if (!activeObjectJsonInput) return

    const activeObject = getSingleActiveObject()
    if (!activeObject) {
      activeObjectJsonInput.value = ''
      return
    }

    try {
      const serialized = typeof activeObject.toDatalessObject === 'function'
        ? activeObject.toDatalessObject([...OBJECT_SERIALIZATION_PROPS])
        : activeObject.toObject?.()
      const json = serialized ? JSON.stringify(serialized, null, ACTIVE_OBJECT_JSON_SPACES) : ''
      activeObjectJsonInput.value = json
    } catch (error) {
      console.warn('Failed to serialize active object', error)
      activeObjectJsonInput.value = ''
    }
  }

  /**
   * Применяет JSON из textarea к активному объекту.
   */
  const applyActiveObjectJson = async() => {
    if (!activeObjectJsonInput) return

    const activeObject = getSingleActiveObject()
    if (!activeObject) {
      console.warn('No active object to update')
      return
    }

    const rawValue = activeObjectJsonInput.value.trim()
    if (!rawValue) {
      console.warn('Active object JSON is empty')
      return
    }

    try {
      const parsed = JSON.parse(rawValue)
      if (parsed && typeof parsed === 'object') {
        delete parsed.type
      }

      const enlivenedProps = parsed && typeof parsed === 'object'
        ? await editorInstance.templateManager.enlivenObjectEnlivables(parsed)
        : parsed

      activeObject.set(enlivenedProps)
      activeObject.setCoords()
      editorInstance.canvas.requestRenderAll()
      editorInstance.historyManager.saveState()
      syncActiveObjectJson()
    } catch (error) {
      console.error('Failed to apply active object JSON', error)
    }
  }

  /**
   * Подписывает listeners на работу с шаблонами.
   */
  const initTemplateListeners = () => {
    serializeTemplateBtn?.addEventListener('click', async() => {
      try {
        const withBackground = Boolean(serializeTemplateWithBackgroundCheckbox?.checked)
        const template = await editorInstance.templateManager.serializeSelection({ withBackground })
        if (!template) return

        setTemplateInputValue({
          value: JSON.stringify(template, null, 2)
        })
      } catch (error) {
        console.error('Failed to serialize template selection', error)
        setTemplateInputValue({ value: '' })
      }
    })

    applyTemplateBtn?.addEventListener('click', async() => {
      const templateValue = getTemplateInputValue().trim()
      if (!templateValue) {
        console.warn('Template JSON is empty. Provide serialized data before applying.')
        return
      }

      try {
        const parsedTemplate = JSON.parse(templateValue)
        await editorInstance.templateManager.applyTemplate({ template: parsedTemplate })
      } catch (error) {
        console.error('Failed to apply template', error)
      }
    })
  }

  /**
   * Подписывает listeners на работу с JSON активного объекта.
   */
  const initActiveObjectListeners = () => {
    loadActiveObjectBtn?.addEventListener('click', syncActiveObjectJson)
    saveActiveObjectBtn?.addEventListener('click', applyActiveObjectJson)
  }

  initTemplateListeners()
  initActiveObjectListeners()

  return {
    syncActiveObjectJson
  }
}
