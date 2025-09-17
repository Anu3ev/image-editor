// Получение всех элементов управления

// Кнопка выбора изображения
export const chooseImageBtn = document.getElementById('choose-images-btn')
// Кнопка сохранения
export const saveCanvasBtn = document.getElementById('save-canvas')
// Инпут для загрузки файла
export const fileInput = document.getElementById('file-input')
// Очистить
export const clearBtn = document.getElementById('clear-btn')

// Bring to front
export const bringToFrontBtn = document.getElementById('bring-to-front-btn')

// Bring forward
export const bringForwardBtn = document.getElementById('bring-object-forward')

// Send to back
export const sendToBackBtn = document.getElementById('send-to-back-btn')

// Send backwards
export const sendBackwardsBtn = document.getElementById('send-object-backwards')

// Копировать-вставить
export const copyBtn = document.getElementById('copy-btn')
export const pasteBtn = document.getElementById('paste-btn')

// Поворот объекта
export const rotateRightBtn = document.getElementById('rotate-plus-90-btn')
export const rotateLeftBtn = document.getElementById('rotate-minus-90-btn')

// Flip
export const flipXBtn = document.getElementById('flip-x-btn')
export const flipYBtn = document.getElementById('flip-y-btn')

// Select all
export const selectAllBtn = document.getElementById('select-all-btn')

// Удалить объект
export const deleteSelectedBtn = document.getElementById('delete-selected-btn')

// Сгруппировать/разгруппировать выделенные объекты
export const groupBtn = document.getElementById('group-btn')
export const ungroupBtn = document.getElementById('ungroup-btn')

// Zoom
export const zoomInBtn = document.getElementById('zoom-in-btn')
export const zoomOutBtn = document.getElementById('zoom-out-btn')
export const resetZoomBtn = document.getElementById('reset-zoom-btn')
export const setDefaultScaleBtn = document.getElementById('set-default-scale-btn')

// Image fit
export const imageFitContainBtn = document.getElementById('fit-contain-btn')
export const imageFitCoverBtn = document.getElementById('fit-cover-btn')

// Сброс масштаба
export const resetFit = document.getElementById('reset-fit-btn')

// Scale canvas
export const scaleCanvasToImageBtn = document.getElementById('scale-canvas-btn')

// Элемент для отображения разрешения канваса
export const canvasResolutionNode = document.getElementById('canvas-resolution')

export const montageAreaResolutionNode = document.getElementById('montage-area-resolution')

// Элемент для отображения размера канваса
export const canvasDisplaySizeNode = document.getElementById('canvas-display-size')
// Элемент для отображения размера текущего объекта
export const currentObjectDataNode = document.getElementById('current-object-data')

// Добавление фигур
export const addRectBtn = document.getElementById('add-rect-btn')
export const addCircleBtn = document.getElementById('add-circle-btn')
export const addTriangleBtn = document.getElementById('add-triangle-btn')

// State controls
export const undoBtn = document.getElementById('undo-btn')
export const redoBtn = document.getElementById('redo-btn')

// Background controls
export const backgroundTypeSelect = document.getElementById('background-type')
export const colorBackgroundControls = document.getElementById('color-background-controls')
export const gradientBackgroundControls = document.getElementById('gradient-background-controls')
export const imageBackgroundControls = document.getElementById('image-background-controls')
export const backgroundColorInput = document.getElementById('background-color')
export const setColorBackgroundBtn = document.getElementById('set-color-background-btn')
export const gradientStartColorInput = document.getElementById('gradient-start-color')
export const gradientEndColorInput = document.getElementById('gradient-end-color')
export const gradientAngleInput = document.getElementById('gradient-angle')
export const gradientAngleValue = document.getElementById('gradient-angle-value')
export const setGradientBackgroundBtn = document.getElementById('set-gradient-background-btn')
export const backgroundImageInput = document.getElementById('background-image-input')
export const setImageBackgroundBtn = document.getElementById('set-image-background-btn')
export const removeBackgroundBtn = document.getElementById('remove-background-btn')
