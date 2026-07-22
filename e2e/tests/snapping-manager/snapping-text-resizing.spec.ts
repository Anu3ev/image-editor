import { test, expect } from '../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../fixtures/data/snapping.data'
import type { EditorModel } from '../../models/editor.model'
import type { ShapeModel } from '../../models/shape/shape.model'
import type { SnappingModel } from '../../models/snapping.model'
import type { TextModel } from '../../models/text/text.model'
import type {
  SnappingGuideState,
  SnappingObjectSnapshot,
  TextResizeSnapshot
} from '../../types'

/** Точность сравнения live-геометрии при неподвижном pointer. */
const TEXT_HOLD_GEOMETRY_PRECISION = 5

/** Поля текста, которые не должны меняться при удержании на направляющей. */
const STABLE_TEXT_HOLD_FIELDS = [
  'boundsLeft', 'boundsTop', 'boundsRight', 'boundsBottom',
  'boundsWidth', 'boundsHeight', 'width', 'fontSize'
] as const

/** Состояние текста и направляющих на одном шаге скейлинга. */
type RotatedTextHoldState = {
  snapshot: TextResizeSnapshot
  guides: SnappingGuideState
}

/** Состояния удержания и завершения скейлинга повёрнутого текста. */
type RotatedTextHoldInteraction = {
  committed: TextResizeSnapshot
  guideState: SnappingGuideState
  heldState: RotatedTextHoldState
  repeatedState: RotatedTextHoldState
}

/** Создаёт повёрнутый текст и ставит опорную фигуру у его правой границы. */
async function createRotatedTextHoldSetup(params: {
  editorModel: EditorModel
  shapes: ShapeModel
  text: TextModel
  snapping: SnappingModel
}): Promise<SnappingObjectSnapshot> {
  const { editorModel, shapes, text, snapping } = params
  const montage = await editorModel.getMontageAreaBounds()
  const textObject = await text.add({
    id: 'rotated-text',
    text: 'Новый заголовок',
    left: montage.left + 150,
    top: montage.top + 190,
    width: 220,
    fontSize: 32,
    autoExpand: false
  })

  text.checkCreation({ textObject })

  const rotatedText = text.checkCreation({
    textObject: await text.rotate({ id: 'rotated-text', angle: 55 })
  })
  const initial = await text.getResizeSnapshot({ id: 'rotated-text' })
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'reference-shape',
      left: initial.boundsRight,
      top: montage.top + 20,
      width: 40,
      height: 40,
      text: ''
    }
  })

  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })

  const reference = await snapping.getObjectSnapshot({ id: 'reference-shape' })

  expect(rotatedText.angle).toBeCloseTo(55, TEXT_HOLD_GEOMETRY_PRECISION)
  expect(reference.boundsLeft).toBeCloseTo(initial.boundsRight, TEXT_HOLD_GEOMETRY_PRECISION)

  return reference
}

/** Удерживает ручку текста на месте и завершает скейлинг. */
async function holdRotatedTextOnGuide(params: {
  text: TextModel
  snapping: SnappingModel
}): Promise<RotatedTextHoldInteraction> {
  const { text, snapping } = params
  const heldState = {
    snapshot: await text.dragScaleHandleBy({
      id: 'rotated-text',
      corner: 'br',
      deltaX: -1,
      deltaY: -1,
      pointerSteps: 1
    }),
    guides: await snapping.getGuideState()
  }
  const repeatedState = {
    snapshot: await text.continueScaleHandleBy({ deltaX: 0, deltaY: 0 }),
    guides: await snapping.getGuideState()
  }
  const committed = await text.finishScale({ id: 'rotated-text' })

  expect(heldState.snapshot.boundsWidth, 'ширина текста на первом шаге должна быть положительной')
    .toBeGreaterThan(0)
  expect(repeatedState.snapshot.boundsWidth, 'ширина текста на повторном шаге должна быть положительной')
    .toBeGreaterThan(0)

  return {
    committed,
    guideState: await snapping.getGuideState(),
    heldState,
    repeatedState
  }
}

/** Проверяет, что удержание и mouseup не меняют геометрию повёрнутого текста. */
function expectRotatedTextHoldStable(params: {
  reference: SnappingObjectSnapshot
  interaction: RotatedTextHoldInteraction
}): void {
  const { reference, interaction } = params

  for (const state of [interaction.heldState, interaction.repeatedState]) {
    for (const field of STABLE_TEXT_HOLD_FIELDS) {
      expect(state.snapshot[field])
        .toBeCloseTo(interaction.heldState.snapshot[field], TEXT_HOLD_GEOMETRY_PRECISION)
    }
    expect(state.guides.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: reference.boundsLeft })
    ]))
  }

  for (const field of STABLE_TEXT_HOLD_FIELDS) {
    expect(interaction.committed[field])
      .toBeCloseTo(interaction.repeatedState.snapshot[field], TEXT_HOLD_GEOMETRY_PRECISION)
  }
  expect(interaction.guideState.guides).toHaveLength(0)
  expect(interaction.guideState.spacingGuides).toHaveLength(0)
}

