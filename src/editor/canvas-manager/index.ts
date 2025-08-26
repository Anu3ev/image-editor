import { FabricObject, Point, ActiveSelection } from 'fabric'
import { ImageEditor } from '../index'

import {
  CANVAS_MIN_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT
} from '../constants'

export interface SetResolutionOptions {
  preserveProportional?: boolean
  withoutSave?: boolean
  adaptCanvasToContainer?: boolean
}

export interface setDisplayDimensionOptions {
  element?: 'canvas' | 'wrapper' | 'container'
  dimension?: 'width' | 'height'
  value?: string | number
}

export interface ScaleMontageAreaToImageOptions {
  object?: FabricObject
  preserveAspectRatio?: boolean
  withoutSave?: boolean
}

// Вспомогательные функции для тестирования
export const clampValue = (value: number, min: number, max: number): number => Math.max(Math.min(value, max), min)

export const calculateProportionalDimension = (base: number, factor: number): number => base * factor

export const calculateCanvasCenterPoint = (width: number, height: number): Point => new Point(width / 2, height / 2)

export function isImageObject(object: FabricObject | null | undefined): boolean {
  return object?.type === 'image' || object?.format === 'svg'
}

export default class CanvasManager {
  /**
   * Инстанс редактора с доступом к canvas
   */
  public editor: ImageEditor

  /**
   * @param options
   * @param options.editor – экземпляр редактора
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Возвращает контейнер редактора
   */
  public getEditorContainer(): HTMLElement {
    const { canvas, options: { editorContainer } } = this.editor
    return (canvas.editorContainer || editorContainer) as HTMLElement
  }

