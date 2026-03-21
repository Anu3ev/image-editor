import {
  FabricObject,
  Group,
  Textbox
} from 'fabric'
import type {
  ShapeGroupLike,
  ShapeTextNode
} from './types'

/**
 * Включает интерактивность группы и поддержку sub-target кликов.
 */
export const applyShapeGroupInteractivity = ({ group }: { group: ShapeGroupLike }): void => {
  const groupWithInteractive = group as Group & {
    interactive?: boolean
    setInteractive?: (value: boolean) => void
  }

  if (typeof groupWithInteractive.setInteractive === 'function') {
    groupWithInteractive.setInteractive(true)
  }

  groupWithInteractive.set({
    interactive: true,
    subTargetCheck: true
  })
}

/**
 * Переводит текстовый узел shape в базовый режим без выделения и drag-поведения.
 */
export const prepareShapeTextNode = ({ text }: { text: ShapeTextNode }): void => {
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
 * Отключает встроенный fit-content layout группы, чтобы композитом управлял shape-domain.
 */
export const detachShapeGroupAutoLayout = ({ group }: { group: ShapeGroupLike }): void => {
  const groupWithLayoutManager = group as ShapeGroupLike & {
    layoutManager?: {
      unsubscribeTargets?: (options: {
        target: Group
        targets: FabricObject[]
      }) => void
    }
  }

  const { layoutManager } = groupWithLayoutManager
  if (!layoutManager || typeof layoutManager.unsubscribeTargets !== 'function') return

  const targets = group.getObjects()
  if (targets.length === 0) return

  layoutManager.unsubscribeTargets({
    target: group,
    targets
  })
}

/**
 * Возвращает текстовый узел shape-группы.
 */
export const getShapeRuntimeTextNode = ({ group }: { group: ShapeGroupLike }): ShapeTextNode | null => {
  const objects = group.getObjects()

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    if (object.shapeNodeType === 'text' && object instanceof Textbox) {
      return object as ShapeTextNode
    }
  }

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    if (object instanceof Textbox) {
      return object as ShapeTextNode
    }
  }

  return null
}
