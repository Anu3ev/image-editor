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
 * Returns the shape group to its base interactive mode and enables sub-target clicks.
 * Temporary editing state must not survive clone/deserialize/materialization.
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
 * Returns the shape's text node to its base mode without selection or drag behavior,
 * preserving the current locked state.
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
 * Disables the group's built-in fit-content layout so the shape domain can manage the composite.
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
 * Returns the shape group's text node.
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
