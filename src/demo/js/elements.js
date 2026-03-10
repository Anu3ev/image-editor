/** Кнопка открытия системного выбора изображений для импорта на canvas. */
const chooseImageBtn = document.getElementById('choose-images-btn')
/** Кнопка сохранения текущего результата редактора в файл. */
const saveCanvasBtn = document.getElementById('save-canvas')
/** Input для выбора одного или нескольких файлов изображений. */
const fileInput = document.getElementById('file-input')
/** Кнопка полной очистки canvas от объектов. */
const clearBtn = document.getElementById('clear-btn')
/** Кнопка перемещения активного объекта на передний план. */
const bringToFrontBtn = document.getElementById('bring-to-front-btn')
/** Кнопка перемещения активного объекта на один слой выше. */
const bringForwardBtn = document.getElementById('bring-object-forward')
/** Кнопка перемещения активного объекта на задний план. */
const sendToBackBtn = document.getElementById('send-to-back-btn')
/** Кнопка перемещения активного объекта на один слой ниже. */
const sendBackwardsBtn = document.getElementById('send-object-backwards')
/** Кнопка копирования активного объекта в буфер редактора. */
const copyBtn = document.getElementById('copy-btn')
/** Кнопка вставки объекта из внутреннего буфера редактора. */
const pasteBtn = document.getElementById('paste-btn')
/** Кнопка поворота активного объекта на 90 градусов по часовой стрелке. */
const rotateRightBtn = document.getElementById('rotate-plus-90-btn')
/** Кнопка поворота активного объекта на 90 градусов против часовой стрелки. */
const rotateLeftBtn = document.getElementById('rotate-minus-90-btn')
/** Кнопка зеркального отражения активного объекта по горизонтали. */
const flipXBtn = document.getElementById('flip-x-btn')
/** Кнопка зеркального отражения активного объекта по вертикали. */
const flipYBtn = document.getElementById('flip-y-btn')
/** Кнопка выделения всех объектов на canvas. */
const selectAllBtn = document.getElementById('select-all-btn')
/** Кнопка удаления выбранного объекта или группы объектов. */
const deleteSelectedBtn = document.getElementById('delete-selected-btn')
/** Кнопка группировки нескольких выбранных объектов. */
const groupBtn = document.getElementById('group-btn')
/** Кнопка разгруппировки активной группы объектов. */
const ungroupBtn = document.getElementById('ungroup-btn')
/** Кнопка увеличения масштаба viewport редактора. */
const zoomInBtn = document.getElementById('zoom-in-btn')
/** Кнопка уменьшения масштаба viewport редактора. */
const zoomOutBtn = document.getElementById('zoom-out-btn')
/** Кнопка сброса текущего zoom до базового состояния. */
const resetZoomBtn = document.getElementById('reset-zoom-btn')
/** Кнопка установки дефолтного масштаба для содержимого редактора. */
const setDefaultScaleBtn = document.getElementById('set-default-scale-btn')
/** Кнопка вписывания активного изображения в монтажную область по contain. */
const imageFitContainBtn = document.getElementById('fit-contain-btn')
/** Кнопка заполнения монтажной области активным изображением по cover. */
const imageFitCoverBtn = document.getElementById('fit-cover-btn')
/** Кнопка сброса трансформаций активного объекта к дефолтным значениям. */
const resetFit = document.getElementById('reset-fit-btn')
/** Кнопка подгонки размера монтажной области под размеры изображения. */
const scaleCanvasToImageBtn = document.getElementById('scale-canvas-btn')

/** Узел отображения текущего внутреннего разрешения canvas. */
const canvasResolutionNode = document.getElementById('canvas-resolution')
/** Узел отображения разрешения монтажной области. */
const montageAreaResolutionNode = document.getElementById('montage-area-resolution')
/** Узел отображения визуального размера canvas в DOM. */
const canvasDisplaySizeNode = document.getElementById('canvas-display-size')
/** Узел отображения данных текущего выделенного объекта. */
const currentObjectDataNode = document.getElementById('current-object-data')
/** Узел отображения текущего значения zoom редактора. */
const canvasZoomNode = document.getElementById('canvas-zoom')

