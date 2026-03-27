import { test, expect } from '../../fixtures/editor.fixture'
import {
  BLOCKER_SHAPE_OPTIONS,
  BLOCKER_UPDATED_FILL,
  BLOCKER_UPDATED_RESOLUTION
} from '../../fixtures/data/interaction-blocker.data'

test.describe('Блокировка редактора', () => {
  test.beforeEach(async({ shapes }) => {
    const shape = await shapes.add({
      presetKey: 'square',
      options: BLOCKER_SHAPE_OPTIONS
    })

    shapes.checkCreation({
      shape,
      presetKey: 'square'
    })
  })

  test('после блокировки редактора фигуру внутри монтажной области нельзя выделить', async({
    editorModel,
    interactionBlocker,
    shapes
  }) => {
    await test.step('Заблокировать редактор', async() => {
      await interactionBlocker.block()
    })

    await test.step('Кликнуть по фигуре на canvas', async() => {
      await shapes.clickOnCanvas({ id: BLOCKER_SHAPE_OPTIONS.id })
    })

    await test.step('Проверить что выделение не появилось, а маска блокировки осталась активной', async() => {
      const activeObject = await editorModel.getActiveObject()
      const blockerState = await interactionBlocker.getState()

      expect(activeObject).toBeNull()
      expect(blockerState.isBlocked).toBe(true)
      expect(blockerState.overlayExists).toBe(true)
      expect(blockerState.overlayVisible).toBe(true)
      expect(blockerState.upperCanvasPointerEvents).toBe('none')
      expect(blockerState.lowerCanvasPointerEvents).toBe('none')
    })
  })

  test('после разблокировки редактора фигуру снова можно выделить и изменить', async({
    editorModel,
    interactionBlocker,
    shapes
  }) => {
    await test.step('Заблокировать и сразу разблокировать редактор', async() => {
      await interactionBlocker.block()
      await interactionBlocker.unblock()
    })

    await test.step('Снова кликнуть по фигуре на canvas', async() => {
      await shapes.clickOnCanvas({ id: BLOCKER_SHAPE_OPTIONS.id })
    })

    await test.step('Проверить что фигура снова выделяется', async() => {
      const activeObject = await editorModel.getActiveObject()
      const blockerState = await interactionBlocker.getState()

      expect(activeObject?.type).toBe('shape-group')
      expect(activeObject?.id).toBe(BLOCKER_SHAPE_OPTIONS.id)
      expect(blockerState.isBlocked).toBe(false)
      expect(blockerState.overlayVisible).toBe(false)
      expect(blockerState.upperCanvasPointerEvents).toBe('')
      expect(blockerState.lowerCanvasPointerEvents).toBe('')
    })

    await test.step('Изменить цвет фигуры после разблокировки', async() => {
      await shapes.setFill({
        id: BLOCKER_SHAPE_OPTIONS.id,
        fill: BLOCKER_UPDATED_FILL
      })
    })

    await test.step('Проверить что изменение применилось', async() => {
      const updatedShape = await shapes.getObject({ id: BLOCKER_SHAPE_OPTIONS.id })

      expect(updatedShape?.shapeFill).toBe(BLOCKER_UPDATED_FILL)
    })
  })

  test('после изменения resolution маска блокировки остаётся ровно на монтажной области', async({
    canvas,
    editorModel,
    interactionBlocker
  }) => {
    await test.step('Заблокировать редактор', async() => {
      await interactionBlocker.block()
    })

    await test.step('Изменить размер монтажной области', async() => {
      await canvas.setMontageResolution(BLOCKER_UPDATED_RESOLUTION)
    })

    await test.step('Проверить что маска блокировки совпала с новой монтажной областью', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const blockerState = await interactionBlocker.getState()

      expect(blockerState.overlayVisible).toBe(true)
      expect(Math.abs(blockerState.boundsLeft - montageBounds.left)).toBeLessThanOrEqual(1)
      expect(Math.abs(blockerState.boundsTop - montageBounds.top)).toBeLessThanOrEqual(1)
      expect(Math.abs(blockerState.boundsWidth - montageBounds.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(blockerState.boundsHeight - montageBounds.height)).toBeLessThanOrEqual(1)
    })
  })
})
