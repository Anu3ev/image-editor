import {
  Canvas,
  FabricObject,
  TPointerEvent,
  TPointerEventInfo
} from 'fabric'

import { ImageEditor } from '..'
import { getObjectBounds } from '../utils/geometry'
import {
  collectExcludedObjects,
  shouldIgnoreObject
} from '../utils/object-filter'
import { drawGuideLabel } from '../utils/render-utils'
import { resolveDisplayDistance } from '../utils/distance'
import {
  MEASUREMENT_COLOR,
  MEASUREMENT_LINE_WIDTH
} from './constants'
import type { Bounds, MeasurementGuide } from './types'

type MouseMoveEvent = TPointerEventInfo<TPointerEvent> & {
  target?: FabricObject | null
}

/**
 * Менеджер отвечает за отображение расстояний между выделенными объектами и объектом под курсором при зажатом ALT.
 */
export default class MeasurementManager {
  /**
   * Инстанс редактора.
   */
  public editor: ImageEditor

  /**
   * Канвас редактора.
   */
  private canvas: Canvas

  /**
   * Текущие направляющие измерений.
   */
  private activeGuides: MeasurementGuide[] = []

  /**
   * Флаг удержания клавиши ALT.
   */
  private isAltPressed: boolean = false

  /**
   * Последнее движение мыши для отложенной обработки.
   */
  private pendingEvent: MouseMoveEvent | null = null

  /**
   * Идентификатор активного requestAnimationFrame.
   */
  private frameRequest: number | null = null

  /**
   * Флаг скрытия тулбара в режиме измерений.
   */
  private isToolbarHidden: boolean = false

  /**
   * Признак, что текущая цель измерения — монтажная область.
   */
  private isTargetMontageArea: boolean = false

  /**
   * Последнее известное событие движения мыши.
   */
  private lastMouseEvent: MouseMoveEvent | null = null

  /**
   * Обработчик движения мыши.
   */
  private _onMouseMove: (event: MouseMoveEvent) => void

  /**
   * Обработчик очистки перед рендером.
   */
  private _onBeforeRender: () => void

  /**
   * Обработчик отрисовки направляющих.
   */
  private _onAfterRender: () => void

  /**
   * Обработчик сброса при очистке выделения.
   */
  private _onSelectionCleared: () => void

  /**
   * Обработчик нажатия клавиш.
   */
  private _onKeyDown: (event: KeyboardEvent) => void

  /**
   * Обработчик отпускания клавиш.
   */
  private _onKeyUp: (event: KeyboardEvent) => void

  /**
   * Обработчик потери фокуса окна.
   */
  private _onWindowBlur: () => void

  /**
   * Создаёт менеджер измерений и инициализирует события.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas

    this._onMouseMove = this._handleMouseMove.bind(this)
    this._onBeforeRender = this._handleBeforeRender.bind(this)
    this._onAfterRender = this._handleAfterRender.bind(this)
    this._onSelectionCleared = this._handleSelectionCleared.bind(this)
    this._onKeyDown = this._handleKeyDown.bind(this)
    this._onKeyUp = this._handleKeyUp.bind(this)
    this._onWindowBlur = this._handleWindowBlur.bind(this)

    this._bindEvents()
  }

  /**
   * Отключает менеджер и убирает все слушатели.
   */
  public destroy(): void {
    this._unbindEvents()
    this._cancelScheduledUpdate()
    this._clearGuides()
  }

  /**
   * Подписывает менеджер на необходимые события.
   */
  private _bindEvents(): void {
    const { canvas } = this
    canvas.on('mouse:move', this._onMouseMove)
    canvas.on('before:render', this._onBeforeRender)
    canvas.on('after:render', this._onAfterRender)
    canvas.on('selection:cleared', this._onSelectionCleared)

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('blur', this._onWindowBlur)
  }

  /**
   * Снимает все обработчики событий.
   */
  private _unbindEvents(): void {
    const { canvas } = this
    canvas.off('mouse:move', this._onMouseMove)
    canvas.off('before:render', this._onBeforeRender)
    canvas.off('after:render', this._onAfterRender)
    canvas.off('selection:cleared', this._onSelectionCleared)

    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('blur', this._onWindowBlur)
  }

