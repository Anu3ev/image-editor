import { Rect, FabricImage, Gradient, FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'
import { addRectangleToCanvas } from '../utils/primitive-shapes'

export type SetColorOptions = {
  color: string
  customData?: object
  fromTemplate?: boolean
  withoutSave?: boolean
}

export type GradientColorStop = {
  color: string
  offset: number // color position as a percentage (0-100)
}

export type LinearGradientBackground = {
  type: 'linear'
  angle: number // angle in degrees (0-360)
  startColor?: string // gradient start color in HEX (optional when colorStops is provided)
  endColor?: string // gradient end color in HEX (optional when colorStops is provided)
  startPosition?: number // start color position (0-100, defaults to 0)
  endPosition?: number // end color position (0-100, defaults to 100)
  colorStops?: GradientColorStop[] // Array of gradient colors
}

export type RadialGradientBackground = {
  type: 'radial'
  centerX?: number // center X position as a percentage (0-100, defaults to 50)
  centerY?: number // center Y position as a percentage (0-100, defaults to 50)
  radius?: number // radius as a percentage (0-100, defaults to 50)
  startColor?: string // gradient center color in HEX (optional when colorStops is provided)
  endColor?: string // gradient edge color in HEX (optional when colorStops is provided)
  startPosition?: number // start color position (0-100, defaults to 0)
  endPosition?: number // end color position (0-100, defaults to 100)
  colorStops?: GradientColorStop[] // Array of gradient colors
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

/** Options for setting an already prepared image object as the background. */
export type SetPreparedImageOptions = {
  image: FabricObject
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
   * Reference to the editor containing the canvas.
   */
  public editor: ImageEditor

  /**
   * Current background object.
   */
  public backgroundObject: Rect | FabricImage | FabricObject | null

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.backgroundObject = null
  }

  /**
   * Returns the canonical background rectangle geometry for the current artboard.
   * Color and gradient backgrounds must match montageArea directly,
   * without going through the generic fit/crop logic.
   */
  private _getMontageBackgroundRectOptions(): Pick<
  Rect,
  'width' | 'height' | 'left' | 'top' | 'originX' | 'originY' | 'scaleX' | 'scaleY' | 'angle' | 'flipX' | 'flipY'
  > {
    const { canvasManager } = this.editor
    const montageBounds = canvasManager.getMontageAreaSceneBounds()

    return {
      width: montageBounds.width,
      height: montageBounds.height,
      left: montageBounds.center.x,
      top: montageBounds.center.y,
      originX: 'center',
      originY: 'center',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false
    }
  }

  /**
   * Synchronizes the background geometry with the artboard.
   * Color and gradient backgrounds match montageArea directly;
   * image backgrounds continue to use cover-fit relative to montageArea.
   */
  private _syncBackgroundGeometry(): void {
    const { backgroundObject } = this

    if (!backgroundObject) return

    if (backgroundObject.backgroundType === 'image') {
      this.editor.transformManager.fitObject({
        object: backgroundObject,
        withoutSave: true,
        type: 'cover'
      })

      return
    }

    backgroundObject.set(this._getMontageBackgroundRectOptions())
    backgroundObject.setCoords()
  }

  /**
   * Sets a solid-color background.
   * @param options - Options for setting the background color
   * @param options.color - Background color in HEX format (for example, "#FF0000")
   * @param options.withoutSave - If true, do not save the state to history
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
          // Do nothing if the color has not changed
          historyManager.resumeHistory()
          return
        }

        // Update the existing color background
        backgroundObject.set({
          fill: color,
          backgroundId: `background-${nanoid()}`
        })
        this.editor.canvas.requestRenderAll()
      } else {
        // Create a new color background
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
   * Sets a gradient background.
   * @param options - Options for setting a gradient background
   * @param options.gradient - Object containing gradient parameters
   * @param options.withoutSave - If true, do not save the state to history
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
        // Update the existing gradient background
        const fabricGradient = BackgroundManager._createFabricGradient(gradient)

        if (BackgroundManager._isGradientEqual(backgroundObject.fill as GradientData, fabricGradient)) {
          // Do nothing if the gradient has not changed
          historyManager.resumeHistory()
          return
        }

        backgroundObject.set({
          fill: fabricGradient,
          backgroundId: `background-${nanoid()}`
        })
        this.editor.canvas.requestRenderAll()
      } else {
        // Create a new gradient background
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
   * Sets a linear gradient background.
   * @param options - Options for setting a linear gradient
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
   * Sets a radial gradient background.
   * @param options - Options for setting a radial gradient
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
   * Sets an image background.
   * @param options - Options for setting a background image
   * @param options.imageUrl - Image URL
   * @param options.withoutSave - If true, do not save the state to history
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
   * Sets an already prepared image object as the background.
   * Used by the restore/template path, where the source has already been materialized through ImageManager.
   */
  public setPreparedImageBackground({
    image,
    customData = {},
    fromTemplate = false,
    withoutSave = false
  }: SetPreparedImageOptions): void {
    const { historyManager } = this.editor
    let historySuspended = false

    try {
      historyManager.suspendHistory()
      historySuspended = true

      this._setImageBackgroundObject({ image, customData })

      this.editor.canvas.fire('editor:background:changed', {
        type: 'image',
        customData,
        fromTemplate,
        withoutSave,
        backgroundObject: this.backgroundObject
      })

      historyManager.resumeHistory()
      historySuspended = false

      if (!withoutSave) {
        historyManager.saveState()
      }
    } catch (error) {
      if (historySuspended) {
        historyManager.resumeHistory()
      }

      this.editor.errorManager.emitError({
        code: 'BACKGROUND_CREATION_FAILED',
        origin: 'BackgroundManager',
        method: 'setPreparedImageBackground',
        message: 'Не удалось установить подготовленное изображение в качестве фона',
        data: { error, image, customData, fromTemplate, withoutSave }
      })
    }
  }

  /**
   * Removes the current background.
   * @param options - Options for removing the background
   * @param options.withoutSave - If true, do not save the state to history
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
   * Updates the background size and position to match the artboard.
   */
  public refresh(): void {
    const {
      canvas,
      montageArea,
      historyManager
    } = this.editor

    if (!montageArea || !this.backgroundObject) return

    historyManager.suspendHistory()

    this._syncBackgroundGeometry()

    // Check whether the background is in the correct position (immediately after montageArea)
    const objects = canvas.getObjects()
    const montageIndex = objects.indexOf(montageArea)
    const backgroundIndex = objects.indexOf(this.backgroundObject)

    // Move the background only if it is not in the correct position
    if (this.backgroundObject && backgroundIndex !== montageIndex + 1) {
      // Use moveObjectTo for precise positioning without duplication
      canvas.moveObjectTo(this.backgroundObject, montageIndex + 1)
    }

    canvas.requestRenderAll()
    historyManager.resumeHistory()
  }

  /**
   * Creates a color background.
   * @param color - Background color in HEX format (for example, "#FF0000")
   */
  private _createColorBackground(color: string): void {
    this.backgroundObject = addRectangleToCanvas({
      canvas: this.editor.canvas,
      options: {
        ...this._getMontageBackgroundRectOptions(),
        fill: color,
        selectable: false,
        evented: false,
        hasBorders: false,
        hasControls: false,
        id: 'background',
        backgroundType: 'color',
        backgroundId: `background-${nanoid()}`
      },
      flags: { withoutSelection: true }
    })

    this.refresh()
  }

  /**
   * Creates a gradient background.
   * @param gradient - Object containing gradient parameters
   */
  private _createGradientBackground(gradient: GradientBackground): void {
    // First create a rectangle without a gradient
    this.backgroundObject = addRectangleToCanvas({
      canvas: this.editor.canvas,
      options: {
        ...this._getMontageBackgroundRectOptions(),
        fill: '#ffffff',
        selectable: false,
        evented: false,
        hasBorders: false,
        hasControls: false,
        id: 'background',
        backgroundType: 'gradient',
        backgroundId: `background-${nanoid()}`
      },
      flags: { withoutSelection: true }
    })

    this.refresh()

    // Create the gradient after setting the position
    const fabricGradient = BackgroundManager._createFabricGradient(gradient)
    this.backgroundObject.set('fill', fabricGradient)
    this.editor.canvas.requestRenderAll()
  }

  /**
   * Creates an image background.
   * @param source - Image source (URL or File)
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

    this._setImageBackgroundObject({ image, customData })
  }

  /**
   * Assigns an image object as the current background and brings it into compliance with the background contract.
   */
  private _setImageBackgroundObject({
    image,
    customData
  }: {
    image: FabricObject
    customData: object
  }): void {
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

    // Remove the old background before setting the new one
    this._removeCurrentBackground()

    if (image.canvas !== this.editor.canvas) {
      this.editor.canvas.add(image)
    }

    this.backgroundObject = image
    this.refresh()
  }

  /**
   * Removes the current background.
   */
  private _removeCurrentBackground(): void {
    if (this.backgroundObject) {
      this.editor.canvas.remove(this.backgroundObject)
      this.backgroundObject = null
      this.editor.canvas.renderAll()
    }
  }

  /**
   * Creates a Fabric.js gradient from the parameters.
   * @param gradient - Object containing gradient parameters
   */
  private static _createFabricGradient(gradient: GradientBackground): Gradient<'linear'> | Gradient<'radial'> {
    const {
      startColor,
      endColor,
      startPosition = 0,
      endPosition = 100,
      colorStops: providedStops
    } = gradient

    // Create color stops
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
      // Fallback when colors are not provided
      colorStops = [
        { offset: 0, color: '#000000' },
        { offset: 1, color: '#ffffff' }
      ]
    }

    if (gradient.type === 'linear') {
      // Convert the angle to Fabric.js coordinates
      const angleRad = (gradient.angle * Math.PI) / 180
      const coords = BackgroundManager._angleToCoords(angleRad)

      return new Gradient({
        type: 'linear',
        gradientUnits: 'percentage',
        coords,
        colorStops
      })
    }

    // Radial gradient
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
   * Converts an angle to coordinates for a linear gradient.
   * @param angle - Angle in radians
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
   * Compares two gradients for equality
   * @param gradient1 - First gradient
   * @param gradient2 - Second gradient
   * @returns true if the gradients are identical
   */
  private static _isGradientEqual(g1: GradientData, g2: GradientData): boolean {
    // Check that both objects are gradients
    if (!g1 || !g2) return false
    if (g1.type !== g2.type) return false

    // Compare colors
    const stops1 = g1.colorStops || []
    const stops2 = g2.colorStops || []

    if (stops1.length !== stops2.length) return false

    const colorStopsEqual = stops1.every((stop1: { color: string; offset: number }, index: number) => {
      const stop2 = stops2[index]
      return stop1.color === stop2.color
        && Math.abs(stop1.offset - stop2.offset) < 0.0001
    })

    if (!colorStopsEqual) return false

    // Compare coordinates according to the gradient type
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
