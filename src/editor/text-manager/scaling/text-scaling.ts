import {
  ActiveSelection,
  Canvas,
  FabricObject,
  Textbox
} from 'fabric'
import type {
  BasicTransformEvent,
  ModifiedEvent,
  TPointerEvent,
  TPointerEventInfo,
  Transform
} from 'fabric'
import type CanvasManager from '../../canvas-manager'
import type { ObjectPlacement } from '../../canvas-manager'
import type { BackgroundTextboxProps } from '../background-textbox'
import { DIMENSION_EPSILON } from '../constants'
import type {
  CornerRadiiValues,
  EditorTextbox,
  PaddingValues,
  ScalingState
} from '../types'
import {
  captureTextCornerScaleCanonicalState,
  type TextCornerScaleCanonicalState
} from './text-corner-scale-state'
import {
  captureTextScaleBase,
  commitStandaloneTextboxScale,
  resolveMinimumTextScalingBounds,
  type CommitStandaloneTextScaleResult
} from './text-scaling-materialization'
import {
  resolvePointerTextScalingStep,
  resolveTextScalingAxisState,
  syncLiveTextScalingTransform,
  type TextScalingAxisState,
  type TextScalingPointerStep
} from './text-scaling-transform'

const SCALE_EPSILON = 0.0001

type CanvasWithCurrentTransform = Canvas & {
  _currentTransform?: Transform | null
}

type TextScalingTargetEvent = BasicTransformEvent<TPointerEvent> & {
  e?: TPointerEvent | null
  target?: EditorTextbox | FabricObject | null
  transform?: Transform | null
}

type TextScalingModifiedEvent = ModifiedEvent<TPointerEvent> & {
  target?: EditorTextbox | FabricObject | null
}

/** Фиксирует измеренную геометрию текста через внутренний механизм обновления TextManager. */
type PersistScaledTextbox = ({
  target,
  style,
  shouldRoundDimensions
}: {
  target: EditorTextbox
  style: Partial<BackgroundTextboxProps>
  shouldRoundDimensions: boolean
}) => void

/** Текущие канонические значения текста до следующего шага скейлинга. */
type TextScaleCurrentState = Readonly<{
  fontSize: number
  padding: PaddingValues
  radii: CornerRadiiValues
  width: number
}>

/** Множители, фактически применённые после канонизации текста. */
type AppliedTextScaleState = Readonly<{
  widthScale: number
  heightScale: number
}>

/** Результат применения пропорционального множителя к отдельному тексту. */
export type AppliedTextCornerScale = Readonly<{
  canonicalState: TextCornerScaleCanonicalState
  scale: number
}>

/** Результат применения одного шага углового скейлинга. */
type MaterializedTextCornerScale = Readonly<{
  appliedWidth: number
  dimensionsRounded: boolean
  scale: number
}>

/** Рассчитанный шаг прежнего пути скейлинга до изменения живого текста. */
type ResolvedTextScaleStep = Readonly<{
  anchorPlacement: ObjectPlacement
  heightScale: number
  shouldStoreLastAllowedState: boolean
  widthScale: number
}>

/** Параметры применения рассчитанного шага к живому тексту. */
type MaterializeTextScaleStepOptions = Readonly<{
  axisState: TextScalingAxisState
  state: ScalingState
  step: ResolvedTextScaleStep
  target: EditorTextbox
  transform: Transform
}>

/**
 * Проверяет, является ли объект текстовым блоком редактора.
 */
function isTextbox(object?: FabricObject | null): object is EditorTextbox {
  return Boolean(object) && object instanceof Textbox
}

/**
 * Возвращает true для текстового узла, чей layout и placement принадлежат shape-композиции.
 */
function isShapeOwnedTextbox(object?: FabricObject | null): boolean {
  if (!isTextbox(object)) return false

  const group = object.group as (FabricObject & {
    shapeComposite?: boolean
  }) | undefined
  const textbox = object as EditorTextbox & {
    shapeNodeType?: string
  }

  return textbox.shapeNodeType === 'text' && group?.shapeComposite === true
}

