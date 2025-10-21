import { ActiveSelection, CanvasOptions, FabricObject, Point } from 'fabric'
import { ImageEditor } from '../index'

import {
  DEFAULT_ZOOM_RATIO,
  DEFAULT_ROTATE_RATIO,
  MIN_ZOOM,
  MAX_ZOOM,
  VIEWPORT_CENTERING_RANGE
} from '../constants'

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

  /**
   * Минимальный зум
   */
  public minZoom: number

  /**
   * Максимальный зум
   */
  public maxZoom: number

  /**
   * Дефолтный зум, который будет применён при инициализации редактора
   */
  public defaultZoom: number

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.options = editor.options
    this.minZoom = this.options.minZoom || MIN_ZOOM
    this.maxZoom = this.options.maxZoom || MAX_ZOOM
    this.defaultZoom = this.options.defaultScale
  }

  /**
   * Применяет ограничения границ viewport после зума.
   * Ограничения применяются только если НЕ активен режим центрирования.
   * При приближении к зоне центрирования ограничения плавно ослабляются.
   * @param zoom - Текущий зум
   * @private
   */
  private _applyViewportConstraints(zoom: number): void {
    const { canvas, panConstraintManager } = this.editor

    // Рассчитываем зоны для центрирования и ограничений на основе defaultZoom
    // Для очень больших монтажных областей defaultZoom может быть меньше minZoom
    // В этом случае используем minZoom как базу для расчётов
    const baseZoom = Math.max(this.defaultZoom, this.minZoom)
    const centeringThreshold = baseZoom + VIEWPORT_CENTERING_RANGE

    // Зона, в которой начинается плавное ослабление ограничений перед центрированием
    // Увеличиваем эту зону в 2 раза для более плавного перехода
    const constraintFadeZone = VIEWPORT_CENTERING_RANGE * 2
    const constraintFadeThreshold = centeringThreshold + constraintFadeZone

    console.log('=== _applyViewportConstraints ===')
    console.log('zoom:', zoom)
    console.log('baseZoom:', baseZoom, 'defaultZoom:', this.defaultZoom, 'minZoom:', this.minZoom)
    console.log('centeringThreshold:', centeringThreshold, 'constraintFadeThreshold:', constraintFadeThreshold)

    // Если zoom меньше или равен centeringThreshold - ограничения не применяются вообще
    if (zoom <= centeringThreshold) {
      console.log('→ Ограничения пропущены (zoom <= centeringThreshold)')
      return
    }

    const vpt = canvas.viewportTransform
    console.log('vpt before constraining:', vpt[4], vpt[5])
    const constrained = panConstraintManager.constrainPan(vpt[4], vpt[5])
    console.log('constrained:', constrained.x, constrained.y)

    // Если zoom в зоне плавного перехода - применяем ограничения с коэффициентом
    if (zoom <= constraintFadeThreshold) {
      // progress от 0 (на границе centeringThreshold) до 1 (на границе constraintFadeThreshold)
      const progress = (zoom - centeringThreshold) / constraintFadeZone

      console.log('→ Плавное применение ограничений, progress:', progress)
      // Плавно применяем ограничения
      vpt[4] += (constrained.x - vpt[4]) * progress
      vpt[5] += (constrained.y - vpt[5]) * progress
    } else {
      console.log('→ Полное применение ограничений')
      // Полностью применяем ограничения
      vpt[4] = constrained.x
      vpt[5] = constrained.y
    }

    console.log('vpt after:', vpt[4], vpt[5])
    canvas.setViewportTransform(vpt)
  }

  /**
   * Применяет плавное центрирование viewport при приближении к defaultZoom.
   * При zoom <= defaultZoom монтажная область полностью центрируется.
   * При zoom > defaultZoom применяется плавная интерполяция в пределах переходного диапазона.
   * @param zoom - Текущий зум
   * @param isZoomingOut - Флаг, указывающий что происходит zoom-out (уменьшение масштаба)
   * @returns true если центрирование было применено
   * @private
   */
  private _applyViewportCentering(zoom: number, isZoomingOut: boolean = false): boolean {
    const { canvas, montageArea } = this.editor
    const { defaultZoom } = this

    const vpt = canvas.viewportTransform
    const canvasCenterX = canvas.getWidth() / 2
    const canvasCenterY = canvas.getHeight() / 2
    const montageCenterX = montageArea.left
    const montageCenterY = montageArea.top

    // Целевая позиция для центрированного viewport
    const targetVptX = canvasCenterX - montageCenterX * zoom
    const targetVptY = canvasCenterY - montageCenterY * zoom

    console.log('=== _applyViewportCentering ===')
    console.log('zoom:', zoom, 'defaultZoom:', defaultZoom, 'isZoomingOut:', isZoomingOut)
    console.log('canvas:', canvasCenterX, canvasCenterY)
    console.log('montage:', montageCenterX, montageCenterY)
    console.log('vpt before:', vpt[4], vpt[5])
    console.log('targetVpt:', targetVptX, targetVptY)

    if (zoom <= defaultZoom) {
      // Полностью центрируем при zoom <= defaultZoom
      console.log('→ Полное центрирование (zoom <= defaultZoom)')
      vpt[4] = targetVptX
      vpt[5] = targetVptY
      canvas.setViewportTransform(vpt)
      console.log('vpt after:', vpt[4], vpt[5])
      return true
    }

    // Плавное центрирование при приближении к defaultZoom
    const centeringThreshold = defaultZoom + VIEWPORT_CENTERING_RANGE
    const distanceFromDefault = zoom - defaultZoom

    console.log('centeringThreshold:', centeringThreshold, 'distanceFromDefault:', distanceFromDefault)

    if (distanceFromDefault <= VIEWPORT_CENTERING_RANGE) {
      // progress от 0 (на границе диапазона) до 1 (при zoom = defaultZoom)
      const progress = 1 - (distanceFromDefault / VIEWPORT_CENTERING_RANGE)
      // Используем квадратичную функцию для более агрессивного центрирования
      const easedProgress = progress * progress

      console.log('→ Плавное центрирование, progress:', progress, 'eased:', easedProgress)
      // Интерполяция от текущей позиции к целевой с учетом easedProgress
      vpt[4] += (targetVptX - vpt[4]) * easedProgress
      vpt[5] += (targetVptY - vpt[5]) * easedProgress
      canvas.setViewportTransform(vpt)
      console.log('vpt after:', vpt[4], vpt[5])
      return true
    }

    // При zoom-out применяем центрирование только если видимая часть viewport выходит за границы монтажной области
    // Это происходит когда появляется серое пространство (фон) вокруг изображения
    if (isZoomingOut) {
      const viewportWidth = canvas.getWidth()
      const viewportHeight = canvas.getHeight()

      // Границы монтажной области в scene coordinates (мировые координаты объектов)
      const montageMinX = montageArea.left - montageArea.width / 2
      const montageMaxX = montageArea.left + montageArea.width / 2
      const montageMinY = montageArea.top - montageArea.height / 2
      const montageMaxY = montageArea.top + montageArea.height / 2

      // Границы видимой области viewport в scene coordinates
      // Переводим из canvas coordinates в scene coordinates через обратную трансформацию
      const viewportMinX = -vpt[4] / zoom
      const viewportMaxX = (-vpt[4] + viewportWidth) / zoom
      const viewportMinY = -vpt[5] / zoom
      const viewportMaxY = (-vpt[5] + viewportHeight) / zoom

      // Проверяем, выходит ли viewport за границы монтажной области (видно серый фон)
      const hasEmptySpaceLeft = viewportMinX < montageMinX
      const hasEmptySpaceRight = viewportMaxX > montageMaxX
      const hasEmptySpaceTop = viewportMinY < montageMinY
      const hasEmptySpaceBottom = viewportMaxY > montageMaxY
      const hasEmptySpace = hasEmptySpaceLeft || hasEmptySpaceRight || hasEmptySpaceTop || hasEmptySpaceBottom

      console.log('=== Проверка пустого пространства ===')
      console.log(
        'viewport bounds:',
        viewportMinX.toFixed(0),
        viewportMaxX.toFixed(0),
        viewportMinY.toFixed(0),
        viewportMaxY.toFixed(0)
      )
      console.log(
        'montage bounds:',
        montageMinX.toFixed(0),
        montageMaxX.toFixed(0),
        montageMinY.toFixed(0),
        montageMaxY.toFixed(0)
      )
      console.log(
        'empty:',
        'L:',
        hasEmptySpaceLeft,
        'R:',
        hasEmptySpaceRight,
        'T:',
        hasEmptySpaceTop,
        'B:',
        hasEmptySpaceBottom
      )

      if (hasEmptySpace) {
        // Рассчитываем, насколько глубоко viewport "зашёл" в пустое пространство
        // Чем больше серого фона видно, тем сильнее должно быть центрирование
        const emptySpaceLeft = Math.max(0, montageMinX - viewportMinX)
        const emptySpaceRight = Math.max(0, viewportMaxX - montageMaxX)
        const emptySpaceTop = Math.max(0, montageMinY - viewportMinY)
        const emptySpaceBottom = Math.max(0, viewportMaxY - montageMaxY)

        // Максимальное пустое пространство по каждой оси
        const maxEmptyX = Math.max(emptySpaceLeft, emptySpaceRight)
        const maxEmptyY = Math.max(emptySpaceTop, emptySpaceBottom)

        // Нормализуем пустое пространство относительно размера viewport
        // От 0 (только появилось) до ~1 (много пустого пространства)
        const emptyRatioX = maxEmptyX / viewportWidth
        const emptyRatioY = maxEmptyY / viewportHeight
        const maxEmptyRatio = Math.max(emptyRatioX, emptyRatioY)

        // Очень слабое центрирование, которое усиливается по мере роста пустого пространства
        const baseStrength = 0.03
        const maxStrength = 0.05
        // Квадратичная функция для плавного нарастания силы
        const centeringStrength = baseStrength + (maxStrength - baseStrength) * (maxEmptyRatio * maxEmptyRatio)

        console.log('→ Адаптивное центрирование при zoom-out (видно серый фон)')
        console.log('empty pixels:', maxEmptyX.toFixed(0), maxEmptyY.toFixed(0))
        console.log('empty ratio:', maxEmptyRatio.toFixed(3), 'strength:', centeringStrength.toFixed(4))
        vpt[4] += (targetVptX - vpt[4]) * centeringStrength
        vpt[5] += (targetVptY - vpt[5]) * centeringStrength
        canvas.setViewportTransform(vpt)
        console.log('vpt after:', vpt[4], vpt[5])
        return true
      }
    }

    console.log('→ Центрирование не применяется')
    return false
  }

  /**
   * Метод рассчитывает и применяет зум по умолчанию для монтажной области редактора.
   * Зум рассчитывается исходя из размеров контейнера редактора и текущих размеров монтажной области.
   * Расчёт происходит таким образом, чтобы монтажная область визуально целиком помещалась в контейнер редактора.
   * Если scale не передан, то используется значение из options.defaultScale.
   * @param scale - Желаемый масштаб относительно размеров контейнера редактора.
   */
  public calculateAndApplyDefaultZoom(scale: number = this.options.defaultScale): void {
    const { canvas } = this.editor

    const container = canvas.editorContainer
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    const { width: montageWidth, height: montageHeight } = this.editor.montageArea

    const scaleX = (containerWidth / montageWidth) * scale
    const scaleY = (containerHeight / montageHeight) * scale

    // выбираем меньший зум, чтобы монтажная область целиком помещалась
    this.defaultZoom = Math.min(scaleX, scaleY)

    // применяем дефолтный зум
    this.setZoom()

    // обновляем границы перетаскивания
    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Обработчик зума колесом мыши с автоматическим определением точки зума.
   * Логика выбора точки зума:
   * - При zoom-out (уменьшении): зум к текущему центру viewport для корректной работы плавного центрирования
   * - При zoom-in (увеличении): зум к позиции курсора (ограниченной границами монтажной области)
   * - Если zoom < defaultZoom или монтажная область помещается во viewport - зум к центру монтажной области
   * @param scale - Шаг зума
   * @param event - Событие колеса мыши
   * @fires editor:zoom-changed
   */
  public handleMouseWheelZoom(scale: number, event: WheelEvent): void {
    const { canvas, montageArea } = this.editor
    const currentZoom = canvas.getZoom()

    // Проверяем, выходит ли монтажная область за пределы viewport
    const scaledMontageWidth = montageArea.width * currentZoom
    const scaledMontageHeight = montageArea.height * currentZoom
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()
    const montageExceedsViewport = scaledMontageWidth > viewportWidth || scaledMontageHeight > viewportHeight

    // Если текущий зум меньше defaultZoom или монтажная область не выходит за пределы viewport,
    // зумим к центру монтажной области
    if (currentZoom < this.defaultZoom || !montageExceedsViewport) {
      this.zoom(scale, {
        pointX: montageArea.left,
        pointY: montageArea.top
      })
      return
    }

    // При zoom-out: проверяем, будут ли пустые пространства после зума
    if (scale < 0) {
      // Рассчитываем будущий зум
      const futureZoom = currentZoom + scale
      const futureScaledWidth = montageArea.width * futureZoom
      const futureScaledHeight = montageArea.height * futureZoom

      // Проверяем, появятся ли пустые пространства (монтажная область поместится хотя бы по одной оси)
      const willFitHorizontally = futureScaledWidth <= viewportWidth
      const willFitVertically = futureScaledHeight <= viewportHeight
      const willHaveEmptySpace = willFitHorizontally || willFitVertically

      console.log('=== handleMouseWheelZoom (zoom-out) ===')
      console.log('currentZoom:', currentZoom, 'futureZoom:', futureZoom)
      console.log('futureScaled:', futureScaledWidth.toFixed(0), 'x', futureScaledHeight.toFixed(0))
      console.log('viewport:', viewportWidth, 'x', viewportHeight)
      console.log('willFitH:', willFitHorizontally, 'willFitV:', willFitVertically)
      console.log('willHaveEmptySpace:', willHaveEmptySpace)

      if (willHaveEmptySpace) {
        // Будут пустые пространства - зумим к центру монтажной области для центрирования
        console.log('→ Зумим к центру монтажной области (для центрирования)')
        this.zoom(scale, {
          pointX: montageArea.left,
          pointY: montageArea.top
        })
      } else {
        // Пустых пространств не будет - зумим к текущему центру viewport
        console.log('→ Зумим к центру viewport (без центрирования)')
        const centerPoint = canvas.getCenterPoint()
        this.zoom(scale, {
          pointX: centerPoint.x,
          pointY: centerPoint.y
        })
      }
      return
    }

    // При zoom-in: монтажная область выходит за пределы viewport - зумим к курсору
    // Получаем абсолютные scene-координаты курсора с учетом текущего viewportTransform
    const pointer = canvas.getPointer(event, true)

    // Ограничиваем точку зума границами монтажной области
    const montageMinX = montageArea.left - montageArea.width / 2
    const montageMaxX = montageArea.left + montageArea.width / 2
    const montageMinY = montageArea.top - montageArea.height / 2
    const montageMaxY = montageArea.top + montageArea.height / 2

    // Если курсор за пределами монтажной области, находим ближайшую точку на её границе
    const clampedX = Math.max(montageMinX, Math.min(montageMaxX, pointer.x))
    const clampedY = Math.max(montageMinY, Math.min(montageMaxY, pointer.y))

    this.zoom(scale, {
      pointX: clampedX,
      pointY: clampedY
    })
  }

  /**
   * Увеличение/уменьшение масштаба
   * @param scale - Шаг зума
   * @param options - Координаты зума (по умолчанию центр канваса)
   * @param options.pointX - Координата X точки зума
   * @param options.pointY - Координата Y точки зума
   * @fires editor:zoom-changed
   * Если передавать координаты курсора, то нужно быть аккуратнее, так как юзер может выйти за пределы рабочей области
   */
  public zoom(scale: number = DEFAULT_ZOOM_RATIO, options: { pointX?: number, pointY?: number } = {}): void {
    if (!scale) return

    const { minZoom, maxZoom } = this
    const { canvas } = this.editor

    const currentZoom = canvas.getZoom()
    const center = canvas.getCenterPoint()
    const pointX = options.pointX ?? center.x
    const pointY = options.pointY ?? center.y
    const point = new Point(pointX, pointY)

    // Увеличиваем точность до 3 знаков для поддержки малых шагов зума на больших изображениях
    let zoom = Number((currentZoom + Number(scale)).toFixed(3))
    if (zoom > maxZoom) zoom = maxZoom
    if (zoom < minZoom) zoom = minZoom

    canvas.zoomToPoint(point, zoom)

    // Всегда обновляем границы перетаскивания при изменении зума
    this.editor.panConstraintManager.updateBounds()

    // Применяем плавное центрирование viewport при приближении к defaultZoom
    const isZoomingOut = scale < 0
    const centeringApplied = this._applyViewportCentering(zoom, isZoomingOut)

    // Применяем ограничения границ viewport только при zoom-in (приближении)
    // При zoom-out (отдалении, scale < 0) и при активном центрировании ограничения не применяются
    if (scale > 0 && !centeringApplied) {
      this._applyViewportConstraints(zoom)
    }

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom,
      point
    })
  }

  /**
   * Установка зума
   * @param zoom - Зум
   * @fires editor:zoom-changed
   */
  public setZoom(zoom: number = this.defaultZoom): void {
    const { minZoom, maxZoom } = this
    const { canvas } = this.editor
    const centerPoint = new Point(canvas.getCenterPoint())

    let newZoom = zoom

    if (zoom > maxZoom) newZoom = maxZoom
    if (zoom < minZoom) newZoom = minZoom

    canvas.zoomToPoint(centerPoint, newZoom)

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom: newZoom,
      point: centerPoint
    })

    // обновляем границы перетаскивания
    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Сброс зума
   * @fires editor:zoom-changed
   */
  public resetZoom(): void {
    const { canvas } = this.editor
    const centerPoint = new Point(canvas.getCenterPoint())

    canvas.zoomToPoint(centerPoint, this.defaultZoom)

    this.editor.canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      point: centerPoint
    })

    // обновляем границы перетаскивания
    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Поворот объекта на заданный угол
   * @param angle
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  public rotate(angle: number = DEFAULT_ROTATE_RATIO, { withoutSave }: { withoutSave?: boolean } = {}): void {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    const newAngle = obj.angle + angle
    obj.rotate(newAngle)
    obj.setCoords()

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-rotated', {
      object: obj,
      withoutSave,
      angle: newAngle
    })
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

    if (activeObject instanceof ActiveSelection) {
      activeObject.getObjects().forEach((obj:FabricObject) => {
        obj.set('opacity', opacity)
      })
    } else {
      activeObject.set('opacity', opacity)
    }

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
    const { canvas, montageArea } = this.editor

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

    canvas.centerObject(obj)
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
    canvas.centerObject(currentObject)
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
