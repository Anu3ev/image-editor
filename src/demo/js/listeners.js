// @ts-nocheck

import {
  backgroundControls,
  canvasInfoControls,
  historyControls,
  montageControls,
  serializationControls,
  shapeControls,
  textControls,
  toolbarControls
} from './elements.js'

import initBackgroundListeners from './listeners/init-background-listeners.js'
import initCanvasStateListeners from './listeners/init-canvas-state-listeners.js'
import initEditorActionsListeners from './listeners/init-editor-actions-listeners.js'
import initSerializationListeners from './listeners/init-serialization-listeners.js'
import initShapeListeners from './listeners/init-shape-listeners.js'
import initTextListeners from './listeners/init-text-listeners.js'

/**
 * Инициализирует все demo listeners и связывает отдельные UI-модули между собой.
 */
export default (editorInstance) => {
  const textApi = initTextListeners({
    editorInstance,
    controls: textControls
  })

  const shapeApi = initShapeListeners({
    editorInstance,
    controls: shapeControls
  })

  initEditorActionsListeners({
    editorInstance,
    controls: toolbarControls,
    historyControls
  })

  initSerializationListeners({
    editorInstance,
    controls: serializationControls
  })

  initCanvasStateListeners({
    editorInstance,
    canvasInfoControls,
    montageControls,
    serializationControls,
    textApi,
    shapeApi
  })

  initBackgroundListeners({
    editorInstance,
    controls: backgroundControls
  })
}
