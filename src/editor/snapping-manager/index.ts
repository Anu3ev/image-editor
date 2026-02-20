import {
  BasicTransformEvent,
  Canvas,
  FabricObject,
  Textbox,
  Transform,
  TPointerEvent,
  TPointerEventInfo
} from 'fabric'

import { ImageEditor } from '..'
import {
  GUIDE_COLOR,
  GUIDE_WIDTH,
  MOVE_SNAP_STEP,
  SNAP_THRESHOLD
} from './constants'
import {
  calculateSnap,
  calculateSpacingSnap
} from './calculations'
import { drawSpacingGuide } from './renderer'
import type {
  AnchorBuckets,
  Bounds,
  GuideBounds,
  GuideLine,
  SpacingGuide,
  SpacingPattern
} from './types'
import {
  buildSpacingPatterns,
  pushBoundsToAnchors
} from './utils'
import { getObjectBounds } from '../utils/geometry'
import {
  collectExcludedObjects,
  shouldIgnoreObject
} from '../utils/object-filter'

type TransformEvent = BasicTransformEvent<TPointerEvent> & {
  target?: FabricObject | null
  e?: TPointerEvent | null
}

type MouseEventInfo = TPointerEventInfo<TPointerEvent> & {
  target?: FabricObject | null
}

type AxisSnapEdge = 'left' | 'right' | 'top' | 'bottom'

type AxisSnapCandidate = {
  edge: AxisSnapEdge
  position: number
}

type AxisSnapResult = {
  delta: number
  guidePosition: number | null
  candidate: AxisSnapCandidate | null
}

