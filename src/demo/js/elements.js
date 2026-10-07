/** Button that opens the system image picker for importing images onto the canvas. */
const chooseImageBtn = document.getElementById('choose-images-btn')
/** Button that saves the current editor result to a file. */
const saveCanvasBtn = document.getElementById('save-canvas')
/** Select for the exported file format. */
const exportFormatSelect = document.getElementById('export-format-select')
/** Input for selecting one or more image files. */
const fileInput = document.getElementById('file-input')
/** Button that removes all objects from the canvas. */
const clearBtn = document.getElementById('clear-btn')
/** Button that brings the active object to the front. */
const bringToFrontBtn = document.getElementById('bring-to-front-btn')
/** Button that moves the active object forward one layer. */
const bringForwardBtn = document.getElementById('bring-object-forward')
/** Button that sends the active object to the back. */
const sendToBackBtn = document.getElementById('send-to-back-btn')
/** Button that moves the active object backward one layer. */
const sendBackwardsBtn = document.getElementById('send-object-backwards')
/** Button that copies the active object to the editor clipboard. */
const copyBtn = document.getElementById('copy-btn')
/** Button that pastes an object from the editor's internal clipboard. */
const pasteBtn = document.getElementById('paste-btn')
/** Button that rotates the active object 90 degrees clockwise. */
const rotateRightBtn = document.getElementById('rotate-plus-90-btn')
/** Button that rotates the active object 90 degrees counterclockwise. */
const rotateLeftBtn = document.getElementById('rotate-minus-90-btn')
/** Button that flips the active object horizontally. */
const flipXBtn = document.getElementById('flip-x-btn')
/** Button that flips the active object vertically. */
const flipYBtn = document.getElementById('flip-y-btn')
/** Button that selects all objects on the canvas. */
const selectAllBtn = document.getElementById('select-all-btn')
/** Button that deletes the selected object or group of objects. */
const deleteSelectedBtn = document.getElementById('delete-selected-btn')
/** Button that groups multiple selected objects. */
const groupBtn = document.getElementById('group-btn')
/** Button that ungroups the active object group. */
const ungroupBtn = document.getElementById('ungroup-btn')
/** Button that zooms in on the editor viewport. */
const zoomInBtn = document.getElementById('zoom-in-btn')
/** Button that zooms out of the editor viewport. */
const zoomOutBtn = document.getElementById('zoom-out-btn')
/** Button that resets the current zoom to its base state. */
const resetZoomBtn = document.getElementById('reset-zoom-btn')
/** Button that sets the default scale for the editor content. */
const setDefaultScaleBtn = document.getElementById('set-default-scale-btn')
/** Button that fits the active image inside the artboard using contain. */
const imageFitContainBtn = document.getElementById('fit-contain-btn')
/** Button that fills the artboard with the active image using cover. */
const imageFitCoverBtn = document.getElementById('fit-cover-btn')
/** Button that resets the active object's transforms to their defaults. */
const resetFit = document.getElementById('reset-fit-btn')
/** Button that adjusts the artboard size to the image dimensions. */
const scaleCanvasToImageBtn = document.getElementById('scale-canvas-btn')
/** Select for the crop frame aspect ratio. */
const cropRatioSelect = document.getElementById('crop-ratio-select')
/** Crop frame width input. */
const cropWidthInput = document.getElementById('crop-width-input')
/** Crop frame height input. */
const cropHeightInput = document.getElementById('crop-height-input')
/** Checkbox allowing the crop frame to extend beyond the source bounds. */
const cropAllowOverflowCheckbox = document.getElementById('crop-allow-overflow-checkbox')
/** Checkbox for displaying the crop frame grid. */
const cropShowGridCheckbox = document.getElementById('crop-show-grid-checkbox')
/** Checkbox for dimming the area outside the crop frame. */
const cropShowDimmedAreaCheckbox = document.getElementById('crop-show-dimmed-area-checkbox')
/** Checkbox for preserving the current aspect ratio when resizing the crop frame. */
const cropPreserveAspectRatioCheckbox = document.getElementById('crop-preserve-aspect-ratio-checkbox')
/** Checkbox for canceling crop mode when the selection is cleared. */
const cropCancelOnSelectionClearCheckbox = document.getElementById('crop-cancel-on-selection-clear-checkbox')
/** Button that enters crop mode for the artboard. */
const startCanvasCropBtn = document.getElementById('start-canvas-crop-btn')
/** Button that enters crop mode for the selected image. */
const startImageCropBtn = document.getElementById('start-image-crop-btn')
/** Button that applies the active crop mode. */
const applyCropBtn = document.getElementById('apply-crop-btn')
/** Button that exits crop mode without applying changes. */
const cancelCropBtn = document.getElementById('cancel-crop-btn')

