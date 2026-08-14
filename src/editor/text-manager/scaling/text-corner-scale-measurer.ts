import type { Transform } from 'fabric'
import type CanvasManager from '../../canvas-manager'
import type { ObjectPlacement } from '../../canvas-manager'
import { getObjectExactBounds, type ObjectBounds } from '../../utils/geometry'
import type { ScaleStepProjectionInput } from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { EditorTextbox, TextScaleBaseState } from '../types'
import {
  captureTextScaleBase,
  commitStandaloneTextboxScale,
  resolveMinimumTextScalingBounds
} from './text-scaling-materialization'
import { createTextScalingMeasurementTextbox } from './text-scaling-measurement'
import {
  createTextCornerScaleStepProjection,
  type TextCornerScaleGestureProjection,
  type TextCornerScaleProjectionSample
} from './text-corner-scale-projection'
import {
  captureTextCornerScaleCanonicalState,
  type TextCornerScaleCanonicalState
} from './text-corner-scale-state'

/** Малый шаг, по которому строится локальная зависимость границ от множителя. */
const TEXT_CORNER_SCALE_MEASUREMENT_STEP = 0.01

/** Максимальное число увеличений шага при поиске различимой локальной геометрии текста. */
const MAX_TEXT_CORNER_SCALE_NEIGHBOR_STEPS = 8

/** Число последних измерений, сохраняемых между уточнениями одного движения указателя. */
const TEXT_CORNER_SCALE_MEASUREMENT_CACHE_SIZE = 2

/** Допуск, внутри которого измеренная грань считается неподвижной. */
const TEXT_CORNER_SCALE_EDGE_EPSILON = 0.000000001

/** Точная геометрия текста при проверяемом пропорциональном множителе. */
export type TextCornerScaleMeasurement = Readonly<{
  canonicalState: TextCornerScaleCanonicalState
  projection: ScaleStepProjectionInput
  scale: number
}>

/** Возвращает положение неподвижной точки углового скейлинга. */
function createFixedAnchorPlacement({
  gesture,
  transform
}: {
  gesture: TextCornerScaleGestureProjection
  transform: Transform
}): ObjectPlacement {
  return {
    left: gesture.fixedAnchor.x,
    top: gesture.fixedAnchor.y,
    originX: transform.originX,
    originY: transform.originY
  }
}

/** Измеряет каноническую геометрию текста, не изменяя объект на холсте. */
export default class TextCornerScaleMeasurer {
  /** Базовые свойства измерительного текста. */
  private readonly base: TextScaleBaseState

  /** Менеджер координат, необходимый общей материализации текста. */
  private readonly canvasManager: CanvasManager

  /** Неподвижная точка и прямоугольная проекция текущего жеста. */
  private readonly gesture: TextCornerScaleGestureProjection

  /** Минимальный множитель, при котором сохраняются допустимые размеры текста. */
  private readonly minimumScale: number

  /** Последние измерения множителей от самого старого к самому новому. */
  private readonly measurements = new Map<number, TextCornerScaleMeasurement>()

  /** Исходное положение текста. */
  private readonly placement: ObjectPlacement

  /** Отдельный Textbox, который не добавляется на холст. */
  private readonly textbox: EditorTextbox

  /** Преобразование нужно только для восстановления неподвижной точки. */
  private readonly transform: Transform

  /** Создаёт независимый измерительный Textbox с исходными свойствами объекта на холсте. */
  constructor({
    canvasManager,
    gesture,
    target,
    transform
  }: {
    canvasManager: CanvasManager
    gesture: TextCornerScaleGestureProjection
    target: EditorTextbox
    transform: Transform
  }) {
    this.canvasManager = canvasManager
    this.gesture = gesture
    this.placement = canvasManager.getObjectPlacement({ object: target })
    this.textbox = createTextScalingMeasurementTextbox({ target })
    this.base = captureTextScaleBase({ textbox: this.textbox })
    this.minimumScale = resolveMinimumTextScalingBounds({ base: this.base }).proportionalScale
    this.transform = transform
  }

