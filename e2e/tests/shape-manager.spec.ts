import { test, expect } from '../fixtures/editor.fixture'
import type {
  ShapePresetKey,
  ShapeHorizontalAlign,
  ShapeVerticalAlign,
  ShapeScaleSnapshot
} from '../types'
import {
  SHAPE_SCALING_LIVE_REVERSE_STEPS,
  SHAPE_SCALING_STROKE_WIDTH,
  SHAPE_SCALING_TOLERANCE
} from '../fixtures/data/shape-scaling.data'

test.describe('Добавление фигур', () => {
  test('добавляет круг с дефолтными параметрами', async({ editorModel, shapes }) => {
    await test.step('Добавить круг', async() => {
      const shape = await shapes.add({ presetKey: 'circle' })
      shapes.checkCreation({ shape, presetKey: 'circle' })
    })

    await test.step('Проверить что объект появился на canvas', () => editorModel.checkObjectCount({ count: 1 }))
  })

  test('добавляет прямоугольник с кастомными размерами', async({ shapes }) => {
    const shape = await test.step('Добавить прямоугольник 200×100', async() => {
      const result = await shapes.add({ presetKey: 'square', options: { width: 200, height: 100 } })
      return shapes.checkCreation({ shape: result, presetKey: 'square' })
    })

    await test.step('Проверить размеры', () => {
      expect(shape.width).toBeGreaterThan(0)
      expect(shape.height).toBeGreaterThan(0)
    })
  })

  test('добавляет фигуру с заливкой и прозрачностью', async({ shapes }) => {
    const shape = await test.step('Добавить треугольник с fill и opacity', async() => {
      const result = await shapes.add({ presetKey: 'triangle', options: { fill: '#ff0000', opacity: 0.5 } })
      return shapes.checkCreation({ shape: result, presetKey: 'triangle' })
    })

    await test.step('Проверить fill и opacity', () => {
      expect(shape.shapeFill).toBe('#ff0000')
      expect(shape.shapeOpacity).toBe(0.5)
    })
  })

  test('добавляет фигуру с текстом', async({ shapes }) => {
    await test.step('Добавить прямоугольник с текстом', async() => {
      const shape = await shapes.add({ presetKey: 'square', options: { text: 'Тестовый текст' } })
      shapes.checkCreation({ shape, presetKey: 'square' })
    })
  })

  test('добавляет несколько фигур подряд', async({ editorModel, shapes }) => {
    await test.step('Добавить 3 фигуры', () => shapes.addMultiple({ presets: ['circle', 'square', 'triangle'] }))

    await test.step('Проверить количество объектов на canvas', () => editorModel.checkObjectCount({ count: 3 }))
  })

  const presets: ShapePresetKey[] = [
    'circle', 'triangle', 'square', 'diamond', 'pentagon',
    'hexagon', 'star', 'sparkle', 'heart', 'arrow-right-fat',
    'arrow-up-fat', 'arrow-right', 'arrow-down-fat', 'arrow-up-down',
    'arrow-left-right', 'drop', 'cross', 'gear', 'badge',
    'bookmark', 'tag', 'moon'
  ]

  for (const preset of presets) {
    test(`добавляет фигуру пресета "${preset}"`, async({ shapes }) => {
      const shape = await shapes.add({ presetKey: preset })
      shapes.checkCreation({ shape, presetKey: preset })
    })
  }
})

test.describe('Удаление фигур', () => {
  test('удаляет единственную фигуру — canvas пуст', async({ editorModel, shapes }) => {
    await test.step('Добавить круг', async() => {
      const shape = await shapes.add({ presetKey: 'circle' })
      shapes.checkCreation({ shape, presetKey: 'circle' })
      await editorModel.checkObjectCount({ count: 1 })
    })

    await test.step('Удалить фигуру', () => shapes.checkRemoval({ objectIndex: 0 }))

    await test.step('Canvas пуст', () => editorModel.checkObjectCount({ count: 0 }))
  })

  test('удаляет одну фигуру из нескольких', async({ editorModel, shapes }) => {
    await test.step('Добавить 3 фигуры', () => shapes.addMultiple({ presets: ['circle', 'square', 'triangle'] }))

    await test.step('Удалить вторую фигуру', () => shapes.checkRemoval({ objectIndex: 1 }))

    await test.step('Осталось 2 фигуры', () => editorModel.checkObjectCount({ count: 2 }))
  })
})

