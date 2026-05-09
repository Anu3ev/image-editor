import {
  FabricObject,
  Group,
  Textbox
} from 'fabric'
import type {
  ShapeGroupLike,
  ShapeTextNode
} from '../types'

/**
 * Возвращает shape-группу в базовый интерактивный режим и включает sub-target клики.
 * Временное editing-состояние не должно переживать clone/deserialize/materialization.
 */
export const applyShapeGroupInteractivity = ({ group }: { group: ShapeGroupLike }): void => {
  const isLocked = Boolean(group.locked)
  const groupWithInteractive = group as Group & {
    interactive?: boolean
    setInteractive?: (value: boolean) => void
  }

  if (typeof groupWithInteractive.setInteractive === 'function') {
    groupWithInteractive.setInteractive(true)
  }

  groupWithInteractive.set({
    evented: true,
    interactive: true,
    lockMovementX: isLocked,
    lockMovementY: isLocked,
    moveCursor: undefined,
    selectable: true,
    subTargetCheck: true,
    hoverCursor: undefined
  })
}

/**
 * Переводит текстовый узел shape в базовый режим без выделения и drag-поведения,
 * сохраняя текущее locked-состояние.
 */
export const prepareShapeTextNode = ({ text }: { text: ShapeTextNode }): void => {
  const isLocked = Boolean(text.locked || text.group?.locked)

  text.set({
    hasBorders: false,
    hasControls: false,
    evented: false,
    selectable: false,
    lockMovementX: isLocked,
    lockMovementY: isLocked,
    editable: !isLocked,
    autoExpand: false,
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