/** Кнопка открытия меню выбора пресета новой фигуры. */
const addShapeBtn = document.getElementById('add-shape-btn')
/** Popup-меню с доступными пресетами фигур для добавления. */
const shapePickerMenu = document.getElementById('shape-picker-menu')
/** Коллекция кнопок выбора пресета фигуры для создания нового shape-объекта. */
const shapePresetButtons = Array.from(document.querySelectorAll('[data-shape-preset]'))
/** Кнопка открытия меню замены пресета у активной фигуры. */
const replaceShapeBtn = document.getElementById('replace-shape-btn')
/** Popup-меню с пресетами для замены активной фигуры. */
const replaceShapeMenu = document.getElementById('replace-shape-menu')
/** Коллекция кнопок выбора нового пресета для активной фигуры. */
const replaceShapePresetButtons = Array.from(document.querySelectorAll('[data-replace-shape-preset]'))
/** Input выбора цвета заливки активной фигуры. */
const shapeFillInput = document.getElementById('shape-fill-color')
/** Контейнер палитры быстрых цветов заливки фигуры. */
const shapeFillPalette = document.getElementById('shape-fill-palette')
/** Input выбора цвета обводки активной фигуры. */
const shapeStrokeInput = document.getElementById('shape-stroke-color')
/** Контейнер палитры быстрых цветов обводки фигуры. */
const shapeStrokePalette = document.getElementById('shape-stroke-palette')
/** Input выбора ширины обводки фигуры. */
const shapeStrokeWidthInput = document.getElementById('shape-stroke-width')
/** Узел отображения текущей ширины обводки фигуры. */
const shapeStrokeWidthValue = document.getElementById('shape-stroke-width-value')
/** Input выбора непрозрачности активной фигуры. */
const shapeOpacityInput = document.getElementById('shape-opacity')
/** Узел отображения текущей непрозрачности фигуры в процентах. */
const shapeOpacityValue = document.getElementById('shape-opacity-value')
/** Input выбора радиуса скругления углов фигуры. */
const shapeRoundingInput = document.getElementById('shape-rounding')
/** Узел отображения текущего скругления фигуры. */
const shapeRoundingValue = document.getElementById('shape-rounding-value')

/** Кнопка добавления нового текстового объекта на canvas. */
const addTextBtn = document.getElementById('add-text-btn')
/** Input содержимого текста для нового или активного текстового объекта. */
const textContentInput = document.getElementById('text-content')
/** Select выбора семейства шрифта текста. */
const textFontFamilySelect = document.getElementById('text-font-family')
/** Input выбора размера шрифта текста. */
const textFontSizeInput = document.getElementById('text-font-size')
/** Кнопка переключения жирного начертания текста. */
const textBoldBtn = document.getElementById('text-bold-btn')
/** Кнопка переключения курсива текста. */
const textItalicBtn = document.getElementById('text-italic-btn')
/** Кнопка переключения подчёркивания текста. */
const textUnderlineBtn = document.getElementById('text-underline-btn')
/** Кнопка переключения uppercase-режима текста. */
const textUppercaseBtn = document.getElementById('text-uppercase-btn')
/** Кнопка переключения зачёркивания текста. */
const textStrikeBtn = document.getElementById('text-strike-btn')
/** Кнопка циклического переключения выравнивания текста. */
const textAlignToggle = document.getElementById('text-align-toggle')
/** Input выбора цвета заливки текста. */
const textColorInput = document.getElementById('text-color')
/** Контейнер палитры быстрых цветов текста. */
const textColorPalette = document.getElementById('text-color-palette')
/** Input выбора цвета stroke текста. */
const textStrokeColorInput = document.getElementById('text-stroke-color')
/** Контейнер палитры быстрых цветов stroke текста. */
const textStrokePalette = document.getElementById('text-stroke-palette')
/** Input выбора ширины stroke текста. */
const textStrokeWidthInput = document.getElementById('text-stroke-width')
/** Узел отображения текущей ширины stroke текста. */
const textStrokeWidthValue = document.getElementById('text-stroke-width-value')
/** Input выбора непрозрачности текстового объекта. */
const textOpacityInput = document.getElementById('text-opacity')
/** Узел отображения текущей непрозрачности текста в процентах. */
const textOpacityValue = document.getElementById('text-opacity-value')
/** Чекбокс включения подложки у текстового объекта. */
const textBackgroundEnabledCheckbox = document.getElementById('text-background-enabled')
/** Input выбора цвета подложки текста. */
const textBackgroundColorInput = document.getElementById('text-background-color')
/** Input выбора непрозрачности подложки текста. */
const textBackgroundOpacityInput = document.getElementById('text-background-opacity')
/** Узел отображения непрозрачности подложки текста. */
const textBackgroundOpacityValue = document.getElementById('text-background-opacity-value')
/** Input верхнего внутреннего отступа подложки текста. */
const textPaddingTopInput = document.getElementById('text-padding-top')
/** Input правого внутреннего отступа подложки текста. */
const textPaddingRightInput = document.getElementById('text-padding-right')
/** Input нижнего внутреннего отступа подложки текста. */
const textPaddingBottomInput = document.getElementById('text-padding-bottom')
/** Input левого внутреннего отступа подложки текста. */
const textPaddingLeftInput = document.getElementById('text-padding-left')
/** Input радиуса верхнего левого угла подложки текста. */
const textRadiusTopLeftInput = document.getElementById('text-radius-top-left')
/** Input радиуса верхнего правого угла подложки текста. */
const textRadiusTopRightInput = document.getElementById('text-radius-top-right')
/** Input радиуса нижнего правого угла подложки текста. */
const textRadiusBottomRightInput = document.getElementById('text-radius-bottom-right')
/** Input радиуса нижнего левого угла подложки текста. */
const textRadiusBottomLeftInput = document.getElementById('text-radius-bottom-left')

