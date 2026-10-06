// @ts-nocheck

/**
 * Initializes demo listeners for controlling InteractionBlocker through the editor's public API.
 */
export default ({ editorInstance, controls }) => {
  const {
    blockEditorBtn,
    blockEditorWithAiOverlayBtn,
    unblockEditorBtn,
    interactionBlockerStateNode
  } = controls

  /**
   * Synchronizes demo controls with the editor's current blocked state.
   */
  const syncInteractionBlockerControls = () => {
    const { isBlocked } = editorInstance.interactionBlocker

    interactionBlockerStateNode.textContent = isBlocked ? 'Blocked' : 'Unblocked'

    if (blockEditorBtn) {
      blockEditorBtn.disabled = isBlocked
    }

    if (blockEditorWithAiOverlayBtn) {
      blockEditorWithAiOverlayBtn.disabled = isBlocked
    }

    if (unblockEditorBtn) {
      unblockEditorBtn.disabled = !isBlocked
    }
  }

  /**
   * Registers listeners for directly controlling editor blocking.
   */
  const initActionListeners = () => {
    blockEditorBtn?.addEventListener('click', () => {
      editorInstance.interactionBlocker.block()
    })

    blockEditorWithAiOverlayBtn?.addEventListener('click', () => {
      editorInstance.interactionBlocker.block({ overlay: 'ai-generation' })
    })

    unblockEditorBtn?.addEventListener('click', () => {
      editorInstance.interactionBlocker.unblock()
    })
  }

  /**
   * Registers listeners for public editor state change events.
   */
  const initStateListeners = () => {
    editorInstance.canvas.on('editor:disabled', syncInteractionBlockerControls)
    editorInstance.canvas.on('editor:enabled', syncInteractionBlockerControls)
  }

  syncInteractionBlockerControls()
  initActionListeners()
  initStateListeners()
}
