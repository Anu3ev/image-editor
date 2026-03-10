const chooseImageBtn = document.getElementById('choose-images-btn')
const saveCanvasBtn = document.getElementById('save-canvas')
const fileInput = document.getElementById('file-input')
const clearBtn = document.getElementById('clear-btn')
const bringToFrontBtn = document.getElementById('bring-to-front-btn')
const bringForwardBtn = document.getElementById('bring-object-forward')
const sendToBackBtn = document.getElementById('send-to-back-btn')
const sendBackwardsBtn = document.getElementById('send-object-backwards')
const copyBtn = document.getElementById('copy-btn')
const pasteBtn = document.getElementById('paste-btn')
const rotateRightBtn = document.getElementById('rotate-plus-90-btn')
const rotateLeftBtn = document.getElementById('rotate-minus-90-btn')
const flipXBtn = document.getElementById('flip-x-btn')
const flipYBtn = document.getElementById('flip-y-btn')
const selectAllBtn = document.getElementById('select-all-btn')
const deleteSelectedBtn = document.getElementById('delete-selected-btn')
const groupBtn = document.getElementById('group-btn')
const ungroupBtn = document.getElementById('ungroup-btn')
const zoomInBtn = document.getElementById('zoom-in-btn')
const zoomOutBtn = document.getElementById('zoom-out-btn')
const resetZoomBtn = document.getElementById('reset-zoom-btn')
const setDefaultScaleBtn = document.getElementById('set-default-scale-btn')
const imageFitContainBtn = document.getElementById('fit-contain-btn')
const imageFitCoverBtn = document.getElementById('fit-cover-btn')
const resetFit = document.getElementById('reset-fit-btn')
const scaleCanvasToImageBtn = document.getElementById('scale-canvas-btn')

const canvasResolutionNode = document.getElementById('canvas-resolution')
const montageAreaResolutionNode = document.getElementById('montage-area-resolution')
const canvasDisplaySizeNode = document.getElementById('canvas-display-size')
const currentObjectDataNode = document.getElementById('current-object-data')
const canvasZoomNode = document.getElementById('canvas-zoom')

const addShapeBtn = document.getElementById('add-shape-btn')
const shapePickerMenu = document.getElementById('shape-picker-menu')
const shapePresetButtons = Array.from(document.querySelectorAll('[data-shape-preset]'))
const replaceShapeBtn = document.getElementById('replace-shape-btn')
const replaceShapeMenu = document.getElementById('replace-shape-menu')
const replaceShapePresetButtons = Array.from(document.querySelectorAll('[data-replace-shape-preset]'))
const shapeFillInput = document.getElementById('shape-fill-color')
const shapeFillPalette = document.getElementById('shape-fill-palette')
const shapeStrokeInput = document.getElementById('shape-stroke-color')
const shapeStrokePalette = document.getElementById('shape-stroke-palette')
const shapeStrokeWidthInput = document.getElementById('shape-stroke-width')
const shapeStrokeWidthValue = document.getElementById('shape-stroke-width-value')
const shapeOpacityInput = document.getElementById('shape-opacity')
const shapeOpacityValue = document.getElementById('shape-opacity-value')
const shapeRoundingInput = document.getElementById('shape-rounding')
const shapeRoundingValue = document.getElementById('shape-rounding-value')

