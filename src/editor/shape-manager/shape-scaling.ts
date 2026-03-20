import {
  Canvas,
  FabricObject,
  Point,
  Transform
} from 'fabric'
import {
  applyShapeTextLayout,
  resolveMinimumShapeWidthForText,
  resolveRequiredShapeHeightForText,
  resolveShapeTextFrameLayout
} from './shape-layout'
import { resizeShapeNode } from './shape-factory'
import {
  ShapeGroup,
  ShapePadding,
  ShapeScalingState,
  ShapeTransformOriginX,
  ShapeTransformOriginY
} from './types'
import {
  getShapeNodes,
  isShapeGroup
} from './shape-utils'
import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from './shape-presets'

const MIN_SIZE = 1

const SCALE_EPSILON = 0.0001
const SIZE_EPSILON = 0.5

type ShapeScalingEvent = {
  target?: FabricObject | null
  transform?: Transform | null
}

type ShapeModifiedEvent = {
  target?: FabricObject | null
  e?: Event | MouseEvent | PointerEvent | TouchEvent
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

type ShapeScalingBlockState = {
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

    const padding = ShapeScalingController._resolvePadding({ group })
    const state = this._ensureScalingState({
      group,
      text,
      padding,
      transform
    })
    const currentLeft = group.left ?? 0
    const currentTop = group.top ?? 0
    const currentFlipX = Boolean(group.flipX)
    const currentFlipY = Boolean(group.flipY)
    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const alignV = group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const scalingDecision = this._resolveScalingDecision({
      group,
      text,
      padding,
      state,
      transform
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

    this._applyLivePreviewLayout({
      group,
      shape,
      text,
      width: scalingDecision.previewWidth,
      height: scalingDecision.previewHeight,
      padding,
      alignH,
      alignV,
      scaleX: scalingDecision.appliedScaleX,
      scaleY: scalingDecision.appliedScaleY
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
    padding,
    state,
    transform
  }: {
    group: ShapeGroup
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    padding: ShapePadding
    state: ShapeScalingState
    transform?: Transform | null
  }): ShapeScalingDecision {
    // Сначала нормализуем текущий transform и фиксируем состояние, после которого drag больше нельзя продолжать в обратную сторону.
    const scaleXRaw = group.scaleX ?? 1
    const scaleYRaw = group.scaleY ?? 1
    const scaleX = Math.abs(scaleXRaw) || 1
    const scaleY = Math.abs(scaleYRaw) || 1
    const hasNegativeScale = scaleXRaw < 0 || scaleYRaw < 0
    const hasTransformOriginChange = ShapeScalingController._isTransformOriginChanged({
      state,
      transform
    })
    const hasTransformCornerChange = ShapeScalingController._isTransformCornerChanged({
      state,
      transform
    })

    if (hasNegativeScale || hasTransformOriginChange || hasTransformCornerChange) {
      state.crossedOppositeCorner = true
    }

    // Дальше определяем, можно ли применять этот шаг scaling, или нужно откатиться к последнему допустимому состоянию.
    const blockState = this._resolveScalingBlockState({
      text,
      padding,
      state,
      transform,
      scaleX,
      scaleY
    })

    // После решения о блокировке считаем именно те размеры preview, которые реально будут применены в этом кадре drag.
    const currentScaleX = Math.abs(group.scaleX ?? 1) || 1
    const currentScaleY = Math.abs(group.scaleY ?? 1) || 1
    let appliedScaleX = blockState.clampedScaleX ?? currentScaleX
    let appliedScaleY = blockState.clampedScaleY ?? currentScaleY

    if (blockState.shouldRestoreLastAllowedTransform) {
      appliedScaleX = state.lastAllowedScaleX
      appliedScaleY = state.lastAllowedScaleY
    }

    if (blockState.shouldHandleAsNoop) {
      appliedScaleX = state.startScaleX
      appliedScaleY = state.startScaleY
    }

    const shouldReuseResolvedMinimumHeight = !blockState.shouldHandleAsNoop
      && !blockState.shouldRestoreLastAllowedTransform
      && blockState.clampedScaleX === null

    const previewDimensions = this._resolvePreviewDimensions({
      text,
      padding,
      state,
      appliedScaleX,
      appliedScaleY,
      minimumHeight: shouldReuseResolvedMinimumHeight ? blockState.resolvedMinimumHeight : null
    })

    return {
      appliedScaleX,
      appliedScaleY,
      previewWidth: previewDimensions.previewWidth,
      previewHeight: previewDimensions.previewHeight,
      shouldHandleAsNoop: blockState.shouldHandleAsNoop,
      shouldRestoreLastAllowedTransform: blockState.shouldRestoreLastAllowedTransform
    }
  }

  /**
   * Определяет, можно ли продолжать текущий шаг scaling без выхода за доменные ограничения shape.
   */
  private _resolveScalingBlockState({
    text,
    padding,
    state,
    transform,
    scaleX,
    scaleY
  }: {
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    padding: ShapePadding
    state: ShapeScalingState
    transform?: Transform | null
    scaleX: number
    scaleY: number
  }): ShapeScalingBlockState {
    const {
      baseHeight,
      baseWidth,
      cannotScaleDownAtStart,
      crossedOppositeCorner,
      lastAllowedScaleX,
      lastAllowedScaleY,
      startScaleY
    } = state

    const attemptedWidth = Math.max(MIN_SIZE, baseWidth * scaleX)
    const attemptedHeight = Math.max(MIN_SIZE, baseHeight * scaleY)
    const isShrinkingX = scaleX < lastAllowedScaleX - SCALE_EPSILON
    const isShrinkingY = scaleY < lastAllowedScaleY - SCALE_EPSILON
    const isBelowStartScaleY = scaleY < startScaleY - SCALE_EPSILON

    const {
      canScaleHeight,
      canScaleWidth,
      isVerticalOnlyScale
    } = ShapeScalingController._resolveScaleActionAxes({
      transform
    })

    const minimumWidth = canScaleWidth && isShrinkingX
      ? resolveMinimumShapeWidthForText({
        text,
        padding
      })
      : null
    const minimumHeight = canScaleHeight && isShrinkingY
      ? this._resolveMinimumHeightForVerticalScaling({
        text,
        width: attemptedWidth,
        padding
      })
      : null

    const shouldHandleAsNoop = isVerticalOnlyScale
      && cannotScaleDownAtStart
      && isBelowStartScaleY
    const shouldRestoreLastAllowedTransform = crossedOppositeCorner

    let clampedScaleX: number | null = null
    if (minimumWidth !== null && attemptedWidth < minimumWidth + SCALE_EPSILON) {
      clampedScaleX = Math.max(MIN_SIZE / baseWidth, minimumWidth / baseWidth)
    }

    let clampedScaleY: number | null = null
    if (minimumHeight !== null && attemptedHeight < minimumHeight + SCALE_EPSILON) {
      clampedScaleY = Math.max(MIN_SIZE / baseHeight, minimumHeight / baseHeight)
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
    text,
    padding,
    state,
    appliedScaleX,
    appliedScaleY,
    minimumHeight
  }: {
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    padding: ShapePadding
    state: ShapeScalingState
    appliedScaleX: number
    appliedScaleY: number
    minimumHeight?: number | null
  }): ShapePreviewDimensions {
    const previewWidth = Math.max(MIN_SIZE, state.baseWidth * appliedScaleX)
    const scaledPreviewHeight = Math.max(MIN_SIZE, state.baseHeight * appliedScaleY)
    const resolvedMinimumHeight = minimumHeight ?? resolveRequiredShapeHeightForText({
      text,
      width: previewWidth,
      height: scaledPreviewHeight,
      padding
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
    if (!isShapeGroup(target)) return

    const {
      canScaleHeight,
      canScaleWidth
    } = ShapeScalingController._resolveScaleActionAxes({
      transform
    })
    if (!canScaleWidth && !canScaleHeight) return

    const group = target
    const state = this.scalingState.get(group)
    if (!state) return

    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) return

    const padding = ShapeScalingController._resolvePadding({ group })
    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const alignV = group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN
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
        padding
      })
      const minimumScaleX = Math.max(MIN_SIZE / state.baseWidth, minimumWidth / state.baseWidth)
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
      resolvedMinimumHeight = this._resolveMinimumHeightForVerticalScaling({
        text,
        width: Math.max(MIN_SIZE, state.baseWidth * nextScaleX),
        padding
      })
      const minimumScaleY = Math.max(MIN_SIZE / state.baseHeight, resolvedMinimumHeight / state.baseHeight)
      if (state.lastAllowedScaleY > minimumScaleY + SCALE_EPSILON) {
        nextScaleY = minimumScaleY
        shouldApplyClamp = true
      }
    }

    if (!shouldApplyClamp) return

    const previewDimensions = this._resolvePreviewDimensions({
      text,
      padding,
      state,
      appliedScaleX: nextScaleX,
      appliedScaleY: nextScaleY,
      minimumHeight: didClampWidth ? null : resolvedMinimumHeight
    })

    this._applyResolvedScalingState({
      group,
      state,
      shouldHandleAsNoop: false,
      scaleX: nextScaleX,
      scaleY: nextScaleY
    })

    this._applyLivePreviewLayout({
      group,
      shape,
      text,
      width: previewDimensions.previewWidth,
      height: previewDimensions.previewHeight,
      padding,
      alignH,
      alignV,
      scaleX: nextScaleX,
      scaleY: nextScaleY
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

    const baseWidth = state?.baseWidth ?? Math.max(
      MIN_SIZE,
      group.shapeManualBaseWidth ?? group.shapeBaseWidth ?? group.width ?? MIN_SIZE
    )
    const baseHeight = state?.baseHeight ?? Math.max(
      MIN_SIZE,
      group.shapeManualBaseHeight ?? group.shapeBaseHeight ?? group.height ?? MIN_SIZE
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

    const padding = ShapeScalingController._resolvePadding({ group })
    const minimumWidth = resolveMinimumShapeWidthForText({
      text,
      padding
    })

    let allowedScaleX = state?.lastAllowedScaleX ?? scaleX
    let allowedScaleY = state?.lastAllowedScaleY ?? scaleY
    const shouldClampWidthToMinimum = this._shouldClampWidthToMinimum({
      event,
      group,
      minimumWidth,
      state
    })

    if (shouldClampWidthToMinimum) {
      allowedScaleX = Math.max(MIN_SIZE / baseWidth, minimumWidth / baseWidth)
    }

    const minimumHeight = this._resolveMinimumHeightForVerticalScaling({
      text,
      width: Math.max(MIN_SIZE, baseWidth * allowedScaleX),
      padding
    })
    const shouldClampHeightToMinimum = this._shouldClampHeightToMinimum({
      event,
      group,
      minimumHeight,
      state
    })

    if (shouldClampHeightToMinimum) {
      allowedScaleY = Math.max(MIN_SIZE / baseHeight, minimumHeight / baseHeight)
    }

    const widthByAllowedScale = Math.max(MIN_SIZE, baseWidth * allowedScaleX)
    const heightByAllowedScale = Math.max(MIN_SIZE, baseHeight * allowedScaleY)
    const hasWidthChange = Math.abs(widthByAllowedScale - baseWidth) > SIZE_EPSILON
    const hasHeightChange = Math.abs(heightByAllowedScale - baseHeight) > SIZE_EPSILON
    const hasDimensionChange = hasWidthChange || hasHeightChange

    const width = widthByAllowedScale
    const height = heightByAllowedScale

    if (!hasDimensionChange && state) {
      this._restoreShapeStateWithoutResize({
        group,
        shape,
        text,
        state,
        baseWidth,
        baseHeight,
        alignH,
        alignV,
        padding
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

    group.shapeManualBaseWidth = width
    group.shapeManualBaseHeight = height

    const baseRounding = state?.baseRounding ?? Math.max(0, group.shapeRounding ?? 0)
    const roundingScale = Math.min(allowedScaleX, allowedScaleY)
    const scaledRounding = Math.max(0, baseRounding * roundingScale)
    group.shapeRounding = scaledRounding

    applyShapeTextLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      padding
    })

    text.set({
      scaleX: 1,
      scaleY: 1
    })

    group.set({
      scaleX: 1,
      scaleY: 1
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

    const { canScaleWidth } = ShapeScalingController._resolveScaleActionAxes({
      transform
    })
    if (!canScaleWidth) return false

    const pointerReachedOrPassedOriginX = this._hasPointerReachedScaleOrigin({
      event,
      group,
      axis: 'x'
    })
    if (!pointerReachedOrPassedOriginX) return false

    const minimumScaleX = Math.max(MIN_SIZE / state.baseWidth, minimumWidth / state.baseWidth)

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

    const { canScaleHeight } = ShapeScalingController._resolveScaleActionAxes({
      transform
    })
    if (!canScaleHeight) return false

    const pointerReachedOrPassedOriginY = this._hasPointerReachedScaleOrigin({
      event,
      group,
      axis: 'y'
    })
    if (!pointerReachedOrPassedOriginY) return false

    const minimumScaleY = Math.max(MIN_SIZE / state.baseHeight, minimumHeight / state.baseHeight)

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

    const localPoint = this._resolveLocalPointerForTransform({
      event,
      group,
      transform
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
    padding,
    transform
  }: {
    group: ShapeGroup
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    padding: ShapePadding
    transform?: Transform | null
  }): ShapeScalingState {
    let state = this.scalingState.get(group)

    if (!state) {
      const baseWidth = Math.max(
        MIN_SIZE,
        group.shapeManualBaseWidth ?? group.shapeBaseWidth ?? group.width ?? MIN_SIZE
      )
      const baseHeight = Math.max(
        MIN_SIZE,
        group.shapeManualBaseHeight ?? group.shapeBaseHeight ?? group.height ?? MIN_SIZE
      )
      const originalScaleX = ShapeScalingController._resolveTransformOriginalNumber({
        transform,
        key: 'scaleX'
      })
      const originalScaleY = ShapeScalingController._resolveTransformOriginalNumber({
        transform,
        key: 'scaleY'
      })
      const originalLeft = ShapeScalingController._resolveTransformOriginalNumber({
        transform,
        key: 'left'
      })
      const originalTop = ShapeScalingController._resolveTransformOriginalNumber({
        transform,
        key: 'top'
      })
      const startScaleX = Math.abs(originalScaleX ?? group.scaleX ?? 1) || 1
      const startScaleY = Math.abs(originalScaleY ?? group.scaleY ?? 1) || 1
      const startLeft = originalLeft ?? group.left ?? 0
      const startTop = originalTop ?? group.top ?? 0
      const startTransformOriginX = ShapeScalingController._resolveTransformOriginXValue({
        value: transform?.original?.originX ?? transform?.originX
      })
      const startTransformOriginY = ShapeScalingController._resolveTransformOriginYValue({
        value: transform?.original?.originY ?? transform?.originY
      })
      const startTransformCorner = typeof transform?.corner === 'string'
        ? transform.corner
        : null
      const scalingAnchorPoint = ShapeScalingController._resolveScalingAnchorPoint({
        group,
        originX: startTransformOriginX,
        originY: startTransformOriginY
      })
      const minimumHeightAtStart = this._resolveMinimumHeightForVerticalScaling({
        text,
        width: baseWidth,
        padding
      })

      state = {
        baseWidth,
        baseHeight,
        baseRounding: Math.max(0, group.shapeRounding ?? 0),
        cannotScaleDownAtStart: minimumHeightAtStart >= baseHeight - SCALE_EPSILON,
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
   * Возвращает minimum height для vertical scaling без изменения layout-контракта.
   */
  private _resolveMinimumHeightForVerticalScaling({
    text,
    width,
    padding
  }: {
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    width: number
    padding: ShapePadding
  }): number {
    return resolveRequiredShapeHeightForText({
      text,
      width,
      height: MIN_SIZE,
      padding
    })
  }

  /**
   * Возвращает padding текстового фрейма из метаданных группы.
   */
  private static _resolvePadding({ group }: { group: ShapeGroup }): ShapePadding {
    return {
      top: group.shapePaddingTop ?? 0.2,
      right: group.shapePaddingRight ?? 0.2,
      bottom: group.shapePaddingBottom ?? 0.2,
      left: group.shapePaddingLeft ?? 0.2
    }
  }

  /**
   * Возвращает числовое значение из transform.original, если оно доступно.
   */
  private static _resolveTransformOriginalNumber({
    transform,
    key
  }: {
    transform?: Transform | null
    key: 'left' | 'top' | 'scaleX' | 'scaleY'
  }): number | null {
    const original = transform?.original
    if (!original || typeof original !== 'object') return null

    const value = original[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) return null

    return value
  }

  /**
   * Нормализует horizontal origin-значение transform.
   */
  private static _resolveTransformOriginXValue({
    value
  }: {
    value: unknown
  }): ShapeTransformOriginX | null {
    if (value === 'left' || value === 'center' || value === 'right') {
      return value
    }

    if (typeof value === 'number' && Number.isFinite(value)) return value

    return null
  }

  /**
   * Нормализует vertical origin-значение transform.
   */
  private static _resolveTransformOriginYValue({
    value
  }: {
    value: unknown
  }): ShapeTransformOriginY | null {
    if (value === 'top' || value === 'center' || value === 'bottom') {
      return value
    }

    if (typeof value === 'number' && Number.isFinite(value)) return value

    return null
  }

  /**
   * Возвращает, какие оси реально участвуют в текущем scale-transform.
   */
  private static _resolveScaleActionAxes({
    transform
  }: {
    transform?: Transform | null
  }): {
    canScaleWidth: boolean
    canScaleHeight: boolean
    isVerticalOnlyScale: boolean
  } {
    const action = transform?.action ?? ''
    const corner = typeof transform?.corner === 'string' ? transform.corner : ''
    const isCornerScaleAction = corner === 'tl'
      || corner === 'tr'
      || corner === 'bl'
      || corner === 'br'
    const isHorizontalScaleAction = action === 'scaleX' || corner === 'ml' || corner === 'mr'
    const isVerticalScaleAction = action === 'scaleY' || corner === 'mt' || corner === 'mb'
    const canScaleWidth = isHorizontalScaleAction || isCornerScaleAction
    const canScaleHeight = isVerticalScaleAction || isCornerScaleAction

    return {
      canScaleWidth,
      canScaleHeight,
      isVerticalOnlyScale: canScaleHeight && !canScaleWidth
    }
  }

  /**
   * Пересчитывает pointer из canvas-события в локальные координаты активного scale-transform.
   */
  private _resolveLocalPointerForTransform({
    event,
    group,
    transform
  }: {
    event: ShapeModifiedEvent
    group: ShapeGroup
    transform: Transform
  }): Point | null {
    const { e } = event
    if (!e) return null

    const canvas = group.canvas ?? this.canvas
    if (!canvas) return null

    const pointer = canvas.getScenePoint(e as MouseEvent | PointerEvent | TouchEvent)
    const centerPoint = group.getRelativeCenterPoint()
    const originPoint = group.translateToGivenOrigin(
      centerPoint,
      'center',
      'center',
      transform.originX,
      transform.originY
    )
    const angle = group.angle ?? 0
    const normalizedPointer = angle === 0
      ? pointer
      : pointer.rotate((-angle * Math.PI) / 180, centerPoint)
    const localPoint = normalizedPointer.subtract(originPoint)
    const control = group.controls[transform.corner]
    const zoom = canvas.getZoom() || 1
    const padding = (group.padding ?? 0) / zoom

    if (localPoint.x >= padding) {
      localPoint.x -= padding
    }
    if (localPoint.x <= -padding) {
      localPoint.x += padding
    }
    if (localPoint.y >= padding) {
      localPoint.y -= padding
    }
    if (localPoint.y <= -padding) {
      localPoint.y += padding
    }

    localPoint.x -= control?.offsetX ?? 0
    localPoint.y -= control?.offsetY ?? 0

    return localPoint
  }

  /**
   * Возвращает anchor-точку активного transform в координатах canvas.
   */
  private static _resolveScalingAnchorPoint({
    group,
    originX,
    originY
  }: {
    group: ShapeGroup
    originX: ShapeTransformOriginX | null
    originY: ShapeTransformOriginY | null
  }): Point | null {
    if (originX === null || originY === null) return null

    const groupWithTransformApi = group as ShapeGroup & {
      getRelativeCenterPoint?: () => Point
      translateToOriginPoint?: (
        point: Point,
        nextOriginX: ShapeTransformOriginX,
        nextOriginY: ShapeTransformOriginY
      ) => Point
    }
    const centerPoint = typeof groupWithTransformApi.getRelativeCenterPoint === 'function'
      ? groupWithTransformApi.getRelativeCenterPoint()
      : group.getCenterPoint()

    if (typeof groupWithTransformApi.translateToOriginPoint !== 'function') {
      return centerPoint
    }

    return groupWithTransformApi.translateToOriginPoint(centerPoint, originX, originY)
  }

  /**
   * Возвращает true, если transform origin изменился относительно старта текущего drag.
   */
  private static _isTransformOriginChanged({
    state,
    transform
  }: {
    state: ShapeScalingState
    transform?: Transform | null
  }): boolean {
    if (!transform) return false
    if (state.startTransformOriginX === null && state.startTransformOriginY === null) return false

    const originX = ShapeScalingController._resolveTransformOriginXValue({
      value: transform.originX
    })
    const originY = ShapeScalingController._resolveTransformOriginYValue({
      value: transform.originY
    })

    return originX !== state.startTransformOriginX || originY !== state.startTransformOriginY
  }

  /**
   * Возвращает true, если active corner изменился относительно старта текущего drag.
   */
  private static _isTransformCornerChanged({
    state,
    transform
  }: {
    state: ShapeScalingState
    transform?: Transform | null
  }): boolean {
    if (!transform) return false
    if (!state.startTransformCorner) return false

    return transform.corner !== state.startTransformCorner
  }

  /**
   * Применяет live-preview shape-композиции во время drag.
   */
  private _applyLivePreviewLayout({
    group,
    shape,
    text,
    width,
    height,
    padding,
    alignH,
    alignV,
    scaleX,
    scaleY
  }: {
    group: ShapeGroup
    shape: NonNullable<ReturnType<typeof getShapeNodes>['shape']>
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    width: number
    height: number
    padding: ShapePadding
    alignH: ShapeGroup['shapeAlignHorizontal']
    alignV: ShapeGroup['shapeAlignVertical']
    scaleX: number
    scaleY: number
  }): void {
    const safeScaleX = Math.max(SCALE_EPSILON, Math.abs(scaleX) || 1)
    const safeScaleY = Math.max(SCALE_EPSILON, Math.abs(scaleY) || 1)

    group.set({
      width: width / safeScaleX,
      height: height / safeScaleY,
      dirty: true
    })

    this._applyLiveShapeGeometry({
      group,
      shape,
      width,
      height,
      scaleX,
      scaleY
    })

    this._applyLiveTextLayout({
      text,
      width,
      height,
      padding,
      alignH,
      alignV,
      scaleX,
      scaleY
    })
  }

  /**
   * Компенсирует геометрию shape-ноды во время drag для strokeUniform.
   */
  private _applyLiveShapeGeometry({
    group,
    shape,
    width,
    height,
    scaleX,
    scaleY
  }: {
    group: ShapeGroup
    shape: NonNullable<ReturnType<typeof getShapeNodes>['shape']>
    width: number
    height: number
    scaleX: number
    scaleY: number
  }): void {
    const strokeWidth = Math.max(0, group.shapeStrokeWidth ?? 0)
    const previewShapeWidth = ShapeScalingController._resolveLiveShapeOuterSize({
      size: width,
      scale: scaleX,
      strokeWidth
    })
    const previewShapeHeight = ShapeScalingController._resolveLiveShapeOuterSize({
      size: height,
      scale: scaleY,
      strokeWidth
    })

    resizeShapeNode({
      shape,
      width: previewShapeWidth,
      height: previewShapeHeight,
      rounding: group.shapeRounding,
      strokeWidth
    })
  }

  /**
   * Возвращает локальный размер shape-ноды для live-preview с фиксированным stroke.
   */
  private static _resolveLiveShapeOuterSize({
    size,
    scale,
    strokeWidth
  }: {
    size: number
    scale: number
    strokeWidth: number
  }): number {
    const safeScale = Math.max(SCALE_EPSILON, Math.abs(scale) || 1)
    const safeStrokeWidth = Math.max(0, strokeWidth)

    if (safeStrokeWidth <= 0) return Math.max(MIN_SIZE, size / safeScale)

    return Math.max(
      MIN_SIZE,
      (size / safeScale) + safeStrokeWidth - (safeStrokeWidth / safeScale)
    )
  }

  /**
   * Применяет live-layout текста при масштабировании, чтобы перенос и выравнивание обновлялись в процессе drag.
   */
  private _applyLiveTextLayout({
    text,
    width,
    height,
    padding,
    alignH,
    alignV,
    scaleX,
    scaleY
  }: {
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    width: number
    height: number
    padding: ShapePadding
    alignH: ShapeGroup['shapeAlignHorizontal']
    alignV: ShapeGroup['shapeAlignVertical']
    scaleX: number
    scaleY: number
  }): void {
    const safeScaleX = Math.max(SCALE_EPSILON, Math.abs(scaleX) || 1)
    const safeScaleY = Math.max(SCALE_EPSILON, Math.abs(scaleY) || 1)
    const horizontalAlign = alignH ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const verticalAlign = alignV ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const {
      frame,
      splitByGrapheme,
      textTop
    } = resolveShapeTextFrameLayout({
      text,
      width,
      height,
      alignV: verticalAlign,
      padding
    })

    text.set({
      autoExpand: false,
      textAlign: horizontalAlign,
      width: frame.width,
      splitByGrapheme,
      left: frame.left / safeScaleX,
      top: textTop / safeScaleY,
      originX: 'left',
      originY: 'top',
      scaleX: 1 / safeScaleX,
      scaleY: 1 / safeScaleY
    })

    text.initDimensions()
    text.setCoords()
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
   * Восстанавливает стабильное состояние объекта, когда масштабирование не привело к изменению размеров.
   */
  private _restoreShapeStateWithoutResize({
    group,
    shape,
    text,
    state,
    baseWidth,
    baseHeight,
    alignH,
    alignV,
    padding
  }: {
    group: ShapeGroup
    shape: NonNullable<ReturnType<typeof getShapeNodes>['shape']>
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    state: ShapeScalingState
    baseWidth: number
    baseHeight: number
    alignH: ShapeGroup['shapeAlignHorizontal']
    alignV: ShapeGroup['shapeAlignVertical']
    padding: ShapePadding
  }): void {
    applyShapeTextLayout({
      group,
      shape,
      text,
      width: baseWidth,
      height: baseHeight,
      alignH,
      alignV,
      padding
    })

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
   * Восстанавливает transform группы без пересчета layout, если масштабирование было полностью заблокировано.
   */
  private _restoreGroupTransformOnly({
    group,
    shape,
    text,
    state
  }: {
    group: ShapeGroup
    shape: NonNullable<ReturnType<typeof getShapeNodes>['shape']> | null
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']> | null
    state: ShapeScalingState
  }): void {
    if (shape) {
      resizeShapeNode({
        shape,
        width: state.baseWidth,
        height: state.baseHeight,
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
      width: state.baseWidth,
      height: state.baseHeight,
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
}
