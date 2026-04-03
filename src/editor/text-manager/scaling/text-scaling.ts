import {
  ActiveSelection,
  Canvas,
  FabricObject,
  IEvent,
  Textbox,
  Transform
} from 'fabric'
import type CanvasManager from '../../canvas-manager'
import type { BackgroundTextboxProps } from '../background-textbox'
import { DIMENSION_EPSILON } from '../constants'
import type {
  CornerRadiiValues,
  EditorTextbox,
  PaddingValues,
  ScalingState
} from '../types'
import {
  captureTextScaleBase,
  commitStandaloneTextboxScale,
  resolveMinimumTextScalingBounds
} from './text-scaling-materialization'
import {
  resolvePointerTextScalingStep,
  resolveTextScalingAxisState,
  syncLiveTextScalingTransform
} from './text-scaling-transform'

const SCALE_EPSILON = 0.0001

type CanvasWithCurrentTransform = Canvas & {
  _currentTransform?: Transform | null
}

type PersistScaledTextbox = ({
  target,
  style
}: {
  target: EditorTextbox
  style: Partial<BackgroundTextboxProps>
}) => void

/**
 * Проверяет, является ли объект текстовым блоком редактора.
 */
function isTextbox(object?: FabricObject | null): object is EditorTextbox {
  return Boolean(object) && object instanceof Textbox
}

/**
 * Возвращает true для текстового узла, чей layout и placement принадлежат shape-композиции.
 */
function isShapeOwnedTextbox(object?: FabricObject | null): object is EditorTextbox {
  if (!isTextbox(object)) return false

  const group = object.group as (FabricObject & {
    shapeComposite?: boolean
  }) | undefined
  const textbox = object as EditorTextbox & {
    shapeNodeType?: string
  }

  return textbox.shapeNodeType === 'text' && group?.shapeComposite === true
}

/**
 * Контроллер масштабирования standalone-textbox.
 */
export default class TextScalingController {
  /**
   * Fabric canvas редактора.
   */
  private canvas: Canvas

  /**
   * Менеджер placement-контракта объектов.
   */
  private canvasManager: CanvasManager

  /**
   * Временное состояние масштабирования для активных текстовых drag-сессий.
   */
  private scalingState: WeakMap<EditorTextbox, ScalingState>

  /**
   * Финализирует materialized scaling через editor-level update pipeline.
   */
  private persistScaledTextbox: PersistScaledTextbox

  constructor(
    {
      canvas,
      canvasManager,
      persistScaledTextbox
    }: {
      canvas: Canvas
      canvasManager: CanvasManager
      persistScaledTextbox: PersistScaledTextbox
    }
  ) {
    this.canvas = canvas
    this.canvasManager = canvasManager
    this.persistScaledTextbox = persistScaledTextbox
    this.scalingState = new WeakMap()
  }

  /**
   * Запекает текущий transient scale standalone-textbox в каноническую геометрию.
   */
  public commitStandaloneTextScale(
    {
      target,
      shouldDisableAutoExpandOnHorizontalChange = false
    }: {
      target?: FabricObject | null
      shouldDisableAutoExpandOnHorizontalChange?: boolean
    }
  ): boolean {
    if (!isTextbox(target)) return false
    if (isShapeOwnedTextbox(target)) return false

    const widthScale = Math.abs(target.scaleX ?? 1) || 1
    const heightScale = Math.abs(target.scaleY ?? 1) || 1
    const hasScaleChange = Math.abs(widthScale - 1) > DIMENSION_EPSILON
      || Math.abs(heightScale - 1) > DIMENSION_EPSILON

    if (!hasScaleChange) return false

    const base = captureTextScaleBase({ textbox: target })
    const placement = this.canvasManager.getObjectPlacement({ object: target })

    commitStandaloneTextboxScale({
      textbox: target,
      canvasManager: this.canvasManager,
      base,
      widthScale,
      heightScale,
      placement,
      shouldScaleFontSize: true,
      shouldScalePadding: true,
      shouldScaleRadii: true,
      shouldDisableAutoExpandOnHorizontalChange
    })

    return true
  }

