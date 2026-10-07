// @ts-nocheck

import {
  ALIGN_SEQUENCE,
  DEFAULT_TEXT_VALUE,
  TEXT_FILL_PALETTE,
  TEXT_STROKE_PALETTE
} from './constants.js'

import {
  isButtonActive,
  normalizeColor,
  normalizeColorOptional,
  parseNumberInput,
  renderPalette,
  setPaletteSelection,
  setToggleActive
} from './shared-ui.js'

/**
 * Initializes listeners and synchronization for text objects.
 */
export default ({ editorInstance, controls }) => {
  const {
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
  } = controls

  let isSyncingControls = false
  let textColorButtons = []
  let textStrokeButtons = []

  /**
   * Returns the text stroke width from the input.
   */
  const getStrokeWidthFromInput = () => {
    const rawWidth = Number(textStrokeWidthInput.value)
    return Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
  }

  /**
   * Toggles the availability of text background controls.
   */
  const setBackgroundControlsEnabled = ({ enabled }) => {
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

  /**
   * Toggles the availability of text stroke controls.
   */
  const setStrokeControlsEnabled = ({ enabled }) => {
    textStrokeColorInput.disabled = !enabled

    for (const button of textStrokeButtons) {
      button.disabled = !enabled
    }
  }

  /**
   * Updates the text stroke width UI.
   */
  const setStrokeWidthUI = ({ width }) => {
    const normalized = Math.max(0, Math.round(width))
    textStrokeWidthInput.value = normalized
    textStrokeWidthValue.textContent = normalized > 0 ? `${normalized}px` : 'Off'
    setStrokeControlsEnabled({ enabled: normalized > 0 })
  }

  /**
   * Updates the text alignment button UI.
   */
  const updateAlignButtonDisplay = ({ align }) => {
    const normalized = ALIGN_SEQUENCE.includes(align) ? align : 'left'
    const label = `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
    textAlignToggle.dataset.align = normalized
    textAlignToggle.textContent = `Align: ${label}`
  }

  /**
   * Adds a font option to the select if it is not already present.
   */
  const ensureFontOption = ({ family }) => {
    if (!family) return

    const trimmed = family.trim()
    if (!trimmed) return

    const options = Array.from(textFontFamilySelect.options)
    const exists = options.some((option) => option.value === trimmed)
    if (exists) return

    const option = document.createElement('option')
    option.value = trimmed
    option.textContent = trimmed
    textFontFamilySelect.appendChild(option)
  }

  /**
   * Checks whether the object is a text object.
   */
  const isTextboxObject = (object) => Boolean(object)
    && (object.type === 'textbox' || object.type === 'background-textbox')

  /**
   * Returns the active text object.
   */
  const getActiveText = () => {
    const object = editorInstance.canvas.getActiveObject()
    if (!isTextboxObject(object)) return null

    return object
  }

  /**
   * Returns the UI text target: a regular textbox or text inside the active shape.
   */
  const getActiveTextTarget = () => {
    const activeText = getActiveText()
    if (activeText) return activeText

    return editorInstance.shapeManager.getTextNode()
  }

  /**
   * Synchronizes the standalone-only autoExpand control.
   * For text inside a shape, this mode must be controlled only through the shape API.
   */
  const syncTextAutoExpandControl = ({ textbox = null } = {}) => {
    const activeText = getActiveText()
    const activeShapeText = !activeText && Boolean(editorInstance.shapeManager.getTextNode())

    textAutoExpandCheckbox.disabled = activeShapeText

    if (activeText && textbox === activeText) {
      textAutoExpandCheckbox.checked = activeText.autoExpand !== false
      return
    }

    if (!activeShapeText) {
      textAutoExpandCheckbox.disabled = false
    }
  }

  /**
   * Checks whether the value represents bold text.
   */
  const isBoldValue = (value) => {
    if (value === 'bold') return true
    if (typeof value === 'number') return value >= 600

    const numeric = Number(value)
    if (!Number.isNaN(numeric)) return numeric >= 600

    return false
  }

  /**
   * Returns information about the text selection inside the textbox.
   */
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

  /**
   * Returns the shared property value across the entire text selection.
   */
  const getSelectionUniformValue = ({ selectionInfo, extractor }) => {
    if (!selectionInfo || !selectionInfo.styles.length) return undefined

    const firstValue = extractor(selectionInfo.styles[0])
    if (typeof firstValue === 'undefined') return undefined

    for (let index = 1; index < selectionInfo.styles.length; index += 1) {
      const nextValue = extractor(selectionInfo.styles[index])
      if (typeof nextValue === 'undefined' || nextValue !== firstValue) {
        return undefined
      }
    }

    return firstValue
  }

  /**
   * Synchronizes text content and typography with the UI.
   */
  const syncTextTypographyControls = ({ textbox, selectionInfo }) => {
    const fallbackText = textbox.text ?? ''
    const textValue = typeof textbox.textCaseRaw === 'string'
      ? textbox.textCaseRaw
      : fallbackText
    textContentInput.value = textValue

    const selectionFontFamily = getSelectionUniformValue({
      selectionInfo,
      extractor: (style) => {
        if (typeof style.fontFamily === 'string') return style.fontFamily
        return undefined
      }
    })
    const fontFamily = selectionFontFamily ?? textbox.fontFamily ?? ''
    if (fontFamily) {
      ensureFontOption({ family: fontFamily })
      textFontFamilySelect.value = fontFamily
    }

    const selectionFontSize = getSelectionUniformValue({
      selectionInfo,
      extractor: (style) => {
        const size = typeof style.fontSize === 'number' ? style.fontSize : undefined
        if (typeof size !== 'number') return undefined

        return Math.max(1, Math.round(size))
      }
    })
    const fallbackFontSize = Number(textFontSizeInput.value) || 48
    const baseFontSize = typeof textbox.fontSize === 'number'
      ? Math.max(1, Math.round(textbox.fontSize))
      : fallbackFontSize
    textFontSizeInput.value = selectionFontSize ?? baseFontSize
  }

  /**
   * Synchronizes text toggle buttons with the UI.
   */
  const syncTextToggleControls = ({ textbox, selectionInfo }) => {
    const selectionBold = getSelectionUniformValue({
      selectionInfo,
      extractor: (style) => isBoldValue(style.fontWeight)
    })
    const boldActive = typeof selectionBold === 'boolean'
      ? selectionBold
      : isBoldValue(textbox.fontWeight)
    setToggleActive({ button: textBoldBtn, isActive: boldActive })

    const selectionItalic = getSelectionUniformValue({
      selectionInfo,
      extractor: (style) => style.fontStyle === 'italic'
    })
    const italicActive = typeof selectionItalic === 'boolean'
      ? selectionItalic
      : textbox.fontStyle === 'italic'
    setToggleActive({ button: textItalicBtn, isActive: italicActive })

    const selectionUnderline = getSelectionUniformValue({
      selectionInfo,
      extractor: (style) => Boolean(style.underline)
    })
    const underlineActive = typeof selectionUnderline === 'boolean'
      ? selectionUnderline
      : Boolean(textbox.underline)
    setToggleActive({ button: textUnderlineBtn, isActive: underlineActive })
    setToggleActive({ button: textUppercaseBtn, isActive: Boolean(textbox.uppercase) })

    const selectionStrike = getSelectionUniformValue({
      selectionInfo,
      extractor: (style) => Boolean(style.linethrough)
    })
    const strikeActive = typeof selectionStrike === 'boolean'
      ? selectionStrike
      : Boolean(textbox.linethrough)
    setToggleActive({ button: textStrikeBtn, isActive: strikeActive })

    const alignValue = textbox.textAlign ?? textAlignToggle.dataset.align ?? 'left'
    updateAlignButtonDisplay({ align: alignValue })
  }

  /**
   * Synchronizes text fill, stroke, and opacity with the UI.
   */
  const syncTextAppearanceControls = ({ textbox, selectionInfo }) => {
    const selectionFillColor = getSelectionUniformValue({
      selectionInfo,
      extractor: (style) => normalizeColorOptional({ color: style.fill })
    })

    let fillColor = selectionFillColor
    if (!fillColor) {
      fillColor = typeof textbox.fill === 'string'
        ? normalizeColor({ color: textbox.fill, fallback: textColorInput.value })
        : textColorInput.value
    }

    textColorInput.value = fillColor
    setPaletteSelection({ buttons: textColorButtons, color: fillColor })

    const selectionStrokeWidth = getSelectionUniformValue({
      selectionInfo,
      extractor: (style) => {
        const width = typeof style.strokeWidth === 'number' ? style.strokeWidth : undefined
        if (typeof width !== 'number') return undefined

        return Math.max(0, Math.round(width))
      }
    })
    const selectionStrokeColor = getSelectionUniformValue({
      selectionInfo,
      extractor: (style) => normalizeColorOptional({ color: style.stroke })
    })
    const fallbackStrokeWidth = Number(textStrokeWidthInput.value) || 0
    const baseStrokeWidth = typeof textbox.strokeWidth === 'number'
      ? Math.max(0, Math.round(textbox.strokeWidth))
      : fallbackStrokeWidth
    const strokeWidth = selectionStrokeWidth ?? baseStrokeWidth
    setStrokeWidthUI({ width: strokeWidth })

    let strokeColor = selectionStrokeColor
    if (!strokeColor) {
      strokeColor = typeof textbox.stroke === 'string'
        ? normalizeColor({ color: textbox.stroke, fallback: textStrokeColorInput.value })
        : textStrokeColorInput.value
    }

    textStrokeColorInput.value = strokeColor
    setPaletteSelection({ buttons: textStrokeButtons, color: strokeColor })

    const opacitySource = textbox.opacity ?? Number(textOpacityInput.value) / 100
    const opacity = Math.max(0, Math.min(100, Math.round(opacitySource * 100)))
    textOpacityInput.value = opacity
    textOpacityValue.textContent = `${opacity}%`
  }

  /**
   * Synchronizes text background settings with the UI.
   */
  const syncTextBackgroundControls = ({ textbox }) => {
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
    setBackgroundControlsEnabled({ enabled: isBackgroundEnabled })

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
  }

  /**
   * Fully synchronizes text controls with the active object.
   */
  const syncTextControls = (textbox) => {
    syncTextAutoExpandControl({ textbox })
    if (!textbox) return

    isSyncingControls = true
    const selectionInfo = getTextboxSelectionInfo(textbox)

    syncTextTypographyControls({ textbox, selectionInfo })
    syncTextToggleControls({ textbox, selectionInfo })
    syncTextAppearanceControls({ textbox, selectionInfo })
    syncTextBackgroundControls({ textbox })

    isSyncingControls = false
  }

  /**
   * Applies a style to the active text object.
   */
  const applyTextStyle = ({ style, options = {} }) => {
    if (isSyncingControls) return

    const activeText = getActiveText()
    if (activeText) {
      const updated = editorInstance.textManager.updateText({
        target: activeText,
        style,
        ...options
      })
      if (!updated) return

      syncTextControls(updated)
      return
    }

    const updatedShape = editorInstance.shapeManager.updateTextStyle({
      style,
      ...options
    })
    if (!updatedShape) return

    const updatedText = editorInstance.shapeManager.getTextNode({
      target: updatedShape
    })
    if (!updatedText) return

    syncTextControls(updatedText)
  }

  /**
   * Applies autoExpand only to the active standalone text object.
   * Text inside a shape must be controlled by a separate shape-level mode.
   */
  const applyStandaloneTextAutoExpand = ({ autoExpand }) => {
    if (isSyncingControls) return

    const activeText = getActiveText()
    if (!activeText) return

    const updated = editorInstance.textManager.updateText({
      target: activeText,
      style: { autoExpand }
    })
    if (!updated) return

    syncTextControls(updated)
  }

  /**
   * Applies horizontal alignment to the active text or text inside the active shape.
   */
  const applyTextAlign = ({ align }) => {
    const activeText = getActiveText()
    if (activeText) {
      applyTextStyle({ style: { align } })
      return
    }

    const updatedShape = editorInstance.shapeManager.setTextAlign({
      horizontal: align
    })
    if (!updatedShape) return

    const updatedText = editorInstance.shapeManager.getTextNode({
      target: updatedShape
    })
    if (!updatedText) return

    syncTextControls(updatedText)
  }

  /**
   * Builds the text background style from the current inputs.
   */
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
      backgroundColor: normalizeColor({
        color: textBackgroundColorInput.value,
        fallback: textBackgroundColorInput.value
      }),
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

  /**
   * Builds options for creating new text from the controls.
   */
  const getTextCreateOptions = () => {
    const text = textContentInput.value?.length ? textContentInput.value : DEFAULT_TEXT_VALUE
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

    return {
      text,
      autoExpand: Boolean(textAutoExpandCheckbox.checked),
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
    }
  }

  /**
   * Initializes the list of available fonts.
   */
  const initFontOptions = () => {
    const customFonts = (editorInstance.options.fonts ?? [])
      .map((font) => font.family)
      .filter((family) => typeof family === 'string' && family.trim().length > 0)

    textFontFamilySelect.innerHTML = ''
    for (const family of customFonts) {
      ensureFontOption({ family })
    }

    if (textFontFamilySelect.options.length > 0) {
      textFontFamilySelect.value = textFontFamilySelect.options[0].value
    }
  }

  /**
   * Initializes text palettes and the initial UI state.
   */
  const initTextControls = () => {
    textColorButtons = renderPalette({
      container: textColorPalette,
      colors: TEXT_FILL_PALETTE
    })
    textStrokeButtons = renderPalette({
      container: textStrokePalette,
      colors: TEXT_STROKE_PALETTE
    })

    initFontOptions()
    updateAlignButtonDisplay({ align: textAlignToggle.dataset.align ?? 'left' })

    if (!textContentInput.value) {
      textContentInput.value = DEFAULT_TEXT_VALUE
    }

    setStrokeWidthUI({ width: Number(textStrokeWidthInput.value) || 0 })
    textOpacityValue.textContent = `${textOpacityInput.value}%`
    textBackgroundOpacityValue.textContent = `${textBackgroundOpacityInput.value}%`
    textAutoExpandCheckbox.checked = true
    textAutoExpandCheckbox.disabled = false
    setBackgroundControlsEnabled({
      enabled: Boolean(textBackgroundEnabledCheckbox.checked)
    })
    setPaletteSelection({ buttons: textColorButtons, color: textColorInput.value })
    setPaletteSelection({ buttons: textStrokeButtons, color: textStrokeColorInput.value })

    const toggleButtons = [textBoldBtn, textItalicBtn, textUnderlineBtn, textUppercaseBtn, textStrikeBtn]
    for (const button of toggleButtons) {
      setToggleActive({
        button,
        isActive: button.classList.contains('active')
      })
    }
  }

  /**
   * Registers color change listeners for the text palettes.
   */
  const initTextPaletteListeners = () => {
    const fillButtons = textColorButtons
    for (const button of fillButtons) {
      button.addEventListener('click', () => {
        const color = normalizeColor({
          color: button.dataset.color,
          fallback: textColorInput.value
        })
        textColorInput.value = color
        setPaletteSelection({ buttons: fillButtons, color })
        if (!getActiveTextTarget()) return

        applyTextStyle({ style: { color } })
      })
    }

    const strokeButtons = textStrokeButtons
    for (const button of strokeButtons) {
      button.addEventListener('click', () => {
        const color = normalizeColor({
          color: button.dataset.color,
          fallback: textStrokeColorInput.value
        })
        textStrokeColorInput.value = color
        setPaletteSelection({ buttons: strokeButtons, color })

        const width = getStrokeWidthFromInput()
        if (!getActiveTextTarget() || width <= 0) return

        applyTextStyle({
          style: {
            strokeColor: color,
            strokeWidth: width
          }
        })
      })
    }
  }

  /**
   * Registers change listeners for the basic text controls.
   */
  const initTextInputListeners = () => {
    addTextBtn.addEventListener('click', () => {
      const textbox = editorInstance.textManager.addText(getTextCreateOptions())
      editorInstance.canvas.setActiveObject(textbox)
      editorInstance.canvas.requestRenderAll()
      syncTextControls(textbox)
    })

    textContentInput.addEventListener('input', (event) => {
      if (isSyncingControls) return
      if (!getActiveTextTarget()) return

      applyTextStyle({
        style: { text: event.target.value },
        options: { withoutSave: true }
      })
    })

    textContentInput.addEventListener('change', (event) => {
      if (!getActiveTextTarget()) return
      applyTextStyle({ style: { text: event.target.value } })
    })

    textFontFamilySelect.addEventListener('change', (event) => {
      const { value: family } = event.target
      ensureFontOption({ family })
      if (!getActiveTextTarget()) return

      applyTextStyle({ style: { fontFamily: family } })
    })

    textFontSizeInput.addEventListener('change', (event) => {
      const rawValue = Number(event.target.value)
      const value = Math.max(1, Number.isNaN(rawValue) ? 1 : Math.round(rawValue))
      event.target.value = value
      if (!getActiveTextTarget()) return

      applyTextStyle({ style: { fontSize: value } })
    })

    textAutoExpandCheckbox.addEventListener('change', () => {
      applyStandaloneTextAutoExpand({
        autoExpand: Boolean(textAutoExpandCheckbox.checked)
      })
    })
  }

  /**
   * Registers listeners for text toggle controls.
   */
  const initTextToggleListeners = () => {
    const toggleHandlers = [
      [textBoldBtn, 'bold'],
      [textItalicBtn, 'italic'],
      [textUnderlineBtn, 'underline'],
      [textUppercaseBtn, 'uppercase'],
      [textStrikeBtn, 'strikethrough']
    ]

    for (const [button, key] of toggleHandlers) {
      button.addEventListener('click', () => {
        const nextState = !isButtonActive(button)
        setToggleActive({ button, isActive: nextState })
        if (!getActiveTextTarget()) return

        applyTextStyle({ style: { [key]: nextState } })
      })
    }

    textAlignToggle.addEventListener('click', () => {
      const alignSequence = ALIGN_SEQUENCE
      const currentAlign = textAlignToggle.dataset.align ?? 'left'
      const currentIndex = alignSequence.indexOf(currentAlign)
      const nextAlign = alignSequence[(currentIndex + 1) % alignSequence.length]
      updateAlignButtonDisplay({ align: nextAlign })
      if (!getActiveTextTarget()) return

      applyTextAlign({ align: nextAlign })
    })
  }

  /**
   * Registers listeners for text color, stroke, and opacity controls.
   */
  const initTextAppearanceListeners = () => {
    textColorInput.addEventListener('input', (event) => {
      const color = normalizeColor({
        color: event.target.value,
        fallback: textColorInput.value
      })
      event.target.value = color
      setPaletteSelection({ buttons: textColorButtons, color })
      if (!getActiveTextTarget()) return

      applyTextStyle({ style: { color } })
    })

    textStrokeColorInput.addEventListener('input', (event) => {
      const color = normalizeColor({
        color: event.target.value,
        fallback: textStrokeColorInput.value
      })
      event.target.value = color
      setPaletteSelection({ buttons: textStrokeButtons, color })

      const width = getStrokeWidthFromInput()
      if (!getActiveTextTarget() || width <= 0) return

      applyTextStyle({
        style: {
          strokeColor: color,
          strokeWidth: width
        }
      })
    })

    textStrokeWidthInput.addEventListener('input', (event) => {
      const rawWidth = Number(event.target.value)
      const width = Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
      setStrokeWidthUI({ width })
      if (!getActiveTextTarget()) return

      if (width === 0) {
        applyTextStyle({
          style: { strokeWidth: 0 },
          options: { withoutSave: true }
        })
        return
      }

      applyTextStyle({
        style: {
          strokeWidth: width,
          strokeColor: textStrokeColorInput.value
        },
        options: { withoutSave: true }
      })
    })

    textStrokeWidthInput.addEventListener('change', (event) => {
      const rawWidth = Number(event.target.value)
      const width = Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
      setStrokeWidthUI({ width })
      if (!getActiveTextTarget()) return

      if (width === 0) {
        applyTextStyle({ style: { strokeWidth: 0 } })
        return
      }

      applyTextStyle({
        style: {
          strokeWidth: width,
          strokeColor: textStrokeColorInput.value
        }
      })
    })

    textOpacityInput.addEventListener('input', (event) => {
      const rawOpacity = Number(event.target.value)
      const opacityPercent = Math.max(0, Math.min(100, Number.isNaN(rawOpacity) ? 0 : rawOpacity))
      event.target.value = opacityPercent
      textOpacityValue.textContent = `${opacityPercent}%`
      if (!getActiveTextTarget()) return

      applyTextStyle({
        style: { opacity: opacityPercent / 100 },
        options: { withoutSave: true }
      })
    })

    textOpacityInput.addEventListener('change', (event) => {
      const rawOpacity = Number(event.target.value)
      const opacityPercent = Math.max(0, Math.min(100, Number.isNaN(rawOpacity) ? 0 : rawOpacity))
      event.target.value = opacityPercent
      textOpacityValue.textContent = `${opacityPercent}%`
      if (!getActiveTextTarget()) return

      applyTextStyle({ style: { opacity: opacityPercent / 100 } })
    })
  }

  /**
   * Registers listeners for text background controls.
   */
  const initTextBackgroundListeners = () => {
    textBackgroundEnabledCheckbox.addEventListener('change', () => {
      const enabled = Boolean(textBackgroundEnabledCheckbox.checked)
      setBackgroundControlsEnabled({ enabled })
      if (!getActiveTextTarget()) return

      if (!enabled) {
        applyTextStyle({ style: { backgroundColor: '' } })
        return
      }

      applyTextStyle({ style: getBackgroundStyleFromInputs() })
    })

    textBackgroundColorInput.addEventListener('input', (event) => {
      const color = normalizeColor({
        color: event.target.value,
        fallback: textBackgroundColorInput.value
      })
      event.target.value = color
      if (!getActiveTextTarget()) return
      if (!textBackgroundEnabledCheckbox.checked) return

      applyTextStyle({ style: { backgroundColor: color } })
    })

    textBackgroundOpacityInput.addEventListener('input', (event) => {
      const opacityPercent = parseNumberInput({
        input: event.target,
        min: 0,
        max: 100,
        fallback: 100
      })
      textBackgroundOpacityValue.textContent = `${opacityPercent}%`
      if (!getActiveTextTarget()) return
      if (!textBackgroundEnabledCheckbox.checked) return

      applyTextStyle({
        style: { backgroundOpacity: opacityPercent / 100 },
        options: { withoutSave: true }
      })
    })

    textBackgroundOpacityInput.addEventListener('change', (event) => {
      const opacityPercent = parseNumberInput({
        input: event.target,
        min: 0,
        max: 100,
        fallback: 100
      })
      textBackgroundOpacityValue.textContent = `${opacityPercent}%`
      if (!getActiveTextTarget()) return
      if (!textBackgroundEnabledCheckbox.checked) return

      applyTextStyle({ style: { backgroundOpacity: opacityPercent / 100 } })
    })
  }

  /**
   * Registers listeners for text padding controls.
   */
  const initTextPaddingListeners = () => {
    const paddingInputs = [
      { input: textPaddingTopInput, key: 'paddingTop' },
      { input: textPaddingRightInput, key: 'paddingRight' },
      { input: textPaddingBottomInput, key: 'paddingBottom' },
      { input: textPaddingLeftInput, key: 'paddingLeft' }
    ]

    for (const { input, key } of paddingInputs) {
      input.addEventListener('input', () => {
        const value = parseNumberInput({ input, min: 0, fallback: 0 })
        if (!getActiveTextTarget()) return
        if (!textBackgroundEnabledCheckbox.checked) return

        applyTextStyle({
          style: { [key]: value },
          options: { withoutSave: true }
        })
      })

      input.addEventListener('change', () => {
        const value = parseNumberInput({ input, min: 0, fallback: 0 })
        if (!getActiveTextTarget()) return
        if (!textBackgroundEnabledCheckbox.checked) return

        applyTextStyle({ style: { [key]: value } })
      })
    }
  }

  /**
   * Registers listeners for text corner radius controls.
   */
  const initTextRadiusListeners = () => {
    const radiusInputs = [
      { input: textRadiusTopLeftInput, key: 'radiusTopLeft' },
      { input: textRadiusTopRightInput, key: 'radiusTopRight' },
      { input: textRadiusBottomRightInput, key: 'radiusBottomRight' },
      { input: textRadiusBottomLeftInput, key: 'radiusBottomLeft' }
    ]

    for (const { input, key } of radiusInputs) {
      input.addEventListener('input', () => {
        const value = parseNumberInput({ input, min: 0, fallback: 0 })
        if (!getActiveTextTarget()) return
        if (!textBackgroundEnabledCheckbox.checked) return

        applyTextStyle({
          style: { [key]: value },
          options: { withoutSave: true }
        })
      })

      input.addEventListener('change', () => {
        const value = parseNumberInput({ input, min: 0, fallback: 0 })
        if (!getActiveTextTarget()) return
        if (!textBackgroundEnabledCheckbox.checked) return

        applyTextStyle({ style: { [key]: value } })
      })
    }
  }

  initTextControls()
  initTextPaletteListeners()
  initTextInputListeners()
  initTextToggleListeners()
  initTextAppearanceListeners()
  initTextBackgroundListeners()
  initTextPaddingListeners()
  initTextRadiusListeners()

  return {
    getActiveText,
    getActiveTextTarget,
    syncTextControls,
    isTextboxObject
  }
}
