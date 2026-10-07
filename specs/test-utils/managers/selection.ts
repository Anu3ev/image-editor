import { FabricObject } from 'fabric'
import { createEditorStub } from '../editor/editor-stub'

export type SelectionTestSetup = {
  editor: ReturnType<typeof createEditorStub>
  getActiveObject: () => FabricObject | null
}

/**
 * Creates an object for selection tests.
 * @param params - Object parameters
 * @param params.id - Object identifier
 * @param params.locked - Whether the object is locked
 */
export const createSelectionObject = ({
  id,
  locked = false
}: {
  id?: string
  locked?: boolean
}): FabricObject => {
  return new FabricObject({ id, locked })
}

/**
 * Creates an editor and configures the active selection for SelectionManager tests.
 */
export const createSelectionTestSetup = (): SelectionTestSetup => {
  const editor = createEditorStub()
  const { canvas } = editor
  let activeObject: FabricObject | null = null

  canvas.getActiveObject = jest.fn(() => activeObject)
  canvas.setActiveObject = jest.fn((object: FabricObject) => {
    activeObject = object
  })
  canvas.selection = true

  return {
    editor,
    getActiveObject: () => activeObject
  }
}
