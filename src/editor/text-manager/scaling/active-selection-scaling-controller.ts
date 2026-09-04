import {
  ActiveSelection,
  FabricImage,
  Point,
  type Canvas,
  type FabricObject,
  type Transform
} from 'fabric'
import type CanvasManager from '../../canvas-manager'
import type {
  RectangularScaleGestureMode,
  RectangularScaleGestureProjection,
  RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ScaleSnapPlan } from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { EditorTextbox } from '../types'
import { resolveCanonicalActiveSelectionTexts } from './active-selection-text-children'
import ActiveSelectionTextScaleMeasurer, {
  type ActiveSelectionTextScaleMeasurement
} from './active-selection-scale-measurer'
import {
  resolveActiveSelectionTextScaleStep,
  type ResolvedActiveSelectionTextScaleStep
} from './active-selection-scale-plan'

/** Ручки, которые действительно отображаются для общего выделения с текстом. */
const ACTIVE_SELECTION_TEXT_SCALE_CONTROLS = Object.freeze(new Set([
  'tl',
  'tr',
  'bl',
  'br',
  'ml',
  'mr'
]))

/** Допуск проверки канонического состояния текста и рамки. */
const ACTIVE_SELECTION_TEXT_SCALE_STATE_EPSILON = 0.000000001

/** Временное состояние одного поддерживаемого жеста выделения с текстами. */
type ActiveSelectionTextScalingSession = Readonly<{
  children: readonly FabricObject[]
  measurer: ActiveSelectionTextScaleMeasurer
  selection: ActiveSelection
  texts: readonly EditorTextbox[]
  transform: Transform
}>

/** Поддерживаемые дети общего выделения, в котором текст задаёт нелинейную геометрию. */
type ActiveSelectionTextScalingContent = Readonly<{
  affineChildren: readonly FabricImage[]
  children: readonly FabricObject[]
  texts: readonly EditorTextbox[]
}>

/** Проверяет, что число совпадает с ожидаемым каноническим значением. */
function isNear({ actual, expected }: { actual: number; expected: number }): boolean {
  return Number.isFinite(actual)
    && Number.isFinite(expected)
    && Math.abs(actual - expected) <= ACTIVE_SELECTION_TEXT_SCALE_STATE_EPSILON
}

/** Возвращает каноническое изображение, которое может линейно меняться вместе с общей рамкой. */
function resolveSupportedAffineImage({
  selection,
  target
}: {
  selection: ActiveSelection
  target: FabricObject
}): FabricImage | null {
  if (!(target instanceof FabricImage)) return null
  if (target.group !== selection) return null

  const protectedState = [
    target.parent,
    target.flipX,
    target.flipY,
    target.locked,
    target.lockScalingX,
    target.lockScalingY
  ]
  if (protectedState.some(Boolean)) return null

  const dimensions = [
    target.width,
    target.height,
    target.scaleX,
    target.scaleY
  ]
  if (!dimensions.every(Number.isFinite) || Math.min(...dimensions) <= 0) return null

  const transformValues = [
    target.angle ?? 0,
    target.skewX ?? 0,
    target.skewY ?? 0,
    target.strokeWidth ?? 0
  ]
  const isCanonical = transformValues.every((actual) => isNear({ actual, expected: 0 }))

  return isCanonical ? target : null
}

/** Возвращает поддерживаемый состав только из канонических текстов и изображений. */
function resolveSupportedSelectionContent({
  selection
}: {
  selection: ActiveSelection
}): ActiveSelectionTextScalingContent | null {
  if (!isNear({ actual: selection.scaleX ?? 1, expected: 1 })) return null
  if (!isNear({ actual: selection.scaleY ?? 1, expected: 1 })) return null

  const objects = selection.getObjects()
  if (objects.length < 2) return null

  const texts = resolveCanonicalActiveSelectionTexts({ selection })
  if (!texts) return null
  const textSet = new Set<FabricObject>(texts)
  const affineChildren: FabricImage[] = []
  for (const object of objects) {
    if (textSet.has(object)) continue

    const image = resolveSupportedAffineImage({ selection, target: object })
    if (!image) return null
    affineChildren.push(image)
  }

  return Object.freeze({
    affineChildren: Object.freeze(affineChildren),
    children: Object.freeze([...objects]),
    texts
  })
}

