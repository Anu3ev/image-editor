// @ts-nocheck

/** @typedef {{ value: string | number }} InputLike */

/**
 * Нормализует числовое значение из input с учетом границ и fallback.
 * @param {{ input: InputLike, fallback?: number, min?: number, max?: number }} params
 */
export const parseNumberInput = ({
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

/**
 * Рендерит палитру кнопок для выбора цвета.
 * @param {{ container: HTMLElement, colors: string[] }} params
 */
export const renderPalette = ({ container, colors }) => {
  container.innerHTML = ''

  /** @type {HTMLButtonElement[]} */
  const buttons = []
  for (const color of colors) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'palette-swatch'
    button.dataset.color = color
    button.style.backgroundColor = color
    button.title = color
    container.appendChild(button)
    buttons.push(button)
  }

  return buttons
}

/**
 * Приводит цвет к шестнадцатеричному формату.
 * @param {{ color: unknown, fallback?: string | null }} params
 */
export const normalizeColor = ({ color, fallback = '#000000' }) => {
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
  if (!rgbMatch) return fallback

  const [, r, g, b] = rgbMatch
  /** @param {string} value */
  const toHex = (value) => Number(value).toString(16).padStart(2, '0').toUpperCase()

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Нормализует цвет и возвращает undefined вместо невалидного значения.
 * @param {{ color: unknown }} params
 */
export const normalizeColorOptional = ({ color }) => {
  const normalized = normalizeColor({ color, fallback: null })
  if (typeof normalized === 'string') return normalized

  return undefined
}

/**
 * Подсвечивает активный цвет в палитре.
 * @param {{ buttons: HTMLButtonElement[], color: unknown }} params
 */
export const setPaletteSelection = ({ buttons, color }) => {
  const normalized = normalizeColor({ color: color ?? '', fallback: '' })

  for (const button of buttons) {
    const buttonColor = normalizeColor({ color: button.dataset.color, fallback: '' })
    const isActive = Boolean(normalized)
      && buttonColor.toLowerCase() === normalized.toLowerCase()

    button.classList.toggle('active', isActive)
  }
}

/**
 * Переключает активное состояние кнопки.
 * @param {{ button: HTMLElement, isActive: boolean }} params
 */
export const setToggleActive = ({ button, isActive }) => {
  button.classList.toggle('active', isActive)
  button.classList.toggle('btn-secondary', isActive)
  button.classList.toggle('btn-outline-secondary', !isActive)
  button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
}

/**
 * Проверяет, активна ли кнопка.
 * @param {HTMLElement} button
 */
export const isButtonActive = (button) => button.classList.contains('active')
