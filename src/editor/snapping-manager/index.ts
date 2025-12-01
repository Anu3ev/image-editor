import {
  ActiveSelection,
  BasicTransformEvent,
  Canvas,
  FabricObject,
  TPointerEvent,
  TPointerEventInfo
} from 'fabric'

import { ImageEditor } from '..'
import { GUIDE_COLOR, GUIDE_WIDTH, IGNORED_IDS, SNAP_THRESHOLD } from './constants'

type AnchorBuckets = {
  vertical: number[]
  horizontal: number[]
}

type Bounds = {
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  centerY: number
}

type GuideBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

type GuideLine = {
  type: 'vertical' | 'horizontal'
  position: number
}

type TransformEvent = BasicTransformEvent<TPointerEvent> & {
  target?: FabricObject | null
  e?: TPointerEvent | null
}

type MouseEventInfo = TPointerEventInfo<TPointerEvent> & {
  target?: FabricObject | null
}

/**
 * Менеджер отвечает за отображение направляющих и прилипающее выравнивание объектов.
 */
export default class SnappingManager {
  /**
   * Инстанс редактора.
   */
  public editor: ImageEditor

  /**
   * Канвас редактора.
   */
  public canvas: Canvas

  /**
   * Кешированные линии для привязки.
   */
  private anchors: AnchorBuckets = { vertical: [], horizontal: [] }

  /**
   * Текущие направляющие для отрисовки.
   */
  private activeGuides: GuideLine[] = []

  /**
   * Границы, в пределах которых рисуются направляющие.
   */
  private guideBounds: GuideBounds | null = null

  /**
   * Обработчик начала перетаскивания объекта.
   */
  private _onMouseDown: (event: MouseEventInfo) => void

  /**
   * Обработчик перемещения объекта.
   */
  private _onObjectMoving: (event: TransformEvent) => void

  /**
   * Обработчик завершения перетаскивания.
   */
  private _onMouseUp: () => void

  /**
   * Обработчик очистки перед рендером.
   */
  private _onBeforeRender: () => void

  /**
   * Обработчик отрисовки направляющих после рендера.
   */
  private _onAfterRender: () => void

  /**
   * Создаёт менеджер прилипания и инициализирует слушатели событий.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    const { canvas } = editor
    this.canvas = canvas

    this._onMouseDown = this._handleMouseDown.bind(this)
    this._onObjectMoving = this._handleObjectMoving.bind(this)
    this._onMouseUp = this._handleMouseUp.bind(this)
    this._onBeforeRender = this._handleBeforeRender.bind(this)
    this._onAfterRender = this._handleAfterRender.bind(this)

    this._bindEvents()
  }

  /**
   * Удаляет слушатели и очищает временные данные.
   */
  public destroy(): void {
    this._unbindEvents()
    this._clearGuides()
    this._clearAnchors()
  }

  /**
   * Навешивает обработчики событий канваса.
   */
  private _bindEvents(): void {
    const { canvas } = this
    canvas.on('mouse:down', this._onMouseDown)
    canvas.on('object:moving', this._onObjectMoving)
    canvas.on('mouse:up', this._onMouseUp)
    canvas.on('before:render', this._onBeforeRender)
    canvas.on('after:render', this._onAfterRender)
  }

  /**
   * Удаляет обработчики событий канваса.
   */
  private _unbindEvents(): void {
    const { canvas } = this
    canvas.off('mouse:down', this._onMouseDown)
    canvas.off('object:moving', this._onObjectMoving)
    canvas.off('mouse:up', this._onMouseUp)
    canvas.off('before:render', this._onBeforeRender)
    canvas.off('after:render', this._onAfterRender)
  }

  /**
   * Кеширует набор опорных линий в момент начала перетаскивания.
   */
  private _handleMouseDown(event: MouseEventInfo): void {
    const { target } = event

    if (!target) {
      this._clearAnchors()
      return
    }

    this._cacheAnchors({ activeObject: target })
  }

