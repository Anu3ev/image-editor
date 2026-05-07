import {
  ActiveSelection,
  Canvas,
  FabricObject,
  Point,
  Transform
} from 'fabric'
import {
  applyFixedWidthShapeTextLayout,
  applyShapeTextLayout,
  resolveMinimumShapeWidthForText
} from '../layout/shape-layout'
import {
  ShapeGroup,
  ShapePadding,
  ShapeScalingState,
  ShapeNode,
  ShapeTextNode
} from '../types'
import {
  getShapeNodes,
  isShapeGroup
} from '../shape-utils'
import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from '../shape-presets'
import {
  isShapeTransformCornerChanged,
  isShapeTransformOriginChanged,
  resolveScaleLocalPointerForTransform,
  resolveShapeScaleActionAxes
} from './shape-scaling-transform'
import { applyShapeScalingPreviewLayout } from './shape-scaling-preview'
import ShapeActiveSelectionScalingController from './shape-active-selection-scaling'
import type {
  ActiveSelectionAppliedScale
} from './shape-active-selection-scaling'
import {
  commitResolvedShapeScalingLayout,
  ensureShapeScalingState,
  resolveMinimumProportionalShapeScale,
  resolveMinimumTextFitHeight,
  resolveShapeScalingCommitDimensions,
  resolveShapeScalingConstraintPadding,
  resolveShapeScalingInternalTextInset,
  resolveShapeScalingPreviewDimensions,
  resolveShapeScalingPreviewLayout,
  resolveShapeScalingUserPadding,
  validateShapeTextLayoutForProportionalScaling,
  SHAPE_SCALING_MIN_SIZE as MIN_SIZE,
  SHAPE_SCALING_SCALE_EPSILON as SCALE_EPSILON
} from './shape-scaling-layout'
import type {
  ShapeScalingPointerEvent
} from './shape-scaling-layout'

type ShapeScalingEvent = {
  target?: FabricObject | null
  e?: ShapeScalingPointerEvent
  transform?: Transform | null
}

type ShapeModifiedEvent = {
  target?: FabricObject | null
  e?: ShapeScalingPointerEvent
  transform?: Transform | null
}

type ShapeScalingDecision = {
  appliedScaleX: number
  appliedScaleY: number
  previewHeight: number
  shouldHandleAsNoop: boolean
  shouldRestoreLastAllowedTransform: boolean
}

type ShapeScalingConstraintState = {
  shouldHandleAsNoop: boolean
  shouldRestoreLastAllowedTransform: boolean
  clampedScaleX: number | null
  clampedScaleY: number | null
  resolvedMinimumHeight: number | null
}

type ShapeScaleDirection = -1 | 1

type CanvasWithCurrentTransform = Canvas & {
  _currentTransform?: Transform | null
}

/**
 * Контроллер масштабирования shape-группы без изменения размера шрифта.
 */
export default class ShapeScalingController {
  /**
   * Fabric canvas редактора.
   */
  private canvas: Canvas

  /**
   * Временное состояние масштабирования для активных shape-групп.
   */
  private scalingState: WeakMap<ShapeGroup, ShapeScalingState>

