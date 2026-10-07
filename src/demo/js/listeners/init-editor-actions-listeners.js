// @ts-nocheck

import {
  importImage,
  saveResult
} from '../methods.js'

/**
 * Initializes listeners for editor toolbar actions.
 */
export default ({ editorInstance, controls, historyControls }) => {
  const {
    chooseImageBtn,
    saveCanvasBtn,
    exportFormatSelect,
    fileInput,
    clearBtn,
    bringToFrontBtn,
    bringForwardBtn,
    sendToBackBtn,
    sendBackwardsBtn,
    copyBtn,
    pasteBtn,
    rotateRightBtn,
    rotateLeftBtn,
    flipXBtn,
    flipYBtn,
    selectAllBtn,
    deleteSelectedBtn,
    groupBtn,
    ungroupBtn,
    zoomInBtn,
    zoomOutBtn,
    resetZoomBtn,
    setDefaultScaleBtn,
    imageFitContainBtn,
    imageFitCoverBtn,
    resetFit,
    scaleCanvasToImageBtn
  } = controls
  const {
    undoBtn,
    redoBtn
  } = historyControls

  /**
   * Registers listeners for layer and transform actions.
   */
  const initTransformListeners = () => {
    scaleCanvasToImageBtn.addEventListener('click', () => {
      editorInstance.canvasManager.scaleMontageAreaToImage()
    })

    resetFit.addEventListener('click', () => {
      editorInstance.transformManager.resetObject()
    })

    imageFitContainBtn.addEventListener('click', () => {
      editorInstance.transformManager.fitObject({ fitAsOneObject: true, type: 'contain' })
    })

    imageFitCoverBtn.addEventListener('click', () => {
      editorInstance.transformManager.fitObject({ fitAsOneObject: true, type: 'cover' })
    })

    bringToFrontBtn.addEventListener('click', () => {
      editorInstance.layerManager.bringToFront()
    })

    bringForwardBtn.addEventListener('click', () => {
      editorInstance.layerManager.bringForward()
    })

    sendToBackBtn.addEventListener('click', () => {
      editorInstance.layerManager.sendToBack()
    })

    sendBackwardsBtn.addEventListener('click', () => {
      editorInstance.layerManager.sendBackwards()
    })

    rotateRightBtn.addEventListener('click', () => {
      editorInstance.transformManager.rotate(90)
    })

    rotateLeftBtn.addEventListener('click', () => {
      editorInstance.transformManager.rotate(-90)
    })

    flipXBtn.addEventListener('click', () => {
      editorInstance.transformManager.flipX()
    })

    flipYBtn.addEventListener('click', () => {
      editorInstance.transformManager.flipY()
    })
  }

  /**
   * Registers listeners for selection and clipboard actions.
   */
  const initSelectionListeners = () => {
    groupBtn.addEventListener('click', () => {
      editorInstance.groupingManager.group()
    })

    ungroupBtn.addEventListener('click', () => {
      editorInstance.groupingManager.ungroup()
    })

    deleteSelectedBtn.addEventListener('click', () => {
      editorInstance.deletionManager.deleteSelectedObjects()
    })

    selectAllBtn.addEventListener('click', () => {
      editorInstance.selectionManager.selectAll()
    })

    clearBtn.addEventListener('click', () => {
      editorInstance.canvasManager.clearCanvas()
    })

    copyBtn.addEventListener('click', () => {
      editorInstance.clipboardManager.copy()
    })

    pasteBtn.addEventListener('click', () => {
      editorInstance.clipboardManager.paste()
    })
  }

  /**
   * Registers listeners for zoom and history.
   */
  const initViewportListeners = () => {
    resetZoomBtn.addEventListener('click', () => {
      editorInstance.zoomManager.resetZoom()
    })

    setDefaultScaleBtn.addEventListener('click', () => {
      editorInstance.canvasManager.setDefaultScale()
    })

    zoomInBtn.addEventListener('click', () => {
      editorInstance.zoomManager.zoom(0.1)
    })

    zoomOutBtn.addEventListener('click', () => {
      editorInstance.zoomManager.zoom(-0.1)
    })

    undoBtn.addEventListener('click', () => {
      editorInstance.historyManager.undo()
    })

    redoBtn.addEventListener('click', () => {
      editorInstance.historyManager.redo()
    })
  }

  /**
   * Registers listeners for image import and export.
   */
  const initFileListeners = () => {
    chooseImageBtn.addEventListener('click', () => {
      fileInput.click()
    })

    fileInput.addEventListener('change', (event) => {
      importImage(event, editorInstance)
      fileInput.value = ''
    })

    saveCanvasBtn.addEventListener('click', () => {
      saveResult(editorInstance, exportFormatSelect.value)
    })
  }

  initTransformListeners()
  initSelectionListeners()
  initViewportListeners()
  initFileListeners()
}