  /**
   * Выполняет привязку объекта к ближайшим линиям при его перемещении.
   */
  private _handleObjectMoving(event: TransformEvent): void {
    const { target, e } = event

    if (!target) {
      this._clearGuides()
      return
    }

    if (e?.ctrlKey) {
      this._clearGuides()
      return
    }

    if (!this.anchors.vertical.length && !this.anchors.horizontal.length) {
      this._cacheAnchors({ activeObject: target })
    }

    const activeBounds = this._getBounds({ object: target })
    if (!activeBounds) {
      this._clearGuides()
      return
    }

    const { canvas } = this
    const zoom = canvas.getZoom() || 1
    const threshold = SNAP_THRESHOLD / zoom
    const snapResult = this._calculateSnap({
      activeBounds,
      threshold
    })

    const { deltaX, deltaY, guides } = snapResult

    if (deltaX !== 0 || deltaY !== 0) {
      const { left = 0, top = 0 } = target
      target.set({
        left: left + deltaX,
        top: top + deltaY
      })
      target.setCoords()
    }

    this._updateGuides({ guides })
  }

  /**
   * Очищает направляющие и кеш после окончания перетаскивания.
   */
  private _handleMouseUp(): void {
    this._clearGuides()
    this._clearAnchors()
  }

  /**
   * Очищает вспомогательный слой перед рендером.
   */
  private _handleBeforeRender(): void {
    const { canvas } = this
    const { contextTop } = canvas

    if (contextTop) {
      canvas.clearContext(contextTop)
    }
  }

  /**
   * Отрисовывает активные направляющие после рендера канваса.
   */
  private _handleAfterRender(): void {
    if (!this.activeGuides.length) return

    const { canvas, guideBounds: cachedGuideBounds } = this
    const context = canvas.getSelectionContext()

    if (!context) return

    const bounds = cachedGuideBounds ?? this._calculateViewportBounds()
    const { left, right, top, bottom } = bounds
    const { viewportTransform } = canvas
    const zoom = canvas.getZoom() || 1

    context.save()
    if (Array.isArray(viewportTransform)) {
      context.transform(...viewportTransform)
    }
    context.lineWidth = GUIDE_WIDTH / zoom
    context.strokeStyle = GUIDE_COLOR
    context.setLineDash([4, 4])

    for (const guide of this.activeGuides) {
      context.beginPath()
      if (guide.type === 'vertical') {
        context.moveTo(guide.position, top)
        context.lineTo(guide.position, bottom)
      } else {
        context.moveTo(left, guide.position)
        context.lineTo(right, guide.position)
      }
      context.stroke()
    }

    context.restore()
  }

  /**
   * Применяет найденные направляющие или удаляет их, если ничего не найдено.
   */
  private _updateGuides({ guides }: { guides: GuideLine[] }): void {
    if (!guides.length) {
      this._clearGuides()
      return
    }

    this.activeGuides = guides
    this.canvas.requestRenderAll()
  }

  /**
   * Сбрасывает активные направляющие и инициирует перерисовку.
   */
  private _clearGuides(): void {
    if (!this.activeGuides.length) return

    this.activeGuides = []
    this.canvas.requestRenderAll()
  }

  /**
   * Обнуляет кеш опорных линий.
   */
  private _clearAnchors(): void {
    this.anchors = { vertical: [], horizontal: [] }
  }

  /**
   * Сохраняет линии для прилипания от всех доступных объектов и монтажной области.
   */
  private _cacheAnchors({ activeObject }: { activeObject?: FabricObject | null }): void {
    const targets = this._collectTargets({ activeObject })
    const nextAnchors: AnchorBuckets = { vertical: [], horizontal: [] }

    for (const object of targets) {
      const bounds = this._getBounds({ object })
      if (!bounds) continue
      this._pushBoundsToAnchors({ anchors: nextAnchors, bounds })
    }

    const { montageArea } = this.editor
    const montageBounds = this._getBounds({ object: montageArea })

    if (montageBounds) {
      this._pushBoundsToAnchors({ anchors: nextAnchors, bounds: montageBounds })
      const { left, right, top, bottom } = montageBounds
      this.guideBounds = {
        left,
        right,
        top,
        bottom
      }
    } else {
      this.guideBounds = this._calculateViewportBounds()
    }

    this.anchors = nextAnchors
  }

  /**
   * Собирает объекты, подходящие для прилипания, исключая активный объект и запрещённые id.
   */
  private _collectTargets({ activeObject }: { activeObject?: FabricObject | null }): FabricObject[] {
    const excluded = this._collectExcludedObjects({ activeObject })
    const targets: FabricObject[] = []

    this.canvas.forEachObject((object) => {
      if (this._shouldIgnoreObject({ object, excluded })) return
      targets.push(object)
    })

    return targets
  }

