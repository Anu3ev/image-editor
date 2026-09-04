import {
  Point,
  util,
  type ActiveSelection,
  type FabricObject,
  type TMat2D,
  type Transform
} from 'fabric'
import type CanvasManager from '../../canvas-manager'
import type { ObjectPlacement } from '../../canvas-manager'
import {
  createRectangularScaleProjectionModes,
  createRectangularScaleValues,
  resolveRectangularScaleMultipliers,
  type RectangularScaleGestureMode,
  type RectangularScaleGestureProjection,
  type RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ScaleProjectionModeInput } from '../../snapping-manager/scaling/scale-snapping-resolver'
import {
  createScaleProjection,
  resolveScaleProjection,
  type ScaleProjectionConstraint
} from '../../snapping-manager/scaling/scale-projection'
import type { ObjectBounds } from '../../utils/geometry'
import type { EditorTextbox, TextScaleBaseState } from '../types'
import {
  captureTextScaleBase,
  commitStandaloneTextboxScale,
  resolveMinimumTextScalingBounds
} from './text-scaling-materialization'
import { createTextScalingMeasurementTextbox } from './text-scaling-measurement'
import {
  areTextCornerScaleCanonicalStatesEqual,
  captureTextCornerScaleCanonicalState,
  type TextCornerScaleCanonicalState
} from './text-corner-scale-state'
import {
  createActiveSelectionTextScaleStepProjection,
  type ActiveSelectionTextScaleProjectionSample
} from './active-selection-scale-projection'

/** Точка в неизменяемой локальной плоскости общего выделения. */
type ActiveSelectionTextScalePoint = Readonly<{ x: number; y: number }>

/** Каноническое состояние и положение одного текста на измеренном шаге. */
export type ActiveSelectionTextScaleChildMeasurement = Readonly<{
  canonicalState: TextCornerScaleCanonicalState
  center: ActiveSelectionTextScalePoint
  target: EditorTextbox
}>

/** Линейная геометрия нетекстового ребёнка на измеренном шаге. */
export type ActiveSelectionAffineScaleChildMeasurement = Readonly<{
  center: ActiveSelectionTextScalePoint
  scaleX: number
  scaleY: number
  target: FabricObject
}>

/** Измеренная рамка общего выделения в его исходной локальной плоскости. */
type ActiveSelectionTextScaleFrame = Readonly<{
  center: ActiveSelectionTextScalePoint
  height: number
  scaleX: number
  scaleY: number
  width: number
}>

/** Точная каноническая геометрия всех детей для одного набора множителей. */
export type ActiveSelectionTextScaleMeasurement = Readonly<{
  affineChildren: readonly ActiveSelectionAffineScaleChildMeasurement[]
  bounds: ObjectBounds
  children: readonly ActiveSelectionTextScaleChildMeasurement[]
  frame: ActiveSelectionTextScaleFrame
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  projection: ReturnType<typeof createActiveSelectionTextScaleStepProjection>
  values: readonly number[]
}>

/** Исходное состояние одного живого и одного измерительного текста. */
type ActiveSelectionTextScaleItem = Readonly<{
  base: TextScaleBaseState
  measurementTextbox: EditorTextbox
  placement: ObjectPlacement
  startCenter: ActiveSelectionTextScalePoint
  target: EditorTextbox
}>

/** Исходная геометрия нетекстового ребёнка, которая меняется линейно вместе с рамкой. */
type ActiveSelectionAffineScaleItem = Readonly<{
  height: number
  scaleX: number
  scaleY: number
  startCenter: ActiveSelectionTextScalePoint
  target: FabricObject
  width: number
}>

/** Каноническая геометрия до построения локальной линейной проекции. */
type ActiveSelectionTextCanonicalGeometry = Omit<ActiveSelectionTextScaleMeasurement, 'projection'>

/** Минимальные множители, допустимые для всех текстов выделения. */
type ActiveSelectionTextMinimumMultipliers = Readonly<{
  font: number
  proportional: number
  width: number
}>

/** Неизменяемые свойства рамки в начале жеста. */
type ActiveSelectionTextScaleBaseline = Readonly<{
  angle: number
  fixedAnchor: ActiveSelectionTextScalePoint
  fixedAnchorLocal: ActiveSelectionTextScalePoint
  height: number
  matrix: TMat2D
  width: number
}>

/** Малый шаг для построения локальной зависимости граней от множителей. */
const ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_STEP = 0.01

/** Максимальное число увеличений шага при поиске различимой геометрии. */
const MAX_ACTIVE_SELECTION_TEXT_SCALE_NEIGHBOR_STEPS = 8

/** Максимальное число уточнений канонических множителей по положению указателя. */
const MAX_ACTIVE_SELECTION_TEXT_POINTER_REFINEMENT_STEPS = 8

/** Число измерений, сохраняемых между движениями одного жеста. */
const ACTIVE_SELECTION_TEXT_SCALE_CACHE_SIZE = 16

/** Число канонических геометрий, сохраняемых для основного и соседних измерений. */
const ACTIVE_SELECTION_TEXT_SCALE_GEOMETRY_CACHE_SIZE = 48

/** Допуск проверки измеренной и применённой геометрии. */
const ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_EPSILON = 0.000001

