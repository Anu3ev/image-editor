import { test, expect } from '../../fixtures/editor.fixture'
import {
  BLOCKED_CROP_DRAG_OFFSET,
  BLOCKED_CROP_DRAG_SHAPE_POSITION,
  BLOCKED_CROP_IMAGE_SIZE,
  BLOCKED_CROP_REFERENCE_SHAPE_SIZE,
  BLOCKED_CROP_SCALE_CASES
} from '../../fixtures/data/crop-frame-guides.data'

test.describe('Направляющие при ограничении crop-области изображения', () => {
  test('не показывает направляющие при попытке сдвинуть полную crop-область вправо за пределы изображения', async({
    images,
    shapes,
    crop,
    snapping
  }) => {
    const image = await test.step('Добавить изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: BLOCKED_CROP_IMAGE_SIZE.width,
          height: BLOCKED_CROP_IMAGE_SIZE.height
        })
      })
    })

    const imageSnapshot = await test.step('Получить bounds изображения', async() => {
      return images.getSnapshot({ id: image.id })
    })

    await test.step('Добавить shape в позиции потенциального снапа справа от изображения', async() => {
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          left: imageSnapshot.boundsRight + BLOCKED_CROP_DRAG_SHAPE_POSITION.left,
          top: imageSnapshot.boundsTop + BLOCKED_CROP_DRAG_SHAPE_POSITION.top,
          width: BLOCKED_CROP_REFERENCE_SHAPE_SIZE.width,
          height: BLOCKED_CROP_REFERENCE_SHAPE_SIZE.height
        }
      })

      expect(shape, 'shape должен добавиться для сценария ограниченного drag').not.toBeNull()
      expect(shape?.id, 'у shape должен быть id').toBeDefined()
    })

    const initialState = await test.step('Войти в image crop с выключенным overflow', async() => {
      return crop.startImageCrop({
        id: image.id,
        allowFrameOverflow: false
      })
    })

    const liveState = await test.step('Попытаться сдвинуть полную crop-область вправо к соседнему объекту', async() => {
      return crop.dragFrameByOffset({
        deltaX: BLOCKED_CROP_DRAG_OFFSET.deltaX,
        deltaY: BLOCKED_CROP_DRAG_OFFSET.deltaY
      })
    })

    const guideState = await test.step('Считать live-состояние направляющих прилипания', async() => {
      return snapping.getGuideState()
    })

    await test.step('Завершить drag и закрыть crop mode', async() => {
      await crop.finishFrameMove()
      await crop.cancel()
    })

    await test.step('Проверить что clamp удержал crop-область на месте и направляющие не появились', () => {
      expect(Math.round(liveState.rect.left)).toBe(Math.round(initialState.rect.left))
      expect(Math.round(liveState.rect.top)).toBe(Math.round(initialState.rect.top))
      expect(Math.round(liveState.rect.width)).toBe(Math.round(initialState.rect.width))
      expect(Math.round(liveState.rect.height)).toBe(Math.round(initialState.rect.height))
      expect(guideState.guides).toHaveLength(0)
      expect(guideState.spacingGuides).toHaveLength(0)
    })
  })

  for (const scaleCase of BLOCKED_CROP_SCALE_CASES) {
    test(scaleCase.title, async({
      images,
      shapes,
      crop,
      snapping
    }) => {
      const image = await test.step('Добавить изображение', async() => {
        return images.checkCreation({
          imageObject: await images.addFilledImage({
            width: BLOCKED_CROP_IMAGE_SIZE.width,
            height: BLOCKED_CROP_IMAGE_SIZE.height
          })
        })
      })

      const imageSnapshot = await test.step('Получить bounds изображения', async() => {
        return images.getSnapshot({ id: image.id })
      })

      await test.step('Добавить shape в позиции потенциального прилипания для ограниченного resize', async() => {
        const shapeLeft = scaleCase.shapePosition.leftFrom === 'right'
          ? imageSnapshot.boundsRight + scaleCase.shapePosition.left
          : imageSnapshot.boundsLeft + scaleCase.shapePosition.left
        const shapeTop = scaleCase.shapePosition.topFrom === 'bottom'
          ? imageSnapshot.boundsBottom + scaleCase.shapePosition.top
          : imageSnapshot.boundsTop + scaleCase.shapePosition.top

        const shape = await shapes.addAtBounds({
          presetKey: 'square',
          options: {
            left: shapeLeft,
            top: shapeTop,
            width: BLOCKED_CROP_REFERENCE_SHAPE_SIZE.width,
            height: BLOCKED_CROP_REFERENCE_SHAPE_SIZE.height
          }
        })

        expect(shape, 'shape должен добавиться для сценария ограниченного resize').not.toBeNull()
        expect(shape?.id, 'у shape должен быть id').toBeDefined()
      })

      const initialState = await test.step('Войти в image crop с выключенным overflow', async() => {
        return crop.startImageCrop({
          id: image.id,
          allowFrameOverflow: false
        })
      })

      const liveState = await test.step('Попытаться увеличить полную crop-область за пределы изображения', async() => {
        return crop.dragFrameFromControlToSize({
          control: scaleCase.control,
          size: scaleCase.size
        })
      })

      const guideState = await test.step('Считать live-состояние направляющих прилипания', async() => {
        return snapping.getGuideState()
      })

      await test.step('Завершить resize и закрыть crop mode', async() => {
        await crop.finishFrameResize()
        await crop.cancel()
      })

      await test.step('Проверить что clamp удержал crop-область на месте и направляющие не появились', () => {
        expect(Math.round(liveState.rect.left)).toBe(Math.round(initialState.rect.left))
        expect(Math.round(liveState.rect.top)).toBe(Math.round(initialState.rect.top))
        expect(Math.round(liveState.rect.width)).toBe(Math.round(initialState.rect.width))
        expect(Math.round(liveState.rect.height)).toBe(Math.round(initialState.rect.height))
        expect(guideState.guides).toHaveLength(0)
        expect(guideState.spacingGuides).toHaveLength(0)
      })
    })
  }
})
