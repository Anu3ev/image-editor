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
 * Инициализирует listeners и синхронизацию для текстовых объектов.
 */
export default ({ editorInstance, controls }) => {
  const {
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
  } = controls

  let isSyncingControls = false
  let textColorButtons = []
  let textStrokeButtons = []

  /**
   * Возвращает ширину обводки текста из input.
   */
  const getStrokeWidthFromInput = () => {
    const rawWidth = Number(textStrokeWidthInput.value)
    return Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
  }

  /**
   * Переключает доступность фоновых контролов текста.
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
   * Переключает доступность контролов stroke текста.
   */
  const setStrokeControlsEnabled = ({ enabled }) => {
    textStrokeColorInput.disabled = !enabled

    for (const button of textStrokeButtons) {
      button.disabled = !enabled
    }
  }

  /**
   * Обновляет UI ширины stroke текста.
   */
  const setStrokeWidthUI = ({ width }) => {
    const normalized = Math.max(0, Math.round(width))
    textStrokeWidthInput.value = normalized
    textStrokeWidthValue.textContent = normalized > 0 ? `${normalized}px` : 'Off'
    setStrokeControlsEnabled({ enabled: normalized > 0 })
  }

  /**
   * Обновляет UI кнопки выравнивания текста.
   */
  const updateAlignButtonDisplay = ({ align }) => {
    const normalized = ALIGN_SEQUENCE.includes(align) ? align : 'left'
    const label = `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
    textAlignToggle.dataset.align = normalized
    textAlignToggle.textContent = `Align: ${label}`
  }

  /**
   * Добавляет option шрифта в select, если его там еще нет.
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
   * Проверяет, является ли объект текстовым.
   */
  const isTextboxObject = (object) => Boolean(object)
    && (object.type === 'textbox' || object.type === 'background-textbox')

  /**
   * Возвращает активный текстовый объект.
   */
  const getActiveText = () => {
    const object = editorInstance.canvas.getActiveObject()
    if (!isTextboxObject(object)) return null

    return object
  }

  /**
   * Проверяет, считается ли значение жирным начертанием.
   */
  const isBoldValue = (value) => {
    if (value === 'bold') return true
    if (typeof value === 'number') return value >= 600

    const numeric = Number(value)
    if (!Number.isNaN(numeric)) return numeric >= 600

    return false
  }

  /**
   * Возвращает информацию о выделении текста внутри textbox.
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
   * Возвращает общее значение свойства для всего выделения текста.
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
   * Синхронизирует содержимое и типографику текста с UI.
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
   * Синхронизирует toggle-кнопки текста с UI.
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
   * Синхронизирует fill, stroke и opacity текста с UI.
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
   * Синхронизирует фоновые параметры текста с UI.
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
   * Полностью синхронизирует текстовые контролы с активным объектом.
   */
  const syncTextControls = (textbox) => {
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
   * Применяет style к активному текстовому объекту.
   */
  const applyTextStyle = ({ style, options = {} }) => {
    if (isSyncingControls) return

    const target = getActiveText()
    if (!target) return

    const updated = editorInstance.textManager.updateText({
      target,
      style,
      ...options
    })
    if (!updated) return

    syncTextControls(updated)
  }

  /**
   * Собирает стиль фона текста из текущих input'ов.
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
   * Собирает опции для создания нового текста из контролов.
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
   * Инициализирует список доступных шрифтов.
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
   * Инициализирует палитры текста и стартовое состояние UI.
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
   * Подписывает палитры текста на изменение цветов.
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
        if (!getActiveText()) return

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
        if (!getActiveText() || width <= 0) return

        applyTextStyle({ style: { strokeColor: color } })
      })
    }
  }

  /**
   * Подписывает базовые текстовые контролы на изменения.
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
      if (!getActiveText()) return

      applyTextStyle({
        style: { text: event.target.value },
        options: { withoutSave: true }
      })
    })

    textContentInput.addEventListener('change', (event) => {
      if (!getActiveText()) return
      applyTextStyle({ style: { text: event.target.value } })
    })

    textFontFamilySelect.addEventListener('change', (event) => {
      const { value: family } = event.target
      ensureFontOption({ family })
      if (!getActiveText()) return

      applyTextStyle({ style: { fontFamily: family } })
    })

    textFontSizeInput.addEventListener('change', (event) => {
      const rawValue = Number(event.target.value)
      const value = Math.max(1, Number.isNaN(rawValue) ? 1 : Math.round(rawValue))
      event.target.value = value
      if (!getActiveText()) return

      applyTextStyle({ style: { fontSize: value } })
    })
  }

  /**
   * Подписывает toggle-контролы текста.
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
        if (!getActiveText()) return

        applyTextStyle({ style: { [key]: nextState } })
      })
    }

    textAlignToggle.addEventListener('click', () => {
      const currentAlign = textAlignToggle.dataset.align ?? 'left'
      const currentIndex = ALIGN_SEQUENCE.indexOf(currentAlign)
      const nextAlign = ALIGN_SEQUENCE[(currentIndex + 1) % ALIGN_SEQUENCE.length]
      updateAlignButtonDisplay({ align: nextAlign })
      if (!getActiveText()) return

      applyTextStyle({ style: { align: nextAlign } })
    })
  }

  /**
   * Подписывает контролы цвета, stroke и opacity текста.
   */
  const initTextAppearanceListeners = () => {
    textColorInput.addEventListener('input', (event) => {
      const color = normalizeColor({
        color: event.target.value,
        fallback: textColorInput.value
      })
      event.target.value = color
      setPaletteSelection({ buttons: textColorButtons, color })
      if (!getActiveText()) return

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
      if (!getActiveText() || width <= 0) return

      applyTextStyle({ style: { strokeColor: color } })
    })

    textStrokeWidthInput.addEventListener('input', (event) => {
      const rawWidth = Number(event.target.value)
      const width = Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
      setStrokeWidthUI({ width })
      if (!getActiveText()) return

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
      if (!getActiveText()) return

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
      if (!getActiveText()) return

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
      if (!getActiveText()) return

      applyTextStyle({ style: { opacity: opacityPercent / 100 } })
    })
  }

  /**
   * Подписывает контролы фона текста.
   */
  const initTextBackgroundListeners = () => {
    textBackgroundEnabledCheckbox.addEventListener('change', () => {
      const enabled = Boolean(textBackgroundEnabledCheckbox.checked)
      setBackgroundControlsEnabled({ enabled })
      if (!getActiveText()) return

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
      if (!getActiveText()) return
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
      if (!getActiveText()) return
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
      if (!getActiveText()) return
      if (!textBackgroundEnabledCheckbox.checked) return

      applyTextStyle({ style: { backgroundOpacity: opacityPercent / 100 } })
    })
  }

  /**
   * Подписывает padding-контролы текста.
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
        if (!getActiveText()) return
        if (!textBackgroundEnabledCheckbox.checked) return

        applyTextStyle({
          style: { [key]: value },
          options: { withoutSave: true }
        })
      })

      input.addEventListener('change', () => {
        const value = parseNumberInput({ input, min: 0, fallback: 0 })
        if (!getActiveText()) return
        if (!textBackgroundEnabledCheckbox.checked) return

        applyTextStyle({ style: { [key]: value } })
      })
    }
  }

  /**
   * Подписывает контролы радиусов текста.
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
        if (!getActiveText()) return
        if (!textBackgroundEnabledCheckbox.checked) return

        applyTextStyle({
          style: { [key]: value },
          options: { withoutSave: true }
        })
      })

      input.addEventListener('change', () => {
        const value = parseNumberInput({ input, min: 0, fallback: 0 })
        if (!getActiveText()) return
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
    syncTextControls,
    isTextboxObject
  }
}
