// @ts-nocheck

/**
 * Инициализирует demo listeners для управления InteractionBlocker через публичный API редактора.
 */
export default ({ editorInstance, controls }) => {
  const {
    blockEditorBtn,
    unblockEditorBtn,
    interactionBlockerStateNode
  } = controls

  /**
   * Синхронизирует demo-контролы с текущим состоянием блокировки редактора.
   */
  const syncInteractionBlockerControls = () => {
    const { isBlocked } = editorInstance.interactionBlocker

    interactionBlockerStateNode.textContent = isBlocked ? 'Blocked' : 'Unblocked'

    if (blockEditorBtn) {
      blockEditorBtn.disabled = isBlocked
    }

    if (unblockEditorBtn) {
      unblockEditorBtn.disabled = !isBlocked
    }
  }

  /**
   * Подписывает listeners на прямое управление блокировкой редактора.
   */
  const initActionListeners = () => {
    blockEditorBtn?.addEventListener('click', () => {
      editorInstance.interactionBlocker.block()
    })

    unblockEditorBtn?.addEventListener('click', () => {
      editorInstance.interactionBlocker.unblock()
    })
  }

  /**
   * Подписывает listeners на публичные события изменения состояния редактора.
   */
  const initStateListeners = () => {
    editorInstance.canvas.on('editor:disabled', syncInteractionBlockerControls)
    editorInstance.canvas.on('editor:enabled', syncInteractionBlockerControls)
  }

  syncInteractionBlockerControls()
  initActionListeners()
  initStateListeners()
}