/** Создаёт точные границы из четырёх координат. */
function createBounds({
  bottom,
  left,
  right,
  top
}: {
  bottom: number
  left: number
  right: number
  top: number
}): ObjectBounds {
  if (![bottom, left, right, top].every(Number.isFinite) || right <= left || bottom <= top) {
    throw new Error('Измеренные границы выделения с текстами должны иметь конечный положительный размер')
  }

  return Object.freeze({
    bottom,
    left,
    right,
    top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2
  })
}

/** Создаёт локальную рамку измеренного выделения относительно исходных размеров. */
function createSelectionScaleFrame({
  baseline,
  bounds
}: {
  baseline: ActiveSelectionTextScaleBaseline
  bounds: ObjectBounds
}): ActiveSelectionTextScaleFrame {
  const width = bounds.right - bounds.left
  const height = bounds.bottom - bounds.top

  return Object.freeze({
    center: Object.freeze({ x: bounds.centerX, y: bounds.centerY }),
    height,
    scaleX: width / baseline.width,
    scaleY: height / baseline.height,
    width
  })
}

/** Объединяет точные границы всех измеряемых детей общего выделения. */
function mergeBounds({ bounds }: { bounds: readonly ObjectBounds[] }): ObjectBounds {
  if (bounds.length < 2) throw new Error('Измерение общего выделения требует минимум два объекта')

  return createBounds({
    bottom: Math.max(...bounds.map(({ bottom }) => bottom)),
    left: Math.min(...bounds.map(({ left }) => left)),
    right: Math.max(...bounds.map(({ right }) => right)),
    top: Math.min(...bounds.map(({ top }) => top))
  })
}

/** Переводит Fabric-origin в смещение относительно центра рамки. */
function resolveOriginOffset({ origin }: { origin: Transform['originX'] | Transform['originY'] }): number {
  if (origin === 'left' || origin === 'top') return -0.5
  if (origin === 'right' || origin === 'bottom') return 0.5
  if (origin === 'center') return 0
  if (typeof origin === 'number' && Number.isFinite(origin)) return origin - 0.5

  throw new Error('Скейлинг выделения с текстами требует поддерживаемую неподвижную точку')
}

/** Возвращает смещение, совмещающее неподвижную точку измеренной рамки с началом жеста. */
function resolveFrameTranslation({
  bounds,
  fixedAnchor,
  transform
}: {
  bounds: ObjectBounds
  fixedAnchor: ActiveSelectionTextScalePoint
  transform: Transform
}): ActiveSelectionTextScalePoint {
  const width = bounds.right - bounds.left
  const height = bounds.bottom - bounds.top
  const originX = bounds.centerX + (resolveOriginOffset({ origin: transform.originX }) * width)
  const originY = bounds.centerY + (resolveOriginOffset({ origin: transform.originY }) * height)

  return Object.freeze({ x: fixedAnchor.x - originX, y: fixedAnchor.y - originY })
}

/** Рассчитывает центр ребёнка относительно неподвижной точки исходной рамки. */
function resolveScaledChildCenter({
  fixedAnchor,
  multipliers,
  startCenter
}: {
  fixedAnchor: ActiveSelectionTextScalePoint
  multipliers: RectangularScaleMultipliers
  startCenter: ActiveSelectionTextScalePoint
}): ActiveSelectionTextScalePoint {
  return Object.freeze({
    x: fixedAnchor.x + ((startCenter.x - fixedAnchor.x) * multipliers.x),
    y: fixedAnchor.y + ((startCenter.y - fixedAnchor.y) * multipliers.y)
  })
}

/** Проецирует локальную рамку через исходный поворот и положение выделения. */
function projectLocalBoundsToScene({
  bounds,
  matrix
}: {
  bounds: ObjectBounds
  matrix: TMat2D
}): ObjectBounds {
  const corners = [
    new Point(bounds.left, bounds.top),
    new Point(bounds.right, bounds.top),
    new Point(bounds.right, bounds.bottom),
    new Point(bounds.left, bounds.bottom)
  ].map((point) => point.transform(matrix))

  return createBounds({
    bottom: Math.max(...corners.map(({ y }) => y)),
    left: Math.min(...corners.map(({ x }) => x)),
    right: Math.max(...corners.map(({ x }) => x)),
    top: Math.min(...corners.map(({ y }) => y))
  })
}

/** Сравнивает два конечных числа в пределах допуска измерения. */
function areNumbersNear({ first, second }: { first: number; second: number }): boolean {
  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_EPSILON
}

/** Проверяет, что измеренная рамка достигла всех размеров, заданных указателем. */
function didReachPointerFrameConstraints({
  constraints,
  geometry
}: {
  constraints: readonly ScaleProjectionConstraint[]
  geometry: ActiveSelectionTextCanonicalGeometry
}): boolean {
  return constraints.every(({ edge, position }) => {
    const actual = edge === 'right' ? geometry.frame.scaleX : geometry.frame.scaleY

    return areNumbersNear({ first: actual, second: position })
  })
}

/** Проверяет, что повторное измерение не изменило канонические множители. */
function haveSameCanonicalValues({
  first,
  second
}: {
  first: readonly number[]
  second: readonly number[]
}): boolean {
  if (first.length !== second.length) return false

  return first.every((value, index) => areNumbersNear({ first: value, second: second[index] }))
}

