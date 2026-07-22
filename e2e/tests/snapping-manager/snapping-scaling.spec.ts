import { test, expect } from '../../fixtures/editor.fixture'
import {
  IMAGE_BASE_SIZE,
  IMAGE_SCALING_FACTOR
} from '../../fixtures/data/image.data'
import { SNAPPING_TOLERANCE } from '../../fixtures/data/snapping.data'
import type { EditorModel } from '../../models/editor.model'
import type { ImageModel } from '../../models/image.model'
import type { ShapeModel } from '../../models/shape/shape.model'
import type { SnappingModel } from '../../models/snapping.model'
import type {
  ShapeScaleSnapshot,
  ShapeTextInfo,
  SnappingGuideInfo,
  VisibleObjectSizeIndicatorInfo
} from '../../types'

/** Исходное состояние шейпа с текстом, размещённого сразу на двух направляющих. */
interface ShapeTextHoldSetup {
  guideRight: number
  guideTop: number
  initialSnapshot: ShapeScaleSnapshot
  initialText: ShapeTextInfo
  shapeId: string
  shapeSize: number
}

/** Состояние шейпа и его текста на одном шаге удержания. */
interface ShapeTextHoldState {
  guides: SnappingGuideInfo[]
  indicator: VisibleObjectSizeIndicatorInfo
  snapshot: ShapeScaleSnapshot
  text: ShapeTextInfo
}

/** Добавляет шейп с текстом так, чтобы его верхняя и правая грани совпали с гранями изображения. */
async function createShapeTextHoldSetup({
  images,
  shapes
}: {
  images: ImageModel
  shapes: ShapeModel
}): Promise<ShapeTextHoldSetup> {
  const imageObject = await images.addFilledImage({ width: 1000, height: 667 })
  const image = images.checkCreation({ imageObject })
  const imageSnapshot = await images.getSnapshot({ id: image.id })
  const shapeId = 'shape-with-text-held-by-two-guides'
  const shapeSize = 180
  const shape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: shapeId,
      left: imageSnapshot.boundsRight - shapeSize,
      top: imageSnapshot.boundsTop,
      width: shapeSize,
      height: shapeSize,
      shapeTextAutoExpand: false,
      text: 'Текст внутри шейпа'
    }
  })
  shapes.checkCreation({ shape, presetKey: 'square' })

  const initialSnapshot = await shapes.getScaleSnapshot({ id: shapeId })
  const initialText = await shapes.getTextNode({ id: shapeId })

  expect(initialSnapshot.groupBoundsRight).toBeCloseTo(imageSnapshot.boundsRight, 5)
  expect(initialSnapshot.groupBoundsTop).toBeCloseTo(imageSnapshot.boundsTop, 5)
  expect(initialText, 'в шейпе должен существовать текст').not.toBeNull()
  if (!initialText) throw new Error('В шейпе должен существовать текст')

  return {
    guideRight: imageSnapshot.boundsRight,
    guideTop: imageSnapshot.boundsTop,
    initialSnapshot,
    initialText,
    shapeId,
    shapeSize
  }
}

/** Выполняет два микродвижения внутри зоны удержания, не отпуская ручку. */
async function captureShapeTextHoldStates({
  editorModel,
  setup,
  shapes,
  snapping
}: {
  editorModel: EditorModel
  setup: ShapeTextHoldSetup
  shapes: ShapeModel
  snapping: SnappingModel
}): Promise<ShapeTextHoldState[]> {
  await shapes.startScaleFromCorner({ id: setup.shapeId, corner: 'tr' })
  const states: ShapeTextHoldState[] = []

  for (let step = 0; step < 2; step += 1) {
    const snapshot = await shapes.dragActiveScaleHandleBy({ deltaX: -1, deltaY: 1 })
    const text = await shapes.getTextNode({ id: setup.shapeId })

    expect(text, `текст должен существовать на шаге ${step + 1}`).not.toBeNull()
    if (!text) throw new Error(`Текст должен существовать на шаге ${step + 1}`)

    states.push({
      guides: (await snapping.getGuideState()).guides,
      indicator: await editorModel.requireObjectSizeIndicator(),
      snapshot,
      text
    })
  }

  expect(states).toHaveLength(2)
  expect(states.every(({ indicator }) => indicator.visible)).toBe(true)

  return states
}

