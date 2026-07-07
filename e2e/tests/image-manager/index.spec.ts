import { test, expect } from '../../fixtures/editor.fixture'
import {
  IMAGE_BASE_SIZE,
  IMAGE_EXPORT_EDGE_COLOR_TOLERANCE,
  IMAGE_EXPORT_EDGE_FILL,
  IMAGE_EXPORT_MONTAGE_SIZE,
  IMAGE_EXPORT_WHITE_PIXEL_MIN_CHANNEL,
  IMAGE_OUTSIDE_MONTAGE_OBJECT,
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
  test('JPEG-экспорт не осветляет внешний край монтажной области', async({
    images
  }) => {
    await test.step('Заполнить монтажную область цветным изображением до краёв', async() => {
      const imageObject = await images.addFilledImage({
        ...IMAGE_EXPORT_MONTAGE_SIZE,
        fill: IMAGE_EXPORT_EDGE_FILL,
        scale: 'scale-montage',
        withoutSelection: true
      })

      images.checkCreation({ imageObject })
    })

    const dataUrl = await test.step('Экспортировать монтажную область в JPEG', async() => {
      return images.exportCanvasAsBase64({ contentType: 'image/jpeg' })
    })

    const centerPixel = await test.step('Прочитать внутренний пиксель экспортированного JPEG', async() => {
      return images.getDataUrlPixelColor({
        dataUrl,
        x: IMAGE_EXPORT_MONTAGE_SIZE.width / 2,
        y: IMAGE_EXPORT_MONTAGE_SIZE.height / 2
      })
    })

    const edgePixels = await test.step('Прочитать edge-пиксели экспортированного JPEG', async() => {
      return Promise.all([
        images.getDataUrlPixelColor({
          dataUrl,
          x: 0,
          y: IMAGE_EXPORT_MONTAGE_SIZE.height / 2
        }),
        images.getDataUrlPixelColor({
          dataUrl,
          x: IMAGE_EXPORT_MONTAGE_SIZE.width - 1,
          y: IMAGE_EXPORT_MONTAGE_SIZE.height / 2
        }),
        images.getDataUrlPixelColor({
          dataUrl,
          x: IMAGE_EXPORT_MONTAGE_SIZE.width / 2,
          y: 0
        }),
        images.getDataUrlPixelColor({
          dataUrl,
          x: IMAGE_EXPORT_MONTAGE_SIZE.width / 2,
          y: IMAGE_EXPORT_MONTAGE_SIZE.height - 1
        })
      ])
    })

    await test.step('Проверить что внешний край совпадает с внутренней заливкой', () => {
      for (const edgePixel of edgePixels) {
        const redDelta = Math.abs(edgePixel.red - centerPixel.red)
        const greenDelta = Math.abs(edgePixel.green - centerPixel.green)
        const blueDelta = Math.abs(edgePixel.blue - centerPixel.blue)

        expect(redDelta).toBeLessThanOrEqual(IMAGE_EXPORT_EDGE_COLOR_TOLERANCE)
        expect(greenDelta).toBeLessThanOrEqual(IMAGE_EXPORT_EDGE_COLOR_TOLERANCE)
        expect(blueDelta).toBeLessThanOrEqual(IMAGE_EXPORT_EDGE_COLOR_TOLERANCE)
        expect(edgePixel.alpha).toBe(255)
      }
    })
  })

  test('JPEG-экспорт не включает объект, который целиком находится за монтажной областью', async({
    canvas,
    images
  }) => {
    await test.step('Задать размер монтажной области', async() => {
      await canvas.setMontageResolution(IMAGE_EXPORT_MONTAGE_SIZE)
    })

    const outsideImage = await test.step('Добавить изображение и перенести его за левую границу', async() => {
      const imageObject = await images.addFilledImage({
        width: IMAGE_OUTSIDE_MONTAGE_OBJECT.width,
        height: IMAGE_OUTSIDE_MONTAGE_OBJECT.height,
        fill: '#ff0000',
        withoutSelection: true
      })
      const image = images.checkCreation({ imageObject })

      return images.moveBoundsTo({
        id: image.id,
        left: IMAGE_OUTSIDE_MONTAGE_OBJECT.left,
        top: IMAGE_OUTSIDE_MONTAGE_OBJECT.top
      })
    })

    const dataUrl = await test.step('Экспортировать монтажную область в JPEG', async() => {
      return images.exportCanvasAsBase64({ contentType: 'image/jpeg' })
    })

    const exportedSize = await test.step('Получить размер экспортированного JPEG', async() => {
      return images.getDataUrlSize({ dataUrl })
    })

    const edgePixel = await test.step('Прочитать пиксель рядом с объектом за границей', async() => {
      return images.getDataUrlPixelColor({
        dataUrl,
        x: 0,
        y: Math.round(outsideImage.centerY)
      })
    })

    await test.step('Проверить что экспорт остался в границах монтажной области', () => {
      expect(exportedSize).toEqual(IMAGE_EXPORT_MONTAGE_SIZE)
      expect(edgePixel.red).toBeGreaterThanOrEqual(IMAGE_EXPORT_WHITE_PIXEL_MIN_CHANNEL)
      expect(edgePixel.green).toBeGreaterThanOrEqual(IMAGE_EXPORT_WHITE_PIXEL_MIN_CHANNEL)
      expect(edgePixel.blue).toBeGreaterThanOrEqual(IMAGE_EXPORT_WHITE_PIXEL_MIN_CHANNEL)
      expect(edgePixel.alpha).toBe(255)
    })
  })

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
