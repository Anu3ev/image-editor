/**
 * Простой тест для начала изучения Jest
 */

describe('Основы тестирования', () => {
  test('проверка равенства чисел', () => {
    expect(2 + 2).toBe(4)
  })

  test('проверка равенства строк', () => {
    const greeting = 'Hello World'
    expect(greeting).toBe('Hello World')
  })

  test('проверка массивов', () => {
    const fruits = ['apple', 'banana', 'orange']
    expect(fruits).toContain('banana')
    expect(fruits).toHaveLength(3)
  })

  test('проверка объектов', () => {
    const user = {
      name: 'John',
      age: 30,
      email: 'john@example.com'
    }

    expect(user).toHaveProperty('name')
    expect(user.age).toBeGreaterThan(18)
    expect(user.email).toMatch(/@/)
  })

  test('проверка функций', () => {
    const multiply = (a: number, b: number) => a * b

    expect(multiply(3, 4)).toBe(12)
    expect(multiply(0, 5)).toBe(0)
    expect(multiply(-2, 3)).toBe(-6)
  })

  test('асинхронные тесты с Promise', async () => {
    const asyncFunction = () => Promise.resolve('Success!')

    await expect(asyncFunction()).resolves.toBe('Success!')
  })

  test('тест с ошибками', () => {
    const throwError = () => {
      throw new Error('Something went wrong')
    }

    expect(throwError).toThrow('Something went wrong')
  })
})