/** Проверяет, что один шаг удержания не изменил ни шейп, ни текст внутри него. */
function expectStableShapeTextHold({
  setup,
  state
}: {
  setup: ShapeTextHoldSetup
  state: ShapeTextHoldState
}): void {
  const { initialSnapshot, initialText, shapeSize } = setup
  const { guides, indicator, snapshot, text } = state

  expect([indicator.width, indicator.height]).toEqual([shapeSize, shapeSize])
  expect(guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.guideRight },
    { type: 'horizontal', position: setup.guideTop }
  ]))
  expect(snapshot.groupBoundsWidth).toBeCloseTo(initialSnapshot.groupBoundsWidth, 2)
  expect(snapshot.groupBoundsHeight).toBeCloseTo(initialSnapshot.groupBoundsHeight, 2)
  expect(snapshot.groupBoundsRight).toBeCloseTo(setup.guideRight, 2)
  expect(snapshot.groupBoundsTop).toBeCloseTo(setup.guideTop, 2)
  expect(snapshot.width).toBeCloseTo(initialSnapshot.width, 5)
  expect(snapshot.height).toBeCloseTo(initialSnapshot.height, 5)
  expect(snapshot.scaleX).toBeCloseTo(initialSnapshot.scaleX, 5)
  expect(snapshot.scaleY).toBeCloseTo(initialSnapshot.scaleY, 5)
  expect(text.width).toBeCloseTo(initialText.width, 5)
  expect(text.height).toBeCloseTo(initialText.height, 5)
  expect(text.fontSize).toBeCloseTo(initialText.fontSize, 5)
  expect(text.lines).toEqual(initialText.lines)
}

