import type { Transform } from 'fabric'
import type { ObjectBounds } from '../../utils/geometry'
import { getObjectExactBounds } from '../../utils/geometry'
import type { ScaleSceneEdge } from '../../snapping-manager/scaling/scale-projection'
import type {
  ScaleProjectionModeInput,
  ScaleStepProjectionInput
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { EditorTextbox } from '../types'

/** Боковая ручка, которой Fabric меняет каноническую ширину Textbox. */
export type TextWidthResizeControlKey = 'ml' | 'mr'

/** Точка в координатах сцены, не зависящая от Fabric Point. */
export type TextWidthResizeScenePoint = Readonly<{
  x: number
  y: number
}>

/** Неизменяемая геометрия изменения ширины отдельного Textbox за боковую ручку. */
export type TextWidthResizeGestureProjection = Readonly<{
  anchorOriginX: Transform['originX']
  anchorOriginY: Transform['originY']
  baselineBounds: ObjectBounds
  baselineWidth: number
  controlKey: TextWidthResizeControlKey
  fixedAnchor: TextWidthResizeScenePoint
  movingEdges: readonly ScaleSceneEdge[]
  projectionModes: readonly ScaleProjectionModeInput[]
}>

/** Минимальный вклад ширины в положение границы в координатах сцены. */
const TEXT_WIDTH_PROJECTION_EPSILON = 0.000000001

/** Идентификатор одномерного режима изменения ширины текста. */
export const TEXT_WIDTH_PROJECTION_MODE = 'text-width'

/** Проверяет строковое и числовое представление центрального начала координат Fabric. */
function isCenterOrigin(origin: Transform['originX'] | Transform['originY']): boolean {
  return origin === 'center' || origin === 0.5
}

/** Проверяет строковое и числовое представление бокового начала координат Fabric. */
function isSideOrigin({
  origin,
  expected
}: {
  origin: Transform['originX']
  expected: 'left' | 'right'
}): boolean {
  if (origin === expected) return true

  return expected === 'left' ? origin === 0 : origin === 1
}

/** Проверяет, что преобразование Fabric относится к изменению ширины боковой ручкой. */
function isTextWidthResizeControl(transform: Transform): transform is Transform & {
  corner: TextWidthResizeControlKey
} {
  return transform.action === 'resizing'
    && (transform.corner === 'ml' || transform.corner === 'mr')
}

/** Проверяет геометрию, которая пока сохраняет прежнюю логику прилипания. */
function hasUnsupportedTextGeometry({ textbox }: { textbox: EditorTextbox }): boolean {
  return Boolean(textbox.flipX)
    || Boolean(textbox.flipY)
    || Boolean(textbox.path)
    || Math.abs(textbox.skewX ?? 0) > TEXT_WIDTH_PROJECTION_EPSILON
    || Math.abs(textbox.skewY ?? 0) > TEXT_WIDTH_PROJECTION_EPSILON
}

/** Возвращает вектор сдвига изменяемой стороны при увеличении ширины на единицу. */
function resolveWidthSceneVector({
  textbox,
  controlKey,
  centered
}: {
  textbox: EditorTextbox
  controlKey: TextWidthResizeControlKey
  centered: boolean
}): TextWidthResizeScenePoint | null {
  const [matrixX, matrixY] = textbox.calcTransformMatrix()
  const direction = centered || controlKey === 'mr' ? 1 : -1
  const x = matrixX * direction
  const y = matrixY * direction

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (Math.hypot(x, y) <= TEXT_WIDTH_PROJECTION_EPSILON) return null

  return Object.freeze({ x, y })
}

/** Возвращает две противоположные грани, которые расходятся от центра объекта. */
function createCenteredMovingEdges({
  axis,
  coefficient
}: {
  axis: 'x' | 'y'
  coefficient: number
}): readonly Readonly<{
  edge: ScaleSceneEdge
  coefficients: readonly number[]
}>[] {
  const magnitude = Math.abs(coefficient) / 2
  if (magnitude <= TEXT_WIDTH_PROJECTION_EPSILON) return Object.freeze([])

  const edges: readonly ScaleSceneEdge[] = axis === 'x'
    ? ['left', 'right']
    : ['top', 'bottom']

  return Object.freeze([
    Object.freeze({ edge: edges[0], coefficients: Object.freeze([-magnitude]) }),
    Object.freeze({ edge: edges[1], coefficients: Object.freeze([magnitude]) })
  ])
}

/** Возвращает движущуюся грань и её зависимость от ширины по одной оси сцены. */
function createMovingEdge({
  axis,
  coefficient
}: {
  axis: 'x' | 'y'
  coefficient: number
}): Readonly<{
  edge: ScaleSceneEdge
  coefficients: readonly number[]
}> | null {
  if (Math.abs(coefficient) <= TEXT_WIDTH_PROJECTION_EPSILON) return null

  let edge: ScaleSceneEdge

  if (axis === 'x') {
    edge = coefficient > 0 ? 'right' : 'left'
  } else {
    edge = coefficient > 0 ? 'bottom' : 'top'
  }

  return Object.freeze({
    edge,
    coefficients: Object.freeze([coefficient])
  })
}

/** Возвращает движущиеся границы обычного или центрированного изменения ширины. */
function createMovingEdges({
  centered,
  widthVector
}: {
  centered: boolean
  widthVector: TextWidthResizeScenePoint
}): readonly Readonly<{
  edge: ScaleSceneEdge
  coefficients: readonly number[]
}>[] {
  if (centered) {
    return Object.freeze([
      ...createCenteredMovingEdges({ axis: 'x', coefficient: widthVector.x }),
      ...createCenteredMovingEdges({ axis: 'y', coefficient: widthVector.y })
    ])
  }

  return Object.freeze([
    createMovingEdge({ axis: 'x', coefficient: widthVector.x }),
    createMovingEdge({ axis: 'y', coefficient: widthVector.y })
  ].filter((edge): edge is NonNullable<typeof edge> => edge !== null))
}

/** Создаёт одномерную проекцию ширины на реально движущиеся границы сцены. */
function createProjectionModes({
  baselineWidth,
  centered,
  widthVector
}: {
  baselineWidth: number
  centered: boolean
  widthVector: TextWidthResizeScenePoint
}): readonly ScaleProjectionModeInput[] {
  const edges = createMovingEdges({ centered, widthVector })
  const sceneWeight = Math.hypot(widthVector.x, widthVector.y) * (centered ? 0.5 : 1)

  return Object.freeze([
    Object.freeze({
      id: TEXT_WIDTH_PROJECTION_MODE,
      projection: Object.freeze({
        variables: Object.freeze(['text-width'] as const),
        baselineValues: Object.freeze([baselineWidth]),
        variableSceneWeights: Object.freeze([sceneWeight]),
        edges: Object.freeze(edges)
      })
    })
  ])
}

/**
 * Фиксирует точную геометрию до первого изменения ширины Textbox.
 */
export function createTextWidthResizeGestureProjection({
  textbox,
  transform
}: {
  textbox: EditorTextbox
  transform: Transform
}): TextWidthResizeGestureProjection | null {
  if (!isTextWidthResizeControl(transform)) return null
  if (transform.target !== textbox || textbox.group) return null
  if (hasUnsupportedTextGeometry({ textbox })) return null

  const expectedOriginX = transform.corner === 'mr' ? 'left' : 'right'
  const centered = isCenterOrigin(transform.originX)
  if (!centered && !isSideOrigin({ origin: transform.originX, expected: expectedOriginX })) return null
  if (!isCenterOrigin(transform.originY)) return null

  const baselineWidth = textbox.width
  if (!Number.isFinite(baselineWidth) || baselineWidth <= 0) return null

  const baselineBounds = getObjectExactBounds({ object: textbox })
  const widthVector = resolveWidthSceneVector({
    textbox,
    controlKey: transform.corner,
    centered
  })
  if (!baselineBounds || !widthVector) return null

  const anchor = textbox.getPointByOrigin(transform.originX, transform.originY)
  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) return null

  const projectionModes = createProjectionModes({ baselineWidth, centered, widthVector })
  const movingEdges = projectionModes[0].projection.edges.map(({ edge }) => edge)

  return Object.freeze({
    anchorOriginX: transform.originX,
    anchorOriginY: transform.originY,
    baselineBounds,
    baselineWidth,
    controlKey: transform.corner,
    fixedAnchor: Object.freeze({ x: anchor.x, y: anchor.y }),
    movingEdges: Object.freeze(movingEdges),
    projectionModes
  })
}

/**
 * Создаёт локальную проекцию от уже пересчитанной геометрии текущего движения указателя.
 * Так изменение высоты из-за переноса строк не искажает поиск и удержание направляющей.
 */
export function createTextWidthResizeStepProjection({
  textbox,
  gesture
}: {
  textbox: EditorTextbox
  gesture: TextWidthResizeGestureProjection
}): ScaleStepProjectionInput | null {
  const bounds = getObjectExactBounds({ object: textbox })
  const { width } = textbox
  const { projectionModes } = gesture
  const [projectionMode] = projectionModes
  if (!bounds || !projectionMode || !Number.isFinite(width) || width <= 0) return null

  return Object.freeze({
    bounds: Object.freeze({ ...bounds }),
    projection: Object.freeze({
      ...projectionMode.projection,
      baselineValues: Object.freeze([width])
    })
  })
}
