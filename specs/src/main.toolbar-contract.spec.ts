import initEditor from '../../src/main'
import { ImageEditor } from '../../src/editor'
import { defaults } from '../../src/editor/defaults'

const DEFAULT_ACTION_HANDLES = [
  'copyPaste', 'lock', 'bringToFront', 'sendToBack', 'bringForward', 'sendBackwards', 'delete'
]

describe('Toolbar initialization contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="toolbar-host"></div>'
    jest.spyOn(ImageEditor.prototype, 'init').mockResolvedValue()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    document.body.innerHTML = ''
    delete window['toolbar-host']
  })

  it('keeps the built-in actions in exported defaults', () => {
    expect(Object.keys(defaults.toolbar ?? {}).sort()).toEqual(['actions', 'lockedActions'])
    expect(defaults.toolbar?.actions?.map(({ handle }) => handle)).toEqual(DEFAULT_ACTION_HANDLES)
    expect(defaults.toolbar?.lockedActions).toEqual([{ handle: 'unlock', name: 'Unlock' }])
  })

  it.each([
    ['en', 'Duplicate', 'Unlock'],
    ['ru', 'Создать копию', 'Разблокировать']
  ])('exposes localized default actions in %s editor options', async(language, duplicate, unlock) => {
    const editor = await initEditor('toolbar-host', { language })

    expect(editor.options.showToolbar).toBe(true)
    expect(editor.options.toolbar?.actions?.map(({ handle }) => handle)).toEqual(DEFAULT_ACTION_HANDLES)
    expect(editor.options.toolbar?.actions?.[0]).toEqual({ handle: 'copyPaste', name: duplicate })
    expect(editor.options.toolbar?.lockedActions).toEqual([{ handle: 'unlock', name: unlock }])
  })

  it('preserves caller toolbar overrides without filling or reordering their arrays', async() => {
    const toolbar = {
      actions: [{ handle: 'second', name: 'Second' }, { handle: 'first', name: 'First' }],
      handlers: { first: jest.fn(), second: jest.fn() }
    }
    const editor = await initEditor('toolbar-host', { language: 'ru', toolbar })

    expect(editor.options.toolbar).toBe(toolbar)
    expect(editor.options.toolbar.actions).toBe(toolbar.actions)
    expect(editor.options.toolbar.handlers).toBe(toolbar.handlers)
    expect(editor.options.toolbar.lockedActions).toBeUndefined()
  })
})