/** Измеряет и применяет каноническую геометрию текстов одного общего выделения. */
export default class ActiveSelectionTextScaleMeasurer {
  /** Нетекстовые дети, которые должны сохранить линейное изменение размера. */
  private readonly affineItems: readonly ActiveSelectionAffineScaleItem[]

  /** Неизменяемая рамка начала жеста. */
  private readonly baseline: ActiveSelectionTextScaleBaseline

  /** Менеджер холста, используемый при переносе рассчитанных размеров в свойства текста. */
  private readonly canvasManager: CanvasManager

  /** Живые тексты и их независимые измерительные копии. */
  private readonly items: readonly ActiveSelectionTextScaleItem[]

  /** Общие минимальные множители всех текстов. */
  private readonly minimums: ActiveSelectionTextMinimumMultipliers

  /** Режимы общей прямоугольной проекции текущей ручки. */
  private readonly projectionModes: readonly ScaleProjectionModeInput[]

  /** Измерения канонических множителей, используемые при уточнении прилипания. */
  private readonly canonicalMeasurements = new Map<string, ActiveSelectionTextScaleMeasurement>()

  /** Измерения, соответствующие положению указателя в текущем жесте. */
  private readonly pointerMeasurements = new Map<string, ActiveSelectionTextScaleMeasurement>()

  /** Каноническая геометрия основного и соседних измерений без повторного пересчёта текста. */
  private readonly canonicalGeometries = new Map<string, ActiveSelectionTextCanonicalGeometry>()

  /** Общее выделение, которому принадлежит сессия. */
  private readonly selection: ActiveSelection

  /** Исходное преобразование Fabric. */
  private readonly transform: Transform

  /** Последнее состояние, применённое к живым дочерним объектам. */
  private lastAppliedMeasurement: ActiveSelectionTextScaleMeasurement | null = null

  /** Создаёт измеритель от неизменяемого начала поддерживаемого жеста. */
  constructor({
    affineChildren = [],
    canvasManager,
    children,
    projection,
    selection,
    transform
  }: {
    affineChildren?: readonly FabricObject[]
    canvasManager: CanvasManager
    children: readonly EditorTextbox[]
    projection: RectangularScaleGestureProjection
    selection: ActiveSelection
    transform: Transform
  }) {
    if (children.length < 1) throw new Error('Скейлинг состава с текстом требует хотя бы один текст')
    if (children.length + affineChildren.length < 2) {
      throw new Error('Скейлинг общего выделения требует минимум два объекта')
    }

    this.canvasManager = canvasManager
    this.selection = selection
    this.transform = transform
    this.projectionModes = createRectangularScaleProjectionModes({ projection })
    this.baseline = this._captureBaseline({ projection, selection })
    this.items = Object.freeze(children.map((target) => this._createItem({ target })))
    this.affineItems = Object.freeze(affineChildren.map((target) => this._createAffineItem({ target })))
    this.minimums = this._resolveMinimumMultipliers()
  }