  /**
   * Возвращает множество объектов, которые нужно исключить из поиска опорных линий.
   */
  private _collectExcludedObjects({ activeObject }: { activeObject?: FabricObject | null }): Set<FabricObject> {
    const excluded = new Set<FabricObject>()

    if (!activeObject) return excluded

    excluded.add(activeObject)

    if (activeObject instanceof ActiveSelection) {
      activeObject.getObjects().forEach((object) => excluded.add(object))
    }

    return excluded
  }

  /**
   * Проверяет, нужно ли исключить объект из списка целей для прилипания.
   */
  private _shouldIgnoreObject({ object, excluded }: { object: FabricObject; excluded: Set<FabricObject> }): boolean {
    if (excluded.has(object)) return true

    const { visible = true } = object
    if (!visible) return true

    const { id } = object as FabricObject & { id?: string }
    if (id && IGNORED_IDS.includes(id)) return true

    return false
  }

  /**
   * Переводит bounding box объекта в набор линий для прилипания.
   */
  private _pushBoundsToAnchors({
    anchors,
    bounds
  }: {
    anchors: AnchorBuckets
    bounds: Bounds
  }): void {
    const {
      left,
      right,
      centerX,
      top,
      bottom,
      centerY
    } = bounds

    anchors.vertical.push(left, centerX, right)
    anchors.horizontal.push(top, centerY, bottom)
  }

  /**
   * Вычисляет bounding box объекта, учитывая текущее положение и трансформации.
   */
  private _getBounds({ object }: { object?: FabricObject | null }): Bounds | null {
    if (!object) return null

    try {
      object.setCoords()
      const rect = object.getBoundingRect(false, true)
      const {
        left = 0,
        top = 0,
        width = 0,
        height = 0
      } = rect

      const right = left + width
      const bottom = top + height
      const centerX = left + (width / 2)
      const centerY = top + (height / 2)

      return {
        left,
        right,
        top,
        bottom,
        centerX,
        centerY
      }
    } catch {
      return null
    }
  }

  /**
   * Считает дельту сдвига и список направляющих для текущего объекта.
   */
  private _calculateSnap({
    activeBounds,
    threshold
  }: {
    activeBounds: Bounds
    threshold: number
  }): { deltaX: number; deltaY: number; guides: GuideLine[] } {
    const { left, right, centerX, top, bottom, centerY } = activeBounds

    const verticalSnap = this._findAxisSnap({
      anchors: this.anchors.vertical,
      positions: [left, centerX, right],
      threshold
    })
    const horizontalSnap = this._findAxisSnap({
      anchors: this.anchors.horizontal,
      positions: [top, centerY, bottom],
      threshold
    })

    const guides: GuideLine[] = []

    if (verticalSnap.guidePosition !== null) {
      guides.push({
        type: 'vertical',
        position: verticalSnap.guidePosition
      })
    }

    if (horizontalSnap.guidePosition !== null) {
      guides.push({
        type: 'horizontal',
        position: horizontalSnap.guidePosition
      })
    }

    return {
      deltaX: verticalSnap.delta,
      deltaY: horizontalSnap.delta,
      guides
    }
  }

  /**
   * Ищет ближайшую линию привязки по одной оси.
   */
  private _findAxisSnap({
    anchors,
    positions,
    threshold
  }: {
    anchors: number[]
    positions: number[]
    threshold: number
  }): { delta: number; guidePosition: number | null } {
    let nearestDelta = 0
    let nearestDistance = threshold + 1
    let guidePosition: number | null = null

    for (const position of positions) {
      for (const anchor of anchors) {
        const distance = Math.abs(anchor - position)

        if (distance > threshold || distance >= nearestDistance) continue

        nearestDelta = anchor - position
        nearestDistance = distance
        guidePosition = anchor
      }
    }

    return {
      delta: nearestDelta,
      guidePosition
    }
  }

  /**
   * Возвращает границы для рисования направляющих.
   */
  private _calculateViewportBounds(): GuideBounds {
    const { canvas } = this
    const { viewportTransform } = canvas
    const width = canvas.getWidth()
    const height = canvas.getHeight()

    const [
      scaleX = 1,
      ,
      ,
      scaleY = 1,
      translateX = 0,
      translateY = 0
    ] = viewportTransform ?? []

    const left = (0 - translateX) / scaleX
    const top = (0 - translateY) / scaleY
    const right = (width - translateX) / scaleX
    const bottom = (height - translateY) / scaleY

    return {
      left,
      right,
      top,
      bottom
    }
  }
}