/** Input ширины монтажной области для ручного изменения resolution. */
const montageWidthInput = document.getElementById('montage-width-input')
/** Input высоты монтажной области для ручного изменения resolution. */
const montageHeightInput = document.getElementById('montage-height-input')
/** Кнопка применения введённого разрешения монтажной области. */
const applyMontageResolutionBtn = document.getElementById('apply-montage-resolution-btn')

/** Кнопка сериализации выделения в JSON шаблона. */
const serializeTemplateBtn = document.getElementById('serialize-template-btn')
/** Кнопка применения JSON шаблона к редактору. */
const applyTemplateBtn = document.getElementById('apply-template-btn')
/** Textarea с JSON шаблона для чтения и редактирования. */
const templateJsonInput = document.getElementById('template-json-input')
/** Чекбокс включения фона в сериализуемый шаблон. */
const serializeTemplateWithBackgroundCheckbox = document.getElementById('serialize-with-background')
/** Кнопка загрузки JSON активного объекта в textarea. */
const loadActiveObjectBtn = document.getElementById('load-active-object-btn')
/** Textarea с JSON активного объекта для ручного редактирования. */
const activeObjectJsonInput = document.getElementById('active-object-json')
/** Кнопка применения изменённого JSON к активному объекту. */
const saveActiveObjectBtn = document.getElementById('save-active-object-btn')

/** Кнопка отката последнего действия истории редактора. */
const undoBtn = document.getElementById('undo-btn')
/** Кнопка повторного применения отменённого действия истории редактора. */
const redoBtn = document.getElementById('redo-btn')

