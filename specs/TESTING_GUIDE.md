# Руководство по тестированию для Image Editor

## 🎯 Введение в тестирование

Тестирование - это процесс проверки того, что ваш код работает как ожидается. В этом руководстве мы пошагово изучим, как писать тесты для редактора изображений.

## 📚 Основные концепции

### 1. Виды тестов
- **Unit-тесты** - тестируют отдельные функции/классы
- **Integration-тесты** - тестируют взаимодействие между компонентами
- **E2E-тесты** - тестируют полные пользовательские сценарии

### 2. Анатомия теста
```typescript
describe('Что мы тестируем', () => {
  test('что должно произойти', () => {
    // Arrange - подготовка
    const input = 'test-data'

    // Act - действие
    const result = functionToTest(input)

    // Assert - проверка
    expect(result).toBe('expected-result')
  })
})
```

### 3. Основные Jest матчеры
```typescript
// Равенство
expect(actual).toBe(expected)              // точное совпадение
expect(actual).toEqual(expected)           // глубокое сравнение объектов

// Числа
expect(number).toBeGreaterThan(3)
expect(number).toBeLessThan(10)
expect(number).toBeCloseTo(0.3)

// Строки
expect(string).toMatch(/pattern/)
expect(string).toContain('substring')

// Массивы
expect(array).toContain(item)
expect(array).toHaveLength(3)

// Объекты
expect(object).toHaveProperty('key')
expect(object).toHaveProperty('key', value)

// Исключения
expect(() => { throw new Error() }).toThrow()
expect(promise).rejects.toThrow()
expect(promise).resolves.toBe(value)

// Функции
expect(mockFunction).toHaveBeenCalled()
expect(mockFunction).toHaveBeenCalledWith(arg1, arg2)
```

## 🛠 Практические примеры для вашего проекта

### 1. Тестирование утилитарных функций
```typescript
// Простая функция для тестирования
const formatFileName = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-')
}

// Тест
test('должен форматировать имя файла', () => {
  expect(formatFileName('My Image File.png')).toBe('my-image-file-png')
})
```

### 2. Тестирование с моками
```typescript
// Мокаем внешние зависимости
const mockFetch = jest.fn()
global.fetch = mockFetch

test('должен загрузить изображение', async () => {
  // Настраиваем мок
  mockFetch.mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob())
  })

  // Тестируем функцию
  const result = await loadImage('image.jpg')

  // Проверяем
  expect(mockFetch).toHaveBeenCalledWith('image.jpg')
  expect(result).toBeInstanceOf(Blob)
})
```

### 3. Тестирование DOM операций
```typescript
test('должен создать элемент canvas', () => {
  // Мокаем DOM
  const mockElement = { appendChild: jest.fn() }
  document.getElementById = jest.fn().mockReturnValue(mockElement)

  // Тестируем
  const canvas = createCanvas('test-container')

  // Проверяем
  expect(document.getElementById).toHaveBeenCalledWith('test-container')
  expect(mockElement.appendChild).toHaveBeenCalled()
})
```

## 🚀 План тестирования для Image Editor

### Этап 1: Простые функции (НАЧНИТЕ ЗДЕСЬ)
1. ✅ Утилитарные функции (createCanvasId, validateContainerId)
2. ✅ Форматирование данных (parseImageDimensions)
3. Валидация входных параметров
4. Обработка ошибок

### Этап 2: Компоненты без внешних зависимостей
1. Конфигурационные объекты
2. Типы и интерфейсы
3. Константы и defaults

### Этап 3: Менеджеры (средний уровень)
1. ErrorManager - обработка ошибок
2. HistoryManager - управление историей
3. ClipboardManager - работа с буфером обмена

### Этап 4: Сложные компоненты
1. CanvasManager - управление канвасом
2. ImageManager - загрузка изображений
3. TransformManager - трансформации

### Этап 5: Интеграционные тесты
1. Взаимодействие между менеджерами
2. Полные пользовательские сценарии
3. Тестирование с реальными данными

## 💡 Советы для начинающих

1. **Начинайте с простого** - тестируйте сначала чистые функции без побочных эффектов
2. **Один тест - одна проверка** - не проверяйте слишком много в одном тесте
3. **Говорящие названия** - название теста должно объяснять, что проверяется
4. **Используйте AAA паттерн** - Arrange, Act, Assert
5. **Не тестируйте детали реализации** - тестируйте поведение, а не код

## 🔧 Следующие шаги

1. Запустите существующие тесты: `npm test`
2. Изучите примеры в `specs/src/basics.spec.ts`
3. Попробуйте написать тест для простой функции
4. Постепенно переходите к более сложным компонентам

## 📖 Полезные ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeScript Jest Setup](https://kulshekhar.github.io/ts-jest/)
