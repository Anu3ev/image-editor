import { test, expect } from '../fixtures/editor.fixture'
import {
  BLOCKER_SHAPE_OPTIONS,
  BLOCKER_UPDATED_FILL
} from '../fixtures/data/interaction-blocker.data'
import {
  LISTENERS_CLIPBOARD_OFFSET,
  LISTENERS_CUT_HOTKEY_SHAPE_ID,
  LISTENERS_CUT_HOTKEY_SHAPE_OFFSET,
  LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID,
  LISTENERS_DUPLICATE_HOTKEY_SHAPE_OFFSET,
  LISTENERS_EDGE_ZOOM_DELTA_Y,
  LISTENERS_EDGE_ZOOM_MONTAGE_RESOLUTION,
  LISTENERS_EDGE_ZOOM_SCROLL_DELTA_Y,
  LISTENERS_EDGE_ZOOM_SHAPE_ID,
  LISTENERS_EDGE_ZOOM_SHAPE_SIZE,
  LISTENERS_EDGE_ZOOM_TEXT,
  LISTENERS_EDGE_ZOOM_TEXT_FONT_SIZE,
  LISTENERS_EDGE_ZOOM_VIEWPORT_RIGHT_INSET,
  LISTENERS_EDGE_ZOOM_WHEEL_STEPS,
  LISTENERS_HOTKEY_SHAPE_SIZE
} from '../fixtures/data/listeners.data'