  /**
   * Доводит live-scale текста до текущего положения указателя на кадрах, где Fabric уже не эмитит object:scaling.
   */
  public handleMouseMove = (event: IEvent<MouseEvent>): void => {
    const canvas = this.canvas as CanvasWithCurrentTransform
    const transform = canvas._currentTransform
    if (!transform) return

    const { target } = transform
    if (!isTextbox(target)) return
    if (isShapeOwnedTextbox(target)) return

    const state = this.scalingState.get(target)
    if (!state || !event.e) return

    const {
      isCornerHandle,
      isHorizontalHandle,
      isVerticalHandle
    } = resolveTextScalingAxisState({ transform })

    if (!isHorizontalHandle && !isVerticalHandle && !isCornerHandle) return

    const scenePoint = this.canvas.getScenePoint(event.e)
    const pointerScalingStep = resolvePointerTextScalingStep({
      textbox: target,
      transform,
      scenePoint
    })
    if (!pointerScalingStep) return

    const {
      passedOriginX,
      passedOriginY,
      stepScaleX,
      stepScaleY
    } = pointerScalingStep
    const scaleOriginX = transform.originX ?? target.originX ?? 'center'
    const scaleOriginY = transform.originY ?? target.originY ?? 'center'
    const scalingAnchorPlacement = this.canvasManager.getObjectPlacement({
      object: target,
      originX: scaleOriginX,
      originY: scaleOriginY
    })
    const {
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      radiusTopLeft = 0,
      radiusTopRight = 0,
      radiusBottomRight = 0,
      radiusBottomLeft = 0,
      fontSize: currentFontSize,
      width: currentWidthProp
    } = target
    const {
      width: startWidth,
      fontSize: startFontSize
    } = state.startBase
    const currentWidth = currentWidthProp ?? startWidth
    const previousFontSize = currentFontSize ?? startFontSize
    const previousPadding: PaddingValues = {
      top: paddingTop,
      right: paddingRight,
      bottom: paddingBottom,
      left: paddingLeft
    }
    const previousRadii: CornerRadiiValues = {
      topLeft: radiusTopLeft,
      topRight: radiusTopRight,
      bottomRight: radiusBottomRight,
      bottomLeft: radiusBottomLeft
    }

    let nextWidthScale = state.lastAllowedScaleX
    let nextHeightScale = state.lastAllowedScaleY

    if (isCornerHandle) {
      const nextProportionalScale = Math.max(
        state.minimumProportionalScale,
        state.lastAllowedScaleX * Math.sqrt(stepScaleX * stepScaleY)
      )
      const clampedProportionalScale = passedOriginX || passedOriginY
        ? state.minimumProportionalScale
        : nextProportionalScale
      const shouldSkipCommit = Math.abs(clampedProportionalScale - state.lastAllowedScaleX) <= SCALE_EPSILON

      if (shouldSkipCommit) return

      nextWidthScale = clampedProportionalScale
      nextHeightScale = clampedProportionalScale
    } else {
      if (isHorizontalHandle) {
        const nextRawWidthScale = state.lastAllowedScaleX * stepScaleX
        const clampedWidthScale = passedOriginX
          ? state.minimumWidthScale
          : Math.max(state.minimumWidthScale, nextRawWidthScale)
        const widthScaleChanged = Math.abs(clampedWidthScale - state.lastAllowedScaleX) > SCALE_EPSILON

        if (widthScaleChanged) {
          nextWidthScale = clampedWidthScale
        }
      }

      if (isVerticalHandle) {
        const nextRawHeightScale = state.lastAllowedScaleY * stepScaleY
        const clampedHeightScale = passedOriginY
          ? state.minimumFontScale
          : Math.max(state.minimumFontScale, nextRawHeightScale)
        const heightScaleChanged = Math.abs(clampedHeightScale - state.lastAllowedScaleY) > SCALE_EPSILON

        if (heightScaleChanged) {
          nextHeightScale = clampedHeightScale
        }
      }

      const shouldSkipCommit = Math.abs(nextWidthScale - state.lastAllowedScaleX) <= SCALE_EPSILON
        && Math.abs(nextHeightScale - state.lastAllowedScaleY) <= SCALE_EPSILON
      if (shouldSkipCommit) return
    }

    const {
      appliedWidth,
      dimensionsRounded
    } = commitStandaloneTextboxScale({
      textbox: target,
      canvasManager: this.canvasManager,
      base: state.startBase,
      placement: state.startObjectPlacement,
      anchorPlacement: scalingAnchorPlacement,
      widthScale: nextWidthScale,
      heightScale: nextHeightScale,
      shouldScaleFontSize: isCornerHandle || isVerticalHandle,
      shouldScalePadding: isCornerHandle || isVerticalHandle,
      shouldScaleRadii: isCornerHandle || isVerticalHandle,
      shouldDisableAutoExpandOnHorizontalChange: isHorizontalHandle,
      shouldRoundDimensions: !isCornerHandle
    })

    syncLiveTextScalingTransform({
      textbox: target,
      transform,
      appliedWidth
    })

    this._updateScalingStateAfterLiveCommit({
      textbox: target,
      state,
      appliedWidth,
      previousFontSize,
      previousPadding,
      previousRadii,
      previousWidth: currentWidth,
      dimensionsRounded,
      isCornerHandle,
      isHorizontalHandle,
      isVerticalHandle,
      originX: scaleOriginX,
      originY: scaleOriginY
    })

    this.canvas.requestRenderAll()
  }