/** Element displaying the current internal canvas resolution. */
const canvasResolutionNode = document.getElementById('canvas-resolution')
/** Element displaying the artboard resolution. */
const montageAreaResolutionNode = document.getElementById('montage-area-resolution')
/** Element displaying the visual canvas size in the DOM. */
const canvasDisplaySizeNode = document.getElementById('canvas-display-size')
/** Element displaying data for the currently selected object. */
const currentObjectDataNode = document.getElementById('current-object-data')
/** Element displaying the current editor zoom. */
const canvasZoomNode = document.getElementById('canvas-zoom')

/** Button that opens the preset menu for a new shape. */
const addShapeBtn = document.getElementById('add-shape-btn')
/** Popup menu with available presets for adding shapes. */
const shapePickerMenu = document.getElementById('shape-picker-menu')
/** Collection of shape preset buttons for creating a new shape object. */
const shapePresetButtons = Array.from(document.querySelectorAll('[data-shape-preset]'))
/** Button that opens the preset replacement menu for the active shape. */
const replaceShapeBtn = document.getElementById('replace-shape-btn')
/** Popup menu with presets for replacing the active shape. */
const replaceShapeMenu = document.getElementById('replace-shape-menu')
/** Collection of buttons for selecting a new preset for the active shape. */
const replaceShapePresetButtons = Array.from(document.querySelectorAll('[data-replace-shape-preset]'))
/** Input for selecting the active shape's fill color. */
const shapeFillInput = document.getElementById('shape-fill-color')
/** Checkbox for auto expand mode for text inside a shape. */
const shapeTextAutoExpandCheckbox = document.getElementById('shape-text-auto-expand')
/** Container for the shape fill color preset palette. */
const shapeFillPalette = document.getElementById('shape-fill-palette')
/** Input for selecting the active shape's stroke color. */
const shapeStrokeInput = document.getElementById('shape-stroke-color')
/** Container for the shape stroke color preset palette. */
const shapeStrokePalette = document.getElementById('shape-stroke-palette')
/** Input for selecting the shape's stroke width. */
const shapeStrokeWidthInput = document.getElementById('shape-stroke-width')
/** Element displaying the current shape stroke width. */
const shapeStrokeWidthValue = document.getElementById('shape-stroke-width-value')
/** Input for selecting the active shape's opacity. */
const shapeOpacityInput = document.getElementById('shape-opacity')
/** Element displaying the current shape opacity as a percentage. */
const shapeOpacityValue = document.getElementById('shape-opacity-value')
/** Checkbox for applying shape opacity to the text inside it. */
const shapeOpacityApplyToTextCheckbox = document.getElementById('shape-opacity-apply-to-text')
/** Collection of buttons for horizontally aligning content inside a shape. */
const shapeAlignHorizontalButtons = Array.from(document.querySelectorAll('[data-shape-align-axis="horizontal"]'))
/** Collection of buttons for vertically aligning content inside a shape. */
const shapeAlignVerticalButtons = Array.from(document.querySelectorAll('[data-shape-align-axis="vertical"]'))
/** Top padding input for text inside a shape. */
const shapePaddingTopInput = document.getElementById('shape-padding-top')
/** Right padding input for text inside a shape. */
const shapePaddingRightInput = document.getElementById('shape-padding-right')
/** Bottom padding input for text inside a shape. */
const shapePaddingBottomInput = document.getElementById('shape-padding-bottom')
/** Left padding input for text inside a shape. */
const shapePaddingLeftInput = document.getElementById('shape-padding-left')
/** Input for selecting the shape's corner-rounding amount. */
const shapeRoundingInput = document.getElementById('shape-rounding')
/** Element displaying the current shape corner-rounding amount. */
const shapeRoundingValue = document.getElementById('shape-rounding-value')

