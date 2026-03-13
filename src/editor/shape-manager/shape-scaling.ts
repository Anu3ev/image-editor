import {
  Canvas,
  FabricObject,
  Point,
  Transform
} from 'fabric'
import {
  applyShapeTextLayout,
  isShapeTextFrameFilled,
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
}

type ShapeScalingDecision = {
  appliedScaleX: number
  appliedScaleY: number
  previewWidth: number
  previewHeight: number
  shouldBlockScaling: boolean
  shouldHandleAsNoop: boolean
}

type ShapeScalingBlockState = {
  shouldBlockScaling: boolean
  shouldHandleAsNoop: boolean
}

type ShapePreviewDimensions = {
  previewWidth: number
  previewHeight: number
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

    if (scalingDecision.shouldBlockScaling) {
      this._applyBlockedScalingState({
        group,
        state,
        shouldHandleAsNoop: scalingDecision.shouldHandleAsNoop
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

    if (!scalingDecision.shouldBlockScaling) {
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
      scaleX,
      scaleY
    })

    // После решения о блокировке считаем именно те размеры preview, которые реально будут применены в этом кадре drag.
    const blockedScaleX = blockState.shouldHandleAsNoop ? state.startScaleX : state.lastAllowedScaleX
    const blockedScaleY = blockState.shouldHandleAsNoop ? state.startScaleY : state.lastAllowedScaleY
    const appliedScaleX = Math.abs(blockState.shouldBlockScaling ? blockedScaleX : group.scaleX ?? 1) || 1
    const appliedScaleY = Math.abs(blockState.shouldBlockScaling ? blockedScaleY : group.scaleY ?? 1) || 1
    const previewDimensions = this._resolvePreviewDimensions({
      text,
      padding,
      state,
      appliedScaleX,
      appliedScaleY
    })

    return {
      appliedScaleX,
      appliedScaleY,
      previewWidth: previewDimensions.previewWidth,
      previewHeight: previewDimensions.previewHeight,
      shouldBlockScaling: blockState.shouldBlockScaling,
      shouldHandleAsNoop: blockState.shouldHandleAsNoop
    }
  }

  /**
   * Определяет, можно ли продолжать текущий шаг scaling без выхода за доменные ограничения shape.
   */
  private _resolveScalingBlockState({
    text,
    padding,
    state,
    scaleX,
    scaleY
  }: {
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    padding: ShapePadding
    state: ShapeScalingState
    scaleX: number
    scaleY: number
  }): ShapeScalingBlockState {
    const nextWidth = Math.max(MIN_SIZE, state.baseWidth * scaleX)
    const nextHeight = Math.max(MIN_SIZE, state.baseHeight * scaleY)
    const minimumWidth = resolveMinimumShapeWidthForText({
      text,
      padding
    })
    const wouldFillTextFrame = isShapeTextFrameFilled({
      text,
      width: nextWidth,
      height: nextHeight,
      padding
    })
    const isScalingDownX = scaleX < state.lastAllowedScaleX - SCALE_EPSILON
    const isScalingDownY = scaleY < state.lastAllowedScaleY - SCALE_EPSILON
    const isBelowStartScaleY = scaleY < state.startScaleY - SCALE_EPSILON
    const shouldBlockByStart = state.cannotScaleDownAtStart && isBelowStartScaleY
    const shouldBlockByMinimumWidth = isScalingDownX && nextWidth < minimumWidth - SIZE_EPSILON
    const shouldBlockByText = wouldFillTextFrame && isScalingDownY
    const shouldBlockScaling = shouldBlockByStart
      || shouldBlockByMinimumWidth
      || shouldBlockByText
      || state.crossedOppositeCorner
    const shouldHandleAsNoop = shouldBlockByStart || (
      ShapeScalingController._isStateAtStart({
        state
      })
      && shouldBlockScaling
    )

    return {
      shouldBlockScaling,
      shouldHandleAsNoop
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
    appliedScaleY
  }: {
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']>
    padding: ShapePadding
    state: ShapeScalingState
    appliedScaleX: number
    appliedScaleY: number
  }): ShapePreviewDimensions {
    const previewWidth = Math.max(MIN_SIZE, state.baseWidth * appliedScaleX)
    const scaledPreviewHeight = Math.max(MIN_SIZE, state.baseHeight * appliedScaleY)
    const previewHeight = Math.max(
      scaledPreviewHeight,
      resolveRequiredShapeHeightForText({
        text,
        width: previewWidth,
        height: scaledPreviewHeight,
        padding
      })
    )

    return {
      previewWidth,
      previewHeight
    }
  }

  /**
   * Возвращает group в последнюю допустимую трансформацию, если текущий шаг scaling заблокирован.
   */
  private _applyBlockedScalingState({
    group,
    state,
    shouldHandleAsNoop
  }: {
    group: ShapeGroup
    state: ShapeScalingState
    shouldHandleAsNoop: boolean
  }): void {
    state.blockedScaleAttempt = shouldHandleAsNoop
    group.shapeScalingNoopTransform = shouldHandleAsNoop

    const nextScaleX = shouldHandleAsNoop ? state.startScaleX : state.lastAllowedScaleX
    const nextScaleY = shouldHandleAsNoop ? state.startScaleY : state.lastAllowedScaleY
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

    const allowedScaleX = state?.lastAllowedScaleX ?? scaleX
    const allowedScaleY = state?.lastAllowedScaleY ?? scaleY
    const widthByAllowedScale = Math.max(MIN_SIZE, baseWidth * allowedScaleX)
    const heightByAllowedScale = Math.max(MIN_SIZE, baseHeight * allowedScaleY)
    const hasWidthChange = Math.abs(widthByAllowedScale - baseWidth) > SIZE_EPSILON
    const hasHeightChange = Math.abs(heightByAllowedScale - baseHeight) > SIZE_EPSILON
    const hasDimensionChange = hasWidthChange || hasHeightChange

    const width = widthByAllowedScale
    let height = heightByAllowedScale

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

    const frameWasFilled = isShapeTextFrameFilled({
      text,
      width: baseWidth,
      height: baseHeight,
      padding
    })
    const isScalingDownY = allowedScaleY < 1 - SCALE_EPSILON

    if (frameWasFilled && isScalingDownY) {
      height = Math.max(height, baseHeight)
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
      const frameFilledAtStart = isShapeTextFrameFilled({
        text,
        width: baseWidth,
        height: baseHeight,
        padding
      })
      const widthAfterMinimalDownscale = Math.max(MIN_SIZE, baseWidth - 1)
      const heightAfterMinimalDownscale = Math.max(MIN_SIZE, baseHeight - 1)
      const wouldFillAfterMinimalDownscale = isShapeTextFrameFilled({
        text,
        width: widthAfterMinimalDownscale,
        height: heightAfterMinimalDownscale,
        padding
      })

      state = {
        baseWidth,
        baseHeight,
        baseRounding: Math.max(0, group.shapeRounding ?? 0),
        cannotScaleDownAtStart: frameFilledAtStart || wouldFillAfterMinimalDownscale,
        blockedScaleAttempt: false,
        frameFilledAtStart,
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
   * Возвращает true, если последняя разрешенная трансформация совпадает со стартовой.
   */
  private static _isStateAtStart({
    state
  }: {
    state: ShapeScalingState
  }): boolean {
    const isSameScaleX = Math.abs(state.lastAllowedScaleX - state.startScaleX) <= SCALE_EPSILON
    const isSameScaleY = Math.abs(state.lastAllowedScaleY - state.startScaleY) <= SCALE_EPSILON
    const isSameLeft = Math.abs(state.lastAllowedLeft - state.startLeft) <= SIZE_EPSILON
    const isSameTop = Math.abs(state.lastAllowedTop - state.startTop) <= SIZE_EPSILON

    return isSameScaleX && isSameScaleY && isSameLeft && isSameTop
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
    const horizontalAlign = alignH ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const verticalAlign = alignV ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const {
      frame,
      splitByGrapheme,
      textTop
    } = resolveShapeTextFrameLayout({
      text,
      width: baseWidth,
      height: baseHeight,
      alignV: verticalAlign,
      padding
    })

    resizeShapeNode({
      shape,
      width: baseWidth,
      height: baseHeight,
      rounding: group.shapeRounding,
      strokeWidth: group.shapeStrokeWidth
    })

    text.set({
      autoExpand: false,
      textAlign: horizontalAlign,
      width: frame.width,
      splitByGrapheme,
      left: frame.left,
      top: textTop,
      originX: 'left',
      originY: 'top',
      scaleX: 1,
      scaleY: 1
    })

    text.initDimensions()
    text.setCoords()
    shape.setCoords()

    group.set({
      width: baseWidth,
      height: baseHeight,
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