  /**
   * Устанавливаем внутреннюю ширину канваса (для экспорта)
   * @param width - ширина канваса
   * @param options
   * @param options.preserveProportional - Сохранить пропорции
   * @param options.withoutSave - Не сохранять состояние
   * @param options.adaptCanvasToContainer - Адаптировать канвас к контейнеру
   * @fires editor:resolution-width-changed
   */
  public setResolutionWidth(
    width: string | number,
    { preserveProportional, withoutSave, adaptCanvasToContainer }: SetResolutionOptions = {}
  ): void {
    if (!width) return

    const {
      canvas,
      montageArea,
      options: { canvasBackstoreWidth }
    } = this.editor

    const { width: montageAreaWidth, height: montageAreaHeight } = montageArea

    const adjustedWidth = clampValue(Number(width), CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH)

    // Если ширина канваса не задана или равна 'auto', адаптируем канвас к контейнеру
    if (!canvasBackstoreWidth || canvasBackstoreWidth === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreWidth) {
      this.setCanvasBackstoreWidth(Number(canvasBackstoreWidth))
    } else {
      this.setCanvasBackstoreWidth(adjustedWidth)
    }

    // Обновляем размеры montageArea и clipPath
    montageArea.set({ width: adjustedWidth })
    canvas.clipPath?.set({ width: adjustedWidth })

    // Если нужно сохранить пропорции, вычисляем новую высоту
    if (preserveProportional) {
      const factor = adjustedWidth / montageAreaWidth
      const newHeight = calculateProportionalDimension(montageAreaHeight, factor)
      this.setResolutionHeight(newHeight)

      return
    }

    const { left, top } = this.getObjectDefaultCoords(montageArea)

    const currentZoom = canvas.getZoom()
    canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, left, top])

    this.centerMontageArea()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:resolution-width-changed', {
      width: adjustedWidth,
      preserveProportional,
      withoutSave,
      adaptCanvasToContainer
    })
  }

  /**
   * Устанавливаем внутреннюю высоту канваса (для экспорта)
   * @param height - высота канваса
   * @param options
   * @param options.preserveProportional - Сохранить пропорции
   * @param options.withoutSave - Не сохранять состояние
   * @param options.adaptCanvasToContainer - Адаптировать канвас к контейнеру
   * @fires editor:resolution-height-changed
   */
  public setResolutionHeight(
    height: string | number,
    { preserveProportional, withoutSave, adaptCanvasToContainer }: SetResolutionOptions = {}
  ): void {
    if (!height) return

    const {
      canvas,
      montageArea,
      options: { canvasBackstoreHeight }
    } = this.editor

    const { width: montageAreaWidth, height: montageAreaHeight } = montageArea

    const adjustedHeight = clampValue(Number(height), CANVAS_MIN_HEIGHT, CANVAS_MAX_HEIGHT)

    if (!canvasBackstoreHeight || canvasBackstoreHeight === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreHeight) {
      this.setCanvasBackstoreHeight(Number(canvasBackstoreHeight))
    } else {
      this.setCanvasBackstoreHeight(adjustedHeight)
    }

    // Обновляем размеры montageArea и clipPath
    montageArea.set({ height: adjustedHeight })
    canvas.clipPath?.set({ height: adjustedHeight })

    // Если нужно сохранить пропорции, вычисляем новую ширину
    if (preserveProportional) {
      const factor = adjustedHeight / montageAreaHeight
      const newWidth = calculateProportionalDimension(montageAreaWidth, factor)

      this.setResolutionWidth(newWidth)

      return
    }

    const { left, top } = this.getObjectDefaultCoords(montageArea)

    const currentZoom = canvas.getZoom()
    canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, left, top])

    this.centerMontageArea()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:resolution-height-changed', {
      height: adjustedHeight,
      preserveProportional,
      withoutSave,
      adaptCanvasToContainer
    })
  }

  /**
   * Центрирует монтажную область и ClipPath точно по центру канваса
   * и устанавливает правильный viewportTransform.
   */
  public centerMontageArea(): void {
    const { canvas, montageArea } = this.editor

    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()

    const currentZoom = canvas.getZoom()

    const centerCanvasPoint = calculateCanvasCenterPoint(canvasWidth, canvasHeight)

    // Устанавливаем origin монтажной области в центр канваса без зума
    montageArea.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2
    })

    canvas.clipPath?.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2
    })

    canvas.renderAll()

    // Заново устанавливаем viewportTransform, чтобы монтажная область была точно по центру с учётом зума
    const vpt = canvas.viewportTransform
    vpt[4] = canvasWidth / 2 - centerCanvasPoint.x * currentZoom
    vpt[5] = canvasHeight / 2 - centerCanvasPoint.y * currentZoom

    canvas.setViewportTransform(vpt)
    canvas.renderAll()
  }

  /**
   * Метод для получения координат объекта с учетом текущего зума
   * @param object - объект, координаты которого нужно получить
   * @returns координаты объекта
   */
  public getObjectDefaultCoords(object: FabricObject): { left: number, top: number } {
    const { canvas } = this.editor

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) {
      this.editor.errorManager.emitError({
        origin: 'CanvasManager',
        method: 'getObjectDefaultCoords',
        code: 'NO_ACTIVE_OBJECT',
        message: 'Не выбран объект для получения координат'
      })

      return { left: 0, top: 0 }
    }

    const { width, height } = activeObject

    const currentZoom = canvas.getZoom()
    const left = (width - (width * currentZoom)) / 2
    const top = (height - (height * currentZoom)) / 2

    return { left, top }
  }

  /**
   * Устанавливаем ширину канваса в backstore (для экспорта)
   */
  public setCanvasBackstoreWidth(width: number): void {
    if (!width || typeof width !== 'number') return

    const adjustedWidth = clampValue(width, CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH)

    this.editor.canvas.setDimensions({ width: adjustedWidth }, { backstoreOnly: true })
  }

  /**
   * Устанавливаем высоту канваса в backstore (для экспорта)
   * @param height
   */
  public setCanvasBackstoreHeight(height: number): void {
    if (!height || typeof height !== 'number') return

    const adjustedHeight = clampValue(height, CANVAS_MIN_HEIGHT, CANVAS_MAX_HEIGHT)

    this.editor.canvas.setDimensions({ height: adjustedHeight }, { backstoreOnly: true })
  }

  /**
   * Адаптирует размеры канваса к размерам контейнера редактора.
   * Устанавливает ширину и высоту канваса в зависимости от размеров контейнера
   * с учётом минимальных и максимальных значений.
   */
  public adaptCanvasToContainer(): void {
    const { canvas } = this.editor

    const container = this.getEditorContainer()
    const cw = container.clientWidth
    const ch = container.clientHeight

    const width = clampValue(cw, CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH)
    const height = clampValue(ch, CANVAS_MIN_HEIGHT, CANVAS_MAX_HEIGHT)

    canvas.setDimensions({ width, height }, { backstoreOnly: true })
  }

  /**
   * Обновляет размеры канваса без изменения позиций объектов.
   * Используется при resize окна браузера для сохранения расположения объектов.
   * @fires editor:canvas-updated
   */
  public updateCanvas(): void {
    const {
      canvas,
      montageArea,
      montageArea: {
        width: montageAreaWidth,
        height: montageAreaHeight
      }
    } = this.editor

    // Сохраняем старую позицию монтажной области
    const oldMontageLeft = montageArea.left
    const oldMontageTop = montageArea.top

    // Заново адаптируем канвас к контейнеру
    this.setResolutionWidth(montageAreaWidth, { adaptCanvasToContainer: true, withoutSave: true })
    this.setResolutionHeight(montageAreaHeight, { adaptCanvasToContainer: true, withoutSave: true })

    // Центрируем монтажную область
    this.centerMontageArea()

    // Рассчитываем смещение монтажной области
    const deltaX = montageArea.left - oldMontageLeft
    const deltaY = montageArea.top - oldMontageTop

    // Смещаем все объекты на ту же дельту, что и монтажная область
    if (deltaX !== 0 || deltaY !== 0) {
      const activeObject = canvas.getActiveObject()
      const selectedObjects: FabricObject[] = []

      // Если есть активное выделение, сохраняем список выделенных объектов
      if (activeObject?.type === 'activeselection') {
        const activeSelection = activeObject as ActiveSelection
        selectedObjects.push(...activeSelection.getObjects())
        canvas.discardActiveObject() // Снимаем выделение перед перемещением
      }

      canvas.getObjects().forEach((obj) => {
        // Пропускаем служебные объекты
        if (obj.id === 'montage-area' || obj.id === 'overlay-mask') return

        obj.set({
          left: obj.left + deltaX,
          top: obj.top + deltaY
        })
        obj.setCoords()
      })

      // Восстанавливаем выделение если оно было
      if (selectedObjects.length > 0) {
        if (selectedObjects.length === 1) {
          canvas.setActiveObject(selectedObjects[0])
        } else {
          const newSelection = new ActiveSelection(selectedObjects, {
            canvas
          })
          canvas.setActiveObject(newSelection)
        }
      }
    }

    canvas.renderAll()

    canvas.fire('editor:canvas-updated', {
      width: montageAreaWidth,
      height: montageAreaHeight
    })
  }

  /**
   * Заготовка.
   * Обновляет CSS-размеры канваса в зависимости от текущего зума, чтобы можно было скроллить вниз-вверх, влево-вправо.
   *
   * TODO: Сейчас изображение обрезается при зуме.
   * Нужно сделать зум по курсору мыши внутри монтажной области, и возможность перетаскивать канвас с зажатым пробелом.
   *
   * Метод нужно вызывать после zoomToPoint.
   *
   * @param zoom — текущее значение zoom (например, 1, 1.2, 2 и т.д.)
   */
  // public updateCssDimensionsForZoom(zoom: number): void {
  //   const { canvas, montageArea } = this.editor

  //   const zoomedWidth = montageArea.width * zoom
  //   const zoomedHeight = montageArea.height * zoom
  //   const scrollContainer = canvas.wrapperEl.parentNode

  //   if (!(scrollContainer instanceof HTMLElement)) return

  //   const cssWidth = zoomedWidth <= scrollContainer.clientWidth ? '100%' : zoomedWidth
  //   const cssHeight = zoomedHeight <= scrollContainer.clientHeight ? '100%' : zoomedHeight

  //   canvas.setDimensions(
  //     { width: cssWidth, height: cssHeight },
  //     { cssOnly: true }
  //   )
  // }

  /**
   * Устанавливаем CSS ширину канваса для отображения
   * @param width
   * @fires editor:display-canvas-width-changed
   */
  public setCanvasCSSWidth(value: string | number): void {
    this.setDisplayDimension({
      element: 'canvas',
      dimension: 'width',
      value
    })
  }

  /**
   * Устанавливаем CSS высоту канваса для отображения
   * @param height
   * @fires editor:display-canvas-height-changed
   */
  public setCanvasCSSHeight(value: string | number): void {
    this.setDisplayDimension({
      element: 'canvas',
      dimension: 'height',
      value
    })
  }

  /**
   * Устанавливаем CSS ширину обертки канваса для отображения
   * @param width
   * @fires editor:display-wrapper-width-changed
   */
  public setCanvasWrapperWidth(value: string | number): void {
    this.setDisplayDimension({
      element: 'wrapper',
      dimension: 'width',
      value
    })
  }

  /**
   * Устанавливаем CSS высоту обертки канваса для отображения
   * @param height
   * @fires editor:display-wrapper-height-changed
   */
  public setCanvasWrapperHeight(value: string | number): void {
    this.setDisplayDimension({
      element: 'wrapper',
      dimension: 'height',
      value
    })
  }

  /**
   * Устанавливаем CSS ширину контейнера редактора для отображения
   * @param width
   * @fires editor:display-container-width-changed
   */
  public setEditorContainerWidth(value: string | number): void {
    this.setDisplayDimension({
      element: 'container',
      dimension: 'width',
      value
    })
  }

  /**
   * Устанавливаем CSS высоту контейнера редактора для отображения
   * @param height
   * @fires editor:display-container-height-changed
   */
  public setEditorContainerHeight(value: string | number): void {
    this.setDisplayDimension({
      element: 'container',
      dimension: 'height',
      value
    })
  }

  /**
   * Устанавливаем CSS ширину или высоту канваса для отображения
   * @param options
   * @param options.element - элемент, для которого устанавливаем размеры:
   * canvas (upper & lower), wrapper, container
   * @param options.dimension - размер, который нужно установить: width или height
   * @param options.value - значение размера (строка или число)
   * @fires editor:display-{element}-{dimension}-changed
   */
  public setDisplayDimension({ element = 'canvas', dimension, value }: setDisplayDimensionOptions = {}): void {
    if (!value) return

    const { canvas } = this.editor

    const canvasElements = []

    switch (element) {
    case 'canvas':
      canvasElements.push(canvas.lowerCanvasEl, canvas.upperCanvasEl)
      break
    case 'wrapper':
      canvasElements.push(canvas.wrapperEl)
      break
    case 'container':
      canvasElements.push(this.getEditorContainer())
      break
    default:
      canvasElements.push(canvas.lowerCanvasEl, canvas.upperCanvasEl)
    }

    const cssDimension = dimension === 'width' ? 'width' : 'height'

    // Если строка, то просто устанавливаем
    if (typeof value === 'string') {
      canvasElements.forEach((el) => { (el!).style[cssDimension] = value })

      return
    }

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(value)) return

    const newValuePx = `${value}px`
    canvasElements.forEach((el) => { (el!).style[cssDimension] = newValuePx })

    canvas.fire(`editor:display-${element}-${cssDimension}-changed`, {
      element,
      value
    })
  }

  /**
   * Если изображение вписывается в допустимые значения, то масштабируем под него канвас
   * @param options
   * @param options.object - Объект с изображением, которое нужно масштабировать
   * @param options.withoutSave - Не сохранять состояние
   * @param options.preserveAspectRatio - Сохранять изначальные пропорции монтажной области
   * @fires editor:montage-area-scaled-to-image
   */
  public scaleMontageAreaToImage(
    { object, preserveAspectRatio, withoutSave }: ScaleMontageAreaToImageOptions = {}
  ): void {
    const {
      canvas,
      montageArea,
      transformManager,
      options: {
        montageAreaWidth: initialMontageAreaWidth,
        montageAreaHeight: initialMontageAreaHeight
      }
    } = this.editor

    const image = object || canvas.getActiveObject()

    if (!isImageObject(image)) return

    // TypeScript теперь знает, что image точно не null/undefined
    const { width: imageWidth, height: imageHeight } = image!

    let newCanvasWidth = Math.min(imageWidth, CANVAS_MAX_WIDTH)
    let newCanvasHeight = Math.min(imageHeight, CANVAS_MAX_HEIGHT)

    if (preserveAspectRatio) {
      const {
        width: currentMontageAreaWidth,
        height: currentMontageAreaHeight
      } = montageArea

      const widthMultiplier = imageWidth / currentMontageAreaWidth
      const heightMultiplier = imageHeight / currentMontageAreaHeight

      const multiplier = Math.max(widthMultiplier, heightMultiplier)

      newCanvasWidth = currentMontageAreaWidth * multiplier
      newCanvasHeight = currentMontageAreaHeight * multiplier
    }

    this.setResolutionWidth(newCanvasWidth, { withoutSave: true })
    this.setResolutionHeight(newCanvasHeight, { withoutSave: true })

    // Если изображение больше монтажной области, то устанавливаем зум по умолчанию
    if (imageWidth > initialMontageAreaWidth || imageHeight > initialMontageAreaHeight) {
      transformManager.calculateAndApplyDefaultZoom()
    }

    transformManager.resetObject(image!, { withoutSave: true })
    canvas.centerObject(image!)
    canvas.renderAll()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:montage-area-scaled-to-image', {
      object: image!,
      width: newCanvasWidth,
      height: newCanvasHeight,
      preserveAspectRatio,
      withoutSave
    })
  }

  /**
   * Очистка холста
   * @fires editor:cleared
   */
  public clearCanvas() {
    const { canvas, montageArea, historyManager } = this.editor

    historyManager.suspendHistory()

    // Полностью очищаем канвас (удаляются все объекты, фоны, оверлеи и т.д.)
    canvas.clear()

    // Добавляем монтажную область обратно
    canvas.add(montageArea)

    canvas.renderAll()
    historyManager.resumeHistory()

    historyManager.saveState()

    canvas?.fire('editor:cleared')
  }

  /**
   * Установка зума и масштаба для канваса и сброс трансформации всех объектов
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:default-scale-set
   */
  public setDefaultScale({ withoutSave }: { withoutSave?: boolean } = {}) {
    const {
      canvas,
      transformManager,
      historyManager,
      options: {
        montageAreaWidth: initialMontageAreaWidth,
        montageAreaHeight: initialMontageAreaHeight
      }
    } = this.editor

    transformManager.resetZoom()

    this.setResolutionWidth(initialMontageAreaWidth, { withoutSave: true })
    this.setResolutionHeight(initialMontageAreaHeight, { withoutSave: true })
    canvas.renderAll()

    transformManager.resetObjects()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:default-scale-set')
  }

  /**
   * Получение всех объектов внутри монтажной области редактора
   * @returns массив объектов
   */
  public getObjects(): FabricObject[] {
    const { canvas, montageArea, interactionBlocker: { overlayMask } } = this.editor

    const canvasObjects = canvas.getObjects()

    return canvasObjects.filter((obj) => obj.id !== montageArea.id && obj.id !== overlayMask?.id)
  }
}
