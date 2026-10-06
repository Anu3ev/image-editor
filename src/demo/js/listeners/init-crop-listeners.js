// @ts-nocheck

/**
 * Returns crop mode behavior flags from the demo controls.
 */
const getCropBehaviorOptions = ({ controls }) => {
  return {
    allowFrameOverflow: controls.cropAllowOverflowCheckbox.checked,
    showGrid: controls.cropShowGridCheckbox.checked,
    showDimmedArea: controls.cropShowDimmedAreaCheckbox.checked,
    cancelOnSelectionClear: controls.cropCancelOnSelectionClearCheckbox.checked,
    preserveAspectRatio: controls.cropPreserveAspectRatioCheckbox.checked
  }
}

/**
 * Returns the crop ratio from the demo select.
 */
const getSelectedAspectRatio = ({ ratioSelect }) => {
  const { value } = ratioSelect
  if (value === 'custom') return null

  const [width, height] = value.split(':').map(Number)
  if (!width || !height) return null

  return {
    width,
    height
  }
}

/**
 * Returns the explicit crop size from the demo inputs.
 */
const getSelectedCropSize = ({ widthInput, heightInput }) => {
  const width = Number(widthInput.value)
  const height = Number(heightInput.value)

  if (!width || !height) return null

  return {
    width,
    height
  }
}

/**
 * Builds the options for starting crop mode.
 */
const getCropOptions = ({ controls }) => {
  const options = getCropBehaviorOptions({ controls })
  const aspectRatio = getSelectedAspectRatio({
    ratioSelect: controls.cropRatioSelect
  })
  if (aspectRatio) {
    return {
      ...options,
      aspectRatio
    }
  }

  const size = getSelectedCropSize({
    widthInput: controls.cropWidthInput,
    heightInput: controls.cropHeightInput
  })
  if (size) {
    return {
      ...options,
      size
    }
  }

  return options
}

/**
 * Applies the current demo preset to the active crop mode.
 */
const applyCropPresetToActiveMode = ({ editorInstance, controls }) => {
  const aspectRatio = getSelectedAspectRatio({
    ratioSelect: controls.cropRatioSelect
  })
  if (aspectRatio) {
    editorInstance.cropManager.setAspectRatio({ aspectRatio })
    return
  }

  const size = getSelectedCropSize({
    widthInput: controls.cropWidthInput,
    heightInput: controls.cropHeightInput
  })
  if (size) {
    editorInstance.cropManager.setSize({ size })
  }
}

/**
 * Initializes demo listeners for crop mode.
 */
export default ({ editorInstance, controls }) => {
  controls.startCanvasCropBtn.addEventListener('click', () => {
    editorInstance.cropManager.startCanvasCrop(getCropOptions({ controls }))
  })

  controls.startImageCropBtn.addEventListener('click', () => {
    editorInstance.cropManager.startImageCrop(getCropOptions({ controls }))
  })

  controls.applyCropBtn.addEventListener('click', () => {
    editorInstance.cropManager.apply()
  })

  controls.cancelCropBtn.addEventListener('click', () => {
    editorInstance.cropManager.cancel()
  })

  controls.cropRatioSelect.addEventListener('change', () => {
    applyCropPresetToActiveMode({
      editorInstance,
      controls
    })
  })

  controls.cropWidthInput.addEventListener('change', () => {
    applyCropPresetToActiveMode({
      editorInstance,
      controls
    })
  })

  controls.cropHeightInput.addEventListener('change', () => {
    applyCropPresetToActiveMode({
      editorInstance,
      controls
    })
  })

  controls.cropPreserveAspectRatioCheckbox.addEventListener('change', () => {
    if (!editorInstance.cropManager.isActive) return

    const cropState = editorInstance.cropManager.setPreserveAspectRatio({
      preserveAspectRatio: controls.cropPreserveAspectRatioCheckbox.checked
    })
    if (cropState) {
      controls.cropPreserveAspectRatioCheckbox.checked = cropState.options.preserveAspectRatio
    }
  })
}