  /**
   * Материализует live scaling standalone-textbox в width/font/padding/radius и поддерживает fallback через lastAllowed state.
   */
  public handleObjectScaling = (event: IEvent<MouseEvent> & { transform?: Transform }): void => {
    const { target, transform } = event
    if (target instanceof ActiveSelection) return
    if (!isTextbox(target)) return
    if (isShapeOwnedTextbox(target)) return
    if (!transform) return

    target.isScaling = true

    const state = this._ensureScalingState({
      textbox: target,
      transform
    })
    const { startBase } = state
    const {
      width: startWidth,
      fontSize: startFontSize
    } = startBase
    const {
      isCornerHandle,
      isHorizontalHandle,
      isVerticalHandle
    } = resolveTextScalingAxisState({ transform })
    const corner = transform.corner ?? ''
    const shouldScaleFontSize = isCornerHandle || isVerticalHandle

    if (!isHorizontalHandle && !isVerticalHandle && !isCornerHandle) return

    const rawScaleX = target.scaleX ?? transform.scaleX ?? 1
    const rawScaleY = target.scaleY ?? transform.scaleY ?? 1
    const stepScaleX = Math.abs(rawScaleX) || 1
    const stepScaleY = Math.abs(rawScaleY) || 1
    const scaleOriginX = transform.originX ?? target.originX ?? 'center'
    const scaleOriginY = transform.originY ?? target.originY ?? 'center'
    const scalingAnchorPlacement = this.canvasManager.getObjectPlacement({
      object: target,
      originX: scaleOriginX,
      originY: scaleOriginY
    })
    const {
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      radiusTopLeft = 0,
      radiusTopRight = 0,
      radiusBottomRight = 0,
      radiusBottomLeft = 0,
      fontSize: currentFontSize,
      width: currentWidthProp
    } = target
    const shouldScalePadding = isCornerHandle || isVerticalHandle
    const shouldScaleRadii = isCornerHandle || isVerticalHandle
    const currentWidth = currentWidthProp ?? startWidth

    let nextWidthScale = state.lastAllowedScaleX
    let nextHeightScale = state.lastAllowedScaleY
    let anchorPlacement = scalingAnchorPlacement
    let shouldStoreLastAllowedState = true

    if (isCornerHandle) {
      const proportionalStepScale = Math.sqrt(stepScaleX * stepScaleY)
      const nextProportionalScale = state.lastAllowedScaleX * proportionalStepScale
      const hasNegativeScale = rawScaleX < 0 || rawScaleY < 0
      const hasTransformOriginChange = scaleOriginX !== state.startTransformOriginX
        || scaleOriginY !== state.startTransformOriginY
      const hasTransformCornerChange = corner !== state.startTransformCorner
      const shouldRestoreLastAllowedState = hasNegativeScale
        || hasTransformOriginChange
        || hasTransformCornerChange

      if (shouldRestoreLastAllowedState) {
        nextWidthScale = state.lastAllowedScaleX
        nextHeightScale = state.lastAllowedScaleY
        anchorPlacement = state.lastAllowedAnchorPlacement
        shouldStoreLastAllowedState = false
      } else {
        const clampedProportionalScale = Math.max(
          state.minimumProportionalScale,
          nextProportionalScale
        )

        nextWidthScale = clampedProportionalScale
        nextHeightScale = clampedProportionalScale
      }
    } else {
      if (isHorizontalHandle) {
        nextWidthScale = Math.max(
          state.minimumWidthScale,
          state.lastAllowedScaleX * stepScaleX
        )
      }

      if (isVerticalHandle) {
        nextHeightScale = Math.max(
          state.minimumFontScale,
          state.lastAllowedScaleY * stepScaleY
        )
      }
    }

    const {
      appliedWidth,
      dimensionsRounded: dimensionsRoundedOnScale
    } = commitStandaloneTextboxScale({
      textbox: target,
      canvasManager: this.canvasManager,
      base: startBase,
      placement: state.startObjectPlacement,
      anchorPlacement,
      widthScale: nextWidthScale,
      heightScale: nextHeightScale,
      shouldScaleFontSize,
      shouldScalePadding,
      shouldScaleRadii,
      shouldDisableAutoExpandOnHorizontalChange: isHorizontalHandle,
      shouldRoundDimensions: !isCornerHandle
    })

    syncLiveTextScalingTransform({
      textbox: target,
      transform,
      appliedWidth
    })

    this.canvas.requestRenderAll()

    if (!shouldStoreLastAllowedState) return

    this._updateScalingStateAfterLiveCommit({
      textbox: target,
      state,
      appliedWidth,
      previousFontSize: currentFontSize ?? startFontSize,
      previousPadding: {
        top: paddingTop,
        right: paddingRight,
        bottom: paddingBottom,
        left: paddingLeft
      },
      previousRadii: {
        topLeft: radiusTopLeft,
        topRight: radiusTopRight,
        bottomRight: radiusBottomRight,
        bottomLeft: radiusBottomLeft
      },
      previousWidth: currentWidth,
      dimensionsRounded: dimensionsRoundedOnScale,
      isCornerHandle,
      isHorizontalHandle,
      isVerticalHandle,
      originX: scaleOriginX,
      originY: scaleOriginY
    })
  }

