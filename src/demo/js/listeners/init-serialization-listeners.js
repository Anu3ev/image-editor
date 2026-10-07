// @ts-nocheck

import {
  ACTIVE_OBJECT_JSON_SPACES,
  OBJECT_SERIALIZATION_PROPS
} from './constants.js'

/**
 * Initializes listeners for template and active object serialization.
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
   * Returns the active object if exactly one object is selected.
   */
  const getSingleActiveObject = () => {
    const activeObject = editorInstance.canvas.getActiveObject()
    if (!activeObject) return null

    const { type } = activeObject
    if (type === 'activeSelection') return null

    return activeObject
  }

  /**
   * Writes a value to the template textarea.
   */
  const setTemplateInputValue = ({ value = '' }) => {
    if (!templateJsonInput) return
    templateJsonInput.value = value
  }

  /**
   * Returns the current value of the template textarea.
   */
  const getTemplateInputValue = () => templateJsonInput?.value ?? ''

  /**
   * Synchronizes the active object's JSON textarea.
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
   * Applies the JSON from the textarea to the active object.
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
   * Registers listeners for template operations.
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
   * Registers listeners for active-object JSON operations.
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