test.describe('Масштабирование объекта с прилипаниями', () => {
  test('при растяжении вправо объект прилипает правой границей к вертикальной направляющей', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()
    const shapeWidth = 80
    const shapeHeight = 80
    const initialBoundsLeft = montageBounds.left + 100
    const initialBoundsTop = montageBounds.top + 140

    await test.step('Добавить объект для горизонтального масштабирования', async() => {
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: initialBoundsLeft,
          top: initialBoundsTop,
          width: shapeWidth,
          height: shapeHeight,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredWidth = montageBounds.right - initialSnapshot.groupBoundsLeft
    const requestedScaleX = (desiredWidth - 3) / initialSnapshot.groupBoundsWidth

    await test.step('Растянуть объект почти до правой границы монтажной области', async() => {
      await shapes.scaleHorizontallyFromRight({
        id: 'active-shape',
        scaleX: requestedScaleX
      })
    })

    await test.step('Проверить что правая граница прилипла к направляющей', async() => {
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const montageRight = montageBounds.right

      expect(Math.abs(snapshot.groupBoundsRight - montageRight)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: montageRight
        })
      ]))
    })
  })

  test('при растяжении вниз объект прилипает нижней границей к горизонтальной направляющей', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()
    const shapeWidth = 80
    const shapeHeight = 80
    const initialBoundsLeft = montageBounds.left + 100
    const initialBoundsTop = montageBounds.top + 140

    await test.step('Добавить объект для вертикального масштабирования', async() => {
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: initialBoundsLeft,
          top: initialBoundsTop,
          width: shapeWidth,
          height: shapeHeight,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredHeight = montageBounds.bottom - initialSnapshot.groupBoundsTop
    const requestedScaleY = (desiredHeight - 3) / initialSnapshot.groupBoundsHeight

    await test.step('Растянуть объект почти до нижней границы монтажной области', async() => {
      await shapes.scaleVerticallyFromBottom({
        id: 'active-shape',
        scaleY: requestedScaleY
      })
    })

    await test.step('Проверить что нижняя граница прилипла к направляющей', async() => {
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const montageBottom = montageBounds.bottom

      expect(Math.abs(snapshot.groupBoundsBottom - montageBottom)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'horizontal',
          position: montageBottom
        })
      ]))
    })
  })

  test('при растяжении за угол объект сохраняет фиксированную точку и прилипает по ближайшей оси', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()
    const shapeWidth = 80
    const shapeHeight = 80
    const initialBoundsLeft = montageBounds.left + 100
    const initialBoundsTop = montageBounds.top + 140

    await test.step('Добавить объект для диагонального масштабирования', async() => {
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: initialBoundsLeft,
          top: initialBoundsTop,
          width: shapeWidth,
          height: shapeHeight,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredWidth = montageBounds.right - initialSnapshot.groupBoundsLeft
    const requestedScale = (desiredWidth - 3) / initialSnapshot.groupBoundsWidth

    await test.step('Растянуть объект за правый нижний угол почти до вертикальной направляющей', async() => {
      await shapes.scaleDiagonally({
        id: 'active-shape',
        corner: 'br',
        scaleX: requestedScale,
        scaleY: requestedScale
      })
    })

    await test.step('Проверить что верхний левый угол остался на месте, а правая граница прилипла', async() => {
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const montageRight = montageBounds.right

      expect(Math.abs(snapshot.groupBoundsLeft - initialSnapshot.groupBoundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(snapshot.groupBoundsTop - initialSnapshot.groupBoundsTop))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(snapshot.groupBoundsRight - montageRight)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: montageRight
        })
      ]))
    })
  })

  test('при микродвижениях на двух направляющих шейп и текст сохраняют размер', async({
    editorModel,
    images,
    shapes,
    snapping
  }) => {
    const setup = await createShapeTextHoldSetup({ images, shapes })
    const liveStates = await captureShapeTextHoldStates({ editorModel, setup, shapes, snapping })

    for (const state of liveStates) expectStableShapeTextHold({ setup, state })

    const lastLiveState = liveStates[liveStates.length - 1]
    expect(lastLiveState, 'должен существовать второй шаг удержания').toBeDefined()
    if (!lastLiveState) throw new Error('Не найден второй шаг удержания шейпа')

    const finalSnapshot = await shapes.finishScale({ id: setup.shapeId })
    const finalText = await shapes.getTextNode({ id: setup.shapeId })
    const finalGuideState = await snapping.getGuideState()

    expect(finalSnapshot.groupBoundsWidth).toBeCloseTo(lastLiveState.snapshot.groupBoundsWidth, 5)
    expect(finalSnapshot.groupBoundsHeight).toBeCloseTo(lastLiveState.snapshot.groupBoundsHeight, 5)
    expect(finalText).toEqual(lastLiveState.text)
    expect(finalGuideState.guides).toHaveLength(0)
    expect(finalGuideState.spacingGuides).toHaveLength(0)
  })

  test('при масштабировании с Ctrl объект не прилипает к направляющим', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()
    const shapeWidth = 80
    const shapeHeight = 80
    const initialBoundsLeft = montageBounds.left + 100
    const initialBoundsTop = montageBounds.top + 140

    await test.step('Добавить объект для проверки масштабирования с Ctrl', async() => {
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: initialBoundsLeft,
          top: initialBoundsTop,
          width: shapeWidth,
          height: shapeHeight,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredWidth = montageBounds.right - initialSnapshot.groupBoundsLeft
    const requestedScaleX = (desiredWidth - 3) / initialSnapshot.groupBoundsWidth
    const expectedRightBeforeSnap = initialSnapshot.groupBoundsLeft
      + (initialSnapshot.groupBoundsWidth * requestedScaleX)

    await test.step('Растянуть объект почти до направляющей с зажатым Ctrl', async() => {
      await shapes.scaleHorizontallyFromRight({
        id: 'active-shape',
        scaleX: requestedScaleX,
        ctrlKey: true
      })
    })

    await test.step('Проверить что объект не прилип к направляющей и направляющие не показаны', async() => {
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const montageRight = montageBounds.right

      expect(Math.abs(snapshot.groupBoundsRight - expectedRightBeforeSnap))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(snapshot.groupBoundsRight - montageRight))
        .toBeGreaterThan(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toHaveLength(0)
      expect(guideState.spacingGuides).toHaveLength(0)
    })
  })

  test('при скейлинге изображения его левая верхняя точка остаётся на месте', async({
    images
  }) => {
    const importedImage = await test.step('Импортировать изображение для скейлинга', async() => {
      return images.addFilledImage(IMAGE_BASE_SIZE)
    })

    const createdImage = await test.step('Проверить что изображение было добавлено', () => {
      return images.checkCreation({ imageObject: importedImage })
    })

    const initialSnapshot = await test.step('Получить исходную геометрию изображения', async() => {
      return images.getSnapshot({ id: createdImage.id })
    })

    await test.step('Масштабировать изображение вправо с дробным коэффициентом', async() => {
      await images.scaleHorizontallyFromRight({
        id: createdImage.id,
        scaleX: IMAGE_SCALING_FACTOR
      })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить итоговую геометрию', async() => {
      await images.finishScale({ id: createdImage.id })
      return images.getSnapshot({ id: createdImage.id })
    })

    await test.step('Проверить что левая верхняя точка не сдвинулась', () => {
      expect(Math.abs(finalSnapshot.boundsLeft - initialSnapshot.boundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(finalSnapshot.boundsTop - initialSnapshot.boundsTop))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(finalSnapshot.boundsWidth).toBeLessThan(initialSnapshot.boundsWidth)
    })
  })

  test('после завершения масштабирования направляющие исчезают', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()
    const shapeWidth = 80
    const shapeHeight = 80
    const initialBoundsLeft = montageBounds.left + 100
    const initialBoundsTop = montageBounds.top + 140

    await test.step('Добавить объект для масштабирования', async() => {
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: initialBoundsLeft,
          top: initialBoundsTop,
          width: shapeWidth,
          height: shapeHeight,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredWidth = montageBounds.right - initialSnapshot.groupBoundsLeft
    const requestedScaleX = (desiredWidth - 3) / initialSnapshot.groupBoundsWidth

    await test.step('Растянуть объект до прилипания по правой границе', async() => {
      await shapes.scaleHorizontallyFromRight({
        id: 'active-shape',
        scaleX: requestedScaleX
      })
    })

    await test.step('Завершить масштабирование и проверить очистку направляющих', async() => {
      await shapes.finishScale({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const montageRight = montageBounds.right

      expect(guideState.guides).toHaveLength(0)
      expect(guideState.spacingGuides).toHaveLength(0)
      expect(Math.abs(snapshot.groupBoundsRight - montageRight)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
    })
  })
})
