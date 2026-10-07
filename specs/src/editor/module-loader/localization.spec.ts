import ModuleLoader from '../../../../src/editor/module-loader'
import { createTranslator } from '../../../../src/editor/i18n'

describe('ModuleLoader localization', () => {
  it('uses English by default and interpolates module names without escaping', async() => {
    await expect(new ModuleLoader().loadModule('<custom-module>')).rejects.toThrow('Unknown module "<custom-module>"')
  })

  it('keeps module errors independent across languages', async() => {
    const russian = new ModuleLoader(createTranslator({ language: 'ru' }))
    const english = new ModuleLoader(createTranslator({ language: 'en' }))
    await expect(russian.loadModule('example')).rejects.toThrow('Неизвестный модуль «example»')
    await expect(english.loadModule('example')).rejects.toThrow('Unknown module "example"')
  })
})