  /** Возвращает точные границы после применения проверяемого множителя. */
  public measure({ scale }: { scale: number }): TextCornerScaleMeasurement {
    const appliedScale = Math.max(this.minimumScale, scale)
    const cached = this.measurements.get(appliedScale)
    if (cached) {
      this.measurements.delete(appliedScale)
      this.measurements.set(appliedScale, cached)

      return cached
    }

    const { bounds, canonicalState } = this._measureCanonicalState({ scale: appliedScale })
    const samples = this._resolveProjectionSamples({ bounds, scale: appliedScale })

    const projection = createTextCornerScaleStepProjection({
      bounds,
      gesture: this.gesture,
      samples,
      scale: appliedScale
    })
    if (!projection) throw new Error('Не удалось построить проекцию скейлинга текста')

    const measurement = Object.freeze({ canonicalState, projection, scale: appliedScale })
    this.measurements.set(appliedScale, measurement)
    if (this.measurements.size > TEXT_CORNER_SCALE_MEASUREMENT_CACHE_SIZE) {
      const oldestScale = this.measurements.keys().next().value
      if (typeof oldestScale !== 'number') throw new Error('Кеш измерений текста не должен быть пустым')

      this.measurements.delete(oldestScale)
    }

    return measurement
  }

  /** Подбирает соседние множители, на которых меняется локальная геометрия текста. */
  private _resolveProjectionSamples({
    bounds,
    scale
  }: {
    bounds: ObjectBounds
    scale: number
  }): readonly TextCornerScaleProjectionSample[] {
    for (let step = 0; step < MAX_TEXT_CORNER_SCALE_NEIGHBOR_STEPS; step += 1) {
      const delta = TEXT_CORNER_SCALE_MEASUREMENT_STEP * (2 ** step)
      const lowerScale = Math.max(this.minimumScale, scale - delta)
      const candidateScales = lowerScale < scale
        ? [lowerScale, scale + delta]
        : [scale + delta]
      const samples = candidateScales.map((candidateScale) => Object.freeze({
        bounds: this._measureBounds({ scale: candidateScale }),
        scale: candidateScale
      }))
      const changesGeometry = samples.some((sample) => {
        return this.gesture.movingEdges.some((edge) => {
          return Math.abs(sample.bounds[edge] - bounds[edge]) > TEXT_CORNER_SCALE_EDGE_EPSILON
        })
      })
      if (changesGeometry) return Object.freeze(samples)
    }

    throw new Error('Не удалось найти различимую геометрию углового скейлинга текста')
  }

  /** Применяет заданный множитель и возвращает точные границы текста. */
  private _measureBounds({ scale }: { scale: number }): ObjectBounds {
    return this._measureCanonicalState({ scale }).bounds
  }

  /** Применяет заданный множитель и возвращает границы вместе с каноническими свойствами текста. */
  private _measureCanonicalState({
    scale
  }: {
    scale: number
  }): Readonly<{ bounds: ObjectBounds; canonicalState: TextCornerScaleCanonicalState }> {
    commitStandaloneTextboxScale({
      textbox: this.textbox,
      canvasManager: this.canvasManager,
      base: this.base,
      widthScale: scale,
      heightScale: scale,
      placement: this.placement,
      anchorPlacement: createFixedAnchorPlacement({
        gesture: this.gesture,
        transform: this.transform
      }),
      shouldScaleFontSize: true,
      shouldScalePadding: true,
      shouldScaleRadii: true,
      shouldRoundDimensions: false
    })

    const bounds = getObjectExactBounds({ object: this.textbox })
    if (!bounds) throw new Error('Не удалось измерить геометрию текста после скейлинга')

    return Object.freeze({
      canonicalState: captureTextCornerScaleCanonicalState({ textbox: this.textbox }),
      bounds
    })
  }

  /** Освобождает внутренние ресурсы измерительного Textbox. */
  public dispose(): void {
    this.measurements.clear()
    this.textbox.dispose()
  }
}