const addTextBtn = document.getElementById('add-text-btn')
const textContentInput = document.getElementById('text-content')
const textFontFamilySelect = document.getElementById('text-font-family')
const textFontSizeInput = document.getElementById('text-font-size')
const textBoldBtn = document.getElementById('text-bold-btn')
const textItalicBtn = document.getElementById('text-italic-btn')
const textUnderlineBtn = document.getElementById('text-underline-btn')
const textUppercaseBtn = document.getElementById('text-uppercase-btn')
const textStrikeBtn = document.getElementById('text-strike-btn')
const textAlignToggle = document.getElementById('text-align-toggle')
const textColorInput = document.getElementById('text-color')
const textColorPalette = document.getElementById('text-color-palette')
const textStrokeColorInput = document.getElementById('text-stroke-color')
const textStrokePalette = document.getElementById('text-stroke-palette')
const textStrokeWidthInput = document.getElementById('text-stroke-width')
const textStrokeWidthValue = document.getElementById('text-stroke-width-value')
const textOpacityInput = document.getElementById('text-opacity')
const textOpacityValue = document.getElementById('text-opacity-value')
const textBackgroundEnabledCheckbox = document.getElementById('text-background-enabled')
const textBackgroundColorInput = document.getElementById('text-background-color')
const textBackgroundOpacityInput = document.getElementById('text-background-opacity')
const textBackgroundOpacityValue = document.getElementById('text-background-opacity-value')
const textPaddingTopInput = document.getElementById('text-padding-top')
const textPaddingRightInput = document.getElementById('text-padding-right')
const textPaddingBottomInput = document.getElementById('text-padding-bottom')
const textPaddingLeftInput = document.getElementById('text-padding-left')
const textRadiusTopLeftInput = document.getElementById('text-radius-top-left')
const textRadiusTopRightInput = document.getElementById('text-radius-top-right')
const textRadiusBottomRightInput = document.getElementById('text-radius-bottom-right')
const textRadiusBottomLeftInput = document.getElementById('text-radius-bottom-left')

const montageWidthInput = document.getElementById('montage-width-input')
const montageHeightInput = document.getElementById('montage-height-input')
const applyMontageResolutionBtn = document.getElementById('apply-montage-resolution-btn')

const serializeTemplateBtn = document.getElementById('serialize-template-btn')
const applyTemplateBtn = document.getElementById('apply-template-btn')
const templateJsonInput = document.getElementById('template-json-input')
const serializeTemplateWithBackgroundCheckbox = document.getElementById('serialize-with-background')
const loadActiveObjectBtn = document.getElementById('load-active-object-btn')
const activeObjectJsonInput = document.getElementById('active-object-json')
const saveActiveObjectBtn = document.getElementById('save-active-object-btn')

const undoBtn = document.getElementById('undo-btn')
const redoBtn = document.getElementById('redo-btn')

const backgroundTypeSelect = document.getElementById('background-type')
const colorBackgroundControls = document.getElementById('color-background-controls')
const gradientBackgroundControls = document.getElementById('gradient-background-controls')
const imageBackgroundControls = document.getElementById('image-background-controls')
const backgroundColorInput = document.getElementById('background-color')
const setColorBackgroundBtn = document.getElementById('set-color-background-btn')
const gradientTypeSelect = document.getElementById('gradient-type')
const linearGradientControls = document.getElementById('linear-gradient-controls')
const radialGradientControls = document.getElementById('radial-gradient-controls')
const gradientStopsContainer = document.getElementById('gradient-stops-container')
const addGradientStopBtn = document.getElementById('add-gradient-stop-btn')
const gradientAngleInput = document.getElementById('gradient-angle')
const gradientAngleValue = document.getElementById('gradient-angle-value')
const gradientCenterXInput = document.getElementById('gradient-center-x')
const gradientCenterXValue = document.getElementById('gradient-center-x-value')
const gradientCenterYInput = document.getElementById('gradient-center-y')
const gradientCenterYValue = document.getElementById('gradient-center-y-value')
const gradientRadiusInput = document.getElementById('gradient-radius')
const gradientRadiusValue = document.getElementById('gradient-radius-value')
const setGradientBackgroundBtn = document.getElementById('set-gradient-background-btn')
const backgroundImageInput = document.getElementById('background-image-input')
const setImageBackgroundBtn = document.getElementById('set-image-background-btn')
const removeBackgroundBtn = document.getElementById('remove-background-btn')

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

export const canvasInfoControls = {
  canvasResolutionNode,
  montageAreaResolutionNode,
  canvasDisplaySizeNode,
  currentObjectDataNode,
  canvasZoomNode
}

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

export const montageControls = {
  montageWidthInput,
  montageHeightInput,
  applyMontageResolutionBtn
}

export const serializationControls = {
  serializeTemplateBtn,
  applyTemplateBtn,
  templateJsonInput,
  serializeTemplateWithBackgroundCheckbox,
  loadActiveObjectBtn,
  activeObjectJsonInput,
  saveActiveObjectBtn
}

export const historyControls = {
  undoBtn,
  redoBtn
}

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