/** Button that adds a new text object to the canvas. */
const addTextBtn = document.getElementById('add-text-btn')
/** Text content input for a new or active text object. */
const textContentInput = document.getElementById('text-content')
/** Select for the text font family. */
const textFontFamilySelect = document.getElementById('text-font-family')
/** Input for selecting the text font size. */
const textFontSizeInput = document.getElementById('text-font-size')
/** Checkbox for auto expand mode for a standalone text object. */
const textAutoExpandCheckbox = document.getElementById('text-auto-expand')
/** Button that toggles bold text. */
const textBoldBtn = document.getElementById('text-bold-btn')
/** Button that toggles italic text. */
const textItalicBtn = document.getElementById('text-italic-btn')
/** Button that toggles underlined text. */
const textUnderlineBtn = document.getElementById('text-underline-btn')
/** Button that toggles uppercase text mode. */
const textUppercaseBtn = document.getElementById('text-uppercase-btn')
/** Button that toggles strikethrough text. */
const textStrikeBtn = document.getElementById('text-strike-btn')
/** Button that cycles through text alignment options. */
const textAlignToggle = document.getElementById('text-align-toggle')
/** Input for selecting the text fill color. */
const textColorInput = document.getElementById('text-color')
/** Container for the text color preset palette. */
const textColorPalette = document.getElementById('text-color-palette')
/** Input for selecting the text stroke color. */
const textStrokeColorInput = document.getElementById('text-stroke-color')
/** Container for the text stroke color preset palette. */
const textStrokePalette = document.getElementById('text-stroke-palette')
/** Input for selecting the text stroke width. */
const textStrokeWidthInput = document.getElementById('text-stroke-width')
/** Element displaying the current text stroke width. */
const textStrokeWidthValue = document.getElementById('text-stroke-width-value')
/** Input for selecting the text object's opacity. */
const textOpacityInput = document.getElementById('text-opacity')
/** Element displaying the current text opacity as a percentage. */
const textOpacityValue = document.getElementById('text-opacity-value')
/** Checkbox for enabling the text object's background. */
const textBackgroundEnabledCheckbox = document.getElementById('text-background-enabled')
/** Input for selecting the text background color. */
const textBackgroundColorInput = document.getElementById('text-background-color')
/** Input for selecting the text background opacity. */
const textBackgroundOpacityInput = document.getElementById('text-background-opacity')
/** Element displaying the text background opacity. */
const textBackgroundOpacityValue = document.getElementById('text-background-opacity-value')
/** Top padding input for the text background. */
const textPaddingTopInput = document.getElementById('text-padding-top')
/** Right padding input for the text background. */
const textPaddingRightInput = document.getElementById('text-padding-right')
/** Bottom padding input for the text background. */
const textPaddingBottomInput = document.getElementById('text-padding-bottom')
/** Left padding input for the text background. */
const textPaddingLeftInput = document.getElementById('text-padding-left')
/** Top-left corner radius input for the text background. */
const textRadiusTopLeftInput = document.getElementById('text-radius-top-left')
/** Top-right corner radius input for the text background. */
const textRadiusTopRightInput = document.getElementById('text-radius-top-right')
/** Bottom-right corner radius input for the text background. */
const textRadiusBottomRightInput = document.getElementById('text-radius-bottom-right')
/** Bottom-left corner radius input for the text background. */
const textRadiusBottomLeftInput = document.getElementById('text-radius-bottom-left')

/** Artboard width input for manually changing the resolution. */
const montageWidthInput = document.getElementById('montage-width-input')
/** Artboard height input for manually changing the resolution. */
const montageHeightInput = document.getElementById('montage-height-input')
/** Button that applies the entered artboard resolution. */
const applyMontageResolutionBtn = document.getElementById('apply-montage-resolution-btn')

/** Button that serializes the selection into template JSON. */
const serializeTemplateBtn = document.getElementById('serialize-template-btn')
/** Button that applies template JSON to the editor. */
const applyTemplateBtn = document.getElementById('apply-template-btn')
/** Textarea for reading and editing template JSON. */
const templateJsonInput = document.getElementById('template-json-input')
/** Checkbox for including the background in the serialized template. */
const serializeTemplateWithBackgroundCheckbox = document.getElementById('serialize-with-background')
/** Button that loads the active object's JSON into the textarea. */
const loadActiveObjectBtn = document.getElementById('load-active-object-btn')
/** Textarea for manually editing the active object's JSON. */
const activeObjectJsonInput = document.getElementById('active-object-json')
/** Button that applies the edited JSON to the active object. */
const saveActiveObjectBtn = document.getElementById('save-active-object-btn')

/** Button that undoes the latest action in the editor history. */
const undoBtn = document.getElementById('undo-btn')
/** Button that redoes an undone action in the editor history. */
const redoBtn = document.getElementById('redo-btn')
/** Button that blocks interaction with the editor. */
const blockEditorBtn = document.getElementById('block-editor-btn')
/** Button that blocks editor interaction and shows the AI overlay. */
const blockEditorWithAiOverlayBtn = document.getElementById('block-editor-with-ai-overlay-btn')
/** Button that unblocks interaction with the editor. */
const unblockEditorBtn = document.getElementById('unblock-editor-btn')
/** Element displaying the current InteractionBlocker state. */
const interactionBlockerStateNode = document.getElementById('interaction-blocker-state')