/** Управляет общим выделением, в котором тексты задают нелинейную геометрию. */
export default class TextActiveSelectionScalingController {
  /** Fabric canvas редактора. */
  private readonly canvas: Canvas

  /** Менеджер холста, используемый при переносе рассчитанных размеров в свойства текста. */
  private readonly canvasManager: CanvasManager

  /** Единственная активная сессия текущего временного выделения. */
  private session: ActiveSelectionTextScalingSession | null = null

  /** Создаёт владельца текстовой части скейлинга общего выделения. */
  constructor({
    canvas,
    canvasManager
  }: {
    canvas: Canvas
    canvasManager: CanvasManager
  }) {
    this.canvas = canvas
    this.canvasManager = canvasManager
  }

  /** Проверяет канонический состав из отдельных текстов и необязательных изображений. */
  public supportsScaling({ selection }: { selection: ActiveSelection }): boolean {
    return resolveSupportedSelectionContent({ selection }) !== null
  }

  /** Фиксирует неизменяемое начало поддерживаемого жеста до первой мутации Fabric. */
  public beginScaling({
    projection,
    selection,
    transform
  }: {
    projection: RectangularScaleGestureProjection
    selection: ActiveSelection
    transform: Transform
  }): boolean {
    const content = resolveSupportedSelectionContent({ selection })
    if (!content || transform.target !== selection) return false
    if (!ACTIVE_SELECTION_TEXT_SCALE_CONTROLS.has(transform.corner)) return false
    if (this.session) throw new Error('Сессия скейлинга выделения с текстом уже начата')

    const measurer = new ActiveSelectionTextScaleMeasurer({
      affineChildren: content.affineChildren,
      canvasManager: this.canvasManager,
      children: content.texts,
      projection,
      selection,
      transform
    })
    this.session = Object.freeze({
      children: content.children,
      measurer,
      selection,
      texts: content.texts,
      transform
    })

    return true
  }

  /** Измеряет каноническую геометрию по текущему положению указателя. */
  public measureScale({
    mode,
    multipliers,
    selection
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
    selection: ActiveSelection
  }): ActiveSelectionTextScaleMeasurement {
    return this._getSession({ selection }).measurer.measure({ mode, multipliers })
  }

  /** Уточняет общий план по фактическим границам и переносу строк всех текстов. */
  public resolveScaleStep({
    mode,
    plan,
    pointerMeasurement,
    selection
  }: {
    mode: RectangularScaleGestureMode
    plan: ScaleSnapPlan
    pointerMeasurement: ActiveSelectionTextScaleMeasurement
    selection: ActiveSelection
  }): ResolvedActiveSelectionTextScaleStep {
    const { measurer } = this._getSession({ selection })

    return resolveActiveSelectionTextScaleStep({
      measurer,
      mode,
      plan,
      pointerMeasurement
    })
  }

  /** Один раз применяет измеренное состояние к дочерним объектам и общей рамке. */
  public applyScalePreview({
    measurement,
    selection
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
    selection: ActiveSelection
  }): RectangularScaleMultipliers {
    const { measurer } = this._getSession({ selection })
    measurer.apply({ measurement })
    this.canvas.requestRenderAll()

    return measurement.multipliers
  }

