import { Rect, FabricImage, Gradient } from 'fabric'
import { ImageEditor } from '../index'

export type BackgroundType = 'color' | 'gradient' | 'image' | null

export default class BackgroundManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Текущий объект фона.
   */
  public backgroundObject: Rect | FabricImage | null

  /**
   * Тип текущего фона.
   */
  public backgroundType: BackgroundType

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.backgroundObject = null
    this.backgroundType = null
  }

  /**
   * Устанавливает фон сплошного цвета.
   * @param color - Цвет фона в формате HEX (например, "#FF0000")
   */
  public setColorBackground(color: string): void {
    try {
      const { historyManager } = this.editor

      historyManager.suspendHistory()

      if (this.backgroundObject && this.backgroundType === 'color') {
        // Обновляем существующий цветовой фон
        this.backgroundObject.set({ fill: color })
        this.editor.canvas.requestRenderAll()
      } else {
        // Создаем новый цветовой фон
        this._removeCurrentBackground()
        this._createColorBackground(color)
      }

      this.backgroundType = 'color'
      this.editor.canvas.fire('background:changed', { type: 'color', color })
      historyManager.resumeHistory()
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
   * @param gradientCSS - CSS градиент в формате linear-gradient(135deg, #79F1A4 0%, #0E5CAD 100%)
   */
  public setGradientBackground(gradientCSS: string): void {
    try {
      const { historyManager } = this.editor

      historyManager.suspendHistory()

      if (this.backgroundObject && this.backgroundType === 'gradient') {
        // Обновляем существующий градиентный фон
        const gradient = this._parseGradientCSS(gradientCSS)
        this.backgroundObject.set({ fill: gradient })
        this.editor.canvas.requestRenderAll()
      } else {
        // Создаем новый градиентный фон
        this._removeCurrentBackground()
        this._createGradientBackground(gradientCSS)
      }

      this.backgroundType = 'gradient'
      this.editor.canvas.fire('background:changed', { type: 'gradient', gradient: gradientCSS })
      historyManager.resumeHistory()
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
   * @param imageUrl - URL изображения
   */
  public async setImageBackground(imageUrl: string): Promise<void> {
    try {
      const { historyManager } = this.editor

      historyManager.suspendHistory()

      // Для изображений всегда пересоздаем фон
      this._removeCurrentBackground()
      await this._createImageBackground(imageUrl)

      this.backgroundType = 'image'
      this.editor.canvas.fire('background:changed', { type: 'image', imageUrl })
      historyManager.resumeHistory()
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
   */
  public removeBackground(): void {
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

    // Помещаем фон под все объекты
    this.editor.layerManager.sendToBack(this.backgroundObject, { withoutSave: true })

    canvas.requestRenderAll()
    historyManager.resumeHistory()
  }

  /**
   * Создает цветовой фон.
   */
  private _createColorBackground(color: string): void {
    this.backgroundObject = this.editor.shapeManager.addRectangle({
      fill: color,
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
      id: 'background'
    }, { withoutSelection: true })

    this._setupBackgroundPosition()
  }

  /**
   * Создает градиентный фон.
   */
  private _createGradientBackground(gradientCSS: string): void {
    const gradient = this._parseGradientCSS(gradientCSS)

    this.backgroundObject = this.editor.shapeManager.addRectangle({
      fill: gradient,
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
      id: 'background'
    }, { withoutSelection: true })

    this._setupBackgroundPosition()
  }

  /**
   * Создает фон из изображения.
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
          id: 'background'
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
      this.backgroundType = null
      this.editor.canvas.requestRenderAll()
    }
  }

  /**
   * Парсит CSS градиент и возвращает Fabric.js градиент.
   */
  private _parseGradientCSS(gradientCSS: string) {
    // Парсим строку вида: linear-gradient(135deg, #79F1A4 0%, #0E5CAD 100%)
    const match = gradientCSS.match(/linear-gradient\(([^,]+),\s*(.+)\)/)

    if (!match) {
      this.editor.errorManager.emitError({
        code: 'INVALID_GRADIENT_FORMAT',
        origin: 'BackgroundManager',
        method: '_parseGradientCSS',
        message: 'Неверный формат градиента'
      })
      throw new Error('Неверный формат градиента')
    }

    const angle = parseInt(match[1].replace('deg', ''))
    const stops = match[2].split(',').map((stop) => {
      const stopMatch = stop.trim().match(/([#\w]+)\s+(\d+)%/)
      if (!stopMatch) {
        this.editor.errorManager.emitError({
          code: 'INVALID_GRADIENT_FORMAT',
          origin: 'BackgroundManager',
          method: '_parseGradientCSS',
          message: 'Неверный формат остановки градиента'
        })
        throw new Error('Неверный формат остановки градиента')
      }

      return {
        offset: parseInt(stopMatch[2]) / 100,
        color: stopMatch[1]
      }
    })

    // Конвертируем угол в координаты для Fabric.js
    const angleRad = (angle * Math.PI) / 180
    const coords = BackgroundManager._angleToCoords(angleRad)

    return new Gradient({
      type: 'linear',
      coords,
      colorStops: stops
    })
  }

  /**
   * Конвертирует угол в координаты для линейного градиента.
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
}