test.describe('Свойства фигур', () => {
  test('setFill меняет заливку фигуры', async({ shapes }) => {
    await test.step('Добавить круг', () => shapes.add({ presetKey: 'circle' }))

    await test.step('Установить зелёную заливку', () => shapes.setFill({ fill: '#00ff00', objectIndex: 0 }))

    await test.step('Проверить значение fill', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeFill).toBe('#00ff00')
    })
  })

  test('setStroke устанавливает обводку фигуры', async({ shapes }) => {
    await test.step('Добавить прямоугольник', () => shapes.add({ presetKey: 'square' }))

    await test.step('Установить синюю обводку шириной 3', () => shapes.setStroke({ stroke: '#0000ff', strokeWidth: 3, objectIndex: 0 }))

    await test.step('Проверить значения stroke', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeStroke).toBe('#0000ff')
      expect(shape.shapeStrokeWidth).toBe(3)
    })
  })

  test('setOpacity меняет прозрачность фигуры', async({ shapes }) => {
    await test.step('Добавить треугольник', () => shapes.add({ presetKey: 'triangle' }))

    await test.step('Установить прозрачность 0.3', () => shapes.setOpacity({ opacity: 0.3, objectIndex: 0 }))

    await test.step('Проверить значение opacity', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeOpacity).toBe(0.3)
    })
  })

  test('setRounding устанавливает скругление фигуры', async({ shapes }) => {
    await test.step('Добавить прямоугольник', () => shapes.add({ presetKey: 'square' }))

    await test.step('Установить скругление 20', () => shapes.setRounding({ rounding: 20, objectIndex: 0 }))

    await test.step('Проверить значение rounding', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(20)
    })
  })
})

test.describe('Обновление фигур (update)', () => {
  test('update меняет пресет фигуры', async({ shapes }) => {
    await test.step('Добавить круг', () => shapes.add({ presetKey: 'circle' }))

    const updated = await test.step('Сменить пресет на star', () => shapes.update({ presetKey: 'star', objectIndex: 0 }))

    await test.step('Проверить новый пресет', () => shapes.checkUpdate({ shape: updated, presetKey: 'star' }))
  })

  test('update сохраняет позицию фигуры', async({ shapes }) => {
    const original = await test.step('Добавить круг с позицией', async() => {
      const result = await shapes.add({ presetKey: 'circle', options: { left: 100, top: 150 } })
      return shapes.checkCreation({ shape: result, presetKey: 'circle' })
    })

    const updatedRaw = await test.step('Сменить пресет на square', () => shapes.update({ presetKey: 'square', objectIndex: 0 }))

    await test.step('Проверить что позиция сохранена', () => {
      const updated = shapes.checkUpdate({ shape: updatedRaw, presetKey: 'square' })
      expect(updated.left).toBeCloseTo(original.left, 0)
      expect(updated.top).toBeCloseTo(original.top, 0)
    })
  })

  test('update с невалидным пресетом возвращает null', async({ shapes }) => {
    await test.step('Добавить круг', () => shapes.add({ presetKey: 'circle' }))

    const updated = await test.step('Попытаться сменить на несуществующий пресет', () => {
      return shapes.update({ presetKey: 'nonexistent-preset' as any, objectIndex: 0 })
    })

    await test.step('Проверить что вернулся null', () => {
      expect(updated).toBeNull()
    })
  })
})

test.describe('Выравнивание текста (setTextAlign)', () => {
  const horizontalAligns: ShapeHorizontalAlign[] = ['left', 'center', 'right']
  const verticalAligns: ShapeVerticalAlign[] = ['top', 'middle', 'bottom']

  test('setTextAlign меняет горизонтальное выравнивание', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

    const result = await test.step('Установить left', () => shapes.setTextAlign({ horizontal: 'left', objectIndex: 0 }))

    await test.step('Проверить выравнивание', () => shapes.checkTextAlign({ shape: result, horizontal: 'left' }))
  })

  test('setTextAlign меняет вертикальное выравнивание', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

    const result = await test.step('Установить bottom', () => shapes.setTextAlign({ vertical: 'bottom', objectIndex: 0 }))

    await test.step('Проверить выравнивание', () => shapes.checkTextAlign({ shape: result, vertical: 'bottom' }))
  })

  for (const h of horizontalAligns) {
    for (const v of verticalAligns) {
      test(`setTextAlign применяет комбинацию ${h}/${v}`, async({ shapes }) => {
        await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

        const result = await test.step(`Установить ${h}/${v}`, () => shapes.setTextAlign({ horizontal: h, vertical: v, objectIndex: 0 }))

        shapes.checkTextAlign({ shape: result, horizontal: h, vertical: v })
      })
    }
  }
})

