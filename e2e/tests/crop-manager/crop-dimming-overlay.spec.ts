import { test, expect } from '../../fixtures/editor.fixture'

/** Непрозрачный фон для контрастной проверки затемнения внутри montage area. */
const CROP_DIMMING_BACKGROUND_COLOR = '#ffffff'

/** Маленькая crop-область, оставляющая достаточно места для затемнённой области. */
const SMALL_CROP_SIZE = {
  width: 180,
  height: 180
}

/** Угол поворота image crop для проверки геометрии маски. */
const ROTATED_IMAGE_ANGLE = 27

test.describe('Затемнение вне crop-области', () => {
  test('по умолчанию затемняет область внутри и за пределами montage area', async({
    background,
    crop
  }) => {
    await test.step('Подготовить непрозрачный фон монтажной области', async() => {
      await background.setColor({ color: CROP_DIMMING_BACKGROUND_COLOR })
    })

    const state = await test.step('Войти в crop с областью меньше монтажной', async() => {
      return crop.startCanvasCrop({
        size: SMALL_CROP_SIZE,
        showGrid: false
      })
    })

    const controlCursor = await test.step('Навести курсор на resize control поверх затемнения', async() => {
      return crop.frameControls.getControlCursor({ control: 'br' })
    })

    const dimming = await test.step('Считать пиксели затемнения active crop mode', async() => {
      return crop.dimmingOverlay.getSnapshot()
    })

    await test.step('Проверить hole внутри crop и чёрный слой 25% на всём canvas', () => {
      const {
        insideFrame,
        outsideFrame,
        outsideMontage
      } = dimming

      expect(state.options.showDimmedArea).toBe(true)
      expect(dimming.hasOverlayImage).toBe(true)
      expect(dimming.overlayVpt).toBe(false)
      expect(dimming.controlsAboveOverlay).toBe(true)
      expect(controlCursor).not.toBe('not-allowed')
      expect(controlCursor).not.toBe('')
      expect(insideFrame, 'должен читаться пиксель внутри crop-области').not.toBeNull()
      expect(outsideFrame, 'должен читаться пиксель вне crop-области').not.toBeNull()

      if (!insideFrame || !outsideFrame) {
        throw new Error('Не удалось сравнить пиксели внутри и вне crop-области')
      }

      expect(insideFrame.red).toBeGreaterThan(outsideFrame.red + 40)
      expect(insideFrame.green).toBeGreaterThan(outsideFrame.green + 40)
      expect(outsideFrame.alpha).toBe(255)
      expect(outsideMontage.red).toBe(0)
      expect(outsideMontage.green).toBe(0)
      expect(outsideMontage.blue).toBe(0)
      expect(outsideMontage.alpha).toBeGreaterThanOrEqual(63)
      expect(outsideMontage.alpha).toBeLessThanOrEqual(64)
    })

    await crop.cancel()
  })

  test('сохраняет hole после zoom, pan и поворота crop-изображения', async({
    background,
    crop,
    editorModel,
    images
  }) => {
    await test.step('Подготовить непрозрачный фон монтажной области', async() => {
      await background.setColor({ color: CROP_DIMMING_BACKGROUND_COLOR })
    })

    const image = await test.step('Добавить изображение для повёрнутого crop', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 360,
          height: 220,
          fill: CROP_DIMMING_BACKGROUND_COLOR
        })
      })
    })

    await test.step('Повернуть изображение через публичный TransformManager', async() => {
      await images.setAngle({
        id: image.id,
        angle: ROTATED_IMAGE_ANGLE
      })
    })

    const cropState = await test.step('Войти в crop повёрнутого изображения', async() => {
      return crop.startImageCrop({
        id: image.id,
        size: {
          width: 140,
          height: 100
        },
        showGrid: false
      })
    })

    const viewportBefore = await test.step('Считать viewport до zoom и pan', async() => {
      return editorModel.getCanvasViewportTransform()
    })

    await test.step('Приблизить canvas до доступного pan', async() => {
      await editorModel.zoomInUntilViewportCanMove()
    })

    await test.step('Сдвинуть viewport реальным Space + ЛКМ drag', async() => {
      await editorModel.dragViewportBySpaceMouse({
        deltaX: -80,
        deltaY: 60
      })
    })

    const viewportAfter = await test.step('Считать viewport после zoom и pan', async() => {
      return editorModel.getCanvasViewportTransform()
    })

    const dimming = await test.step('Считать маску после изменения viewport', async() => {
      return crop.dimmingOverlay.getSnapshot()
    })

    await test.step('Проверить что mask-hole остался на повёрнутой crop-области', () => {
      const {
        insideFrame,
        outsideFrame
      } = dimming

      expect(cropState.frame.angle).toBeCloseTo(ROTATED_IMAGE_ANGLE, 3)
      expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
      expect(viewportAfter.x).not.toBe(viewportBefore.x)
      expect(viewportAfter.y).not.toBe(viewportBefore.y)
      expect(insideFrame, 'должен читаться пиксель внутри повёрнутой crop-области').not.toBeNull()
      expect(outsideFrame, 'должен читаться пиксель вне повёрнутой crop-области').not.toBeNull()

      if (!insideFrame || !outsideFrame) {
        throw new Error('Не удалось проверить маску после zoom и pan')
      }

      expect(insideFrame.red).toBeGreaterThan(outsideFrame.red + 40)
      expect(insideFrame.green).toBeGreaterThan(outsideFrame.green + 40)
    })

    await crop.cancel()
  })

  test('не добавляет transient overlay в экспорт и историю', async({
    background,
    crop,
    history,
    images
  }) => {
    await test.step('Подготовить непрозрачный фон и сохранённое history-состояние', async() => {
      await background.setColor({ color: CROP_DIMMING_BACKGROUND_COLOR })
      await history.saveState()
    })

    const historyBefore = await test.step('Считать history до входа в crop mode', async() => {
      return history.getSerializedStateText()
    })

    const exportBefore = await test.step('Экспортировать montage area до входа в crop mode', async() => {
      return images.exportCanvasAsBase64()
    })

    await test.step('Войти в crop с затемнением', async() => {
      await crop.startCanvasCrop({
        size: SMALL_CROP_SIZE,
        showGrid: false
      })
    })

    const historyDuringCrop = await test.step('Считать history во время crop mode', async() => {
      return history.getSerializedStateText()
    })

    const exportDuringCrop = await test.step('Экспортировать montage area во время crop mode', async() => {
      return images.exportCanvasAsBase64()
    })

    const exportedBefore = await test.step('Прочитать пиксель исходного экспорта', async() => {
      return images.getDataUrlPixelColor({
        dataUrl: exportBefore,
        x: 10,
        y: 10
      })
    })

    const exportedDuringCrop = await test.step('Прочитать пиксель экспорта во время crop mode', async() => {
      return images.getDataUrlPixelColor({
        dataUrl: exportDuringCrop,
        x: 10,
        y: 10
      })
    })

    await test.step('Проверить что transient overlay не попал в сохранённые данные', () => {
      expect(historyDuringCrop).toBe(historyBefore)
      expect(exportedDuringCrop).toEqual(exportedBefore)
      expect(exportedDuringCrop.red).toBe(255)
      expect(exportedDuringCrop.green).toBe(255)
      expect(exportedDuringCrop.blue).toBe(255)
      expect(exportedDuringCrop.alpha).toBe(255)
    })

    await crop.cancel()
  })

  test('не создаёт затемнение при showDimmedArea: false', async({ crop }) => {
    const baseline = await test.step('Считать canvas до входа в crop mode', async() => {
      return crop.dimmingOverlay.getSnapshot()
    })

    const state = await test.step('Войти в crop с выключенным затемнением', async() => {
      return crop.startCanvasCrop({
        size: SMALL_CROP_SIZE,
        showDimmedArea: false
      })
    })

    const dimming = await test.step('Считать canvas при выключенном затемнении', async() => {
      return crop.dimmingOverlay.getSnapshot()
    })

    await test.step('Проверить отсутствие overlay и неизменный пиксель вне montage area', () => {
      expect(state.options.showDimmedArea).toBe(false)
      expect(dimming.hasOverlayImage).toBe(false)
      expect(dimming.outsideMontage).toEqual(baseline.outsideMontage)
      expect(dimming.overlayVpt).toBe(baseline.overlayVpt)
      expect(dimming.controlsAboveOverlay).toBe(baseline.controlsAboveOverlay)
    })

    await crop.cancel()
  })

  test('во время move и resize hole следует за crop-областью', async({
    background,
    crop
  }) => {
    await test.step('Подготовить непрозрачный фон монтажной области', async() => {
      await background.setColor({ color: CROP_DIMMING_BACKGROUND_COLOR })
    })

    const initialState = await test.step('Войти в crop с маленькой областью', async() => {
      return crop.startCanvasCrop({
        size: SMALL_CROP_SIZE,
        showGrid: false
      })
    })

    const movedState = await test.step('Передвинуть crop-область через live drag', async() => {
      return crop.dragFrameByOffset({
        deltaX: 140,
        deltaY: 0
      })
    })

    const movedDimming = await test.step('Считать маску во время move', async() => {
      return crop.dimmingOverlay.getSnapshot()
    })

    await test.step('Проверить что hole переместился вместе с crop-областью', () => {
      const {
        insideFrame,
        outsideFrame
      } = movedDimming

      expect(movedState.rect.left).toBeGreaterThan(initialState.rect.left)
      expect(insideFrame, 'должен читаться пиксель внутри перемещённой crop-области').not.toBeNull()
      expect(outsideFrame, 'должен читаться пиксель вне перемещённой crop-области').not.toBeNull()

      if (!insideFrame || !outsideFrame) {
        throw new Error('Не удалось проверить маску во время move crop-области')
      }

      expect(insideFrame.red).toBeGreaterThan(outsideFrame.red + 40)
      expect(insideFrame.green).toBeGreaterThan(outsideFrame.green + 40)
    })

    await test.step('Завершить live move', async() => {
      await crop.finishFrameMove()
    })

    const resizedState = await test.step('Растянуть crop-область через live resize', async() => {
      return crop.dragFrameFromControlToSize({
        control: 'br',
        size: {
          width: 400,
          height: 400
        }
      })
    })

    const resizedDimming = await test.step('Считать маску во время resize', async() => {
      return crop.dimmingOverlay.getSnapshot()
    })

    await test.step('Проверить что hole изменил размер вместе с crop-областью', () => {
      const {
        insideFrame,
        outsideFrame
      } = resizedDimming

      expect(resizedState.rect.width).toBeGreaterThan(movedState.rect.width)
      expect(insideFrame, 'должен читаться пиксель внутри растянутой crop-области').not.toBeNull()
      expect(outsideFrame, 'должен читаться пиксель вне растянутой crop-области').not.toBeNull()

      if (!insideFrame || !outsideFrame) {
        throw new Error('Не удалось проверить маску во время resize crop-области')
      }

      expect(insideFrame.red).toBeGreaterThan(outsideFrame.red + 40)
      expect(insideFrame.green).toBeGreaterThan(outsideFrame.green + 40)
    })

    await test.step('Завершить live resize и отменить crop', async() => {
      await crop.finishFrameResize()
      await crop.cancel()
    })
  })

  test('после cancel восстанавливает canvas без transient overlay', async({ crop }) => {
    const baseline = await test.step('Считать исходное состояние canvas', async() => {
      return crop.dimmingOverlay.getSnapshot()
    })

    await test.step('Войти в crop с затемнением', async() => {
      await crop.startCanvasCrop({ size: SMALL_CROP_SIZE })
    })

    const activeDimming = await test.step('Проверить что overlay появился в active crop mode', async() => {
      return crop.dimmingOverlay.getSnapshot()
    })

    await test.step('Отменить crop mode', async() => {
      await crop.cancel()
    })

    const restored = await test.step('Считать canvas после cancel', async() => {
      return crop.dimmingOverlay.getSnapshot()
    })

    await test.step('Проверить восстановление canvas-полей и пикселя вне montage area', () => {
      expect(activeDimming.hasOverlayImage).toBe(true)
      expect(restored.hasOverlayImage).toBe(baseline.hasOverlayImage)
      expect(restored.overlayVpt).toBe(baseline.overlayVpt)
      expect(restored.controlsAboveOverlay).toBe(baseline.controlsAboveOverlay)
      expect(restored.insideFrame).toBeNull()
      expect(restored.outsideFrame).toBeNull()
      expect(restored.outsideMontage).toEqual(baseline.outsideMontage)
    })
  })
})
