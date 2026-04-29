import {
  ActiveSelection,
  Canvas,
  FabricObject,
  Point,
  Transform
} from 'fabric'
import {
  applyShapeTextLayout,
  resolveShapeTextFixedWidthLayout,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText
} from '../layout/shape-layout'
import type {
  ResolvedShapeTextLayout
} from '../layout/shape-layout'
import {
  normalizeShapeUserPadding,
  resolveShapeTextContentInset
} from '../layout/shape-padding'
import { resizeShapeNode } from '../shape-factory'
import {
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapePadding,
  ShapeScalingState,
  ShapeNode,
  ShapeTextNode,
  ShapeVerticalAlign
} from '../types'
import {
  getShapeNodes,
  isShapeGroup
} from '../shape-utils'
import {
  getShapePreset,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset
} from '../shape-presets'
import {
  isShapeTransformCornerChanged,
  isShapeTransformOriginChanged,
  resolveShapeLocalPointerForTransform,
  resolveShapeScaleActionAxes,
  resolveShapeScalingAnchorPoint,
  resolveShapeTransformOriginalNumber,
  resolveShapeTransformOriginXValue,
  resolveShapeTransformOriginYValue
} from './shape-scaling-transform'
import { applyShapeScalingPreviewLayout } from './shape-scaling-preview'

const MIN_SIZE = 1

const SCALE_EPSILON = 0.0001
const SIZE_EPSILON = 0.5

type ShapeScalingPointerEvent = Event | MouseEvent | PointerEvent | TouchEvent

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
  previewWidth: number
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

type ShapePreviewDimensions = {
  previewWidth: number
  previewHeight: number
}

type ShapePreviewLayout = ResolvedShapeTextLayout

type ShapeScalingStartDimensions = {
  startWidth: number
  startHeight: number
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
}

type ShapeScalingManualBaseDimensions = {
  width: number
  height: number
}

type ShapeScalingCommitDimensions = {
  width: number
  height: number
  hasWidthChange: boolean
  hasDimensionChange: boolean
}

