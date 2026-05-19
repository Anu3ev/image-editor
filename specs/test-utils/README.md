# Test utils

Вспомогательный код для unit-тестов редактора. Файлы сгруппированы по доменной ответственности, а не по типу (не «все моки в одну кучу», не «все хелперы в один файл»).

## Структура

```
test-utils/
  shared/          Общие типы и утилиты без привязки к конкретному домену
  events/          Фабрики DOM-событий и Fabric pointer-событий, rAF mock
  fabric/          Моки fabric-объектов, фона, контекста, class registry
  browser/         Моки browser API (clipboard, image globals)
  canvas/          Canvas stub, события canvas, инспекция handler-ов, placement, геометрия
  editor/          Options, stub редактора, createEditorWithMocks, createManagerTestMocks
  shape/           Shape factories, text measurement, editor stub, layout, scaling, editing, моки модулей
  text/            TextManager setup, scaling, template-textbox fixtures, decoration fixtures
  history/         HistoryManager setup, snapshot fixtures
  managers/        Setup для каждого менеджера редактора
```

## Правила добавления новых утилит

### Куда класть

1. **Если утилита нужна только одному менеджеру** — клади в `managers/<имя-менеджера>.ts`. Например, setup для `SelectionManager` живёт в `managers/selection.ts`.

2. **Если утилита нужна нескольким менеджерам, но относится к одной доменной области** — клади в соответствующую папку. Например, shape-фабрики (`createMockShapeGroup`, `createMockShapeNode`) лежат в `shape/factories.ts`, потому что они нужны и shape-тестам, и тестам object-lock, и transform.

3. **Если утилита — чистый мок внешней зависимости (Fabric, browser API)** — клади в `fabric/` или `browser/` соответственно. Не миксуй Fabric-моки с browser-моками в одном файле.

4. **Общие вещи без доменной привязки** (типы вроде `AnyFn`, diff-patcher) — в `shared/`.

5. **Фабрики событий** — в `events/`. DOM-события отдельно от Fabric-событий.

### Как называть файл

- Имя файла должно отвечать на вопрос «что внутри?» без необходимости открывать файл.
- Не используй суффикс `-helpers` — он не говорит о содержимом.
- Хорошо: `factories.ts`, `scaling.ts`, `geometry-objects.ts`, `dom-events.ts`.
- Плохо: `editor-helpers.ts`, `utils.ts`, `common.ts`.

### Что должно быть в файле

- Один файл — одна ответственность. Если файл начинает отвечать за две разные области, разделяй.
- Файл не должен превышать ~500 строк. Если больше — значит смешано несколько ответственностей.
- Экспортируй только то, что реально используется снаружи. Внутренние хелперы оставляй `private`.
- Используй `import type` для импортов, которые нужны только на уровне типов.

### Как называть экспорты

- **Setup-функции:** `create<ManagerName>Setup` или `create<ManagerName>TestSetup`. Возвращают готовый к использованию объект с менеджером и моками.
- **Фабрики объектов:** `createMock<ObjectType>`. Например, `createMockShapeGroup`, `createMockFabricObject`.
- **Хелперы действий:** глагол + объект. Например, `applyShapeTextLayoutToMockGroup`, `emitCanvasEvent`.
- **Типы:** `<Context>TestSetup`, `<Context>TestSetupOptions`. Например, `ShapeScalingTestSetup`.

### Обратная совместимость

- Не создавай re-export фасады для обратной совместимости. Если код перемещён — обнови все импорты.
- Один файл не должен реэкспортить другой только ради удобства импорта. Импорты должны идти напрямую из целевого файла.
