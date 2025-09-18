import {
  // Кнопка выбора изображения
  chooseImageBtn,
  // Кнопка сохранения
  saveCanvasBtn,
  // Инпут для загрузки файла
  fileInput,
  // Очистить
  clearBtn,
  // Bring to front
  bringToFrontBtn,
  // Bring forward
  bringForwardBtn,
  // Send to back
  sendToBackBtn,
  // Send backwards
  sendBackwardsBtn,
  // Копировать-вставить
  copyBtn,
  pasteBtn,
  // Поворот объекта
  rotateRightBtn,
  rotateLeftBtn,
  // Flip
  flipXBtn,
  flipYBtn,
  // Select all
  selectAllBtn,
  // Удалить объект
  deleteSelectedBtn,
  // Сгруппировать/разгруппировать выделенные объекты
  groupBtn,
  ungroupBtn,
  // Zoom
  zoomInBtn,
  zoomOutBtn,
  resetZoomBtn,
  setDefaultScaleBtn,
  // Image fit
  imageFitContainBtn,
  imageFitCoverBtn,
  // Сброс масштаба
  resetFit,
  // Scale canvas
  scaleCanvasToImageBtn,
  // Элемент для отображения разрешения канваса
  canvasResolutionNode,
  // Элемент для отображения разрешения монтажной области
  montageAreaResolutionNode,
  // Элемент для отображения размера канваса
  canvasDisplaySizeNode,
  // Элемент для отображения размера текущего объекта
  currentObjectDataNode,
  // Добавление фигур
  addRectBtn,
  addCircleBtn,
  addTriangleBtn,
  // Undo/Redo
  undoBtn,
  redoBtn,
  // Background controls
  backgroundTypeSelect,
  colorBackgroundControls,
  gradientBackgroundControls,
  imageBackgroundControls,
  backgroundColorInput,
  setColorBackgroundBtn,
  // Gradient controls
  gradientTypeSelect,
  linearGradientControls,
  radialGradientControls,
  gradientStartColorInput,
  gradientEndColorInput,
  // Linear gradient controls
  gradientAngleInput,
  gradientAngleValue,
  // Radial gradient controls
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
} from './elements.js'

import {
  getCanvasResolution,
  getMontageAreaResolution,
  getCanvasDisplaySize,
  getCurrentObjectData,
  importImage,
  saveResult,
  setColorBackground,
  setGradientBackground,
  setImageBackground,
  removeBackground
} from './methods.js'