type ScalingAxisState = {
  isCornerHandle: boolean
  shouldSnapX: boolean
  shouldSnapY: boolean
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
   * Кешированные интервалы между объектами.
   */
  private spacingPatterns: { vertical: SpacingPattern[]; horizontal: SpacingPattern[] } = {
    vertical: [],
    horizontal: []
  }

  /**
   * Кешированные границы доступных объектов.
   */
  private cachedTargetBounds: Bounds[] = []

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
   * Обработчик масштабирования объекта.
   */
  private _onObjectScaling: (event: TransformEvent) => void

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
    this._onObjectScaling = this._handleObjectScaling.bind(this)
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
    canvas.on('object:scaling', this._onObjectScaling)
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
    canvas.off('object:scaling', this._onObjectScaling)
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

    const isCtrlPressed = Boolean(e?.ctrlKey)
    if (isCtrlPressed) {
      this._clearGuides()
      SnappingManager._applyMovementStep({ target })
      return
    }

    SnappingManager._applyMovementStep({ target })

    if (!this.anchors.vertical.length && !this.anchors.horizontal.length) {
      this._cacheAnchors({ activeObject: target })
    }

    let activeBounds = getObjectBounds({ object: target })
    if (!activeBounds) {
      this._clearGuides()
      return
    }

    const { canvas } = this
    const zoom = canvas.getZoom() || 1
    const threshold = SNAP_THRESHOLD / zoom
    const snapResult = calculateSnap({
      activeBounds,
      threshold,
      anchors: this.anchors
    })

    const { deltaX, deltaY } = snapResult

    if (deltaX !== 0 || deltaY !== 0) {
      const { left = 0, top = 0 } = target
      target.set({
        left: left + deltaX,
        top: top + deltaY
      })
      target.setCoords()
      activeBounds = getObjectBounds({ object: target }) ?? activeBounds
    }

    const candidateBounds = this.cachedTargetBounds.length
      ? this.cachedTargetBounds
      : this._collectTargets({ activeObject: target })
        .map((object) => getObjectBounds({ object }))
        .filter((bounds): bounds is Bounds => Boolean(bounds))

    const spacingResult = calculateSpacingSnap({
      activeBounds,
      candidates: candidateBounds,
      threshold,
      spacingPatterns: this.spacingPatterns
    })

    if (spacingResult.deltaX !== 0 || spacingResult.deltaY !== 0) {
      const { left = 0, top = 0 } = target
      target.set({
        left: left + spacingResult.deltaX,
        top: top + spacingResult.deltaY
      })
      target.setCoords()
      activeBounds = getObjectBounds({ object: target }) ?? activeBounds
    }

    SnappingManager._applyMovementStep({ target })

    const finalBounds = getObjectBounds({ object: target }) ?? activeBounds
    const visualSnapResult = calculateSnap({
      activeBounds: finalBounds,
      threshold,
      anchors: this.anchors
    })
    const visualSpacingResult = calculateSpacingSnap({
      activeBounds: finalBounds,
      candidates: candidateBounds,
      threshold,
      spacingPatterns: this.spacingPatterns
    })

    this._applyGuides({
      guides: visualSnapResult.guides,
      spacingGuides: visualSpacingResult.guides
    })
  }

  /**
   * Выполняет привязку объекта к ближайшим линиям при его масштабировании.
   */
  private _handleObjectScaling(event: TransformEvent): void {
    const { target, e, transform } = event

    if (!target || !transform) {
      this._clearGuides()
      return
    }

    const isCtrlPressed = Boolean(e?.ctrlKey)
    if (isCtrlPressed) {
      this._clearGuides()
      return
    }

    const {
      shouldSnapX,
      shouldSnapY,
      isCornerHandle
    } = SnappingManager._resolveScalingAxisState({ transform })

    if (!shouldSnapX && !shouldSnapY) {
      this._clearGuides()
      return
    }

    const { anchors } = this
    const {
      vertical: verticalAnchors,
      horizontal: horizontalAnchors
    } = anchors
    if (!verticalAnchors.length && !horizontalAnchors.length) {
      this._cacheAnchors({ activeObject: target })
    }

    const activeBounds = getObjectBounds({ object: target })
    if (!activeBounds) {
      this._clearGuides()
      return
    }

    const { canvas } = this
    const zoom = canvas.getZoom() || 1
    const threshold = SNAP_THRESHOLD / zoom

    const {
      originX: transformOriginX,
      originY: transformOriginY
    } = transform
    const {
      originX: targetOriginX = 'left',
      originY: targetOriginY = 'top',
      scaleX = 1,
      scaleY = 1
    } = target
    const originX = transformOriginX ?? targetOriginX
    const originY = transformOriginY ?? targetOriginY

    const verticalCandidates = SnappingManager._collectVerticalSnapCandidates({
      bounds: activeBounds,
      originX,
      shouldSnapX
    })
    const horizontalCandidates = SnappingManager._collectHorizontalSnapCandidates({
      bounds: activeBounds,
      originY,
      shouldSnapY
    })

    const verticalSnap = SnappingManager._findAxisSnapCandidate({
      anchors: verticalAnchors,
      candidates: verticalCandidates,
      threshold
    })
    const horizontalSnap = SnappingManager._findAxisSnapCandidate({
      anchors: horizontalAnchors,
      candidates: horizontalCandidates,
      threshold
    })

    const { guidePosition: verticalGuidePosition } = verticalSnap
    const { guidePosition: horizontalGuidePosition } = horizontalSnap
    const hasVerticalSnap = verticalGuidePosition !== null
    const hasHorizontalSnap = horizontalGuidePosition !== null

    if (!hasVerticalSnap && !hasHorizontalSnap) {
      this._clearGuides()
      return
    }

    const guides: GuideLine[] = []
    let nextScaleX: number | null = null
    let nextScaleY: number | null = null

    if (isCornerHandle) {
      const uniformResult = SnappingManager._resolveUniformScale({
        bounds: activeBounds,
        originX,
        originY,
        verticalSnap,
        horizontalSnap
      })

      if (uniformResult) {
        const { scaleFactor, guide } = uniformResult
        nextScaleX = scaleX * scaleFactor
        nextScaleY = scaleY * scaleFactor
        guides.push(guide)
      }
    }

    if (!isCornerHandle) {
      const { angle = 0 } = target
      const { width: baseWidth, height: baseHeight } = SnappingManager._resolveBaseDimensions({ target })
      const absScaleX = Math.abs(scaleX) || 1
      const absScaleY = Math.abs(scaleY) || 1

      if (hasVerticalSnap) {
        const desiredWidth = SnappingManager._resolveDesiredWidth({
          bounds: activeBounds,
          originX,
          snap: verticalSnap
        })

        if (desiredWidth !== null) {
          const absNextScaleX = SnappingManager._resolveScaleForWidth({
            desiredWidth,
            baseWidth,
            baseHeight,
            scaleY: absScaleY,
            angle
          })

          if (absNextScaleX !== null) {
            const scaleSignX = scaleX < 0 ? -1 : 1
            nextScaleX = absNextScaleX * scaleSignX
            if (verticalGuidePosition !== null) {
              guides.push({
                type: 'vertical',
                position: verticalGuidePosition
              })
            }
          }
        }
      }

      if (hasHorizontalSnap) {
        const desiredHeight = SnappingManager._resolveDesiredHeight({
          bounds: activeBounds,
          originY,
          snap: horizontalSnap
        })

        if (desiredHeight !== null) {
          const absNextScaleY = SnappingManager._resolveScaleForHeight({
            desiredHeight,
            baseWidth,
            baseHeight,
            scaleX: absScaleX,
            angle
          })

          if (absNextScaleY !== null) {
            const scaleSignY = scaleY < 0 ? -1 : 1
            nextScaleY = absNextScaleY * scaleSignY
            if (horizontalGuidePosition !== null) {
              guides.push({
                type: 'horizontal',
                position: horizontalGuidePosition
              })
            }
          }
        }
      }
    }

    const hasScaleUpdates = nextScaleX !== null || nextScaleY !== null
    if (!hasScaleUpdates && !guides.length) {
      this._clearGuides()
      return
    }

    if (hasScaleUpdates) {
      const centerPoint = target.getRelativeCenterPoint()
      const anchorPoint = target.translateToOriginPoint(centerPoint, originX, originY)
      const updates: Partial<FabricObject> = {}

      if (nextScaleX !== null) {
        updates.scaleX = nextScaleX
        transform.scaleX = nextScaleX
      }

      if (nextScaleY !== null) {
        updates.scaleY = nextScaleY
        transform.scaleY = nextScaleY
      }

      if (Object.keys(updates).length) {
        target.set(updates)
        target.setPositionByOrigin(anchorPoint, originX, originY)
        target.setCoords()
      }
    }

    this._applyGuides({
      guides,
      spacingGuides: []
    })
  }

  /**
   * Применяет прилипания при горизонтальном ресайзе текстового объекта.
   */
  public applyTextResizingSnap({
    target,
    transform,
    event
  }: {
    target?: FabricObject | null
    transform?: Transform | null
    event?: TPointerEvent | null
  }): void {
    if (!target || !(target instanceof Textbox)) return

    if (!transform) {
      this._clearGuides()
      return
    }

    const isCtrlPressed = Boolean(event?.ctrlKey)
    if (isCtrlPressed) {
      this._clearGuides()
      return
    }

    const { corner = '' } = transform
    const isHorizontalHandle = corner === 'ml' || corner === 'mr'
    if (!isHorizontalHandle) {
      this._clearGuides()
      return
    }

    const { anchors } = this
    const {
      vertical: verticalAnchors,
      horizontal: horizontalAnchors
    } = anchors
    if (!verticalAnchors.length && !horizontalAnchors.length) {
      this._cacheAnchors({ activeObject: target })
    }

    const activeBounds = getObjectBounds({ object: target })
    if (!activeBounds) {
      this._clearGuides()
      return
    }

    const { canvas } = this
    const zoom = canvas.getZoom() || 1
    const threshold = SNAP_THRESHOLD / zoom

    const { originX: transformOriginX, originY: transformOriginY } = transform
    const {
      originX: targetOriginX = 'left',
      originY: targetOriginY = 'top'
    } = target
    const originX = transformOriginX ?? targetOriginX
    const originY = transformOriginY ?? targetOriginY

    const verticalCandidates = SnappingManager._collectVerticalSnapCandidates({
      bounds: activeBounds,
      originX,
      shouldSnapX: true
    })
    const verticalSnap = SnappingManager._findAxisSnapCandidate({
      anchors: verticalAnchors,
      candidates: verticalCandidates,
      threshold
    })

    const { guidePosition: verticalGuidePosition } = verticalSnap
    if (verticalGuidePosition === null) {
      this._clearGuides()
      return
    }

    const desiredWidth = SnappingManager._resolveDesiredWidth({
      bounds: activeBounds,
      originX,
      snap: verticalSnap
    })

    if (desiredWidth === null) {
      this._clearGuides()
      return
    }

    const nextWidth = SnappingManager._resolveTextWidthForBounds({
      target,
      boundsWidth: desiredWidth
    })

    if (nextWidth === null) {
      this._clearGuides()
      return
    }

    const { width: currentWidth = 0 } = target
    if (nextWidth !== currentWidth) {
      const centerPoint = target.getRelativeCenterPoint()
      const anchorPoint = target.translateToOriginPoint(centerPoint, originX, originY)
      target.set({ width: nextWidth })
      target.setPositionByOrigin(anchorPoint, originX, originY)
      target.setCoords()
    }

    this._applyGuides({
      guides: [
        {
          type: 'vertical',
          position: verticalGuidePosition
        }
      ],
      spacingGuides: []
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
      drawSpacingGuide({
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
    this.spacingPatterns = { vertical: [], horizontal: [] }
    this.cachedTargetBounds = []
  }

  /**
   * Определяет активные оси масштабирования по углу и действию трансформации.
   */
  private static _resolveScalingAxisState({ transform }: { transform: Transform }): ScalingAxisState {
    const { corner = '', action = '' } = transform
    const isHorizontalHandle = corner === 'ml' || corner === 'mr' || action === 'scaleX'
    const isVerticalHandle = corner === 'mt' || corner === 'mb' || action === 'scaleY'
    const isCornerHandle = corner === 'tl'
      || corner === 'tr'
      || corner === 'bl'
      || corner === 'br'
      || action === 'scale'

    return {
      isCornerHandle,
      shouldSnapX: isHorizontalHandle || isCornerHandle,
      shouldSnapY: isVerticalHandle || isCornerHandle
    }
  }

  /**
   * Собирает кандидаты на вертикальное прилипания по текущему originX.
   */
  private static _collectVerticalSnapCandidates({
    bounds,
    originX,
    shouldSnapX
  }: {
    bounds: Bounds
    originX: Transform['originX']
    shouldSnapX: boolean
  }): AxisSnapCandidate[] {
    const candidates: AxisSnapCandidate[] = []
    if (!shouldSnapX) return candidates

    const { left, right } = bounds
    let resolvedOriginX: 'left' | 'center' | 'right' = 'left'
    if (originX === 'center' || originX === 'right') {
      resolvedOriginX = originX
    }

    if (resolvedOriginX === 'left') {
      candidates.push({
        edge: 'right',
        position: right
      })
    }

    if (resolvedOriginX === 'right') {
      candidates.push({
        edge: 'left',
        position: left
      })
    }

    if (resolvedOriginX === 'center') {
      candidates.push({
        edge: 'left',
        position: left
      })
      candidates.push({
        edge: 'right',
        position: right
      })
    }

    return candidates
  }

  /**
   * Собирает кандидаты на горизонтальное прилипания по текущему originY.
   */
  private static _collectHorizontalSnapCandidates({
    bounds,
    originY,
    shouldSnapY
  }: {
    bounds: Bounds
    originY: Transform['originY']
    shouldSnapY: boolean
  }): AxisSnapCandidate[] {
    const candidates: AxisSnapCandidate[] = []
    if (!shouldSnapY) return candidates

    const { top, bottom } = bounds
    let resolvedOriginY: 'top' | 'center' | 'bottom' = 'top'
    if (originY === 'center' || originY === 'bottom') {
      resolvedOriginY = originY
    }

    if (resolvedOriginY === 'top') {
      candidates.push({
        edge: 'bottom',
        position: bottom
      })
    }

    if (resolvedOriginY === 'bottom') {
      candidates.push({
        edge: 'top',
        position: top
      })
    }

    if (resolvedOriginY === 'center') {
      candidates.push({
        edge: 'top',
        position: top
      })
      candidates.push({
        edge: 'bottom',
        position: bottom
      })
    }

    return candidates
  }

  /**
   * Находит ближайший кандидат прилипания с учетом порога и возвращает дельту.
   */
  private static _findAxisSnapCandidate({
    anchors,
    candidates,
    threshold
  }: {
    anchors: number[]
    candidates: AxisSnapCandidate[]
    threshold: number
  }): AxisSnapResult {
    let nearestDelta = 0
    let nearestDistance = threshold + 1
    let guidePosition: number | null = null
    let candidate: AxisSnapCandidate | null = null

    for (const snapCandidate of candidates) {
      const { position } = snapCandidate

      for (const anchor of anchors) {
        const distance = Math.abs(anchor - position)
        if (distance > threshold || distance >= nearestDistance) continue

        nearestDelta = anchor - position
        nearestDistance = distance
        guidePosition = anchor
        candidate = snapCandidate
      }
    }

    return {
      delta: nearestDelta,
      guidePosition,
      candidate
    }
  }

  /**
   * Рассчитывает коэффициент равномерного масштаба и соответствующий гайд.
   */
  private static _resolveUniformScale({
    bounds,
    originX,
    originY,
    verticalSnap,
    horizontalSnap
  }: {
    bounds: Bounds
    originX: Transform['originX']
    originY: Transform['originY']
    verticalSnap: AxisSnapResult
    horizontalSnap: AxisSnapResult
  }): { scaleFactor: number; guide: GuideLine } | null {
    const {
      left,
      right,
      top,
      bottom
    } = bounds
    const currentWidth = right - left
    const currentHeight = bottom - top

    const {
      guidePosition: verticalGuidePosition,
      delta: verticalDelta
    } = verticalSnap
    const {
      guidePosition: horizontalGuidePosition,
      delta: horizontalDelta
    } = horizontalSnap

    let scaleFactorX: number | null = null
    let scaleFactorY: number | null = null

    if (verticalGuidePosition !== null && currentWidth > 0) {
      const desiredWidth = SnappingManager._resolveDesiredWidth({
        bounds,
        originX,
        snap: verticalSnap
      })

      if (desiredWidth !== null) {
        const factor = desiredWidth / currentWidth
        if (Number.isFinite(factor) && factor > 0) {
          scaleFactorX = factor
        }
      }
    }

    if (horizontalGuidePosition !== null && currentHeight > 0) {
      const desiredHeight = SnappingManager._resolveDesiredHeight({
        bounds,
        originY,
        snap: horizontalSnap
      })

      if (desiredHeight !== null) {
        const factor = desiredHeight / currentHeight
        if (Number.isFinite(factor) && factor > 0) {
          scaleFactorY = factor
        }
      }
    }

    let chosenAxis: 'x' | 'y' | null = null
    if (scaleFactorX !== null && scaleFactorY === null) {
      chosenAxis = 'x'
    }
    if (scaleFactorY !== null && scaleFactorX === null) {
      chosenAxis = 'y'
    }
    if (scaleFactorX !== null && scaleFactorY !== null) {
      const absVerticalDelta = Math.abs(verticalDelta)
      const absHorizontalDelta = Math.abs(horizontalDelta)

      if (absVerticalDelta <= absHorizontalDelta) {
        chosenAxis = 'x'
      }
      if (absVerticalDelta > absHorizontalDelta) {
        chosenAxis = 'y'
      }
    }

    if (chosenAxis === 'x' && scaleFactorX !== null && verticalGuidePosition !== null) {
      return {
        scaleFactor: scaleFactorX,
        guide: {
          type: 'vertical',
          position: verticalGuidePosition
        }
      }
    }

    if (chosenAxis === 'y' && scaleFactorY !== null && horizontalGuidePosition !== null) {
      return {
        scaleFactor: scaleFactorY,
        guide: {
          type: 'horizontal',
          position: horizontalGuidePosition
        }
      }
    }

    return null
  }

  /**
   * Рассчитывает требуемую ширину bounding-box для прилипания по X.
   */
  private static _resolveDesiredWidth({
    bounds,
    originX,
    snap
  }: {
    bounds: Bounds
    originX: Transform['originX']
    snap: AxisSnapResult
  }): number | null {
    const { left, right, centerX } = bounds
    const { candidate, guidePosition } = snap
    if (!candidate || guidePosition === null) return null

    let resolvedOriginX: 'left' | 'center' | 'right' = 'left'
    if (originX === 'center' || originX === 'right') {
      resolvedOriginX = originX
    }

    const { edge } = candidate
    let desiredWidth: number | null = null

    if (resolvedOriginX === 'left' && edge === 'right') {
      desiredWidth = guidePosition - left
    }
    if (resolvedOriginX === 'right' && edge === 'left') {
      desiredWidth = right - guidePosition
    }
    if (resolvedOriginX === 'center' && edge === 'left') {
      desiredWidth = (centerX - guidePosition) * 2
    }
    if (resolvedOriginX === 'center' && edge === 'right') {
      desiredWidth = (guidePosition - centerX) * 2
    }

    if (desiredWidth === null) return null
    if (!Number.isFinite(desiredWidth) || desiredWidth <= 0) return null

    return desiredWidth
  }

  /**
   * Рассчитывает требуемую высоту bounding-box для прилипания по Y.
   */
  private static _resolveDesiredHeight({
    bounds,
    originY,
    snap
  }: {
    bounds: Bounds
    originY: Transform['originY']
    snap: AxisSnapResult
  }): number | null {
    const { top, bottom, centerY } = bounds
    const { candidate, guidePosition } = snap
    if (!candidate || guidePosition === null) return null

    let resolvedOriginY: 'top' | 'center' | 'bottom' = 'top'
    if (originY === 'center' || originY === 'bottom') {
      resolvedOriginY = originY
    }

    const { edge } = candidate
    let desiredHeight: number | null = null

    if (resolvedOriginY === 'top' && edge === 'bottom') {
      desiredHeight = guidePosition - top
    }
    if (resolvedOriginY === 'bottom' && edge === 'top') {
      desiredHeight = bottom - guidePosition
    }
    if (resolvedOriginY === 'center' && edge === 'top') {
      desiredHeight = (centerY - guidePosition) * 2
    }
    if (resolvedOriginY === 'center' && edge === 'bottom') {
      desiredHeight = (guidePosition - centerY) * 2
    }

    if (desiredHeight === null) return null
    if (!Number.isFinite(desiredHeight) || desiredHeight <= 0) return null

    return desiredHeight
  }

  /**
   * Возвращает базовые размеры объекта без учета масштаба, включая отступы текста.
   */
  private static _resolveBaseDimensions({ target }: { target: FabricObject }): { width: number; height: number } {
    const {
      width: rawWidth = 0,
      height: rawHeight = 0
    } = target
    let width = rawWidth
    let height = rawHeight

    if (target instanceof Textbox) {
      const {
        paddingTop = 0,
        paddingRight = 0,
        paddingBottom = 0,
        paddingLeft = 0,
        strokeWidth = 0
      } = target
      width = rawWidth + paddingLeft + paddingRight + strokeWidth
      height = rawHeight + paddingTop + paddingBottom + strokeWidth
    }

    return {
      width,
      height
    }
  }

  /**
   * Рассчитывает масштаб по оси X для заданной ширины bounding-box.
   */
  private static _resolveScaleForWidth({
    desiredWidth,
    baseWidth,
    baseHeight,
    scaleY,
    angle
  }: {
    desiredWidth: number
    baseWidth: number
    baseHeight: number
    scaleY: number
    angle: number
  }): number | null {
    const radians = (angle * Math.PI) / 180
    const cos = Math.abs(Math.cos(radians))
    const sin = Math.abs(Math.sin(radians))
    const widthComponent = baseWidth * cos
    const heightComponent = baseHeight * scaleY * sin

    if (widthComponent <= 0) return null

    const nextScaleX = (desiredWidth - heightComponent) / widthComponent
    if (!Number.isFinite(nextScaleX) || nextScaleX <= 0) return null

    return nextScaleX
  }

  /**
   * Рассчитывает масштаб по оси Y для заданной высоты bounding-box.
   */
  private static _resolveScaleForHeight({
    desiredHeight,
    baseWidth,
    baseHeight,
    scaleX,
    angle
  }: {
    desiredHeight: number
    baseWidth: number
    baseHeight: number
    scaleX: number
    angle: number
  }): number | null {
    const radians = (angle * Math.PI) / 180
    const cos = Math.abs(Math.cos(radians))
    const sin = Math.abs(Math.sin(radians))
    const heightComponent = baseHeight * cos
    const widthComponent = baseWidth * scaleX * sin

    if (heightComponent <= 0) return null

    const nextScaleY = (desiredHeight - widthComponent) / heightComponent
    if (!Number.isFinite(nextScaleY) || nextScaleY <= 0) return null

    return nextScaleY
  }

  /**
   * Приводит ширину bounding-box текста к ширине текстового блока.
   */
  private static _resolveTextWidthForBounds({
    target,
    boundsWidth
  }: {
    target: Textbox
    boundsWidth: number
  }): number | null {
    const {
      paddingLeft = 0,
      paddingRight = 0,
      strokeWidth = 0
    } = target

    const rawWidth = boundsWidth - paddingLeft - paddingRight - strokeWidth
    if (!Number.isFinite(rawWidth) || rawWidth <= 0) return null

    return Math.max(1, Math.round(rawWidth))
  }

  /**
   * Применяет шаг перемещения, округляя координаты объекта к сетке MOVE_SNAP_STEP.
   */
  private static _applyMovementStep({ target }: { target: FabricObject }): void {
    const { left = 0, top = 0 } = target
    const snappedLeft = Math.round(left / MOVE_SNAP_STEP) * MOVE_SNAP_STEP
    const snappedTop = Math.round(top / MOVE_SNAP_STEP) * MOVE_SNAP_STEP
    const isAlreadySnapped = snappedLeft === left && snappedTop === top

    if (isAlreadySnapped) return

    target.set({
      left: snappedLeft,
      top: snappedTop
    })
    target.setCoords()
  }

  /**
   * Сохраняет линии для прилипания от всех доступных объектов и монтажной области.
   */
  private _cacheAnchors({ activeObject }: { activeObject?: FabricObject | null }): void {
    const targets = this._collectTargets({ activeObject })
    const nextAnchors: AnchorBuckets = { vertical: [], horizontal: [] }
    const targetBounds: Bounds[] = []

    for (const object of targets) {
      const bounds = getObjectBounds({ object })
      if (!bounds) continue
      pushBoundsToAnchors({ anchors: nextAnchors, bounds })
      targetBounds.push(bounds)
    }

    const { montageArea } = this.editor
    const montageBounds = getObjectBounds({ object: montageArea })

    if (montageBounds) {
      pushBoundsToAnchors({ anchors: nextAnchors, bounds: montageBounds })
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
    this.spacingPatterns = buildSpacingPatterns({ bounds: targetBounds })
    this.cachedTargetBounds = targetBounds
  }

  /**
   * Собирает объекты, подходящие для прилипания, исключая активный объект и запрещённые id.
   */
  private _collectTargets({ activeObject }: { activeObject?: FabricObject | null }): FabricObject[] {
    const excluded = collectExcludedObjects({ activeObject })
    const targets: FabricObject[] = []

    this.canvas.forEachObject((object) => {
      if (shouldIgnoreObject({ object, excluded })) return
      targets.push(object)
    })

    return targets
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
