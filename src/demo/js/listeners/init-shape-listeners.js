// @ts-nocheck

import {
  SHAPE_FILL_PALETTE,
  SHAPE_STROKE_PALETTE
} from './constants.js'

import {
  normalizeColor,
  parseNumberInput,
  renderPalette,
  setPaletteSelection,
  setToggleActive
} from './shared-ui.js'

/**
 * @typedef {HTMLElement & { value: string, disabled: boolean }} ShapeInputElement
 */

/**
 * @typedef {HTMLElement & { textContent: string | null }} ShapeTextNode
 */

/**
 * @typedef {HTMLElement & { disabled: boolean, dataset: DOMStringMap }} ShapeButtonElement
 */

/**
 * @typedef {HTMLElement & { classList: DOMTokenList, contains(target: Node | null): boolean }} ShapeMenuElement
 */

/**
 * @typedef {{
 *   type?: string,
 *   group?: ShapeObject | null,
 *   shapeComposite?: unknown,
 *   shapeTextAutoExpand?: boolean,
 *   shapeAlignHorizontal?: string,
 *   shapeAlignVertical?: string,
 *   shapeFill?: string,
 *   shapeStroke?: string,
 *   shapeStrokeWidth?: number,
 *   shapeOpacity?: number,
 *   shapePaddingTop?: number,
 *   shapePaddingRight?: number,
 *   shapePaddingBottom?: number,
 *   shapePaddingLeft?: number,
 *   shapeRounding?: number,
 *   shapeCanRound?: boolean
 * }} ShapeObject
 */

/**
 * @typedef {{
 *   addShapeBtn: HTMLElement | null,
 *   shapePickerMenu: ShapeMenuElement | null,
 *   shapePresetButtons: ShapeButtonElement[],
 *   replaceShapeBtn: HTMLButtonElement,
 *   replaceShapeMenu: ShapeMenuElement | null,
 *   replaceShapePresetButtons: ShapeButtonElement[],
 *   shapeTextAutoExpandCheckbox: HTMLInputElement,
 *   shapeFillInput: ShapeInputElement,
 *   shapeFillPalette: HTMLElement,
 *   shapeStrokeInput: ShapeInputElement,
 *   shapeStrokePalette: HTMLElement,
 *   shapeStrokeWidthInput: ShapeInputElement,
 *   shapeStrokeWidthValue: ShapeTextNode,
 *   shapeOpacityInput: ShapeInputElement,
 *   shapeOpacityValue: ShapeTextNode,
 *   shapeOpacityApplyToTextCheckbox: HTMLInputElement,
 *   shapeAlignHorizontalButtons: HTMLButtonElement[],
 *   shapeAlignVerticalButtons: HTMLButtonElement[],
 *   shapePaddingTopInput: ShapeInputElement,
 *   shapePaddingRightInput: ShapeInputElement,
 *   shapePaddingBottomInput: ShapeInputElement,
 *   shapePaddingLeftInput: ShapeInputElement,
 *   shapeRoundingInput: ShapeInputElement,
 *   shapeRoundingValue: ShapeTextNode
 * }} ShapeControls
 */

/**
 * Инициализирует listeners и синхронизацию для фигур.
 * @param {{ editorInstance: any, controls: ShapeControls }} params
 */
