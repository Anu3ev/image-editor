import { FabricObject, Point } from 'fabric'
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

type MontageAreaSceneBounds = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  center: Point
}

// Вспомогательные функции для тестирования
export const clampValue = (value: number, min: number, max: number): number => Math.max(Math.min(value, max), min)

export const calculateProportionalDimension = (base: number, factor: number): number => base * factor

export function isImageObject(
  object: FabricObject | null | undefined
): object is FabricObject & { width: number; height: number } {
  return (object?.type === 'image' || object?.format === 'svg')
    && typeof object?.width === 'number'
    && typeof object?.height === 'number'
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
   * Возвращает центральную точку текущей видимой области канваса.
   * Если точка находится за пределами монтажной области, она проецируется на ближайшую границу монтажной области.
   * Scene coordinates монтажной области здесь считаются каноническими, а viewportTransform
   * выступает единственным camera-state для pan/zoom и визуального центрирования.
   */
  public getVisibleCenterPoint(): Point {
    const { canvas } = this.editor
    const zoom = canvas.getZoom()
    const vpt = canvas.viewportTransform
    const width = canvas.getWidth()
    const height = canvas.getHeight()
    const montageBounds = this.getMontageAreaSceneBounds()

    // Рассчитываем центр вьюпорта в координатах канваса
    const viewportCenterX = (width / 2 - vpt[4]) / zoom
    const viewportCenterY = (height / 2 - vpt[5]) / zoom

    const clampedX = clampValue(
      viewportCenterX,
      montageBounds.left,
      montageBounds.right
    )
    const clampedY = clampValue(
      viewportCenterY,
      montageBounds.top,
      montageBounds.bottom
    )

    return new Point(clampedX, clampedY)
  }

  /**
   * Возвращает текущий центр монтажной области в scene coordinates.
   */
  public getMontageAreaSceneCenter(): Point {
    const { montageArea } = this.editor
    return new Point(montageArea.left, montageArea.top)
  }

  /**
   * Возвращает канонический центр монтажной области в scene coordinates.
   * Каноническая модель держит top-left монтажной области в точке (0, 0),
   * поэтому центр определяется только её размером.
   */
  public getMontageAreaCanonicalSceneCenter(): Point {
    const { montageArea } = this.editor
    return new Point(montageArea.width / 2, montageArea.height / 2)
  }

  /**
   * Возвращает границы монтажной области в scene coordinates.
   */
  public getMontageAreaSceneBounds(): MontageAreaSceneBounds {
    const { montageArea } = this.editor
    const center = this.getMontageAreaSceneCenter()
    const halfWidth = montageArea.width / 2
    const halfHeight = montageArea.height / 2

    return {
      left: center.x - halfWidth,
      top: center.y - halfHeight,
      right: center.x + halfWidth,
      bottom: center.y + halfHeight,
      width: montageArea.width,
      height: montageArea.height,
      center
    }
  }

  /**
   * Центрирует объект относительно монтажной области в scene coordinates.
   */
  public centerObjectToMontageArea({ object }: { object: FabricObject }): void {
    const montageCenter = this.getMontageAreaSceneCenter()

    object.setPositionByOrigin(montageCenter, 'center', 'center')
    object.setCoords()
  }

  /**
   * Синхронизирует clipPath с текущей геометрией монтажной области.
   * clipPath является derived state и не должен жить своей persisted-позицией.
   */
  public syncClipPathWithMontageArea(): void {
    const {
      canvas,
      montageArea
    } = this.editor
    const { clipPath } = canvas

    if (!clipPath) return

    clipPath.set({
      left: montageArea.left,
      top: montageArea.top,
      width: montageArea.width,
      height: montageArea.height,
      originX: montageArea.originX,
      originY: montageArea.originY
    })
    clipPath.setCoords()
  }

  /**
   * Приводит montageArea и clipPath к каноническому scene-placement.
   * В канонической модели top-left монтажной области всегда равен (0, 0),
   * а её центр определяется только текущими width и height.
   */
  public placeMontageAreaAtCanonicalScenePosition(): void {
    const { montageArea } = this.editor
    const canonicalCenter = this.getMontageAreaCanonicalSceneCenter()

    montageArea.set({
      left: canonicalCenter.x,
      top: canonicalCenter.y
    })
    montageArea.setCoords()

    this.syncClipPathWithMontageArea()
  }

  /**
   * Обновляет derived-слои, которые завязаны на монтажную область и текущий viewport.
   */
  public refreshMontageDerivedState(): void {
    const { backgroundManager, interactionBlocker } = this.editor

    if (backgroundManager.backgroundObject) {
      backgroundManager.refresh()
    }

    if (interactionBlocker.isBlocked) {
      interactionBlocker.refresh()
    }
  }

  /**
   * Устанавливаем внутреннюю ширину канваса (для экспорта)
   * @param width - ширина канваса
   * @param options
   * @param options.preserveProportional - Сохранить пропорции
   * @param options.withoutSave - Не сохранять состояние
   * @param options.adaptCanvasToContainer - Адаптировать канвас к контейнеру
   * При изменении размеров монтажной области редактор пересчитывает defaultZoom
   * и нормализует текущий camera-state к новому fit-состоянию.
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
    this.placeMontageAreaAtCanonicalScenePosition()

    // Если нужно сохранить пропорции, вычисляем новую высоту
    if (preserveProportional) {
      const factor = adjustedWidth / montageAreaWidth
      const newHeight = calculateProportionalDimension(montageAreaHeight, factor)
      this.setResolutionHeight(newHeight, {
        withoutSave,
        adaptCanvasToContainer
      })

      return
    }

    this.editor.zoomManager.calculateAndApplyDefaultZoom()
    this.refreshMontageDerivedState()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:resolution-width-changed', {
      width: adjustedWidth,
      preserveProportional,
      withoutSave,
      adaptCanvasToContainer
    })

    // обновляем границы перетаскивания
    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Устанавливаем внутреннюю высоту канваса (для экспорта)
   * @param height - высота канваса
   * @param options
   * @param options.preserveProportional - Сохранить пропорции
   * @param options.withoutSave - Не сохранять состояние
   * @param options.adaptCanvasToContainer - Адаптировать канвас к контейнеру
   * При изменении размеров монтажной области редактор пересчитывает defaultZoom
   * и нормализует текущий camera-state к новому fit-состоянию.
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
    this.placeMontageAreaAtCanonicalScenePosition()

    // Если нужно сохранить пропорции, вычисляем новую ширину
    if (preserveProportional) {
      const factor = adjustedHeight / montageAreaHeight
      const newWidth = calculateProportionalDimension(montageAreaWidth, factor)

      this.setResolutionWidth(newWidth, {
        withoutSave,
        adaptCanvasToContainer
      })

      return
    }

    this.editor.zoomManager.calculateAndApplyDefaultZoom()
    this.refreshMontageDerivedState()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:resolution-height-changed', {
      height: adjustedHeight,
      preserveProportional,
      withoutSave,
      adaptCanvasToContainer
    })

    // обновляем границы перетаскивания
    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Центрирует viewport на монтажной области, не меняя scene coordinates.
   * Метод отвечает только за camera-state через viewportTransform.
   */
  public centerViewportToMontageArea(): void {
    const { canvas } = this.editor
    const currentZoom = canvas.getZoom()
    const montageCenter = this.getMontageAreaSceneCenter()
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()

    canvas.setViewportTransform([
      currentZoom,
      0,
      0,
      currentZoom,
      viewportWidth / 2 - montageCenter.x * currentZoom,
      viewportHeight / 2 - montageCenter.y * currentZoom
    ])
    canvas.renderAll()
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
   * Используется при resize окна браузера.
   *
   * В camera-only модели resize контейнера меняет только размеры canvas и viewportTransform.
   * Scene coordinates пользовательских объектов и montageArea при этом остаются стабильными,
   * а defaultZoom пересчитывается как derived camera-state для нового viewport.
   * @fires editor:canvas-updated
   */
  public updateCanvas(): void {
    const {
      canvas,
      montageArea: {
        width: montageAreaWidth,
        height: montageAreaHeight
      }
    } = this.editor

    this.adaptCanvasToContainer()
    this.placeMontageAreaAtCanonicalScenePosition()
    this.editor.zoomManager.updateDefaultZoom()
    this.centerViewportToMontageArea()
    this.refreshMontageDerivedState()

    canvas.fire('editor:canvas-updated', {
      width: montageAreaWidth,
      height: montageAreaHeight
    })

    // обновляем границы перетаскивания
    this.editor.panConstraintManager.updateBounds()
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
      transformManager
    } = this.editor

    const image = object || canvas.getActiveObject()

    if (!isImageObject(image)) return

    const { width: imageWidth, height: imageHeight } = image

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

    transformManager.resetObject({ object: image, withoutSave: true })
    this.centerObjectToMontageArea({ object: image })
    canvas.renderAll()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:montage-area-scaled-to-image', {
      object: image,
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

    this.editor.zoomManager.resetZoom()

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
    const {
      canvas,
      montageArea,
      interactionBlocker: { overlayMask },
      backgroundManager: { backgroundObject }
    } = this.editor

    const canvasObjects = canvas.getObjects()

    return canvasObjects.filter(
      (obj) => obj.id !== montageArea.id
               && obj.id !== overlayMask?.id
               && obj.id !== backgroundObject?.id
    )
  }
}
