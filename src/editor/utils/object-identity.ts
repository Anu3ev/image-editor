import { ActiveSelection, FabricObject, Group } from 'fabric'
import { nanoid } from 'nanoid'

type IdentityMaterializationEntry = {
  object: FabricObject
  enableEvented: boolean
}

/**
 * Назначает свежие id корневому объекту и всей вложенной ветке materialized-объектов.
 * `evented` восстанавливается только у объектов верхнего уровня и у children ActiveSelection,
 * которые реально становятся отдельными canvas-объектами.
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