  /**
   * Контроллер масштабирования shape-групп внутри ActiveSelection.
   */
  private activeSelectionScalingController: ShapeActiveSelectionScalingController

  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
    this.scalingState = new WeakMap()
    this.activeSelectionScalingController = new ShapeActiveSelectionScalingController({
      canvas,
      shapeScalingState: this.scalingState
    })
  }

  /**
   * Обрабатывает процесс масштабирования shape-группы.
   */
  public handleObjectScaling = (
    event: ShapeScalingEvent
  ): void => {
    const {
      target,
      transform
    } = event
    if (target instanceof ActiveSelection) {
      this.activeSelectionScalingController.handleScalingPreview({
        selection: target,
        transform,
        event: event.e
      })
      return
    }

    if (!isShapeGroup(target)) return

    const group = target
    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) return

    group.set({
      lockScalingFlip: true,
      centeredScaling: false
    })

    const constraintPadding = resolveShapeScalingConstraintPadding({ group })
    const state = ensureShapeScalingState({
      scalingState: this.scalingState,
      group,
      text,
      constraintPadding,
      transform
    })
    const isCornerScaleAction = state.canScaleWidth && state.canScaleHeight
    const isShiftPressed = Boolean(event.e && 'shiftKey' in event.e && event.e.shiftKey)
    const isProportionalCornerScale = isCornerScaleAction && !isShiftPressed

    state.isProportionalScaling = isProportionalCornerScale
    this._storeScaleDirectionsForCurrentTransform({
      group,
      state,
      event: event.e,
      transform
    })
    const currentLeft = group.left ?? 0
    const currentTop = group.top ?? 0
    const currentFlipX = Boolean(group.flipX)
    const currentFlipY = Boolean(group.flipY)
    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const scalingDecision = this._resolveScalingDecision({
      group,
      text,
      constraintPadding,
      state,
      transform
    })

    if (scalingDecision.shouldHandleAsNoop) {
      this._restoreBlockedScalingAttempt({
        group,
        shape,
        text,
        state
      })
      return
    }

    const previewLayout = resolveShapeScalingPreviewLayout({
      group,
      text,
      state,
      appliedScaleX: scalingDecision.appliedScaleX,
      appliedScaleY: scalingDecision.appliedScaleY,
      minimumHeight: scalingDecision.previewHeight
    })
    const currentScaleX = Math.abs(group.scaleX ?? state.startScaleX) || state.startScaleX
    const currentScaleY = Math.abs(group.scaleY ?? state.startScaleY) || state.startScaleY
    const shouldApplyResolvedTransform = scalingDecision.shouldRestoreLastAllowedTransform
      || Math.abs(scalingDecision.appliedScaleX - currentScaleX) > SCALE_EPSILON
      || Math.abs(scalingDecision.appliedScaleY - currentScaleY) > SCALE_EPSILON

    if (shouldApplyResolvedTransform) {
      this._applyResolvedScalingState({
        group,
        state,
        shouldHandleAsNoop: false,
        scaleX: scalingDecision.appliedScaleX,
        scaleY: scalingDecision.appliedScaleY
      })
    }

    applyShapeScalingPreviewLayout({
      group,
      shape,
      text,
      layout: previewLayout,
      alignH,
      scaleX: scalingDecision.appliedScaleX,
      scaleY: scalingDecision.appliedScaleY,
      minSize: MIN_SIZE,
      scaleEpsilon: SCALE_EPSILON
    })

    this._restoreScalingAnchorPosition({
      group,
      state
    })

    if (!scalingDecision.shouldHandleAsNoop && !scalingDecision.shouldRestoreLastAllowedTransform) {
      this._storeLastAllowedTransform({
        group,
        state,
        scaleX: scalingDecision.appliedScaleX,
        scaleY: scalingDecision.appliedScaleY,
        currentLeft,
        currentTop,
        currentFlipX,
        currentFlipY
      })
    }

    this.canvas.requestRenderAll()
  }

  /**
   * Вычисляет итоговое решение для текущего шага scaling: блокировку, preview-размеры и применённый scale.
   */
  private _resolveScalingDecision({
    group,
    text,
    constraintPadding,
    state,
    transform
  }: {
    group: ShapeGroup
    text: ShapeTextNode
    constraintPadding: ShapePadding
    state: ShapeScalingState
    transform?: Transform | null
  }): ShapeScalingDecision {
    // Сначала нормализуем текущий transform и фиксируем состояние, после которого drag больше нельзя продолжать в обратную сторону.
    const scaleXRaw = group.scaleX ?? 1
    const scaleYRaw = group.scaleY ?? 1
    const {
      scaleX,
      scaleY
    } = this._resolveCurrentDragScales({
      group,
      state
    })
    const hasNegativeScale = (state.canScaleWidth && scaleXRaw < 0)
      || (state.canScaleHeight && scaleYRaw < 0)
    const hasTransformOriginChange = isShapeTransformOriginChanged({
      state,
      transform
    })
    const hasTransformCornerChange = isShapeTransformCornerChanged({
      state,
      transform
    })

    if (hasNegativeScale || hasTransformOriginChange || hasTransformCornerChange) {
      state.crossedOppositeCorner = true
    }

    // Дальше определяем, можно ли применять этот шаг scaling, или нужно откатиться к последнему допустимому состоянию.
    const constraintState = this._resolveScalingConstraintState({
      group,
      text,
      constraintPadding,
      state,
      scaleX,
      scaleY
    })

    // После решения о блокировке считаем именно те размеры preview, которые реально будут применены в этом кадре drag.
    const currentScaleX = scaleX
    const currentScaleY = scaleY
    let appliedScaleX = constraintState.clampedScaleX ?? currentScaleX
    let appliedScaleY = constraintState.clampedScaleY ?? currentScaleY

    if (constraintState.shouldRestoreLastAllowedTransform) {
      appliedScaleX = state.lastAllowedScaleX
      appliedScaleY = state.lastAllowedScaleY
    }

    if (constraintState.shouldHandleAsNoop) {
      appliedScaleX = state.startScaleX
      appliedScaleY = state.startScaleY
    }

    let resolvedPreviewMinimumHeight = constraintState.resolvedMinimumHeight
    const fixedWidthMinimumTextFitHeight = !state.canScaleWidth && state.canScaleHeight
      ? state.fixedWidthMinimumTextFitHeight
      : null

    if (constraintState.shouldHandleAsNoop) {
      resolvedPreviewMinimumHeight = state.startHeight
    } else if (resolvedPreviewMinimumHeight === null || resolvedPreviewMinimumHeight === undefined) {
      resolvedPreviewMinimumHeight = fixedWidthMinimumTextFitHeight
    }

    const { previewHeight } = resolveShapeScalingPreviewDimensions({
      group,
      text,
      constraintPadding,
      startDimensions: state,
      appliedScaleX,
      appliedScaleY,
      minimumHeight: resolvedPreviewMinimumHeight,
      measurementCache: state.previewTextMeasurementCache
    })

    return {
      appliedScaleX,
      appliedScaleY,
      previewHeight,
      shouldHandleAsNoop: constraintState.shouldHandleAsNoop,
      shouldRestoreLastAllowedTransform: constraintState.shouldRestoreLastAllowedTransform
    }
  }

  /**
   * Определяет, как ограничения shape влияют на текущий шаг scaling.
   */
  private _resolveScalingConstraintState({
    group,
    text,
    constraintPadding,
    state,
    scaleX,
    scaleY
  }: {
    group: ShapeGroup
    text: ShapeTextNode
    constraintPadding: ShapePadding
    state: ShapeScalingState
    scaleX: number
    scaleY: number
  }): ShapeScalingConstraintState {
    const {
      canScaleHeight,
      canScaleWidth,
      startHeight,
      startWidth,
      cannotScaleDownAtStart,
      crossedOppositeCorner,
      isProportionalScaling,
      lastAllowedScaleX,
      lastAllowedScaleY,
      startScaleY
    } = state

    const isVerticalOnlyScale = canScaleHeight && !canScaleWidth
    const attemptedWidth = canScaleWidth
      ? Math.max(MIN_SIZE, startWidth * scaleX)
      : startWidth
    const attemptedHeight = canScaleHeight
      ? Math.max(MIN_SIZE, startHeight * scaleY)
      : startHeight
    const isShrinkingX = scaleX < lastAllowedScaleX - SCALE_EPSILON
    const isShrinkingY = scaleY < lastAllowedScaleY - SCALE_EPSILON
    const isBelowStartScaleY = scaleY < startScaleY - SCALE_EPSILON
    const fixedWidthMinimumTextFitHeight = isVerticalOnlyScale
      ? state.fixedWidthMinimumTextFitHeight
      : null

    const minimumWidth = canScaleWidth && isShrinkingX
      ? resolveMinimumShapeWidthForText({
        text,
        padding: constraintPadding,
        measurementCache: state.previewTextMeasurementCache ?? undefined,
        resolvePaddingForWidth: ({ width }) => resolveShapeScalingConstraintPadding({
          group,
          width,
          height: attemptedHeight
        })
      })
      : null
    const minimumHeight = canScaleHeight && isShrinkingY
      ? fixedWidthMinimumTextFitHeight ?? resolveMinimumTextFitHeight({
        group,
        text,
        width: attemptedWidth,
        padding: constraintPadding,
        measurementCache: state.previewTextMeasurementCache
      })
      : null

    const shouldHandleAsNoop = isVerticalOnlyScale
      && cannotScaleDownAtStart
      && isBelowStartScaleY
    const shouldValidateProportionalConstraint = isProportionalScaling
      && canScaleWidth
      && canScaleHeight
      && (isShrinkingX || isShrinkingY)

    if (shouldValidateProportionalConstraint) {
      const candidateConstraint = validateShapeTextLayoutForProportionalScaling({
        group,
        text,
        width: attemptedWidth,
        height: attemptedHeight,
        measurementCache: state.previewTextMeasurementCache,
        constraintCache: state.proportionalTextConstraintCache
      })

      if (!candidateConstraint.isValid) {
        const proportionalMinimum = resolveMinimumProportionalShapeScale({
          group,
          text,
          state
        })

        return {
          shouldHandleAsNoop,
          shouldRestoreLastAllowedTransform: crossedOppositeCorner,
          clampedScaleX: proportionalMinimum.scale,
          clampedScaleY: proportionalMinimum.scale,
          resolvedMinimumHeight: proportionalMinimum.minimumHeight
        }
      }

      return {
        shouldHandleAsNoop,
        shouldRestoreLastAllowedTransform: crossedOppositeCorner,
        clampedScaleX: null,
        clampedScaleY: null,
        resolvedMinimumHeight: null
      }
    }

    const hasMinimumWidthViolation = minimumWidth !== null
      && attemptedWidth < minimumWidth + SCALE_EPSILON
    const hasMinimumHeightViolation = minimumHeight !== null
      && attemptedHeight < minimumHeight + SCALE_EPSILON
    const hasMinimumConstraintViolation = hasMinimumWidthViolation
      || hasMinimumHeightViolation
    const shouldRestoreLastAllowedTransform = crossedOppositeCorner

    let clampedScaleX: number | null = null
    let clampedScaleY: number | null = null

    if (isProportionalScaling && hasMinimumConstraintViolation) {
      const proportionalMinimum = resolveMinimumProportionalShapeScale({
        group,
        text,
        state
      })

      clampedScaleX = proportionalMinimum.scale
      clampedScaleY = proportionalMinimum.scale

      return {
        shouldHandleAsNoop,
        shouldRestoreLastAllowedTransform,
        clampedScaleX,
        clampedScaleY,
        resolvedMinimumHeight: proportionalMinimum.minimumHeight
      }
    }

    if (minimumWidth !== null && attemptedWidth < minimumWidth + SCALE_EPSILON) {
      clampedScaleX = Math.max(MIN_SIZE / startWidth, minimumWidth / startWidth)
    }

    if (minimumHeight !== null && attemptedHeight < minimumHeight + SCALE_EPSILON) {
      clampedScaleY = Math.max(MIN_SIZE / startHeight, minimumHeight / startHeight)
    }

    return {
      shouldHandleAsNoop,
      shouldRestoreLastAllowedTransform,
      clampedScaleX,
      clampedScaleY,
      resolvedMinimumHeight: minimumHeight
    }
  }

  /**
   * Восстанавливает стартовое состояние, когда текущий drag заблокирован minimum-ограничением.
   */
  private _restoreBlockedScalingAttempt({
    group,
    shape,
    text,
    state
  }: {
    group: ShapeGroup
    shape: ShapeNode
    text: ShapeTextNode
    state: ShapeScalingState
  }): void {
    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN

    this._applyResolvedScalingState({
      group,
      state,
      shouldHandleAsNoop: true,
      scaleX: state.startScaleX,
      scaleY: state.startScaleY
    })

    const previewLayout = resolveShapeScalingPreviewLayout({
      group,
      text,
      state,
      appliedScaleX: state.startScaleX,
      appliedScaleY: state.startScaleY,
      minimumHeight: state.startHeight
    })

    applyShapeScalingPreviewLayout({
      group,
      shape,
      text,
      layout: previewLayout,
      alignH,
      scaleX: state.startScaleX,
      scaleY: state.startScaleY,
      minSize: MIN_SIZE,
      scaleEpsilon: SCALE_EPSILON
    })

    this._restoreScalingAnchorPosition({
      group,
      state
    })

    this.canvas.requestRenderAll()
  }

  /**
   * Применяет скорректированное состояние transform, когда текущий drag нужно ограничить или откатить.
   */
  private _applyResolvedScalingState({
    group,
    state,
    shouldHandleAsNoop,
    scaleX,
    scaleY
  }: {
    group: ShapeGroup
    state: ShapeScalingState
    shouldHandleAsNoop: boolean
    scaleX: number
    scaleY: number
  }): void {
    state.blockedScaleAttempt = shouldHandleAsNoop
    group.shapeScalingNoopTransform = shouldHandleAsNoop

    const nextScaleX = shouldHandleAsNoop ? state.startScaleX : scaleX
    const nextScaleY = shouldHandleAsNoop ? state.startScaleY : scaleY
    const nextLeft = shouldHandleAsNoop ? state.startLeft : state.lastAllowedLeft
    const nextTop = shouldHandleAsNoop ? state.startTop : state.lastAllowedTop

    if (shouldHandleAsNoop) {
      state.lastAllowedScaleX = state.startScaleX
      state.lastAllowedScaleY = state.startScaleY
      state.lastAllowedLeft = state.startLeft
      state.lastAllowedTop = state.startTop
    }

    group.set({
      flipX: state.lastAllowedFlipX,
      flipY: state.lastAllowedFlipY,
      scaleX: nextScaleX,
      scaleY: nextScaleY,
      left: nextLeft,
      top: nextTop
    })

    this._restoreScalingAnchorPosition({
      group,
      state
    })
  }

  /**
   * Поддерживает live-clamp minimum boundary на кадрах, где Fabric перестал эмитить object:scaling.
   */
  public handleCanvasMouseMove = (event: ShapeModifiedEvent): void => {
    const canvas = this.canvas as CanvasWithCurrentTransform
    const transform = canvas._currentTransform
    if (!transform) return

    const { target } = transform
    if (target instanceof ActiveSelection) {
      this.activeSelectionScalingController.handleScalingPreview({
        selection: target,
        transform,
        event: event.e
      })
      return
    }

    if (!isShapeGroup(target)) return

    const group = target
    const state = this.scalingState.get(group)
    if (!state) return

    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) return

    const constraintPadding = resolveShapeScalingConstraintPadding({ group })
    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const {
      canScaleWidth,
      canScaleHeight
    } = state
    if (!canScaleWidth && !canScaleHeight) return

    const rawScaleX = Math.abs(group.scaleX ?? state.startScaleX) || state.startScaleX
    const rawScaleY = Math.abs(group.scaleY ?? state.startScaleY) || state.startScaleY
    const {
      scaleX: currentScaleX,
      scaleY: currentScaleY
    } = this._resolveCurrentDragScales({
      group,
      state
    })
    const eventWithTransform = {
      ...event,
      transform
    }
    let nextScaleX = currentScaleX
    let nextScaleY = currentScaleY
    let resolvedMinimumHeight: number | null = null
    let didClampWidth = false
    let shouldApplyClamp = false
    const shouldNormalizeInactiveAxis = (!canScaleWidth && Math.abs(rawScaleX - currentScaleX) > SCALE_EPSILON)
      || (!canScaleHeight && Math.abs(rawScaleY - currentScaleY) > SCALE_EPSILON)
    const fixedWidthMinimumTextFitHeight = !canScaleWidth && canScaleHeight
      ? state.fixedWidthMinimumTextFitHeight
      : null

    if (state.isProportionalScaling) {
      const pointerReachedOrPassedOriginX = canScaleWidth && this._hasPointerReachedScaleOrigin({
        event: eventWithTransform,
        group,
        state,
        axis: 'x'
      })
      const pointerReachedOrPassedOriginY = canScaleHeight && this._hasPointerReachedScaleOrigin({
        event: eventWithTransform,
        group,
        state,
        axis: 'y'
      })

      if (!pointerReachedOrPassedOriginX && !pointerReachedOrPassedOriginY) return

      const proportionalMinimum = resolveMinimumProportionalShapeScale({
        group,
        text,
        state
      })

      nextScaleX = proportionalMinimum.scale
      nextScaleY = proportionalMinimum.scale
      resolvedMinimumHeight = proportionalMinimum.minimumHeight
      shouldApplyClamp = Math.abs(currentScaleX - nextScaleX) > SCALE_EPSILON
        || Math.abs(currentScaleY - nextScaleY) > SCALE_EPSILON
    }

    if (!state.isProportionalScaling) {
      const pointerReachedOrPassedOriginX = canScaleWidth && this._hasPointerReachedScaleOrigin({
        event: eventWithTransform,
        group,
        state,
        axis: 'x'
      })
      if (pointerReachedOrPassedOriginX) {
        const minimumWidth = resolveMinimumShapeWidthForText({
          text,
          padding: constraintPadding,
          resolvePaddingForWidth: ({ width }) => resolveShapeScalingConstraintPadding({
            group,
            width,
            height: Math.max(MIN_SIZE, state.startHeight * nextScaleY)
          })
        })
        const minimumScaleX = Math.max(MIN_SIZE / state.startWidth, minimumWidth / state.startWidth)
        if (state.lastAllowedScaleX > minimumScaleX + SCALE_EPSILON) {
          nextScaleX = minimumScaleX
          didClampWidth = true
          shouldApplyClamp = true
        }
      }

      const pointerReachedOrPassedOriginY = canScaleHeight && this._hasPointerReachedScaleOrigin({
        event: eventWithTransform,
        group,
        state,
        axis: 'y'
      })
      if (pointerReachedOrPassedOriginY) {
        if (!canScaleWidth && state.cannotScaleDownAtStart) {
          this._restoreBlockedScalingAttempt({
            group,
            shape,
            text,
            state
          })
          return
        }

        resolvedMinimumHeight = fixedWidthMinimumTextFitHeight ?? resolveMinimumTextFitHeight({
          group,
          text,
          width: Math.max(MIN_SIZE, state.startWidth * nextScaleX),
          padding: constraintPadding,
          measurementCache: state.previewTextMeasurementCache
        })
        const minimumScaleY = Math.max(MIN_SIZE / state.startHeight, resolvedMinimumHeight / state.startHeight)
        if (state.lastAllowedScaleY > minimumScaleY + SCALE_EPSILON) {
          nextScaleY = minimumScaleY
          shouldApplyClamp = true
        }
      }
    }

    if (!shouldApplyClamp && !shouldNormalizeInactiveAxis) return

    if (resolvedMinimumHeight === null || resolvedMinimumHeight === undefined) {
      resolvedMinimumHeight = fixedWidthMinimumTextFitHeight
    }

    const previewDimensions = resolveShapeScalingPreviewDimensions({
      group,
      text,
      constraintPadding,
      startDimensions: state,
      appliedScaleX: nextScaleX,
      appliedScaleY: nextScaleY,
      minimumHeight: didClampWidth ? null : resolvedMinimumHeight,
      measurementCache: state.previewTextMeasurementCache
    })
    const previewLayout = resolveShapeScalingPreviewLayout({
      group,
      text,
      state,
      appliedScaleX: nextScaleX,
      appliedScaleY: nextScaleY,
      minimumHeight: previewDimensions.previewHeight
    })

    this._applyResolvedScalingState({
      group,
      state,
      shouldHandleAsNoop: false,
      scaleX: nextScaleX,
      scaleY: nextScaleY
    })

    applyShapeScalingPreviewLayout({
      group,
      shape,
      text,
      layout: previewLayout,
      alignH,
      scaleX: nextScaleX,
      scaleY: nextScaleY,
      minSize: MIN_SIZE,
      scaleEpsilon: SCALE_EPSILON
    })

    this._restoreScalingAnchorPosition({
      group,
      state
    })

    this._storeLastAllowedTransform({
      group,
      state,
      scaleX: nextScaleX,
      scaleY: nextScaleY,
      currentLeft: state.lastAllowedLeft,
      currentTop: state.lastAllowedTop,
      currentFlipX: state.lastAllowedFlipX,
      currentFlipY: state.lastAllowedFlipY
    })

    this.canvas.requestRenderAll()
  }

  /**
   * Сохраняет последнюю допустимую трансформацию текущего drag, к которой можно безопасно вернуться.
   */
  private _storeLastAllowedTransform({
    group,
    state,
    scaleX,
    scaleY,
    currentLeft,
    currentTop,
    currentFlipX,
    currentFlipY
  }: {
    group: ShapeGroup
    state: ShapeScalingState
    scaleX: number
    scaleY: number
    currentLeft: number
    currentTop: number
    currentFlipX: boolean
    currentFlipY: boolean
  }): void {
    state.blockedScaleAttempt = false
    group.shapeScalingNoopTransform = false
    state.lastAllowedScaleX = Math.abs(scaleX) || 1
    state.lastAllowedScaleY = Math.abs(scaleY) || 1
    state.lastAllowedLeft = group.left ?? currentLeft
    state.lastAllowedTop = group.top ?? currentTop
    state.lastAllowedFlipX = currentFlipX
    state.lastAllowedFlipY = currentFlipY
  }

  /**
   * Завершает масштабирование и "запекает" размеры в геометрию shape-группы.
   */
  public handleObjectModified = (event: ShapeModifiedEvent): void => {
    const { target } = event
    if (!isShapeGroup(target)) return

    const group = target
    const state = this.scalingState.get(group)
    const scaleX = Math.abs(group.scaleX ?? 1) || 1
    const scaleY = Math.abs(group.scaleY ?? 1) || 1
    const hasScaleChange = Math.abs(scaleX - 1) > SCALE_EPSILON
      || Math.abs(scaleY - 1) > SCALE_EPSILON
    const hasScalingState = Boolean(state)

    if (!hasScaleChange && !hasScalingState) return

    const startWidth = state?.startWidth ?? Math.max(
      MIN_SIZE,
      group.shapeBaseWidth ?? group.width ?? group.shapeManualBaseWidth ?? MIN_SIZE
    )
    const startHeight = state?.startHeight ?? Math.max(
      MIN_SIZE,
      group.shapeBaseHeight ?? group.height ?? group.shapeManualBaseHeight ?? MIN_SIZE
    )
    const startManualBaseWidth = state?.startManualBaseWidth ?? Math.max(
      MIN_SIZE,
      group.shapeManualBaseWidth ?? startWidth
    )
    const startManualBaseHeight = state?.startManualBaseHeight ?? Math.max(
      MIN_SIZE,
      group.shapeManualBaseHeight ?? startHeight
    )
    const hasBlockedScaleAttempt = Boolean(state?.blockedScaleAttempt)

    if (hasBlockedScaleAttempt && state) {
      const {
        shape,
        text
      } = getShapeNodes({ group })

      if (!shape || !text) {
        group.shapeScalingNoopTransform = false
        this.scalingState.delete(group)
        return
      }

      this._restoreShapeStateWithoutResize({
        group,
        shape,
        text,
        state,
        startWidth,
        startHeight,
        alignH: group.shapeAlignHorizontal,
        alignV: group.shapeAlignVertical,
        userPadding: resolveShapeScalingUserPadding({ group })
      })

      group.shapeScalingNoopTransform = false
      this.scalingState.delete(group)
      this.canvas.requestRenderAll()
      return
    }

    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) {
      this.scalingState.delete(group)
      return
    }

    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const alignV = group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN

    const constraintPadding = resolveShapeScalingConstraintPadding({ group })
    const resolvedAxes = event.transform
      ? resolveShapeScaleActionAxes({
        transform: event.transform
      })
      : null
    const canScaleWidth = state?.canScaleWidth
      ?? resolvedAxes?.canScaleWidth
      ?? (Math.abs(scaleX - 1) > SCALE_EPSILON)
    const canScaleHeight = state?.canScaleHeight
      ?? resolvedAxes?.canScaleHeight
      ?? (Math.abs(scaleY - 1) > SCALE_EPSILON)
    let allowedScaleX = state?.lastAllowedScaleX ?? scaleX
    let allowedScaleY = state?.lastAllowedScaleY ?? scaleY
    if (state?.isProportionalScaling) {
      const pointerReachedOrPassedOriginX = this._hasPointerReachedScaleOrigin({
        event,
        group,
        state,
        axis: 'x'
      })
      const pointerReachedOrPassedOriginY = this._hasPointerReachedScaleOrigin({
        event,
        group,
        state,
        axis: 'y'
      })

      if (pointerReachedOrPassedOriginX || pointerReachedOrPassedOriginY) {
        const proportionalMinimum = resolveMinimumProportionalShapeScale({
          group,
          text,
          state
        })

        if (
          scaleX < proportionalMinimum.scale - SCALE_EPSILON
          || scaleY < proportionalMinimum.scale - SCALE_EPSILON
        ) {
          allowedScaleX = proportionalMinimum.scale
          allowedScaleY = proportionalMinimum.scale
        }
      }
    } else {
      const minimumWidth = resolveMinimumShapeWidthForText({
        text,
        padding: constraintPadding,
        resolvePaddingForWidth: ({ width }) => resolveShapeScalingConstraintPadding({
          group,
          width,
          height: Math.max(MIN_SIZE, startHeight * allowedScaleY)
        })
      })
      const shouldClampWidthToMinimum = this._shouldClampWidthToMinimum({
        event,
        group,
        minimumWidth,
        state
      })

      if (shouldClampWidthToMinimum) {
        allowedScaleX = Math.max(MIN_SIZE / startWidth, minimumWidth / startWidth)
      }

      const minimumHeight = resolveMinimumTextFitHeight({
        group,
        text,
        width: Math.max(MIN_SIZE, startWidth * allowedScaleX),
        padding: constraintPadding
      })
      const shouldClampHeightToMinimum = this._shouldClampHeightToMinimum({
        event,
        group,
        minimumHeight,
        state
      })

      if (shouldClampHeightToMinimum) {
        allowedScaleY = Math.max(MIN_SIZE / startHeight, minimumHeight / startHeight)
      }
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
        startWidth,
        startHeight,
        startManualBaseWidth,
        startManualBaseHeight,
        canScaleWidth,
        canScaleHeight
      },
      scaleX: allowedScaleX,
      scaleY: allowedScaleY
    })

    if (!hasDimensionChange && state) {
      this._restoreShapeStateWithoutResize({
        group,
        shape,
        text,
        state,
        startWidth,
        startHeight,
        alignH,
        alignV,
        userPadding: resolveShapeScalingUserPadding({ group })
      })

      this.scalingState.delete(group)
      this.canvas.requestRenderAll()
      return
    }

    if (state) {
      group.set({
        left: state.lastAllowedLeft,
        top: state.lastAllowedTop
      })
    }

    commitResolvedShapeScalingLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      startManualBaseWidth,
      startManualBaseHeight,
      canScaleWidth,
      canScaleHeight,
      hasWidthChange
    })

    if (state) {
      this._restoreScalingAnchorPosition({
        group,
        state
      })
    }

    group.setCoords()
    text.setCoords()
    shape.setCoords()

    this.scalingState.delete(group)
    group.shapeScalingNoopTransform = false

    this.canvas.requestRenderAll()
  }

  /**
   * Фиксирует resize дочерней shape-группы после масштабирования ActiveSelection.
   */
  public commitActiveSelectionGroupScaling({
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
    return this.activeSelectionScalingController.commitGroupScaling({
      group,
      scaleX,
      scaleY,
      transform
    })
  }

  /**
   * Возвращает текущие scale-значения drag-сессии и отсекает случайные изменения по неактивной оси.
   */
  private _resolveCurrentDragScales({
    group,
    state
  }: {
    group: ShapeGroup
    state: ShapeScalingState
  }): {
    scaleX: number
    scaleY: number
  } {
    const rawScaleX = Math.abs(group.scaleX ?? state.startScaleX) || state.startScaleX
    const rawScaleY = Math.abs(group.scaleY ?? state.startScaleY) || state.startScaleY

    return {
      scaleX: state.canScaleWidth ? rawScaleX : state.startScaleX,
      scaleY: state.canScaleHeight ? rawScaleY : state.startScaleY
    }
  }

  /**
   * Возвращает true, если указатель уже дошёл до горизонтального origin,
   * а ширину нужно зафиксировать на minimum boundary.
   */
  private _shouldClampWidthToMinimum({
    event,
    group,
    minimumWidth,
    state
  }: {
    event: ShapeModifiedEvent
    group: ShapeGroup
    minimumWidth: number
    state?: ShapeScalingState
  }): boolean {
    if (!state) return false

    const { transform } = event
    if (!transform) return false

    const { canScaleWidth } = resolveShapeScaleActionAxes({
      transform
    })
    if (!canScaleWidth) return false

    const pointerReachedOrPassedOriginX = this._hasPointerReachedScaleOrigin({
      event,
      group,
      state,
      axis: 'x'
    })
    if (!pointerReachedOrPassedOriginX) return false

    const minimumScaleX = Math.max(MIN_SIZE / state.startWidth, minimumWidth / state.startWidth)

    return state.lastAllowedScaleX > minimumScaleX + SCALE_EPSILON
  }

  /**
   * Возвращает true, если указатель уже дошёл до vertical origin,
   * а высоту нужно зафиксировать на minimum boundary.
   */
  private _shouldClampHeightToMinimum({
    event,
    group,
    minimumHeight,
    state
  }: {
    event: ShapeModifiedEvent
    group: ShapeGroup
    minimumHeight: number
    state?: ShapeScalingState
  }): boolean {
    if (!state) return false

    const { transform } = event
    if (!transform) return false

    const { canScaleHeight } = resolveShapeScaleActionAxes({
      transform
    })
    if (!canScaleHeight) return false

    const pointerReachedOrPassedOriginY = this._hasPointerReachedScaleOrigin({
      event,
      group,
      state,
      axis: 'y'
    })
    if (!pointerReachedOrPassedOriginY) return false

    const minimumScaleY = Math.max(MIN_SIZE / state.startHeight, minimumHeight / state.startHeight)

    return state.lastAllowedScaleY > minimumScaleY + SCALE_EPSILON
  }

  /**
   * Возвращает true, если pointer уже дошёл до origin активного scale-transform по переданной оси.
   */
  private _hasPointerReachedScaleOrigin({
    event,
    group,
    state,
    axis
  }: {
    event: ShapeModifiedEvent
    group: ShapeGroup
    state?: ShapeScalingState
    axis: 'x' | 'y'
  }): boolean {
    const { transform } = event
    if (!transform) return false

    const transformWithSign = transform as Transform & {
      signX?: number
      signY?: number
    }
    const storedDirection = axis === 'x'
      ? state?.scaleDirectionX ?? null
      : state?.scaleDirectionY ?? null
    const resolvedTransformSign = this._resolveScaleDirection({
      value: axis === 'x'
        ? transformWithSign.signX
        : transformWithSign.signY
    })
    const sign = resolvedTransformSign ?? storedDirection
    if (sign === null) return false

    const localPoint = resolveScaleLocalPointerForTransform({
      event: event.e,
      target: group,
      transform,
      canvas: this.canvas
    })
    if (!localPoint) return false

    const pointCoordinate = axis === 'x'
      ? localPoint.x
      : localPoint.y

    return (pointCoordinate * sign) <= 0
  }

  /**
   * Один раз за drag фиксирует направление shrink по каждой оси.
   * Сначала использует Fabric signX/signY, а если их нет, падает назад на локальную pointer-точку.
   */
  private _storeScaleDirectionsForCurrentTransform({
    group,
    state,
    event,
    transform
  }: {
    group: ShapeGroup
    state: ShapeScalingState
    event?: ShapeScalingPointerEvent
    transform?: Transform | null
  }): void {
    if (!transform) return

    const {
      canScaleHeight,
      canScaleWidth,
      isCornerScaleAction
    } = resolveShapeScaleActionAxes({
      transform
    })
    if (!isCornerScaleAction) return

    const hasResolvedScaleDirectionX = !canScaleWidth || state.scaleDirectionX !== null
    const hasResolvedScaleDirectionY = !canScaleHeight || state.scaleDirectionY !== null

    if (hasResolvedScaleDirectionX && hasResolvedScaleDirectionY) return

    const transformWithSign = transform as Transform & {
      signX?: number
      signY?: number
    }

    if (canScaleWidth && state.scaleDirectionX === null) {
      state.scaleDirectionX = this._resolveScaleDirection({
        value: transformWithSign.signX
      })
    }

    if (canScaleHeight && state.scaleDirectionY === null) {
      state.scaleDirectionY = this._resolveScaleDirection({
        value: transformWithSign.signY
      })
    }

    const hasStoredScaleDirectionX = !canScaleWidth || state.scaleDirectionX !== null
    const hasStoredScaleDirectionY = !canScaleHeight || state.scaleDirectionY !== null

    if (hasStoredScaleDirectionX && hasStoredScaleDirectionY) return

    const localPoint = resolveScaleLocalPointerForTransform({
      event,
      target: group,
      transform,
      canvas: this.canvas
    })
    if (!localPoint) return

    if (canScaleWidth && state.scaleDirectionX === null) {
      state.scaleDirectionX = this._resolveScaleDirection({
        value: localPoint.x
      })
    }

    if (canScaleHeight && state.scaleDirectionY === null) {
      state.scaleDirectionY = this._resolveScaleDirection({
        value: localPoint.y
      })
    }
  }

  /**
   * Нормализует sign-значение в осмысленное направление скейлинга.
   */
  private _resolveScaleDirection({
    value
  }: {
    value: unknown
  }): ShapeScaleDirection | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return null

    return value > 0 ? 1 : -1
  }

  /**
   * Очищает состояние масштабирования для переданной shape-группы.
   */
  public clearState({ group }: { group: ShapeGroup }): void {
    this.scalingState.delete(group)
  }

  /**
   * Возвращает scale ActiveSelection, который был реально применён в live-preview.
   */
  public resolveActiveSelectionCommittedScale({
    selection
  }: {
    selection: ActiveSelection
  }): ActiveSelectionAppliedScale {
    return this.activeSelectionScalingController.resolveCommittedScale({
      selection
    })
  }

  /**
   * Очищает состояние масштабирования для переданного ActiveSelection.
   */
  public clearActiveSelectionState({ selection }: { selection: ActiveSelection }): void {
    this.activeSelectionScalingController.clearState({
      selection
    })
  }

  /**
   * Возвращает группу в сохраненную anchor-позицию для текущего drag.
   */
  private _restoreScalingAnchorPosition({
    group,
    state
  }: {
    group: ShapeGroup
    state: ShapeScalingState
  }): void {
    const {
      scalingAnchorX,
      scalingAnchorY,
      scalingAnchorOriginX,
      scalingAnchorOriginY
    } = state

    if (
      scalingAnchorX === null
      || scalingAnchorY === null
      || scalingAnchorOriginX === null
      || scalingAnchorOriginY === null
    ) {
      group.setCoords()
      return
    }

    group.setPositionByOrigin(
      new Point(scalingAnchorX, scalingAnchorY),
      scalingAnchorOriginX,
      scalingAnchorOriginY
    )
    group.setCoords()
  }

  /**
   * Восстанавливает стабильное состояние объекта, когда масштабирование не привело к изменению ручных размеров,
   * сохраняя текущий laid-out размер shape по тому же layout-контракту, что и финальный commit-path scaling.
   */
  private _restoreShapeStateWithoutResize({
    group,
    shape,
    text,
    state,
    startWidth,
    startHeight,
    alignH,
    alignV,
    userPadding
  }: {
    group: ShapeGroup
    shape: ShapeNode
    text: ShapeTextNode
    state: ShapeScalingState
    startWidth: number
    startHeight: number
    alignH: ShapeGroup['shapeAlignHorizontal']
    alignV: ShapeGroup['shapeAlignVertical']
    userPadding: ShapePadding
  }): void {
    const layoutWidth = Math.max(
      MIN_SIZE,
      group.shapeBaseWidth ?? group.width ?? startWidth
    )
    const layoutHeight = Math.max(
      MIN_SIZE,
      group.shapeBaseHeight ?? group.height ?? startHeight
    )
    const internalShapeTextInset = resolveShapeScalingInternalTextInset({
      group,
      width: layoutWidth,
      height: layoutHeight
    })
    const horizontalAlign = alignH ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const verticalAlign = alignV ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const resolveInternalShapeTextInsetForSize = ({ width, height }: {
      width: number
      height: number
    }) => resolveShapeScalingInternalTextInset({
      group,
      width,
      height
    })

    if (!state.canScaleWidth && state.canScaleHeight) {
      applyFixedWidthShapeTextLayout({
        group,
        shape,
        text,
        width: layoutWidth,
        height: layoutHeight,
        alignH: horizontalAlign,
        alignV: verticalAlign,
        padding: userPadding,
        internalShapeTextInset,
        resolveInternalShapeTextInset: resolveInternalShapeTextInsetForSize
      })
    } else {
      applyShapeTextLayout({
        group,
        shape,
        text,
        width: layoutWidth,
        height: layoutHeight,
        alignH: horizontalAlign,
        alignV: verticalAlign,
        padding: userPadding,
        internalShapeTextInset,
        resolveInternalShapeTextInset: resolveInternalShapeTextInsetForSize
      })
    }

    group.set({
      left: state.lastAllowedLeft,
      top: state.lastAllowedTop,
      flipX: state.lastAllowedFlipX,
      flipY: state.lastAllowedFlipY,
      scaleX: 1,
      scaleY: 1
    })

    this._restoreScalingAnchorPosition({
      group,
      state
    })
  }
}
