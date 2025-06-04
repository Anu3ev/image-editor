import { ImageEditor } from '../index'
import { Rect, Circle, Triangle } from 'fabric'
import { ExtendedRectProps, ExtendedCircleProps, ExtendedFabricObject } from '../types'
import { nanoid } from 'nanoid'

type ShapeCreationFlags = {
  withoutSelection?: boolean
  withoutAdding?: boolean
}

export default class ShapeManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   * @type {ImageEditor}
   */
  editor: ImageEditor

  /**
   * Менеджер фигур для редактора.
   * @param {Object} options - Опции и настройки менеджера фигур.
   * @param {ImageEditor} options.editor - Ссылка на экземпляр редактора.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Добавление прямоугольника
   * @param {Object} shapeOptions
   * @param {String} shapeOptions.id - Уникальный идентификатор фигуры
   * @param {Number} shapeOptions.left - Координата X
   * @param {Number} shapeOptions.top - Координата Y
   * @param {Number} shapeOptions.width - Ширина
   * @param {Number} shapeOptions.height - Высота
   * @param {String} shapeOptions.fill - Цвет заливки
   * @param {Rect} shapeOptions.rest - Остальные параметры
   *
   * @param {Object} flags - Флаги для управления поведением
   * @param {Object} flags.withoutSelection - Не выделять объект
   * @param {Object} flags.withoutAdding - Не добавлять объект в canvas
   */
  addRectangle(
    {
      id = `rect-${nanoid()}`,
      left,
      top,
      width = 100,
      height = 100,
      fill = 'blue',
      ...rest
    }:Partial<ExtendedRectProps> = {},
    { withoutSelection, withoutAdding }:ShapeCreationFlags = {}
  ) {
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
   * @param {Object} shapeOptions
   * @param {String} shapeOptions.id - Уникальный идентификатор фигуры
   * @param {Number} shapeOptions.left - Координата X
   * @param {Number} shapeOptions.top - Координата Y
   * @param {Number} shapeOptions.radius - Радиус
   * @param {string} shapeOptions.fill - Цвет заливки
   * @param {String} shapeOptions.originX - Ориентация по X
   * @param {String} shapeOptions.originY - Ориентация по Y
   * @param {Circle} shapeOptions.rest - Остальные параметры
   *
   * @param {Object} flags - Флаги для управления поведением
   * @param {Object} flags.withoutSelection - Не выделять объект
   * @param {Object} flags.withoutAdding - Не добавлять объект в canvas
   */
  addCircle(
    {
      id = `circle-${nanoid()}`,
      left,
      top,
      radius = 50,
      fill = 'green',
      ...rest
    }:Partial<ExtendedCircleProps> = {},
    { withoutSelection, withoutAdding }:ShapeCreationFlags = {}
  ) {
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
   * @param {Object} shapeOptions
   * @param {String} shapeOptions.id - Уникальный идентификатор фигуры
   * @param {Number} shapeOptions.left - Координата X
   * @param {Number} shapeOptions.top - Координата Y
   * @param {Number} shapeOptions.width - Ширина
   * @param {Number} shapeOptions.height - Высота
   * @param {String} shapeOptions.originX - Ориентация по X
   * @param {String} shapeOptions.originY - Ориентация по Y
   * @param {String} shapeOptions.fill - Цвет заливки
   * @param {Triangle} shapeOptions.rest - Остальные параметры
   *
   * @param {Object} flags - Флаги для управления поведением
   * @param {Object} flags.withoutSelection - Не выделять объект
   * @param {Object} flags.withoutAdding - Не добавлять объект в canvas
   */
  addTriangle(
    {
      id = `triangle-${nanoid()}`,
      left,
      top,
      width = 100,
      height = 100,
      fill = 'yellow',
      ...rest
    }:Partial<ExtendedFabricObject> = {},
    { withoutSelection, withoutAdding }:ShapeCreationFlags = {}
  ) {
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
