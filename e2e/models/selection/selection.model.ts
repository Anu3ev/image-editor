/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  SelectionChildSceneGeometrySnapshot,
  SelectionCompositionChildSnapshot,
  SelectionCompositionSnapshot,
  SelectionImageTextCompositionSnapshot,
  SelectionTextCompositionSnapshot,
  SnappingObjectSnapshot,
  TextResizeSnapshot
} from '../../types'
import type { ShapeTextInfo } from '../../types/shape.types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import type { ShapeModel } from '../shape/shape.model'
import { SelectionScalingSession } from './selection-scaling-session'

/** Расхождение между границами активного объекта и отрисованной рамкой выделения. */
type SelectionFrameAlignmentInfo = {
  bottomRightDeltaX: number
  bottomRightDeltaY: number
  maxDistance: number
  topLeftDeltaX: number
  topLeftDeltaY: number
}

/** Точка объекта в координатах сцены. */
type SelectionScenePoint = {
  x: number
  y: number
  transform?: (matrix: number[]) => SelectionScenePoint
}

/** Минимальный контракт объекта для проверки положения рамки выделения. */
type SelectionVisualTarget = {
  group?: {
    calcTransformMatrix?: () => number[]
  }
  getPointByOrigin: (originX: string, originY: string) => SelectionScenePoint
}

/** Локальные свойства дочернего объекта, которые нужны снимку общего выделения. */
type SelectionCompositionChildTarget = {
  cropX?: number
  cropY?: number
  id?: unknown
  originX: string
  originY: string
  skewX?: number
  skewY?: number
}

/** Исходные свойства дочернего объекта для расчёта видимой геометрии. */
type SelectionChildSceneGeometrySource = {
  angle: number
  height: number
  id: string
  matrix: number[]
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  width: number
}

/** Браузерный снимок изображения и текстов до расчёта видимой геометрии. */
type SelectionImageTextCompositionSource = {
  selection: SnappingObjectSnapshot
  images: SelectionCompositionChildSnapshot[]
  texts: TextResizeSnapshot[]
}

/** Идентификаторы ожидаемых изображений и текстов в общем выделении. */
type SelectionImageTextCompositionParams = {
  imageIds: string[]
  textIds: string[]
}

/** Читает браузерное состояние выделения из ожидаемых изображений и текстов. */
function readImageTextCompositionSource({
  imageIds,
  textIds
}: SelectionImageTextCompositionParams): SelectionImageTextCompositionSource | null {
  const { editor, __editorHelpers: helpers } = window as any
  const selection = editor.canvas.getActiveObject()
  const children = selection?.getObjects?.()
  if (
    selection?.type !== 'activeselection'
    || !Array.isArray(children)
    || children.length !== imageIds.length + textIds.length
  ) return null

  const images = imageIds.map((id) => children.find((child: any) => child.id === id))
  const texts = textIds.map((id) => children.find((child: any) => child.id === id))
  if (images.some((image: any) => image?.type !== 'image')) return null
  if (texts.some((text: any) => text?.type !== 'background-textbox')) return null

  const imageSnapshots: SelectionImageTextCompositionSource['images'] = []
  for (const image of images) {
    imageSnapshots.push({
      ...helpers.serializeSnappingObjectSnapshot(image),
      cropX: image.cropX ?? 0,
      cropY: image.cropY ?? 0,
      id: image.id,
      originX: image.originX,
      originY: image.originY,
      skewX: image.skewX ?? 0,
      skewY: image.skewY ?? 0
    })
  }
  const textSnapshots: SelectionImageTextCompositionSource['texts'] = []
  for (const text of texts) {
    textSnapshots.push(helpers.serializeTextResizeSnapshot(text))
  }

  return {
    selection: helpers.serializeSnappingObjectSnapshot(selection),
    images: imageSnapshots,
    texts: textSnapshots
  }
}

