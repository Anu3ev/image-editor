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
  // Текстовые контролы
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
  textRadiusBottomLeftInput,
  montageWidthInput,
  montageHeightInput,
  applyMontageResolutionBtn,
  serializeTemplateBtn,
  applyTemplateBtn,
  templateJsonInput,
  serializeTemplateWithBackgroundCheckbox,
  loadActiveObjectBtn,
  activeObjectJsonInput,
  saveActiveObjectBtn,
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
  gradientStopsContainer,
  addGradientStopBtn,
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

const OBJECT_SERIALIZATION_PROPS = [
  'selectable',
  'evented',
  'id',
  'backgroundId',
  'customData',
  'backgroundType',
  'format',
  'width',
  'height',
  'locked',
  'lockMovementX',
  'lockMovementY',
  'lockRotation',
  'lockScalingX',
  'lockScalingY',
  'lockSkewingX',
  'lockSkewingY',
  'styles',
  'textCaseRaw',
  'uppercase',
  'linethrough',
  'underline',
  'fontStyle',
  'fontWeight',
  'backgroundOpacity',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'radiusTopLeft',
  'radiusTopRight',
  'radiusBottomRight',
  'radiusBottomLeft'
]

export default (editorInstance) => {
  const TEXT_FILL_PALETTE = [
    '#000000',
    '#ffffff',
    '#f87171',
    '#fb923c',
    '#facc15',
    '#34d399',
    '#38bdf8',
    '#60a5fa',
    '#a855f7',
    '#f472b6'
  ]
  const TEXT_STROKE_PALETTE = [
    '#000000',
    '#ffffff',
    '#ef4444',
    '#f97316',
    '#facc15',
    '#10b981',
    '#0ea5e9',
    '#2563eb',
    '#7c3aed',
    '#111827'
  ]
  const ALIGN_SEQUENCE = ['left', 'center', 'right', 'justify']

  let isSyncingControls = false
  let textColorButtons = []
  let textStrokeButtons = []
  const getStrokeWidthFromInput = () => {
    const rawWidth = Number(textStrokeWidthInput.value)
    return Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
  }

  const parseNumberInput = ({
    input,
    fallback = 0,
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER
  }) => {
    const raw = Number(input.value)
    const safeValue = Number.isNaN(raw) ? fallback : raw
    const clamped = Math.min(Math.max(safeValue, min), max)
    input.value = clamped
    return clamped
  }

  const setBackgroundControlsEnabled = (enabled) => {
    textBackgroundColorInput.disabled = !enabled
    textBackgroundOpacityInput.disabled = !enabled
    textPaddingTopInput.disabled = !enabled
    textPaddingRightInput.disabled = !enabled
    textPaddingBottomInput.disabled = !enabled
    textPaddingLeftInput.disabled = !enabled
    textRadiusTopLeftInput.disabled = !enabled
    textRadiusTopRightInput.disabled = !enabled
    textRadiusBottomRightInput.disabled = !enabled
    textRadiusBottomLeftInput.disabled = !enabled
  }

  const updateMontageInputs = () => {
    const { montageArea } = editorInstance
    if (!montageArea) return

    const width = Math.round(montageArea.getScaledWidth?.() || montageArea.width || 0)
    const height = Math.round(montageArea.getScaledHeight?.() || montageArea.height || 0)

    if (montageWidthInput) montageWidthInput.value = String(width)
    if (montageHeightInput) montageHeightInput.value = String(height)
  }

  updateMontageInputs()

  applyMontageResolutionBtn?.addEventListener('click', () => {
    const width = Number(montageWidthInput?.value)
    const height = Number(montageHeightInput?.value)

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      console.warn('Invalid montage size input')
      return
    }

    editorInstance.canvasManager.setResolutionWidth(width)
    editorInstance.canvasManager.setResolutionHeight(height)
    editorInstance.backgroundManager.refresh()
    editorInstance.canvasManager.updateCanvas()
    editorInstance.zoomManager.calculateAndApplyDefaultZoom()
  })

  editorInstance.canvas.on('editor:resolution-width-changed', updateMontageInputs)
  editorInstance.canvas.on('editor:resolution-height-changed', updateMontageInputs)

  const setStrokeControlsEnabled = (enabled) => {
    textStrokeColorInput.disabled = !enabled
    textStrokeButtons.forEach((btn) => {
      btn.disabled = !enabled
    })
  }

  const setStrokeWidthUI = (width) => {
    const normalized = Math.max(0, Math.round(width))
    textStrokeWidthInput.value = normalized
    textStrokeWidthValue.textContent = normalized > 0 ? `${normalized}px` : 'Off'
    setStrokeControlsEnabled(normalized > 0)
  }

  const ACTIVE_OBJECT_JSON_SPACES = 2

  /**
   * Возвращает активный объект, если выделен один объект.
   */
  const getSingleActiveObject = () => {
    const activeObject = editorInstance.canvas.getActiveObject()
    if (!activeObject) return null

    const { type } = activeObject
    if (type === 'activeSelection') return null

    return activeObject
  }

  /**
   * Обновляет textarea с JSON активного объекта.
   */
  const syncActiveObjectJson = () => {
    if (!activeObjectJsonInput) return

    const activeObject = getSingleActiveObject()
    if (!activeObject) {
      activeObjectJsonInput.value = ''
      return
    }

    try {
      const serialized = typeof activeObject.toDatalessObject === 'function'
        ? activeObject.toDatalessObject([...OBJECT_SERIALIZATION_PROPS])
        : activeObject.toObject?.()
      const json = serialized ? JSON.stringify(serialized, null, ACTIVE_OBJECT_JSON_SPACES) : ''
      activeObjectJsonInput.value = json
    } catch (error) {
      console.warn('Failed to serialize active object', error)
      activeObjectJsonInput.value = ''
    }
  }

  /**
   * Применяет изменения из textarea к активному объекту.
   */
  const applyActiveObjectJson = async() => {
    if (!activeObjectJsonInput) return

    const activeObject = getSingleActiveObject()
    if (!activeObject) {
      console.warn('No active object to update')
      return
    }

    const rawValue = activeObjectJsonInput.value.trim()
    if (!rawValue) {
      console.warn('Active object JSON is empty')
      return
    }

    try {
      const parsed = JSON.parse(rawValue)
      if (parsed && typeof parsed === 'object') {
        delete parsed.type
      }

      const enlivenedProps = parsed && typeof parsed === 'object'
        ? await editorInstance.templateManager.enlivenObjectEnlivables(parsed)
        : parsed

      activeObject.set(enlivenedProps)
      activeObject.setCoords()
      editorInstance.canvas.requestRenderAll()
      editorInstance.historyManager.saveState()
      syncActiveObjectJson()
    } catch (error) {
      console.error('Failed to apply active object JSON', error)
    }
  }

  const renderPalette = (container, colors) => {
    container.innerHTML = ''

    return colors.map((color) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'palette-swatch'
      btn.dataset.color = color
      btn.style.backgroundColor = color
      btn.title = color
      container.appendChild(btn)

      return btn
    })
  }

  const normalizeColor = (color, fallback = '#000000') => {
    if (!color || typeof color !== 'string') return fallback

    const trimmed = color.trim()
    if (trimmed.startsWith('#')) {
      if (trimmed.length === 4) {
        const r = trimmed[1]
        const g = trimmed[2]
        const b = trimmed[3]
        return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
      }
      if (trimmed.length === 7) {
        return trimmed.toUpperCase()
      }
      return fallback
    }

    const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch
      const toHex = (value) => Number(value).toString(16).padStart(2, '0').toUpperCase()
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    }

    return fallback
  }

  const normalizeColorOptional = (color) => {
    const normalized = normalizeColor(color, null)
    return typeof normalized === 'string' ? normalized : undefined
  }

  const setPaletteSelection = (buttons, color) => {
    const normalized = normalizeColor(color ?? '', '')
    buttons.forEach((btn) => {
      const btnColor = normalizeColor(btn.dataset.color, '')
      btn.classList.toggle('active', normalized && btnColor.toLowerCase() === normalized.toLowerCase())
    })
  }

  const setToggleActive = (button, isActive) => {
    button.classList.toggle('active', isActive)
    button.classList.toggle('btn-secondary', isActive)
    button.classList.toggle('btn-outline-secondary', !isActive)
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
  }

  const isButtonActive = (button) => button.classList.contains('active')

  const updateAlignButtonDisplay = (align) => {
    const normalized = ALIGN_SEQUENCE.includes(align) ? align : 'left'
    textAlignToggle.dataset.align = normalized
    const label = `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
    textAlignToggle.textContent = `Align: ${label}`
  }

  const ensureFontOption = (family) => {
    if (!family) return
    const trimmed = family.trim()
    if (!trimmed) return

    const exists = Array.from(textFontFamilySelect.options).some((option) => option.value === trimmed)
    if (!exists) {
      const option = document.createElement('option')
      option.value = trimmed
      option.textContent = trimmed
      textFontFamilySelect.appendChild(option)
    }
  }

  const isTextboxObject = (object) => Boolean(object)
    && (object.type === 'textbox' || object.type === 'background-textbox')

  const getActiveText = () => {
    const object = editorInstance.canvas.getActiveObject()
    if (!isTextboxObject(object)) return null
    return object
  }

  const isBoldValue = (value) => {
    if (value === 'bold') return true
    if (typeof value === 'number') return value >= 600
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) return numeric >= 600
    return false
  }

  const getTextboxSelectionInfo = (textbox) => {
    if (!textbox?.isEditing) return null
    const selectionStart = textbox.selectionStart ?? 0
    const selectionEnd = textbox.selectionEnd ?? selectionStart
    if (selectionStart === selectionEnd) return null
    const range = {
      start: Math.min(selectionStart, selectionEnd),
      end: Math.max(selectionStart, selectionEnd)
    }
    const styles = textbox.getSelectionStyles(range.start, range.end, true) ?? []
    if (!styles.length) return null
    return { range, styles }
  }

  const getSelectionUniformValue = (selectionInfo, extractor) => {
    if (!selectionInfo || !selectionInfo.styles.length) return undefined
    const firstValue = extractor(selectionInfo.styles[0])
    if (typeof firstValue === 'undefined') return undefined
    for (let i = 1; i < selectionInfo.styles.length; i += 1) {
      const nextValue = extractor(selectionInfo.styles[i])
      if (typeof nextValue === 'undefined' || nextValue !== firstValue) {
        return undefined
      }
    }
    return firstValue
  }

  const syncTextControls = (textbox) => {
    if (!textbox) return

    isSyncingControls = true
    const selectionInfo = getTextboxSelectionInfo(textbox)

    const fallbackText = textbox.text ?? ''
    const textValue = typeof textbox.textCaseRaw === 'string'
      ? textbox.textCaseRaw
      : fallbackText
    textContentInput.value = textValue

    const selectionFontFamily = getSelectionUniformValue(selectionInfo, (style) => (
      typeof style.fontFamily === 'string' ? style.fontFamily : undefined
    ))
    const fontFamily = selectionFontFamily ?? textbox.fontFamily ?? ''
    if (fontFamily) {
      ensureFontOption(fontFamily)
      textFontFamilySelect.value = fontFamily
    }

    const selectionFontSize = getSelectionUniformValue(selectionInfo, (style) => {
      const size = typeof style.fontSize === 'number' ? style.fontSize : undefined
      return typeof size === 'number' ? Math.max(1, Math.round(size)) : undefined
    })
    const fallbackFontSize = Number(textFontSizeInput.value) || 48
    const baseFontSize = typeof textbox.fontSize === 'number'
      ? Math.max(1, Math.round(textbox.fontSize))
      : fallbackFontSize
    const fontSize = selectionFontSize ?? baseFontSize
    textFontSizeInput.value = fontSize

    const selectionBold = getSelectionUniformValue(selectionInfo, (style) => isBoldValue(style.fontWeight))
    const boldActive = typeof selectionBold === 'boolean' ? selectionBold : isBoldValue(textbox.fontWeight)
    setToggleActive(textBoldBtn, boldActive)
    const selectionItalic = getSelectionUniformValue(selectionInfo, (style) => style.fontStyle === 'italic')
    const italicActive = typeof selectionItalic === 'boolean' ? selectionItalic : textbox.fontStyle === 'italic'
    setToggleActive(textItalicBtn, italicActive)
    const selectionUnderline = getSelectionUniformValue(selectionInfo, (style) => Boolean(style.underline))
    const underlineActive = typeof selectionUnderline === 'boolean' ? selectionUnderline : Boolean(textbox.underline)
    setToggleActive(textUnderlineBtn, underlineActive)
    setToggleActive(textUppercaseBtn, Boolean(textbox.uppercase))
    const selectionStrike = getSelectionUniformValue(selectionInfo, (style) => Boolean(style.linethrough))
    const strikeActive = typeof selectionStrike === 'boolean' ? selectionStrike : Boolean(textbox.linethrough)
    setToggleActive(textStrikeBtn, strikeActive)

    const alignValue = textbox.textAlign ?? textAlignToggle.dataset.align ?? 'left'
    updateAlignButtonDisplay(alignValue)

    const selectionFillColor = getSelectionUniformValue(selectionInfo, (style) => normalizeColorOptional(style.fill))
    let fillColor = selectionFillColor
    if (!fillColor) {
      fillColor = typeof textbox.fill === 'string'
        ? normalizeColor(textbox.fill, textColorInput.value)
        : textColorInput.value
    }
    textColorInput.value = fillColor
    setPaletteSelection(textColorButtons, fillColor)

    const selectionStrokeWidth = getSelectionUniformValue(selectionInfo, (style) => {
      const width = typeof style.strokeWidth === 'number' ? style.strokeWidth : undefined
      return typeof width === 'number' ? Math.max(0, Math.round(width)) : undefined
    })
    const selectionStrokeColor = getSelectionUniformValue(
      selectionInfo,
      (style) => normalizeColorOptional(style.stroke)
    )
    const fallbackStrokeWidth = Number(textStrokeWidthInput.value) || 0
    const baseStrokeWidth = typeof textbox.strokeWidth === 'number'
      ? Math.max(0, Math.round(textbox.strokeWidth))
      : fallbackStrokeWidth
    const strokeWidth = selectionStrokeWidth ?? baseStrokeWidth
    setStrokeWidthUI(strokeWidth)

    let strokeColor = selectionStrokeColor
    if (!strokeColor) {
      strokeColor = typeof textbox.stroke === 'string'
        ? normalizeColor(textbox.stroke, textStrokeColorInput.value)
        : textStrokeColorInput.value
    }
    textStrokeColorInput.value = strokeColor
    setPaletteSelection(textStrokeButtons, strokeColor)

    const opacitySource = textbox.opacity ?? Number(textOpacityInput.value) / 100
    const opacity = Math.max(0, Math.min(100, Math.round(opacitySource * 100)))
    textOpacityInput.value = opacity
    textOpacityValue.textContent = `${opacity}%`

    const {
      backgroundColor,
      backgroundOpacity,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      radiusTopLeft,
      radiusTopRight,
      radiusBottomRight,
      radiusBottomLeft
    } = textbox
    const isBackgroundEnabled = Boolean(backgroundColor)
    textBackgroundEnabledCheckbox.checked = isBackgroundEnabled
    setBackgroundControlsEnabled(isBackgroundEnabled)

    const resolvedBackgroundColor = typeof backgroundColor === 'string' && backgroundColor.length
      ? backgroundColor
      : textBackgroundColorInput.value
    textBackgroundColorInput.value = resolvedBackgroundColor

    const backgroundOpacityPercent = Math.max(
      0,
      Math.min(100, Math.round((backgroundOpacity ?? (Number(textBackgroundOpacityInput.value) / 100)) * 100))
    )
    textBackgroundOpacityInput.value = backgroundOpacityPercent
    textBackgroundOpacityValue.textContent = `${backgroundOpacityPercent}%`

    const paddingTopValue = typeof paddingTop === 'number'
      ? Math.max(0, Math.round(paddingTop))
      : Number(textPaddingTopInput.value) || 0
    const paddingRightValue = typeof paddingRight === 'number'
      ? Math.max(0, Math.round(paddingRight))
      : Number(textPaddingRightInput.value) || 0
    const paddingBottomValue = typeof paddingBottom === 'number'
      ? Math.max(0, Math.round(paddingBottom))
      : Number(textPaddingBottomInput.value) || 0
    const paddingLeftValue = typeof paddingLeft === 'number'
      ? Math.max(0, Math.round(paddingLeft))
      : Number(textPaddingLeftInput.value) || 0

    textPaddingTopInput.value = paddingTopValue
    textPaddingRightInput.value = paddingRightValue
    textPaddingBottomInput.value = paddingBottomValue
    textPaddingLeftInput.value = paddingLeftValue

    const radiusTopLeftValue = typeof radiusTopLeft === 'number'
      ? Math.max(0, Math.round(radiusTopLeft))
      : Number(textRadiusTopLeftInput.value) || 0
    const radiusTopRightValue = typeof radiusTopRight === 'number'
      ? Math.max(0, Math.round(radiusTopRight))
      : Number(textRadiusTopRightInput.value) || 0
    const radiusBottomRightValue = typeof radiusBottomRight === 'number'
      ? Math.max(0, Math.round(radiusBottomRight))
      : Number(textRadiusBottomRightInput.value) || 0
    const radiusBottomLeftValue = typeof radiusBottomLeft === 'number'
      ? Math.max(0, Math.round(radiusBottomLeft))
      : Number(textRadiusBottomLeftInput.value) || 0

    textRadiusTopLeftInput.value = radiusTopLeftValue
    textRadiusTopRightInput.value = radiusTopRightValue
    textRadiusBottomRightInput.value = radiusBottomRightValue
    textRadiusBottomLeftInput.value = radiusBottomLeftValue

    isSyncingControls = false
  }

  const applyTextStyle = (style, options = {}) => {
    if (isSyncingControls) return
    const target = getActiveText()
    if (!target) return

    const updated = editorInstance.textManager.updateText({ target, style, ...options })
    if (updated) {
      syncTextControls(updated)
    }
  }

  const initFontOptions = () => {
    const customFonts = (editorInstance.options.fonts ?? [])
      .map((font) => font.family)
      .filter((family) => typeof family === 'string' && family.trim().length > 0)
    textFontFamilySelect.innerHTML = ''
    customFonts.forEach((family) => ensureFontOption(family))

    if (textFontFamilySelect.options.length > 0) {
      textFontFamilySelect.value = textFontFamilySelect.options[0].value
    }
  }

  textColorButtons = renderPalette(textColorPalette, TEXT_FILL_PALETTE)
  textStrokeButtons = renderPalette(textStrokePalette, TEXT_STROKE_PALETTE)

  initFontOptions()
  updateAlignButtonDisplay(textAlignToggle.dataset.align ?? 'left')

  if (!textContentInput.value) {
    textContentInput.value = 'Новый текст'
  }

  setStrokeWidthUI(Number(textStrokeWidthInput.value) || 0)
  textOpacityValue.textContent = `${textOpacityInput.value}%`
  textBackgroundOpacityValue.textContent = `${textBackgroundOpacityInput.value}%`
  setBackgroundControlsEnabled(Boolean(textBackgroundEnabledCheckbox.checked))

  setPaletteSelection(textColorButtons, textColorInput.value)
  setPaletteSelection(textStrokeButtons, textStrokeColorInput.value)

  const toggleButtons = [textBoldBtn, textItalicBtn, textUnderlineBtn, textUppercaseBtn, textStrikeBtn]
  toggleButtons.forEach((btn) => {
    setToggleActive(btn, btn.classList.contains('active'))
  })

  textColorButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = normalizeColor(btn.dataset.color, textColorInput.value)
      textColorInput.value = color
      setPaletteSelection(textColorButtons, color)
      if (getActiveText()) {
        applyTextStyle({ color })
      }
    })
  })

  textStrokeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = normalizeColor(btn.dataset.color, textStrokeColorInput.value)
      textStrokeColorInput.value = color
      setPaletteSelection(textStrokeButtons, color)
      if (!getActiveText()) return
      const width = getStrokeWidthFromInput()
      const style = width > 0
        ? { strokeColor: color }
        : {}
      if (Object.keys(style).length > 0) {
        applyTextStyle(style)
      }
    })
  })

  const handleSelectionChange = (event) => {
    const eventTarget = event?.target
    const explicitTextbox = eventTarget && isTextboxObject(eventTarget) ? eventTarget : null
    const textObject = explicitTextbox ?? getActiveText()
    if (textObject) {
      syncTextControls(textObject)
    }
  }

  addTextBtn.addEventListener('click', () => {
    const textValue = textContentInput.value?.length ? textContentInput.value : 'Новый текст'
    const fontFamily = textFontFamilySelect.value || undefined
    const fontSizeInputValue = Number(textFontSizeInput.value)
    const normalizedFontSize = Number.isNaN(fontSizeInputValue) || fontSizeInputValue <= 0
      ? 48
      : Math.round(fontSizeInputValue)
    const fontSize = Math.max(1, normalizedFontSize)
    const strokeWidthInputValue = Number(textStrokeWidthInput.value)
    const strokeWidth = Math.max(0, Number.isNaN(strokeWidthInputValue) ? 0 : Math.round(strokeWidthInputValue))
    const opacityInputValue = Number(textOpacityInput.value)
    const opacityPercent = Number.isNaN(opacityInputValue) ? 100 : opacityInputValue
    const opacity = Math.max(0, Math.min(1, opacityPercent / 100))
    const backgroundEnabled = Boolean(textBackgroundEnabledCheckbox.checked)
    const backgroundOpacityInputValue = Number(textBackgroundOpacityInput.value)
    const backgroundOpacityPercent = Math.max(
      0,
      Math.min(100, Number.isNaN(backgroundOpacityInputValue) ? 100 : backgroundOpacityInputValue)
    )
    const backgroundOpacity = backgroundOpacityPercent / 100

    const paddingTop = parseNumberInput({ input: textPaddingTopInput, min: 0, fallback: 0 })
    const paddingRight = parseNumberInput({ input: textPaddingRightInput, min: 0, fallback: 0 })
    const paddingBottom = parseNumberInput({ input: textPaddingBottomInput, min: 0, fallback: 0 })
    const paddingLeft = parseNumberInput({ input: textPaddingLeftInput, min: 0, fallback: 0 })

    const radiusTopLeft = parseNumberInput({ input: textRadiusTopLeftInput, min: 0, fallback: 0 })
    const radiusTopRight = parseNumberInput({ input: textRadiusTopRightInput, min: 0, fallback: 0 })
    const radiusBottomRight = parseNumberInput({ input: textRadiusBottomRightInput, min: 0, fallback: 0 })
    const radiusBottomLeft = parseNumberInput({ input: textRadiusBottomLeftInput, min: 0, fallback: 0 })

    const textbox = editorInstance.textManager.addText({
      text: textValue,
      fontFamily,
      fontSize,
      bold: isButtonActive(textBoldBtn),
      italic: isButtonActive(textItalicBtn),
      underline: isButtonActive(textUnderlineBtn),
      uppercase: isButtonActive(textUppercaseBtn),
      strikethrough: isButtonActive(textStrikeBtn),
      align: textAlignToggle.dataset.align ?? 'left',
      color: textColorInput.value,
      strokeColor: textStrokeColorInput.value,
      strokeWidth,
      opacity,
      ...backgroundEnabled
        ? {
          backgroundColor: textBackgroundColorInput.value,
          backgroundOpacity,
          paddingTop,
          paddingRight,
          paddingBottom,
          paddingLeft,
          radiusTopLeft,
          radiusTopRight,
          radiusBottomRight,
          radiusBottomLeft
        }
        : { backgroundColor: '' }
    })

    editorInstance.canvas.setActiveObject(textbox)
    editorInstance.canvas.requestRenderAll()
    syncTextControls(textbox)
  })

  textContentInput.addEventListener('input', (e) => {
    if (isSyncingControls) return
    if (!getActiveText()) return
    applyTextStyle({ text: e.target.value }, { withoutSave: true })
  })

  textContentInput.addEventListener('change', (e) => {
    if (!getActiveText()) return
    applyTextStyle({ text: e.target.value })
  })

  textFontFamilySelect.addEventListener('change', (e) => {
    const family = e.target.value
    ensureFontOption(family)
    if (!getActiveText()) return
    applyTextStyle({ fontFamily: family })
  })

  textFontSizeInput.addEventListener('input', (e) => {
    const rawValue = Number(e.target.value)
    const value = Math.max(1, Number.isNaN(rawValue) ? 1 : Math.round(rawValue))
    e.target.value = value
    if (!getActiveText()) return
    applyTextStyle({ fontSize: value }, { withoutSave: true })
  })

  textFontSizeInput.addEventListener('change', (e) => {
    const rawValue = Number(e.target.value)
    const value = Math.max(1, Number.isNaN(rawValue) ? 1 : Math.round(rawValue))
    e.target.value = value
    if (!getActiveText()) return
    applyTextStyle({ fontSize: value })
  })

  const toggleHandlers = [
    [textBoldBtn, 'bold'],
    [textItalicBtn, 'italic'],
    [textUnderlineBtn, 'underline'],
    [textUppercaseBtn, 'uppercase'],
    [textStrikeBtn, 'strikethrough']
  ]

  toggleHandlers.forEach(([button, key]) => {
    button.addEventListener('click', () => {
      const nextState = !isButtonActive(button)
      setToggleActive(button, nextState)
      if (!getActiveText()) return
      applyTextStyle({ [key]: nextState })
    })
  })

  textAlignToggle.addEventListener('click', () => {
    const currentAlign = textAlignToggle.dataset.align ?? 'left'
    const currentIndex = ALIGN_SEQUENCE.indexOf(currentAlign)
    const nextAlign = ALIGN_SEQUENCE[(currentIndex + 1) % ALIGN_SEQUENCE.length]
    updateAlignButtonDisplay(nextAlign)
    if (!getActiveText()) return
    applyTextStyle({ align: nextAlign })
  })

  textColorInput.addEventListener('input', (e) => {
    const color = normalizeColor(e.target.value, textColorInput.value)
    e.target.value = color
    setPaletteSelection(textColorButtons, color)
    if (!getActiveText()) return
    applyTextStyle({ color })
  })

  textStrokeColorInput.addEventListener('input', (e) => {
    const color = normalizeColor(e.target.value, textStrokeColorInput.value)
    e.target.value = color
    setPaletteSelection(textStrokeButtons, color)
    const width = getStrokeWidthFromInput()
    if (!getActiveText() || width <= 0) return
    applyTextStyle({ strokeColor: color })
  })

  textStrokeWidthInput.addEventListener('input', (e) => {
    const rawWidth = Number(e.target.value)
    const width = Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
    setStrokeWidthUI(width)
    if (!getActiveText()) return
    if (width === 0) {
      applyTextStyle({ strokeWidth: 0 }, { withoutSave: true })
      return
    }
    applyTextStyle({
      strokeWidth: width,
      strokeColor: textStrokeColorInput.value
    }, { withoutSave: true })
  })

  textStrokeWidthInput.addEventListener('change', (e) => {
    const rawWidth = Number(e.target.value)
    const width = Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
    setStrokeWidthUI(width)
    if (!getActiveText()) return
    if (width === 0) {
      applyTextStyle({ strokeWidth: 0 })
      return
    }
    applyTextStyle({
      strokeWidth: width,
      strokeColor: textStrokeColorInput.value
    })
  })

  textOpacityInput.addEventListener('input', (e) => {
    const rawOpacity = Number(e.target.value)
    const opacityPercent = Math.max(0, Math.min(100, Number.isNaN(rawOpacity) ? 0 : rawOpacity))
    e.target.value = opacityPercent
    textOpacityValue.textContent = `${opacityPercent}%`
    if (!getActiveText()) return
    applyTextStyle({ opacity: opacityPercent / 100 }, { withoutSave: true })
  })

  textOpacityInput.addEventListener('change', (e) => {
    const rawOpacity = Number(e.target.value)
    const opacityPercent = Math.max(0, Math.min(100, Number.isNaN(rawOpacity) ? 0 : rawOpacity))
    e.target.value = opacityPercent
    textOpacityValue.textContent = `${opacityPercent}%`
    if (!getActiveText()) return
    applyTextStyle({ opacity: opacityPercent / 100 })
  })

  const getBackgroundStyleFromInputs = () => {
    const backgroundOpacityPercent = parseNumberInput({
      input: textBackgroundOpacityInput,
      min: 0,
      max: 100,
      fallback: 100
    })

    const paddingTop = parseNumberInput({ input: textPaddingTopInput, min: 0, fallback: 0 })
    const paddingRight = parseNumberInput({ input: textPaddingRightInput, min: 0, fallback: 0 })
    const paddingBottom = parseNumberInput({ input: textPaddingBottomInput, min: 0, fallback: 0 })
    const paddingLeft = parseNumberInput({ input: textPaddingLeftInput, min: 0, fallback: 0 })

    const radiusTopLeft = parseNumberInput({ input: textRadiusTopLeftInput, min: 0, fallback: 0 })
    const radiusTopRight = parseNumberInput({ input: textRadiusTopRightInput, min: 0, fallback: 0 })
    const radiusBottomRight = parseNumberInput({ input: textRadiusBottomRightInput, min: 0, fallback: 0 })
    const radiusBottomLeft = parseNumberInput({ input: textRadiusBottomLeftInput, min: 0, fallback: 0 })

    return {
      backgroundColor: normalizeColor(textBackgroundColorInput.value, textBackgroundColorInput.value),
      backgroundOpacity: backgroundOpacityPercent / 100,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      radiusTopLeft,
      radiusTopRight,
      radiusBottomRight,
      radiusBottomLeft
    }
  }

  textBackgroundEnabledCheckbox.addEventListener('change', () => {
    const enabled = Boolean(textBackgroundEnabledCheckbox.checked)
    setBackgroundControlsEnabled(enabled)
    if (!getActiveText()) return
    if (!enabled) {
      applyTextStyle({ backgroundColor: '' })
      return
    }
    applyTextStyle(getBackgroundStyleFromInputs())
  })

  textBackgroundColorInput.addEventListener('input', (e) => {
    const color = normalizeColor(e.target.value, textBackgroundColorInput.value)
    e.target.value = color
    if (!getActiveText()) return
    if (!textBackgroundEnabledCheckbox.checked) return
    applyTextStyle({ backgroundColor: color })
  })

  textBackgroundOpacityInput.addEventListener('input', (e) => {
    const opacityPercent = parseNumberInput({ input: e.target, min: 0, max: 100, fallback: 100 })
    textBackgroundOpacityValue.textContent = `${opacityPercent}%`
    if (!getActiveText()) return
    if (!textBackgroundEnabledCheckbox.checked) return
    applyTextStyle({ backgroundOpacity: opacityPercent / 100 }, { withoutSave: true })
  })

  textBackgroundOpacityInput.addEventListener('change', (e) => {
    const opacityPercent = parseNumberInput({ input: e.target, min: 0, max: 100, fallback: 100 })
    textBackgroundOpacityValue.textContent = `${opacityPercent}%`
    if (!getActiveText()) return
    if (!textBackgroundEnabledCheckbox.checked) return
    applyTextStyle({ backgroundOpacity: opacityPercent / 100 })
  })

  const paddingInputs = [
    { input: textPaddingTopInput, key: 'paddingTop' },
    { input: textPaddingRightInput, key: 'paddingRight' },
    { input: textPaddingBottomInput, key: 'paddingBottom' },
    { input: textPaddingLeftInput, key: 'paddingLeft' }
  ]

  paddingInputs.forEach(({ input, key }) => {
    input.addEventListener('input', () => {
      const value = parseNumberInput({ input, min: 0, fallback: 0 })
      if (!getActiveText()) return
      if (!textBackgroundEnabledCheckbox.checked) return
      applyTextStyle({ [key]: value }, { withoutSave: true })
    })

    input.addEventListener('change', () => {
      const value = parseNumberInput({ input, min: 0, fallback: 0 })
      if (!getActiveText()) return
      if (!textBackgroundEnabledCheckbox.checked) return
      applyTextStyle({ [key]: value })
    })
  })

  const radiusInputs = [
    { input: textRadiusTopLeftInput, key: 'radiusTopLeft' },
    { input: textRadiusTopRightInput, key: 'radiusTopRight' },
    { input: textRadiusBottomRightInput, key: 'radiusBottomRight' },
    { input: textRadiusBottomLeftInput, key: 'radiusBottomLeft' }
  ]

  radiusInputs.forEach(({ input, key }) => {
    input.addEventListener('input', () => {
      const value = parseNumberInput({ input, min: 0, fallback: 0 })
      if (!getActiveText()) return
      if (!textBackgroundEnabledCheckbox.checked) return
      applyTextStyle({ [key]: value }, { withoutSave: true })
    })

    input.addEventListener('change', () => {
      const value = parseNumberInput({ input, min: 0, fallback: 0 })
      if (!getActiveText()) return
      if (!textBackgroundEnabledCheckbox.checked) return
      applyTextStyle({ [key]: value })
    })
  })

  editorInstance.canvas.on('selection:created', handleSelectionChange)
  editorInstance.canvas.on('selection:updated', handleSelectionChange)
  editorInstance.canvas.on('selection:cleared', handleSelectionChange)
  editorInstance.canvas.on('text:selection:changed', handleSelectionChange)

  editorInstance.canvas.on('text:changed', (event) => {
    if (event.target && event.target === getActiveText()) {
      syncTextControls(event.target)
    }
  })

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
    editorInstance.zoomManager.resetZoom()
  })

  // Установка дефолтного масштаба для всего
  setDefaultScaleBtn.addEventListener('click', () => {
    editorInstance.canvasManager.setDefaultScale()
  })

  // Увеличение масштаба
  zoomInBtn.addEventListener('click', () => {
    editorInstance.zoomManager.zoom(0.1)
  })

  // Уменьшение масштаба
  zoomOutBtn.addEventListener('click', () => {
    editorInstance.zoomManager.zoom(-0.1)
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

  editorInstance.canvas.on('object:modified', (event) => {
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
    if (event?.target && event.target === getActiveText()) {
      syncTextControls(event.target)
    }

    if (activeObjectJsonInput) {
      activeObjectJsonInput.value = ''
    }
  })

  editorInstance.canvas.on('editor:display-width-changed', () => {
    canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
  })

  editorInstance.canvas.on('editor:display-height-changed', () => {
    canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
  })

  editorInstance.canvas.on('selection:created', () => {
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
  })
  editorInstance.canvas.on('selection:updated', () => {
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
  })
  editorInstance.canvas.on('selection:cleared', () => {
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
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
  })

  const setTemplateInputValue = (value = '') => {
    if (!templateJsonInput) return
    templateJsonInput.value = value
  }

  const getTemplateInputValue = () => templateJsonInput?.value ?? ''

  serializeTemplateBtn?.addEventListener('click', async() => {
    try {
      const withBackground = Boolean(serializeTemplateWithBackgroundCheckbox?.checked)
      const template = await editorInstance.templateManager.serializeSelection({ withBackground })
      if (!template) return

      setTemplateInputValue(JSON.stringify(template, null, 2))
    } catch (error) {
      console.error('Failed to serialize template selection', error)
      setTemplateInputValue('')
    }
  })

  applyTemplateBtn?.addEventListener('click', async() => {
    const templateValue = getTemplateInputValue().trim()
    if (!templateValue) {
      console.warn('Template JSON is empty. Provide serialized data before applying.')
      return
    }

    try {
      const parsedTemplate = JSON.parse(templateValue)
      await editorInstance.templateManager.applyTemplate({ template: parsedTemplate })
    } catch (error) {
      console.error('Failed to apply template', error)
    }
  })

  loadActiveObjectBtn?.addEventListener('click', syncActiveObjectJson)
  saveActiveObjectBtn?.addEventListener('click', applyActiveObjectJson)

  setColorBackgroundBtn.addEventListener('click', () => {
    const color = backgroundColorInput.value
    setColorBackground(editorInstance, color)
  })

  // Gradient background
  const createGradientStopElement = (color = '#000000', offset = 0) => {
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

  const getGradientStops = () => {
    const rows = gradientStopsContainer.querySelectorAll('.gradient-stop-row')
    const stops = []
    rows.forEach((row) => {
      const inputs = row.querySelectorAll('input')
      const color = inputs[0].value
      const offset = Number(inputs[1].value)
      stops.push({ color, offset })
    })
    return stops.sort((a, b) => a.offset - b.offset)
  }

  // Initialize default stops
  if (gradientStopsContainer.children.length === 0) {
    gradientStopsContainer.appendChild(createGradientStopElement('#79F1A4', 0))
    gradientStopsContainer.appendChild(createGradientStopElement('#0E5CAD', 100))
  }

  addGradientStopBtn.addEventListener('click', () => {
    gradientStopsContainer.appendChild(createGradientStopElement('#ffffff', 50))
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
    } else {
      const angle = gradientAngleInput.value
      setGradientBackground(editorInstance, null, null, 'linear', {
        angle,
        colorStops
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
