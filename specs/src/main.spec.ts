import initEditor from '../../src/main'
import { ImageEditor } from '../../src/editor'

describe('initEditor', () => {
  let initialize: jest.SpiedFunction<ImageEditor['init']>
  let destroy: jest.SpiedFunction<ImageEditor['destroy']>

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-container"></div>'
    initialize = jest.spyOn(ImageEditor.prototype, 'init').mockImplementation(function(this: ImageEditor) {
      return Promise.resolve().then(() => this.options._onReadyCallback?.(this))
    })
    destroy = jest.spyOn(ImageEditor.prototype, 'destroy').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    document.body.innerHTML = ''
    delete window['test-container']
  })

  it('отклоняет инициализацию, если контейнер не найден', async() => {
    await expect(initEditor('missing')).rejects.toThrow('Контейнер с ID "missing" не найден.')
    expect(initialize).not.toHaveBeenCalled()
  })

  it('создаёт один canvas и возвращает зарегистрированный готовый редактор', async() => {
    const editor = await initEditor('test-container')
    expect(editor).toBe(window['test-container'])
    expect(document.querySelectorAll('#test-container canvas')).toHaveLength(1)
    expect(editor.containerId).toBe('test-container-canvas')
    expect(editor.options.editorContainer).toBe(document.getElementById('test-container'))
  })

  it('сохраняет переданные опции и вызывает колбэк готовности', async() => {
    const callback = jest.fn()
    const options = { _onReadyCallback: callback }
    const editor = await initEditor('test-container', options)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(editor)
    expect(options).toEqual({ _onReadyCallback: callback })
  })

  it('отклоняет ошибку инициализации и удаляет созданный canvas', async() => {
    const error = new Error('Initialization failed')
    initialize.mockRejectedValueOnce(error)

    await expect(initEditor('test-container')).rejects.toBe(error)

    expect(destroy).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('#test-container canvas')).toHaveLength(0)
    expect(window['test-container']).toBeUndefined()
  })

  it('не создаёт дубликат canvas и не заменяет редактор при одновременной инициализации', async() => {
    const first = initEditor('test-container')
    const editor = window['test-container']
    await expect(initEditor('test-container')).rejects.toThrow(/already exists/)
    expect(initialize).toHaveBeenCalledTimes(1)
    expect(window['test-container']).toBe(editor)
    expect(document.querySelectorAll('#test-container canvas')).toHaveLength(1)
    await first
  })

  it('удаляет созданный canvas при синхронной ошибке конструктора', async() => {
    initialize.mockImplementationOnce(() => { throw new Error('Construction failed') })
    await expect(initEditor('test-container')).rejects.toThrow('Construction failed')
    expect(document.querySelectorAll('#test-container canvas')).toHaveLength(0)
  })
})