  /**
   * Завершает трансформацию текстового объекта и фиксирует обновлённые стили и размеры через общий update pipeline.
   */
  public handleObjectModified = (event: IEvent<MouseEvent>): void => {
    const { target } = event
    if (target instanceof ActiveSelection) {
      const objects = target.getObjects()
      const hasText = objects.some((object) => isTextbox(object))
      if (!hasText) return

      const { scaleX = 1, scaleY = 1 } = target
      if (Math.abs(scaleX - 1) < DIMENSION_EPSILON && Math.abs(scaleY - 1) < DIMENSION_EPSILON) return

      this.canvas.discardActiveObject()

      objects.forEach((object) => {
        this.commitStandaloneTextScale({ target: object })
        object.setCoords()
      })

      const newSelection = new ActiveSelection(objects, {
        canvas: this.canvas
      })
      this.canvas.setActiveObject(newSelection)
      this.canvas.requestRenderAll()
      return
    }

    if (!isTextbox(target)) return
    if (isShapeOwnedTextbox(target)) return

    target.isScaling = false

    const state = this.scalingState.get(target)
    this.scalingState.delete(target)
    if (!state?.hasScalingChange) return

    const width = target.width ?? target.calcTextWidth()
    const {
      fontSize: startFontSize,
      styles: startStyles
    } = state.startBase
    const fontSize = target.fontSize ?? startFontSize ?? 16
    const hasInlineStyles = Object.keys(startStyles).length > 0
    const {
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      radiusTopLeft = 0,
      radiusTopRight = 0,
      radiusBottomRight = 0,
      radiusBottomLeft = 0
    } = target

    const styleUpdates: Partial<BackgroundTextboxProps> = {
      width,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      radiusTopLeft,
      radiusTopRight,
      radiusBottomRight,
      radiusBottomLeft
    }

    if (!hasInlineStyles) {
      styleUpdates.fontSize = fontSize
    }

    this.persistScaledTextbox({
      target,
      style: styleUpdates
    })

    target.set({ scaleX: 1, scaleY: 1 })
    target.setCoords()
  }

  /**
   * Создаёт или возвращает сохранённое состояние для текущего drag-цикла масштабирования текста.
   */
  private _ensureScalingState(
    {
      textbox,
      transform
    }: {
      textbox: EditorTextbox
      transform: Transform
    }
  ): ScalingState {
    let state = this.scalingState.get(textbox)

    if (!state) {
      const startBase = captureTextScaleBase({ textbox })
      const startObjectPlacement = this.canvasManager.getObjectPlacement({ object: textbox })
      const minimumScalingBounds = resolveMinimumTextScalingBounds({
        base: startBase
      })
      const startTransformOriginX = transform.original?.originX ?? transform.originX ?? textbox.originX ?? 'center'
      const startTransformOriginY = transform.original?.originY ?? transform.originY ?? textbox.originY ?? 'center'
      const startTransformCorner = typeof transform.corner === 'string'
        ? transform.corner
        : null

      state = {
        startBase,
        startObjectPlacement,
        startTransformCorner,
        startTransformOriginX,
        startTransformOriginY,
        lastAllowedScaleX: 1,
        lastAllowedScaleY: 1,
        lastAllowedAnchorPlacement: this.canvasManager.getObjectPlacement({
          object: textbox,
          originX: startTransformOriginX,
          originY: startTransformOriginY
        }),
        minimumWidthScale: minimumScalingBounds.widthScale,
        minimumFontScale: minimumScalingBounds.fontScale,
        minimumProportionalScale: minimumScalingBounds.proportionalScale,
        hasScalingChange: false
      }
      this.scalingState.set(textbox, state)
    }

    return state
  }