test.describe('Горячие клавиши и zoom', () => {
  test('пока редактор заблокирован undo и redo по hotkeys не меняют состояние', async({
    editorModel,
    interactionBlocker,
    shapes
  }) => {
    await test.step('Добавить фигуру и изменить её цвет', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: BLOCKER_SHAPE_OPTIONS
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })

      await shapes.setFill({
        id: BLOCKER_SHAPE_OPTIONS.id,
        fill: BLOCKER_UPDATED_FILL
      })
    })

    await test.step('Заблокировать редактор', async() => {
      await interactionBlocker.block()
    })

    await test.step('Отправить hotkeys undo и redo', async() => {
      await editorModel.pressUndoHotkey()
      await editorModel.pressRedoHotkey()
    })

    await test.step('Проверить что состояние фигуры не изменилось', async() => {
      const currentShape = await shapes.getObject({ id: BLOCKER_SHAPE_OPTIONS.id })
      const blockerState = await interactionBlocker.getState()

      expect(currentShape?.shapeFill).toBe(BLOCKER_UPDATED_FILL)
      expect(blockerState.isBlocked).toBe(true)
    })
  })

  test('ctrl + wheel меняет zoom редактора', async({ editorModel }) => {
    const initialCanvasState = await test.step('Получить исходный zoom', () => {
      return editorModel.getCanvasState()
    })

    await test.step('Отправить ctrl + wheel на canvas', async() => {
      const dispatchState = await editorModel.zoomByCtrlWheel({ deltaY: -120 })

      expect(dispatchState.dispatchedEvents).toBe(1)
      expect(dispatchState.canceledEvents).toBe(dispatchState.dispatchedEvents)
    })

    await test.step('Проверить что zoom изменился', async() => {
      const currentCanvasState = await editorModel.getCanvasState()

      expect(currentCanvasState.zoom).toBeGreaterThan(initialCanvasState.zoom)
      expect(currentCanvasState.objectCount).toBe(initialCanvasState.objectCount)
    })
  })

  test('pinch на тачпаде меняет zoom редактора', async({ editorModel }) => {
    const initialCanvasState = await test.step('Получить исходный zoom', () => {
      return editorModel.getCanvasState()
    })

    await test.step('Сделать полный pinch-жест на тачпаде', async() => {
      const dispatchState = await editorModel.zoomInByTrackpadPinch()

      expect(dispatchState.dispatchedEvents).toBeGreaterThan(0)
      expect(dispatchState.canceledEvents).toBe(dispatchState.dispatchedEvents)
    })

    await test.step('Проверить что один pinch-жест даёт заметное приближение', async() => {
      const currentCanvasState = await editorModel.getCanvasState()
      const zoomIncrease = currentCanvasState.zoom - initialCanvasState.zoom

      expect(zoomIncrease).toBeGreaterThanOrEqual(0.25)
      expect(zoomIncrease).toBeLessThanOrEqual(0.35)
      expect(currentCanvasState.objectCount).toBe(initialCanvasState.objectCount)
    })
  })

  test('pinch-out на тачпаде уменьшает zoom после приближения', async({ editorModel }) => {
    const initialCanvasState = await test.step('Получить исходный zoom', () => {
      return editorModel.getCanvasState()
    })

    const zoomedInCanvasState = await test.step('Сначала приблизить canvas pinch-жестом', async() => {
      await editorModel.zoomInByTrackpadPinch()

      return editorModel.getCanvasState()
    })

    await test.step('Сделать обратный pinch-жест на тачпаде', async() => {
      const dispatchState = await editorModel.zoomOutByTrackpadPinch()

      expect(dispatchState.dispatchedEvents).toBeGreaterThan(0)
      expect(dispatchState.canceledEvents).toBe(dispatchState.dispatchedEvents)
    })

    await test.step('Проверить что zoom уменьшился', async() => {
      const currentCanvasState = await editorModel.getCanvasState()

      expect(zoomedInCanvasState.zoom).toBeGreaterThan(initialCanvasState.zoom)
      expect(currentCanvasState.zoom).toBeLessThan(zoomedInCanvasState.zoom)
      expect(currentCanvasState.objectCount).toBe(initialCanvasState.objectCount)
    })
  })

  test('двухпальцевый scroll на тачпаде двигает вьюпорт после приближения', async({ editorModel }) => {
    const panState = await test.step('Приблизить canvas до доступного pan-диапазона', () => {
      return editorModel.zoomInUntilViewportCanMove()
    })

    await test.step('Проверить что pan доступен по обеим осям', async() => {
      expect(panState.canPan).toBe(true)
      expect(panState.horizontal.canPan).toBe(true)
      expect(panState.vertical.canPan).toBe(true)
    })

    const beforePan = await test.step('Получить viewport перед scroll на тачпаде', () => {
      return editorModel.getCanvasViewportTransform()
    })

    await test.step('Сделать двухпальцевый scroll на тачпаде без Ctrl', async() => {
      const dispatchState = await editorModel.panByTrackpadScroll({
        deltaX: 72,
        deltaY: 48
      })

      expect(dispatchState.dispatchedEvents).toBe(1)
      expect(dispatchState.canceledEvents).toBe(1)
    })

    await test.step('Проверить что viewport сдвинулся без изменения zoom', async() => {
      const afterPan = await editorModel.getCanvasViewportTransform()

      expect(afterPan.zoom).toBeCloseTo(beforePan.zoom, 4)
      expect(afterPan.x).toBeLessThan(beforePan.x)
      expect(afterPan.y).toBeLessThan(beforePan.y)
    })
  })

  test.describe('ctrl + wheel у правого края canvas', () => {
    let zoomPoint = {
      x: 0,
      y: 0
    }

    test.beforeEach(async({
      canvas,
      editorModel,
      shapes
    }) => {
      await canvas.setMontageResolution(LISTENERS_EDGE_ZOOM_MONTAGE_RESOLUTION)

      const shape = await shapes.addWithText({
        presetKey: 'square',
        text: LISTENERS_EDGE_ZOOM_TEXT,
        fontSize: LISTENERS_EDGE_ZOOM_TEXT_FONT_SIZE,
        options: {
          id: LISTENERS_EDGE_ZOOM_SHAPE_ID,
          ...LISTENERS_EDGE_ZOOM_SHAPE_SIZE
        }
      })
      const montageArea = await editorModel.getMontageArea()

      expect(shape?.id).toBe(LISTENERS_EDGE_ZOOM_SHAPE_ID)
      expect(montageArea.width).toBe(LISTENERS_EDGE_ZOOM_MONTAGE_RESOLUTION.width)
      expect(montageArea.height).toBe(LISTENERS_EDGE_ZOOM_MONTAGE_RESOLUTION.height)

      const viewportBounds = await editorModel.getCanvasViewportBounds()

      zoomPoint = {
        x: viewportBounds.width - LISTENERS_EDGE_ZOOM_VIEWPORT_RIGHT_INSET,
        y: viewportBounds.height / 2
      }

      await editorModel.zoomByCtrlWheelRepeatedlyAtViewportPoint({
        deltaY: LISTENERS_EDGE_ZOOM_DELTA_Y,
        steps: LISTENERS_EDGE_ZOOM_WHEEL_STEPS,
        ...zoomPoint
      })

      const panState = await editorModel.getViewportPanState()
      const scrollbarState = await editorModel.getViewportScrollbarState()

      expect(panState.horizontal.canPan).toBe(true)
      expect(panState.vertical.canPan).toBe(true)
      expect(scrollbarState.horizontal.visible).toBe(true)
      expect(scrollbarState.vertical.visible).toBe(true)
    })

    test('не даёт камере прыгнуть при следующем scroll', async({ editorModel }) => {
      const afterZoom = await test.step('Проверить что zoom сразу оставляет viewport в pan-границах', async() => {
        const viewport = await editorModel.getCanvasViewportTransform()
        const panState = await editorModel.getViewportPanState()

        expect(viewport.x).toBeGreaterThanOrEqual(panState.horizontal.min)
        expect(viewport.x).toBeLessThanOrEqual(panState.horizontal.max)
        expect(viewport.y).toBeGreaterThanOrEqual(panState.vertical.min)
        expect(viewport.y).toBeLessThanOrEqual(panState.vertical.max)

        return viewport
      })

      await test.step('Сделать обычный scroll без Ctrl только по вертикали', async() => {
        await editorModel.panByWheelAtViewportPoint({
          deltaY: LISTENERS_EDGE_ZOOM_SCROLL_DELTA_Y,
          ...zoomPoint
        })
      })

      await test.step('Проверить что scroll не вызывает горизонтальный скачок камеры', async() => {
        const afterScroll = await editorModel.getCanvasViewportTransform()

        expect(Math.abs(afterScroll.x - afterZoom.x)).toBeLessThan(1)
        expect(afterScroll.y).toBeLessThan(afterZoom.y)
        expect(afterScroll.zoom).toBeCloseTo(afterZoom.zoom, 4)
      })
    })

    test('не даёт камере прыгнуть при следующем Space + ЛКМ drag', async({ editorModel }) => {
      const afterZoom = await test.step('Проверить что zoom сразу оставляет viewport в pan-границах', async() => {
        const viewport = await editorModel.getCanvasViewportTransform()
        const panState = await editorModel.getViewportPanState()

        expect(viewport.x).toBeGreaterThanOrEqual(panState.horizontal.min)
        expect(viewport.x).toBeLessThanOrEqual(panState.horizontal.max)
        expect(viewport.y).toBeGreaterThanOrEqual(panState.vertical.min)
        expect(viewport.y).toBeLessThanOrEqual(panState.vertical.max)

        return viewport
      })

      await test.step('Сдвинуть viewport через Space + ЛКМ вверх без горизонтального смещения', async() => {
        await editorModel.dragViewportBySpaceMouse({
          deltaX: 0,
          deltaY: -24
        })
      })

      await test.step('Проверить что drag не вызывает горизонтальный скачок камеры', async() => {
        const afterDrag = await editorModel.getCanvasViewportTransform()

        expect(Math.abs(afterDrag.x - afterZoom.x)).toBeLessThan(1)
        expect(afterDrag.y).toBeLessThan(afterZoom.y)
        expect(afterDrag.zoom).toBeCloseTo(afterZoom.zoom, 4)
      })
    })
  })

  test('wheel-scroll не отрывает область выделения от выбранного шейпа', async({
    editorModel,
    selection,
    shapes
  }) => {
    const shape = await test.step('Добавить и выделить квадратный шейп', async() => {
      const createdShape = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'wheel-pan-selected-shape',
          width: 180,
          height: 180
        }
      })

      expect(createdShape?.id).toBe('wheel-pan-selected-shape')

      return shapes.select({ id: 'wheel-pan-selected-shape' })
    })

    await test.step('Приблизить canvas до доступного pan-диапазона', async() => {
      const panState = await editorModel.zoomInUntilViewportCanMove()

      expect(shape?.id).toBe('wheel-pan-selected-shape')
      expect(panState.horizontal.canPan).toBe(true)
      expect(panState.vertical.canPan).toBe(true)
    })

    const beforeAlignment = await test.step('Получить положение области выделения перед scroll', () => {
      return selection.getActiveObjectSelectionFrameAlignment()
    })
    const beforePan = await test.step('Получить viewport перед wheel-scroll', () => {
      return editorModel.getCanvasViewportTransform()
    })

    await test.step('Сделать быстрый wheel-scroll по обеим осям', async() => {
      const dispatchState = await editorModel.panByFastTrackpadScroll({
        deltaXSteps: [120, 120, 120, 120],
        deltaYSteps: [180, 180, 180, 180]
      })

      expect(dispatchState.dispatchedEvents).toBe(4)
      expect(dispatchState.canceledEvents).toBe(4)
    })

    await test.step('Проверить что область выделения осталась на шейпе', async() => {
      const afterPan = await editorModel.getCanvasViewportTransform()
      const afterAlignment = await selection.getActiveObjectSelectionFrameAlignment()

      expect(afterPan.x).toBeLessThan(beforePan.x)
      expect(afterPan.y).toBeLessThan(beforePan.y)
      expect(Math.abs(afterAlignment.topLeftDeltaX - beforeAlignment.topLeftDeltaX)).toBeLessThan(1)
      expect(Math.abs(afterAlignment.topLeftDeltaY - beforeAlignment.topLeftDeltaY)).toBeLessThan(1)
      expect(Math.abs(afterAlignment.bottomRightDeltaX - beforeAlignment.bottomRightDeltaX)).toBeLessThan(1)
      expect(Math.abs(afterAlignment.bottomRightDeltaY - beforeAlignment.bottomRightDeltaY)).toBeLessThan(1)
    })
  })

  test('Space + ЛКМ двигает viewport после приближения к краям viewport', async({ editorModel }) => {
    await test.step('Приблизить canvas, чтобы pan и скроллбары были доступны', async() => {
      const panState = await editorModel.zoomInUntilViewportCanMove()

      expect(panState.canPan).toBe(true)
      expect(panState.horizontal.canPan).toBe(true)
      expect(panState.vertical.canPan).toBe(true)
    })

    const panState = await test.step('Проверить pan-диапазон после приближения', () => {
      return editorModel.getViewportPanState()
    })
    const scrollbarState = await test.step('Проверить что скроллбары видимы', () => {
      return editorModel.getViewportScrollbarState()
    })
    const beforeDrag = await test.step('Получить viewport перед Space + ЛКМ drag', () => {
      return editorModel.getCanvasViewportTransform()
    })

    await test.step('Сдвинуть viewport через Space + ЛКМ', async() => {
      await editorModel.dragViewportBySpaceMouse({
        deltaX: 24,
        deltaY: -16
      })
    })

    await test.step('Проверить что viewport сдвинулся в пределах доступного диапазона', async() => {
      const afterDrag = await editorModel.getCanvasViewportTransform()

      expect(panState.canPan).toBe(true)
      expect(panState.horizontal.scrollDistance).toBeGreaterThan(0)
      expect(panState.vertical.scrollDistance).toBeGreaterThan(0)
      expect(scrollbarState.horizontal.visible).toBe(true)
      expect(scrollbarState.vertical.visible).toBe(true)
      expect(afterDrag.x).toBeGreaterThan(beforeDrag.x)
      expect(afterDrag.y).toBeLessThan(beforeDrag.y)
      expect(afterDrag.x).toBeLessThanOrEqual(panState.horizontal.max)
      expect(afterDrag.y).toBeGreaterThanOrEqual(panState.vertical.min)
    })
  })

  test('drag скроллбаров двигает viewport и не отрывает область выделения от шейпа', async({
    editorModel,
    selection,
    shapes
  }) => {
    const shape = await test.step('Добавить и выделить квадратный шейп', async() => {
      const createdShape = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'scrollbar-pan-selected-shape',
          width: 180,
          height: 180
        }
      })

      expect(createdShape?.id).toBe('scrollbar-pan-selected-shape')

      return shapes.select({ id: 'scrollbar-pan-selected-shape' })
    })

    await test.step('Приблизить canvas до доступных скроллбаров', async() => {
      const panState = await editorModel.zoomInUntilViewportCanMove()
      const scrollbarState = await editorModel.getViewportScrollbarState()

      expect(shape?.id).toBe('scrollbar-pan-selected-shape')
      expect(panState.horizontal.canPan).toBe(true)
      expect(panState.vertical.canPan).toBe(true)
      expect(scrollbarState.horizontal.visible).toBe(true)
      expect(scrollbarState.vertical.visible).toBe(true)
    })

    const beforePan = await test.step('Получить viewport перед drag скроллбаров', () => {
      return editorModel.getCanvasViewportTransform()
    })
    const beforeScrollbars = await test.step('Получить положение скроллбаров перед drag', () => {
      return editorModel.getViewportScrollbarState()
    })
    const beforeAlignment = await test.step('Получить положение области выделения перед drag', () => {
      return selection.getActiveObjectSelectionFrameAlignment()
    })

    await test.step('Сдвинуть viewport горизонтальным и вертикальным скроллбаром', async() => {
      await editorModel.dragViewportScrollbarThumb({
        axis: 'horizontal',
        delta: 96
      })
      await editorModel.dragViewportScrollbarThumb({
        axis: 'vertical',
        delta: 96
      })
    })

    await test.step('Проверить pan, скроллбары и область выделения после drag', async() => {
      const afterPan = await editorModel.getCanvasViewportTransform()
      const afterScrollbars = await editorModel.getViewportScrollbarState()
      const afterAlignment = await selection.getActiveObjectSelectionFrameAlignment()

      expect(afterPan.x).toBeLessThan(beforePan.x)
      expect(afterPan.y).toBeLessThan(beforePan.y)
      expect(afterScrollbars.horizontal.thumb.centerX).toBeGreaterThan(beforeScrollbars.horizontal.thumb.centerX)
      expect(afterScrollbars.vertical.thumb.centerY).toBeGreaterThan(beforeScrollbars.vertical.thumb.centerY)
      expect(Math.abs(afterAlignment.topLeftDeltaX - beforeAlignment.topLeftDeltaX)).toBeLessThan(1)
      expect(Math.abs(afterAlignment.topLeftDeltaY - beforeAlignment.topLeftDeltaY)).toBeLessThan(1)
      expect(Math.abs(afterAlignment.bottomRightDeltaX - beforeAlignment.bottomRightDeltaX)).toBeLessThan(1)
      expect(Math.abs(afterAlignment.bottomRightDeltaY - beforeAlignment.bottomRightDeltaY)).toBeLessThan(1)
    })
  })

  test('gesture-событие Safari меняет zoom редактора', async({ editorModel }) => {
    const initialCanvasState = await test.step('Получить исходный zoom', () => {
      return editorModel.getCanvasState()
    })

    await test.step('Отправить WebKit pinch gesture на canvas', async() => {
      const dispatchState = await editorModel.zoomInByWebKitGesturePinch()

      expect(dispatchState.dispatchedEvents).toBe(3)
      expect(dispatchState.canceledEvents).toBe(dispatchState.dispatchedEvents)
    })

    await test.step('Проверить что gesture fallback приблизил canvas', async() => {
      const currentCanvasState = await editorModel.getCanvasState()

      expect(currentCanvasState.zoom).toBeGreaterThan(initialCanvasState.zoom)
      expect(currentCanvasState.objectCount).toBe(initialCanvasState.objectCount)
    })
  })

  test('Ctrl+D создаёт копию выделенной фигуры и оставляет исходную на canvas', async({
    editorModel,
    shapes
  }) => {
    const sourceShape = await test.step('Добавить и выделить фигуру внутри рабочей области', async() => {
      const area = await editorModel.getMontageAreaBounds()
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID,
          left: area.left + LISTENERS_DUPLICATE_HOTKEY_SHAPE_OFFSET.left,
          top: area.top + LISTENERS_DUPLICATE_HOTKEY_SHAPE_OFFSET.top,
          ...LISTENERS_HOTKEY_SHAPE_SIZE
        }
      })

      const createdShape = shapes.checkCreation({
        shape,
        presetKey: 'square'
      })

      await shapes.select({ id: LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID })

      return createdShape
    })

    await test.step('Нажать Ctrl+D', async() => {
      await editorModel.pressDuplicateHotkey()
      await editorModel.waitForObjectCount({ count: 2 })
    })

    await test.step('Проверить исходную фигуру и её копию', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      const original = shapeObjects.find((shape) => shape.id === LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID)
      const duplicate = shapeObjects.find((shape) => shape.id !== LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID)
      const activeObject = await editorModel.getActiveObject()

      expect(shapeObjects).toHaveLength(2)
      expect(original, 'после Ctrl+D исходная фигура должна остаться на canvas').toBeDefined()
      expect(duplicate, 'после Ctrl+D должна появиться копия фигуры').toBeDefined()
      expect(activeObject, 'после Ctrl+D копия должна стать активной').not.toBeNull()

      if (!original || !duplicate || !activeObject) {
        throw new Error('После Ctrl+D должны существовать исходная фигура, её копия и active object')
      }

      expect(original.left).toBeCloseTo(sourceShape.left, 1)
      expect(original.top).toBeCloseTo(sourceShape.top, 1)
      expect(duplicate.id).toEqual(expect.any(String))
      expect(duplicate.id).not.toBe(LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID)
      expect(duplicate.left).toBeCloseTo(sourceShape.left + LISTENERS_CLIPBOARD_OFFSET, 1)
      expect(duplicate.top).toBeCloseTo(sourceShape.top + LISTENERS_CLIPBOARD_OFFSET, 1)
      expect(activeObject.id).toBe(duplicate.id)
    })
  })

  test('Ctrl+X вырезает выделенную фигуру и оставляет её в буфере для вставки', async({
    clipboard,
    editorModel,
    shapes
  }) => {
    const sourceShape = await test.step('Добавить и выделить фигуру внутри рабочей области', async() => {
      const area = await editorModel.getMontageAreaBounds()
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: LISTENERS_CUT_HOTKEY_SHAPE_ID,
          left: area.left + LISTENERS_CUT_HOTKEY_SHAPE_OFFSET.left,
          top: area.top + LISTENERS_CUT_HOTKEY_SHAPE_OFFSET.top,
          ...LISTENERS_HOTKEY_SHAPE_SIZE
        }
      })

      const createdShape = shapes.checkCreation({
        shape,
        presetKey: 'square'
      })

      await shapes.select({ id: LISTENERS_CUT_HOTKEY_SHAPE_ID })

      return createdShape
    })

    await test.step('Нажать Ctrl+X', async() => {
      await editorModel.pressCutHotkey()
      await editorModel.waitForObjectCount({ count: 0 })
      await clipboard.waitForClipboardReady()
    })

    await test.step('Вставить вырезанную фигуру из внутреннего буфера', async() => {
      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.waitForObjectCount({ count: 1 })
    })

    await test.step('Проверить вставленную фигуру', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      const pastedShape = shapeObjects[0]

      expect(shapeObjects).toHaveLength(1)
      expect(pastedShape, 'после вставки вырезанной фигуры на canvas должен быть новый объект').toBeDefined()

      if (!pastedShape) {
        throw new Error('После вставки вырезанной фигуры объект должен существовать на canvas')
      }

      expect(pastedShape.id).toEqual(expect.any(String))
      expect(pastedShape.id).not.toBe(LISTENERS_CUT_HOTKEY_SHAPE_ID)
      expect(pastedShape.left).toBeCloseTo(sourceShape.left + LISTENERS_CLIPBOARD_OFFSET, 1)
      expect(pastedShape.top).toBeCloseTo(sourceShape.top + LISTENERS_CLIPBOARD_OFFSET, 1)
    })
  })
})
