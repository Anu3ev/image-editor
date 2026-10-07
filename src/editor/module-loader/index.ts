import { english, type Translate } from '../i18n'

export default class ModuleLoader {
  /**
   * Cache for loaded modules.
   * Key: module name; value: module loading promise
   */
  private cache: Map<string, Promise<object>>

  /**
   * Object containing module loading functions.
   * Key: module name; value: function returning a module loading promise.
   * For example, loading 'jspdf' uses a function that imports 'jspdf'.
   */
  private loaders: Record<string, () => Promise<object>>

  /**
   * Class for dynamically loading external modules.
   */
  constructor(private readonly t: Translate = english) {
    this.cache = new Map()
    this.loaders = {
      jspdf: () => import('jspdf')
    }
  }

  /**
   * Loads a module by name and caches the promise.
   * @param name — String literal, for example 'jspdf'.
   * @returns A promise that resolves to the loaded module.
   */
  public loadModule<T extends object = object>(name: string): Promise<T> {
    if (!this.loaders[name]) {
      return Promise.reject(new Error(this.t('modules.errors.unknownModule', { name })))
    }

    if (!this.cache.has(name)) {
      this.cache.set(name, this.loaders[name]())
    }

    return this.cache.get(name)! as Promise<T>
  }
}
