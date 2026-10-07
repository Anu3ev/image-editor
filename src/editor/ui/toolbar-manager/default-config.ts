import { ActiveSelection, FabricObject } from 'fabric'
import { ImageEditor } from '../..'
import { english, type Translate } from '../../i18n'
import {
  copyPasteIcon,
  lockIcon,
  unlockIcon,
  bringForwardIcon,
  sendBackwardsIcon,
  bringToFrontIcon,
  sendToBackIcon,
  deleteIcon
} from './icons'

/** Creates toolbar labels in the owning editor’s language. */
export const createDefaultConfig = (t: Translate = english) => ({
  style: {
    position: 'absolute',
    display: 'none',
    background: '#2B2D33',
    borderRadius: '8px',
    padding: '0 8px',
    height: '32px',
    gap: '10px',
    zIndex: 10,
    alignItems: 'center'
  },

  btnStyle: {
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '20px',
    width: '20px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    transform: 'scale(1)'
  },

  btnHover: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '50%',
    transform: 'scale(1.1)'
  },

  toolbarClass: 'fabric-editor-toolbar',
  btnClass: 'fabric-editor-toolbar-btn',

  lockedActions: [{
    name: t('ui.toolbar.unlock'),
    handle: 'unlock'
  }],

  actions: [
    {
      name: t('ui.toolbar.duplicate'),
      handle: 'copyPaste'
    },
    {
      name: t('ui.toolbar.lock'),
      handle: 'lock'
    },
    {
      name: t('ui.toolbar.bringToFront'),
      handle: 'bringToFront'
    },
    {
      name: t('ui.toolbar.sendToBack'),
      handle: 'sendToBack'
    },
    {
      name: t('ui.toolbar.bringForward'),
      handle: 'bringForward'
    },
    {
      name: t('ui.toolbar.sendBackward'),
      handle: 'sendBackwards'
    },
    {
      name: t('ui.toolbar.delete'),
      handle: 'delete'
    }
  ],

  offsetTop: 50,

  icons: {
    copyPaste: copyPasteIcon,
    delete: deleteIcon,
    lock: lockIcon,
    unlock: unlockIcon,
    bringToFront: bringToFrontIcon,
    sendToBack: sendToBackIcon,
    bringForward: bringForwardIcon,
    sendBackwards: sendBackwardsIcon
  },

  handlers: {
    copyPaste: async(editor: ImageEditor, target?: FabricObject | null) => {
      editor.clipboardManager.copyPaste(target ?? undefined)
    },

    delete: (editor: ImageEditor, target?: FabricObject | null) => {
      if (target instanceof ActiveSelection) {
        editor.deletionManager.deleteSelectedObjects({
          objects: target.getObjects()
        })
        return
      }

      if (!target) {
        editor.deletionManager.deleteSelectedObjects()
        return
      }

      editor.deletionManager.deleteSelectedObjects({
        objects: [target]
      })
    },

    lock: (editor: ImageEditor, target?: FabricObject | null) => {
      editor.objectLockManager.lockObject({
        object: target ?? undefined
      })
    },

    unlock: (editor: ImageEditor, target?: FabricObject | null) => {
      editor.objectLockManager.unlockObject({
        object: target ?? undefined
      })
    },

    bringForward: (editor: ImageEditor, target?: FabricObject | null) => {
      editor.layerManager.bringForward(target ?? undefined)
    },

    bringToFront: (editor: ImageEditor, target?: FabricObject | null) => {
      editor.layerManager.bringToFront(target ?? undefined)
    },

    sendToBack: (editor: ImageEditor, target?: FabricObject | null) => {
      editor.layerManager.sendToBack(target ?? undefined)
    },

    sendBackwards: (editor: ImageEditor, target?: FabricObject | null) => {
      editor.layerManager.sendBackwards(target ?? undefined)
    }
  }
})

export default createDefaultConfig()
