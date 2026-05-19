/**
 * Делает устойчивую сериализацию значения с сортировкой ключей объектов.
 */
const stableStringify = ({ value }: { value: unknown }): string => {
  /**
   * Нормализует значение для стабильной сериализации.
   */
  const normalizeValue = ({ value: rawValue }: { value: unknown }): unknown => {
    if (Array.isArray(rawValue)) {
      const normalizedArray: unknown[] = []

      for (let index = 0; index < rawValue.length; index += 1) {
        normalizedArray.push(normalizeValue({ value: rawValue[index] }))
      }

      return normalizedArray
    }

    if (rawValue && typeof rawValue === 'object') {
      const normalizedObject: Record<string, unknown> = {}
      const keys = Object.keys(rawValue).sort()

      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index]
        normalizedObject[key] = normalizeValue({
          value: (rawValue as Record<string, unknown>)[key]
        })
      }

      return normalizedObject
    }

    return rawValue
  }

  return JSON.stringify(normalizeValue({ value }))
}

export const createSimpleDiffPatcher = () => ({
  diff: jest.fn((prev: any, next: any) => {
    if (typeof next === 'undefined') return null

    const clone = JSON.parse(JSON.stringify(next))
    const prevStr = stableStringify({ value: prev })
    const nextStr = stableStringify({ value: clone })
    if (prevStr === nextStr) return null

    return { next: clone }
  }),
  patch: jest.fn((state: any, diff: any) => {
    if (!diff) {
      return JSON.parse(JSON.stringify(state))
    }
    return JSON.parse(JSON.stringify(diff.next))
  }),
  clone: jest.fn(),
  unpatch: jest.fn()
})
