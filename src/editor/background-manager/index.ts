import { Rect, FabricImage, Gradient, FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'

export type SetColorOptions = {
  color: string
  customData?: object
  fromTemplate?: boolean
  withoutSave?: boolean
}

export type GradientColorStop = {
  color: string
  offset: number // позиция цвета в процентах (0-100)
}

export type LinearGradientBackground = {
  type: 'linear'
  angle: number // угол в градусах (0-360)
  startColor?: string // HEX цвет начала градиента (опционально, если есть colorStops)
  endColor?: string // HEX цвет конца градиента (опционально, если есть colorStops)
  startPosition?: number // позиция начального цвета (0-100, по умолчанию 0)
  endPosition?: number // позиция конечного цвета (0-100, по умолчанию 100)
  colorStops?: GradientColorStop[] // Массив цветов градиента
}

export type RadialGradientBackground = {
  type: 'radial'
  centerX?: number // позиция центра по X в процентах (0-100, по умолчанию 50)
  centerY?: number // позиция центра по Y в процентах (0-100, по умолчанию 50)
  radius?: number // радиус в процентах (0-100, по умолчанию 50)
  startColor?: string // HEX цвет центра градиента (опционально, если есть colorStops)
  endColor?: string // HEX цвет края градиента (опционально, если есть colorStops)
  startPosition?: number // позиция начального цвета (0-100, по умолчанию 0)
  endPosition?: number // позиция конечного цвета (0-100, по умолчанию 100)
  colorStops?: GradientColorStop[] // Массив цветов градиента
}

export type GradientBackground = LinearGradientBackground | RadialGradientBackground

export type SetGradientOptions = {
  gradient: GradientBackground
  customData?: object
  fromTemplate?: boolean
  withoutSave?: boolean
}

export type SetImageOptions = {
  imageSource: string | File
  customData?: object
  fromTemplate?: boolean
  withoutSave?: boolean
}

interface LinearGradientData {
  type: 'linear'
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

interface RadialGradientData {
  type: 'radial'
  coords: {
    x1: number
    y1: number
    x2: number
    y2: number
    r1: number
    r2: number
  }
  colorStops: Array<{
    color: string
    offset: number
  }>
}

type GradientData = LinearGradientData | RadialGradientData

export default class BackgroundManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Текущий объект фона.
   */
  public backgroundObject: Rect | FabricImage | FabricObject | null

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
    customData = {},
    fromTemplate = false,
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
        backgroundObject.set({
          fill: color,
          backgroundId: `background-${nanoid()}`
        })
        this.editor.canvas.requestRenderAll()
      } else {
        // Создаем новый цветовой фон
        this._removeCurrentBackground()
        this._createColorBackground(color)
      }

      this.backgroundObject?.set({ customData })

      this.editor.canvas.fire('editor:background:changed', {
        type: 'color',
        color,
        customData,
        fromTemplate,
        withoutSave
      })
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
        data: { error, color, customData, fromTemplate, withoutSave }
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
    customData = {},
    fromTemplate = false,
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

        backgroundObject.set({
          fill: fabricGradient,
          backgroundId: `background-${nanoid()}`
        })
        this.editor.canvas.requestRenderAll()
      } else {
        // Создаем новый градиентный фон
        this._removeCurrentBackground()
        this._createGradientBackground(gradient)
      }

      this.backgroundObject?.set({ customData })

      this.editor.canvas.fire('editor:background:changed', {
        type: 'gradient',
        customData,
        fromTemplate,
        withoutSave,
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
        data: { error, gradient, customData, fromTemplate, withoutSave }
      })
    }
  }

  /**
   * Устанавливает линейный градиентный фон.
   * @param options - Опции для установки линейного градиента
   */
  public setLinearGradientBackground({
    angle,
    startColor,
    endColor,
    startPosition,
    endPosition,
    colorStops,
    customData = {},
    withoutSave = false
  }: {
    angle: number
    startColor?: string
    endColor?: string
    startPosition?: number
    endPosition?: number
    colorStops?: GradientColorStop[]
    customData?: object
    withoutSave?: boolean
  }): void {
    this.setGradientBackground({
      gradient: {
        type: 'linear',
        angle,
        startColor,
        endColor,
        startPosition,
        endPosition,
        colorStops
      },
      customData,
      withoutSave
    })
  }

  /**
   * Устанавливает радиальный градиентный фон.
   * @param options - Опции для установки радиального градиента
   */
  public setRadialGradientBackground({
    centerX,
    centerY,
    radius,
    startColor,
    endColor,
    startPosition,
    endPosition,
    colorStops,
    customData = {},
    withoutSave = false
  }: {
    centerX?: number
    centerY?: number
    radius?: number
    startColor?: string
    endColor?: string
    startPosition?: number
    endPosition?: number
    colorStops?: GradientColorStop[]
    customData?: object
    withoutSave?: boolean
  }): void {
    this.setGradientBackground({
      gradient: {
        type: 'radial',
        centerX,
        centerY,
        radius,
        startColor,
        endColor,
        startPosition,
        endPosition,
        colorStops
      },
      customData,
      withoutSave
    })
  }

  /**
   * Устанавливает фон из изображения.
   * @param options - Опции для установки фонового изображения
   * @param options.imageUrl - URL изображения
   * @param options.withoutSave - Если true, не сохранять состояние в историю
   */
  public async setImageBackground({
    imageSource,
    customData = {},
    fromTemplate = false,
    withoutSave = false
  }: SetImageOptions): Promise<void> {
    try {
      const { historyManager } = this.editor
      historyManager.suspendHistory()

      await this._createImageBackground(imageSource, customData)

      this.editor.canvas.fire('editor:background:changed', {
        type: 'image',
        imageSource,
        customData,
        fromTemplate,
        withoutSave,
        backgroundObject: this.backgroundObject
      })
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
        data: { error, imageSource, customData, fromTemplate, withoutSave }
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

      if (!this.backgroundObject) return

      historyManager.suspendHistory()
      this._removeCurrentBackground()
      this.editor.canvas.fire('editor:background:removed', { withoutSave })
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
        data: { error, withoutSave }
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

    // Вписываем фон в монтажную область
    this.editor.transformManager.fitObject({ object: this.backgroundObject, withoutSave: true, type: 'cover' })

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

    this.refresh()
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

    this.refresh()

    // После установки позиции создаем градиент
    const fabricGradient = BackgroundManager._createFabricGradient(gradient)
    this.backgroundObject.set('fill', fabricGradient)
    this.editor.canvas.requestRenderAll()
  }

  /**
   * Создает фон из изображения.
   * @param source - источник изображения (URL или File)
   */
  private async _createImageBackground(source: string | File, customData: object): Promise<void> {
    const { image } = await this.editor.imageManager.importImage({
      source,
      withoutSave: true,
      isBackground: true,
      withoutSelection: true,
      scale: 'image-cover'
    }) ?? {}

    if (!image) {
      throw new Error('Не удалось загрузить изображение')
    }

    image.set({
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
      id: 'background',
      backgroundType: 'image',
      backgroundId: `background-${nanoid()}`,
      customData
    })

    // Удаляем старый фон перед установкой нового
    this._removeCurrentBackground()

    this.backgroundObject = image
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
  private static _createFabricGradient(gradient: GradientBackground): Gradient<'linear'> | Gradient<'radial'> {
    const {
      startColor,
      endColor,
      startPosition = 0,
      endPosition = 100,
      colorStops: providedStops
    } = gradient

    // Создаем цветовые остановки
    let colorStops: Array<{ offset: number; color: string }>

    if (providedStops && providedStops.length > 0) {
      colorStops = providedStops.map((stop) => ({
        offset: stop.offset / 100,
        color: stop.color
      }))
    } else if (startColor && endColor) {
      colorStops = [
        { offset: startPosition / 100, color: startColor },
        { offset: endPosition / 100, color: endColor }
      ]
    } else {
      // Fallback если цвета не переданы
      colorStops = [
        { offset: 0, color: '#000000' },
        { offset: 1, color: '#ffffff' }
      ]
    }

    if (gradient.type === 'linear') {
      // Конвертируем угол в координаты для Fabric.js
      const angleRad = (gradient.angle * Math.PI) / 180
      const coords = BackgroundManager._angleToCoords(angleRad)

      return new Gradient({
        type: 'linear',
        gradientUnits: 'percentage',
        coords,
        colorStops
      })
    }

    // Радиальный градиент
    const {
      centerX = 50,
      centerY = 50,
      radius = 50
    } = gradient

    const coords = {
      x1: centerX / 100,
      y1: centerY / 100,
      x2: centerX / 100,
      y2: centerY / 100,
      r1: 0,
      r2: radius / 100
    }

    return new Gradient({
      type: 'radial',
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
    if (g1.type !== g2.type) return false

    // Сравниваем цвета
    const stops1 = g1.colorStops || []
    const stops2 = g2.colorStops || []

    if (stops1.length !== stops2.length) return false

    const colorStopsEqual = stops1.every((stop1: { color: string; offset: number }, index: number) => {
      const stop2 = stops2[index]
      return stop1.color === stop2.color
        && Math.abs(stop1.offset - stop2.offset) < 0.0001
    })

    if (!colorStopsEqual) return false

    // Сравниваем координаты в зависимости от типа градиента
    if (g1.type === 'linear' && g2.type === 'linear') {
      return Math.abs(g1.coords.x1 - g2.coords.x1) < 0.0001
        && Math.abs(g1.coords.y1 - g2.coords.y1) < 0.0001
        && Math.abs(g1.coords.x2 - g2.coords.x2) < 0.0001
        && Math.abs(g1.coords.y2 - g2.coords.y2) < 0.0001
    }

    if (g1.type === 'radial' && g2.type === 'radial') {
      return Math.abs(g1.coords.x1 - g2.coords.x1) < 0.0001
        && Math.abs(g1.coords.y1 - g2.coords.y1) < 0.0001
        && Math.abs(g1.coords.x2 - g2.coords.x2) < 0.0001
        && Math.abs(g1.coords.y2 - g2.coords.y2) < 0.0001
        && Math.abs(g1.coords.r1 - g2.coords.r1) < 0.0001
        && Math.abs(g1.coords.r2 - g2.coords.r2) < 0.0001
    }

    return false
  }
}
