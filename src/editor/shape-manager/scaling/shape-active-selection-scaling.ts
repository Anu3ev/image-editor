import {
  ActiveSelection,
  Canvas,
  Point,
  Transform
} from 'fabric'
import {
  resolveMinimumShapeWidthForText
} from '../layout/shape-layout'
import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from '../shape-presets'
import {
  getShapeNodes,
  isShapeGroup
} from '../shape-utils'
import type {
  ShapeGroup,
  ShapeNode,
  ShapePadding,
  ShapeScalingState,
  ShapeTextNode,
  ShapeTransformOriginX,
  ShapeTransformOriginY
} from '../types'
import { applyShapeScalingPreviewLayout } from './shape-scaling-preview'
import {
  resolveScaleLocalPointerForTransform,
  resolveShapeScaleActionAxes,
  resolveShapeTransformOriginXValue,
  resolveShapeTransformOriginYValue
} from './shape-scaling-transform'
import {
  commitResolvedShapeScalingLayout,
  ensureShapeScalingState,
  resolveMinimumProportionalShapeScale,
  resolveMinimumTextFitHeight,
  resolveShapeScalingCommitDimensions,
  resolveShapeScalingConstraintPadding,
  resolveShapeScalingPreviewDimensions,
  resolveShapeScalingPreviewLayout,
  resolveShapeScalingStartDimensions,
  SHAPE_SCALING_MIN_SIZE as MIN_SIZE,
  SHAPE_SCALING_SCALE_EPSILON as SCALE_EPSILON,
  SHAPE_SCALING_SIZE_EPSILON as SIZE_EPSILON
} from './shape-scaling-layout'
import type {
  ShapeScalingPointerEvent
} from './shape-scaling-layout'

type ActiveSelectionShapeScalingItem = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode
  constraintPadding: ShapePadding
  state: ShapeScalingState
}

type ActiveSelectionProportionalLayoutResult = {
  minimumScale: number
  minimumHeight: number
}

type ActiveSelectionProportionalLayoutResults = Map<
  ShapeGroup,
  ActiveSelectionProportionalLayoutResult
>

export type ActiveSelectionAppliedScale = {
  scaleX: number
  scaleY: number
}

type ActiveSelectionVerticalAttachment = 'top' | 'bottom' | 'center'

type ActiveSelectionLocalBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

type ActiveSelectionShapeScalingSessionItem = {
  bounds: ActiveSelectionLocalBounds
  transformOriginX: ShapeTransformOriginX
  transformOriginPointX: number
  verticalAttachment: ActiveSelectionVerticalAttachment
}

type ActiveSelectionShapeLayoutScale = {
  scaleX: number
  scaleY: number
}

type ActiveSelectionScalingSession = {
  bounds: ActiveSelectionLocalBounds
  items: Map<ShapeGroup, ActiveSelectionShapeScalingSessionItem>
}

/**
 * Контроллер масштабирования shape-групп внутри ActiveSelection.
 */
export default class ShapeActiveSelectionScalingController {
  private canvas: Canvas

  private shapeScalingState: WeakMap<ShapeGroup, ShapeScalingState>

  private scalingState: WeakMap<ActiveSelection, ActiveSelectionAppliedScale>

  private scalingSessions: WeakMap<ActiveSelection, ActiveSelectionScalingSession>

  private groupLayoutScales: WeakMap<ShapeGroup, ActiveSelectionShapeLayoutScale>

  constructor({
    canvas,
    shapeScalingState
  }: {
    canvas: Canvas
    shapeScalingState: WeakMap<ShapeGroup, ShapeScalingState>
  }) {
    this.canvas = canvas
    this.shapeScalingState = shapeScalingState
    this.scalingState = new WeakMap()
    this.scalingSessions = new WeakMap()
    this.groupLayoutScales = new WeakMap()
  }

