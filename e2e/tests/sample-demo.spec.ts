import { test, expect } from '../fixtures/editor.fixture'
import {
  SAMPLE_ARTWORK_FAILURE,
  SAMPLE_DESKTOP_VIEWPORTS,
  SAMPLE_EXPORT,
  SAMPLE_MOBILE_VIEWPORT
} from '../fixtures/data/sample-demo.data'

test.use({ editorDemoMode: 'sample', editorInitOptions: { fonts: [] } })

for (const viewport of SAMPLE_DESKTOP_VIEWPORTS) {
  test.describe(`Экран шириной ${viewport.width}`, () => {
    test.use({ viewport })

    test(`образец показывает основные действия без внешних ресурсов при ширине ${viewport.width}`, async({ sampleDemo }) => {
      for (const action of sampleDemo.primaryActions) {
        await expect(action).toBeInViewport()
      }
      expect(await sampleDemo.hasHorizontalOverflow()).toBe(false)
      expect((await sampleDemo.getScene()).sampleIds).toHaveLength(4)
      expect(sampleDemo.getExternalRequests()).toEqual([])
      expect(sampleDemo.pageErrors).toEqual([])
    })
  })
}

test('изменённый образец сохраняется в PNG после кадрирования, отмены и повтора', async({
  sampleDemo, crop, history, images, page
}, testInfo) => {
  await test.step('Изменить заголовок через поле образца', async() => {
    await sampleDemo.headline.fill('Sunday Makers')
    await expect.poll(async() => (await sampleDemo.getScene()).headline).toBe('Sunday Makers')
  })
  const before = await sampleDemo.getScene()
  const beforeHistory = await history.getPosition()
  expect(beforeHistory.currentIndex).toBeGreaterThan(0)

  await test.step('Переместить рамку мышью и применить кадрирование', async() => {
    await sampleDemo.crop.click()
    const initialCrop = await crop.getState()
    await crop.dragFrameByMouse({ deltaX: 18, deltaY: 10 })
    expect((await crop.getState())?.rect).not.toEqual(initialCrop?.rect)
    await sampleDemo.applyCrop.click()
    await sampleDemo.waitForReady()
  })
  const applied = await sampleDemo.getScene()
  expect(applied.image.width).toBeLessThan(before.image.width)
  expect(applied.image.height).toBeLessThan(before.image.height)
  expect((await history.getPosition()).currentIndex).toBe(beforeHistory.currentIndex + 1)

  await test.step('Отменить и повторить кадрирование кнопками образца', async() => {
    await sampleDemo.undo.click()
    await expect(sampleDemo.redo).toBeEnabled()
    expect((await sampleDemo.getScene()).image).toEqual(before.image)
    await sampleDemo.redo.click()
    await sampleDemo.waitForReady()
    expect((await sampleDemo.getScene()).image).toEqual(applied.image)
  })

  await test.step('Скачать настоящий PNG и проверить размер и пиксели', async() => {
    const downloaded = await sampleDemo.downloadPng()
    expect(downloaded.fileName).toBe(SAMPLE_EXPORT.fileName)
    expect(downloaded.body.subarray(0, 8).toString('hex')).toBe(SAMPLE_EXPORT.signature)
    const { dataUrl } = downloaded
    expect(await images.getDataUrlSize({ dataUrl })).toEqual(SAMPLE_EXPORT.size)
    const background = await images.getDataUrlPixelColor({ dataUrl, ...SAMPLE_EXPORT.backgroundPoint })
    const artwork = await images.getDataUrlPixelColor({ dataUrl, ...SAMPLE_EXPORT.artworkPoint })
    expect(background).toEqual(SAMPLE_EXPORT.background)
    expect(artwork.alpha).toBe(255)
    expect(artwork).not.toEqual(background)
    await testInfo.attach('exported-poster.png', { body: downloaded.body, contentType: 'image/png' })
    await testInfo.attach('completed-sample.png', { body: await page.screenshot(), contentType: 'image/png' })
  })
})

