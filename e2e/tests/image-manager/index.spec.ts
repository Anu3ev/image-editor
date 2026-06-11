import { test, expect } from '../../fixtures/editor.fixture'
import {
  IMAGE_BASE_SIZE,
  IMAGE_TOLERANCE
} from '../../fixtures/data/image.data'

test.describe('Импорт изображения', () => {
  test('импортированное изображение использует левую верхнюю точку как позицию объекта', async({
    images
  }) => {
    const importedImage = await test.step('Импортировать растровое изображение', async() => {
      return images.addFilledImage(IMAGE_BASE_SIZE)
    })

    const createdImage = await test.step('Проверить что изображение было добавлено', () => {
      return images.checkCreation({ imageObject: importedImage })
    })

    const snapshot = await test.step('Получить геометрию изображения после импорта', async() => {
      return images.getSnapshot({ id: createdImage.id })
    })

    await test.step('Проверить что left и top совпадают с левой верхней точкой объекта', () => {
      expect(Math.abs(snapshot.left - snapshot.boundsLeft)).toBeLessThanOrEqual(IMAGE_TOLERANCE.position)
      expect(Math.abs(snapshot.top - snapshot.boundsTop)).toBeLessThanOrEqual(IMAGE_TOLERANCE.position)
    })
  })
})

test.describe('Экспорт изображения', () => {
  test('экспортирует обрезанное изображение в base64 с учётом crop-области', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение с красной и синей половинами', async() => {
      const imageObject = await images.addVerticalSplitImage({
        width: 200,
        height: 100,
        leftFill: '#ff0000',
        rightFill: '#0000ff'
      })

      return images.checkCreation({ imageObject })
    })

    await test.step('Обрезать изображение до правой синей половины', async() => {
      await crop.startImageCrop({
        id: image.id,
        allowFrameOverflow: false,
        preserveAspectRatio: false
      })
      await crop.setSize({ width: 100, height: 100 })
      await crop.moveActiveCropFrameToImageRightEdge({ image })
      await crop.apply()

      const sourceInfo = await crop.getImageSourceInfo({ id: image.id })

      expect(sourceInfo.cropX, 'после crop должна использоваться правая часть source').toBeGreaterThan(0)
    })

    const pixel = await test.step('Экспортировать crop-изображение и прочитать пиксель результата', async() => {
      const dataUrl = await images.exportObjectAsBase64({ id: image.id })

      return images.getDataUrlPixelColor({
        dataUrl,
        x: 10,
        y: 50
      })
    })

    await test.step('Проверить что экспорт содержит синюю crop-область', () => {
      expect(pixel.red).toBeLessThan(20)
      expect(pixel.green).toBeLessThan(20)
      expect(pixel.blue).toBeGreaterThan(240)
      expect(pixel.alpha).toBe(255)
    })
  })
})
