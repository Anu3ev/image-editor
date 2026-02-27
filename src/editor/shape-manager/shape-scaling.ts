import {
  Canvas,
  FabricObject,
  Transform
} from 'fabric'
import {
  applyShapeTextLayout,
  isShapeTextFrameFilled,
  resolveShapeTextFrameLayout
} from './shape-layout'
import {
  ShapeGroup,
  ShapePadding,
  ShapeScalingState
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
  transform?: Transform
}

type ShapeModifiedEvent = {
  target?: FabricObject | null
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
    const { text } = getShapeNodes({ group })

    if (!text) return

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
    const scaleXRaw = group.scaleX ?? 1
    const scaleYRaw = group.scaleY ?? 1
    const scaleX = Math.abs(scaleXRaw) || 1
    const scaleY = Math.abs(scaleYRaw) || 1
    const hasNegativeScale = scaleXRaw < 0 || scaleYRaw < 0
    const hitScaleBoundary = scaleXRaw <= SCALE_EPSILON || scaleYRaw <= SCALE_EPSILON
    const hasTransformOriginChange = ShapeScalingController._isTransformOriginChanged({
      state,
      transform
    })
    const hasTransformCornerChange = ShapeScalingController._isTransformCornerChanged({
      state,
      transform
    })
    const shouldMarkCornerCrossing = hitScaleBoundary
      || hasNegativeScale
      || hasTransformOriginChange
      || hasTransformCornerChange

    if (shouldMarkCornerCrossing) {
      state.crossedOppositeCorner = true
    }

    const nextWidth = Math.max(MIN_SIZE, state.baseWidth * scaleX)
    const nextHeight = Math.max(MIN_SIZE, state.baseHeight * scaleY)
    const wouldFillTextFrame = isShapeTextFrameFilled({
      text,
      width: nextWidth,
      height: nextHeight,
      padding
    })
    const isScalingDownX = scaleX < state.lastAllowedScaleX - SCALE_EPSILON
    const isScalingDownY = scaleY < state.lastAllowedScaleY - SCALE_EPSILON
    const isBelowStartScaleX = scaleX < state.startScaleX - SCALE_EPSILON
    const isBelowStartScaleY = scaleY < state.startScaleY - SCALE_EPSILON
    const shouldBlockByStart = state.cannotScaleDownAtStart && (isBelowStartScaleX || isBelowStartScaleY)
    const shouldBlockByText = wouldFillTextFrame && (isScalingDownX || isScalingDownY)
    const shouldBlockByCornerCross = state.crossedOppositeCorner
    const shouldBlockScaling = shouldBlockByStart || shouldBlockByText || shouldBlockByCornerCross
    const isStateAtStart = ShapeScalingController._isStateAtStart({
      state
    })
    const shouldHandleAsNoop = shouldBlockByStart || (isStateAtStart && shouldBlockScaling)
    const currentLeft = group.left ?? 0
    const currentTop = group.top ?? 0
    const currentFlipX = Boolean(group.flipX)
    const currentFlipY = Boolean(group.flipY)

    if (shouldBlockScaling) {
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
      group.setCoords()

      if (shouldHandleAsNoop) {
        text.set({
          scaleX: 1 / Math.max(SCALE_EPSILON, state.startScaleX),
          scaleY: 1 / Math.max(SCALE_EPSILON, state.startScaleY)
        })
        text.setCoords()
        this.canvas.requestRenderAll()
        return
      }
    }

    if (!shouldBlockScaling) {
      state.blockedScaleAttempt = false
      group.shapeScalingNoopTransform = false
      state.lastAllowedScaleX = scaleX
      state.lastAllowedScaleY = scaleY
      state.lastAllowedLeft = currentLeft
      state.lastAllowedTop = currentTop
      state.lastAllowedFlipX = currentFlipX
      state.lastAllowedFlipY = currentFlipY
    }

    const appliedScaleX = Math.abs(group.scaleX ?? 1) || 1
    const appliedScaleY = Math.abs(group.scaleY ?? 1) || 1
    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const alignV = group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const previewWidth = Math.max(MIN_SIZE, state.baseWidth * appliedScaleX)
    const previewHeight = Math.max(MIN_SIZE, state.baseHeight * appliedScaleY)

    this._applyLiveTextLayout({
      text,
      width: previewWidth,
      height: previewHeight,
      padding,
      alignH,
      alignV,
      scaleX: appliedScaleX,
      scaleY: appliedScaleY
    })

    this.canvas.requestRenderAll()
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

    const baseWidth = state?.baseWidth ?? Math.max(MIN_SIZE, group.shapeBaseWidth ?? group.width ?? MIN_SIZE)
    const baseHeight = state?.baseHeight ?? Math.max(MIN_SIZE, group.shapeBaseHeight ?? group.height ?? MIN_SIZE)
    const hasBlockedScaleAttempt = Boolean(state?.blockedScaleAttempt)

    if (hasBlockedScaleAttempt && state) {
      this._restoreGroupTransformOnly({
        group,
        text: getShapeNodes({ group }).text,
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

    let width = widthByAllowedScale
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
    const isScalingDownX = allowedScaleX < 1 - SCALE_EPSILON
    const isScalingDownY = allowedScaleY < 1 - SCALE_EPSILON

    if (frameWasFilled && isScalingDownX) {
      width = Math.max(width, baseWidth)
    }

    if (frameWasFilled && isScalingDownY) {
      height = Math.max(height, baseHeight)
    }

    if (state) {
      group.set({
        left: state.lastAllowedLeft,
        top: state.lastAllowedTop
      })
    }

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
    transform?: Transform
  }): ShapeScalingState {
    let state = this.scalingState.get(group)

    if (!state) {
      const baseWidth = Math.max(MIN_SIZE, group.shapeBaseWidth ?? group.width ?? MIN_SIZE)
      const baseHeight = Math.max(MIN_SIZE, group.shapeBaseHeight ?? group.height ?? MIN_SIZE)
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
      const startTransformOriginX = ShapeScalingController._resolveTransformOriginValue({
        value: transform?.original?.originX ?? transform?.originX
      })
      const startTransformOriginY = ShapeScalingController._resolveTransformOriginValue({
        value: transform?.original?.originY ?? transform?.originY
      })
      const startTransformCorner = typeof transform?.corner === 'string'
        ? transform.corner
        : null
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
    transform?: Transform
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
   * Нормализует origin-значение transform к string/number/null.
   */
  private static _resolveTransformOriginValue({
    value
  }: {
    value: unknown
  }): string | number | null {
    if (typeof value === 'string') return value
    if (typeof value === 'number' && Number.isFinite(value)) return value

    return null
  }

  /**
   * Возвращает true, если transform origin изменился относительно старта текущего drag.
   */
  private static _isTransformOriginChanged({
    state,
    transform
  }: {
    state: ShapeScalingState
    transform?: Transform
  }): boolean {
    if (!transform) return false
    if (state.startTransformOriginX === null && state.startTransformOriginY === null) return false

    const originX = ShapeScalingController._resolveTransformOriginValue({
      value: transform.originX
    })
    const originY = ShapeScalingController._resolveTransformOriginValue({
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
    transform?: Transform
  }): boolean {
    if (!transform) return false
    if (!state.startTransformCorner) return false

    return transform.corner !== state.startTransformCorner
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
      left: state.lastAllowedLeft,
      top: state.lastAllowedTop,
      flipX: state.lastAllowedFlipX,
      flipY: state.lastAllowedFlipY,
      scaleX: 1,
      scaleY: 1
    })
    group.setCoords()
  }

  /**
   * Восстанавливает transform группы без пересчета layout, если масштабирование было полностью заблокировано.
   */
  private _restoreGroupTransformOnly({
    group,
    text,
    state
  }: {
    group: ShapeGroup
    text: NonNullable<ReturnType<typeof getShapeNodes>['text']> | null
    state: ShapeScalingState
  }): void {
    if (text) {
      text.set({
        scaleX: 1 / Math.max(SCALE_EPSILON, state.startScaleX),
        scaleY: 1 / Math.max(SCALE_EPSILON, state.startScaleY)
      })
      text.setCoords()
    }

    group.set({
      left: state.startLeft,
      top: state.startTop,
      flipX: state.lastAllowedFlipX,
      flipY: state.lastAllowedFlipY,
      scaleX: state.startScaleX,
      scaleY: state.startScaleY
    })
    group.setCoords()
  }
}