test.describe('Масштабирование скругления', () => {
  test('скругление масштабируется пропорционально при равномерном увеличении', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 50', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 50, objectIndex: 0 })
    })

    await test.step('Увеличить фигуру в 2 раза', () => shapes.simulateScale({ scaleX: 2, scaleY: 2, objectIndex: 0 }))

    await test.step('Проверить что скругление удвоилось', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(100)
    })
  })

  test('скругление масштабируется пропорционально при уменьшении', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 80', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 80, objectIndex: 0 })
    })

    await test.step('Уменьшить фигуру в 2 раза', () => shapes.simulateScale({ scaleX: 0.5, scaleY: 0.5, objectIndex: 0 }))

    await test.step('Проверить что скругление уменьшилось вдвое', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(40)
    })
  })

  test('скругление масштабируется по минимальному scale при непропорциональном масштабировании', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 50', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 50, objectIndex: 0 })
    })

    await test.step('Масштабировать непропорционально (3x ширина, 2x высота)', () => {
      return shapes.simulateScale({ scaleX: 3, scaleY: 2, objectIndex: 0 })
    })

    await test.step('Проверить что скругление масштабировалось по min(3, 2) = 2', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(100)
    })
  })
})

test.describe('Интерактивное масштабирование shape с обводкой', () => {
  test('стабильно масштабируется при быстрых реверсах без дрейфа и прыжка', async({ shapes }) => {
    const liveSnapshots: ShapeScaleSnapshot[] = []

    await test.step('Добавить квадрат и включить обводку', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setStroke({
        stroke: '#0a84ff',
        strokeWidth: SHAPE_SCALING_STROKE_WIDTH,
        objectIndex: 0
      })
    })

    await test.step('Выполнить live-scale с быстрыми реверсами', async() => {
      for (let index = 0; index < SHAPE_SCALING_LIVE_REVERSE_STEPS.length; index += 1) {
        const {
          scaleX,
          scaleY
        } = SHAPE_SCALING_LIVE_REVERSE_STEPS[index]
        const snapshot = await shapes.simulateScaleStep({
          scaleX,
          scaleY,
          corner: 'br',
          originX: 'left',
          originY: 'top',
          objectIndex: 0
        })

        liveSnapshots.push(shapes.checkScaleSnapshot({
          snapshot,
          message: `должен существовать live snapshot для шага #${index + 1}`
        }))
      }
    })

    await test.step('Проверить что anchor стабилен во время drag', () => {
      const firstLiveSnapshot = shapes.checkScaleSnapshot({
        snapshot: liveSnapshots[0] ?? null,
        message: 'должен существовать первый live snapshot для проверки anchor'
      })

      for (let index = 0; index < liveSnapshots.length; index += 1) {
        const snapshot = liveSnapshots[index]
        const leftDiff = Math.abs(snapshot.groupBoundsLeft - firstLiveSnapshot.groupBoundsLeft)
        const topDiff = Math.abs(snapshot.groupBoundsTop - firstLiveSnapshot.groupBoundsTop)

        expect(leftDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
        expect(topDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
      }

      for (let index = 1; index < liveSnapshots.length; index += 1) {
        const previous = liveSnapshots[index - 1]
        const current = liveSnapshots[index]
        const leftStepDiff = Math.abs(current.groupBoundsLeft - previous.groupBoundsLeft)
        const topStepDiff = Math.abs(current.groupBoundsTop - previous.groupBoundsTop)

        expect(leftStepDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
        expect(topStepDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
      }
    })

    await test.step('Проверить что масштаб идёт в сторону активного угла', () => {
      for (let index = 1; index < liveSnapshots.length; index += 1) {
        const previousSnapshot = liveSnapshots[index - 1]
        const currentSnapshot = liveSnapshots[index]
        const previousStep = SHAPE_SCALING_LIVE_REVERSE_STEPS[index - 1]
        const currentStep = SHAPE_SCALING_LIVE_REVERSE_STEPS[index]
        const deltaScaleX = currentStep.scaleX - previousStep.scaleX
        const deltaScaleY = currentStep.scaleY - previousStep.scaleY

        if (deltaScaleX > 0) {
          expect(currentSnapshot.groupBoundsRight)
            .toBeGreaterThan(previousSnapshot.groupBoundsRight - SHAPE_SCALING_TOLERANCE.direction)
        }

        if (deltaScaleX < 0) {
          expect(currentSnapshot.groupBoundsRight)
            .toBeLessThan(previousSnapshot.groupBoundsRight + SHAPE_SCALING_TOLERANCE.direction)
        }

        if (deltaScaleY > 0) {
          expect(currentSnapshot.groupBoundsBottom)
            .toBeGreaterThan(previousSnapshot.groupBoundsBottom - SHAPE_SCALING_TOLERANCE.direction)
        }

        if (deltaScaleY < 0) {
          expect(currentSnapshot.groupBoundsBottom)
            .toBeLessThan(previousSnapshot.groupBoundsBottom + SHAPE_SCALING_TOLERANCE.direction)
        }
      }
    })

    await test.step('Проверить постоянство обводки и совпадение shape с bbox в live-режиме', () => {
      for (let index = 0; index < liveSnapshots.length; index += 1) {
        const snapshot = liveSnapshots[index]
        expect(snapshot.shapeStrokeWidth).toBe(SHAPE_SCALING_STROKE_WIDTH)
        expect(snapshot.shapeStrokeUniform).toBe(true)

        expect(snapshot.shapeBoundsWidth).not.toBeNull()
        expect(snapshot.shapeBoundsHeight).not.toBeNull()

        if (snapshot.shapeBoundsWidth !== null) {
          const widthDiff = Math.abs(snapshot.groupBoundsWidth - snapshot.shapeBoundsWidth)
          expect(widthDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.bbox)
        }

        if (snapshot.shapeBoundsHeight !== null) {
          const heightDiff = Math.abs(snapshot.groupBoundsHeight - snapshot.shapeBoundsHeight)
          expect(heightDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.bbox)
        }
      }
    })

    const snapshotBeforeMouseUp = shapes.checkScaleSnapshot({
      snapshot: liveSnapshots[liveSnapshots.length - 1] ?? null,
      message: 'должен существовать последний live snapshot перед mouseup'
    })

    const finalSnapshot = await test.step('Завершить drag и получить финальный snapshot', async() => {
      const snapshot = await shapes.finishScale({
        objectIndex: 0
      })

      return shapes.checkScaleSnapshot({
        snapshot,
        message: 'должен существовать финальный snapshot после object:modified'
      })
    })

    await test.step('Проверить отсутствие прыжка на mouseup', () => {
      const leftJump = Math.abs(finalSnapshot.groupBoundsLeft - snapshotBeforeMouseUp.groupBoundsLeft)
      const topJump = Math.abs(finalSnapshot.groupBoundsTop - snapshotBeforeMouseUp.groupBoundsTop)
      const rightJump = Math.abs(finalSnapshot.groupBoundsRight - snapshotBeforeMouseUp.groupBoundsRight)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - snapshotBeforeMouseUp.groupBoundsBottom)

      expect(leftJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(rightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })

    await test.step('Проверить что после bake масштаб сброшен и обводка сохранена', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.scaleX).toBe(1)
      expect(shape.scaleY).toBe(1)
      expect(finalSnapshot.shapeStrokeWidth).toBe(SHAPE_SCALING_STROKE_WIDTH)
      expect(finalSnapshot.shapeStrokeUniform).toBe(true)
    })
  })
})

test.describe('Граничные случаи', () => {
  test('add с неизвестным presetKey возвращает null', async({ editorModel, shapes }) => {
    const shape = await test.step('Добавить с невалидным пресетом', () => shapes.add({ presetKey: 'nonexistent-preset' as any }))

    await test.step('Проверить что shape не создан', () => {
      expect(shape).toBeNull()
    })

    await test.step('Canvas остался пустым', () => editorModel.checkObjectCount({ count: 0 }))
  })

  test('setRounding не влияет на non-roundable пресет (circle)', async({ shapes }) => {
    await test.step('Добавить круг', () => shapes.add({ presetKey: 'circle' }))

    const before = await test.step('Запомнить rounding до операции', async() => {
      const shape = await shapes.getFirstShape()
      return shape.shapeRounding
    })

    await test.step('Попытаться установить скругление', () => shapes.setRounding({ rounding: 50, objectIndex: 0 }))

    await test.step('Проверить что rounding не изменился', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(before)
    })
  })

  test('setRounding не влияет на non-roundable пресет (heart)', async({ shapes }) => {
    await test.step('Добавить сердце', () => shapes.add({ presetKey: 'heart' }))

    const before = await test.step('Запомнить rounding до операции', async() => {
      const shape = await shapes.getFirstShape()
      return shape.shapeRounding
    })

    await test.step('Попытаться установить скругление', () => shapes.setRounding({ rounding: 30, objectIndex: 0 }))

    await test.step('Проверить что rounding не изменился', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(before)
    })
  })

  test('setStroke с dash устанавливает пунктирную обводку', async({ shapes }) => {
    await test.step('Добавить прямоугольник', () => shapes.add({ presetKey: 'square' }))

    await test.step('Установить обводку с dash', () => {
      return shapes.setStroke({ stroke: '#ff0000', strokeWidth: 2, dash: [5, 3], objectIndex: 0 })
    })

    await test.step('Проверить обводку', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeStroke).toBe('#ff0000')
      expect(shape.shapeStrokeWidth).toBe(2)
    })
  })

  test('операции работают через active object без указания objectIndex', async({ editorModel, shapes }) => {
    await test.step('Добавить круг (он станет активным)', () => shapes.add({ presetKey: 'circle' }))

    await test.step('Проверить что есть активный объект', async() => {
      const active = await editorModel.getActiveObject()
      expect(active).not.toBeNull()
    })

    await test.step('Установить заливку без objectIndex', () => shapes.setFill({ fill: '#123456' }))

    await test.step('Проверить что заливка применена', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeFill).toBe('#123456')
    })
  })
})