  /**
   * Применяет live-preview по правилам шейпов внутри ActiveSelection.
   */
  public handleScalingPreview({
    selection,
    transform,
    event
  }: {
    selection: ActiveSelection
    transform?: Transform | null
    event?: ShapeScalingPointerEvent
  }): void {
    if (!transform) return

    const {
      canScaleWidth,
      canScaleHeight,
      isCornerScaleAction
    } = resolveShapeScaleActionAxes({
      transform
    })
    if (!canScaleWidth && !canScaleHeight) return

    const items = this._collectPreviewItems({
      selection,
      transform
    })

    if (!items.length) return

    const session = this._ensureScalingSession({
      selection,
      transform,
      items
    })
    const isShiftPressed = Boolean(event && 'shiftKey' in event && event.shiftKey)
    const isProportionalCornerScale = isCornerScaleAction && !isShiftPressed
    const proportionalLayoutResults = isProportionalCornerScale
      ? this._resolveProportionalLayoutResults({ items })
      : null
    const scaleX = Math.abs(selection.scaleX ?? 1) || 1
    const scaleY = Math.abs(selection.scaleY ?? 1) || 1
    let selectionScale = this._resolveSelectionScale({
      items,
      session,
      transform,
      proportionalLayoutResults,
      scaleX,
      scaleY,
      event
    })
    selectionScale = this._resolveSelectionScaleAtPointerBoundary({
      selection,
      items,
      session,
      transform,
      selectionScale,
      event
    })

    this._applySelectionScale({
      selection,
      transform,
      scaleX: selectionScale.scaleX,
      scaleY: selectionScale.scaleY
    })
    this.scalingState.set(selection, selectionScale)

    for (const item of items) {
      const {
        group,
        shape,
        text,
        constraintPadding,
        state
      } = item
      const sessionItem = session.items.get(group) as ActiveSelectionShapeScalingSessionItem

      let layoutScale: ActiveSelectionShapeLayoutScale
      let minimumHeight: number

      if (proportionalLayoutResults) {
        const proportionalLayoutResult = proportionalLayoutResults.get(group)!

        const proportionalScale = Math.max(
          selectionScale.scaleX,
          proportionalLayoutResult.minimumScale
        )

        layoutScale = {
          scaleX: state.canScaleWidth ? proportionalScale : 1,
          scaleY: state.canScaleHeight ? proportionalScale : 1
        }
        minimumHeight = proportionalLayoutResult.minimumHeight
      } else {
        layoutScale = this._resolveShapeLayoutScale({
          item,
          selectionScale
        })
        minimumHeight = resolveShapeScalingPreviewDimensions({
          group,
          text,
          constraintPadding,
          startDimensions: state,
          appliedScaleX: layoutScale.scaleX,
          appliedScaleY: layoutScale.scaleY
        }).previewHeight
      }

      const previewLayout = resolveShapeScalingPreviewLayout({
        group,
        text,
        state,
        appliedScaleX: layoutScale.scaleX,
        appliedScaleY: layoutScale.scaleY,
        minimumHeight
      })

      applyShapeScalingPreviewLayout({
        group,
        shape,
        text,
        layout: previewLayout,
        alignH: group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
        scaleX: selectionScale.scaleX,
        scaleY: selectionScale.scaleY,
        minSize: MIN_SIZE,
        scaleEpsilon: SCALE_EPSILON
      })

      this.groupLayoutScales.set(group, layoutScale)
      this._positionShapeInSelection({
        group,
        sessionItem
      })
      group.setCoords()
    }

    selection.setCoords()
    this.canvas.requestRenderAll()
  }

  /**
   * Фиксирует resize дочерней shape-группы после масштабирования ActiveSelection.
   */
  public commitGroupScaling({
    group,
    scaleX,
    scaleY,
    transform
  }: {
    group: ShapeGroup
    scaleX: number
    scaleY: number
    transform?: Transform | null
  }): boolean {
    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) {
      this.shapeScalingState.delete(group)
      return false
    }

    const state = this.shapeScalingState.get(group)
    const startDimensions = state ?? resolveShapeScalingStartDimensions({
      group,
      transform
    })
    const resolvedAxes = transform
      ? resolveShapeScaleActionAxes({
        transform
      })
      : null
    const canScaleWidth = state?.canScaleWidth
      ?? resolvedAxes?.canScaleWidth
      ?? (Math.abs(scaleX - 1) > SCALE_EPSILON)
    const canScaleHeight = state?.canScaleHeight
      ?? resolvedAxes?.canScaleHeight
      ?? (Math.abs(scaleY - 1) > SCALE_EPSILON)
    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const alignV = group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const constraintPadding = resolveShapeScalingConstraintPadding({ group })
    const layoutScale = this.groupLayoutScales.get(group) ?? {
      scaleX,
      scaleY
    }
    const {
      width,
      height,
      hasWidthChange,
      hasDimensionChange
    } = resolveShapeScalingCommitDimensions({
      group,
      text,
      constraintPadding,
      startDimensions: {
        ...startDimensions,
        canScaleWidth,
        canScaleHeight
      },
      scaleX: layoutScale.scaleX,
      scaleY: layoutScale.scaleY
    })