/** Рассчитывает видимую геометрию дочернего объекта по полной матрице в координатах сцены. */
function resolveSelectionChildSceneGeometry(
  source: SelectionChildSceneGeometrySource
): SelectionChildSceneGeometrySnapshot {
  const {
    angle,
    height,
    id,
    matrix,
    scaleX,
    scaleY,
    skewX,
    skewY,
    width
  } = source
  if (matrix.length !== 6 || !matrix.every(Number.isFinite)) {
    throw new Error(`Матрица объекта ${source.id} должна состоять из шести конечных чисел`)
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Размеры объекта ${source.id} должны быть положительными и конечными`)
  }

  const [a, b, c, d, centerX, centerY] = matrix
  const topX = a * width
  const topY = b * width
  const leftX = c * height
  const leftY = d * height
  const topEdgeLength = Math.hypot(topX, topY)
  const leftEdgeLength = Math.hypot(leftX, leftY)

  if (topEdgeLength <= 0 || leftEdgeLength <= 0) {
    throw new Error(`Видимые стороны объекта ${source.id} должны иметь положительную длину`)
  }

  return {
    angle,
    centerX,
    centerY,
    height,
    id,
    leftEdgeLength,
    orthogonality: ((topX * leftX) + (topY * leftY)) / (topEdgeLength * leftEdgeLength),
    scaleX,
    scaleY,
    sceneAngle: (Math.atan2(topY, topX) * 180) / Math.PI,
    skewX,
    skewY,
    topEdgeLength,
    width
  }
}

/** Соединяет канонический снимок ребёнка с его видимой геометрией по id. */
function attachSelectionChildGeometry<Snapshot>({
  geometryById,
  id,
  snapshot
}: {
  geometryById: ReadonlyMap<string, SelectionChildSceneGeometrySnapshot>
  id: string
  snapshot: Snapshot
}): { geometry: SelectionChildSceneGeometrySnapshot; snapshot: Snapshot } {
  const geometry = geometryById.get(id)
  if (!geometry) throw new Error(`Не найдена видимая геометрия объекта ${id}`)

  return { geometry, snapshot }
}

/** Снимок одного шейпа и его текста внутри общего выделения. */
interface ShapeSelectionChildSnapshot {
  shape: SelectionCompositionChildSnapshot
  text: ShapeTextInfo
}

/** Снимок общего выделения из шейпов с доступным состоянием текста. */
interface ShapeSelectionCompositionSnapshot {
  selection: SelectionCompositionSnapshot['selection']
  children: ShapeSelectionChildSnapshot[]
}

/** Действия и проверки для активного общего выделения или группы. */
export class SelectionModel {
  private readonly page: Page

  private readonly shapes: ShapeModel

  /** Полный жест указателя при скейлинге активного составного объекта. */
  readonly scaling: SelectionScalingSession

  /** Создаёт модель действий над составными объектами редактора. */
  constructor({
    page,
    shapes
  }: {
    page: Page
    shapes: ShapeModel
  }) {
    this.page = page
    this.shapes = shapes
    this.scaling = new SelectionScalingSession({ page, shapes })
  }

  /** Возвращает геометрию активного составного объекта и всех его прямых дочерних объектов. */
  async getCompositionSnapshot(): Promise<SelectionCompositionSnapshot> {
    const composition = await this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = editor.canvas.getActiveObject()
      const objects = target?.getObjects?.()
      if (!target || !Array.isArray(objects) || objects.length < 2) return null

      const children = objects.map((object: SelectionCompositionChildTarget) => {
        if (typeof object.id !== 'string') return null

        return {
          ...helpers.serializeSnappingObjectSnapshot(object),
          cropX: object.cropX ?? 0,
          cropY: object.cropY ?? 0,
          skewX: object.skewX ?? 0,
          skewY: object.skewY ?? 0,
          originX: object.originX,
          originY: object.originY,
          id: object.id
        }
      })
      if (children.some((child: unknown) => child === null)) return null

      return {
        selection: helpers.serializeSnappingObjectSnapshot(target),
        children
      }
    })

    expect(composition, 'активный составной объект должен содержать дочерние объекты с id').not.toBeNull()
    expect(composition?.children.length, 'составной объект должен содержать минимум два дочерних объекта')
      .toBeGreaterThanOrEqual(2)
    if (!composition) {
      throw new Error('Не удалось получить состав текущего активного объекта')
    }

    return composition
  }

  /** Возвращает канонические свойства отдельных текстов в текущем общем выделении. */
  async getTextCompositionSnapshot(): Promise<SelectionTextCompositionSnapshot> {
    const composition = await this.page.evaluate(() => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      const objects = target?.getObjects?.()
      if (target?.type !== 'activeselection' || !Array.isArray(objects) || objects.length < 2) return null

      const children = objects.map((object: any) => {
        if (object.type !== 'background-textbox' || typeof object.id !== 'string') return null

        return helpers.serializeTextResizeSnapshot(object)
      })
      if (children.some((child: unknown) => child === null)) return null

      return {
        selection: helpers.serializeSnappingObjectSnapshot(target),
        children
      }
    })

    expect(composition, 'общее выделение должно состоять из отдельных текстов').not.toBeNull()
    expect(composition?.children.length, 'общее выделение должно содержать минимум два текста')
      .toBeGreaterThanOrEqual(2)
    if (!composition) throw new Error('Не удалось получить тексты текущего общего выделения')

    return composition
  }

  /** Возвращает канонические свойства и видимую геометрию дочерних объектов общего выделения. */
  async getChildSceneGeometry(): Promise<SelectionChildSceneGeometrySnapshot[]> {
    const sources = await this.page.evaluate(() => {
      const { editor } = window as any
      const target = editor.canvas.getActiveObject()
      const objects = target?.getObjects?.()
      if (target?.type !== 'activeselection' || !Array.isArray(objects)) return null

      return objects.map((object: any) => {
        const matrix = object.calcTransformMatrix?.()
        if (!Array.isArray(matrix) || typeof object.id !== 'string') return null

        return {
          angle: object.angle ?? 0,
          height: object.height,
          id: object.id,
          matrix,
          scaleX: object.scaleX ?? 1,
          scaleY: object.scaleY ?? 1,
          skewX: object.skewX ?? 0,
          skewY: object.skewY ?? 0,
          width: object.width
        }
      })
    })

    expect(sources, 'активным объектом должно быть общее выделение').not.toBeNull()
    expect(sources?.length, 'общее выделение должно содержать минимум два дочерних объекта').toBeGreaterThanOrEqual(2)
    if (!sources || sources.some((source: unknown) => source === null)) {
      throw new Error('Не удалось получить видимую геометрию дочерних объектов общего выделения')
    }

    return (sources as SelectionChildSceneGeometrySource[]).map(resolveSelectionChildSceneGeometry)
  }

  /** Возвращает обязательную видимую геометрию одного дочернего объекта общего выделения. */
  async getChildSceneGeometryById({ id }: { id: string }): Promise<SelectionChildSceneGeometrySnapshot> {
    expect(id.length, 'id дочернего объекта не должен быть пустым').toBeGreaterThan(0)

    const geometry = (await this.getChildSceneGeometry()).find((child) => child.id === id)

    expect(geometry, `общее выделение должно содержать объект ${id}`).toBeDefined()
    if (!geometry) throw new Error(`Не удалось получить видимую геометрию объекта ${id}`)

    return geometry
  }

  /** Возвращает состояние ожидаемых изображений и текстов в текущем общем выделении. */
  async getImageTextCompositionSnapshot({
    imageIds,
    textIds
  }: {
    imageIds: readonly string[]
    textIds: readonly string[]
  }): Promise<SelectionImageTextCompositionSnapshot> {
    if (imageIds.length === 0) throw new Error('Нужно указать хотя бы один id изображения')
    if (textIds.length === 0) throw new Error('Нужно указать хотя бы один id текста')

    const expectedIds = [...imageIds, ...textIds]
    if (expectedIds.some((id) => id.length === 0)) {
      throw new Error('id изображений и текстов не должны быть пустыми')
    }
    if (new Set(expectedIds).size !== expectedIds.length) {
      throw new Error('id изображений и текстов в общем выделении не должны повторяться')
    }

    const source = await this.page.evaluate(readImageTextCompositionSource, {
      imageIds: [...imageIds],
      textIds: [...textIds]
    })

    if (!source) {
      throw new Error('Общее выделение должно содержать ожидаемые изображения и тексты')
    }
    if (source.images.length !== imageIds.length) {
      throw new Error('Снимок должен содержать все ожидаемые изображения')
    }
    if (source.texts.length !== textIds.length) {
      throw new Error('Снимок должен содержать все ожидаемые тексты')
    }
    const childGeometries = await this.getChildSceneGeometry()
    const geometryById = new Map(childGeometries.map((geometry) => [geometry.id, geometry]))

    return {
      selection: source.selection,
      images: source.images.map((snapshot) => attachSelectionChildGeometry({
        geometryById,
        id: snapshot.id,
        snapshot
      })),
      texts: source.texts.map((snapshot, index) => {
        const id = textIds[index]
        if (!id) throw new Error('Для каждого текста должен существовать ожидаемый id')

        return attachSelectionChildGeometry({ geometryById, id, snapshot })
      })
    }
  }

  /** Возвращает фактический наклон текущего общего выделения. */
  async getSkew(): Promise<{ skewX: number; skewY: number }> {
    const skew = await this.page.evaluate(() => {
      const { editor } = window as any
      const target = editor.canvas.getActiveObject()
      if (target?.type !== 'activeselection') return null

      return {
        skewX: target.skewX ?? 0,
        skewY: target.skewY ?? 0
      }
    })

    expect(skew, 'активным объектом должно быть общее выделение').not.toBeNull()
    expect(
      skew && Number.isFinite(skew.skewX) && Number.isFinite(skew.skewY),
      'наклон общего выделения должен состоять из конечных чисел'
    ).toBe(true)
    if (!skew) throw new Error('Не удалось получить наклон текущего общего выделения')

    return skew
  }

  /** Возвращает геометрию каждого шейпа и его текст в текущем общем выделении. */
  async getShapeCompositionSnapshot(): Promise<ShapeSelectionCompositionSnapshot> {
    const composition = await this.getCompositionSnapshot()
    const children = await Promise.all(composition.children.map(async(shape) => {
      const text = await this.shapes.getTextNode({ id: shape.id })

      expect(text, `в шейпе ${shape.id} должен существовать текст`).not.toBeNull()
      if (!text) throw new Error(`Не удалось получить текст шейпа ${shape.id}`)

      return { shape, text }
    }))

    expect(children).toHaveLength(composition.children.length)
    expect(children.length, 'общее выделение должно содержать минимум два шейпа').toBeGreaterThanOrEqual(2)

    return {
      selection: composition.selection,
      children
    }
  }

  /** Устанавливает угол текущего общего выделения через публичный TransformManager. */
  async setAngle({ angle }: { angle: number }): Promise<SnappingObjectSnapshot> {
    expect(Number.isFinite(angle), 'угол общего выделения должен быть конечным').toBe(true)

    const snapshot = await this.page.evaluate((targetAngle) => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      const children = target?.getObjects?.()
      if (target?.type !== 'activeselection' || !Array.isArray(children) || children.length < 2) return null

      editor.transformManager.setAngle(target, targetAngle)

      return helpers.serializeSnappingObjectSnapshot(target)
    }, angle)

    expect(snapshot, 'должно существовать общее выделение для изменения угла').not.toBeNull()
    expect(snapshot?.angle, 'общее выделение должно получить запрошенный угол').toBeCloseTo(angle, 5)
    if (!snapshot) throw new Error('Не удалось изменить угол общего выделения')

    await waitForCanvasRender({ page: this.page })

    return snapshot
  }

  /** Возвращает смещение области выделения относительно активного объекта без принудительного setCoords(). */
  async getActiveObjectSelectionFrameAlignment(): Promise<SelectionFrameAlignmentInfo> {
    const alignment = await this.page.evaluate(() => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      const visualTarget = helpers.resolveShapeNode(target) ?? target

      if (!target?.oCoords || typeof visualTarget?.getPointByOrigin !== 'function') return null

      const measuredTarget = visualTarget as SelectionVisualTarget
      const { viewportTransform } = editor.canvas
      const toScenePoint = (object: SelectionVisualTarget, originX: string, originY: string) => {
        const point = object.getPointByOrigin(originX, originY)

        if (
          object.group
          && typeof point.transform === 'function'
          && typeof object.group.calcTransformMatrix === 'function'
        ) {
          return point.transform(object.group.calcTransformMatrix())
        }

        return point
      }
      const toViewportPoint = (point: { x: number; y: number }) => ({
        x: viewportTransform[0] * point.x + viewportTransform[2] * point.y + viewportTransform[4],
        y: viewportTransform[1] * point.x + viewportTransform[3] * point.y + viewportTransform[5]
      })

      const topLeft = toViewportPoint(toScenePoint(measuredTarget, 'left', 'top'))
      const bottomRight = toViewportPoint(toScenePoint(measuredTarget, 'right', 'bottom'))
      const controlTopLeft = target.oCoords.tl
      const controlBottomRight = target.oCoords.br

      if (!controlTopLeft || !controlBottomRight) return null

      const topLeftDeltaX = controlTopLeft.x - topLeft.x
      const topLeftDeltaY = controlTopLeft.y - topLeft.y
      const bottomRightDeltaX = controlBottomRight.x - bottomRight.x
      const bottomRightDeltaY = controlBottomRight.y - bottomRight.y
      const topLeftDistance = Math.sqrt(topLeftDeltaX * topLeftDeltaX + topLeftDeltaY * topLeftDeltaY)
      const bottomRightDistance = Math.sqrt(
        bottomRightDeltaX * bottomRightDeltaX + bottomRightDeltaY * bottomRightDeltaY
      )

      return {
        bottomRightDeltaX,
        bottomRightDeltaY,
        maxDistance: Math.max(topLeftDistance, bottomRightDistance),
        topLeftDeltaX,
        topLeftDeltaY
      }
    })

    expect(alignment, 'область выделения активного объекта должна быть доступна').not.toBeNull()
    if (!alignment) throw new Error('Не удалось получить положение рамки выделения')

    return alignment
  }
}
