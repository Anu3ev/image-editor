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

type Gap = {
  size: number
  start: number
  end: number
  axis: number
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
   * Кеш существующих разрывов между объектами.
   */
  private cachedSpacingGaps: { vertical: Gap[]; horizontal: Gap[] } = { vertical: [], horizontal: [] }

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

    const threshold = SNAP_THRESHOLD / (this.canvas.getZoom() || 1)
    this._cacheAnchors({ activeObject: target })
    this._cacheSpacingGaps({
      activeObject: target,
      threshold
    })
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

    const zoom = this.canvas.getZoom() || 1
    const threshold = SNAP_THRESHOLD / zoom

    if (!this.anchors.vertical.length && !this.anchors.horizontal.length) {
      this._cacheAnchors({ activeObject: target })
    }
    if (!this.cachedSpacingGaps.vertical.length && !this.cachedSpacingGaps.horizontal.length) {
      this._cacheSpacingGaps({
        activeObject: target,
        threshold
      })
    }

    let activeBounds = this._getBounds({ object: target })
    if (!activeBounds) {
      this._clearGuides()
      return
    }

    const { canvas } = this
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
      activeBounds = this._getBounds({ object: target }) ?? activeBounds
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
      activeBounds = this._getBounds({ object: target }) ?? activeBounds
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
      this._drawSpacingGuide({
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
    this.cachedSpacingGaps = { vertical: [], horizontal: [] }
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
   * Кеширует все существующие интервалы между объектами на канвасе.
   */
  private _cacheSpacingGaps({
    activeObject,
    threshold
  }: {
    activeObject?: FabricObject | null
    threshold: number
  }): void {
    const targets = this._collectTargets({ activeObject })
    const bounds = targets
      .map((object) => this._getBounds({ object }))
      .filter((item): item is Bounds => Boolean(item))

    this.cachedSpacingGaps = {
      vertical: this._collectVerticalGaps({ items: bounds, threshold }),
      horizontal: this._collectHorizontalGaps({ items: bounds, threshold })
    }
  }

  /**
   * Собирает объекты, подходящие для прилипания, исключая активный объект и запрещённые id.
   */
  private _collectTargets({ activeObject }: { activeObject?: FabricObject | null }): FabricObject[] {
    const excluded = this._collectExcludedObjects({ activeObject })
    const targets: FabricObject[] = []

    this.canvas.forEachObject((object) => {
      if (object instanceof ActiveSelection) {
        object.getObjects().forEach((child) => {
          if (this._shouldIgnoreObject({ object: child, excluded })) return
          targets.push(child)
        })
        return
      }

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
      .map((object) => this._getBounds({ object }))
      .filter((bounds): bounds is Bounds => Boolean(bounds))

    const referenceVerticalGaps = this.cachedSpacingGaps.vertical.length
      ? this.cachedSpacingGaps.vertical
      : this._collectVerticalGaps({ items: candidateBounds, threshold })
    const referenceHorizontalGaps = this.cachedSpacingGaps.horizontal.length
      ? this.cachedSpacingGaps.horizontal
      : this._collectHorizontalGaps({ items: candidateBounds, threshold })

    const verticalResult = this._calculateVerticalSpacing({
      activeBounds,
      candidates: candidateBounds,
      threshold,
      referenceGaps: referenceVerticalGaps
    })
    const horizontalResult = this._calculateHorizontalSpacing({
      activeBounds,
      candidates: candidateBounds,
      threshold,
      referenceGaps: referenceHorizontalGaps
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
  private _calculateVerticalSpacing({
    activeBounds,
    candidates,
    threshold,
    referenceGaps
  }: {
    activeBounds: Bounds
    candidates: Bounds[]
    threshold: number
      referenceGaps: Gap[]
  }): { delta: number; guide: SpacingGuide | null } {
    const {
      centerX,
      top: activeTop,
      bottom: activeBottom
    } = activeBounds

    const aligned = candidates.filter((bounds) => this._isVerticallyAligned({
      activeBounds,
      candidateBounds: bounds,
      threshold
    }))

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

    const existingGaps = referenceGaps.length
      ? referenceGaps
      : this._collectVerticalGaps({
        items: items.filter((item) => !item.isActive).map((item) => item.bounds),
        threshold
      })
    const prev = items[activeIndex - 1]
    const next = items[activeIndex + 1]
    const options: Array<{ delta: number; guide: SpacingGuide; diff: number }> = []
    const height = activeBottom - activeTop

    if (prev) {
      const { bounds: prevBounds } = prev
      const gapActive = activeTop - prevBounds.bottom
      const reference = this._findMatchingGap({
        gaps: existingGaps,
        size: gapActive,
        threshold,
        axisCandidates: this._getVerticalAxes(activeBounds)
      })

      if (reference && reference.size > 0) {
        const delta = reference.size - gapActive
        const adjustedTop = activeTop + delta
        const guide: SpacingGuide = {
          type: 'vertical',
          axis: reference.axis,
          refStart: reference.start,
          refEnd: reference.end,
          activeStart: prevBounds.bottom,
          activeEnd: adjustedTop,
          distance: reference.size
        }

        options.push({ delta, guide, diff: reference.diff })
      }
    }

    if (next) {
      const { bounds: nextBounds } = next
      const gapActive = nextBounds.top - activeBottom
      const reference = this._findMatchingGap({
        gaps: existingGaps,
        size: gapActive,
        threshold,
        axisCandidates: this._getVerticalAxes(activeBounds)
      })

      if (reference && reference.size > 0) {
        const delta = reference.size - gapActive
        const adjustedBottom = activeBottom + delta
        const guide: SpacingGuide = {
          type: 'vertical',
          axis: reference.axis,
          refStart: reference.start,
          refEnd: reference.end,
          activeStart: adjustedBottom,
          activeEnd: nextBounds.top,
          distance: reference.size
        }

        options.push({ delta, guide, diff: reference.diff })
      }
    }

    if (prev && next) {
      const { bounds: prevBounds } = prev
      const { bounds: nextBounds } = next
      const totalGap = nextBounds.top - prevBounds.bottom
      const availableSpace = totalGap - height

      if (availableSpace > 0) {
        const desiredGap = availableSpace / 2
        const gapTop = activeTop - prevBounds.bottom
        const gapBottom = nextBounds.top - activeBottom
        const diffTop = Math.abs(gapTop - desiredGap)
        const diffBottom = Math.abs(gapBottom - desiredGap)
        const diff = Math.max(diffTop, diffBottom)

        if (diff <= threshold) {
          const delta = desiredGap - gapTop
          const adjustedTop = activeTop + delta
          const adjustedBottom = activeBottom + delta
          const axis = this._selectAxisForMiddleSpacing({
            activeBounds,
            prevBounds,
            nextBounds,
            orientation: 'vertical'
          })
          const guide: SpacingGuide = {
            type: 'vertical',
            axis,
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
  private _calculateHorizontalSpacing({
    activeBounds,
    candidates,
    threshold,
    referenceGaps
  }: {
    activeBounds: Bounds
    candidates: Bounds[]
    threshold: number
      referenceGaps: Gap[]
  }): { delta: number; guide: SpacingGuide | null } {
    const {
      centerY,
      left: activeLeft,
      right: activeRight
    } = activeBounds

    const aligned = candidates.filter((bounds) => this._isHorizontallyAligned({
      activeBounds,
      candidateBounds: bounds,
      threshold
    }))

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

    const existingGaps = referenceGaps.length
      ? referenceGaps
      : this._collectHorizontalGaps({
        items: items.filter((item) => !item.isActive).map((item) => item.bounds),
        threshold
      })
    const prev = items[activeIndex - 1]
    const next = items[activeIndex + 1]
    const options: Array<{ delta: number; guide: SpacingGuide; diff: number }> = []
    const width = activeRight - activeLeft

    if (prev) {
      const { bounds: prevBounds } = prev
      const gapActive = activeLeft - prevBounds.right
      const reference = this._findMatchingGap({
        gaps: existingGaps,
        size: gapActive,
        threshold,
        axisCandidates: this._getHorizontalAxes(activeBounds)
      })

      if (reference && reference.size > 0) {
        const delta = reference.size - gapActive
        const adjustedLeft = activeLeft + delta
        const guide: SpacingGuide = {
          type: 'horizontal',
          axis: reference.axis,
          refStart: reference.start,
          refEnd: reference.end,
          activeStart: prevBounds.right,
          activeEnd: adjustedLeft,
          distance: reference.size
        }

        options.push({ delta, guide, diff: reference.diff })
      }
    }

    if (next) {
      const { bounds: nextBounds } = next
      const gapActive = nextBounds.left - activeRight
      const reference = this._findMatchingGap({
        gaps: existingGaps,
        size: gapActive,
        threshold,
        axisCandidates: this._getHorizontalAxes(activeBounds)
      })

      if (reference && reference.size > 0) {
        const delta = reference.size - gapActive
        const adjustedRight = activeRight + delta
        const guide: SpacingGuide = {
          type: 'horizontal',
          axis: reference.axis,
          refStart: reference.start,
          refEnd: reference.end,
          activeStart: adjustedRight,
          activeEnd: nextBounds.left,
          distance: reference.size
        }

        options.push({ delta, guide, diff: reference.diff })
      }
    }

    if (prev && next) {
      const { bounds: prevBounds } = prev
      const { bounds: nextBounds } = next
      const totalGap = nextBounds.left - prevBounds.right
      const availableSpace = totalGap - width

      if (availableSpace > 0) {
        const desiredGap = availableSpace / 2
        const gapLeft = activeLeft - prevBounds.right
        const gapRight = nextBounds.left - activeRight
        const diffLeft = Math.abs(gapLeft - desiredGap)
        const diffRight = Math.abs(gapRight - desiredGap)
        const diff = Math.max(diffLeft, diffRight)

        if (diff <= threshold) {
          const delta = desiredGap - gapLeft
          const adjustedRight = activeRight + delta
          const axis = this._selectAxisForMiddleSpacing({
            activeBounds,
            prevBounds,
            nextBounds,
            orientation: 'horizontal'
          })
          const guide: SpacingGuide = {
            type: 'horizontal',
            axis,
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
   * Подбирает эталонный разрыв, подходящий по величине под текущий отступ.
   */
  private _findMatchingGap({
    gaps,
    size,
    threshold,
    axisCandidates
  }: {
    gaps: Gap[]
    size: number
    threshold: number
    axisCandidates: number[]
  }): ({ size: number; start: number; end: number; diff: number; axis: number; axisDiff: number }) | null {
    let best: { size: number; start: number; end: number; diff: number; axis: number; axisDiff: number } | null = null

    gaps.forEach((gap) => {
      const axisDiff = Math.min(...axisCandidates.map((axis) => Math.abs(axis - gap.axis)))
      if (axisDiff > threshold) return

      const sizeDiff = Math.abs(gap.size - size)
      if (sizeDiff > threshold) return

      if (!best || sizeDiff < best.diff || (sizeDiff === best.diff && axisDiff < best.axisDiff)) {
        best = { ...gap, diff: sizeDiff, axisDiff }
      }
    })

    return best
  }

  /**
   * Собирает вертикальные разрывы между отсортированными объектами.
   */
  private _collectVerticalGaps({
    items,
    threshold
  }: {
    items: Bounds[]
    threshold: number
  }): Gap[] {
    if (items.length < 2) return []

    const groups: Array<{ axis: number; items: Bounds[] }> = []

    items.forEach((bounds) => {
      this._getVerticalAxes(bounds).forEach((axis) => {
        this._addToAxisGroup({
          groups,
          axis,
          bounds,
          threshold
        })
      })
    })

    const gaps: Gap[] = []

    groups.forEach((group) => {
      if (group.items.length < 2) return

      const sorted = [...group.items].sort((a, b) => a.top - b.top)
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const current = sorted[i]
        const next = sorted[i + 1]
        const size = next.top - current.bottom

        if (size <= 0) continue

        gaps.push({
          size,
          start: current.bottom,
          end: next.top,
          axis: group.axis
        })
      }
    })

    return gaps
  }

  /**
   * Собирает горизонтальные разрывы между отсортированными объектами.
   */
  private _collectHorizontalGaps({
    items,
    threshold
  }: {
    items: Bounds[]
    threshold: number
  }): Gap[] {
    if (items.length < 2) return []

    const groups: Array<{ axis: number; items: Bounds[] }> = []

    items.forEach((bounds) => {
      this._getHorizontalAxes(bounds).forEach((axis) => {
        this._addToAxisGroup({
          groups,
          axis,
          bounds,
          threshold
        })
      })
    })

    const gaps: Gap[] = []

    groups.forEach((group) => {
      if (group.items.length < 2) return

      const sorted = [...group.items].sort((a, b) => a.left - b.left)
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const current = sorted[i]
        const next = sorted[i + 1]
        const size = next.left - current.right

        if (size <= 0) continue

        gaps.push({
          size,
          start: current.right,
          end: next.left,
          axis: group.axis
        })
      }
    })

    return gaps
  }

  /**
   * Добавляет bounds в группу по близкой оси.
   */
  private _addToAxisGroup({
    groups,
    axis,
    bounds,
    threshold
  }: {
    groups: Array<{ axis: number; items: Bounds[] }>
    axis: number
    bounds: Bounds
    threshold: number
  }): void {
    const group = groups.find((item) => Math.abs(item.axis - axis) <= threshold)

    if (group) {
      if (group.items.includes(bounds)) return
      const nextSize = group.items.length + 1
      group.axis = ((group.axis * group.items.length) + axis) / nextSize
      group.items.push(bounds)
      return
    }

    groups.push({
      axis,
      items: [bounds]
    })
  }

  /**
   * Проверяет вертикальное выравнивание по центру или краям.
   */
  private _isVerticallyAligned({
    activeBounds,
    candidateBounds,
    threshold
  }: {
    activeBounds: Bounds
    candidateBounds: Bounds
    threshold: number
  }): boolean {
    const activeAxes = this._getVerticalAxes(activeBounds)
    const candidateAxes = this._getVerticalAxes(candidateBounds)

    const minDiff = activeAxes.reduce((current, axis) => {
      const diff = Math.min(...candidateAxes.map((candidateAxis) => Math.abs(candidateAxis - axis)))
      return Math.min(current, diff)
    }, Number.POSITIVE_INFINITY)

    return minDiff <= threshold
  }

  /**
   * Проверяет горизонтальное выравнивание по центру или краям.
   */
  private _isHorizontallyAligned({
    activeBounds,
    candidateBounds,
    threshold
  }: {
    activeBounds: Bounds
    candidateBounds: Bounds
    threshold: number
  }): boolean {
    const activeAxes = this._getHorizontalAxes(activeBounds)
    const candidateAxes = this._getHorizontalAxes(candidateBounds)

    const minDiff = activeAxes.reduce((current, axis) => {
      const diff = Math.min(...candidateAxes.map((candidateAxis) => Math.abs(candidateAxis - axis)))
      return Math.min(current, diff)
    }, Number.POSITIVE_INFINITY)

    return minDiff <= threshold
  }

  /**
   * Возвращает возможные оси для вертикального выравнивания.
   */
  private _getVerticalAxes(bounds: Bounds): number[] {
    const { left, centerX, right } = bounds
    return [left, centerX, right]
  }

  /**
   * Возвращает возможные оси для горизонтального выравнивания.
   */
  private _getHorizontalAxes(bounds: Bounds): number[] {
    const { top, centerY, bottom } = bounds
    return [top, centerY, bottom]
  }

  /**
   * Выбирает ось для отрисовки направляющей в сценарии деления промежутка пополам.
   */
  private _selectAxisForMiddleSpacing({
    activeBounds,
    prevBounds,
    nextBounds,
    orientation
  }: {
    activeBounds: Bounds
    prevBounds: Bounds
    nextBounds: Bounds
    orientation: 'vertical' | 'horizontal'
  }): number {
    const activeAxes = orientation === 'vertical'
      ? this._getVerticalAxes(activeBounds)
      : this._getHorizontalAxes(activeBounds)
    const prevAxes = orientation === 'vertical'
      ? this._getVerticalAxes(prevBounds)
      : this._getHorizontalAxes(prevBounds)
    const nextAxes = orientation === 'vertical'
      ? this._getVerticalAxes(nextBounds)
      : this._getHorizontalAxes(nextBounds)

    let bestAxis = activeAxes[0]
    let bestScore = Number.POSITIVE_INFINITY

    activeAxes.forEach((axis) => {
      const diffPrev = Math.min(...prevAxes.map((value) => Math.abs(value - axis)))
      const diffNext = Math.min(...nextAxes.map((value) => Math.abs(value - axis)))
      const score = diffPrev + diffNext

      if (score < bestScore) {
        bestScore = score
        bestAxis = axis
      }
    })

    return bestAxis
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
   * Отрисовывает линии и бейджи для равноудалённых интервалов.
   */
  private _drawSpacingGuide({
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
    if (distance <= 0) return
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

    this._drawSpacingBadge({
      context,
      type,
      axis,
      start: refStart,
      end: refEnd,
      text: distanceLabel,
      zoom
    })
    this._drawSpacingBadge({
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
  private _drawSpacingBadge({
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
    this._drawRoundedRectPath({
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
  private _drawRoundedRectPath({
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
