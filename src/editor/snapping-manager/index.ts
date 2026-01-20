import {
  BasicTransformEvent,
  Canvas,
  FabricObject,
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

    const { deltaX, deltaY, guides } = snapResult

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

    this._applyGuides({
      guides,
      spacingGuides: spacingResult.guides
    })

    SnappingManager._applyMovementStep({ target })
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