type ShapeScalingLayoutCommit = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode
  width: number
  height: number
  alignH: ShapeHorizontalAlign
  alignV: ShapeVerticalAlign
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
  hasWidthChange: boolean
}

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

  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
    this.scalingState = new WeakMap()
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
      this._applyActiveSelectionScalingPreview({
        selection: target,
        transform
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

    const constraintPadding = ShapeScalingController._resolveScalingConstraintPadding({ group })
    const state = this._ensureScalingState({
      group,
      text,
      constraintPadding,
      transform
    })
    const { isCornerScaleAction } = resolveShapeScaleActionAxes({
      transform
    })
    const isShiftPressed = Boolean(event.e && 'shiftKey' in event.e && event.e.shiftKey)
    state.isProportionalScaling = isCornerScaleAction && isShiftPressed
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
    const previewLayout = this._resolvePreviewLayout({
      group,
      text,
      state,
      appliedScaleX: scalingDecision.appliedScaleX,
      appliedScaleY: scalingDecision.appliedScaleY,
      minimumHeight: scalingDecision.previewHeight
    })
    const currentScaleX = Math.abs(group.scaleX ?? 1) || 1
    const currentScaleY = Math.abs(group.scaleY ?? 1) || 1
    const shouldApplyResolvedTransform = scalingDecision.shouldHandleAsNoop
      || scalingDecision.shouldRestoreLastAllowedTransform
      || Math.abs(scalingDecision.appliedScaleX - currentScaleX) > SCALE_EPSILON
      || Math.abs(scalingDecision.appliedScaleY - currentScaleY) > SCALE_EPSILON

    if (shouldApplyResolvedTransform) {
      this._applyResolvedScalingState({
        group,
        state,
        shouldHandleAsNoop: scalingDecision.shouldHandleAsNoop,
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
        scaleX: group.scaleX ?? 1,
        scaleY: group.scaleY ?? 1,
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
    const scaleX = Math.abs(scaleXRaw) || 1
    const scaleY = Math.abs(scaleYRaw) || 1
    const hasNegativeScale = scaleXRaw < 0 || scaleYRaw < 0
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
      transform,
      scaleX,
      scaleY
    })

    // После решения о блокировке считаем именно те размеры preview, которые реально будут применены в этом кадре drag.
    const currentScaleX = Math.abs(group.scaleX ?? 1) || 1
    const currentScaleY = Math.abs(group.scaleY ?? 1) || 1
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

    const shouldReuseResolvedMinimumHeight = !constraintState.shouldHandleAsNoop
      && !constraintState.shouldRestoreLastAllowedTransform
      && constraintState.clampedScaleX === null

    const previewDimensions = this._resolvePreviewDimensions({
      group,
      text,
      constraintPadding,
      startDimensions: state,
      appliedScaleX,
      appliedScaleY,
      minimumHeight: shouldReuseResolvedMinimumHeight ? constraintState.resolvedMinimumHeight : null
    })

    return {
      appliedScaleX,
      appliedScaleY,
      previewWidth: previewDimensions.previewWidth,
      previewHeight: previewDimensions.previewHeight,
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
    transform,
    scaleX,
    scaleY
  }: {
    group: ShapeGroup
    text: ShapeTextNode
    constraintPadding: ShapePadding
    state: ShapeScalingState
    transform?: Transform | null
    scaleX: number
    scaleY: number
  }): ShapeScalingConstraintState {
    const {
      startHeight,
      startWidth,
      cannotScaleDownAtStart,
      crossedOppositeCorner,
      isProportionalScaling,
      lastAllowedScaleX,
      lastAllowedScaleY,
      startScaleY
    } = state

    const attemptedWidth = Math.max(MIN_SIZE, startWidth * scaleX)
    const attemptedHeight = Math.max(MIN_SIZE, startHeight * scaleY)
    const isShrinkingX = scaleX < lastAllowedScaleX - SCALE_EPSILON
    const isShrinkingY = scaleY < lastAllowedScaleY - SCALE_EPSILON
    const isBelowStartScaleY = scaleY < startScaleY - SCALE_EPSILON

    const {
      canScaleHeight,
      canScaleWidth,
      isVerticalOnlyScale
    } = resolveShapeScaleActionAxes({
      transform
    })

    const minimumWidth = canScaleWidth && isShrinkingX
      ? resolveMinimumShapeWidthForText({
        text,
        padding: constraintPadding,
        resolvePaddingForWidth: ({ width }) => ShapeScalingController._resolveScalingConstraintPadding({
          group,
          width,
          height: attemptedHeight
        })
      })
      : null
    const minimumHeight = canScaleHeight && isShrinkingY
      ? this._resolveMinimumTextFitHeight({
        group,
        text,
        width: attemptedWidth,
        padding: constraintPadding
      })
      : null

    const shouldHandleAsNoop = isVerticalOnlyScale
      && cannotScaleDownAtStart
      && isBelowStartScaleY
    const hasMinimumWidthViolation = minimumWidth !== null
      && attemptedWidth < minimumWidth + SCALE_EPSILON
    const hasMinimumHeightViolation = minimumHeight !== null
      && attemptedHeight < minimumHeight + SCALE_EPSILON
    const hasMinimumConstraintViolation = hasMinimumWidthViolation
      || hasMinimumHeightViolation
    const shouldRestoreLastAllowedTransform = crossedOppositeCorner
      || (isProportionalScaling && hasMinimumConstraintViolation)

    let clampedScaleX: number | null = null
    if (!isProportionalScaling && minimumWidth !== null && attemptedWidth < minimumWidth + SCALE_EPSILON) {
      clampedScaleX = Math.max(MIN_SIZE / startWidth, minimumWidth / startWidth)
    }

    let clampedScaleY: number | null = null
    if (!isProportionalScaling && minimumHeight !== null && attemptedHeight < minimumHeight + SCALE_EPSILON) {
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
   * Возвращает preview-размеры shape для текущего live-scale с учетом переноса текста по строкам.
   */
  private _resolvePreviewDimensions({
    group,
    text,
    constraintPadding,
    startDimensions,
    appliedScaleX,
    appliedScaleY,
    minimumHeight
  }: {
    group: ShapeGroup
    text: ShapeTextNode
    constraintPadding: ShapePadding
    startDimensions: ShapeScalingStartDimensions
    appliedScaleX: number
    appliedScaleY: number
    minimumHeight?: number | null
  }): ShapePreviewDimensions {
    const previewWidth = startDimensions.canScaleWidth
      ? Math.max(MIN_SIZE, startDimensions.startWidth * appliedScaleX)
      : startDimensions.startWidth
    const scaledPreviewHeight = startDimensions.canScaleHeight
      ? Math.max(MIN_SIZE, startDimensions.startHeight * appliedScaleY)
      : startDimensions.startManualBaseHeight
    const resolvedMinimumHeight = minimumHeight ?? resolveRequiredShapeHeightForText({
      text,
      width: previewWidth,
      height: scaledPreviewHeight,
      padding: constraintPadding,
      resolvePaddingForSize: ({ width, height }) => ShapeScalingController._resolveScalingConstraintPadding({
        group,
        width,
        height
      })
    })
    const previewHeight = Math.max(
      scaledPreviewHeight,
      resolvedMinimumHeight
    )

    return {
      previewWidth,
      previewHeight
    }
  }

  /**
   * Возвращает live-preview layout текста для уже выбранной ширины scaling.
   * Width фиксируется текущим drag, а пользовательский padding поджимается по тому же контракту, что и final layout.
   */
  private _resolvePreviewLayout({
    group,
    text,
    state,
    appliedScaleX,
    appliedScaleY,
    minimumHeight
  }: {
    group: ShapeGroup
    text: ShapeTextNode
    state: ShapeScalingState
    appliedScaleX: number
    appliedScaleY: number
    minimumHeight?: number | null
  }): ShapePreviewLayout {
    const previewWidth = state.canScaleWidth
      ? Math.max(MIN_SIZE, state.startWidth * appliedScaleX)
      : state.startWidth
    const scaledPreviewHeight = state.canScaleHeight
      ? Math.max(MIN_SIZE, state.startHeight * appliedScaleY)
      : state.startManualBaseHeight
    const initialPreviewHeight = minimumHeight === null || minimumHeight === undefined
      ? scaledPreviewHeight
      : Math.max(scaledPreviewHeight, minimumHeight)
    const expandShapeHeightToFitText = !state.canScaleHeight

    return resolveShapeTextFixedWidthLayout({
      text,
      width: previewWidth,
      height: initialPreviewHeight,
      alignV: group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
      padding: ShapeScalingController._resolveUserPadding({ group }),
      expandShapeHeightToFitText,
      resolveInternalShapeTextInset: ({ width, height }) => ShapeScalingController._resolveInternalShapeTextInset({
        group,
        width,
        height
      })
    })
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
      this._applyActiveSelectionScalingPreview({
        selection: target,
        transform
      })
      return
    }

    if (!isShapeGroup(target)) return

    const {
      canScaleHeight,
      canScaleWidth
    } = resolveShapeScaleActionAxes({
      transform
    })
    if (!canScaleWidth && !canScaleHeight) return

    const group = target
    const state = this.scalingState.get(group)
    if (!state) return
    if (state.isProportionalScaling) return

    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) return

    const constraintPadding = ShapeScalingController._resolveScalingConstraintPadding({ group })
    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const currentScaleX = Math.abs(group.scaleX ?? state.lastAllowedScaleX ?? 1) || 1
    const currentScaleY = Math.abs(group.scaleY ?? state.lastAllowedScaleY ?? 1) || 1
    const eventWithTransform = {
      ...event,
      transform
    }
    let nextScaleX = currentScaleX
    let nextScaleY = currentScaleY
    let resolvedMinimumHeight: number | null = null
    let didClampWidth = false
    let shouldApplyClamp = false

    const pointerReachedOrPassedOriginX = canScaleWidth && this._hasPointerReachedScaleOrigin({
      event: eventWithTransform,
      group,
      axis: 'x'
    })
    if (pointerReachedOrPassedOriginX) {
      const minimumWidth = resolveMinimumShapeWidthForText({
        text,
        padding: constraintPadding,
        resolvePaddingForWidth: ({ width }) => ShapeScalingController._resolveScalingConstraintPadding({
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
      axis: 'y'
    })
    if (pointerReachedOrPassedOriginY) {
      resolvedMinimumHeight = this._resolveMinimumTextFitHeight({
        group,
        text,
        width: Math.max(MIN_SIZE, state.startWidth * nextScaleX),
        padding: constraintPadding
      })
      const minimumScaleY = Math.max(MIN_SIZE / state.startHeight, resolvedMinimumHeight / state.startHeight)
      if (state.lastAllowedScaleY > minimumScaleY + SCALE_EPSILON) {
        nextScaleY = minimumScaleY
        shouldApplyClamp = true
      }
    }

    if (!shouldApplyClamp) return

    const previewDimensions = this._resolvePreviewDimensions({
      group,
      text,
      constraintPadding,
      startDimensions: state,
      appliedScaleX: nextScaleX,
      appliedScaleY: nextScaleY,
      minimumHeight: didClampWidth ? null : resolvedMinimumHeight
    })
    const previewLayout = this._resolvePreviewLayout({
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
   * Применяет shape-specific live preview для shape-групп внутри ActiveSelection,
   * чтобы текст перераскладывался по shape-layout контракту, а не скейлился пропорционально с selection.
   */
  private _applyActiveSelectionScalingPreview({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform?: Transform | null
  }): void {
    if (!transform) return

    const {
      canScaleWidth,
      canScaleHeight
    } = resolveShapeScaleActionAxes({
      transform
    })
    if (!canScaleWidth && !canScaleHeight) return

    const scaleX = Math.abs(selection.scaleX ?? 1) || 1
    const scaleY = Math.abs(selection.scaleY ?? 1) || 1
    const shapeGroups = selection.getObjects().filter((object): object is ShapeGroup => {
      return isShapeGroup(object)
    })

    if (!shapeGroups.length) return

    shapeGroups.forEach((group) => {
      const {
        shape,
        text
      } = getShapeNodes({ group })

      if (!shape || !text) return

      const constraintPadding = ShapeScalingController._resolveScalingConstraintPadding({ group })
      const state = this._ensureScalingState({
        group,
        text,
        constraintPadding,
        transform
      })
      const previewDimensions = this._resolvePreviewDimensions({
        group,
        text,
        constraintPadding,
        startDimensions: state,
        appliedScaleX: scaleX,
        appliedScaleY: scaleY
      })
      const previewLayout = this._resolvePreviewLayout({
        group,
        text,
        state,
        appliedScaleX: scaleX,
        appliedScaleY: scaleY,
        minimumHeight: previewDimensions.previewHeight
      })

      applyShapeScalingPreviewLayout({
        group,
        shape,
        text,
        layout: previewLayout,
        alignH: group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
        scaleX,
        scaleY,
        minSize: MIN_SIZE,
        scaleEpsilon: SCALE_EPSILON
      })

      group.setCoords()
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

      this._restoreGroupTransformOnly({
        group,
        shape,
        text,
        state
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

    const constraintPadding = ShapeScalingController._resolveScalingConstraintPadding({ group })
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
    const minimumWidth = resolveMinimumShapeWidthForText({
      text,
      padding: constraintPadding,
      resolvePaddingForWidth: ({ width }) => ShapeScalingController._resolveScalingConstraintPadding({
        group,
        width,
        height: Math.max(MIN_SIZE, startHeight * allowedScaleY)
      })
    })
    if (!state?.isProportionalScaling) {
      const shouldClampWidthToMinimum = this._shouldClampWidthToMinimum({
        event,
        group,
        minimumWidth,
        state
      })

      if (shouldClampWidthToMinimum) {
        allowedScaleX = Math.max(MIN_SIZE / startWidth, minimumWidth / startWidth)
      }

      const minimumHeight = this._resolveMinimumTextFitHeight({
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
    } = this._resolveScalingCommitDimensions({
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
        userPadding: ShapeScalingController._resolveUserPadding({ group })
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

    this._commitResolvedShapeScalingLayout({
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
    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) {
      this.scalingState.delete(group)
      return false
    }

    const state = this.scalingState.get(group)
    const startDimensions = state ?? this._resolveScalingStartDimensions({
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
    const constraintPadding = ShapeScalingController._resolveScalingConstraintPadding({ group })
    const {
      width,
      height,
      hasWidthChange,
      hasDimensionChange
    } = this._resolveScalingCommitDimensions({
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
      this.scalingState.delete(group)
      group.shapeScalingNoopTransform = false
      return false
    }

    this._commitResolvedShapeScalingLayout({
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

    this.scalingState.delete(group)
    group.shapeScalingNoopTransform = false

    return true
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
    axis
  }: {
    event: ShapeModifiedEvent
    group: ShapeGroup
    axis: 'x' | 'y'
  }): boolean {
    const { transform } = event
    if (!transform) return false

    const transformWithSign = transform as Transform & {
      signX?: number
      signY?: number
    }
    const sign = axis === 'x'
      ? transformWithSign.signX
      : transformWithSign.signY
    if (typeof sign !== 'number' || !Number.isFinite(sign)) return false

    const localPoint = resolveShapeLocalPointerForTransform({
      event: event.e,
      group,
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
   * Очищает состояние масштабирования для переданной shape-группы.
   */
  public clearState({ group }: { group: ShapeGroup }): void {
    this.scalingState.delete(group)
  }

  /**
   * Создает базовое состояние масштабирования для shape-группы.
   */
  private _ensureScalingState({
    group,
    text,
    constraintPadding,
    transform
  }: {
    group: ShapeGroup
    text: ShapeTextNode
    constraintPadding: ShapePadding
    transform?: Transform | null
  }): ShapeScalingState {
    let state = this.scalingState.get(group)

    if (!state) {
      const startDimensions = this._resolveScalingStartDimensions({
        group,
        transform
      })
      const originalScaleX = resolveShapeTransformOriginalNumber({
        transform,
        key: 'scaleX'
      })
      const originalScaleY = resolveShapeTransformOriginalNumber({
        transform,
        key: 'scaleY'
      })
      const originalLeft = resolveShapeTransformOriginalNumber({
        transform,
        key: 'left'
      })
      const originalTop = resolveShapeTransformOriginalNumber({
        transform,
        key: 'top'
      })
      const startScaleX = Math.abs(originalScaleX ?? group.scaleX ?? 1) || 1
      const startScaleY = Math.abs(originalScaleY ?? group.scaleY ?? 1) || 1
      const startLeft = originalLeft ?? group.left ?? 0
      const startTop = originalTop ?? group.top ?? 0
      const startTransformOriginX = resolveShapeTransformOriginXValue({
        value: transform?.original?.originX ?? transform?.originX
      })
      const startTransformOriginY = resolveShapeTransformOriginYValue({
        value: transform?.original?.originY ?? transform?.originY
      })
      const startTransformCorner = typeof transform?.corner === 'string'
        ? transform.corner
        : null
      const scalingAnchorPoint = resolveShapeScalingAnchorPoint({
        group,
        originX: startTransformOriginX,
        originY: startTransformOriginY
      })
      const minimumHeightAtStart = this._resolveMinimumTextFitHeight({
        group,
        text,
        width: startDimensions.startWidth,
        padding: constraintPadding
      })

      state = {
        startWidth: startDimensions.startWidth,
        startHeight: startDimensions.startHeight,
        startManualBaseWidth: startDimensions.startManualBaseWidth,
        startManualBaseHeight: startDimensions.startManualBaseHeight,
        canScaleWidth: startDimensions.canScaleWidth,
        canScaleHeight: startDimensions.canScaleHeight,
        cannotScaleDownAtStart: minimumHeightAtStart >= startDimensions.startHeight - SCALE_EPSILON,
        isProportionalScaling: false,
        blockedScaleAttempt: false,
        startLeft,
        startTop,
        startScaleX,
        startScaleY,
        startTransformOriginX,
        startTransformOriginY,
        startTransformCorner,
        scalingAnchorX: scalingAnchorPoint?.x ?? null,
        scalingAnchorY: scalingAnchorPoint?.y ?? null,
        scalingAnchorOriginX: startTransformOriginX,
        scalingAnchorOriginY: startTransformOriginY,
        crossedOppositeCorner: false,
        lastAllowedFlipX: Boolean(group.flipX),
        lastAllowedFlipY: Boolean(group.flipY),
        lastAllowedScaleX: startScaleX,
        lastAllowedScaleY: startScaleY,
        lastAllowedLeft: startLeft,
        lastAllowedTop: startTop
      }

      this.scalingState.set(group, state)
    }

    return state
  }

  /**
   * Возвращает минимальную высоту shape, достаточную для размещения текста при переданной ширине.
   */
  private _resolveMinimumTextFitHeight({
    group,
    text,
    width,
    padding
  }: {
    group: ShapeGroup
    text: ShapeTextNode
    width: number
    padding: ShapePadding
  }): number {
    return resolveRequiredShapeHeightForText({
      text,
      width,
      height: MIN_SIZE,
      padding,
      resolvePaddingForSize: ({ width: nextWidth, height: nextHeight }) => {
        return ShapeScalingController._resolveScalingConstraintPadding({
          group,
          width: nextWidth,
          height: nextHeight
        })
      }
    })
  }

  /**
   * Возвращает пользовательский padding текста из метаданных группы.
   */
  private static _resolveUserPadding({ group }: { group: ShapeGroup }): ShapePadding {
    return normalizeShapeUserPadding({
      padding: {
        top: group.shapePaddingTop,
        right: group.shapePaddingRight,
        bottom: group.shapePaddingBottom,
        left: group.shapePaddingLeft
      }
    })
  }

  /**
   * Возвращает полный внутренний inset текста для текущих размеров shape-группы с учетом пресета и обводки.
   */
  private static _resolveInternalShapeTextInset({
    group,
    width,
    height
  }: {
    group: ShapeGroup
    width: number
    height: number
  }): ShapePadding {
    const presetKey = group.shapePresetKey ?? ''
    const preset = presetKey
      ? getShapePreset({ presetKey })
      : null
    const presetInset = preset
      ? resolvePresetInternalShapeTextInset({
        preset,
        width,
        height
      })
      : undefined

    return resolveShapeTextContentInset({
      baseInset: presetInset,
      stroke: group.shapeStroke,
      strokeWidth: group.shapeStrokeWidth
    })
  }

  /**
   * Возвращает padding, который участвует в minimum-constraints во время scaling.
   * Пользовательские отступы здесь игнорируются и при уменьшении шейпа могут быть съедены layout'ом.
   */
  private static _resolveScalingConstraintPadding({
    group,
    width,
    height
  }: {
    group: ShapeGroup
    width?: number
    height?: number
  }): ShapePadding {
    const resolvedWidth = Math.max(
      MIN_SIZE,
      width ?? group.shapeBaseWidth ?? group.width ?? group.shapeManualBaseWidth ?? MIN_SIZE
    )
    const resolvedHeight = Math.max(
      MIN_SIZE,
      height ?? group.shapeBaseHeight ?? group.height ?? group.shapeManualBaseHeight ?? MIN_SIZE
    )

    return ShapeScalingController._resolveInternalShapeTextInset({
      group,
      width: resolvedWidth,
      height: resolvedHeight
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
   * сохраняя текущий laid-out размер shape после auto-fit текста.
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
    const internalShapeTextInset = ShapeScalingController._resolveInternalShapeTextInset({
      group,
      width: layoutWidth,
      height: layoutHeight
    })
    const horizontalAlign = alignH ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const verticalAlign = alignV ?? SHAPE_DEFAULT_VERTICAL_ALIGN

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
      resolveInternalShapeTextInset: ({ width, height }) => ShapeScalingController._resolveInternalShapeTextInset({
        group,
        width,
        height
      })
    })

    group.shapeReplaceBoxWidth = Math.max(1, group.shapeBaseWidth ?? layoutWidth)
    group.shapeReplaceBoxHeight = Math.max(1, group.shapeBaseHeight ?? layoutHeight)

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

  /**
   * Восстанавливает transform группы без пересчета layout, если масштабирование было полностью заблокировано,
   * возвращая текущий laid-out размер, а не ручную базовую высоту/ширину.
   */
  private _restoreGroupTransformOnly({
    group,
    shape,
    text,
    state
  }: {
    group: ShapeGroup
    shape: ShapeNode | null
    text: ShapeTextNode | null
    state: ShapeScalingState
  }): void {
    const layoutWidth = Math.max(
      MIN_SIZE,
      group.shapeBaseWidth ?? group.width ?? state.startWidth
    )
    const layoutHeight = Math.max(
      MIN_SIZE,
      group.shapeBaseHeight ?? group.height ?? state.startHeight
    )

    if (shape) {
      resizeShapeNode({
        shape,
        width: layoutWidth,
        height: layoutHeight,
        rounding: group.shapeRounding,
        strokeWidth: group.shapeStrokeWidth
      })
      shape.setCoords()
    }

    if (text) {
      text.set({
        scaleX: 1 / Math.max(SCALE_EPSILON, state.startScaleX),
        scaleY: 1 / Math.max(SCALE_EPSILON, state.startScaleY)
      })
      text.setCoords()
    }

    group.set({
      width: layoutWidth,
      height: layoutHeight,
      left: state.startLeft,
      top: state.startTop,
      flipX: state.lastAllowedFlipX,
      flipY: state.lastAllowedFlipY,
      scaleX: state.startScaleX,
      scaleY: state.startScaleY
    })

    this._restoreScalingAnchorPosition({
      group,
      state
    })
  }

  /**
   * Возвращает стартовые размеры drag-сессии: текущий laid-out размер shape и ручные базовые размеры.
   */
  private _resolveScalingStartDimensions({
    group,
    transform
  }: {
    group: ShapeGroup
    transform?: Transform | null
  }): ShapeScalingStartDimensions {
    const {
      canScaleWidth,
      canScaleHeight
    } = resolveShapeScaleActionAxes({
      transform
    })
    const startWidth = Math.max(
      MIN_SIZE,
      group.shapeBaseWidth ?? group.width ?? group.shapeManualBaseWidth ?? MIN_SIZE
    )
    const startHeight = Math.max(
      MIN_SIZE,
      group.shapeBaseHeight ?? group.height ?? group.shapeManualBaseHeight ?? MIN_SIZE
    )
    const startManualBaseWidth = Math.max(
      MIN_SIZE,
      group.shapeManualBaseWidth ?? startWidth
    )
    const startManualBaseHeight = Math.max(
      MIN_SIZE,
      group.shapeManualBaseHeight ?? startHeight
    )

    return {
      startWidth,
      startHeight,
      startManualBaseWidth,
      startManualBaseHeight,
      canScaleWidth,
      canScaleHeight
    }
  }

  /**
   * Возвращает, какие ручные базовые размеры нужно сохранить после завершения скейлинга.
   */
  private _resolveNextManualBaseDimensionsAfterScaling({
    startManualBaseWidth,
    startManualBaseHeight,
    canScaleWidth,
    canScaleHeight,
    finalWidth,
    finalHeight
  }: {
    startManualBaseWidth: number
    startManualBaseHeight: number
    canScaleWidth: boolean
    canScaleHeight: boolean
    finalWidth: number
    finalHeight: number
  }): ShapeScalingManualBaseDimensions {
    let nextManualBaseWidth = startManualBaseWidth
    if (canScaleWidth) {
      nextManualBaseWidth = finalWidth
    }

    let nextManualBaseHeight = startManualBaseHeight
    if (canScaleHeight) {
      nextManualBaseHeight = finalHeight
    }

    return {
      width: nextManualBaseWidth,
      height: nextManualBaseHeight
    }
  }

  /**
   * Возвращает итоговые размеры шага фиксации с учетом осей, которые реально скейлились.
   */
  private _resolveScalingCommitDimensions({
    group,
    text,
    constraintPadding,
    startDimensions,
    scaleX,
    scaleY
  }: {
    group: ShapeGroup
    text: ShapeTextNode
    constraintPadding: ShapePadding
    startDimensions: ShapeScalingStartDimensions
    scaleX: number
    scaleY: number
  }): ShapeScalingCommitDimensions {
    const {
      previewWidth,
      previewHeight
    } = this._resolvePreviewDimensions({
      group,
      text,
      constraintPadding,
      startDimensions,
      appliedScaleX: scaleX,
      appliedScaleY: scaleY
    })
    const {
      startWidth,
      startHeight
    } = startDimensions
    const hasWidthChange = Math.abs(previewWidth - startWidth) > SIZE_EPSILON
    const hasHeightChange = Math.abs(previewHeight - startHeight) > SIZE_EPSILON

    return {
      width: previewWidth,
      height: previewHeight,
      hasWidthChange,
      hasDimensionChange: hasWidthChange || hasHeightChange
    }
  }

  /**
   * Применяет уже выбранные resize-размеры к layout шейпа и сбрасывает временный scale.
   */
  private _commitResolvedShapeScalingLayout({
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
  }: ShapeScalingLayoutCommit): void {
    const nextManualBaseDimensions = this._resolveNextManualBaseDimensionsAfterScaling({
      startManualBaseWidth,
      startManualBaseHeight,
      canScaleWidth,
      canScaleHeight,
      finalWidth: width,
      finalHeight: height
    })

    group.shapeManualBaseWidth = nextManualBaseDimensions.width
    group.shapeManualBaseHeight = nextManualBaseDimensions.height

    if (canScaleWidth && hasWidthChange) {
      // Ручной resize по ширине фиксирует новую ширину как пользовательский контракт.
      group.shapeTextAutoExpand = false
    }

    const userPadding = ShapeScalingController._resolveUserPadding({ group })
    const internalShapeTextInset = ShapeScalingController._resolveInternalShapeTextInset({
      group,
      width,
      height
    })
    const expandShapeHeightToFitText = !canScaleHeight

    applyShapeTextLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      padding: userPadding,
      shapeTextAutoExpandEnabled: group.shapeTextAutoExpand !== false,
      internalShapeTextInset,
      expandShapeHeightToFitText,
      resolveInternalShapeTextInset: ({ width: nextWidth, height: nextHeight }) => {
        return ShapeScalingController._resolveInternalShapeTextInset({
          group,
          width: nextWidth,
          height: nextHeight
        })
      }
    })

    group.shapeReplaceBoxWidth = Math.max(1, group.shapeBaseWidth ?? width)
    group.shapeReplaceBoxHeight = Math.max(1, group.shapeBaseHeight ?? height)

    text.set({
      scaleX: 1,
      scaleY: 1
    })

    group.set({
      scaleX: 1,
      scaleY: 1
    })

    group.setCoords()
    text.setCoords()
    shape.setCoords()
  }
}
