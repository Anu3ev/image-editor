export default class ModuleLoader {
  /**
   * Кэш для загруженных модулей.
   * Ключ - имя модуля, значение - промис загрузки модуля
   */
  private cache: Map<string, Promise<object>>

  /**
   * Объект, содержащий функции для загрузки модулей.
   * Ключ - имя модуля, значение - функция, возвращающая промис загрузки модуля.
   * Например, для загрузки 'jspdf' будет использоваться функция, которая импортирует 'jspdf'.
   */
  private loaders: Record<string, () => Promise<object>>

  /**
   * Класс для динамической загрузки внешних модулей.
   */
  constructor() {
    this.cache = new Map()
    this.loaders = {
      jspdf: () => import('jspdf')
    }
  }

  /**
   * Загружает модуль по имени и сохраняет промис в кеше.
   * @param name — строковый литерал, например 'jspdf'.
   * @returns Промис, который разрешается в загруженный модуль.
   */
  public loadModule<T extends object = object>(name: string): Promise<T> {
    if (!this.loaders[name]) {
      return Promise.reject(new Error(`Unknown module "${name}"`))
    }

    if (!this.cache.has(name)) {
      this.cache.set(name, this.loaders[name]())
    }

    return this.cache.get(name)! as Promise<T>
  }
}