  /** Возвращает точное каноническое состояние для текущих множителей указателя. */
  public measure({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextScaleMeasurement {
    const requestedMultipliers = this._clampMultipliers({ mode, multipliers })
    const requestedValues = createRectangularScaleValues({ mode, multipliers: requestedMultipliers })
    const key = this._createMeasurementKey({ mode, values: requestedValues })
    const cached = this.pointerMeasurements.get(key)
    if (cached) return cached

    const geometry = this._resolvePointerGeometry({
      mode,
      rawMultipliers: multipliers,
      requestedMultipliers
    })
    const measurement = this._measureCanonicalMultipliers({ mode, multipliers: geometry.multipliers })
    this._rememberMeasurement({ cache: this.pointerMeasurements, key, measurement })

    return measurement
  }

  /** Измеряет состояние по каноническим значениям уточнённого плана. */
  public measureValues({
    mode,
    values
  }: {
    mode: RectangularScaleGestureMode
    values: readonly number[]
  }): ActiveSelectionTextScaleMeasurement {
    return this._measureCanonicalMultipliers({
      mode,
      multipliers: resolveRectangularScaleMultipliers({
        projectionMode: mode,
        effectiveValues: values
      })
    })
  }

  /** Один раз переносит измеренное каноническое состояние в живые тексты и рамку. */
  public apply({ measurement }: { measurement: ActiveSelectionTextScaleMeasurement }): void {
    const { frame } = measurement
    const fixedAnchor = new Point(this.baseline.fixedAnchor.x, this.baseline.fixedAnchor.y)

    this.selection.set({
      angle: this.baseline.angle,
      flipX: false,
      flipY: false,
      height: this.baseline.height,
      scaleX: frame.scaleX,
      scaleY: frame.scaleY,
      skewX: 0,
      skewY: 0,
      width: this.baseline.width
    })
    this.selection.setPositionByOrigin(fixedAnchor, this.transform.originX, this.transform.originY)

    measurement.children.forEach((childMeasurement, index) => {
      const item = this.items[index]
      if (!item || item.target !== childMeasurement.target) {
        throw new Error('Измеренное состояние должно соответствовать исходному порядку текстов')
      }

      this._applyChildMeasurement({
        childMeasurement,
        frame,
        item,
        mode: measurement.mode
      })
    })

    measurement.affineChildren.forEach((childMeasurement, index) => {
      const item = this.affineItems[index]
      if (!item || item.target !== childMeasurement.target) {
        throw new Error('Линейная геометрия должна соответствовать исходному порядку объектов')
      }

      this._applyAffineChildMeasurement({ childMeasurement, frame, item })
    })

    this.transform.scaleX = this.selection.scaleX
    this.transform.scaleY = this.selection.scaleY
    this.selection.setCoords()
    this._assertAppliedMeasurement({ measurement })
    this.lastAppliedMeasurement = measurement
  }

  /** Проверяет, было ли применено хотя бы одно измеренное состояние. */
  public hasAppliedMeasurement(): boolean {
    return this.lastAppliedMeasurement !== null
  }

  /** Возвращает последнее применённое состояние текущего жеста без повторного измерения. */
  public getLastAppliedMeasurement(): ActiveSelectionTextScaleMeasurement | null {
    return this.lastAppliedMeasurement
  }

  /** Восстанавливает последнее применённое состояние после предварительной мутации Fabric. */
  public restoreAppliedMeasurement(): boolean {
    const measurement = this.lastAppliedMeasurement
    if (!measurement) return false

    this.apply({ measurement })

    return true
  }

  /** Освобождает измерительные тексты и кеш текущего жеста. */
  public dispose(): void {
    this.canonicalGeometries.clear()
    this.canonicalMeasurements.clear()
    this.pointerMeasurements.clear()
    this.items.forEach(({ measurementTextbox }) => measurementTextbox.dispose())
    this.lastAppliedMeasurement = null
  }

  /** Сохраняет исходную рамку и переводит неподвижную точку в её локальную плоскость. */
  private _captureBaseline({
    projection,
    selection
  }: {
    projection: RectangularScaleGestureProjection
    selection: ActiveSelection
  }): ActiveSelectionTextScaleBaseline {
    const matrix = [...selection.calcTransformMatrix()] as TMat2D
    if (!matrix.every(Number.isFinite)) throw new Error('Матрица выделения с текстами должна быть конечной')

    const fixedAnchorLocal = new Point(projection.fixedAnchor.x, projection.fixedAnchor.y)
      .transform(util.invertTransform(matrix))

    return Object.freeze({
      angle: selection.angle ?? 0,
      fixedAnchor: Object.freeze({ ...projection.fixedAnchor }),
      fixedAnchorLocal: Object.freeze({ x: fixedAnchorLocal.x, y: fixedAnchorLocal.y }),
      height: selection.height,
      matrix,
      width: selection.width
    })
  }

  /** Создаёт измерительную копию и сохраняет исходное состояние живого текста. */
  private _createItem({ target }: { target: EditorTextbox }): ActiveSelectionTextScaleItem {
    const measurementTextbox = createTextScalingMeasurementTextbox({ target })

    return Object.freeze({
      base: captureTextScaleBase({ textbox: target }),
      measurementTextbox,
      placement: this.canvasManager.getObjectPlacement({ object: target }),
      startCenter: Object.freeze({ ...target.getRelativeCenterPoint() }),
      target
    })
  }

  /** Сохраняет исходный размер и положение нетекстового ребёнка в локальной плоскости выделения. */
  private _createAffineItem({ target }: { target: FabricObject }): ActiveSelectionAffineScaleItem {
    const hasUnsupportedState = [
      target.parent,
      target.flipX,
      target.flipY,
      target.locked,
      target.lockScalingX,
      target.lockScalingY
    ].some(Boolean)
    const canonicalValues = [target.angle ?? 0, target.skewX ?? 0, target.skewY ?? 0, target.strokeWidth ?? 0]
    if (target.group !== this.selection || hasUnsupportedState
      || canonicalValues.some((value) => !areNumbersNear({ first: value, second: 0 }))) {
      throw new Error('Линейный ребёнок должен иметь каноническое преобразование')
    }

    const width = target.width * target.scaleX
    const height = target.height * target.scaleY
    if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new Error('Линейный ребёнок должен иметь конечный положительный размер')
    }

    return Object.freeze({
      height,
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      startCenter: Object.freeze({ ...target.getRelativeCenterPoint() }),
      target,
      width
    })
  }

  /** Возвращает самые строгие ограничения ширины и размера шрифта всех текстов. */
  private _resolveMinimumMultipliers(): ActiveSelectionTextMinimumMultipliers {
    let width = 0
    let font = 0
    let proportional = 0

    this.items.forEach(({ base }) => {
      const minimum = resolveMinimumTextScalingBounds({ base })
      width = Math.max(width, minimum.widthScale)
      font = Math.max(font, minimum.fontScale)
      proportional = Math.max(proportional, minimum.proportionalScale)
    })

    return Object.freeze({ font, proportional, width })
  }

  /** Ограничивает общий множитель минимальными размерами каждого текста. */
  private _clampMultipliers({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): RectangularScaleMultipliers {
    if (mode === 'vertical') throw new Error('Вертикальные боковые ручки скрыты для выделения с текстами')

    if (mode === 'uniform') {
      const scale = Math.max(this.minimums.proportional, multipliers.x)
      return Object.freeze({ x: scale, y: scale })
    }
    if (mode === 'horizontal') {
      return Object.freeze({ x: Math.max(this.minimums.width, multipliers.x), y: 1 })
    }

    return Object.freeze({
      x: Math.max(this.minimums.width, multipliers.x),
      y: Math.max(this.minimums.font, multipliers.y)
    })
  }

  /** Возвращает режим проекции текущей ручки. */
  private _resolveProjectionMode({ mode }: { mode: RectangularScaleGestureMode }): ScaleProjectionModeInput {
    const projectionMode = this.projectionModes.find(({ id }) => id === mode)
    if (!projectionMode) throw new Error('Для текстового скейлинга должна существовать выбранная проекция')

    return projectionMode
  }

  /** Возвращает полное измерение для точных канонических множителей. */
  private _measureCanonicalMultipliers({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextScaleMeasurement {
    const appliedMultipliers = this._clampMultipliers({ mode, multipliers })
    const values = createRectangularScaleValues({ mode, multipliers: appliedMultipliers })
    const key = this._createMeasurementKey({ mode, values })
    const cached = this.canonicalMeasurements.get(key)
    if (cached) return cached

    const geometry = this._measureCanonicalGeometry({ mode, multipliers: appliedMultipliers })
    const projectionMode = this._resolveProjectionMode({ mode })
    const samples = this._createProjectionSamples({ geometry, projectionMode })
    const projection = createActiveSelectionTextScaleStepProjection({
      bounds: geometry.bounds,
      projectionMode,
      samples,
      values: geometry.values
    })
    const measurement = Object.freeze({ ...geometry, projection })
    this._rememberMeasurement({ cache: this.canonicalMeasurements, key, measurement })

    return measurement
  }

  /** Сохраняет измерение и удаляет самую старую запись при переполнении кеша. */
  private _rememberMeasurement({
    cache,
    key,
    measurement
  }: {
    cache: Map<string, ActiveSelectionTextScaleMeasurement>
    key: string
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    cache.set(key, measurement)
    if (cache.size <= ACTIVE_SELECTION_TEXT_SCALE_CACHE_SIZE) return

    const oldestKey = cache.keys().next().value
    if (typeof oldestKey !== 'string') throw new Error('Кеш измерений выделения с текстами не должен быть пустым')
    cache.delete(oldestKey)
  }

  /** Создаёт ключ измерения с учётом текущего режима автоматического расширения каждого текста. */
  private _createMeasurementKey({
    mode,
    values
  }: {
    mode: RectangularScaleGestureMode
    values: readonly number[]
  }): string {
    const autoExpandState = this.items
      .map(({ target }) => {
        return target.autoExpand === false ? 'fixed' : 'auto'
      })
      .join(':')

    return `${autoExpandState}:${mode}:${values.join(':')}`
  }

  /** Подбирает канонические множители, при которых видимая рамка следует за указателем. */
  private _resolvePointerGeometry({
    mode,
    rawMultipliers,
    requestedMultipliers
  }: {
    mode: RectangularScaleGestureMode
    rawMultipliers: RectangularScaleMultipliers
    requestedMultipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextCanonicalGeometry {
    const constraints = this._createPointerFrameConstraints({
      mode,
      rawMultipliers,
      requestedMultipliers
    })
    let geometry = this._measureCanonicalGeometry({ mode, multipliers: requestedMultipliers })
    if (constraints.length === 0) return geometry

    for (let step = 0; step < MAX_ACTIVE_SELECTION_TEXT_POINTER_REFINEMENT_STEPS; step += 1) {
      if (didReachPointerFrameConstraints({ constraints, geometry })) return geometry

      const nextMultipliers = this._resolvePointerCorrection({ constraints, geometry, mode })
      if (!nextMultipliers) return geometry

      const nextGeometry = this._measureCanonicalGeometry({ mode, multipliers: nextMultipliers })
      if (haveSameCanonicalValues({ first: nextGeometry.values, second: geometry.values })) return geometry
      geometry = nextGeometry
    }

    return geometry
  }

  /** Описывает размер рамки, который должен соответствовать положению указателя. */
  private _createPointerFrameConstraints({
    mode,
    rawMultipliers,
    requestedMultipliers
  }: {
    mode: RectangularScaleGestureMode
    rawMultipliers: RectangularScaleMultipliers
    requestedMultipliers: RectangularScaleMultipliers
  }): readonly ScaleProjectionConstraint[] {
    const constraints: ScaleProjectionConstraint[] = []
    const widthReachedMinimum = !areNumbersNear({ first: rawMultipliers.x, second: requestedMultipliers.x })
    const heightReachedMinimum = !areNumbersNear({ first: rawMultipliers.y, second: requestedMultipliers.y })

    if (!widthReachedMinimum) {
      constraints.push({ axis: 'x', edge: 'right', position: requestedMultipliers.x })
    }
    if (mode === 'free' && !heightReachedMinimum) {
      constraints.push({ axis: 'y', edge: 'bottom', position: requestedMultipliers.y })
    }

    return Object.freeze(constraints.map((constraint) => Object.freeze(constraint)))
  }

  /** Рассчитывает следующие множители по локальной зависимости размера рамки от текста. */
  private _resolvePointerCorrection({
    constraints,
    geometry,
    mode
  }: {
    constraints: readonly ScaleProjectionConstraint[]
    geometry: ActiveSelectionTextCanonicalGeometry
    mode: RectangularScaleGestureMode
  }): RectangularScaleMultipliers | null {
    const projectionMode = this._resolveProjectionMode({ mode })
    const samples = this._createNeighborGeometries({ geometry, projectionMode })
    const frameEdges = mode === 'free'
      ? (['right', 'bottom'] as const)
      : (['right'] as const)
    const projection = createScaleProjection({
      bounds: createBounds({
        bottom: geometry.frame.scaleY,
        left: 0,
        right: geometry.frame.scaleX,
        top: 0
      }),
      input: {
        variables: projectionMode.projection.variables,
        baselineValues: geometry.values,
        variableSceneWeights: projectionMode.projection.variableSceneWeights,
        edges: frameEdges.map((edge) => Object.freeze({
          edge,
          coefficients: Object.freeze(samples.map((sample, variableIndex) => {
            const current = edge === 'right' ? geometry.frame.scaleX : geometry.frame.scaleY
            const neighboring = edge === 'right' ? sample.frame.scaleX : sample.frame.scaleY
            const valueDelta = sample.values[variableIndex] - geometry.values[variableIndex]

            return (neighboring - current) / valueDelta
          }))
        }))
      }
    })
    const solution = resolveScaleProjection({
      projection,
      rawValues: geometry.values,
      constraints,
      epsilon: ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_EPSILON
    })
    if (!solution) return null

    const multipliers = resolveRectangularScaleMultipliers({
      projectionMode: mode,
      effectiveValues: solution.values
    })

    return this._clampMultipliers({ mode, multipliers })
  }

  /** Измеряет канонические тексты и итоговую рамку без изменения живого выделения. */
  private _measureCanonicalGeometry({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextCanonicalGeometry {
    const values = createRectangularScaleValues({ mode, multipliers })
    const key = this._createMeasurementKey({ mode, values })
    const cached = this.canonicalGeometries.get(key)
    if (cached) return cached

    const geometry = this._createCanonicalGeometry({ mode, multipliers })
    this.canonicalGeometries.set(key, geometry)
    if (this.canonicalGeometries.size > ACTIVE_SELECTION_TEXT_SCALE_GEOMETRY_CACHE_SIZE) {
      const oldestKey = this.canonicalGeometries.keys().next().value
      if (typeof oldestKey !== 'string') throw new Error('Кеш геометрии текстов не должен быть пустым')
      this.canonicalGeometries.delete(oldestKey)
    }

    return geometry
  }

  /** Рассчитывает канонические тексты и итоговую рамку для нового набора множителей. */
  private _createCanonicalGeometry({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextCanonicalGeometry {
    const measuredChildren = this.items.map((item) => this._measureChild({ item, mode, multipliers }))
    const measuredAffineChildren = this.affineItems.map((item) => {
      return this._measureAffineChild({ item, multipliers })
    })
    const merged = mergeBounds({
      bounds: [
        ...measuredChildren.map(({ bounds }) => bounds),
        ...measuredAffineChildren.map(({ bounds }) => bounds)
      ]
    })
    const translation = resolveFrameTranslation({
      bounds: merged,
      fixedAnchor: this.baseline.fixedAnchorLocal,
      transform: this.transform
    })
    const localBounds = createBounds({
      bottom: merged.bottom + translation.y,
      left: merged.left + translation.x,
      right: merged.right + translation.x,
      top: merged.top + translation.y
    })

    return Object.freeze({
      affineChildren: Object.freeze(measuredAffineChildren.map(({ bounds: _bounds, ...child }) => {
        return Object.freeze({
          ...child,
          center: Object.freeze({
            x: child.center.x + translation.x,
            y: child.center.y + translation.y
          })
        })
      })),
      bounds: projectLocalBoundsToScene({ bounds: localBounds, matrix: this.baseline.matrix }),
      children: Object.freeze(measuredChildren.map(({ bounds: _bounds, ...child }) => Object.freeze({
        ...child,
        center: Object.freeze({
          x: child.center.x + translation.x,
          y: child.center.y + translation.y
        })
      }))),
      frame: createSelectionScaleFrame({ baseline: this.baseline, bounds: localBounds }),
      mode,
      multipliers,
      values: createRectangularScaleValues({ mode, multipliers })
    })
  }

  /** Рассчитывает линейную геометрию нетекстового ребёнка от неизменяемого начала жеста. */
  private _measureAffineChild({
    item,
    multipliers
  }: {
    item: ActiveSelectionAffineScaleItem
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionAffineScaleChildMeasurement & Readonly<{ bounds: ObjectBounds }> {
    const center = resolveScaledChildCenter({
      fixedAnchor: this.baseline.fixedAnchorLocal,
      multipliers,
      startCenter: item.startCenter
    })
    const width = item.width * multipliers.x
    const height = item.height * multipliers.y

    return Object.freeze({
      bounds: createBounds({
        bottom: center.y + (height / 2),
        left: center.x - (width / 2),
        right: center.x + (width / 2),
        top: center.y - (height / 2)
      }),
      center,
      scaleX: item.scaleX * multipliers.x,
      scaleY: item.scaleY * multipliers.y,
      target: item.target
    })
  }

  /** Материализует один измерительный текст от неизменяемого начала жеста. */
  private _measureChild({
    item,
    mode,
    multipliers
  }: {
    item: ActiveSelectionTextScaleItem
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextScaleChildMeasurement & Readonly<{ bounds: ObjectBounds }> {
    item.measurementTextbox.autoExpand = item.target.autoExpand !== false

    const center = resolveScaledChildCenter({
      fixedAnchor: this.baseline.fixedAnchorLocal,
      multipliers,
      startCenter: item.startCenter
    })

    commitStandaloneTextboxScale({
      textbox: item.measurementTextbox,
      canvasManager: this.canvasManager,
      base: item.base,
      widthScale: multipliers.x,
      heightScale: multipliers.y,
      placement: {
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center'
      },
      shouldScaleFontSize: multipliers.y !== 1,
      shouldScalePadding: multipliers.y !== 1,
      shouldScaleRadii: multipliers.y !== 1,
      shouldDisableAutoExpandOnHorizontalChange: mode === 'horizontal' || mode === 'free',
      shouldRoundDimensions: false
    })

    const bounds = item.measurementTextbox.getBoundingRect()

    return Object.freeze({
      bounds: createBounds({
        bottom: bounds.top + bounds.height,
        left: bounds.left,
        right: bounds.left + bounds.width,
        top: bounds.top
      }),
      canonicalState: captureTextCornerScaleCanonicalState({ textbox: item.measurementTextbox }),
      center,
      target: item.target
    })
  }

  /** Строит по одному различимому соседнему измерению для каждой степени свободы. */
  private _createProjectionSamples({
    geometry,
    projectionMode
  }: {
    geometry: ActiveSelectionTextCanonicalGeometry
    projectionMode: ScaleProjectionModeInput
  }): readonly ActiveSelectionTextScaleProjectionSample[] {
    const samples = this._createNeighborGeometries({ geometry, projectionMode })

    return Object.freeze(samples.map(({ bounds, values }) => Object.freeze({ bounds, values })))
  }

  /** Строит по одному различимому соседнему измерению для каждой степени свободы. */
  private _createNeighborGeometries({
    geometry,
    projectionMode
  }: {
    geometry: ActiveSelectionTextCanonicalGeometry
    projectionMode: ScaleProjectionModeInput
  }): readonly ActiveSelectionTextCanonicalGeometry[] {
    return Object.freeze(geometry.values.map((_value, variableIndex) => {
      return this._createNeighborGeometry({ geometry, projectionMode, variableIndex })
    }))
  }

  /** Подбирает соседнее значение, на котором меняется хотя бы одна участвующая грань. */
  private _createNeighborGeometry({
    geometry,
    projectionMode,
    variableIndex
  }: {
    geometry: ActiveSelectionTextCanonicalGeometry
    projectionMode: ScaleProjectionModeInput
    variableIndex: number
  }): ActiveSelectionTextCanonicalGeometry {
    for (let step = 0; step < MAX_ACTIVE_SELECTION_TEXT_SCALE_NEIGHBOR_STEPS; step += 1) {
      const values = [...geometry.values]
      values[variableIndex] += ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_STEP * (2 ** step)
      const multipliers = resolveRectangularScaleMultipliers({
        projectionMode: geometry.mode,
        effectiveValues: values
      })
      const sample = this._measureCanonicalGeometry({
        mode: geometry.mode,
        multipliers: this._clampMultipliers({ mode: geometry.mode, multipliers })
      })
      const changesGeometry = projectionMode.projection.edges.some(({ edge }) => {
        return !areNumbersNear({ first: sample.bounds[edge], second: geometry.bounds[edge] })
      })

      if (changesGeometry) return sample
    }

    throw new Error('Не удалось найти различимую геометрию скейлинга выделения с текстами')
  }

  /** Применяет канонические свойства и компенсирует временный масштаб общей рамки. */
  private _applyChildMeasurement({
    childMeasurement,
    frame,
    item,
    mode
  }: {
    childMeasurement: ActiveSelectionTextScaleChildMeasurement
    frame: ActiveSelectionTextScaleFrame
    item: ActiveSelectionTextScaleItem
    mode: RectangularScaleGestureMode
  }): void {
    const { target } = item
    target.set({ angle: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 })
    commitStandaloneTextboxScale({
      textbox: target,
      canvasManager: this.canvasManager,
      base: item.base,
      widthScale: childMeasurement.canonicalState.width / item.base.width,
      heightScale: childMeasurement.canonicalState.fontSize / item.base.fontSize,
      placement: item.placement,
      shouldScaleFontSize: childMeasurement.canonicalState.fontSize !== item.base.fontSize,
      shouldScalePadding: childMeasurement.canonicalState.fontSize !== item.base.fontSize,
      shouldScaleRadii: childMeasurement.canonicalState.fontSize !== item.base.fontSize,
      shouldDisableAutoExpandOnHorizontalChange: mode === 'horizontal' || mode === 'free',
      shouldRoundDimensions: false
    })

    target.set({ preserveExactTextGeometry: true })
    this._applyChildFrameCompensation({
      center: childMeasurement.center,
      frame,
      scaleX: 1,
      scaleY: 1,
      target
    })
  }

  /** Компенсирует масштаб общей рамки, сохраняя рассчитанную геометрию линейного ребёнка. */
  private _applyAffineChildMeasurement({
    childMeasurement,
    frame,
    item
  }: {
    childMeasurement: ActiveSelectionAffineScaleChildMeasurement
    frame: ActiveSelectionTextScaleFrame
    item: ActiveSelectionAffineScaleItem
  }): void {
    this._applyChildFrameCompensation({
      center: childMeasurement.center,
      frame,
      scaleX: childMeasurement.scaleX,
      scaleY: childMeasurement.scaleY,
      target: item.target
    })
  }

  /** Компенсирует временную рамку, сохраняя измеренные масштаб и центр ребёнка. */
  private _applyChildFrameCompensation({
    center,
    frame,
    scaleX,
    scaleY,
    target
  }: {
    center: ActiveSelectionTextScalePoint
    frame: ActiveSelectionTextScaleFrame
    scaleX: number
    scaleY: number
    target: FabricObject
  }): void {
    target.set({ scaleX: scaleX / frame.scaleX, scaleY: scaleY / frame.scaleY })
    target.setPositionByOrigin(new Point(
      (center.x - frame.center.x) / frame.scaleX,
      (center.y - frame.center.y) / frame.scaleY
    ), 'center', 'center')
    target.setCoords()
  }

  /** Проверяет рамку и канонические свойства после единственного применения. */
  private _assertAppliedMeasurement({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    const bounds = this.selection.getBoundingRect()
    const actualBounds = createBounds({
      bottom: bounds.top + bounds.height,
      left: bounds.left,
      right: bounds.left + bounds.width,
      top: bounds.top
    })
    const boundsMatch = (['left', 'right', 'top', 'bottom'] as const).every((edge) => {
      return areNumbersNear({ first: actualBounds[edge], second: measurement.bounds[edge] })
    })
    if (!boundsMatch) throw new Error('Рамка выделения должна совпасть с измеренной геометрией')

    const visibleChildrenBounds = this._readVisibleChildrenLocalBounds({ measurement })
    const expectedChildrenBounds = createBounds({
      bottom: measurement.frame.center.y + (measurement.frame.height / 2),
      left: measurement.frame.center.x - (measurement.frame.width / 2),
      right: measurement.frame.center.x + (measurement.frame.width / 2),
      top: measurement.frame.center.y - (measurement.frame.height / 2)
    })
    const visibleChildrenMatch = (['left', 'right', 'top', 'bottom'] as const).every((edge) => {
      return areNumbersNear({ first: visibleChildrenBounds[edge], second: expectedChildrenBounds[edge] })
    })
    if (!visibleChildrenMatch) {
      throw new Error('Видимые границы детей должны совпасть с измеренной рамкой')
    }

    measurement.children.forEach(({ canonicalState, target }) => {
      const expectedState = {
        ...canonicalState,
        scaleX: 1 / measurement.frame.scaleX,
        scaleY: 1 / measurement.frame.scaleY
      }
      const actualState = captureTextCornerScaleCanonicalState({ textbox: target })
      if (!areTextCornerScaleCanonicalStatesEqual({ actual: actualState, expected: expectedState })) {
        throw new Error('Живой текст должен совпасть с измеренным каноническим состоянием')
      }
    })

    this._assertAppliedAffineChildren({ measurement })
  }

  /** Проверяет масштаб и положение линейных детей после применения измерения. */
  private _assertAppliedAffineChildren({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    measurement.affineChildren.forEach((child) => {
      const expectedCenter = new Point(
        (child.center.x - measurement.frame.center.x) / measurement.frame.scaleX,
        (child.center.y - measurement.frame.center.y) / measurement.frame.scaleY
      )
      const actualCenter = child.target.getRelativeCenterPoint()
      const scaleMatches = areNumbersNear({
        first: child.target.scaleX,
        second: child.scaleX / measurement.frame.scaleX
      }) && areNumbersNear({
        first: child.target.scaleY,
        second: child.scaleY / measurement.frame.scaleY
      })
      const centerMatches = areNumbersNear({ first: actualCenter.x, second: expectedCenter.x })
        && areNumbersNear({ first: actualCenter.y, second: expectedCenter.y })
      if (!scaleMatches || !centerMatches) {
        throw new Error('Линейный ребёнок должен совпасть с измеренной геометрией')
      }
    })
  }

  /** Объединяет видимые границы всех детей в исходной локальной плоскости выделения. */
  private _readVisibleChildrenLocalBounds({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): ObjectBounds {
    const inverseBaseline = util.invertTransform(this.baseline.matrix)
    const targets = [
      ...measurement.children.map(({ target }) => target),
      ...measurement.affineChildren.map(({ target }) => target)
    ]
    const points = targets.flatMap((target) => {
      return target.getCoords().map((point) => point.transform(inverseBaseline))
    })

    return createBounds({
      bottom: Math.max(...points.map(({ y }) => y)),
      left: Math.min(...points.map(({ x }) => x)),
      right: Math.max(...points.map(({ x }) => x)),
      top: Math.min(...points.map(({ y }) => y))
    })
  }
}