export default ({ editorInstance, controls }) => {
  const {
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
  } = controls

  /** @type {HTMLButtonElement[]} */
  let shapeFillButtons = []
  /** @type {HTMLButtonElement[]} */
  let shapeStrokeButtons = []
  const horizontalAlignOptions = ['left', 'center', 'right', 'justify']
  const verticalAlignOptions = ['top', 'middle', 'bottom']

  /**
   * Возвращает ширину обводки фигуры из input.
   */
  const getShapeStrokeWidthFromInput = () => {
    const rawWidth = Number(shapeStrokeWidthInput.value)
    return Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
  }

  /**
   * Возвращает активное значение кнопочной группы выравнивания.
   */
  const getShapeAlignValue = ({ buttons, options, fallback }) => {
    const activeButton = buttons.find((button) => button.classList.contains('active'))
    const { shapeAlignValue } = activeButton?.dataset ?? {}

    return options.includes(shapeAlignValue) ? shapeAlignValue : fallback
  }

  /**
   * Синхронизирует активную кнопку в группе выравнивания.
   */
  const setShapeAlignButtonsState = ({ buttons, value, options, fallback }) => {
    const resolvedValue = options.includes(value) ? value : fallback

    for (const button of buttons) {
      setToggleActive({
        button,
        isActive: button.dataset.shapeAlignValue === resolvedValue
      })
    }
  }

  /**
   * Проверяет, является ли объект группой фигуры.
    * @param {ShapeObject | null | undefined} object
   */
  const isShapeGroupObject = (object) => {
    if (!object) return false
    if (object.type !== 'shape-group') return false

    return Boolean(object.shapeComposite)
  }

  /**
   * Возвращает активную фигуру, включая вложенный объект внутри группы.
   */
  const getActiveShape = () => {
    const activeObject = editorInstance.canvas.getActiveObject()
    if (!activeObject) return null

    if (isShapeGroupObject(activeObject)) return activeObject

    const { group } = activeObject
    if (isShapeGroupObject(group)) return group

    return null
  }

  /**
   * Переключает доступность контролов обводки фигуры.
   */
  const setShapeStrokeControlsEnabled = ({ enabled }) => {
    shapeStrokeInput.disabled = !enabled

    for (const button of shapeStrokeButtons) {
      button.disabled = !enabled
    }
  }

  /**
   * Обновляет UI ширины обводки фигуры.
   */
  const setShapeStrokeWidthUI = ({ width }) => {
    const normalized = Math.max(0, Math.round(width))
    shapeStrokeWidthInput.value = normalized
    shapeStrokeWidthValue.textContent = normalized > 0 ? `${normalized}px` : '0px'
    setShapeStrokeControlsEnabled({
      enabled: normalized > 0 && !shapeStrokeWidthInput.disabled
    })
  }

  /**
   * Переключает доступность shape-контролов.
   */
  const setShapeControlsEnabled = ({ enabled }) => {
    shapeFillInput.disabled = false
    shapeStrokeWidthInput.disabled = false
    shapeOpacityInput.disabled = false
    shapeRoundingInput.disabled = false
    replaceShapeBtn.disabled = !enabled

    for (const button of shapeFillButtons) {
      button.disabled = false
    }

    const strokeWidth = getShapeStrokeWidthFromInput()
    setShapeStrokeControlsEnabled({ enabled: strokeWidth > 0 })
  }

  /**
   * Считывает процент непрозрачности фигуры из input.
   */
  const getShapeOpacityPercentFromInput = () => parseNumberInput({
    input: shapeOpacityInput,
    min: 0,
    max: 100,
    fallback: 100
  })

  /**
   * Считывает внутренний отступ фигуры из input.
   * @param {ShapeInputElement} input
   */
  const getShapePaddingFromInput = (input) => parseNumberInput({
    input,
    min: 0,
    fallback: 0
  })

  /**
   * Возвращает текущие внутренние отступы фигуры из контролов.
   */
  const getShapeTextPaddingFromControls = () => ({
    top: getShapePaddingFromInput(shapePaddingTopInput),
    right: getShapePaddingFromInput(shapePaddingRightInput),
    bottom: getShapePaddingFromInput(shapePaddingBottomInput),
    left: getShapePaddingFromInput(shapePaddingLeftInput)
  })

  /**
   * Считывает скругление фигуры из input.
   */
  const getShapeRoundingFromInput = () => parseNumberInput({
    input: shapeRoundingInput,
    min: 0,
    max: 100,
    fallback: 0
  })

  /**
   * Синхронизирует shape-контролы с текущей активной фигурой.
    * @param {ShapeObject | null} shapeGroup
   */
  const syncShapeControls = (shapeGroup) => {
    if (!shapeGroup) {
      setShapeControlsEnabled({ enabled: false })
      shapeRoundingInput.disabled = false
      return
    }

    setShapeControlsEnabled({ enabled: true })
    shapeTextAutoExpandCheckbox.checked = shapeGroup.shapeTextAutoExpand !== false
    setShapeAlignButtonsState({
      buttons: shapeAlignHorizontalButtons,
      value: shapeGroup.shapeAlignHorizontal,
      options: horizontalAlignOptions,
      fallback: 'center'
    })
    setShapeAlignButtonsState({
      buttons: shapeAlignVerticalButtons,
      value: shapeGroup.shapeAlignVertical,
      options: verticalAlignOptions,
      fallback: 'middle'
    })

    const fill = typeof shapeGroup.shapeFill === 'string'
      ? normalizeColor({ color: shapeGroup.shapeFill, fallback: shapeFillInput.value })
      : normalizeColor({ color: shapeFillInput.value, fallback: '#B0B5BF' })
    shapeFillInput.value = fill
    setPaletteSelection({ buttons: shapeFillButtons, color: fill })

    const stroke = typeof shapeGroup.shapeStroke === 'string'
      ? normalizeColor({ color: shapeGroup.shapeStroke, fallback: shapeStrokeInput.value })
      : normalizeColor({ color: shapeStrokeInput.value, fallback: '#000000' })
    shapeStrokeInput.value = stroke
    setPaletteSelection({ buttons: shapeStrokeButtons, color: stroke })

    const strokeWidth = typeof shapeGroup.shapeStrokeWidth === 'number'
      ? Math.max(0, Math.round(shapeGroup.shapeStrokeWidth))
      : 0
    setShapeStrokeWidthUI({ width: strokeWidth })

    const opacityPercent = Math.max(
      0,
      Math.min(100, Math.round((shapeGroup.shapeOpacity ?? 1) * 100))
    )
    shapeOpacityInput.value = opacityPercent
    shapeOpacityValue.textContent = `${opacityPercent}%`

    const paddingTop = typeof shapeGroup.shapePaddingTop === 'number'
      ? Math.max(0, Math.round(shapeGroup.shapePaddingTop))
      : Number(shapePaddingTopInput.value) || 0
    const paddingRight = typeof shapeGroup.shapePaddingRight === 'number'
      ? Math.max(0, Math.round(shapeGroup.shapePaddingRight))
      : Number(shapePaddingRightInput.value) || 0
    const paddingBottom = typeof shapeGroup.shapePaddingBottom === 'number'
      ? Math.max(0, Math.round(shapeGroup.shapePaddingBottom))
      : Number(shapePaddingBottomInput.value) || 0
    const paddingLeft = typeof shapeGroup.shapePaddingLeft === 'number'
      ? Math.max(0, Math.round(shapeGroup.shapePaddingLeft))
      : Number(shapePaddingLeftInput.value) || 0

    shapePaddingTopInput.value = paddingTop
    shapePaddingRightInput.value = paddingRight
    shapePaddingBottomInput.value = paddingBottom
    shapePaddingLeftInput.value = paddingLeft

    const rounding = typeof shapeGroup.shapeRounding === 'number'
      ? Math.max(0, Math.min(100, Math.round(shapeGroup.shapeRounding)))
      : 0
    const canRound = shapeGroup.shapeCanRound !== false
    shapeRoundingInput.disabled = !canRound
    shapeRoundingInput.value = rounding
    shapeRoundingValue.textContent = canRound ? `${rounding}%` : 'N/A'
  }

  /**
   * Применяет fill к активной фигуре.
   */
  const applyShapeFill = ({ fill, withoutSave = false }) => {
    const shapeGroup = getActiveShape()
    if (!shapeGroup) return

    const updated = editorInstance.shapeManager.setFill({
      target: shapeGroup,
      fill,
      withoutSave
    })
    if (!updated) return

    syncShapeControls(updated)
  }

  /**
   * Применяет stroke к активной фигуре.
   */
  const applyShapeStroke = ({ stroke, strokeWidth, withoutSave = false }) => {
    const shapeGroup = getActiveShape()
    if (!shapeGroup) return

    const updated = editorInstance.shapeManager.setStroke({
      target: shapeGroup,
      stroke,
      strokeWidth,
      withoutSave
    })
    if (!updated) return

    syncShapeControls(updated)
  }

  /**
   * Применяет opacity к активной фигуре.
   */
  const applyShapeOpacity = ({
    opacity,
    applyToText = true,
    withoutSave = false
  }) => {
    const shapeGroup = getActiveShape()
    if (!shapeGroup) return

    const updated = editorInstance.shapeManager.setOpacity({
      target: shapeGroup,
      opacity,
      applyToText,
      withoutSave
    })
    if (!updated) return

    syncShapeControls(updated)
  }

  /**
   * Применяет выравнивание контента к активной фигуре.
   */
  const applyShapeTextAlign = ({ horizontal, vertical, withoutSave = false }) => {
    const shapeGroup = getActiveShape()
    if (!shapeGroup) return

    const updated = editorInstance.shapeManager.setTextAlign({
      target: shapeGroup,
      horizontal,
      vertical,
      withoutSave
    })
    if (!updated) {
      syncShapeControls(getActiveShape())
      return
    }

    syncShapeControls(updated)
  }

  /**
   * Применяет скругление к активной фигуре.
   */
  const applyShapeRounding = async({ rounding, withoutSave = false }) => {
    const shapeGroup = getActiveShape()
    if (!shapeGroup) return

    const updated = await editorInstance.shapeManager.setRounding({
      target: shapeGroup,
      rounding,
      withoutSave
    })
    if (!updated) return

    syncShapeControls(updated)
  }

  /**
   * Применяет режим shapeTextAutoExpand к активной фигуре.
   */
  const applyShapeTextAutoExpand = async({ shapeTextAutoExpand, withoutSave = false }) => {
    const shapeGroup = getActiveShape()
    if (!shapeGroup) return

    const updated = await editorInstance.shapeManager.update({
      target: shapeGroup,
      options: {
        shapeTextAutoExpand,
        withoutSave
      }
    })
    if (!updated) {
      syncShapeControls(getActiveShape())
      return
    }

    syncShapeControls(updated)
  }

  /**
   * Применяет внутренний отступ текста к активной фигуре.
   * @param {{ side: 'top' | 'right' | 'bottom' | 'left', value: number, withoutSave?: boolean }} params
   */
  const applyShapePadding = async({ side, value, withoutSave = false }) => {
    const shapeGroup = getActiveShape()
    if (!shapeGroup) return

    const updated = await editorInstance.shapeManager.update({
      target: shapeGroup,
      options: {
        textPadding: { [side]: value },
        withoutSave
      }
    })
    if (!updated) {
      syncShapeControls(getActiveShape())
      return
    }

    syncShapeControls(updated)
  }

  /**
   * Собирает опции фигуры из текущих контролов.
   */
  const getShapeOptionsFromControls = () => {
    const fill = normalizeColor({ color: shapeFillInput.value, fallback: '#B0B5BF' })
    const stroke = normalizeColor({ color: shapeStrokeInput.value, fallback: '#000000' })
    const strokeWidth = getShapeStrokeWidthFromInput()
    const opacityPercent = getShapeOpacityPercentFromInput()
    const rounding = getShapeRoundingFromInput()

    shapeFillInput.value = fill
    shapeStrokeInput.value = stroke
    shapeOpacityValue.textContent = `${opacityPercent}%`
    shapeRoundingValue.textContent = `${rounding}%`
    setPaletteSelection({ buttons: shapeFillButtons, color: fill })
    setPaletteSelection({ buttons: shapeStrokeButtons, color: stroke })

    return {
      fill,
      stroke,
      strokeWidth,
      opacity: opacityPercent / 100,
      alignH: getShapeAlignValue({
        buttons: shapeAlignHorizontalButtons,
        options: horizontalAlignOptions,
        fallback: 'center'
      }),
      alignV: getShapeAlignValue({
        buttons: shapeAlignVerticalButtons,
        options: verticalAlignOptions,
        fallback: 'middle'
      }),
      rounding,
      shapeTextAutoExpand: shapeTextAutoExpandCheckbox.checked,
      textPadding: getShapeTextPaddingFromControls()
    }
  }

  /**
   * Переключает состояние popup-меню фигур.
   */
  const setPickerMenuOpen = ({ menu, triggerButton, isOpen }) => {
    if (!menu || !triggerButton) return

    menu.classList.toggle('is-open', isOpen)
    triggerButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
  }

  /**
   * Переключает состояние меню добавления фигуры.
   */
  const setShapeMenuOpen = ({ isOpen }) => {
    setPickerMenuOpen({
      menu: shapePickerMenu,
      triggerButton: addShapeBtn,
      isOpen
    })
  }

  /**
   * Переключает состояние меню замены фигуры.
   */
  const setReplaceShapeMenuOpen = ({ isOpen }) => {
    setPickerMenuOpen({
      menu: replaceShapeMenu,
      triggerButton: replaceShapeBtn,
      isOpen
    })
  }

  /**
   * Закрывает меню добавления фигуры.
   */
  const closeShapeMenu = () => {
    setShapeMenuOpen({ isOpen: false })
  }

  /**
   * Закрывает меню замены фигуры.
   */
  const closeReplaceShapeMenu = () => {
    setReplaceShapeMenuOpen({ isOpen: false })
  }

  /**
   * Закрывает все popup-меню фигур.
   */
  const closeShapePickerMenus = () => {
    closeShapeMenu()
    closeReplaceShapeMenu()
  }

  /**
   * Проверяет, был ли клик внутри конкретного popup-меню фигур.
   */
  const isClickInsideShapeMenu = ({ menu, triggerButton, target }) => {
    if (!menu || !triggerButton) return false
    if (!(target instanceof Element)) return false
    if (menu.contains(target)) return true
    if (triggerButton.contains(target)) return true

    return false
  }

  /**
   * Инициализирует палитры фигур.
   */
  const initShapePalettes = () => {
    shapeFillButtons = renderPalette({
      container: shapeFillPalette,
      colors: SHAPE_FILL_PALETTE
    })
    shapeStrokeButtons = renderPalette({
      container: shapeStrokePalette,
      colors: SHAPE_STROKE_PALETTE
    })

    setShapeStrokeWidthUI({ width: Number(shapeStrokeWidthInput.value) || 0 })
    shapeOpacityValue.textContent = `${shapeOpacityInput.value}%`
    shapeRoundingValue.textContent = `${shapeRoundingInput.value}%`
    setShapeAlignButtonsState({
      buttons: shapeAlignHorizontalButtons,
      value: getShapeAlignValue({
        buttons: shapeAlignHorizontalButtons,
        options: horizontalAlignOptions,
        fallback: 'center'
      }),
      options: horizontalAlignOptions,
      fallback: 'center'
    })
    setShapeAlignButtonsState({
      buttons: shapeAlignVerticalButtons,
      value: getShapeAlignValue({
        buttons: shapeAlignVerticalButtons,
        options: verticalAlignOptions,
        fallback: 'middle'
      }),
      options: verticalAlignOptions,
      fallback: 'middle'
    })
    setShapeControlsEnabled({ enabled: Boolean(getActiveShape()) })
    setPaletteSelection({ buttons: shapeFillButtons, color: shapeFillInput.value })
    setPaletteSelection({ buttons: shapeStrokeButtons, color: shapeStrokeInput.value })
  }

  /**
   * Подписывает обработчики на палитры фигур.
   */
  const initShapePaletteListeners = () => {
    const fillButtons = shapeFillButtons
    for (const button of fillButtons) {
      button.addEventListener('click', () => {
        const color = normalizeColor({
          color: button.dataset.color,
          fallback: shapeFillInput.value
        })
        shapeFillInput.value = color
        setPaletteSelection({ buttons: fillButtons, color })
        applyShapeFill({ fill: color })
      })
    }

    const strokeButtons = shapeStrokeButtons
    for (const button of strokeButtons) {
      button.addEventListener('click', () => {
        const color = normalizeColor({
          color: button.dataset.color,
          fallback: shapeStrokeInput.value
        })
        const strokeWidth = getShapeStrokeWidthFromInput()
        shapeStrokeInput.value = color
        setPaletteSelection({ buttons: strokeButtons, color })
        applyShapeStroke({
          stroke: color,
          strokeWidth
        })
      })
    }
  }

  /**
   * Подписывает обработчики на popup-меню фигур.
   */
  const initShapeMenuListeners = () => {
    addShapeBtn?.addEventListener('click', (event) => {
      event.preventDefault()
      const isOpen = Boolean(shapePickerMenu?.classList.contains('is-open'))
      if (!isOpen) {
        closeReplaceShapeMenu()
      }

      setShapeMenuOpen({ isOpen: !isOpen })
    })

    replaceShapeBtn?.addEventListener('click', (event) => {
      event.preventDefault()
      if (replaceShapeBtn.disabled) return

      const isOpen = Boolean(replaceShapeMenu?.classList.contains('is-open'))
      if (!isOpen) {
        closeShapeMenu()
      }

      setReplaceShapeMenuOpen({ isOpen: !isOpen })
    })

    document.addEventListener('click', (event) => {
      const { target } = event
      const isInsideAddMenu = isClickInsideShapeMenu({
        menu: shapePickerMenu,
        triggerButton: addShapeBtn,
        target
      })
      const isInsideReplaceMenu = isClickInsideShapeMenu({
        menu: replaceShapeMenu,
        triggerButton: replaceShapeBtn,
        target
      })

      if (isInsideAddMenu || isInsideReplaceMenu) return

      closeShapePickerMenus()
    })

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return
      closeShapePickerMenus()
    })
  }

  /**
   * Подписывает обработчики на изменения контролов фигур.
   */
  const initShapeControlListeners = () => {
    shapeFillInput.addEventListener('input', (event) => {
      const color = normalizeColor({
        color: event.target.value,
        fallback: shapeFillInput.value
      })
      event.target.value = color
      setPaletteSelection({ buttons: shapeFillButtons, color })
      applyShapeFill({ fill: color })
    })

    shapeStrokeInput.addEventListener('input', (event) => {
      const color = normalizeColor({
        color: event.target.value,
        fallback: shapeStrokeInput.value
      })
      const strokeWidth = getShapeStrokeWidthFromInput()
      event.target.value = color
      setPaletteSelection({ buttons: shapeStrokeButtons, color })
      applyShapeStroke({
        stroke: color,
        strokeWidth,
        withoutSave: true
      })
    })

    shapeStrokeWidthInput.addEventListener('input', (event) => {
      const rawWidth = Number(event.target.value)
      const width = Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
      setShapeStrokeWidthUI({ width })
      applyShapeStroke({
        stroke: normalizeColor({ color: shapeStrokeInput.value, fallback: '#000000' }),
        strokeWidth: width,
        withoutSave: true
      })
    })

    shapeStrokeWidthInput.addEventListener('change', (event) => {
      const rawWidth = Number(event.target.value)
      const width = Math.max(0, Number.isNaN(rawWidth) ? 0 : Math.round(rawWidth))
      setShapeStrokeWidthUI({ width })
      applyShapeStroke({
        stroke: normalizeColor({ color: shapeStrokeInput.value, fallback: '#000000' }),
        strokeWidth: width
      })
    })

    shapeOpacityInput.addEventListener('input', () => {
      const opacityPercent = getShapeOpacityPercentFromInput()
      shapeOpacityValue.textContent = `${opacityPercent}%`
      applyShapeOpacity({
        opacity: opacityPercent / 100,
        applyToText: shapeOpacityApplyToTextCheckbox.checked,
        withoutSave: true
      })
    })

    shapeOpacityInput.addEventListener('change', () => {
      const opacityPercent = getShapeOpacityPercentFromInput()
      shapeOpacityValue.textContent = `${opacityPercent}%`
      applyShapeOpacity({
        opacity: opacityPercent / 100,
        applyToText: shapeOpacityApplyToTextCheckbox.checked
      })
    })

    for (const button of shapeAlignHorizontalButtons) {
      button.addEventListener('click', () => {
        const { shapeAlignValue } = button.dataset
        setShapeAlignButtonsState({
          buttons: shapeAlignHorizontalButtons,
          value: shapeAlignValue,
          options: horizontalAlignOptions,
          fallback: 'center'
        })
        applyShapeTextAlign({
          horizontal: getShapeAlignValue({
            buttons: shapeAlignHorizontalButtons,
            options: horizontalAlignOptions,
            fallback: 'center'
          })
        })
      })
    }

    for (const button of shapeAlignVerticalButtons) {
      button.addEventListener('click', () => {
        const { shapeAlignValue } = button.dataset
        setShapeAlignButtonsState({
          buttons: shapeAlignVerticalButtons,
          value: shapeAlignValue,
          options: verticalAlignOptions,
          fallback: 'middle'
        })
        applyShapeTextAlign({
          vertical: getShapeAlignValue({
            buttons: shapeAlignVerticalButtons,
            options: verticalAlignOptions,
            fallback: 'middle'
          })
        })
      })
    }

    shapeRoundingInput.addEventListener('input', async() => {
      const rounding = getShapeRoundingFromInput()
      shapeRoundingValue.textContent = `${rounding}%`
      await applyShapeRounding({
        rounding,
        withoutSave: true
      })
    })

    shapeRoundingInput.addEventListener('change', async() => {
      const rounding = getShapeRoundingFromInput()
      shapeRoundingValue.textContent = `${rounding}%`
      await applyShapeRounding({ rounding })
    })

    shapeTextAutoExpandCheckbox.addEventListener('change', async() => {
      await applyShapeTextAutoExpand({
        shapeTextAutoExpand: shapeTextAutoExpandCheckbox.checked
      })
    })

    const paddingInputs = [
      { input: shapePaddingTopInput, key: 'top' },
      { input: shapePaddingRightInput, key: 'right' },
      { input: shapePaddingBottomInput, key: 'bottom' },
      { input: shapePaddingLeftInput, key: 'left' }
    ]

    for (const { input, key } of paddingInputs) {
      input.addEventListener('input', async() => {
        const value = getShapePaddingFromInput(input)
        await applyShapePadding({
          side: key,
          value,
          withoutSave: true
        })
      })

      input.addEventListener('change', async() => {
        const value = getShapePaddingFromInput(input)
        await applyShapePadding({
          side: key,
          value
        })
      })
    }
  }

  /**
   * Подписывает обработчики на пресеты фигур.
   */
  const initShapePresetListeners = () => {
    for (const button of shapePresetButtons) {
      button.addEventListener('click', async(event) => {
        event.preventDefault()
        const { shapePreset: presetKey } = button.dataset
        if (!presetKey) return

        const options = getShapeOptionsFromControls()
        const { opacity } = options
        const applyToText = shapeOpacityApplyToTextCheckbox.checked
        const needsShapeOnlyOpacityUpdate = !applyToText
          && typeof opacity === 'number'
          && opacity !== 1

        if (needsShapeOnlyOpacityUpdate) {
          delete options.opacity
          options.withoutSave = true
        }

        const addedShape = await editorInstance.shapeManager.add({
          presetKey,
          options
        })

        if (!addedShape) return

        if (!needsShapeOnlyOpacityUpdate) {
          syncShapeControls(addedShape)
          return
        }

        const updatedShape = editorInstance.shapeManager.setOpacity({
          target: addedShape,
          opacity,
          applyToText: false
        })

        syncShapeControls(updatedShape ?? addedShape)
      })
    }

    for (const button of replaceShapePresetButtons) {
      button.addEventListener('click', async(event) => {
        event.preventDefault()
        const { replaceShapePreset: presetKey } = button.dataset
        if (!presetKey) return

        const activeShape = getActiveShape()
        if (!activeShape) return

        const updatedShape = await editorInstance.shapeManager.update({
          target: activeShape,
          presetKey
        })
        if (!updatedShape) return

        syncShapeControls(updatedShape)
      })
    }
  }

  initShapePalettes()
  initShapePaletteListeners()
  initShapeControlListeners()
  initShapeMenuListeners()
  initShapePresetListeners()

  return {
    getActiveShape,
    syncShapeControls
  }
}
