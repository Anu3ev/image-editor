import { ActiveSelection, CanvasOptions, FabricObject } from 'fabric'
import { ImageEditor } from '../index'

import {
  DEFAULT_ROTATE_RATIO
} from '../constants'
import { resolveShapeGroupFromTarget } from '../shape-manager/domain/shape-reference'

export type ResetObjectOptions = {
  object?: FabricObject
  alwaysFitObject?: boolean
  withoutSave?: boolean
}

export default class TransformManager {
  /**
   * Инстанс редактора с доступом к canvas
   */
  public editor: ImageEditor

  /**
   * Параметры (опции) для слушателей.
   */
  public options: CanvasOptions

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.options = editor.options
  }

  /**
   * Устанавливает абсолютный угол поворота объекта
   * @param object - Целевой объект
   * @param angle - Абсолютный угол в градусах
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  public setAngle(
    object: FabricObject,
    angle: number,
    { withoutSave }: { withoutSave?: boolean } = {}
  ): void {
    const { canvas, historyManager } = this.editor

    if (!object) return

    object.rotate(angle)
    object.setCoords()
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-rotated', {
      object,
      withoutSave,
      angle
    })
  }

  /**
   * Поворот активного объекта на относительный угол
   * @param angle
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  public rotate(angle: number = DEFAULT_ROTATE_RATIO, { withoutSave }: { withoutSave?: boolean } = {}): void {
    const { canvas } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return

    const newAngle = (obj.angle ?? 0) + angle
    this.setAngle(obj, newAngle, { withoutSave })
  }

  /**
   * Отразить по горизонтали
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-x
   */
  public flipX({ withoutSave }: { withoutSave?: boolean } = {}): void {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipX = !obj.flipX
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-flipped-x', {
      object: obj,
      withoutSave
    })
  }

  /**
   * Отразить по вертикали
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-y
   */
  public flipY({ withoutSave }: { withoutSave?: boolean } = {}): void {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipY = !obj.flipY
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-flipped-y', {
      object: obj,
      withoutSave
    })
  }

  /**
   * Установка прозрачности объекта
   * @param options
   * @param options.object - Объект, для которого нужно установить прозрачность
   * @param options.withoutSave - Не сохранять состояние
   * @param options.opacity - Прозрачность от 0 до 1
   * @fires editor:object-opacity-changed
   */
  public setActiveObjectOpacity({
    object,
    opacity = 1,
    withoutSave
  }: { object?: FabricObject; opacity?: number; withoutSave?: boolean } = {}): void {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    let hasAppliedOpacity = false

    if (activeObject instanceof ActiveSelection) {
      const objects = activeObject.getObjects()

      for (let index = 0; index < objects.length; index += 1) {
        const selectionObject = objects[index]
        const isApplied = this._setCanvasObjectOpacity({
          object: selectionObject,
          opacity
        })

        hasAppliedOpacity = hasAppliedOpacity || isApplied
      }
    } else {
      hasAppliedOpacity = this._setCanvasObjectOpacity({
        object: activeObject,
        opacity
      })
    }

    if (!hasAppliedOpacity) return

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-opacity-changed', {
      object: activeObject,
      opacity,
      withoutSave
    })
  }

  /**
   * Устанавливает opacity с учетом доменного контракта shape-group.
   */
  private _setCanvasObjectOpacity({
    object,
    opacity
  }: {
    object: FabricObject
    opacity: number
  }): boolean {
    const shapeGroup = resolveShapeGroupFromTarget({ target: object })

    if (shapeGroup) {
      const updated = this.editor.shapeManager.setOpacity({
        target: shapeGroup,
        opacity,
        withoutSave: true
      })

      return Boolean(updated)
    }

    object.set('opacity', opacity)

    return true
  }

  /**
   * Масштабирование объекта
   * @param options
   * @param options.object - Объект с изображением, которое нужно масштабировать
   * @param options.type - Тип масштабирования
   * 'contain' - скейлит картинку, чтобы она вмещалась
   * 'cover' - скейлит картинку, чтобы она вписалась в размер канвас
   * @param options.withoutSave - Не сохранять состояние
   * @param options.fitAsOneObject - Масштабировать все объекты в активной группе как один объект
   * @fires editor:image-fitted
   */
  public fitObject({
    object,
    type = this.options.scaleType,
    withoutSave,
    fitAsOneObject
  }: {
    object?: FabricObject,
    type?: 'contain' | 'cover',
    withoutSave?: boolean,
    fitAsOneObject?: boolean
  } = {}): void {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject instanceof ActiveSelection && !fitAsOneObject) {
      const selectedItems = activeObject.getObjects()

      canvas.discardActiveObject()

      selectedItems.forEach((obj: FabricObject) => {
        this._fitSingleObject(obj, type)
      })

      const sel = new ActiveSelection(selectedItems, { canvas })
      canvas.setActiveObject(sel)
    } else {
      this._fitSingleObject(activeObject, type)

      if (activeObject instanceof ActiveSelection && fitAsOneObject) {
        this._materializeFittedSelection({
          selection: activeObject
        })
      }
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-fitted', {
      object: activeObject,
      type,
      withoutSave,
      fitAsOneObject
    })
  }

  /**
   * Масштабирует отдельный объект с учетом его угла поворота
   * @param obj - объект для масштабирования
   * @param type - тип масштабирования
   * @private
   */
  private _fitSingleObject(obj: FabricObject, type: 'contain' | 'cover'): void {
    const {
      canvasManager,
      montageArea
    } = this.editor

    const { width, height, scaleX = 1, scaleY = 1, angle = 0 } = obj

    // Рассчитываем текущие масштабированные размеры
    const scaledWidth = width * Math.abs(scaleX)
    const scaledHeight = height * Math.abs(scaleY)

    // Рассчитываем размеры с учетом поворота
    const radians = (angle * Math.PI) / 180
    const cos = Math.abs(Math.cos(radians))
    const sin = Math.abs(Math.sin(radians))

    const rotatedWidth = scaledWidth * cos + scaledHeight * sin
    const rotatedHeight = scaledWidth * sin + scaledHeight * cos

    // Рассчитываем коэффициент масштабирования
    const canvasWidth = montageArea.width
    const canvasHeight = montageArea.height

    let scaleFactor: number

    if (type === 'contain') {
      scaleFactor = Math.min(canvasWidth / rotatedWidth, canvasHeight / rotatedHeight)
    } else {
      scaleFactor = Math.max(canvasWidth / rotatedWidth, canvasHeight / rotatedHeight)
    }

    // Применяем масштабирование к текущим значениям scaleX и scaleY
    obj.set({
      scaleX: scaleX * scaleFactor,
      scaleY: scaleY * scaleFactor
    })

    canvasManager.centerObjectToMontageArea({ object: obj })

    const fittedObjectMaterialized = this._materializeFittedObject({
      object: obj
    })

    if (!fittedObjectMaterialized) {
      obj.setCoords?.()
    }
  }

  /**
   * Запекает transient scale fitted-объекта в каноническое состояние, если объект поддерживает такой lifecycle.
   */
  private _materializeFittedObject({ object }: { object: FabricObject }): boolean {
    const {
      shapeManager,
      textManager
    } = this.editor
    const shapeLayoutParams: {
      target: FabricObject
      textScale?: number
    } = {
      target: object
    }

    if (object.shapeComposite === true) {
      shapeLayoutParams.textScale = Math.abs(object.scaleX ?? 1) || 1
    }

    const standaloneTextScaleCommitted = textManager.commitStandaloneTextScale({
      target: object
    })
    const shapeLayoutCommitted = shapeManager.commitRehydratedShapeLayout(shapeLayoutParams)

    return standaloneTextScaleCommitted || shapeLayoutCommitted
  }

  /**
   * Возвращает true, если fitted child-объект нужно прогнать через materialization pipeline.
   */
  private _requiresFittedObjectMaterialization({ object }: { object: FabricObject }): boolean {
    const isStandaloneTextObject = object.type === 'textbox' || object.type === 'background-textbox'
    const isShapeCompositeObject = 'shapeComposite' in object && object.shapeComposite === true

    return isStandaloneTextObject || isShapeCompositeObject
  }

  /**
   * Материализует fitted ActiveSelection через тот же child-level pipeline, что и другие групповые трансформации.
   */
  private _materializeFittedSelection({ selection }: { selection: ActiveSelection }): void {
    const { canvas } = this.editor
    const objects = selection.getObjects()

    const hasObjectsThatRequireMaterialization = objects.some((object) => {
      return this._requiresFittedObjectMaterialization({
        object
      })
    })

    if (!hasObjectsThatRequireMaterialization) return

    canvas.discardActiveObject()

    objects.forEach((object) => {
      const fittedObjectMaterialized = this._materializeFittedObject({
        object
      })

      if (!fittedObjectMaterialized) {
        object.setCoords?.()
      }
    })

    const nextSelection = new ActiveSelection(objects, { canvas })
    canvas.setActiveObject(nextSelection)
  }

  /**
   * Установка дефолтного масштаба для всех объектов внутри монтажной области редактора
   */
  public resetObjects(): void {
    this.editor.canvasManager.getObjects().forEach((object) => {
      this.resetObject({ object })
    })
  }

  /**
   * Сброс масштаба объекта до дефолтного
   * @param options
   * @param options.object - Объект, который нужно сбросить. Если не передан, то сбрасывается активный объект
   * @param options.withoutSave - Не сохранять состояние
   * @param options.alwaysFitObject - вписывать объект в рабочую область даже если он меньше рабочей области
   * @fires editor:object-reset
   */
  public resetObject({ object, alwaysFitObject = false, withoutSave = false }: ResetObjectOptions = {}): void {
    const {
      canvas,
      canvasManager,
      montageArea,
      imageManager,
      historyManager,
      options: { scaleType }
    } = this.editor

    const currentObject = object || canvas.getActiveObject()

    if (!currentObject || currentObject.locked) return

    historyManager.suspendHistory()

    const isImage = currentObject.type === 'image' || currentObject.format === 'svg'

    if (!isImage) {
      currentObject.set({
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        angle: 0
      })
    }

    if (alwaysFitObject) {
      this.fitObject({ object: currentObject, withoutSave: true, fitAsOneObject: true })
    } else {
      const { width: montageAreaWidth, height: montageAreaHeight } = montageArea
      const { width: imageWidth, height: imageHeight } = currentObject

      const scaleFactor = imageManager.calculateScaleFactor({
        imageObject: currentObject,
        scaleType
      })

      const needFit = (scaleType === 'contain' && scaleFactor < 1)
        || (scaleType === 'cover' && (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight))

      // Делаем contain и cover только если размеры изображения больше размеров канваса, иначе просто сбрасываем
      if (needFit) {
        this.fitObject({ object: currentObject, withoutSave: true, fitAsOneObject: true })
      } else {
        currentObject.set({ scaleX: 1, scaleY: 1 })
      }
    }

    currentObject.set({ flipX: false, flipY: false, angle: 0 })
    canvasManager.centerObjectToMontageArea({ object: currentObject })
    canvas.renderAll()

    historyManager.resumeHistory()
    if (!withoutSave) historyManager.saveState()

    canvas.fire('editor:object-reset', {
      object: currentObject,
      withoutSave,
      alwaysFitObject
    })
  }
}