/** Select выбора типа фоновой подложки редактора. */
const backgroundTypeSelect = document.getElementById('background-type')
/** Контейнер контролов однотонного цветового фона. */
const colorBackgroundControls = document.getElementById('color-background-controls')
/** Контейнер контролов градиентного фона. */
const gradientBackgroundControls = document.getElementById('gradient-background-controls')
/** Контейнер контролов фонового изображения. */
const imageBackgroundControls = document.getElementById('image-background-controls')
/** Input выбора цвета однотонного фона. */
const backgroundColorInput = document.getElementById('background-color')
/** Кнопка применения однотонного цветового фона. */
const setColorBackgroundBtn = document.getElementById('set-color-background-btn')
/** Select выбора типа градиента: linear или radial. */
const gradientTypeSelect = document.getElementById('gradient-type')
/** Контейнер контролов линейного градиента. */
const linearGradientControls = document.getElementById('linear-gradient-controls')
/** Контейнер контролов радиального градиента. */
const radialGradientControls = document.getElementById('radial-gradient-controls')
/** Контейнер списка точек цвета градиента. */
const gradientStopsContainer = document.getElementById('gradient-stops-container')
/** Кнопка добавления новой точки цвета в градиент. */
const addGradientStopBtn = document.getElementById('add-gradient-stop-btn')
/** Input угла линейного градиента. */
const gradientAngleInput = document.getElementById('gradient-angle')
/** Узел отображения текущего угла линейного градиента. */
const gradientAngleValue = document.getElementById('gradient-angle-value')
/** Input координаты X центра радиального градиента. */
const gradientCenterXInput = document.getElementById('gradient-center-x')
/** Узел отображения текущего X центра радиального градиента. */
const gradientCenterXValue = document.getElementById('gradient-center-x-value')
/** Input координаты Y центра радиального градиента. */
const gradientCenterYInput = document.getElementById('gradient-center-y')
/** Узел отображения текущего Y центра радиального градиента. */
const gradientCenterYValue = document.getElementById('gradient-center-y-value')
/** Input радиуса радиального градиента. */
const gradientRadiusInput = document.getElementById('gradient-radius')
/** Узел отображения текущего радиуса радиального градиента. */
const gradientRadiusValue = document.getElementById('gradient-radius-value')
/** Кнопка применения параметров градиентного фона. */
const setGradientBackgroundBtn = document.getElementById('set-gradient-background-btn')
/** Input выбора файла для фонового изображения. */
const backgroundImageInput = document.getElementById('background-image-input')
/** Кнопка применения выбранного изображения как фона. */
const setImageBackgroundBtn = document.getElementById('set-image-background-btn')
/** Кнопка удаления текущего фона редактора. */
const removeBackgroundBtn = document.getElementById('remove-background-btn')

/** Группа основных toolbar-контролов редактора. */
export const toolbarControls = {
  chooseImageBtn,
  saveCanvasBtn,
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
}

/** Группа информационных узлов со служебным состоянием canvas. */
export const canvasInfoControls = {
  canvasResolutionNode,
  montageAreaResolutionNode,
  canvasDisplaySizeNode,
  currentObjectDataNode,
  canvasZoomNode
}

/** Группа контролов управления shape-объектами. */
export const shapeControls = {
  addShapeBtn,
  shapePickerMenu,
  shapePresetButtons,
  replaceShapeBtn,
  replaceShapeMenu,
  replaceShapePresetButtons,
  shapeFillInput,
  shapeFillPalette,
  shapeStrokeInput,
  shapeStrokePalette,
  shapeStrokeWidthInput,
  shapeStrokeWidthValue,
  shapeOpacityInput,
  shapeOpacityValue,
  shapeRoundingInput,
  shapeRoundingValue
}

/** Группа контролов управления текстовыми объектами. */
export const textControls = {
  addTextBtn,
  textContentInput,
  textFontFamilySelect,
  textFontSizeInput,
  textBoldBtn,
  textItalicBtn,
  textUnderlineBtn,
  textUppercaseBtn,
  textStrikeBtn,
  textAlignToggle,
  textColorInput,
  textColorPalette,
  textStrokeColorInput,
  textStrokePalette,
  textStrokeWidthInput,
  textStrokeWidthValue,
  textOpacityInput,
  textOpacityValue,
  textBackgroundEnabledCheckbox,
  textBackgroundColorInput,
  textBackgroundOpacityInput,
  textBackgroundOpacityValue,
  textPaddingTopInput,
  textPaddingRightInput,
  textPaddingBottomInput,
  textPaddingLeftInput,
  textRadiusTopLeftInput,
  textRadiusTopRightInput,
  textRadiusBottomRightInput,
  textRadiusBottomLeftInput
}

/** Группа контролов изменения разрешения монтажной области. */
export const montageControls = {
  montageWidthInput,
  montageHeightInput,
  applyMontageResolutionBtn
}

/** Группа контролов сериализации шаблона и JSON активного объекта. */
export const serializationControls = {
  serializeTemplateBtn,
  applyTemplateBtn,
  templateJsonInput,
  serializeTemplateWithBackgroundCheckbox,
  loadActiveObjectBtn,
  activeObjectJsonInput,
  saveActiveObjectBtn
}

/** Группа контролов undo/redo истории редактора. */
export const historyControls = {
  undoBtn,
  redoBtn
}

/** Группа контролов управления фоном редактора. */
export const backgroundControls = {
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
}