/** Select for the editor background type. */
const backgroundTypeSelect = document.getElementById('background-type')
/** Container for solid-color background controls. */
const colorBackgroundControls = document.getElementById('color-background-controls')
/** Container for gradient background controls. */
const gradientBackgroundControls = document.getElementById('gradient-background-controls')
/** Container for background image controls. */
const imageBackgroundControls = document.getElementById('image-background-controls')
/** Input for selecting the solid background color. */
const backgroundColorInput = document.getElementById('background-color')
/** Button that applies a solid-color background. */
const setColorBackgroundBtn = document.getElementById('set-color-background-btn')
/** Select for the gradient type: linear or radial. */
const gradientTypeSelect = document.getElementById('gradient-type')
/** Container for linear gradient controls. */
const linearGradientControls = document.getElementById('linear-gradient-controls')
/** Container for radial gradient controls. */
const radialGradientControls = document.getElementById('radial-gradient-controls')
/** Container for the gradient color stop list. */
const gradientStopsContainer = document.getElementById('gradient-stops-container')
/** Button that adds a new color stop to the gradient. */
const addGradientStopBtn = document.getElementById('add-gradient-stop-btn')
/** Linear gradient angle input. */
const gradientAngleInput = document.getElementById('gradient-angle')
/** Element displaying the current linear gradient angle. */
const gradientAngleValue = document.getElementById('gradient-angle-value')
/** Input for the radial gradient center's X coordinate. */
const gradientCenterXInput = document.getElementById('gradient-center-x')
/** Element displaying the radial gradient center's current X coordinate. */
const gradientCenterXValue = document.getElementById('gradient-center-x-value')
/** Input for the radial gradient center's Y coordinate. */
const gradientCenterYInput = document.getElementById('gradient-center-y')
/** Element displaying the radial gradient center's current Y coordinate. */
const gradientCenterYValue = document.getElementById('gradient-center-y-value')
/** Radial gradient radius input. */
const gradientRadiusInput = document.getElementById('gradient-radius')
/** Element displaying the current radial gradient radius. */
const gradientRadiusValue = document.getElementById('gradient-radius-value')
/** Button that applies the gradient background settings. */
const setGradientBackgroundBtn = document.getElementById('set-gradient-background-btn')
/** File input for the background image. */
const backgroundImageInput = document.getElementById('background-image-input')
/** Button that applies the selected image as the background. */
const setImageBackgroundBtn = document.getElementById('set-image-background-btn')
/** Button that removes the current editor background. */
const removeBackgroundBtn = document.getElementById('remove-background-btn')

/** Group of main editor toolbar controls. */
export const toolbarControls = {
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
}

/** Group of crop mode controls. */
export const cropControls = {
  applyCropBtn,
  cancelCropBtn,
  cropAllowOverflowCheckbox,
  cropCancelOnSelectionClearCheckbox,
  cropHeightInput,
  cropPreserveAspectRatioCheckbox,
  cropRatioSelect,
  cropShowDimmedAreaCheckbox,
  cropShowGridCheckbox,
  cropWidthInput,
  startCanvasCropBtn,
  startImageCropBtn
}

/** Group of informational elements showing internal canvas state. */
export const canvasInfoControls = {
  canvasResolutionNode,
  montageAreaResolutionNode,
  canvasDisplaySizeNode,
  currentObjectDataNode,
  canvasZoomNode
}

/** Group of shape object controls. */
export const shapeControls = {
  addShapeBtn,
  shapePickerMenu,
  shapePresetButtons,
  replaceShapeBtn,
  replaceShapeMenu,
  replaceShapePresetButtons,
  shapeTextAutoExpandCheckbox,
  shapeFillInput,
  shapeFillPalette,
  shapeStrokeInput,
  shapeStrokePalette,
  shapeStrokeWidthInput,
  shapeStrokeWidthValue,
  shapeOpacityInput,
  shapeOpacityValue,
  shapeOpacityApplyToTextCheckbox,
  shapeAlignHorizontalButtons,
  shapeAlignVerticalButtons,
  shapePaddingTopInput,
  shapePaddingRightInput,
  shapePaddingBottomInput,
  shapePaddingLeftInput,
  shapeRoundingInput,
  shapeRoundingValue
}

/** Group of text object controls. */
export const textControls = {
  addTextBtn,
  textContentInput,
  textFontFamilySelect,
  textFontSizeInput,
  textAutoExpandCheckbox,
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

/** Group of artboard resolution controls. */
export const montageControls = {
  montageWidthInput,
  montageHeightInput,
  applyMontageResolutionBtn
}

/** Group of template and active-object JSON serialization controls. */
export const serializationControls = {
  serializeTemplateBtn,
  applyTemplateBtn,
  templateJsonInput,
  serializeTemplateWithBackgroundCheckbox,
  loadActiveObjectBtn,
  activeObjectJsonInput,
  saveActiveObjectBtn
}

/** Group of editor history undo/redo controls. */
export const historyControls = {
  undoBtn,
  redoBtn
}

/** Group of controls for blocking interaction with the editor. */
export const interactionControls = {
  blockEditorBtn,
  blockEditorWithAiOverlayBtn,
  unblockEditorBtn,
  interactionBlockerStateNode
}

/** Group of editor background controls. */
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