  /**
   * Обновляет live scaling state после успешного коммита шага drag.
   */
  private _updateScalingStateAfterLiveCommit(
    {
      textbox,
      state,
      appliedWidth,
      previousFontSize,
      previousPadding,
      previousRadii,
      previousWidth,
      dimensionsRounded,
      isCornerHandle,
      isHorizontalHandle,
      isVerticalHandle,
      originX,
      originY
    }: {
      textbox: EditorTextbox
      state: ScalingState
      appliedWidth: number
      previousFontSize: number
      previousPadding: PaddingValues
      previousRadii: CornerRadiiValues
      previousWidth: number
      dimensionsRounded: boolean
      isCornerHandle: boolean
      isHorizontalHandle: boolean
      isVerticalHandle: boolean
      originX: FabricObject['originX']
      originY: FabricObject['originY']
    }
  ): void {
    const {
      width: startWidth,
      fontSize: startFontSize
    } = state.startBase
    const nextFontSize = textbox.fontSize ?? startFontSize
    const nextPadding: PaddingValues = {
      top: textbox.paddingTop ?? 0,
      right: textbox.paddingRight ?? 0,
      bottom: textbox.paddingBottom ?? 0,
      left: textbox.paddingLeft ?? 0
    }
    const nextRadii: CornerRadiiValues = {
      topLeft: textbox.radiusTopLeft ?? 0,
      topRight: textbox.radiusTopRight ?? 0,
      bottomRight: textbox.radiusBottomRight ?? 0,
      bottomLeft: textbox.radiusBottomLeft ?? 0
    }
    const widthChanged = Math.abs(appliedWidth - previousWidth) > DIMENSION_EPSILON
    const fontSizeChanged = Math.abs(nextFontSize - previousFontSize) > DIMENSION_EPSILON
    const paddingChanged = Math.abs(nextPadding.top - previousPadding.top) > DIMENSION_EPSILON
      || Math.abs(nextPadding.right - previousPadding.right) > DIMENSION_EPSILON
      || Math.abs(nextPadding.bottom - previousPadding.bottom) > DIMENSION_EPSILON
      || Math.abs(nextPadding.left - previousPadding.left) > DIMENSION_EPSILON
    const radiusChanged = Math.abs(nextRadii.topLeft - previousRadii.topLeft) > DIMENSION_EPSILON
      || Math.abs(nextRadii.topRight - previousRadii.topRight) > DIMENSION_EPSILON
      || Math.abs(nextRadii.bottomRight - previousRadii.bottomRight) > DIMENSION_EPSILON
      || Math.abs(nextRadii.bottomLeft - previousRadii.bottomLeft) > DIMENSION_EPSILON

    let appliedWidthScale = state.lastAllowedScaleX
    let appliedHeightScale = state.lastAllowedScaleY

    if (isCornerHandle) {
      const proportionalScale = nextFontSize / Math.max(1, startFontSize)
      appliedWidthScale = proportionalScale
      appliedHeightScale = proportionalScale
    } else if (isHorizontalHandle) {
      appliedWidthScale = appliedWidth / Math.max(1, startWidth)
    } else if (isVerticalHandle) {
      appliedHeightScale = nextFontSize / Math.max(1, startFontSize)
    }

    this._storeLastAllowedScalingState({
      textbox,
      state,
      widthScale: appliedWidthScale,
      heightScale: appliedHeightScale,
      originX,
      originY
    })

    state.hasScalingChange = state.hasScalingChange
      || widthChanged
      || fontSizeChanged
      || paddingChanged
      || radiusChanged
      || dimensionsRounded
  }

  /**
   * Сохраняет последнее допустимое состояние live-scale, к которому можно безопасно вернуться в текущем drag.
   */
  private _storeLastAllowedScalingState(
    {
      textbox,
      state,
      widthScale,
      heightScale,
      originX,
      originY
    }: {
      textbox: EditorTextbox
      state: ScalingState
      widthScale: number
      heightScale: number
      originX: FabricObject['originX']
      originY: FabricObject['originY']
    }
  ): void {
    state.lastAllowedScaleX = widthScale
    state.lastAllowedScaleY = heightScale
    state.lastAllowedAnchorPlacement = this.canvasManager.getObjectPlacement({
      object: textbox,
      originX,
      originY
    })
  }
}
