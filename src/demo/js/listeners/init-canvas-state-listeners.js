// @ts-nocheck

import {
  getCanvasDisplaySize,
  getCanvasResolution,
  getCurrentObjectData,
  getMontageAreaResolution
} from '../methods.js'

/**
 * Инициализирует listeners синхронизации canvas-состояния и служебных индикаторов.
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
    syncTextControls,
    isTextboxObject
  } = textApi
  const {
    getActiveShape,
    syncShapeControls
  } = shapeApi

  /**
   * Обновляет значения разрешения монтажной области в input'ах.
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
   * Обновляет текущие размеры canvas в служебных элементах UI.
   */
  const syncCanvasInfoNodes = () => {
    canvasResolutionNode.textContent = getCanvasResolution(editorInstance)
    montageAreaResolutionNode.textContent = getMontageAreaResolution(editorInstance)
    canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
  }

  /**
   * Обновляет текущую информацию о выбранном объекте.
   */
  const syncCurrentObjectData = () => {
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
  }

  /**
   * Синхронизирует панели текста и фигур после изменения выделения.
   */
  const handleSelectionChange = (event) => {
    const eventTarget = event?.target
    const explicitTextbox = eventTarget && isTextboxObject(eventTarget) ? eventTarget : null
    const textObject = explicitTextbox ?? getActiveText()
    const shapeGroup = getActiveShape()

    if (textObject) {
      syncTextControls(textObject)
    }

    syncShapeControls(shapeGroup)
    syncCurrentObjectData()
  }

  /**
   * Инициализирует значения UI до подписки на события.
   */
  const initState = () => {
    updateMontageInputs()
    syncCanvasInfoNodes()
    syncCurrentObjectData()
    canvasZoomNode.textContent = editorInstance.canvas.getZoom()
  }

  /**
   * Подписывает listeners на изменение размеров и zoom canvas.
   */
  const initCanvasInfoListeners = () => {
    editorInstance.canvas.on('editor:resolution-width-changed', updateMontageInputs)
    editorInstance.canvas.on('editor:resolution-height-changed', updateMontageInputs)

    editorInstance.canvas.on('after:render', () => {
      canvasResolutionNode.textContent = getCanvasResolution(editorInstance)
      montageAreaResolutionNode.textContent = getMontageAreaResolution(editorInstance)
      currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
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
   * Подписывает listeners на изменение выделения и объектов canvas.
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

    editorInstance.canvas.on('object:modified', (event) => {
      syncCurrentObjectData()

      if (event?.target && event.target === getActiveText()) {
        syncTextControls(event.target)
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
   * Подписывает listeners на изменение разрешения монтажной области.
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
      editorInstance.backgroundManager.refresh()
      editorInstance.canvasManager.updateCanvas()
      editorInstance.zoomManager.calculateAndApplyDefaultZoom()
    })
  }

  initState()
  initCanvasInfoListeners()
  initCanvasSelectionListeners()
  initMontageListeners()
}