/** Снимает канонические значения, по которым определяется реальное изменение текста. */
function captureCurrentTextScaleState({
  state,
  textbox
}: {
  state: ScalingState
  textbox: EditorTextbox
}): TextScaleCurrentState {
  return Object.freeze({
    fontSize: textbox.fontSize ?? state.startBase.fontSize,
    padding: Object.freeze({
      top: textbox.paddingTop ?? 0,
      right: textbox.paddingRight ?? 0,
      bottom: textbox.paddingBottom ?? 0,
      left: textbox.paddingLeft ?? 0
    }),
    radii: Object.freeze({
      topLeft: textbox.radiusTopLeft ?? 0,
      topRight: textbox.radiusTopRight ?? 0,
      bottomRight: textbox.radiusBottomRight ?? 0,
      bottomLeft: textbox.radiusBottomLeft ?? 0
    }),
    width: textbox.width ?? state.startBase.width
  })
}

/** Возвращает множители, фактически применённые после канонизации текущего шага. */
function resolveAppliedTextScaleState({
  appliedWidth,
  current,
  isCornerHandle,
  isHorizontalHandle,
  isVerticalHandle,
  state
}: {
  appliedWidth: number
  current: TextScaleCurrentState
  isCornerHandle: boolean
  isHorizontalHandle: boolean
  isVerticalHandle: boolean
  state: ScalingState
}): AppliedTextScaleState {
  const { fontSize: startFontSize, width: startWidth } = state.startBase
  let widthScale = state.lastAllowedScaleX
  let heightScale = state.lastAllowedScaleY

  if (isCornerHandle) {
    const proportionalScale = current.fontSize / Math.max(1, startFontSize)
    widthScale = proportionalScale
    heightScale = proportionalScale
  } else if (isHorizontalHandle) {
    widthScale = appliedWidth / Math.max(1, startWidth)
  } else if (isVerticalHandle) {
    heightScale = current.fontSize / Math.max(1, startFontSize)
  }

  return Object.freeze({ widthScale, heightScale })
}

/** Проверяет, изменилась ли каноническая геометрия текста на текущем шаге. */
function hasTextScaleStateChanged({
  appliedWidth,
  current,
  previous,
  dimensionsRounded
}: {
  appliedWidth: number
  current: TextScaleCurrentState
  previous: TextScaleCurrentState
  dimensionsRounded: boolean
}): boolean {
  const widthChanged = Math.abs(appliedWidth - previous.width) > DIMENSION_EPSILON
  const fontSizeChanged = Math.abs(current.fontSize - previous.fontSize) > DIMENSION_EPSILON
  const paddingChanged = Math.abs(current.padding.top - previous.padding.top) > DIMENSION_EPSILON
    || Math.abs(current.padding.right - previous.padding.right) > DIMENSION_EPSILON
    || Math.abs(current.padding.bottom - previous.padding.bottom) > DIMENSION_EPSILON
    || Math.abs(current.padding.left - previous.padding.left) > DIMENSION_EPSILON
  const radiusChanged = Math.abs(current.radii.topLeft - previous.radii.topLeft) > DIMENSION_EPSILON
    || Math.abs(current.radii.topRight - previous.radii.topRight) > DIMENSION_EPSILON
    || Math.abs(current.radii.bottomRight - previous.radii.bottomRight) > DIMENSION_EPSILON
    || Math.abs(current.radii.bottomLeft - previous.radii.bottomLeft) > DIMENSION_EPSILON

  return widthChanged || fontSizeChanged || paddingChanged || radiusChanged || dimensionsRounded
}

/** Рассчитывает новый множитель одной оси для запасного шага по указателю. */
function resolvePointerFallbackAxisScale({
  currentScale,
  minimumScale,
  passedOrigin,
  participates,
  stepScale
}: {
  currentScale: number
  minimumScale: number
  passedOrigin: boolean
  participates: boolean
  stepScale: number
}): number {
  if (!participates) return currentScale
  if (passedOrigin) return minimumScale

  return Math.max(minimumScale, currentScale * stepScale)
}

