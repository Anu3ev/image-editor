import { Rect, FabricImage, Gradient } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'

export type SetColorOptions = {
  color: string
  withoutSave?: boolean
}

export type GradientBackground = {
  angle: number // угол в градусах (0-360)
  startColor: string // HEX цвет начала градиента
  endColor: string // HEX цвет конца градиента
  startPosition?: number // позиция начального цвета (0-100, по умолчанию 0)
  endPosition?: number // позиция конечного цвета (0-100, по умолчанию 100)
}

export type SetGradientOptions = {
  gradient: GradientBackground
  withoutSave?: boolean
}

export type SetImageOptions = {
  imageUrl: string
  withoutSave?: boolean
}

interface GradientData {
  type: string
  coords: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
  colorStops: Array<{
    color: string
    offset: number
  }>
}

export default class BackgroundManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Текущий объект фона.
   */
  public backgroundObject: Rect | FabricImage | null

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.backgroundObject = null
  }

  /**
   * Устанавливает фон сплошного цвета.
   * @param options - Опции для установки цвета фона
   * @param options.color - Цвет фона в формате HEX (например, "#FF0000")
   * @param options.withoutSave - Если true, не сохранять состояние в историю
   */
  public setColorBackground({
    color,
    withoutSave = false
  }: SetColorOptions): void {
    try {
      const { historyManager } = this.editor
      const { backgroundObject } = this

      historyManager.suspendHistory()

      if (backgroundObject && backgroundObject.backgroundType === 'color') {
        const currentFill = backgroundObject.fill

        if (currentFill === color) {
          // Если цвет не изменился, ничего не делаем
          historyManager.resumeHistory()
          return
        }

        // Обновляем существующий цветовой фон
        backgroundObject.set({ fill: color })
        backgroundObject.set('backgroundId', `background-${nanoid()}`)
        this.editor.canvas.requestRenderAll()
      } else {
        // Создаем новый цветовой фон
        this._removeCurrentBackground()
        this._createColorBackground(color)
      }

      this.editor.canvas.fire('background:changed', { type: 'color', color })
      historyManager.resumeHistory()

      if (!withoutSave) {
        historyManager.saveState()
      }
    } catch (error) {
      this.editor.errorManager.emitError({
        code: 'BACKGROUND_CREATION_FAILED',
        origin: 'BackgroundManager',
        method: 'setColorBackground',
        message: 'Не удалось установить цветовой фон',
        data: { error }
      })
    }
  }

  /**
   * Устанавливает градиентный фон.
   * @param options - Опции для установки градиентного фона
   * @param options.gradient - Объект с параметрами градиента
   * @param options.withoutSave - Если true, не сохранять состояние в историю
   */
  public setGradientBackground({
    gradient,
    withoutSave = false
  }: SetGradientOptions): void {
    try {
      const { historyManager } = this.editor
      const { backgroundObject } = this

      historyManager.suspendHistory()

      if (backgroundObject && backgroundObject.backgroundType === 'gradient') {
        // Обновляем существующий градиентный фон
        const fabricGradient = BackgroundManager._createFabricGradient(gradient)

        if (BackgroundManager._isGradientEqual(backgroundObject.fill as GradientData, fabricGradient)) {
          // Если градиент не изменился, ничего не делаем
          historyManager.resumeHistory()
          return
        }

        backgroundObject.set({ fill: fabricGradient })
        backgroundObject.set('backgroundId', `background-${nanoid()}`)
        this.editor.canvas.requestRenderAll()
      } else {
        // Создаем новый градиентный фон
        this._removeCurrentBackground()
        this._createGradientBackground(gradient)
      }

      this.editor.canvas.fire('background:changed', {
        type: 'gradient',
        gradientParams: gradient
      })
      historyManager.resumeHistory()

      if (!withoutSave) {
        historyManager.saveState()
      }
    } catch (error) {
      this.editor.errorManager.emitError({
        code: 'BACKGROUND_CREATION_FAILED',
        origin: 'BackgroundManager',
        method: 'setGradientBackground',
        message: 'Не удалось установить градиентный фон',
        data: { error }
      })
    }
  }

  /**
   * Устанавливает фон из изображения.
   * @param options - Опции для установки фонового изображения
   * @param options.imageUrl - URL изображения
   * @param options.withoutSave - Если true, не сохранять состояние в историю
   */
  public async setImageBackground({
    imageUrl,
    withoutSave = false
  }: SetImageOptions): Promise<void> {
    try {
      const { historyManager } = this.editor
      historyManager.suspendHistory()

      // Для изображений всегда пересоздаем фон
      this._removeCurrentBackground()
      await this._createImageBackground(imageUrl)

      this.editor.canvas.fire('background:changed', { type: 'image', imageUrl })
      historyManager.resumeHistory()

      if (!withoutSave) {
        historyManager.saveState()
      }
    } catch (error) {
      this.editor.errorManager.emitError({
        code: 'BACKGROUND_CREATION_FAILED',
        origin: 'BackgroundManager',
        method: 'setImageBackground',
        message: 'Не удалось установить изображение в качестве фона',
        data: { error }
      })
    }
  }

  /**
   * Удаляет текущий фон.
   * @param options - Опции для удаления фона
   * @param options.withoutSave - Если true, не сохранять состояние в историю
   */
  public removeBackground({ withoutSave = false }: { withoutSave?: boolean } = {}): void {
    try {
      const { historyManager } = this.editor

      if (!this.backgroundObject) {
        this.editor.errorManager.emitWarning({
          code: 'NO_BACKGROUND_TO_REMOVE',
          origin: 'BackgroundManager',
          method: 'removeBackground',
          message: 'Нет фона для удаления'
        })
        return
      }

      historyManager.suspendHistory()
      this._removeCurrentBackground()
      this.editor.canvas.fire('background:removed')
      historyManager.resumeHistory()

      if (!withoutSave) {
        historyManager.saveState()
      }
    } catch (error) {
      this.editor.errorManager.emitError({
        code: 'BACKGROUND_REMOVAL_FAILED',
        origin: 'BackgroundManager',
        method: 'removeBackground',
        message: 'Не удалось удалить фон',
        data: { error }
      })
    }
  }

  /**
   * Обновляет размеры и позицию фона согласно монтажной области.
   */
  public refresh(): void {
    const { canvas, montageArea, historyManager } = this.editor

    if (!montageArea || !this.backgroundObject) return

    historyManager.suspendHistory()

    // Получаем размеры монтажной области
    montageArea.setCoords()
    const { left, top, width, height } = montageArea.getBoundingRect()

    // Обновляем размеры и позицию фона
    this.backgroundObject.set({ left, top, width, height })

    // Проверяем, находится ли фон в правильной позиции (сразу после montageArea)
    const objects = canvas.getObjects()
    const montageIndex = objects.indexOf(montageArea)
    const backgroundIndex = objects.indexOf(this.backgroundObject)

    // Перемещаем фон только если он не на правильной позиции
    if (this.backgroundObject && backgroundIndex !== montageIndex + 1) {
      // Используем moveObjectTo для точного позиционирования без дублирования
      canvas.moveObjectTo(this.backgroundObject, montageIndex + 1)
    }

    canvas.requestRenderAll()
    historyManager.resumeHistory()
  }

  /**
   * Создает цветовой фон.
   * @param color - Цвет фона в формате HEX (например, "#FF0000")
   */
  private _createColorBackground(color: string): void {
    this.backgroundObject = this.editor.shapeManager.addRectangle({
      fill: color,
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
      id: 'background',
      backgroundType: 'color',
      backgroundId: `background-${nanoid()}`
    }, { withoutSelection: true })

    this._setupBackgroundPosition()
  }

  /**
   * Создает градиентный фон.
   * @param gradient - Объект с параметрами градиента
   */
  private _createGradientBackground(gradient: GradientBackground): void {
    // Сначала создаем прямоугольник без градиента
    this.backgroundObject = this.editor.shapeManager.addRectangle({
      fill: '#ffffff', // временный цвет
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
      id: 'background',
      backgroundType: 'gradient',
      backgroundId: `background-${nanoid()}`
    }, { withoutSelection: true })

    this._setupBackgroundPosition()

    // После установки позиции создаем градиент
    const fabricGradient = BackgroundManager._createFabricGradient(gradient)
    this.backgroundObject.set('fill', fabricGradient)
    this.editor.canvas.requestRenderAll()
  }

  /**
   * Создает фон из изображения.
   * @param imageUrl - URL изображения
   */
  private async _createImageBackground(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      FabricImage.fromURL(imageUrl, {
        crossOrigin: 'anonymous'
      }).then((img) => {
        if (!img) {
          reject(new Error('Не удалось загрузить изображение'))
          return
        }

        img.set({
          selectable: false,
          evented: false,
          hasBorders: false,
          hasControls: false,
          id: 'background',
          backgroundType: 'image',
          backgroundId: `background-${nanoid()}`
        })

        this.editor.canvas.add(img)
        this.backgroundObject = img
        this._setupBackgroundPosition()
        resolve()
      }).catch(reject)
    })
  }

  /**
   * Настраивает позицию и размеры фона.
   */
  private _setupBackgroundPosition(): void {
    if (!this.backgroundObject) return

    this.refresh()
  }

  /**
   * Удаляет текущий фон.
   */
  private _removeCurrentBackground(): void {
    if (this.backgroundObject) {
      this.editor.canvas.remove(this.backgroundObject)
      this.backgroundObject = null
      this.editor.canvas.renderAll()
    }
  }

  /**
   * Создает Fabric.js градиент из параметров.
   * @param gradient - Объект с параметрами градиента
   */
  private static _createFabricGradient(gradient: GradientBackground): Gradient<'linear'> {
    const {
      angle,
      startColor,
      endColor,
      startPosition = 0,
      endPosition = 100
    } = gradient

    // Конвертируем угол в координаты для Fabric.js
    const angleRad = (angle * Math.PI) / 180
    const coords = BackgroundManager._angleToCoords(angleRad)

    // Создаем цветовые остановки
    const colorStops = [
      { offset: startPosition / 100, color: startColor },
      { offset: endPosition / 100, color: endColor }
    ]

    return new Gradient({
      type: 'linear',
      gradientUnits: 'percentage',
      coords,
      colorStops
    })
  }

  /**
   * Конвертирует угол в координаты для линейного градиента.
   * @param angle - Угол в радианах
   */
  private static _angleToCoords(angle: number) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    return {
      x1: 0.5 - cos * 0.5,
      y1: 0.5 - sin * 0.5,
      x2: 0.5 + cos * 0.5,
      y2: 0.5 + sin * 0.5
    }
  }

  /**
   * Сравнивает два градиента на равенство
   * @param gradient1 - Первый градиент
   * @param gradient2 - Второй градиент
   * @returns true если градиенты одинаковые
   */
  private static _isGradientEqual(g1: GradientData, g2: GradientData): boolean {
    // Проверяем, что оба объекта являются градиентами
    if (!g1 || !g2) return false
    if (g1.type !== 'linear' || g2.type !== 'linear') return false

    // Сравниваем координаты с небольшой погрешностью для чисел с плавающей точкой
    const coordsEqual = Math.abs(g1.coords.x1 - g2.coords.x1) < 0.0001
      && Math.abs(g1.coords.y1 - g2.coords.y1) < 0.0001
      && Math.abs(g1.coords.x2 - g2.coords.x2) < 0.0001
      && Math.abs(g1.coords.y2 - g2.coords.y2) < 0.0001

    if (!coordsEqual) return false

    // Сравниваем цвета
    const stops1 = g1.colorStops || []
    const stops2 = g2.colorStops || []

    if (stops1.length !== stops2.length) return false

    return stops1.every((stop1: { color: string; offset: number }, index: number) => {
      const stop2 = stops2[index]
      return stop1.color === stop2.color
        && Math.abs(stop1.offset - stop2.offset) < 0.0001
    })
  }
}