export default (editorInstance) => {
  // Scale canvas
  scaleCanvasToImageBtn.addEventListener('click', () => {
    editorInstance.canvasManager.scaleMontageAreaToImage()
  })

  // Сброс параметров объекта до дефолтных
  resetFit.addEventListener('click', () => {
    editorInstance.transformManager.resetObject()
  })

  // Image fit contain
  imageFitContainBtn.addEventListener('click', () => {
    editorInstance.transformManager.fitObject({ fitAsOneObject: true, type: 'contain' })
  })

  // Image fit cover
  imageFitCoverBtn.addEventListener('click', () => {
    editorInstance.transformManager.fitObject({ fitAsOneObject: true, type: 'cover' })
  })

  // Bring to front
  bringToFrontBtn.addEventListener('click', () => {
    editorInstance.layerManager.bringToFront()
  })

  // Bring forward
  bringForwardBtn.addEventListener('click', () => {
    editorInstance.layerManager.bringForward()
  })

  // Send to back
  sendToBackBtn.addEventListener('click', () => {
    editorInstance.layerManager.sendToBack()
  })

  // Send backwards
  sendBackwardsBtn.addEventListener('click', () => {
    editorInstance.layerManager.sendBackwards()
  })

  // Сброс масштаба
  resetZoomBtn.addEventListener('click', () => {
    editorInstance.transformManager.resetZoom()
  })

  // Установка дефолтного масштаба для всего
  setDefaultScaleBtn.addEventListener('click', () => {
    editorInstance.canvasManager.setDefaultScale()
  })

  // Увеличение масштаба
  zoomInBtn.addEventListener('click', () => {
    editorInstance.transformManager.zoom(0.1)
  })

  // Уменьшение масштаба
  zoomOutBtn.addEventListener('click', () => {
    editorInstance.transformManager.zoom(-0.1)
  })

  // Группировка объектов
  groupBtn.addEventListener('click', () => {
    editorInstance.groupingManager.group()
  })

  // Разгруппировка объектов
  ungroupBtn.addEventListener('click', () => {
    editorInstance.groupingManager.ungroup()
  })

  // Удалить выбранный объект
  deleteSelectedBtn.addEventListener('click', () => {
    editorInstance.deletionManager.deleteSelectedObjects()
  })

  // Выделить все объекты
  selectAllBtn.addEventListener('click', () => {
    editorInstance.selectionManager.selectAll()
  })

  // Очистка холста
  clearBtn.addEventListener('click', () => {
    editorInstance.canvasManager.clearCanvas()
  })

  // Копирование объекта
  copyBtn.addEventListener('click', () => {
    editorInstance.clipboardManager.copy()
  })

  // Вставка объекта
  pasteBtn.addEventListener('click', () => {
    editorInstance.clipboardManager.paste()
  })

  // Поворот объекта на 90 градусов
  rotateRightBtn.addEventListener('click', () => {
    editorInstance.transformManager.rotate(90)
  })

  // Поворот объекта на -90 градусов
  rotateLeftBtn.addEventListener('click', () => {
    editorInstance.transformManager.rotate(-90)
  })

  // Flip по горизонтали
  flipXBtn.addEventListener('click', () => {
    editorInstance.transformManager.flipX()
  })

  // Flip по вертикали
  flipYBtn.addEventListener('click', () => {
    editorInstance.transformManager.flipY()
  })

  chooseImageBtn.addEventListener('click', () => {
    fileInput.click()
  })

  fileInput.addEventListener('change', (e) => {
    importImage(e, editorInstance)
    fileInput.value = ''
  })

  // Сохранение результата
  saveCanvasBtn.addEventListener('click', () => {
    saveResult(editorInstance)
  })

  // Добавление прямоугольника
  addRectBtn.addEventListener('click', () => {
    editorInstance.shapeManager.addRectangle()
  })

  // Добавление круга
  addCircleBtn.addEventListener('click', () => {
    editorInstance.shapeManager.addCircle()
  })

  // Добавление треугольника
  addTriangleBtn.addEventListener('click', () => {
    editorInstance.shapeManager.addTriangle()
  })

  // Undo
  undoBtn.addEventListener('click', () => {
    editorInstance.historyManager.undo()
  })

  // Redo
  redoBtn.addEventListener('click', () => {
    editorInstance.historyManager.redo()
  })

  // Отображение разрешения канваса
  canvasResolutionNode.textContent = getCanvasResolution(editorInstance)

  // Отображение размера канваса
  canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)

  // Отображение разрешения монтажной области
  montageAreaResolutionNode.textContent = getMontageAreaResolution(editorInstance)

  editorInstance.canvas.on('after:render', () => {
    canvasResolutionNode.textContent = getCanvasResolution(editorInstance)
    montageAreaResolutionNode.textContent = getMontageAreaResolution(editorInstance)
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
  })

  editorInstance.canvas.on('object:modified', () => {
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
  })

  editorInstance.canvas.on('editor:display-width-changed', () => {
    canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
  })

  editorInstance.canvas.on('editor:display-height-changed', () => {
    canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
  })

  // Canvas Zoom Node
  const canvasZoomNode = document.getElementById('canvas-zoom')
  canvasZoomNode.textContent = editorInstance.canvas.getZoom()

  editorInstance.canvas.on('editor:zoom-changed', ({ currentZoom }) => {
    canvasZoomNode.textContent = currentZoom
  })

  // Background controls
  backgroundTypeSelect.addEventListener('change', (e) => {
    const selectedType = e.target.value

    // Hide all background options
    colorBackgroundControls.style.display = 'none'
    gradientBackgroundControls.style.display = 'none'
    imageBackgroundControls.style.display = 'none'

    // Show selected option
    if (selectedType === 'color') {
      colorBackgroundControls.style.display = 'block'
    } else if (selectedType === 'gradient') {
      gradientBackgroundControls.style.display = 'block'
    } else if (selectedType === 'image') {
      imageBackgroundControls.style.display = 'block'
    }
  })

  // Gradient angle slider
  gradientAngleInput.addEventListener('input', (e) => {
    gradientAngleValue.textContent = e.target.value
  })

  // Gradient type selector
  gradientTypeSelect.addEventListener('change', (e) => {
    const selectedType = e.target.value

    // Hide all gradient controls
    linearGradientControls.style.display = 'none'
    radialGradientControls.style.display = 'none'

    // Show selected gradient controls
    if (selectedType === 'linear') {
      linearGradientControls.style.display = 'block'
    } else if (selectedType === 'radial') {
      radialGradientControls.style.display = 'block'
    }
  })

  // Radial gradient controls
  gradientCenterXInput.addEventListener('input', (e) => {
    gradientCenterXValue.textContent = e.target.value
  })

  gradientCenterYInput.addEventListener('input', (e) => {
    gradientCenterYValue.textContent = e.target.value
  })

  gradientRadiusInput.addEventListener('input', (e) => {
    gradientRadiusValue.textContent = e.target.value
  })  // Color background
  setColorBackgroundBtn.addEventListener('click', () => {
    const color = backgroundColorInput.value
    setColorBackground(editorInstance, color)
  })

  // Gradient background
  setGradientBackgroundBtn.addEventListener('click', () => {
    const startColor = gradientStartColorInput.value
    const endColor = gradientEndColorInput.value
    const gradientType = gradientTypeSelect.value

    if (gradientType === 'radial') {
      const centerX = parseFloat(gradientCenterXInput.value)
      const centerY = parseFloat(gradientCenterYInput.value)
      const radius = parseFloat(gradientRadiusInput.value)

      setGradientBackground(editorInstance, startColor, endColor, 'radial', {
        centerX,
        centerY,
        radius
      })
    } else {
      const angle = gradientAngleInput.value
      setGradientBackground(editorInstance, startColor, endColor, 'linear', {
        angle
      })
    }
  })

  // Image background
  setImageBackgroundBtn.addEventListener('click', () => {
    const file = backgroundImageInput.files[0]
    if (file) {
      setImageBackground(editorInstance, file)
    }
  })

  // Remove background
  removeBackgroundBtn.addEventListener('click', () => {
    removeBackground(editorInstance)
  })

  // Background events
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
