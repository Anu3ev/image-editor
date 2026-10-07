// @ts-nocheck

import {
  getCanvasDisplaySize,
  getCanvasResolution,
  getCurrentObjectData,
  getMontageAreaResolution
} from '../methods.js'

/**
 * Initializes listeners for synchronizing canvas state and status indicators.
 */
export default ({
  editorInstance,
  canvasInfoControls,
  montageControls,
  serializationControls,
  textApi,
  shapeApi
}) => {
  const {
    canvasResolutionNode,
    montageAreaResolutionNode,
    canvasDisplaySizeNode,
    currentObjectDataNode,
    canvasZoomNode
  } = canvasInfoControls
  const {
    montageWidthInput,
    montageHeightInput,
    applyMontageResolutionBtn
  } = montageControls
  const {
    activeObjectJsonInput
  } = serializationControls
  const {
    getActiveText,
    getActiveTextTarget,
    syncTextControls,
    isTextboxObject
  } = textApi
  const {
    getActiveShape,
    syncShapeControls
  } = shapeApi

  /**
   * Updates the artboard resolution values in the inputs.
   */
  const updateMontageInputs = () => {
    const { montageArea } = editorInstance
    if (!montageArea) return

    const width = Math.round(montageArea.getScaledWidth?.() || montageArea.width || 0)
    const height = Math.round(montageArea.getScaledHeight?.() || montageArea.height || 0)

    if (montageWidthInput) montageWidthInput.value = String(width)
    if (montageHeightInput) montageHeightInput.value = String(height)
  }

  /**
   * Updates the current canvas dimensions in the UI status elements.
   */
  const syncCanvasInfoNodes = () => {
    canvasResolutionNode.textContent = getCanvasResolution(editorInstance)
    montageAreaResolutionNode.textContent = getMontageAreaResolution(editorInstance)
    canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
  }

  /**
   * Updates the current information about the selected object.
   */
  const syncCurrentObjectData = () => {
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
  }

  /**
   * Synchronizes the text and shape panels after a selection change.
   */
  const handleSelectionChange = (event) => {
    const eventTarget = event?.target
    const explicitTextbox = eventTarget && isTextboxObject(eventTarget) ? eventTarget : null
    const textObject = explicitTextbox ?? getActiveTextTarget()
    const shapeGroup = getActiveShape()

    syncTextControls(textObject)

    syncShapeControls(shapeGroup)
    syncCurrentObjectData()
  }

  /**
   * Initializes UI values before subscribing to events.
   */
  const initState = () => {
    updateMontageInputs()
    syncCanvasInfoNodes()
    syncCurrentObjectData()
    canvasZoomNode.textContent = editorInstance.canvas.getZoom()
  }

  /**
   * Registers listeners for canvas size and zoom changes.
   */
  const initCanvasInfoListeners = () => {
    editorInstance.canvas.on('editor:resolution-width-changed', updateMontageInputs)
    editorInstance.canvas.on('editor:resolution-height-changed', updateMontageInputs)

    editorInstance.canvas.on('after:render', () => {
      canvasResolutionNode.textContent = getCanvasResolution(editorInstance)
      montageAreaResolutionNode.textContent = getMontageAreaResolution(editorInstance)
      currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)

      const activeTextTarget = getActiveTextTarget()
      if (activeTextTarget) {
        syncTextControls(activeTextTarget)
      }

      const activeShape = getActiveShape()
      if (activeShape) {
        syncShapeControls(activeShape)
      }
    })

    editorInstance.canvas.on('editor:display-width-changed', () => {
      canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
    })

    editorInstance.canvas.on('editor:display-height-changed', () => {
      canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
    })

    editorInstance.canvas.on('editor:zoom-changed', ({ currentZoom }) => {
      canvasZoomNode.textContent = currentZoom
    })
  }

  /**
   * Registers listeners for selection and canvas object changes.
   */
  const initCanvasSelectionListeners = () => {
    editorInstance.canvas.on('selection:created', handleSelectionChange)
    editorInstance.canvas.on('selection:updated', handleSelectionChange)
    editorInstance.canvas.on('selection:cleared', handleSelectionChange)
    editorInstance.canvas.on('text:selection:changed', handleSelectionChange)

    editorInstance.canvas.on('text:changed', (event) => {
      if (event.target && event.target === getActiveText()) {
        syncTextControls(event.target)
      }
    })

    editorInstance.canvas.on('object:modified', () => {
      syncCurrentObjectData()

      const activeTextTarget = getActiveTextTarget()
      if (activeTextTarget) {
        syncTextControls(activeTextTarget)
      }

      const activeShape = getActiveShape()
      if (activeShape) {
        syncShapeControls(activeShape)
      }

      if (activeObjectJsonInput) {
        activeObjectJsonInput.value = ''
      }
    })
  }

  /**
   * Registers listeners for artboard resolution changes.
   */
  const initMontageListeners = () => {
    applyMontageResolutionBtn?.addEventListener('click', () => {
      const width = Number(montageWidthInput?.value)
      const height = Number(montageHeightInput?.value)

      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        console.warn('Invalid montage size input')
        return
      }

      editorInstance.canvasManager.setResolutionWidth(width, { withoutSave: true })
      editorInstance.canvasManager.setResolutionHeight(height, { withoutSave: true })
      editorInstance.canvasManager.updateCanvas()
      editorInstance.zoomManager.calculateAndApplyDefaultZoom()
      editorInstance.historyManager.saveState()
    })
  }

  initState()
  initCanvasInfoListeners()
  initCanvasSelectionListeners()
  initMontageListeners()
}