test('отмена кадрирования и повторный сброс сохраняют исходный образец и историю', async({
  sampleDemo, crop, history
}, testInfo) => {
  const before = await sampleDemo.getScene()
  const beforeHistory = await history.getPosition()
  const originalPixels = await sampleDemo.canvas.screenshot()

  await test.step('Отменить перемещённую рамку без записи в историю', async() => {
    await sampleDemo.crop.click()
    await crop.dragFrameByMouse({ deltaX: 18, deltaY: 10 })
    await sampleDemo.cancelCrop.click()
    await sampleDemo.waitForReady()
    expect(await sampleDemo.getScene()).toEqual(before)
    expect(await history.getPosition()).toEqual(beforeHistory)
    expect(await crop.getState()).toBeNull()
    await expect(sampleDemo.cropToolbar).toBeHidden()
  })

  await test.step('Дважды сбросить образец во время кадрирования', async() => {
    await sampleDemo.crop.click()
    await sampleDemo.reset.dblclick()
    await sampleDemo.waitForReady()
    expect(await sampleDemo.getScene()).toEqual(before)
    expect(await history.getPosition()).toEqual(beforeHistory)
    expect(await crop.getState()).toBeNull()
    await expect(sampleDemo.canvas).toHaveCount(1)
    expect(await sampleDemo.canvas.screenshot()).toEqual(originalPixels)
  })
  await testInfo.attach('sample-baseline.png', { body: originalPixels, contentType: 'image/png' })
})

test.describe('Недоступная иллюстрация', () => {
  test.use({ editorRouteMocks: [SAMPLE_ARTWORK_FAILURE], editorWaitForReady: false })

  test('после ошибки загрузки сброс восстанавливает образец без дубликатов', async({ sampleDemo, history }) => {
    await expect(sampleDemo.status).toContainText('could not load')
    await expect(sampleDemo.root).toHaveAttribute('aria-busy', 'false')
    await expect(sampleDemo.exportPng).toBeDisabled()
    await sampleDemo.restoreArtwork()
    await sampleDemo.reset.click()
    await sampleDemo.waitForReady()
    expect((await sampleDemo.getScene()).sampleIds).toHaveLength(4)
    expect((await history.getPosition()).currentIndex).toBe(0)
  })
})

test('пустой результат и ошибка экспорта снимают блокировку и позволяют повторить скачивание', async({ sampleDemo }) => {
  await sampleDemo.failNextExports()
  for (const failure of ['пустого результата', 'ошибки экспорта']) {
    await test.step(`Проверить доступность действий после ${failure}`, async() => {
      await sampleDemo.exportPng.click()
      await expect(sampleDemo.status).toContainText('could not finish')
      await expect(sampleDemo.exportPng).toBeEnabled()
      await expect(sampleDemo.root).toHaveAttribute('aria-busy', 'false')
    })
  }
  const downloaded = await sampleDemo.downloadPng()
  expect(downloaded.body.byteLength).toBeGreaterThan(0)
})

test('повторный сброс дожидается медленной загрузки и оставляет только последний образец', async({ sampleDemo, history }) => {
  await sampleDemo.holdNextArtwork()
  await test.step('Повторить сброс, пока первая загрузка удерживается', async() => {
    await sampleDemo.reset.click()
    await expect.poll(() => sampleDemo.artworkRequests).toBe(1)
    await sampleDemo.reset.click()
    await expect(sampleDemo.exportPng).toBeDisabled()
  })
  await test.step('Завершить загрузку и проверить единственный исходный образец', async() => {
    sampleDemo.releaseHeldArtwork()
    await sampleDemo.waitForReady()
    expect(sampleDemo.artworkRequests).toBe(2)
    const restored = await sampleDemo.getScene()
    expect(restored.sampleIds).toHaveLength(4)
    expect(new Set(restored.sampleIds).size).toBe(4)
    expect((await history.getPosition()).currentIndex).toBe(0)
    await expect(sampleDemo.canvas).toHaveCount(1)
  })
})

test.describe('Узкий экран', () => {
  test.use({ viewport: SAMPLE_MOBILE_VIEWPORT })

  test('образец помещается на узком экране и открывает пустую расширенную площадку', async({ sampleDemo, editorModel, page }) => {
    expect(await sampleDemo.hasHorizontalOverflow()).toBe(false)
    await expect(sampleDemo.exportPng).toBeVisible()
    await expect(sampleDemo.host).toBeVisible()
    await sampleDemo.advancedLink.click()
    await expect(page).toHaveURL(/\?mode=playground$/)
    await expect(sampleDemo.playground).toBeVisible()
    await expect(sampleDemo.root).toBeHidden()
    await expect(sampleDemo.chooseImages).toBeVisible()
    await editorModel.waitForReady()
    expect(await editorModel.getObjects()).toHaveLength(0)
  })
})
