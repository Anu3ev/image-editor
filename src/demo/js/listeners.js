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
  const ALIGN_SEQUENCE = ['left', 'center', 'right']

  let isSyncingControls = false
  let textColorButtons = []
  let textStrokeButtons = []
  const getStrokeWidthFromInput = () => {
    const rawWidth = Number(textStrokeWidthInput.value)
    return Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
  }

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

  const getActiveText = () => {
    const object = editorInstance.canvas.getActiveObject()
    if (!object || object.type !== 'textbox') return null
    return object
  }

  const syncTextControls = (textbox) => {
    if (!textbox) return

    isSyncingControls = true

    const fallbackText = textbox.text ?? ''
    const textValue = typeof textbox.textCaseRaw === 'string'
      ? textbox.textCaseRaw
      : fallbackText
    textContentInput.value = textValue

    const fontFamily = textbox.fontFamily ?? ''
    ensureFontOption(fontFamily)
    if (fontFamily) {
      textFontFamilySelect.value = fontFamily
    }

    const fallbackFontSize = Number(textFontSizeInput.value) || 48
    const fontSize = Math.max(1, Math.round(textbox.fontSize ?? fallbackFontSize))
    textFontSizeInput.value = fontSize

    const boldActive = textbox.fontWeight === 'bold' || Number(textbox.fontWeight) >= 600
    setToggleActive(textBoldBtn, boldActive)
    setToggleActive(textItalicBtn, textbox.fontStyle === 'italic')
    setToggleActive(textUnderlineBtn, Boolean(textbox.underline))
    setToggleActive(textUppercaseBtn, Boolean(textbox.uppercase))
    setToggleActive(textStrikeBtn, Boolean(textbox.linethrough))

    const alignValue = textbox.textAlign ?? textAlignToggle.dataset.align ?? 'left'
    updateAlignButtonDisplay(alignValue)

    const fillColor = typeof textbox.fill === 'string'
      ? normalizeColor(textbox.fill, textColorInput.value)
      : textColorInput.value
    textColorInput.value = fillColor
    setPaletteSelection(textColorButtons, fillColor)

    const strokeColor = typeof textbox.stroke === 'string'
      ? normalizeColor(textbox.stroke, textStrokeColorInput.value)
      : textStrokeColorInput.value
    textStrokeColorInput.value = strokeColor
    setPaletteSelection(textStrokeButtons, strokeColor)

    const fallbackStrokeWidth = Number(textStrokeWidthInput.value) || 0
    const currentStrokeWidth = Math.max(0, Math.round(textbox.strokeWidth ?? fallbackStrokeWidth))
    setStrokeWidthUI(currentStrokeWidth)

    const opacitySource = textbox.opacity ?? Number(textOpacityInput.value) / 100
    const opacity = Math.max(0, Math.min(100, Math.round(opacitySource * 100)))
    textOpacityInput.value = opacity
    textOpacityValue.textContent = `${opacity}%`

    isSyncingControls = false
  }

  const applyTextStyle = (style, options = {}) => {
    if (isSyncingControls) return
    const target = getActiveText()
    if (!target) return

    const updated = editorInstance.textManager.updateText(target, style, options)
    if (updated) {
      syncTextControls(updated)
    }
  }

  const initFontOptions = () => {
    const customFonts = (editorInstance.options.fonts ?? [])
      .map((font) => font.family)
      .filter((family) => typeof family === 'string' && family.trim().length > 0)
    const fallbackFonts = [
      'Arial',
      'Helvetica',
      'Times New Roman',
      'Georgia',
      'Courier New',
      'Montserrat',
      'Roboto'
    ]
    const uniqueFonts = Array.from(new Set([...customFonts, ...fallbackFonts]))

    textFontFamilySelect.innerHTML = ''
    uniqueFonts.forEach((family) => ensureFontOption(family))

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

  const handleSelectionChange = () => {
    const textObject = getActiveText()
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
      opacity
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

  editorInstance.canvas.on('selection:created', handleSelectionChange)
  editorInstance.canvas.on('selection:updated', handleSelectionChange)
  editorInstance.canvas.on('selection:cleared', handleSelectionChange)

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
  })

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