  /** Фиксирует рассчитанную геометрию детей и восстанавливает рамку с единичным масштабом. */
  public commitScaling({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform?: Transform | null
  }): boolean {
    const { session } = this
    if (!session || session.selection !== selection) return false
    if (!session.measurer.hasAppliedMeasurement()) {
      throw new Error('Фиксации выделения с текстами должно предшествовать измеренное промежуточное состояние')
    }

    try {
      const center = selection.getCenterPoint()
      const angle = selection.angle ?? 0
      selection.set({ angle: 0 })
      selection.setPositionByOrigin(center, 'center', 'center')
      selection.setCoords()

      this._discardSelectionDuringCommit({ selection, transform })
      this._assertCommittedTexts({ texts: session.texts })
      session.children.forEach((child) => child.setCoords())
      this._restoreSelection({ angle, center, children: session.children })
      this.canvas.requestRenderAll()
    } finally {
      this._clearSession({ selection })
    }

    return true
  }

  /** Очищает измерения прерванного или завершённого жеста. */
  public clearScaling({ selection }: { selection: ActiveSelection }): boolean {
    if (this.session?.selection !== selection) return false

    this._clearSession({ selection })

    return true
  }

  /** Проверяет, что текущая сессия уже применила рассчитанную геометрию. */
  public hasAppliedScalePreview({ selection }: { selection: ActiveSelection }): boolean {
    if (this.session?.selection !== selection) return false

    return this.session.measurer.hasAppliedMeasurement()
  }

  /** Восстанавливает последнее подтверждённое состояние перед досрочным завершением жеста. */
  public restoreScalePreview({ selection }: { selection: ActiveSelection }): boolean {
    if (this.session?.selection !== selection) return false

    const restored = this.session.measurer.restoreAppliedMeasurement()
    if (restored) this.canvas.requestRenderAll()

    return restored
  }

  /** Освобождает измеритель при уничтожении TextManager. */
  public destroy(): void {
    if (!this.session) return

    this._clearSession({ selection: this.session.selection })
  }

  /** Возвращает обязательную активную сессию переданного выделения. */
  private _getSession({ selection }: { selection: ActiveSelection }): ActiveSelectionTextScalingSession {
    const { session } = this
    if (!session || session.selection !== selection) {
      throw new Error('Скейлинг выделения с текстом должен начинаться с исходной сессии')
    }

    return session
  }

  /** Снимает рамку внутри `object:modified`, не завершая тот же Fabric-transform повторно. */
  private _discardSelectionDuringCommit({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform?: Transform | null
  }): void {
    const currentTransform = Reflect.get(this.canvas, '_currentTransform')
    const isCurrentTransform = currentTransform
      && currentTransform === transform
      && transform?.target === selection

    if (isCurrentTransform) Reflect.set(this.canvas, '_currentTransform', null)
    try {
      this.canvas.discardActiveObject()
    } finally {
      if (isCurrentTransform) Reflect.set(this.canvas, '_currentTransform', currentTransform)
    }
  }

  /** Проверяет, что масштаб временной рамки полностью перенесён в канонические свойства текстов. */
  private _assertCommittedTexts({ texts }: { texts: readonly EditorTextbox[] }): void {
    for (const child of texts) {
      const affineValues = [
        (child.scaleX ?? 1) - 1,
        (child.scaleY ?? 1) - 1,
        child.angle ?? 0,
        child.skewX ?? 0,
        child.skewY ?? 0
      ]
      if (!affineValues.every((value) => isNear({ actual: value, expected: 0 }))) {
        throw new Error('После фиксации каждый текст должен иметь каноническое преобразование')
      }
    }
  }

  /** Повторно создаёт ActiveSelection с исходным углом и точной канонической геометрией детей. */
  private _restoreSelection({
    angle,
    center,
    children
  }: {
    angle: number
    center: Point
    children: readonly FabricObject[]
  }): void {
    const restored = new ActiveSelection([...children], { canvas: this.canvas })
    restored.set({ angle, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 })
    restored.setPositionByOrigin(center, 'center', 'center')
    restored.setCoords()
    this.canvas.setActiveObject(restored)
  }

  /** Освобождает измеритель и удаляет сессию переданного выделения. */
  private _clearSession({ selection }: { selection: ActiveSelection }): void {
    const { session } = this
    if (!session || session.selection !== selection) return

    session.measurer.dispose()
    this.session = null
  }
}