/** Рассчитывает запасной шаг скейлинга по указателю без изменения текста. */
function resolvePointerFallbackScaleStep({
  anchorPlacement,
  axisState,
  pointerStep,
  state
}: {
  anchorPlacement: ObjectPlacement
  axisState: TextScalingAxisState
  pointerStep: TextScalingPointerStep
  state: ScalingState
}): ResolvedTextScaleStep | null {
  const { isCornerHandle, isHorizontalHandle, isVerticalHandle } = axisState
  const { passedOriginX, passedOriginY, stepScaleX, stepScaleY } = pointerStep

  if (isCornerHandle) {
    const nextScale = passedOriginX || passedOriginY
      ? state.minimumProportionalScale
      : Math.max(
        state.minimumProportionalScale,
        state.lastAllowedScaleX * Math.sqrt(stepScaleX * stepScaleY)
      )
    if (Math.abs(nextScale - state.lastAllowedScaleX) <= SCALE_EPSILON) return null

    return Object.freeze({
      anchorPlacement,
      heightScale: nextScale,
      shouldStoreLastAllowedState: true,
      widthScale: nextScale
    })
  }

  const widthScale = resolvePointerFallbackAxisScale({
    currentScale: state.lastAllowedScaleX,
    minimumScale: state.minimumWidthScale,
    passedOrigin: passedOriginX,
    participates: isHorizontalHandle,
    stepScale: stepScaleX
  })
  const heightScale = resolvePointerFallbackAxisScale({
    currentScale: state.lastAllowedScaleY,
    minimumScale: state.minimumFontScale,
    passedOrigin: passedOriginY,
    participates: isVerticalHandle,
    stepScale: stepScaleY
  })
  const unchanged = Math.abs(widthScale - state.lastAllowedScaleX) <= SCALE_EPSILON
    && Math.abs(heightScale - state.lastAllowedScaleY) <= SCALE_EPSILON
  if (unchanged) return null

  return Object.freeze({ anchorPlacement, heightScale, shouldStoreLastAllowedState: true, widthScale })
}

/** Рассчитывает шаг прежнего Fabric-события скейлинга без изменения текста. */
function resolveObjectTextScaleStep({
  anchorPlacement,
  axisState,
  corner,
  rawScaleX,
  rawScaleY,
  scaleOriginX,
  scaleOriginY,
  state
}: {
  anchorPlacement: ObjectPlacement
  axisState: TextScalingAxisState
  corner: string
  rawScaleX: number
  rawScaleY: number
  scaleOriginX: FabricObject['originX']
  scaleOriginY: FabricObject['originY']
  state: ScalingState
}): ResolvedTextScaleStep {
  const { isCornerHandle, isHorizontalHandle, isVerticalHandle } = axisState
  const stepScaleX = Math.abs(rawScaleX) || 1
  const stepScaleY = Math.abs(rawScaleY) || 1
  let widthScale = state.lastAllowedScaleX
  let heightScale = state.lastAllowedScaleY

  if (!isCornerHandle) {
    if (isHorizontalHandle) widthScale = Math.max(state.minimumWidthScale, widthScale * stepScaleX)
    if (isVerticalHandle) heightScale = Math.max(state.minimumFontScale, heightScale * stepScaleY)

    return Object.freeze({ anchorPlacement, heightScale, shouldStoreLastAllowedState: true, widthScale })
  }

  const shouldRestoreLastAllowedState = rawScaleX < 0
    || rawScaleY < 0
    || scaleOriginX !== state.startTransformOriginX
    || scaleOriginY !== state.startTransformOriginY
    || corner !== state.startTransformCorner
  if (shouldRestoreLastAllowedState) {
    return Object.freeze({
      anchorPlacement: state.lastAllowedAnchorPlacement,
      heightScale,
      shouldStoreLastAllowedState: false,
      widthScale
    })
  }

  const scale = Math.max(
    state.minimumProportionalScale,
    state.lastAllowedScaleX * Math.sqrt(stepScaleX * stepScaleY)
  )

  return Object.freeze({ anchorPlacement, heightScale: scale, shouldStoreLastAllowedState: true, widthScale: scale })
}

/** Возвращает положение неподвижной точки текущего углового скейлинга. */
function createTextCornerScaleAnchorPlacement({
  fixedAnchor,
  transform
}: {
  fixedAnchor: Readonly<{ x: number; y: number }>
  transform: Transform
}): ObjectPlacement {
  return {
    left: fixedAnchor.x,
    top: fixedAnchor.y,
    originX: transform.originX,
    originY: transform.originY
  }
}

