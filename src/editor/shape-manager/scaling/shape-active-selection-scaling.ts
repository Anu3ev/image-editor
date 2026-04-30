import {
  ActiveSelection,
  Canvas,
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
  ShapeTextNode
} from '../types'
import { applyShapeScalingPreviewLayout } from './shape-scaling-preview'
import {
  resolveShapeScaleActionAxes,
  resolveShapeTransformOriginXValue,
  resolveShapeTransformOriginYValue
} from './shape-scaling-transform'
import {
  commitResolvedShapeScalingLayout,
  ensureShapeScalingState,
  resolveMinimumTextFitHeight,
  resolveShapeScalingCommitDimensions,
  resolveShapeScalingConstraintPadding,
  resolveShapeScalingPreviewDimensions,
  resolveShapeScalingPreviewLayout,
  resolveShapeScalingStartDimensions,
  SHAPE_SCALING_MIN_SIZE as MIN_SIZE,
  SHAPE_SCALING_SCALE_EPSILON as SCALE_EPSILON
} from './shape-scaling-layout'
import type {
  ShapeScalingPointerEvent
} from './shape-scaling-layout'

type ActiveSelectionShapeScalingPreviewItem = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode
  constraintPadding: ShapePadding
  state: ShapeScalingState
}

export type ActiveSelectionAppliedScale = {
  scaleX: number
  scaleY: number
}

/**
 * Контроллер масштабирования shape-групп внутри ActiveSelection.
 */
export default class ShapeActiveSelectionScalingController {
  private canvas: Canvas

  private shapeScalingState: WeakMap<ShapeGroup, ShapeScalingState>

