import { ActiveSelection, FabricObject, Group } from 'fabric'
import { nanoid } from 'nanoid'

type IdentityMaterializationEntry = {
  object: FabricObject
  enableEvented: boolean
}

/**
 * Assigns fresh IDs to the root object and the entire nested branch of materialized objects.
 * `evented` is restored only for top-level objects and ActiveSelection children
 * that actually become separate canvas objects.
 */
export const materializeObjectIdentity = ({
  rootObject,
  enableEvented = true
}: {
  rootObject: FabricObject
  enableEvented?: boolean
}): void => {
  const pending: IdentityMaterializationEntry[] = [{
    object: rootObject,
    enableEvented
  }]

  for (let index = 0; index < pending.length; index += 1) {
    const currentEntry = pending[index]
    const updates: {
      id: string
      evented?: boolean
    } = {
      id: `${currentEntry.object.type}-${nanoid()}`
    }

    if (currentEntry.enableEvented) {
      updates.evented = true
    }

    currentEntry.object.set(updates)

    let childObjects: FabricObject[] | null = null
    let shouldEnableChildEvented = false

    if (currentEntry.object instanceof ActiveSelection) {
      childObjects = currentEntry.object.getObjects()
      shouldEnableChildEvented = true
    } else if (currentEntry.object instanceof Group) {
      childObjects = currentEntry.object.getObjects()
    }

    if (!childObjects) continue

    for (let childIndex = 0; childIndex < childObjects.length; childIndex += 1) {
      pending.push({
        object: childObjects[childIndex],
        enableEvented: shouldEnableChildEvented
      })
    }
  }
}
