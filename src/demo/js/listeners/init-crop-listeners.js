// @ts-nocheck

/**
 * Возвращает поведенческие флаги crop mode из demo controls.
 */
const getCropBehaviorOptions = ({ controls }) => {
  return {
    allowFrameOverflow: controls.cropAllowOverflowCheckbox.checked,
    showGrid: controls.cropShowGridCheckbox.checked,
    cancelOnSelectionClear: controls.cropCancelOnSelectionClearCheckbox.checked,
    preserveAspectRatio: controls.cropPreserveAspectRatioCheckbox.checked
  }
}

/**
 * Возвращает crop ratio из demo select.
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
 * Возвращает explicit crop size из demo inputs.
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
 * Собирает options для старта crop mode.
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
 * Применяет текущий demo preset к активному crop mode.
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
 * Инициализирует demo listeners для crop mode.
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