  private scalingState: WeakMap<ActiveSelection, ActiveSelectionAppliedScale>

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
      canScaleHeight
    } = resolveShapeScaleActionAxes({
      transform
    })
    if (!canScaleWidth && !canScaleHeight) return

    const items = this._collectPreviewItems({
      selection,
      transform
    })

    if (!items.length) return

    const scaleX = Math.abs(selection.scaleX ?? 1) || 1
    const scaleY = Math.abs(selection.scaleY ?? 1) || 1
    const appliedScale = this._resolveAppliedScale({
      items,
      transform,
      scaleX,
      scaleY,
      event
    })

    this._applySelectionScale({
      selection,
      transform,
      scaleX: appliedScale.scaleX,
      scaleY: appliedScale.scaleY
    })
    this.scalingState.set(selection, appliedScale)

    items.forEach(({
      group,
      shape,
      text,
      constraintPadding,
      state
    }) => {
      const previewDimensions = resolveShapeScalingPreviewDimensions({
        group,
        text,
        constraintPadding,
        startDimensions: state,
        appliedScaleX: appliedScale.scaleX,
        appliedScaleY: appliedScale.scaleY
      })
      const previewLayout = resolveShapeScalingPreviewLayout({
        group,
        text,
        state,
        appliedScaleX: appliedScale.scaleX,
        appliedScaleY: appliedScale.scaleY,
        minimumHeight: previewDimensions.previewHeight
      })

      applyShapeScalingPreviewLayout({
        group,
        shape,
        text,
        layout: previewLayout,
        alignH: group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
        scaleX: appliedScale.scaleX,
        scaleY: appliedScale.scaleY,
        minSize: MIN_SIZE,
        scaleEpsilon: SCALE_EPSILON
      })

      group.setCoords()
    })

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
      scaleX,
      scaleY
    })

    if (!hasDimensionChange) {
      this.shapeScalingState.delete(group)
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
  }): ActiveSelectionShapeScalingPreviewItem[] {
    const items: ActiveSelectionShapeScalingPreviewItem[] = []

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
   * Возвращает scale общего выделения, ограниченный минимальными размерами всех shape-групп.
   */
  private _resolveAppliedScale({
    items,
    transform,
    scaleX,
    scaleY,
    event
  }: {
    items: ActiveSelectionShapeScalingPreviewItem[]
    transform: Transform
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
    let appliedScaleX = scaleX
    let appliedScaleY = scaleY

    if (canScaleWidth) {
      appliedScaleX = this._resolveMinimumScaleX({
        items,
        scaleX,
        scaleY: appliedScaleY
      })
    }

    if (canScaleHeight) {
      appliedScaleY = this._resolveMinimumScaleY({
        items,
        scaleX: appliedScaleX,
        scaleY,
        isVerticalOnlyScale: canScaleHeight && !canScaleWidth
      })
    }

    if (canScaleWidth && canScaleHeight) {
      appliedScaleX = this._resolveMinimumScaleX({
        items,
        scaleX,
        scaleY: appliedScaleY
      })
    }

    const isProportionalCornerScale = isCornerScaleAction
      && isShiftPressed

    if (isProportionalCornerScale) {
      const appliedScale = Math.max(appliedScaleX, appliedScaleY)

      return {
        scaleX: appliedScale,
        scaleY: appliedScale
      }
    }

    return {
      scaleX: appliedScaleX,
      scaleY: appliedScaleY
    }
  }

  /**
   * Возвращает общий scaleX, при котором каждый shape в выделении остаётся не уже своей минимальной ширины.
   */
  private _resolveMinimumScaleX({
    items,
    scaleX,
    scaleY
  }: {
    items: ActiveSelectionShapeScalingPreviewItem[]
    scaleX: number
    scaleY: number
  }): number {
    let appliedScaleX = scaleX

    for (const {
      group,
      text,
      constraintPadding,
      state
    } of items) {
      const attemptedWidth = Math.max(MIN_SIZE, state.startWidth * scaleX)
      const isShrinkingX = scaleX < state.lastAllowedScaleX - SCALE_EPSILON

      if (!isShrinkingX) continue

      const attemptedHeight = Math.max(MIN_SIZE, state.startHeight * scaleY)
      const minimumWidth = resolveMinimumShapeWidthForText({
        text,
        padding: constraintPadding,
        resolvePaddingForWidth: ({ width }) => resolveShapeScalingConstraintPadding({
          group,
          width,
          height: attemptedHeight
        })
      })

      if (attemptedWidth >= minimumWidth + SCALE_EPSILON) continue

      const minimumScaleX = Math.max(MIN_SIZE / state.startWidth, minimumWidth / state.startWidth)
      appliedScaleX = Math.max(appliedScaleX, minimumScaleX)
    }

    return appliedScaleX
  }

  /**
   * Возвращает общий scaleY, при котором каждый shape в выделении остаётся не ниже своей минимальной высоты.
   */
  private _resolveMinimumScaleY({
    items,
    scaleX,
    scaleY,
    isVerticalOnlyScale
  }: {
    items: ActiveSelectionShapeScalingPreviewItem[]
    scaleX: number
    scaleY: number
    isVerticalOnlyScale: boolean
  }): number {
    let appliedScaleY = scaleY

    for (const {
      group,
      text,
      constraintPadding,
      state
    } of items) {
      const isShrinkingY = scaleY < state.lastAllowedScaleY - SCALE_EPSILON

      if (!isShrinkingY) continue

      if (
        isVerticalOnlyScale
        && state.cannotScaleDownAtStart
        && scaleY < state.startScaleY - SCALE_EPSILON
      ) {
        appliedScaleY = Math.max(appliedScaleY, state.startScaleY)
        continue
      }

      const attemptedWidth = Math.max(MIN_SIZE, state.startWidth * scaleX)
      const attemptedHeight = Math.max(MIN_SIZE, state.startHeight * scaleY)
      const minimumHeight = resolveMinimumTextFitHeight({
        group,
        text,
        width: attemptedWidth,
        padding: constraintPadding
      })

      if (attemptedHeight >= minimumHeight + SCALE_EPSILON) continue

      const minimumScaleY = Math.max(MIN_SIZE / state.startHeight, minimumHeight / state.startHeight)
      appliedScaleY = Math.max(appliedScaleY, minimumScaleY)
    }

    return appliedScaleY
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
