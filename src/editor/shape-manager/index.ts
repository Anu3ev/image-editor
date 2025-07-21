import { Rect, Circle, Triangle, FabricObject, RectProps, CircleProps } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'

type ShapeCreationFlags = {
  withoutSelection?: boolean
  withoutAdding?: boolean
}

export default class ShapeManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Менеджер фигур для редактора.
   * @param options - Опции и настройки менеджера фигур.
   * @param options.editor - Ссылка на экземпляр редактора.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Добавление прямоугольника
   * @param shapeOptions
   * @param shapeOptions.id - Уникальный идентификатор фигуры
   * @param shapeOptions.left - Координата X
   * @param shapeOptions.top - Координата Y
   * @param shapeOptions.width - Ширина
   * @param shapeOptions.height - Высота
   * @param shapeOptions.fill - Цвет заливки
   * @param shapeOptions.rest - Остальные параметры
   *
   * @param flags - Флаги для управления поведением
   * @param flags.withoutSelection - Не выделять объект
   * @param flags.withoutAdding - Не добавлять объект в canvas
   */
  public addRectangle(
    {
      id = `rect-${nanoid()}`,
      left,
      top,
      width = 100,
      height = 100,
      fill = 'blue',
      ...rest
    }:Partial<RectProps> = {},
    { withoutSelection, withoutAdding }:ShapeCreationFlags = {}
  ): Rect {
    const { canvas } = this.editor

    const rect = new Rect({
      id,
      left,
      top,
      width,
      height,
      fill,
      ...rest
    })

    if (!left && !top) {
      canvas.centerObject(rect)
    }

    if (withoutAdding) return rect

    canvas.add(rect)

    if (!withoutSelection) {
      canvas.setActiveObject(rect)
    }

    canvas.renderAll()
    return rect
  }

  /**
   * Добавление круга
   * @param shapeOptions
   * @param shapeOptions.id - Уникальный идентификатор фигуры
   * @param shapeOptions.left - Координата X
   * @param shapeOptions.top - Координата Y
   * @param shapeOptions.radius - Радиус
   * @param shapeOptions.fill - Цвет заливки
   * @param shapeOptions.originX - Ориентация по X
   * @param shapeOptions.originY - Ориентация по Y
   * @param shapeOptions.rest - Остальные параметры
   *
   * @param flags - Флаги для управления поведением
   * @param flags.withoutSelection - Не выделять объект
   * @param flags.withoutAdding - Не добавлять объект в canvas
   */
  public addCircle(
    {
      id = `circle-${nanoid()}`,
      left,
      top,
      radius = 50,
      fill = 'green',
      ...rest
    }:Partial<CircleProps> = {},
    { withoutSelection, withoutAdding }:ShapeCreationFlags = {}
  ): Circle {
    const { canvas } = this.editor

    const circle = new Circle({
      id,
      left,
      top,
      fill,
      radius,
      ...rest
    })

    if (!left && !top) {
      canvas.centerObject(circle)
    }

    if (withoutAdding) return circle
    canvas.add(circle)

    if (!withoutSelection) {
      canvas.setActiveObject(circle)
    }

    canvas.renderAll()
    return circle
  }

  /**
   * Добавление треугольника
   * @param shapeOptions
   * @param shapeOptions.id - Уникальный идентификатор фигуры
   * @param shapeOptions.left - Координата X
   * @param shapeOptions.top - Координата Y
   * @param shapeOptions.width - Ширина
   * @param shapeOptions.height - Высота
   * @param shapeOptions.originX - Ориентация по X
   * @param shapeOptions.originY - Ориентация по Y
   * @param shapeOptions.fill - Цвет заливки
   * @param shapeOptions.rest - Остальные параметры
   *
   * @param flags - Флаги для управления поведением
   * @param flags.withoutSelection - Не выделять объект
   * @param flags.withoutAdding - Не добавлять объект в canvas
   */
  public addTriangle(
    {
      id = `triangle-${nanoid()}`,
      left,
      top,
      width = 100,
      height = 100,
      fill = 'yellow',
      ...rest
    }:Partial<FabricObject> = {},
    { withoutSelection, withoutAdding }:ShapeCreationFlags = {}
  ): Triangle {
    const { canvas } = this.editor

    const triangle = new Triangle({
      id,
      left,
      top,
      fill,
      width,
      height,
      ...rest
    })

    if (!left && !top) {
      canvas.centerObject(triangle)
    }

    if (withoutAdding) return triangle
    canvas.add(triangle)

    if (!withoutSelection) {
      canvas.setActiveObject(triangle)
    }

    canvas.renderAll()
    return triangle
  }
}
