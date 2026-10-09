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
    await expect(initEditor('missing')).rejects.toThrow('Container with ID "missing" was not found.')
    expect(initialize).not.toHaveBeenCalled()
  })

  it('создаёт один canvas и возвращает зарегистрированный готовый редактор', async() => {
    const initialization = initEditor('test-container')
    expect(initialization).toBeInstanceOf(Promise)
    const editor = await initialization
    expect(editor).toBe(window['test-container'])
    expect(document.querySelectorAll('#test-container canvas')).toHaveLength(1)
    expect(editor.containerId).toBe('test-container-canvas')
    expect(editor.options.editorContainer).toBe(document.getElementById('test-container'))
  })

  it('ожидает полной готовности перед завершением initEditor', async() => {
    let finish!: () => void
    initialize.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    const initialized = jest.fn()
    const initialization = initEditor('test-container').then(initialized)

    await Promise.resolve()
    expect(initialized).not.toHaveBeenCalled()
    finish()
    await initialization
    expect(initialized).toHaveBeenCalledWith(window['test-container'])
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

  it('не удаляет чужую глобальную ссылку при ошибке старой инициализации', async() => {
    const failure = new Error('Initialization failed')
    initialize.mockRejectedValueOnce(failure)
    const initialization = initEditor('test-container')
    const replacement = { id: 'replacement' }
    window['test-container'] = replacement

    await expect(initialization).rejects.toBe(failure)
    expect(window['test-container']).toBe(replacement)
    expect(document.querySelectorAll('#test-container canvas')).toHaveLength(0)
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

  it('удаляет созданный canvas и сохраняет чужую регистрацию при синхронной ошибке конструктора', async() => {
    const foreignRegistration = { id: 'foreign' }
    window['test-container'] = foreignRegistration
    initialize.mockImplementationOnce(() => { throw new Error('Construction failed') })
    await expect(initEditor('test-container')).rejects.toThrow('Construction failed')
    expect(document.querySelectorAll('#test-container canvas')).toHaveLength(0)
    expect(window['test-container']).toBe(foreignRegistration)
  })
})