/**
 * Контроллер скейлинга отдельного текста.
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
   * Временное состояние активных жестов скейлинга текста.
   */
  private scalingState: WeakMap<EditorTextbox, ScalingState>

  /**
   * Сохраняет итоговую геометрию через общий механизм обновления текста.
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
   * Переносит временный масштаб отдельного текста в его каноническую геометрию.
   */
  public commitStandaloneTextScale(
    {
      target,
      shouldDisableAutoExpandOnHorizontalChange = false,
      shouldRoundDimensions = true
    }: {
      target?: FabricObject | null
      shouldDisableAutoExpandOnHorizontalChange?: boolean
      shouldRoundDimensions?: boolean
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
      shouldDisableAutoExpandOnHorizontalChange,
      shouldRoundDimensions
    })
    target.preserveExactTextGeometry = !shouldRoundDimensions

    return true
  }

  /** Фиксирует исходное состояние отдельного текста до первого шага углового скейлинга. */
  public beginStandaloneCornerScale({
    target,
    transform
  }: {
    target: EditorTextbox
    transform: Transform
  }): boolean {
    if (!isTextbox(target) || isShapeOwnedTextbox(target)) return false

    const { isCornerHandle } = resolveTextScalingAxisState({ transform })
    if (!isCornerHandle || transform.target !== target) return false

    this._ensureScalingState({ textbox: target, transform })

    return true
  }

  /** Один раз применяет рассчитанный пропорциональный множитель к каноническим свойствам текста. */
  public applyStandaloneCornerScale({
    fixedAnchor,
    scale,
    target,
    transform
  }: {
    fixedAnchor: Readonly<{ x: number; y: number }>
    scale: number
    target: EditorTextbox
    transform: Transform
  }): AppliedTextCornerScale {
    const state = this.scalingState.get(target)
    if (!state) throw new Error('Угловой скейлинг текста должен начинаться с исходного состояния')
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('Множитель скейлинга текста должен быть положительным')

    const previous = captureCurrentTextScaleState({ state, textbox: target })
    const materialized = this._materializeStandaloneCornerScale({
      fixedAnchor,
      scale,
      state,
      target,
      transform
    })
    this._updateScalingStateAfterLiveCommit({
      textbox: target,
      state,
      appliedWidth: materialized.appliedWidth,
      previous,
      dimensionsRounded: materialized.dimensionsRounded,
      isCornerHandle: true,
      isHorizontalHandle: false,
      isVerticalHandle: false,
      originX: transform.originX,
      originY: transform.originY
    })
    if (state.hasScalingChange) state.shouldRoundDimensionsOnCommit = false

    const changed = Math.abs(materialized.scale - 1) > SCALE_EPSILON
    if (changed) transform.actionPerformed = true
    this.canvas.requestRenderAll()

    return Object.freeze({
      canonicalState: captureTextCornerScaleCanonicalState({ textbox: target }),
      scale: (target.fontSize ?? state.startBase.fontSize) / state.startBase.fontSize
    })
  }

  /** Применяет один шаг углового скейлинга относительно неизменяемого начала жеста. */
  private _materializeStandaloneCornerScale({
    fixedAnchor,
    scale,
    state,
    target,
    transform
  }: {
    fixedAnchor: Readonly<{ x: number; y: number }>
    scale: number
    state: ScalingState
    target: EditorTextbox
    transform: Transform
  }): MaterializedTextCornerScale {
    const appliedScale = Math.max(state.minimumProportionalScale, scale)
    const committed = commitStandaloneTextboxScale({
      textbox: target,
      canvasManager: this.canvasManager,
      base: state.startBase,
      widthScale: appliedScale,
      heightScale: appliedScale,
      placement: state.startObjectPlacement,
      anchorPlacement: createTextCornerScaleAnchorPlacement({ fixedAnchor, transform }),
      shouldScaleFontSize: true,
      shouldScalePadding: true,
      shouldScaleRadii: true,
      shouldRoundDimensions: false
    })

    target.isScaling = true
    transform.scaleX = 1
    transform.scaleY = 1

    return Object.freeze({ ...committed, scale: appliedScale })
  }

  /** Удаляет временное состояние углового скейлинга конкретного текста. */
  public clearStandaloneCornerScale({ target }: { target: EditorTextbox }): void {
    this.scalingState.delete(target)
    target.isScaling = false
  }

  /** Сохраняет текущее состояние жеста, но возвращает прежнее округление для его завершения. */
  public prepareStandaloneCornerScaleForLegacyCommit({
    target
  }: {
    target: EditorTextbox
  }): void {
    const state = this.scalingState.get(target)
    if (!state) throw new Error('Для перехода на прежнее завершение должен существовать активный скейлинг текста')

    state.shouldRoundDimensionsOnCommit = true
  }

  /**
   * Продолжает скейлинг по положению указателя, если Fabric уже не отправляет `object:scaling`.
   */
  public handleMouseMove = (event: TPointerEventInfo<TPointerEvent>): void => {
    const canvas = this.canvas as CanvasWithCurrentTransform
    const transform = canvas._currentTransform
    if (!transform) return

    const { target } = transform
    if (!isTextbox(target) || isShapeOwnedTextbox(target)) return

    const state = this.scalingState.get(target)
    if (!state || !event.e) return

    const axisState = resolveTextScalingAxisState({ transform })
    const { isCornerHandle, isHorizontalHandle, isVerticalHandle } = axisState
    if (!isHorizontalHandle && !isVerticalHandle && !isCornerHandle) return

    const pointerScalingStep = resolvePointerTextScalingStep({
      textbox: target,
      transform,
      scenePoint: this.canvas.getScenePoint(event.e)
    })
    if (!pointerScalingStep) return

    const scaleOriginX = transform.originX ?? target.originX ?? 'center'
    const scaleOriginY = transform.originY ?? target.originY ?? 'center'
    const step = resolvePointerFallbackScaleStep({
      anchorPlacement: this.canvasManager.getObjectPlacement({
        object: target,
        originX: scaleOriginX,
        originY: scaleOriginY
      }),
      axisState,
      pointerStep: pointerScalingStep,
      state
    })
    if (!step) return

    const previous = captureCurrentTextScaleState({ state, textbox: target })
    const { appliedWidth, dimensionsRounded } = this._materializeTextScaleStep({
      axisState,
      state,
      step,
      target,
      transform
    })

    this._updateScalingStateAfterLiveCommit({
      textbox: target,
      state,
      appliedWidth,
      previous,
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
   * Применяет рассчитанный шаг к ширине, шрифту, отступам и радиусам отдельного текста.
   */
  public handleObjectScaling = (event: TextScalingTargetEvent): void => {
    const { target, transform } = event
    if (target instanceof ActiveSelection || !isTextbox(target) || isShapeOwnedTextbox(target) || !transform) return

    target.isScaling = true

    const state = this._ensureScalingState({
      textbox: target,
      transform
    })
    const previous = captureCurrentTextScaleState({ state, textbox: target })
    const axisState = resolveTextScalingAxisState({ transform })
    const { isCornerHandle, isHorizontalHandle, isVerticalHandle } = axisState
    const corner = transform.corner ?? ''

    if (!isHorizontalHandle && !isVerticalHandle && !isCornerHandle) return

    const rawScaleX = target.scaleX ?? transform.scaleX ?? 1
    const rawScaleY = target.scaleY ?? transform.scaleY ?? 1
    const scaleOriginX = transform.originX ?? target.originX ?? 'center'
    const scaleOriginY = transform.originY ?? target.originY ?? 'center'
    const step = resolveObjectTextScaleStep({
      anchorPlacement: this.canvasManager.getObjectPlacement({
        object: target,
        originX: scaleOriginX,
        originY: scaleOriginY
      }),
      axisState,
      corner,
      rawScaleX,
      rawScaleY,
      scaleOriginX,
      scaleOriginY,
      state
    })
    const { appliedWidth, dimensionsRounded } = this._materializeTextScaleStep({
      axisState,
      state,
      step,
      target,
      transform
    })

    this.canvas.requestRenderAll()

    if (!step.shouldStoreLastAllowedState) return

    this._updateScalingStateAfterLiveCommit({
      textbox: target,
      state,
      appliedWidth,
      previous,
      dimensionsRounded,
      isCornerHandle,
      isHorizontalHandle,
      isVerticalHandle,
      originX: scaleOriginX,
      originY: scaleOriginY
    })
  }

  /** Применяет рассчитанный шаг прежнего пути и синхронизирует активный Fabric-transform. */
  private _materializeTextScaleStep({
    axisState,
    state,
    step,
    target,
    transform
  }: MaterializeTextScaleStepOptions): CommitStandaloneTextScaleResult {
    const { isCornerHandle, isHorizontalHandle, isVerticalHandle } = axisState
    const result = commitStandaloneTextboxScale({
      textbox: target,
      canvasManager: this.canvasManager,
      base: state.startBase,
      placement: state.startObjectPlacement,
      anchorPlacement: step.anchorPlacement,
      widthScale: step.widthScale,
      heightScale: step.heightScale,
      shouldScaleFontSize: isCornerHandle || isVerticalHandle,
      shouldScalePadding: isCornerHandle || isVerticalHandle,
      shouldScaleRadii: isCornerHandle || isVerticalHandle,
      shouldDisableAutoExpandOnHorizontalChange: isHorizontalHandle,
      shouldRoundDimensions: !isCornerHandle
    })

    syncLiveTextScalingTransform({
      textbox: target,
      transform,
      appliedWidth: result.appliedWidth
    })

    return result
  }

  /**
   * Завершает трансформацию текстового объекта и фиксирует обновлённые стили и размеры через общий update pipeline.
   */
  public handleObjectModified = (event: TextScalingModifiedEvent): void => {
    const { target } = event

    if (target instanceof ActiveSelection) {
      this._commitActiveSelectionScale({ selection: target })
      return
    }

    if (!isTextbox(target)) return
    if (isShapeOwnedTextbox(target)) return

    this._commitStandaloneTextboxScale({ textbox: target })
  }

  /** Завершает прежний путь скейлинга общего выделения, содержащего текст. */
  private _commitActiveSelectionScale({ selection }: { selection: ActiveSelection }): void {
    const objects = selection.getObjects()
    const hasText = objects.some((object) => isTextbox(object))
    if (!hasText) return

    const { scaleX = 1, scaleY = 1 } = selection
    if (Math.abs(scaleX - 1) < DIMENSION_EPSILON && Math.abs(scaleY - 1) < DIMENSION_EPSILON) return

    this.canvas.discardActiveObject()

    objects.forEach((object) => {
      this.commitStandaloneTextScale({ target: object })
      object.setCoords()
    })

    const nextSelection = new ActiveSelection(objects, { canvas: this.canvas })
    this.canvas.setActiveObject(nextSelection)
    this.canvas.requestRenderAll()
  }

  /** Фиксирует канонические свойства отдельного текста после завершения скейлинга. */
  private _commitStandaloneTextboxScale({ textbox }: { textbox: EditorTextbox }): void {
    textbox.isScaling = false

    const state = this.scalingState.get(textbox)
    this.scalingState.delete(textbox)
    if (!state?.hasScalingChange) return

    const width = textbox.width ?? textbox.calcTextWidth()
    const {
      fontSize: startFontSize,
      styles: startStyles
    } = state.startBase
    const fontSize = textbox.fontSize ?? startFontSize ?? 16
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
    } = textbox

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
      target: textbox,
      style: styleUpdates,
      shouldRoundDimensions: state.shouldRoundDimensionsOnCommit
    })

    textbox.set({ scaleX: 1, scaleY: 1 })
    textbox.setCoords()
  }

  /**
   * Создаёт или возвращает состояние текущего жеста скейлинга текста.
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
        shouldRoundDimensionsOnCommit: true,
        hasScalingChange: false
      }
      this.scalingState.set(textbox, state)
    }

    return state
  }

  /**
   * Обновляет состояние текущего скейлинга после применения шага.
   */
  private _updateScalingStateAfterLiveCommit(
    {
      textbox,
      state,
      appliedWidth,
      previous,
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
      previous: TextScaleCurrentState
      dimensionsRounded: boolean
      isCornerHandle: boolean
      isHorizontalHandle: boolean
      isVerticalHandle: boolean
      originX: FabricObject['originX']
      originY: FabricObject['originY']
    }
  ): void {
    const current = captureCurrentTextScaleState({ state, textbox })
    const { widthScale, heightScale } = resolveAppliedTextScaleState({
      appliedWidth,
      current,
      isCornerHandle,
      isHorizontalHandle,
      isVerticalHandle,
      state
    })

    this._storeLastAllowedScalingState({
      textbox,
      state,
      widthScale,
      heightScale,
      originX,
      originY
    })

    state.hasScalingChange = state.hasScalingChange || hasTextScaleStateChanged({
      appliedWidth,
      current,
      previous,
      dimensionsRounded
    })
  }

  /**
   * Сохраняет последнее допустимое состояние, к которому можно вернуться в текущем жесте.
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
