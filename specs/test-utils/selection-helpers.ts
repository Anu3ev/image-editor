import { FabricObject } from 'fabric'
import { createEditorStub } from './editor-helpers'

export type SelectionTestSetup = {
  editor: ReturnType<typeof createEditorStub>
  getActiveObject: () => FabricObject | null
}

/**
 * Создает объект для тестов выделения.
 * @param params - параметры объекта
 * @param params.id - идентификатор объекта
 * @param params.locked - признак блокировки
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
 * Создает редактор и настраивает активное выделение для тестов SelectionManager.
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
