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
