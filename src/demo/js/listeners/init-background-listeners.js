// @ts-nocheck

import {
  removeBackground,
  setColorBackground,
  setGradientBackground,
  setImageBackground
} from '../methods.js'

/**
 * Initializes listeners for controlling the demo editor background.
 */
export default ({ editorInstance, controls }) => {
  const {
    backgroundTypeSelect,
    colorBackgroundControls,
    gradientBackgroundControls,
    imageBackgroundControls,
    backgroundColorInput,
    setColorBackgroundBtn,
    gradientTypeSelect,
    linearGradientControls,
    radialGradientControls,
    gradientStopsContainer,
    addGradientStopBtn,
    gradientAngleInput,
    gradientAngleValue,
    gradientCenterXInput,
    gradientCenterXValue,
    gradientCenterYInput,
    gradientCenterYValue,
    gradientRadiusInput,
    gradientRadiusValue,
    setGradientBackgroundBtn,
    backgroundImageInput,
    setImageBackgroundBtn,
    removeBackgroundBtn
  } = controls

  /**
   * Updates the visibility of background type selection sections.
   */
  const updateBackgroundTypeControls = ({ selectedType }) => {
    colorBackgroundControls.style.display = 'none'
    gradientBackgroundControls.style.display = 'none'
    imageBackgroundControls.style.display = 'none'

    if (selectedType === 'color') {
      colorBackgroundControls.style.display = 'block'
      return
    }

    if (selectedType === 'gradient') {
      gradientBackgroundControls.style.display = 'block'
      return
    }

    if (selectedType === 'image') {
      imageBackgroundControls.style.display = 'block'
    }
  }

  /**
   * Updates the visibility of sections for the selected gradient type.
   */
  const updateGradientTypeControls = ({ selectedType }) => {
    linearGradientControls.style.display = 'none'
    radialGradientControls.style.display = 'none'

    if (selectedType === 'linear') {
      linearGradientControls.style.display = 'block'
      return
    }

    if (selectedType === 'radial') {
      radialGradientControls.style.display = 'block'
    }
  }

  /**
   * Creates a DOM element for a single gradient color stop.
   */
  const createGradientStopElement = ({ color = '#000000', offset = 0 } = {}) => {
    const container = document.createElement('div')
    container.className = 'd-flex gap-2 align-items-center gradient-stop-row'

    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.className = 'form-control form-control-color form-control-sm'
    colorInput.value = color

    const offsetInput = document.createElement('input')
    offsetInput.type = 'number'
    offsetInput.className = 'form-control form-control-sm'
    offsetInput.min = '0'
    offsetInput.max = '100'
    offsetInput.value = offset
    offsetInput.placeholder = '%'

    const removeBtn = document.createElement('button')
    removeBtn.className = 'btn btn-outline-danger btn-sm'
    removeBtn.textContent = '×'
    removeBtn.title = 'Remove stop'
    removeBtn.onclick = () => container.remove()

    container.appendChild(colorInput)
    container.appendChild(offsetInput)
    container.appendChild(removeBtn)

    return container
  }

  /**
   * Returns the current set of gradient stops from the UI.
   */
  const getGradientStops = () => {
    const rows = gradientStopsContainer.querySelectorAll('.gradient-stop-row')
    const stops = []

    for (const row of rows) {
      const inputs = row.querySelectorAll('input')
      const color = inputs[0].value
      const offset = Number(inputs[1].value)
      stops.push({ color, offset })
    }

    return stops.sort((a, b) => a.offset - b.offset)
  }

  /**
   * Initializes the starting gradient stops.
   */
  const initDefaultGradientStops = () => {
    if (gradientStopsContainer.children.length > 0) return

    gradientStopsContainer.appendChild(createGradientStopElement({ color: '#79F1A4', offset: 0 }))
    gradientStopsContainer.appendChild(createGradientStopElement({ color: '#0E5CAD', offset: 100 }))
  }

  /**
   * Registers listeners for background and gradient type selection.
   */
  const initBackgroundTypeListeners = () => {
    backgroundTypeSelect.addEventListener('change', (event) => {
      updateBackgroundTypeControls({ selectedType: event.target.value })
    })

    gradientTypeSelect.addEventListener('change', (event) => {
      updateGradientTypeControls({ selectedType: event.target.value })
    })
  }

  /**
   * Registers listeners for gradient control values.
   */
  const initGradientControlListeners = () => {
    gradientAngleInput.addEventListener('input', (event) => {
      gradientAngleValue.textContent = event.target.value
    })

    gradientCenterXInput.addEventListener('input', (event) => {
      gradientCenterXValue.textContent = event.target.value
    })

    gradientCenterYInput.addEventListener('input', (event) => {
      gradientCenterYValue.textContent = event.target.value
    })

    gradientRadiusInput.addEventListener('input', (event) => {
      gradientRadiusValue.textContent = event.target.value
    })

    addGradientStopBtn.addEventListener('click', () => {
      gradientStopsContainer.appendChild(createGradientStopElement({ color: '#ffffff', offset: 50 }))
    })
  }

  /**
   * Registers listeners for background change actions.
   */
  const initBackgroundActionListeners = () => {
    setColorBackgroundBtn.addEventListener('click', () => {
      setColorBackground(editorInstance, backgroundColorInput.value)
    })

    setGradientBackgroundBtn.addEventListener('click', () => {
      const colorStops = getGradientStops()
      const gradientType = gradientTypeSelect.value

      if (gradientType === 'radial') {
        const centerX = parseFloat(gradientCenterXInput.value)
        const centerY = parseFloat(gradientCenterYInput.value)
        const radius = parseFloat(gradientRadiusInput.value)

        setGradientBackground(editorInstance, null, null, 'radial', {
          centerX,
          centerY,
          radius,
          colorStops
        })
        return
      }

      const angle = gradientAngleInput.value
      setGradientBackground(editorInstance, null, null, 'linear', {
        angle,
        colorStops
      })
    })

    setImageBackgroundBtn.addEventListener('click', () => {
      const file = backgroundImageInput.files[0]
      if (!file) return

      setImageBackground(editorInstance, file)
    })

    removeBackgroundBtn.addEventListener('click', () => {
      removeBackground(editorInstance)
    })
  }

  /**
   * Registers listeners for canvas background change events.
   */
  const initBackgroundCanvasListeners = () => {
    editorInstance.canvas.on('background:changed', (event) => {
      console.log('Background changed:', event)
    })

    editorInstance.canvas.on('background:removed', () => {
      console.log('Background removed')
      backgroundTypeSelect.value = ''
      colorBackgroundControls.style.display = 'none'
      gradientBackgroundControls.style.display = 'none'
      imageBackgroundControls.style.display = 'none'
    })
  }

  /**
   * Initializes the background UI state.
   */
  const initBackgroundState = () => {
    initDefaultGradientStops()
    updateBackgroundTypeControls({ selectedType: backgroundTypeSelect.value })
    updateGradientTypeControls({ selectedType: gradientTypeSelect.value })
    gradientAngleValue.textContent = gradientAngleInput.value
    gradientCenterXValue.textContent = gradientCenterXInput.value
    gradientCenterYValue.textContent = gradientCenterYInput.value
    gradientRadiusValue.textContent = gradientRadiusInput.value
  }

  initBackgroundState()
  initBackgroundTypeListeners()
  initGradientControlListeners()
  initBackgroundActionListeners()
  initBackgroundCanvasListeners()
}