/** Добавляет опорную фигуру, обычный текст и такой же текст из шаблона. */
async function addTextResizeComparisonObjects(params: {
  shapes: ShapeModel
  text: TextModel
}): Promise<void> {
  const { shapes, text } = params
  const reference = shapes.checkCreation({
    shape: await shapes.add({
      presetKey: 'square',
      options: {
        id: 'reference-shape',
        left: 340,
        top: 220,
        width: 80,
        height: 80,
        text: ''
      }
    }),
    presetKey: 'square'
  })
  const directText = text.checkCreation({
    textObject: await text.addRegressionText({ left: 281, top: 352 })
  })
  const templateText = text.checkCreation({ textObject: await text.applyRegressionTemplate() })

  expect(reference.id).toBe('reference-shape')
  expect(directText.id).not.toBe(templateText.id)
}

test.describe('Горизонтальный ресайз текстового объекта с прилипаниями', () => {
  test('при сужении справа текстовый объект прилипает правой границей к направляющей', async({
    shapes,
    text,
    snapping
  }) => {
    await test.step('Добавить опорную фигуру и текстовый объект, созданный напрямую', async() => {
      const reference = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: 470,
          top: 220,
          width: 80,
          height: 80,
          text: ''
        }
      })
      const textObject = await text.addRegressionText({
        left: 281,
        top: 352
      })

      shapes.checkCreation({ shape: reference, presetKey: 'square' })
      text.checkCreation({ textObject })
    })

    const referenceSnapshot = await test.step('Получить границы опорной фигуры', async() => {
      return snapping.getObjectSnapshot({ id: 'reference-shape' })
    })

    await test.step('Сузить текст почти до направляющей справа', async() => {
      await text.resizeFromRightToGuide({
        objectIndex: 1,
        x: referenceSnapshot.boundsLeft
      })
    })

    await test.step('Проверить что правая граница текста прилипла к опорной направляющей', async() => {
      const snapshot = await text.getResizeSnapshot({ objectIndex: 1 })
      const guideState = await snapping.getGuideState()

      expect(Math.abs(snapshot.boundsRight - referenceSnapshot.boundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: referenceSnapshot.boundsLeft
        })
      ]))
    })
  })

  test('при сужении слева текстовый объект прилипает левой границей к направляющей', async({
    editorModel,
    text,
    snapping
  }) => {
    const montageArea = await editorModel.getMontageArea()

    await test.step('Добавить текстовый объект рядом с левым краем монтажной области', async() => {
      const textObject = await text.addRegressionText({
        left: montageArea.left + 24,
        top: 352
      })

      text.checkCreation({ textObject })
    })

    await test.step('Сузить текст слева почти до направляющей монтажной области', async() => {
      await text.resizeFromLeftToGuide({
        objectIndex: 0,
        x: montageArea.left
      })
    })

    await test.step('Проверить что левая граница текста прилипла к левому краю монтажной области', async() => {
      const snapshot = await text.getResizeSnapshot({ objectIndex: 0 })
      const guideState = await snapping.getGuideState()

      expect(Math.abs(snapshot.boundsLeft - montageArea.left)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: montageArea.left
        })
      ]))
    })
  })

  test('при сужении текста с прилипаниями объект не смещается по вертикали', async({
    shapes,
    text,
    snapping
  }) => {
    await test.step('Добавить опорную фигуру и текстовый объект, который будет переноситься на новые строки', async() => {
      const reference = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: 420,
          top: 220,
          width: 80,
          height: 80,
          text: ''
        }
      })
      const textObject = await text.addRegressionText({
        left: 281,
        top: 352
      })

      shapes.checkCreation({ shape: reference, presetKey: 'square' })
      text.checkCreation({ textObject })
    })

    const initialState = await test.step('Получить исходное состояние текста и опорной фигуры', async() => {
      const reference = await snapping.getObjectSnapshot({ id: 'reference-shape' })
      const textSnapshot = await text.getResizeSnapshot({ objectIndex: 1 })

      return {
        reference,
        textSnapshot
      }
    })

    await test.step('Сузить текст до состояния с переносом строк и прилипания к направляющей', async() => {
      await text.resizeFromRightToGuide({
        objectIndex: 1,
        x: initialState.reference.boundsLeft
      })
    })

    await test.step('Проверить что верхняя точка объекта осталась на месте по Y', async() => {
      const snapshot = await text.getResizeSnapshot({ objectIndex: 1 })

      expect(snapshot.width).toBeLessThan(initialState.textSnapshot.width)
      expect(Math.abs(snapshot.leftTopY - initialState.textSnapshot.leftTopY))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
    })
  })

  test('при сужении текста с Ctrl направляющая не появляется и текст не прилипает', async({
    shapes,
    text,
    snapping
  }) => {
    await test.step('Добавить опорную фигуру и текстовый объект, созданный напрямую', async() => {
      const reference = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: 470,
          top: 220,
          width: 80,
          height: 80,
          text: ''
        }
      })
      const textObject = await text.addRegressionText({
        left: 281,
        top: 352
      })

      shapes.checkCreation({ shape: reference, presetKey: 'square' })
      text.checkCreation({ textObject })
    })

    const referenceSnapshot = await snapping.getObjectSnapshot({ id: 'reference-shape' })
    const initialSnapshot = await text.getResizeSnapshot({ objectIndex: 1 })
    const requestedWidth = referenceSnapshot.boundsLeft
      - initialSnapshot.boundsLeft
      - initialSnapshot.paddingLeft
      - initialSnapshot.paddingRight
      - 3

    await test.step('Сузить текст почти до направляющей с зажатым Ctrl', async() => {
      await text.resizeFromRightToWidth({
        objectIndex: 1,
        width: requestedWidth,
        ctrlKey: true
      })
    })

    await test.step('Проверить что текст не прилип и направляющие не показаны', async() => {
      const snapshot = await text.getResizeSnapshot({ objectIndex: 1 })
      const guideState = await snapping.getGuideState()

      expect(Math.abs(snapshot.boundsRight - referenceSnapshot.boundsLeft))
        .toBeGreaterThan(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toHaveLength(0)
      expect(guideState.spacingGuides).toHaveLength(0)
    })
  })

  test('объект из шаблона и объект, созданный напрямую, одинаково прилипают при сужении справа', async({
    shapes,
    text,
    snapping
  }) => {
    await test.step('Добавить опорную фигуру, прямой текстовый объект и объект из шаблона', async() => {
      await addTextResizeComparisonObjects({ shapes, text })
    })

    const referenceSnapshot = await test.step(
      'Получить положение опорной фигуры',
      () => snapping.getObjectSnapshot({ id: 'reference-shape' })
    )

    const directSnappedSnapshot = await test.step('Сузить прямой текст почти до направляющей справа', async() => {
      return text.resizeFromRightToGuide({
        objectIndex: 1,
        x: referenceSnapshot.boundsLeft
      })
    })

    await test.step(
      'Завершить сужение прямого текста перед переходом ко второму объекту',
      () => text.finishResize({ objectIndex: 1 })
    )

    const templateSnappedSnapshot = await test.step('Сузить текст из шаблона почти до той же направляющей справа', async() => {
      return text.resizeFromRightToGuide({
        objectIndex: 2,
        x: referenceSnapshot.boundsLeft
      })
    })

    await test.step('Завершить сужение текста из шаблона', () => text.finishResize({ objectIndex: 2 }))

    await test.step('Проверить что оба текста одинаково прилипли к одной и той же направляющей', async() => {
      expect(Math.abs(directSnappedSnapshot.boundsRight - referenceSnapshot.boundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(templateSnappedSnapshot.boundsRight - referenceSnapshot.boundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(directSnappedSnapshot.boundsRight - templateSnappedSnapshot.boundsRight))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
    })
  })
})

test.describe('Скейлинг повёрнутого текста с прилипаниями', () => {
  test.fixme('при неподвижной мыши повёрнутый текст не сужается и не расширяется на направляющей', async({
    editorModel,
    shapes,
    text,
    snapping
  }) => {
    const reference = await test.step('Добавить и повернуть текст рядом с опорной фигурой', async() => {
      return createRotatedTextHoldSetup({
        editorModel,
        shapes,
        text,
        snapping
      })
    })

    const interaction = await test.step('Подержать ручку неподвижно и завершить scale', async() => {
      return holdRotatedTextOnGuide({ text, snapping })
    })

    await test.step('Проверить стабильную геометрию, гайды и состояние после mouseup', async() => {
      expectRotatedTextHoldStable({ reference, interaction })
    })
  })
})
