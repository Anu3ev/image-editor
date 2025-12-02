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

type SpacingGuide = {
  type: 'vertical' | 'horizontal'
  axis: number
  refStart: number
  refEnd: number
  activeStart: number
  activeEnd: number
  distance: number
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
   * Текущие направляющие интервалов для отрисовки.
   */
  private activeSpacingGuides: SpacingGuide[] = []

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

    let activeBounds = SnappingManager._getBounds({ object: target })
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
      activeBounds = SnappingManager._getBounds({ object: target }) ?? activeBounds
    }

    const spacingResult = this._calculateSpacingSnap({
      activeBounds,
      activeObject: target,
      threshold
    })

    if (spacingResult.deltaX !== 0 || spacingResult.deltaY !== 0) {
      const { left = 0, top = 0 } = target
      target.set({
        left: left + spacingResult.deltaX,
        top: top + spacingResult.deltaY
      })
      target.setCoords()
      activeBounds = SnappingManager._getBounds({ object: target }) ?? activeBounds
    }

    this._applyGuides({
      guides,
      spacingGuides: spacingResult.guides
    })
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
    if (!this.activeGuides.length && !this.activeSpacingGuides.length) return

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

    for (const spacingGuide of this.activeSpacingGuides) {
      SnappingManager._drawSpacingGuide({
        context,
        guide: spacingGuide,
        zoom
      })
    }

    context.restore()
  }

  /**
   * Применяет найденные направляющие или очищает их, если ничего нет.
   */
  private _applyGuides({
    guides,
    spacingGuides
  }: {
    guides: GuideLine[]
    spacingGuides: SpacingGuide[]
  }): void {
    if (!guides.length && !spacingGuides.length) {
      this._clearGuides()
      return
    }

    this.activeGuides = guides
    this.activeSpacingGuides = spacingGuides
    this.canvas.requestRenderAll()
  }

  /**
   * Сбрасывает все активные направляющие и инициирует перерисовку.
   */
  private _clearGuides(): void {
    if (!this.activeGuides.length && !this.activeSpacingGuides.length) return

    this.activeGuides = []
    this.activeSpacingGuides = []
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
      const bounds = SnappingManager._getBounds({ object })
      if (!bounds) continue
      SnappingManager._pushBoundsToAnchors({ anchors: nextAnchors, bounds })
    }

    const { montageArea } = this.editor
    const montageBounds = SnappingManager._getBounds({ object: montageArea })

    if (montageBounds) {
      SnappingManager._pushBoundsToAnchors({ anchors: nextAnchors, bounds: montageBounds })
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
    const excluded = SnappingManager._collectExcludedObjects({ activeObject })
    const targets: FabricObject[] = []

    this.canvas.forEachObject((object) => {
      if (SnappingManager._shouldIgnoreObject({ object, excluded })) return
      targets.push(object)
    })

    return targets
  }

  /**
   * Возвращает множество объектов, которые нужно исключить из поиска опорных линий.
   */
  private static _collectExcludedObjects({ activeObject }: { activeObject?: FabricObject | null }): Set<FabricObject> {
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
  private static _shouldIgnoreObject({
    object,
    excluded
  }: {
    object: FabricObject
    excluded: Set<FabricObject>
  }): boolean {
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
  private static _pushBoundsToAnchors({
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
  private static _getBounds({ object }: { object?: FabricObject | null }): Bounds | null {
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

    const verticalSnap = SnappingManager._findAxisSnap({
      anchors: this.anchors.vertical,
      positions: [left, centerX, right],
      threshold
    })
    const horizontalSnap = SnappingManager._findAxisSnap({
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
   * Считает дельту для равноудалённого прилипания и набор направляющих интервалов.
   */
  private _calculateSpacingSnap({
    activeBounds,
    activeObject,
    threshold
  }: {
    activeBounds: Bounds
    activeObject: FabricObject
    threshold: number
  }): { deltaX: number; deltaY: number; guides: SpacingGuide[] } {
    const candidateBounds = this._collectTargets({ activeObject })
      .map((object) => SnappingManager._getBounds({ object }))
      .filter((bounds): bounds is Bounds => Boolean(bounds))

    const verticalResult = SnappingManager._calculateVerticalSpacing({
      activeBounds,
      candidates: candidateBounds,
      threshold
    })
    const horizontalResult = SnappingManager._calculateHorizontalSpacing({
      activeBounds,
      candidates: candidateBounds,
      threshold
    })

    const guides: SpacingGuide[] = []
    if (verticalResult.guide) {
      guides.push(verticalResult.guide)
    }
    if (horizontalResult.guide) {
      guides.push(horizontalResult.guide)
    }

    return {
      deltaX: horizontalResult.delta,
      deltaY: verticalResult.delta,
      guides
    }
  }

  /**
   * Ищет подходящий вариант равноудалённого прилипания по вертикали.
   */
  private static _calculateVerticalSpacing({
    activeBounds,
    candidates,
    threshold
  }: {
    activeBounds: Bounds
    candidates: Bounds[]
    threshold: number
  }): { delta: number; guide: SpacingGuide | null } {
    const {
      centerX,
      top: activeTop,
      bottom: activeBottom
    } = activeBounds

    const aligned = candidates.filter((bounds) => Math.abs(bounds.centerX - centerX) <= threshold)

    if (!aligned.length) {
      return { delta: 0, guide: null }
    }

    const items = [
      ...aligned.map((bounds) => ({ bounds, isActive: false })),
      { bounds: activeBounds, isActive: true }
    ]

    items.sort((a, b) => a.bounds.top - b.bounds.top)

    const activeIndex = items.findIndex((item) => item.isActive)
    if (activeIndex === -1) {
      return { delta: 0, guide: null }
    }

    const prev = items[activeIndex - 1]
    const prevPrev = items[activeIndex - 2]
    const next = items[activeIndex + 1]
    const nextNext = items[activeIndex + 2]
    const options: Array<{ delta: number; guide: SpacingGuide; diff: number }> = []
    const height = activeBottom - activeTop

    if (prev && prevPrev) {
      const { bounds: prevBounds } = prev
      const { bounds: prevPrevBounds } = prevPrev
      const gapRef = prevBounds.top - prevPrevBounds.bottom
      const gapActive = activeTop - prevBounds.bottom
      const diff = Math.abs(gapActive - gapRef)

      if (diff <= threshold) {
        const delta = gapRef - gapActive
        const adjustedTop = activeTop + delta
        const guide: SpacingGuide = {
          type: 'vertical',
          axis: centerX,
          refStart: prevPrevBounds.bottom,
          refEnd: prevBounds.top,
          activeStart: prevBounds.bottom,
          activeEnd: adjustedTop,
          distance: gapRef
        }

        options.push({ delta, guide, diff })
      }
    }

    if (next && nextNext) {
      const { bounds: nextBounds } = next
      const { bounds: nextNextBounds } = nextNext
      const gapRef = nextNextBounds.top - nextBounds.bottom
      const gapActive = nextBounds.top - activeBottom
      const diff = Math.abs(gapActive - gapRef)

      if (diff <= threshold) {
        const delta = gapActive - gapRef
        const adjustedBottom = activeBottom + delta
        const guide: SpacingGuide = {
          type: 'vertical',
          axis: centerX,
          refStart: nextBounds.bottom,
          refEnd: nextNextBounds.top,
          activeStart: adjustedBottom,
          activeEnd: nextBounds.top,
          distance: gapRef
        }

        options.push({ delta, guide, diff })
      }
    }

    if (prev && next) {
      const { bounds: prevBounds } = prev
      const { bounds: nextBounds } = next
      const totalGap = nextBounds.top - prevBounds.bottom
      const availableSpace = totalGap - height

      if (availableSpace >= 0) {
        const desiredGap = availableSpace / 2
        const gapTop = activeTop - prevBounds.bottom
        const gapBottom = nextBounds.top - activeBottom
        const diffTop = Math.abs(gapTop - desiredGap)
        const diffBottom = Math.abs(gapBottom - desiredGap)
        const diff = Math.max(diffTop, diffBottom)

        if (diff <= threshold) {
          const delta = desiredGap - gapTop
          const adjustedBottom = activeBottom + delta
          const guide: SpacingGuide = {
            type: 'vertical',
            axis: centerX,
            refStart: prevBounds.bottom,
            refEnd: prevBounds.bottom + desiredGap,
            activeStart: adjustedBottom,
            activeEnd: adjustedBottom + desiredGap,
            distance: desiredGap
          }

          options.push({ delta, guide, diff })
        }
      }
    }

    if (!options.length) {
      return { delta: 0, guide: null }
    }

    const bestOption = options.reduce((current, option) => {
      if (option.diff < current.diff) return option
      return current
    }, options[0])

    return {
      delta: bestOption.delta,
      guide: bestOption.guide
    }
  }

  /**
   * Ищет подходящий вариант равноудалённого прилипания по горизонтали.
   */
  private static _calculateHorizontalSpacing({
    activeBounds,
    candidates,
    threshold
  }: {
    activeBounds: Bounds
    candidates: Bounds[]
    threshold: number
  }): { delta: number; guide: SpacingGuide | null } {
    const {
      centerY,
      left: activeLeft,
      right: activeRight
    } = activeBounds

    const aligned = candidates.filter((bounds) => Math.abs(bounds.centerY - centerY) <= threshold)

    if (!aligned.length) {
      return { delta: 0, guide: null }
    }

    const items = [
      ...aligned.map((bounds) => ({ bounds, isActive: false })),
      { bounds: activeBounds, isActive: true }
    ]

    items.sort((a, b) => a.bounds.left - b.bounds.left)

    const activeIndex = items.findIndex((item) => item.isActive)
    if (activeIndex === -1) {
      return { delta: 0, guide: null }
    }

    const prev = items[activeIndex - 1]
    const prevPrev = items[activeIndex - 2]
    const next = items[activeIndex + 1]
    const nextNext = items[activeIndex + 2]
    const options: Array<{ delta: number; guide: SpacingGuide; diff: number }> = []
    const width = activeRight - activeLeft

    if (prev && prevPrev) {
      const { bounds: prevBounds } = prev
      const { bounds: prevPrevBounds } = prevPrev
      const gapRef = prevBounds.left - prevPrevBounds.right
      const gapActive = activeLeft - prevBounds.right
      const diff = Math.abs(gapActive - gapRef)

      if (diff <= threshold) {
        const delta = gapRef - gapActive
        const adjustedLeft = activeLeft + delta
        const guide: SpacingGuide = {
          type: 'horizontal',
          axis: centerY,
          refStart: prevPrevBounds.right,
          refEnd: prevBounds.left,
          activeStart: prevBounds.right,
          activeEnd: adjustedLeft,
          distance: gapRef
        }

        options.push({ delta, guide, diff })
      }
    }

    if (next && nextNext) {
      const { bounds: nextBounds } = next
      const { bounds: nextNextBounds } = nextNext
      const gapRef = nextNextBounds.left - nextBounds.right
      const gapActive = nextBounds.left - activeRight
      const diff = Math.abs(gapActive - gapRef)

      if (diff <= threshold) {
        const delta = gapActive - gapRef
        const adjustedRight = activeRight + delta
        const guide: SpacingGuide = {
          type: 'horizontal',
          axis: centerY,
          refStart: nextBounds.right,
          refEnd: nextNextBounds.left,
          activeStart: adjustedRight,
          activeEnd: nextBounds.left,
          distance: gapRef
        }

        options.push({ delta, guide, diff })
      }
    }

    if (prev && next) {
      const { bounds: prevBounds } = prev
      const { bounds: nextBounds } = next
      const totalGap = nextBounds.left - prevBounds.right
      const availableSpace = totalGap - width

      if (availableSpace >= 0) {
        const desiredGap = availableSpace / 2
        const gapLeft = activeLeft - prevBounds.right
        const gapRight = nextBounds.left - activeRight
        const diffLeft = Math.abs(gapLeft - desiredGap)
        const diffRight = Math.abs(gapRight - desiredGap)
        const diff = Math.max(diffLeft, diffRight)

        if (diff <= threshold) {
          const delta = desiredGap - gapLeft
          const adjustedRight = activeRight + delta
          const guide: SpacingGuide = {
            type: 'horizontal',
            axis: centerY,
            refStart: prevBounds.right,
            refEnd: prevBounds.right + desiredGap,
            activeStart: adjustedRight,
            activeEnd: adjustedRight + desiredGap,
            distance: desiredGap
          }

          options.push({ delta, guide, diff })
        }
      }
    }

    if (!options.length) {
      return { delta: 0, guide: null }
    }

    const bestOption = options.reduce((current, option) => {
      if (option.diff < current.diff) return option
      return current
    }, options[0])

    return {
      delta: bestOption.delta,
      guide: bestOption.guide
    }
  }

  /**
   * Ищет ближайшую линию привязки по одной оси.
   */
  private static _findAxisSnap({
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
   * Отрисовывает линии и бейджи для равноудалённых интервалов.
   */
  private static _drawSpacingGuide({
    context,
    guide,
    zoom
  }: {
    context: CanvasRenderingContext2D
    guide: SpacingGuide
    zoom: number
  }): void {
    const {
      type,
      axis,
      refStart,
      refEnd,
      activeStart,
      activeEnd,
      distance
    } = guide
    const distanceLabel = Math.round(distance).toString()

    context.beginPath()
    if (type === 'vertical') {
      context.moveTo(axis, refStart)
      context.lineTo(axis, refEnd)
      context.moveTo(axis, activeStart)
      context.lineTo(axis, activeEnd)
    } else {
      context.moveTo(refStart, axis)
      context.lineTo(refEnd, axis)
      context.moveTo(activeStart, axis)
      context.lineTo(activeEnd, axis)
    }
    context.stroke()

    SnappingManager._drawSpacingBadge({
      context,
      type,
      axis,
      start: refStart,
      end: refEnd,
      text: distanceLabel,
      zoom
    })
    SnappingManager._drawSpacingBadge({
      context,
      type,
      axis,
      start: activeStart,
      end: activeEnd,
      text: distanceLabel,
      zoom
    })
  }

  /**
   * Рисует прямоугольный бейдж расстояния в центре указанного интервала.
   */
  private static _drawSpacingBadge({
    context,
    type,
    axis,
    start,
    end,
    text,
    zoom
  }: {
    context: CanvasRenderingContext2D
    type: SpacingGuide['type']
    axis: number
    start: number
    end: number
    text: string
    zoom: number
  }): void {
    const fontSize = 12 / zoom
    const padding = 4 / zoom
    const radius = 4 / zoom
    const centerAlongInterval = (start + end) / 2

    context.save()
    context.setLineDash([])
    context.fillStyle = GUIDE_COLOR
    context.strokeStyle = GUIDE_COLOR
    context.lineWidth = GUIDE_WIDTH / zoom
    context.font = `${fontSize}px sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'

    const badgeWidth = context.measureText(text).width + padding * 2
    const badgeHeight = fontSize + padding * 2

    const x = type === 'vertical' ? axis : centerAlongInterval
    const y = type === 'vertical' ? centerAlongInterval : axis
    const rectX = x - (badgeWidth / 2)
    const rectY = y - (badgeHeight / 2)

    context.beginPath()
    SnappingManager._drawRoundedRectPath({
      context,
      x: rectX,
      y: rectY,
      width: badgeWidth,
      height: badgeHeight,
      radius
    })
    context.fill()

    context.fillStyle = '#ffffff'
    context.fillText(text, x, y)
    context.restore()
  }

  /**
   * Строит путь скруглённого прямоугольника.
   */
  private static _drawRoundedRectPath({
    context,
    x,
    y,
    width,
    height,
    radius
  }: {
    context: CanvasRenderingContext2D
    x: number
    y: number
    width: number
    height: number
    radius: number
  }): void {
    const safeRadius = Math.min(radius, width / 2, height / 2)

    context.moveTo(x + safeRadius, y)
    context.lineTo(x + width - safeRadius, y)
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
    context.lineTo(x + width, y + height - safeRadius)
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
    context.lineTo(x + safeRadius, y + height)
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
    context.lineTo(x, y + safeRadius)
    context.quadraticCurveTo(x, y, x + safeRadius, y)
    context.closePath()
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
      ,,
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
