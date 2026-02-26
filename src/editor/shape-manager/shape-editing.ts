import {
  Canvas,
  FabricObject,
  Textbox
} from 'fabric'
import {
  ShapeGroup,
  ShapeTextNode
} from './types'
import {
  getShapeNodes,
  isShapeGroup,
  resolveShapeGroupFromTarget
} from './shape-utils'

type ShapeMouseDownEvent = {
  target?: FabricObject | null
  e?: Event | MouseEvent
  subTargets?: FabricObject[]
}

type ShapeTextEditingEvent = {
  target?: FabricObject | null
}

/**
 * Контроллер редактирования текста внутри shape-группы.
 */
export default class ShapeEditingController {
  /**
   * Fabric canvas редактора.
   */
  private canvas: Canvas

  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
  }

  /**
   * Переводит текстовый узел в базовый режим (без выделения и без событий).
   */
  public prepareTextNode({ text }: { text: ShapeTextNode }): void {
    text.set({
      hasBorders: false,
      hasControls: false,
      evented: false,
      selectable: false,
      editable: true,
      shapeNodeType: 'text'
    })
    text.setCoords()
  }

  /**
   * Обрабатывает клик по shape-группе и переводит текст в режим редактирования по повторному клику.
   */
  public handleMouseDown = (
    event: ShapeMouseDownEvent
  ): void => {
    const {
      target,
      e,
      subTargets = []
    } = event

    const group = resolveShapeGroupFromTarget({
      target,
      subTargets
    })

    if (!group) return

    const activeObject = this.canvas.getActiveObject()
    const isGroupSelected = activeObject === group

    if (!isGroupSelected) {
      const { text } = getShapeNodes({ group })
      if (text) {
        this.prepareTextNode({ text })
      }
      return
    }

    if (!(e instanceof MouseEvent)) return
    if (e.detail < 2) return

    this.enterTextEditing({ group })
  }

  /**
   * Возвращает текстовый узел в обычный режим после завершения ввода.
   */
  public handleTextEditingExited = (event: ShapeTextEditingEvent): void => {
    const { target } = event
    if (!(target instanceof Textbox)) return

    const text = target as ShapeTextNode
    const { group } = text

    if (!isShapeGroup(group)) {
      this.prepareTextNode({ text })
      return
    }

    this.prepareTextNode({ text })

    if (this.canvas.getActiveObject() === text) {
      this.canvas.setActiveObject(group)
    }

    this.canvas.requestRenderAll()
  }

  /**
   * Включает текстовый режим редактирования для выбранной shape-группы.
   */
  public enterTextEditing({ group }: { group: ShapeGroup }): void {
    const { text } = getShapeNodes({ group })
    if (!text) return

    text.set({
      evented: true,
      selectable: true
    })

    this.canvas.setActiveObject(text)

    if (!text.isEditing) {
      text.enterEditing()
      text.selectAll()
    }

    this.canvas.requestRenderAll()
  }
}