  /**
   * Фиксирует удержание ALT для включения измерений.
   */
  private _handleKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.key === 'Alt') {
      this.isAltPressed = true
      if (this.lastMouseEvent) {
        this.pendingEvent = this.lastMouseEvent
        this._scheduleUpdate()
      }
    }
  }

  /**
   * Сбрасывает режим измерений при отпускании ALT.
   */
  private _handleKeyUp(event: KeyboardEvent): void {
    if (!this.isAltPressed) return

    const isAltReleased = event.key === 'Alt' || !event.altKey
    if (!isAltReleased) return

    this.isAltPressed = false
    this._clearGuides()
  }

  /**
   * Сбрасывает режим измерений при потере фокуса окна.
   */
  private _handleWindowBlur(): void {
    this.isAltPressed = false
    this._clearGuides()
  }

  /**
   * Очищает измерения, если выделение сброшено.
   */
  private _handleSelectionCleared(): void {
    this._clearGuides()
  }

  /**
   * Обрабатывает движение мыши и планирует обновление измерений.
   */
  private _handleMouseMove(event: MouseMoveEvent): void {
    const { e } = event
    this.lastMouseEvent = event
    const isAltActive = Boolean(e?.altKey)

    this.isAltPressed = isAltActive

    if (!isAltActive) {
      this._clearGuides()
      return
    }

    const { canvas } = this
    const activeObjects = canvas.getActiveObjects()
    if (!activeObjects.length) {
      this._clearGuides()
      return
    }

    this._hideToolbar()
    this.pendingEvent = event
    this._scheduleUpdate()
  }

  /**
   * Планирует обновление направляющих в animation frame.
   */
  private _scheduleUpdate(): void {
    if (this.frameRequest !== null) return

    this.frameRequest = window.requestAnimationFrame(() => {
      this.frameRequest = null
      this._processPending()
    })
  }

  /**
   * Отменяет отложенное обновление.
   */
  private _cancelScheduledUpdate(): void {
    if (this.frameRequest === null) return
    window.cancelAnimationFrame(this.frameRequest)
    this.frameRequest = null
  }

  /**
   * Обрабатывает накопленное событие движения.
   */
  private _processPending(): void {
    const event = this.pendingEvent
    this.pendingEvent = null
    this._updateGuides({ event })
  }

  /**
   * Обновляет набор измерительных направляющих.
   */
  private _updateGuides({
    event
  }: {
    event: MouseMoveEvent | null
  }): void {
    if (!this.isAltPressed || !event) {
      this._clearGuides()
      return
    }

    const { canvas, editor } = this
    const activeObject = canvas.getActiveObject()

    if (!activeObject) {
      this._clearGuides()
      return
    }

    const activeBounds = getObjectBounds({ object: activeObject })

    if (!activeBounds) {
      this._clearGuides()
      return
    }

    const targetObject = MeasurementManager._resolveTarget({
      event,
      activeObject
    })
    const { montageArea } = editor
    const fallbackTarget = targetObject ?? montageArea
    const targetIsMontageArea = fallbackTarget === montageArea
    const targetBounds = getObjectBounds({ object: fallbackTarget })

    if (!targetBounds) {
      this._clearGuides()
      return
    }

    const isActiveOutsideMontage = targetIsMontageArea && (
      activeBounds.right <= targetBounds.left
      || activeBounds.left >= targetBounds.right
      || activeBounds.bottom <= targetBounds.top
      || activeBounds.top >= targetBounds.bottom
    )
    if (isActiveOutsideMontage) {
      this._clearGuides()
      return
    }

    const guides = MeasurementManager._buildGuides({
      activeBounds,
      targetBounds,
      targetIsMontageArea
    })

    const normalizedGuides = !targetIsMontageArea && targetObject
      ? this._normalizeSymmetricGuides({
        guides,
        activeObject,
        targetObject,
        activeBounds,
        targetBounds
      })
      : guides

    if (!normalizedGuides.length) {
      this._clearGuides()
      return
    }

    this.isTargetMontageArea = targetIsMontageArea
    this.activeGuides = normalizedGuides
    this._hideToolbar()
    canvas.requestRenderAll()
  }

  /**
   * Нормализует отображаемые расстояния для симметричных случаев (как при равных отступах).
   */
  private _normalizeSymmetricGuides({
    guides,
    activeObject,
    targetObject,
    activeBounds,
    targetBounds
  }: {
    guides: MeasurementGuide[]
    activeObject: FabricObject
    targetObject: FabricObject
    activeBounds: Bounds
    targetBounds: Bounds
  }): MeasurementGuide[] {
    return guides.map((guide) => {
      if (guide.type === 'horizontal') {
        return this._normalizeSymmetricHorizontalGuide({
          guide,
          activeObject,
          targetObject,
          activeBounds,
          targetBounds
        })
      }

      return this._normalizeSymmetricVerticalGuide({
        guide,
        activeObject,
        targetObject,
        activeBounds,
        targetBounds
      })
    })
  }

  /**
   * Приводит горизонтальную метку к общему значению, если объект симметрично между соседями.
   */
  private _normalizeSymmetricHorizontalGuide({
    guide,
    activeObject,
    targetObject,
    activeBounds,
    targetBounds
  }: {
    guide: MeasurementGuide
    activeObject: FabricObject
    targetObject: FabricObject
    activeBounds: Bounds
    targetBounds: Bounds
  }): MeasurementGuide {
    const targetOnLeft = (targetBounds.right ?? 0) <= (activeBounds.left ?? 0)
    const targetOnRight = (targetBounds.left ?? 0) >= (activeBounds.right ?? 0)

    if (!targetOnLeft && !targetOnRight) return guide

    const currentGap = targetOnLeft
      ? (activeBounds.left ?? 0) - (targetBounds.right ?? 0)
      : (targetBounds.left ?? 0) - (activeBounds.right ?? 0)
    if (currentGap <= 0) return guide

    const oppositeGapFromActive = this._findOppositeHorizontalGap({
      activeObject,
      targetObject,
      activeBounds,
      searchRightSide: targetOnLeft
    })
    const oppositeGapFromTarget = this._findOppositeHorizontalGap({
      activeObject: targetObject,
      targetObject: activeObject,
      activeBounds: targetBounds,
      searchRightSide: targetOnRight
    })

    const commonDistance = this._resolveCommonSymmetricDistance({
      currentGap,
      oppositeGaps: [oppositeGapFromActive, oppositeGapFromTarget]
    })
    if (commonDistance === null) return guide

    return {
      ...guide,
      distance: commonDistance
    }
  }

  /**
   * Приводит вертикальную метку к общему значению, если объект симметрично между соседями.
   */
  private _normalizeSymmetricVerticalGuide({
    guide,
    activeObject,
    targetObject,
    activeBounds,
    targetBounds
  }: {
    guide: MeasurementGuide
    activeObject: FabricObject
    targetObject: FabricObject
    activeBounds: Bounds
    targetBounds: Bounds
  }): MeasurementGuide {
    const targetOnTop = (targetBounds.bottom ?? 0) <= (activeBounds.top ?? 0)
    const targetOnBottom = (targetBounds.top ?? 0) >= (activeBounds.bottom ?? 0)

    if (!targetOnTop && !targetOnBottom) return guide

    const currentGap = targetOnTop
      ? (activeBounds.top ?? 0) - (targetBounds.bottom ?? 0)
      : (targetBounds.top ?? 0) - (activeBounds.bottom ?? 0)
    if (currentGap <= 0) return guide

    const oppositeGapFromActive = this._findOppositeVerticalGap({
      activeObject,
      targetObject,
      activeBounds,
      searchBottomSide: targetOnTop
    })
    const oppositeGapFromTarget = this._findOppositeVerticalGap({
      activeObject: targetObject,
      targetObject: activeObject,
      activeBounds: targetBounds,
      searchBottomSide: targetOnBottom
    })

    const commonDistance = this._resolveCommonSymmetricDistance({
      currentGap,
      oppositeGaps: [oppositeGapFromActive, oppositeGapFromTarget]
    })
    if (commonDistance === null) return guide

    return {
      ...guide,
      distance: commonDistance
    }
  }

  /**
   * Вычисляет общее отображаемое расстояние для пары почти-симметричных зазоров.
   */
  private _resolveCommonSymmetricDistance({
    currentGap,
    oppositeGaps
  }: {
    currentGap: number
    oppositeGaps: Array<number | null>
  }): number | null {
    const currentDisplay = resolveDisplayDistance({ distance: currentGap })
    let bestCommonDistance: number | null = null
    let bestDiff = Number.POSITIVE_INFINITY

    for (const oppositeGap of oppositeGaps) {
      if (oppositeGap === null) continue

      const oppositeDisplay = resolveDisplayDistance({ distance: oppositeGap })
      const displayDiff = Math.abs(currentDisplay - oppositeDisplay)
      if (displayDiff > 1 || displayDiff >= bestDiff) continue

      bestDiff = displayDiff
      bestCommonDistance = resolveDisplayDistance({
        distance: (currentGap + oppositeGap) / 2
      })
    }

    return bestCommonDistance
  }

  /**
   * Находит ближайший горизонтальный зазор с противоположной стороны активного объекта.
   */
  private _findOppositeHorizontalGap({
    activeObject,
    targetObject,
    activeBounds,
    searchRightSide
  }: {
    activeObject: FabricObject
    targetObject: FabricObject
    activeBounds: Bounds
    searchRightSide: boolean
  }): number | null {
    const { montageArea } = this.editor
    const excluded = collectExcludedObjects({ activeObject })
    let minGap = Number.POSITIVE_INFINITY

    for (const object of this.canvas.getObjects()) {
      if (object === activeObject || object === targetObject || object === montageArea) continue
      if (shouldIgnoreObject({ object, excluded })) continue

      const bounds = getObjectBounds({ object })
      if (!bounds) continue
      if (!MeasurementManager._hasVerticalOverlap({ a: activeBounds, b: bounds })) continue

      let gap = -1
      if (searchRightSide && (bounds.left ?? 0) >= (activeBounds.right ?? 0)) {
        gap = (bounds.left ?? 0) - (activeBounds.right ?? 0)
      }

      if (!searchRightSide && (bounds.right ?? 0) <= (activeBounds.left ?? 0)) {
        gap = (activeBounds.left ?? 0) - (bounds.right ?? 0)
      }

      if (gap > 0 && gap < minGap) {
        minGap = gap
      }
    }

    return Number.isFinite(minGap) ? minGap : null
  }

  /**
   * Находит ближайший вертикальный зазор с противоположной стороны активного объекта.
   */
  private _findOppositeVerticalGap({
    activeObject,
    targetObject,
    activeBounds,
    searchBottomSide
  }: {
    activeObject: FabricObject
    targetObject: FabricObject
    activeBounds: Bounds
    searchBottomSide: boolean
  }): number | null {
    const { montageArea } = this.editor
    const excluded = collectExcludedObjects({ activeObject })
    let minGap = Number.POSITIVE_INFINITY

    for (const object of this.canvas.getObjects()) {
      if (object === activeObject || object === targetObject || object === montageArea) continue
      if (shouldIgnoreObject({ object, excluded })) continue

      const bounds = getObjectBounds({ object })
      if (!bounds) continue
      if (!MeasurementManager._hasHorizontalOverlap({ a: activeBounds, b: bounds })) continue

      let gap = -1
      if (searchBottomSide && (bounds.top ?? 0) >= (activeBounds.bottom ?? 0)) {
        gap = (bounds.top ?? 0) - (activeBounds.bottom ?? 0)
      }

      if (!searchBottomSide && (bounds.bottom ?? 0) <= (activeBounds.top ?? 0)) {
        gap = (activeBounds.top ?? 0) - (bounds.bottom ?? 0)
      }

      if (gap > 0 && gap < minGap) {
        minGap = gap
      }
    }

    return Number.isFinite(minGap) ? minGap : null
  }

  /**
   * Проверяет пересечение по оси Y.
   */
  private static _hasVerticalOverlap({
    a,
    b
  }: {
    a: Bounds
    b: Bounds
  }): boolean {
    const overlapStart = Math.max(a.top ?? 0, b.top ?? 0)
    const overlapEnd = Math.min(a.bottom ?? 0, b.bottom ?? 0)

    return overlapEnd >= overlapStart
  }

  /**
   * Проверяет пересечение по оси X.
   */
  private static _hasHorizontalOverlap({
    a,
    b
  }: {
    a: Bounds
    b: Bounds
  }): boolean {
    const overlapStart = Math.max(a.left ?? 0, b.left ?? 0)
    const overlapEnd = Math.min(a.right ?? 0, b.right ?? 0)

    return overlapEnd >= overlapStart
  }

  /**
   * Возвращает объект под курсором, подходящий для измерения.
   */
  private static _resolveTarget({
    event,
    activeObject
  }: {
    event: MouseMoveEvent
    activeObject: FabricObject
  }): FabricObject | null {
    const { target } = event
    const excluded = collectExcludedObjects({ activeObject })

    if (target && !shouldIgnoreObject({ object: target, excluded })) {
      return target
    }

    return null
  }

  /**
   * Собирает вертикальные и горизонтальные направляющие расстояний.
   */
  private static _buildGuides({
    activeBounds,
    targetBounds,
    targetIsMontageArea
  }: {
    activeBounds: Bounds
    targetBounds: Bounds
    targetIsMontageArea: boolean
  }): MeasurementGuide[] {
    const horizontalGuides = MeasurementManager._buildHorizontalGuides({
      activeBounds,
      targetBounds,
      targetIsMontageArea
    })
    const verticalGuides = MeasurementManager._buildVerticalGuides({
      activeBounds,
      targetBounds,
      targetIsMontageArea
    })

    return [...horizontalGuides, ...verticalGuides]
  }

  /**
   * Строит горизонтальные направляющие (расстояние по оси X).
   */
  private static _buildHorizontalGuides({
    activeBounds,
    targetBounds,
    targetIsMontageArea
  }: {
    activeBounds: Bounds
    targetBounds: Bounds
    targetIsMontageArea: boolean
  }): MeasurementGuide[] {
    const guides: MeasurementGuide[] = []
    const {
      left: activeLeft = 0,
      right: activeRight = 0,
      top: activeTop = 0,
      bottom: activeBottom = 0,
      centerY: activeCenterY = 0
    } = activeBounds
    const {
      left: targetLeft = 0,
      right: targetRight = 0,
      top: targetTop = 0,
      bottom: targetBottom = 0,
      centerY: targetCenterY = 0
    } = targetBounds

    const overlapStart = Math.max(activeTop, targetTop)
    const overlapEnd = Math.min(activeBottom, targetBottom)
    const hasOverlap = overlapEnd >= overlapStart
    const axis = hasOverlap
      ? (overlapStart + overlapEnd) / 2
      : (activeCenterY + targetCenterY) / 2

    if (targetLeft >= activeRight) {
      if (targetIsMontageArea) return guides

      const distance = targetLeft - activeRight
      if (distance > 0) {
        guides.push({
          type: 'horizontal',
          axis,
          start: activeRight,
          end: targetLeft,
          distance
        })
      }
      return guides
    }

    if (targetRight <= activeLeft) {
      if (targetIsMontageArea) return guides

      const distance = activeLeft - targetRight
      if (distance > 0) {
        guides.push({
          type: 'horizontal',
          axis,
          start: targetRight,
          end: activeLeft,
          distance
        })
      }
      return guides
    }

    if (!targetIsMontageArea) return guides

    const isBeyondLeft = activeLeft < targetLeft
    const isBeyondRight = activeRight > targetRight

    const leftStart = Math.min(activeLeft, targetLeft)
    const leftEnd = Math.max(activeLeft, targetLeft)
    const leftDistance = leftEnd - leftStart
    if (leftDistance > 0 && !isBeyondLeft) {
      guides.push({
        type: 'horizontal',
        axis,
        start: leftStart,
        end: leftEnd,
        distance: leftDistance
      })
    }

    const rightStart = Math.min(activeRight, targetRight)
    const rightEnd = Math.max(activeRight, targetRight)
    const rightDistance = rightEnd - rightStart
    if (rightDistance > 0 && !isBeyondRight) {
      guides.push({
        type: 'horizontal',
        axis,
        start: rightStart,
        end: rightEnd,
        distance: rightDistance
      })
    }

    return guides
  }

  /**
   * Строит вертикальные направляющие (расстояние по оси Y).
   */
  private static _buildVerticalGuides({
    activeBounds,
    targetBounds,
    targetIsMontageArea
  }: {
    activeBounds: Bounds
    targetBounds: Bounds
    targetIsMontageArea: boolean
  }): MeasurementGuide[] {
    const guides: MeasurementGuide[] = []
    const {
      top: activeTop = 0,
      bottom: activeBottom = 0,
      left: activeLeft = 0,
      right: activeRight = 0,
      centerX: activeCenterX = 0
    } = activeBounds
    const {
      top: targetTop = 0,
      bottom: targetBottom = 0,
      left: targetLeft = 0,
      right: targetRight = 0,
      centerX: targetCenterX = 0
    } = targetBounds

    const overlapStart = Math.max(activeLeft, targetLeft)
    const overlapEnd = Math.min(activeRight, targetRight)
    const hasOverlap = overlapEnd >= overlapStart
    const axis = hasOverlap
      ? (overlapStart + overlapEnd) / 2
      : (activeCenterX + targetCenterX) / 2

    if (targetTop >= activeBottom) {
      if (targetIsMontageArea) return guides

      const distance = targetTop - activeBottom
      if (distance > 0) {
        guides.push({
          type: 'vertical',
          axis,
          start: activeBottom,
          end: targetTop,
          distance
        })
      }
      return guides
    }

    if (targetBottom <= activeTop) {
      if (targetIsMontageArea) return guides

      const distance = activeTop - targetBottom
      if (distance > 0) {
        guides.push({
          type: 'vertical',
          axis,
          start: targetBottom,
          end: activeTop,
          distance
        })
      }
      return guides
    }

    if (!targetIsMontageArea) return guides

    const isBeyondTop = activeTop < targetTop
    const isBeyondBottom = activeBottom > targetBottom

    const topStart = Math.min(activeTop, targetTop)
    const topEnd = Math.max(activeTop, targetTop)
    const topDistance = topEnd - topStart
    if (topDistance > 0 && !isBeyondTop) {
      guides.push({
        type: 'vertical',
        axis,
        start: topStart,
        end: topEnd,
        distance: topDistance
      })
    }

    const bottomStart = Math.min(activeBottom, targetBottom)
    const bottomEnd = Math.max(activeBottom, targetBottom)
    const bottomDistance = bottomEnd - bottomStart
    if (bottomDistance > 0 && !isBeyondBottom) {
      guides.push({
        type: 'vertical',
        axis,
        start: bottomStart,
        end: bottomEnd,
        distance: bottomDistance
      })
    }

    return guides
  }

  /**
   * Сбрасывает активные направляющие и инициирует перерисовку.
   */
  private _clearGuides(): void {
    if (!this.activeGuides.length) {
      this._showToolbar()
      return
    }

    this.activeGuides = []
    this.isTargetMontageArea = false
    this.canvas.requestRenderAll()
    this._showToolbar()
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
   * Рисует направляющие и бейджи после рендера канваса.
   */
  private _handleAfterRender(): void {
    if (!this.activeGuides.length) return

    const { canvas } = this
    const context = canvas.getSelectionContext()

    if (!context) return

    const { viewportTransform } = canvas
    const zoom = canvas.getZoom() || 1
    const hasVertical = this.activeGuides.some((guide) => guide.type === 'vertical')
    const hasHorizontal = this.activeGuides.some((guide) => guide.type === 'horizontal')
    const hasBothDirections = hasVertical && hasHorizontal && !this.isTargetMontageArea
    const labelOffset = hasBothDirections ? 12 / zoom : 0

    context.save()
    if (Array.isArray(viewportTransform)) {
      context.transform(...viewportTransform)
    }
    context.lineWidth = MEASUREMENT_LINE_WIDTH / zoom
    context.strokeStyle = MEASUREMENT_COLOR
    context.setLineDash([])

    for (const guide of this.activeGuides) {
      const { type, axis, start, end, distance } = guide
      const gap = Math.abs(end - start)
      const sign = start <= end ? -1 : 1
      const offsetAlongAxis = hasBothDirections
        ? sign * ((gap / 2) + labelOffset)
        : 0
      const offsetPerpendicular = 0

      context.beginPath()
      if (type === 'vertical') {
        context.moveTo(axis, start)
        context.lineTo(axis, end)
      } else {
        context.moveTo(start, axis)
        context.lineTo(end, axis)
      }
      context.stroke()

      drawGuideLabel({
        context,
        type,
        axis,
        start,
        end,
        text: resolveDisplayDistance({ distance }).toString(),
        zoom,
        color: MEASUREMENT_COLOR,
        lineWidth: MEASUREMENT_LINE_WIDTH,
        offsetAlongAxis,
        offsetPerpendicular
      })
    }

    context.restore()
  }

  /**
   * Временно скрывает тулбар во время отображения измерений.
   */
  private _hideToolbar(): void {
    if (this.isToolbarHidden) return

    const { toolbar } = this.editor
    toolbar?.hideTemporarily?.()
    this.isToolbarHidden = true
  }

  /**
   * Возвращает тулбар после режима измерений.
   */
  private _showToolbar(): void {
    if (!this.isToolbarHidden) return

    const { toolbar } = this.editor
    toolbar?.showAfterTemporary?.()
    this.isToolbarHidden = false
  }
}
