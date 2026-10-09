import ModuleLoader from '../../../../src/editor/module-loader'

describe('ModuleLoader technical errors', () => {
  it.each(['example', '<custom-module>'])('reports an English error containing the original module name: %s', async(name) => {
    await expect(new ModuleLoader().loadModule(name)).rejects.toThrow(`Unknown module "${name}"`)
  })
})
