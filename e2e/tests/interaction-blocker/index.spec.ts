import { test, expect } from '../../fixtures/editor.fixture'
import {
  BROWSER_RESIZE_NARROW_VIEWPORT,
  BROWSER_RESIZE_TOLERANCE,
  BROWSER_RESIZE_WIDE_VIEWPORT
} from '../../fixtures/data/browser-resize.data'
import {
  AI_BLOCKER_EXTREME_RESOLUTION_CASES,
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

  test('AI-блокировка не даёт выделять фигуру и показывает AI overlay', async({
    editorModel,
    interactionBlocker,
    shapes
  }) => {
    await test.step('Заблокировать редактор с AI overlay', async() => {
      await interactionBlocker.blockWithAiOverlay()
    })

    await test.step('Кликнуть по фигуре на canvas', async() => {
      await shapes.clickOnCanvas({ id: BLOCKER_SHAPE_OPTIONS.id })
    })

    await test.step('Проверить что выделение не появилось, а активен AI overlay', async() => {
      const activeObject = await editorModel.getActiveObject()
      const blockerState = await interactionBlocker.getState()

      expect(activeObject).toBeNull()
      expect(blockerState.isBlocked).toBe(true)
      expect(blockerState.overlayExists).toBe(true)
      expect(blockerState.overlayVisible).toBe(true)
      expect(blockerState.overlayType).toBe('ai-generation-overlay')
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

  test('после AI-блокировки редактор снова можно разблокировать и заблокировать обычной маской', async({
    editorModel,
    interactionBlocker,
    shapes
  }) => {
    await test.step('Заблокировать редактор с AI overlay и разблокировать', async() => {
      await interactionBlocker.blockWithAiOverlay()
      await interactionBlocker.unblock()
    })

    await test.step('Проверить что фигуру снова можно выделить', async() => {
      await shapes.clickOnCanvas({ id: BLOCKER_SHAPE_OPTIONS.id })

      const activeObject = await editorModel.getActiveObject()

      expect(activeObject?.type).toBe('shape-group')
      expect(activeObject?.id).toBe(BLOCKER_SHAPE_OPTIONS.id)
    })

    await test.step('Заблокировать редактор обычной маской', async() => {
      await interactionBlocker.block()
    })

    await test.step('Проверить что обычная блокировка не оставила AI overlay', async() => {
      const blockerState = await interactionBlocker.getState()

      expect(blockerState.isBlocked).toBe(true)
      expect(blockerState.overlayVisible).toBe(true)
      expect(blockerState.overlayType).not.toBe('ai-generation-overlay')
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

  test('после изменения resolution AI overlay остаётся ровно на монтажной области', async({
    canvas,
    editorModel,
    interactionBlocker
  }) => {
    await test.step('Заблокировать редактор с AI overlay', async() => {
      await interactionBlocker.blockWithAiOverlay()
    })

    await test.step('Изменить размер монтажной области', async() => {
      await canvas.setMontageResolution(BLOCKER_UPDATED_RESOLUTION)
    })

    await test.step('Проверить что AI overlay совпал с новой монтажной областью', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const blockerState = await interactionBlocker.getState()

      expect(blockerState.overlayType).toBe('ai-generation-overlay')
      expect(blockerState.overlayVisible).toBe(true)
      expect(Math.abs(blockerState.boundsLeft - montageBounds.left)).toBeLessThanOrEqual(1)
      expect(Math.abs(blockerState.boundsTop - montageBounds.top)).toBeLessThanOrEqual(1)
      expect(Math.abs(blockerState.boundsWidth - montageBounds.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(blockerState.boundsHeight - montageBounds.height)).toBeLessThanOrEqual(1)
    })
  })

  for (const resolutionCase of AI_BLOCKER_EXTREME_RESOLUTION_CASES) {
    test(`AI overlay остаётся на монтажной области при ${resolutionCase.title}`, async({
      canvas,
      editorModel,
      interactionBlocker
    }) => {
      await test.step('Изменить размер монтажной области', async() => {
        await canvas.setMontageResolution(resolutionCase.resolution)
      })

      await test.step('Заблокировать редактор с AI overlay', async() => {
        await interactionBlocker.blockWithAiOverlay()
      })

      await test.step('Проверить что AI overlay совпал с монтажной областью', async() => {
        const montageBounds = await editorModel.getMontageAreaBounds()
        const blockerState = await interactionBlocker.getState()

        expect(blockerState.overlayType).toBe('ai-generation-overlay')
        expect(blockerState.overlayVisible).toBe(true)
        expect(blockerState.upperCanvasPointerEvents).toBe('none')
        expect(blockerState.lowerCanvasPointerEvents).toBe('none')
        expect(Math.abs(blockerState.boundsLeft - montageBounds.left)).toBeLessThanOrEqual(1)
        expect(Math.abs(blockerState.boundsTop - montageBounds.top)).toBeLessThanOrEqual(1)
        expect(Math.abs(blockerState.boundsWidth - montageBounds.width)).toBeLessThanOrEqual(1)
        expect(Math.abs(blockerState.boundsHeight - montageBounds.height)).toBeLessThanOrEqual(1)
      })
    })
  }

  test('после сужения окна браузера маска блокировки остаётся ровно на монтажной области', async({
    editorModel,
    interactionBlocker
  }) => {
    await test.step('Заблокировать редактор', async() => {
      await interactionBlocker.block()
    })

    await test.step('Сузить окно браузера', async() => {
      await editorModel.resizeViewport(BROWSER_RESIZE_NARROW_VIEWPORT)
    })

    await test.step('Проверить что маска блокировки осталась на монтажной области', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const blockerState = await interactionBlocker.getState()

      expect(blockerState.overlayVisible).toBe(true)
      expect(Math.abs(blockerState.boundsLeft - montageBounds.left)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs(blockerState.boundsTop - montageBounds.top)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs(blockerState.boundsWidth - montageBounds.width)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs(blockerState.boundsHeight - montageBounds.height)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
    })
  })

  test('после расширения окна браузера маска блокировки не смещается относительно монтажной области', async({
    editorModel,
    interactionBlocker
  }) => {
    await test.step('Заблокировать редактор', async() => {
      await interactionBlocker.block()
    })

    await test.step('Расширить окно браузера', async() => {
      await editorModel.resizeViewport(BROWSER_RESIZE_WIDE_VIEWPORT)
    })

    await test.step('Проверить что блокирующий слой остался на монтажной области', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const blockerState = await interactionBlocker.getState()

      expect(blockerState.overlayVisible).toBe(true)
      expect(Math.abs(blockerState.boundsLeft - montageBounds.left)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs(blockerState.boundsTop - montageBounds.top)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs(blockerState.boundsWidth - montageBounds.width)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs(blockerState.boundsHeight - montageBounds.height)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
    })
  })

  test('после сужения и повторного расширения окна заблокированная монтажная область всё ещё не даёт выделять объекты внутри неё', async({
    editorModel,
    interactionBlocker,
    shapes
  }) => {
    await test.step('Заблокировать редактор', async() => {
      await interactionBlocker.block()
    })

    await test.step('Сузить и снова расширить окно браузера', async() => {
      await editorModel.resizeViewport(BROWSER_RESIZE_NARROW_VIEWPORT)
      await editorModel.resizeViewport(BROWSER_RESIZE_WIDE_VIEWPORT)
    })

    await test.step('Кликнуть по фигуре внутри монтажной области', async() => {
      await shapes.clickOnCanvas({ id: BLOCKER_SHAPE_OPTIONS.id })
    })

    await test.step('Проверить что выделение не появилось и маска осталась на монтажной области', async() => {
      const activeObject = await editorModel.getActiveObject()
      const montageBounds = await editorModel.getMontageAreaBounds()
      const blockerState = await interactionBlocker.getState()

      expect(activeObject).toBeNull()
      expect(blockerState.overlayVisible).toBe(true)
      expect(Math.abs(blockerState.boundsLeft - montageBounds.left)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs(blockerState.boundsTop - montageBounds.top)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs(blockerState.boundsWidth - montageBounds.width)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs(blockerState.boundsHeight - montageBounds.height)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
    })
  })
})
