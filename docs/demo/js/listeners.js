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
  redoBtn
} from './elements.js'

import {
  getCanvasResolution,
  getMontageAreaResolution,
  getCanvasDisplaySize,
  getCurrentObjectData,
  importImage,
  saveResult
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
    editorInstance.transformManager.fitObject({ type: 'contain' })
  })

  // Image fit cover
  imageFitCoverBtn.addEventListener('click', () => {
    editorInstance.transformManager.fitObject({ type: 'cover' })
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
}