    if (!hasDimensionChange) {
      this.shapeScalingState.delete(group)
      this.groupLayoutScales.delete(group)
      group.shapeScalingNoopTransform = false
      return false
    }

    commitResolvedShapeScalingLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      startManualBaseWidth: startDimensions.startManualBaseWidth,
      startManualBaseHeight: startDimensions.startManualBaseHeight,
      canScaleWidth,
      canScaleHeight,
      hasWidthChange
    })

    this.shapeScalingState.delete(group)
    this.groupLayoutScales.delete(group)
    group.shapeScalingNoopTransform = false

    return true
  }

  /**
   * Возвращает scale ActiveSelection, который был реально применён в live-preview.
   */
  public resolveCommittedScale({
    selection
  }: {
    selection: ActiveSelection
  }): ActiveSelectionAppliedScale {
    const appliedScale = this.scalingState.get(selection)

    if (appliedScale) {
      return {
        scaleX: appliedScale.scaleX,
        scaleY: appliedScale.scaleY
      }
    }

    return {
      scaleX: Math.abs(selection.scaleX ?? 1) || 1,
      scaleY: Math.abs(selection.scaleY ?? 1) || 1
    }
  }

  /**
   * Очищает состояние масштабирования для переданного ActiveSelection.
   */
  public clearState({ selection }: { selection: ActiveSelection }): void {
    const session = this.scalingSessions.get(selection)
    if (session) {
      for (const group of session.items.keys()) {
        this.groupLayoutScales.delete(group)
      }
    }

    this.scalingSessions.delete(selection)
    this.scalingState.delete(selection)
  }

  /**
   * Собирает shape-группы общего выделения вместе с их стартовым состоянием для текущего drag.
   */
  private _collectPreviewItems({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform: Transform
  }): ActiveSelectionShapeScalingItem[] {
    const items: ActiveSelectionShapeScalingItem[] = []

    for (const object of selection.getObjects()) {
      if (!isShapeGroup(object)) continue

      const {
        shape,
        text
      } = getShapeNodes({ group: object })

      if (!shape || !text) continue

      const constraintPadding = resolveShapeScalingConstraintPadding({
        group: object
      })
      const state = ensureShapeScalingState({
        scalingState: this.shapeScalingState,
        group: object,
        text,
        constraintPadding,
        transform
      })

      items.push({
        group: object,
        shape,
        text,
        constraintPadding,
        state
      })
    }

    return items
  }

  /**
   * Возвращает runtime-сессию текущего drag в локальной плоскости ActiveSelection.
   */
  private _ensureScalingSession({
    selection,
    transform,
    items
  }: {
    selection: ActiveSelection
    transform: Transform
    items: ActiveSelectionShapeScalingItem[]
  }): ActiveSelectionScalingSession {
    const existingSession = this.scalingSessions.get(selection)
    if (existingSession) return existingSession

    const transformOriginX = resolveShapeTransformOriginXValue({
      value: transform.originX
    }) ?? 'center'
    const transformOriginY = resolveShapeTransformOriginYValue({
      value: transform.originY
    }) ?? 'center'
    const firstItem = items[0] as ActiveSelectionShapeScalingItem
    const shapeBoundsByGroup = new Map<ShapeGroup, ActiveSelectionLocalBounds>()
    const sessionItems = new Map<ShapeGroup, ActiveSelectionShapeScalingSessionItem>()
    let selectionBounds = this._resolveShapeLocalBounds({
      group: firstItem.group
    })

    for (const { group } of items) {
      const bounds = this._resolveShapeLocalBounds({ group })

      shapeBoundsByGroup.set(group, bounds)

      selectionBounds = this._mergeBounds({
        current: selectionBounds,
        next: bounds
      })
    }

    for (const [group, bounds] of shapeBoundsByGroup) {
      const transformOriginPoint = group.getPositionByOrigin(transformOriginX, transformOriginY)

      sessionItems.set(group, {
        bounds,
        transformOriginX,
        transformOriginPointX: transformOriginPoint.x,
        verticalAttachment: this._resolveVerticalAttachment({
          selectionBounds,
          shapeBounds: bounds
        })
      })
    }

    const session = {
      bounds: selectionBounds,
      items: sessionItems
    }

    this.scalingSessions.set(selection, session)

    return session
  }

  /**
   * Возвращает scale общего выделения, ограниченный bounds каждой shape-группы внутри ActiveSelection.
   */
  private _resolveSelectionScale({
    items,
    session,
    transform,
    proportionalLayoutResults,
    scaleX,
    scaleY,
    event
  }: {
    items: ActiveSelectionShapeScalingItem[]
    session: ActiveSelectionScalingSession
    transform: Transform
    proportionalLayoutResults: ActiveSelectionProportionalLayoutResults | null
    scaleX: number
    scaleY: number
    event?: ShapeScalingPointerEvent
  }): ActiveSelectionAppliedScale {
    const {
      canScaleWidth,
      canScaleHeight,
      isCornerScaleAction
    } = resolveShapeScaleActionAxes({
      transform
    })
    const isShiftPressed = Boolean(event && 'shiftKey' in event && event.shiftKey)
    const isProportionalCornerScale = isCornerScaleAction
      && !isShiftPressed
    let appliedScaleX = scaleX
    let appliedScaleY = scaleY

    if (isProportionalCornerScale) {
      if (!proportionalLayoutResults) {
        throw new Error('proportional layout results are required for ActiveSelection proportional scaling')
      }

      const proportionalScale = this._resolveProportionalSelectionScale({
        items,
        session,
        proportionalLayoutResults,
        scale: Math.max(scaleX, scaleY),
        allowGrowthX: canScaleHeight,
        allowGrowthY: canScaleWidth
      })

      return {
        scaleX: proportionalScale,
        scaleY: proportionalScale
      }
    }

    if (canScaleWidth) {
      appliedScaleX = this._resolveSelectionScaleX({
        items,
        session,
        scaleX,
        scaleY: appliedScaleY,
        allowGrowth: canScaleHeight
      })
    }

    if (canScaleHeight) {
      appliedScaleY = this._resolveSelectionScaleY({
        items,
        session,
        scaleX: appliedScaleX,
        scaleY,
        allowGrowth: canScaleWidth
      })
    }

    if (canScaleWidth && canScaleHeight) {
      appliedScaleX = this._resolveSelectionScaleX({
        items,
        session,
        scaleX,
        scaleY: appliedScaleY,
        allowGrowth: canScaleHeight
      })
      appliedScaleY = this._resolveSelectionScaleY({
        items,
        session,
        scaleX: appliedScaleX,
        scaleY,
        allowGrowth: canScaleWidth
      })
    }

    return {
      scaleX: appliedScaleX,
      scaleY: appliedScaleY
    }
  }

  private _resolveProportionalSelectionScale({
    items,
    session,
    proportionalLayoutResults,
    scale,
    allowGrowthX,
    allowGrowthY
  }: {
    items: ActiveSelectionShapeScalingItem[]
    session: ActiveSelectionScalingSession
    proportionalLayoutResults: ActiveSelectionProportionalLayoutResults
    scale: number
    allowGrowthX: boolean
    allowGrowthY: boolean
  }): number {
    let appliedScale = scale

    for (const item of items) {
      const sessionItem = session.items.get(item.group) as ActiveSelectionShapeScalingSessionItem
      const proportionalLayoutResult = proportionalLayoutResults.get(item.group)!
      const minimumLayoutScale = proportionalLayoutResult.minimumScale
      const minimumWidth = item.state.canScaleWidth
        ? Math.max(MIN_SIZE, item.state.startWidth * minimumLayoutScale)
        : item.state.startWidth
      const minimumHeight = item.state.canScaleHeight
        ? Math.max(MIN_SIZE, item.state.startHeight * minimumLayoutScale)
        : item.state.startHeight
      const availableWidth = this._resolveSelectionAvailableWidth({
        selectionBounds: session.bounds,
        shapeBounds: sessionItem.bounds,
        originX: sessionItem.transformOriginX
      })
      const availableHeight = this._resolveSelectionAvailableHeight({
        selectionBounds: session.bounds,
        shapeBounds: sessionItem.bounds,
        verticalAttachment: sessionItem.verticalAttachment
      })
      const minimumSelectionScaleX = item.state.canScaleWidth
        ? this._resolveMinimumScaleForSize({
          minimumSize: minimumWidth,
          startSize: availableWidth,
          allowGrowth: allowGrowthX
        })
        : scale
      const minimumSelectionScaleY = item.state.canScaleHeight
        ? this._resolveMinimumScaleForSize({
          minimumSize: minimumHeight,
          startSize: availableHeight,
          allowGrowth: allowGrowthY
        })
        : scale

      appliedScale = Math.max(
        appliedScale,
        minimumSelectionScaleX,
        minimumSelectionScaleY
      )
    }

    return appliedScale
  }

  /**
   * Доводит ActiveSelection до minimum boundary на mousemove-кадрах,
   * где Fabric уже перестал обновлять scale после быстрого движения pointer.
   */
  private _resolveSelectionScaleAtPointerBoundary({
    selection,
    items,
    session,
    transform,
    selectionScale,
    event
  }: {
    selection: ActiveSelection
    items: ActiveSelectionShapeScalingItem[]
    session: ActiveSelectionScalingSession
    transform: Transform
    selectionScale: ActiveSelectionAppliedScale
    event?: ShapeScalingPointerEvent
  }): ActiveSelectionAppliedScale {
    const {
      canScaleWidth,
      canScaleHeight,
      isCornerScaleAction
    } = resolveShapeScaleActionAxes({
      transform
    })
    const isShiftPressed = Boolean(event && 'shiftKey' in event && event.shiftKey)

    if (isCornerScaleAction && !isShiftPressed) return selectionScale

    const pointerReachedOrPassedOriginX = canScaleWidth && this._hasPointerReachedSelectionScaleOrigin({
      selection,
      transform,
      event,
      axis: 'x'
    })
    const pointerReachedOrPassedOriginY = canScaleHeight && this._hasPointerReachedSelectionScaleOrigin({
      selection,
      transform,
      event,
      axis: 'y'
    })

    if (!pointerReachedOrPassedOriginX && !pointerReachedOrPassedOriginY) return selectionScale

    let nextScaleX = selectionScale.scaleX
    let nextScaleY = selectionScale.scaleY

    if (pointerReachedOrPassedOriginX) {
      nextScaleX = 0
    }
    if (pointerReachedOrPassedOriginY) {
      nextScaleY = 0
    }

    return this._resolveSelectionScale({
      items,
      session,
      transform,
      proportionalLayoutResults: null,
      scaleX: nextScaleX,
      scaleY: nextScaleY,
      event
    })
  }

  /**
   * Возвращает scaleX рамки ActiveSelection, при котором все shape-группы остаются внутри bounds выделения.
   */
  private _resolveSelectionScaleX({
    items,
    session,
    scaleX,
    scaleY,
    allowGrowth
  }: {
    items: ActiveSelectionShapeScalingItem[]
    session: ActiveSelectionScalingSession
    scaleX: number
    scaleY: number
    allowGrowth: boolean
  }): number {
    let appliedScaleX = scaleX

    for (const item of items) {
      const sessionItem = session.items.get(item.group) as ActiveSelectionShapeScalingSessionItem
      const minimumWidth = this._resolveMinimumShapeWidth({
        item,
        scaleY
      })
      const availableWidth = this._resolveSelectionAvailableWidth({
        selectionBounds: session.bounds,
        shapeBounds: sessionItem.bounds,
        originX: sessionItem.transformOriginX
      })
      const minimumSelectionScaleX = this._resolveMinimumScaleForSize({
        minimumSize: minimumWidth,
        startSize: availableWidth,
        allowGrowth
      })

      appliedScaleX = Math.max(appliedScaleX, minimumSelectionScaleX)
    }

    return appliedScaleX
  }

  /**
   * Возвращает scaleY рамки ActiveSelection, при котором все shape-группы остаются внутри bounds выделения.
   */
  private _resolveSelectionScaleY({
    items,
    session,
    scaleX,
    scaleY,
    allowGrowth
  }: {
    items: ActiveSelectionShapeScalingItem[]
    session: ActiveSelectionScalingSession
    scaleX: number
    scaleY: number
    allowGrowth: boolean
  }): number {
    let appliedScaleY = scaleY

    for (const item of items) {
      const sessionItem = session.items.get(item.group) as ActiveSelectionShapeScalingSessionItem
      const layoutScaleX = this._resolveShapeLayoutScaleX({
        item,
        selectionScaleX: scaleX,
        selectionScaleY: scaleY
      })
      const minimumHeight = this._resolveMinimumShapeHeight({
        item,
        scaleX: layoutScaleX
      })
      const availableHeight = this._resolveSelectionAvailableHeight({
        selectionBounds: session.bounds,
        shapeBounds: sessionItem.bounds,
        verticalAttachment: sessionItem.verticalAttachment
      })
      const minimumSelectionScaleY = this._resolveMinimumScaleForSize({
        minimumSize: minimumHeight,
        startSize: availableHeight,
        allowGrowth
      })

      appliedScaleY = Math.max(appliedScaleY, minimumSelectionScaleY)
    }

    return appliedScaleY
  }

  /**
   * Возвращает layout scale конкретной shape-группы для непропорционального scaling по осям.
   * При proportional scaling по диагонали minimum считается один раз на кадр в handleScalingPreview.
   */
  private _resolveShapeLayoutScale({
    item,
    selectionScale
  }: {
    item: ActiveSelectionShapeScalingItem
    selectionScale: ActiveSelectionAppliedScale
  }): ActiveSelectionShapeLayoutScale {
    let scaleX = this._resolveShapeLayoutScaleX({
      item,
      selectionScaleX: selectionScale.scaleX,
      selectionScaleY: selectionScale.scaleY
    })
    let scaleY = this._resolveShapeLayoutScaleY({
      item,
      scaleX,
      selectionScaleY: selectionScale.scaleY
    })
    scaleX = this._resolveShapeLayoutScaleX({
      item,
      selectionScaleX: selectionScale.scaleX,
      selectionScaleY: scaleY
    })
    scaleY = this._resolveShapeLayoutScaleY({
      item,
      scaleX,
      selectionScaleY: selectionScale.scaleY
    })

    return {
      scaleX,
      scaleY
    }
  }

  private _resolveShapeLayoutScaleX({
    item,
    selectionScaleX,
    selectionScaleY
  }: {
    item: ActiveSelectionShapeScalingItem
    selectionScaleX: number
    selectionScaleY: number
  }): number {
    const { state } = item
    if (!state.canScaleWidth) return 1

    const minimumWidth = this._resolveMinimumShapeWidth({
      item,
      scaleY: selectionScaleY
    })
    const minimumScaleX = this._resolveMinimumScaleForSize({
      minimumSize: minimumWidth,
      startSize: state.startWidth,
      allowGrowth: state.canScaleHeight
    })

    return Math.max(selectionScaleX, minimumScaleX)
  }

  private _resolveShapeLayoutScaleY({
    item,
    scaleX,
    selectionScaleY
  }: {
    item: ActiveSelectionShapeScalingItem
    scaleX: number
    selectionScaleY: number
  }): number {
    const { state } = item
    if (!state.canScaleHeight) return 1

    const minimumHeight = this._resolveMinimumShapeHeight({
      item,
      scaleX
    })
    const minimumScaleY = this._resolveMinimumScaleForSize({
      minimumSize: minimumHeight,
      startSize: state.startHeight,
      allowGrowth: state.canScaleWidth
    })

    return Math.max(selectionScaleY, minimumScaleY)
  }

  /**
   * Собирает minimum layout-ограничения для proportional scaling по диагонали один раз на текущий preview-кадр.
   */
  private _resolveProportionalLayoutResults({
    items
  }: {
    items: ActiveSelectionShapeScalingItem[]
  }): ActiveSelectionProportionalLayoutResults {
    const results: ActiveSelectionProportionalLayoutResults = new Map()

    for (const item of items) {
      const proportionalMinimum = resolveMinimumProportionalShapeScale({
        group: item.group,
        text: item.text,
        state: item.state
      })

      results.set(item.group, {
        minimumScale: proportionalMinimum.scale,
        minimumHeight: proportionalMinimum.minimumHeight
      })
    }

    return results
  }

  private _resolveMinimumShapeWidth({
    item,
    scaleY
  }: {
    item: ActiveSelectionShapeScalingItem
    scaleY: number
  }): number {
    const {
      group,
      text,
      constraintPadding,
      state
    } = item
    const attemptedHeight = Math.max(MIN_SIZE, state.startHeight * scaleY)

    return resolveMinimumShapeWidthForText({
      text,
      padding: constraintPadding,
      resolvePaddingForWidth: ({ width }) => resolveShapeScalingConstraintPadding({
        group,
        width,
        height: attemptedHeight
      })
    })
  }

  private _resolveMinimumScaleForSize({
    minimumSize,
    startSize,
    allowGrowth
  }: {
    minimumSize: number
    startSize: number
    allowGrowth: boolean
  }): number {
    const minimumScale = Math.max(MIN_SIZE / startSize, minimumSize / startSize)

    if (allowGrowth) return minimumScale

    return Math.min(1, minimumScale)
  }

  private _resolveMinimumShapeHeight({
    item,
    scaleX
  }: {
    item: ActiveSelectionShapeScalingItem
    scaleX: number
  }): number {
    const {
      group,
      text,
      constraintPadding,
      state
    } = item
    const attemptedWidth = Math.max(MIN_SIZE, state.startWidth * scaleX)

    return resolveMinimumTextFitHeight({
      group,
      text,
      width: attemptedWidth,
      padding: constraintPadding
    })
  }

  private _resolveSelectionAvailableWidth({
    selectionBounds,
    shapeBounds,
    originX
  }: {
    selectionBounds: ActiveSelectionLocalBounds
    shapeBounds: ActiveSelectionLocalBounds
    originX: ShapeTransformOriginX
  }): number {
    const originOffset = this._resolveOriginOffset({ origin: originX })

    if (originOffset > 0) {
      return Math.max(MIN_SIZE, shapeBounds.right - selectionBounds.left)
    }
    if (originOffset < 0) {
      return Math.max(MIN_SIZE, selectionBounds.right - shapeBounds.left)
    }

    const shapeCenterX = (shapeBounds.left + shapeBounds.right) / 2

    return Math.max(
      MIN_SIZE,
      2 * Math.min(
        shapeCenterX - selectionBounds.left,
        selectionBounds.right - shapeCenterX
      )
    )
  }

  private _resolveSelectionAvailableHeight({
    selectionBounds,
    shapeBounds,
    verticalAttachment
  }: {
    selectionBounds: ActiveSelectionLocalBounds
    shapeBounds: ActiveSelectionLocalBounds
    verticalAttachment: ActiveSelectionVerticalAttachment
  }): number {
    if (verticalAttachment === 'top') {
      return Math.max(MIN_SIZE, selectionBounds.bottom - shapeBounds.top)
    }

    if (verticalAttachment === 'bottom') {
      return Math.max(MIN_SIZE, shapeBounds.bottom - selectionBounds.top)
    }

    const shapeCenterY = (shapeBounds.top + shapeBounds.bottom) / 2

    return Math.max(
      MIN_SIZE,
      2 * Math.min(
        shapeCenterY - selectionBounds.top,
        selectionBounds.bottom - shapeCenterY
      )
    )
  }

  private _resolveShapeLocalBounds({
    group
  }: {
    group: ShapeGroup
  }): ActiveSelectionLocalBounds {
    const topLeft = group.getPositionByOrigin('left', 'top')
    const bottomRight = group.getPositionByOrigin('right', 'bottom')

    return {
      bottom: bottomRight.y,
      left: topLeft.x,
      right: bottomRight.x,
      top: topLeft.y
    }
  }

  private _mergeBounds({
    current,
    next
  }: {
    current: ActiveSelectionLocalBounds
    next: ActiveSelectionLocalBounds
  }): ActiveSelectionLocalBounds {
    return {
      bottom: Math.max(current.bottom, next.bottom),
      left: Math.min(current.left, next.left),
      right: Math.max(current.right, next.right),
      top: Math.min(current.top, next.top)
    }
  }

  private _resolveVerticalAttachment({
    selectionBounds,
    shapeBounds
  }: {
    selectionBounds: ActiveSelectionLocalBounds
    shapeBounds: ActiveSelectionLocalBounds
  }): ActiveSelectionVerticalAttachment {
    const topGap = Math.max(0, shapeBounds.top - selectionBounds.top)
    const bottomGap = Math.max(0, selectionBounds.bottom - shapeBounds.bottom)
    const isTopAttached = topGap <= SIZE_EPSILON
    const isBottomAttached = bottomGap <= SIZE_EPSILON

    if (isTopAttached && !isBottomAttached) return 'top'
    if (isBottomAttached && !isTopAttached) return 'bottom'
    if (Math.abs(topGap - bottomGap) <= SIZE_EPSILON) return 'center'

    return topGap < bottomGap ? 'top' : 'bottom'
  }

  private _resolveOriginOffset({
    origin
  }: {
    origin: ShapeTransformOriginX | ShapeTransformOriginY
  }): number {
    if (origin === 'left' || origin === 'top') return -0.5
    if (origin === 'right' || origin === 'bottom') return 0.5
    if (origin === 'center') return 0

    return origin - 0.5
  }

  /**
   * Позиционирует shape по тому же vertical attachment, по которому считается clamp рамки.
   * Координаты остаются в стартовой плоскости объектов; текущий transform ActiveSelection переводит их в preview.
   */
  private _positionShapeInSelection({
    group,
    sessionItem
  }: {
    group: ShapeGroup
    sessionItem: ActiveSelectionShapeScalingSessionItem
  }): void {
    const {
      bounds,
      transformOriginX,
      transformOriginPointX,
      verticalAttachment
    } = sessionItem

    if (verticalAttachment === 'top') {
      group.setPositionByOrigin(
        new Point(transformOriginPointX, bounds.top),
        transformOriginX,
        'top'
      )

      return
    }

    if (verticalAttachment === 'bottom') {
      group.setPositionByOrigin(
        new Point(transformOriginPointX, bounds.bottom),
        transformOriginX,
        'bottom'
      )

      return
    }

    group.setPositionByOrigin(
      new Point(transformOriginPointX, (bounds.top + bounds.bottom) / 2),
      transformOriginX,
      'center'
    )
  }

  /**
   * Возвращает true, если pointer уже дошёл до origin активного scale-transform по переданной оси.
   */
  private _hasPointerReachedSelectionScaleOrigin({
    selection,
    transform,
    event,
    axis
  }: {
    selection: ActiveSelection
    transform: Transform
    event?: ShapeScalingPointerEvent
    axis: 'x' | 'y'
  }): boolean {
    const transformWithSign = transform as Transform & {
      signX?: number
      signY?: number
    }
    const sign = axis === 'x'
      ? transformWithSign.signX
      : transformWithSign.signY

    if (typeof sign !== 'number' || !Number.isFinite(sign)) return false

    const localPoint = resolveScaleLocalPointerForTransform({
      target: selection,
      transform,
      event,
      canvas: this.canvas
    })
    if (!localPoint) return false

    const pointCoordinate = axis === 'x'
      ? localPoint.x
      : localPoint.y

    return (pointCoordinate * sign) <= 0
  }

  /**
   * Применяет ограниченный scale к рамке ActiveSelection, сохраняя anchor текущего transform.
   */
  private _applySelectionScale({
    selection,
    transform,
    scaleX,
    scaleY
  }: {
    selection: ActiveSelection
    transform: Transform
    scaleX: number
    scaleY: number
  }): void {
    const currentScaleX = Math.abs(selection.scaleX ?? 1) || 1
    const currentScaleY = Math.abs(selection.scaleY ?? 1) || 1
    const hasScaleChange = Math.abs(currentScaleX - scaleX) > SCALE_EPSILON
      || Math.abs(currentScaleY - scaleY) > SCALE_EPSILON

    if (!hasScaleChange) return

    const originX = resolveShapeTransformOriginXValue({
      value: transform.originX
    })
    const originY = resolveShapeTransformOriginYValue({
      value: transform.originY
    })
    const anchorPoint = originX !== null && originY !== null
      ? selection.getPositionByOrigin(originX, originY)
      : null

    selection.set({
      flipX: false,
      flipY: false,
      scaleX,
      scaleY
    })

    if (anchorPoint && originX !== null && originY !== null) {
      selection.setPositionByOrigin(anchorPoint, originX, originY)
    }

    selection.setCoords()
  }
}
