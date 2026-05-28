import { test, expect } from '../../fixtures/editor.fixture'
import {
  CROP_CORNER_CASES,
  CROP_MAX_SIZE,
  CROP_MIN_SIZE,
  CROP_RESIZE_CASES,
  CROP_SIDE_CASES
} from '../../fixtures/data/crop.data'

test.describe('Crop mode', () => {
  test('resize из правого нижнего угла сохраняет пропорции без Shift', async({ crop }) => {
    const initialState = await test.step('Войти в crop монтажной области', async() => {
      return crop.startCanvasCrop()
    })

    const resizedState = await test.step('Потянуть область из правого нижнего угла без Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 1.45,
        heightRatio: 1.15
      })
    })

    await test.step('Проверить что область выросла пропорционально', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = resizedState.rect.width / resizedState.rect.height

      expect(resizedState.rect.width).toBeGreaterThan(initialState.rect.width)
      expect(resizedState.rect.height).toBeGreaterThan(initialState.rect.height)
      expect(resizedRatio).toBeCloseTo(initialRatio, 1)
    })
  })

  test('resize из левого верхнего угла с Shift меняет стороны независимо', async({ crop }) => {
    const initialState = await test.step('Войти в crop монтажной области', async() => {
      return crop.startCanvasCrop()
    })

    const resizedState = await test.step('Потянуть область из левого верхнего угла с Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'tl',
        widthRatio: 1.45,
        heightRatio: 1.1,
        shiftKey: true
      })
    })

    await test.step('Проверить что пропорция изменилась', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = resizedState.rect.width / resizedState.rect.height

      expect(resizedState.rect.width).toBeGreaterThan(initialState.rect.width)
      expect(resizedState.rect.height).toBeGreaterThan(initialState.rect.height)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })
  })

  test('resize правой стороны сохраняет пропорции без Shift и снимает ограничение с Shift', async({ crop }) => {
    const initialState = await test.step('Войти в crop с квадратной областью', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    const preservedState = await test.step('Потянуть область за правую сторону без Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'mr',
        widthRatio: 0.72,
        heightRatio: 1
      })
    })

    await test.step('Проверить что при resize правой стороны пропорции остались прежними', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(preservedState.rect.width).toBeLessThan(initialState.rect.width)
      expect(preservedState.rect.height).toBeLessThan(initialState.rect.height)
      expect(resizedRatio).toBeCloseTo(initialRatio, 1)
    })

    await crop.cancel()

    const restartedState = await test.step('Снова войти в crop с квадратной областью', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    const freeResizeState = await test.step('Потянуть область за правую сторону с Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'mr',
        widthRatio: 0.72,
        heightRatio: 1,
        shiftKey: true
      })
    })

    await test.step('Проверить что Shift снимает ограничение и пропорции меняются свободно', async() => {
      const initialRatio = restartedState.rect.width / restartedState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(freeResizeState.rect.width).toBeLessThan(restartedState.rect.width)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })
  })

  test('resize верхней стороны сохраняет пропорции без Shift', async({ crop }) => {
    const initialState = await test.step('Войти в crop с квадратной областью', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    const preservedState = await test.step('Потянуть область за верхнюю сторону без Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'mt',
        widthRatio: 1,
        heightRatio: 0.72
      })
    })

    await test.step('Проверить что при resize верхней стороны пропорции остались прежними', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(preservedState.rect.width).toBeLessThan(initialState.rect.width)
      expect(preservedState.rect.height).toBeLessThan(initialState.rect.height)
      expect(resizedRatio).toBeCloseTo(initialRatio, 1)
    })
  })

  test('resize левой стороны сохраняет пропорции без Shift и снимает ограничение с Shift', async({ crop }) => {
    const initialState = await test.step('Войти в crop с квадратной областью', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    const preservedState = await test.step('Потянуть область за левую сторону без Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'ml',
        widthRatio: 0.72,
        heightRatio: 1
      })
    })

    await test.step('Проверить что при resize левой стороны пропорции остались прежними', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(preservedState.rect.width).toBeLessThan(initialState.rect.width)
      expect(preservedState.rect.height).toBeLessThan(initialState.rect.height)
      expect(resizedRatio).toBeCloseTo(initialRatio, 1)
    })

    await crop.cancel()

    const restartedState = await test.step('Снова войти в crop с квадратной областью', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    const freeResizeState = await test.step('Потянуть область за левую сторону с Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'ml',
        widthRatio: 0.72,
        heightRatio: 1,
        shiftKey: true
      })
    })

    await test.step('Проверить что Shift снимает ограничение и оставляет высоту без изменений', async() => {
      const initialRatio = restartedState.rect.width / restartedState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(freeResizeState.rect.width).toBeLessThan(restartedState.rect.width)
      expect(freeResizeState.rect.height).toBeCloseTo(restartedState.rect.height, 3)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })
  })

  test('resize нижней стороны сохраняет пропорции без Shift и снимает ограничение с Shift', async({ crop }) => {
    const initialState = await test.step('Войти в crop с квадратной областью', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    const preservedState = await test.step('Потянуть область за нижнюю сторону без Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'mb',
        widthRatio: 1,
        heightRatio: 0.72
      })
    })

    await test.step('Проверить что при resize нижней стороны пропорции остались прежними', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(preservedState.rect.width).toBeLessThan(initialState.rect.width)
      expect(preservedState.rect.height).toBeLessThan(initialState.rect.height)
      expect(resizedRatio).toBeCloseTo(initialRatio, 1)
    })

    await crop.cancel()

    const restartedState = await test.step('Снова войти в crop с квадратной областью', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    const freeResizeState = await test.step('Потянуть область за нижнюю сторону с Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'mb',
        widthRatio: 1,
        heightRatio: 0.72,
        shiftKey: true
      })
    })

    await test.step('Проверить что Shift снимает ограничение и оставляет ширину без изменений', async() => {
      const initialRatio = restartedState.rect.width / restartedState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(freeResizeState.rect.width).toBeCloseTo(restartedState.rect.width, 3)
      expect(freeResizeState.rect.height).toBeLessThan(restartedState.rect.height)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })
  })

  CROP_SIDE_CASES.forEach(({ control, title }) => {
    test(`при hover ${title} курсор не меняется от Shift в обоих режимах preserveAspectRatio`, async({ crop }) => {
      await test.step('Войти в crop с квадратной областью', async() => {
        await crop.startCanvasCrop({
          aspectRatio: {
            width: 1,
            height: 1
          }
        })
      })

      const baseCursor = await test.step('Навести курсор на side-control без Shift', async() => {
        return crop.getFrameControlCursor({ control })
      })

      const shiftedCursor = await test.step('Зажать Shift и повторно навести курсор на тот же control', async() => {
        return crop.getFrameControlCursor({
          control,
          shiftKey: true
        })
      })

      await test.step('Проверить что при preserveAspectRatio = true курсор остался resize', async() => {
        expect(baseCursor).not.toBe('not-allowed')
        expect(shiftedCursor).toBe(baseCursor)
      })

      const unlockedState = await test.step('Отключить preserveAspectRatio у активной crop-области', async() => {
        return crop.setPreserveAspectRatio({
          preserveAspectRatio: false
        })
      })

      await test.step('Проверить что публичное состояние отражает отключённый режим', async() => {
        expect(unlockedState.options.preserveAspectRatio).toBe(false)
        expect(unlockedState.rect.width / unlockedState.rect.height).toBeCloseTo(1, 3)
      })

      const freeBaseCursor = await test.step('Навести курсор на side-control без Shift при preserveAspectRatio = false', async() => {
        return crop.getFrameControlCursor({ control })
      })

      const freeShiftedCursor = await test.step(
        'Зажать Shift и повторно навести курсор на тот же control при preserveAspectRatio = false',
        async() => {
          return crop.getFrameControlCursor({
            control,
            shiftKey: true
          })
        }
      )

      await test.step('Проверить что при preserveAspectRatio = false курсор тоже остался resize', async() => {
        expect(freeBaseCursor).not.toBe('not-allowed')
        expect(freeShiftedCursor).toBe(freeBaseCursor)
      })
    })
  })

  test('при старте crop mode можно отключить сохранение пропорций у resize правой стороны', async({ crop }) => {
    const initialState = await test.step('Войти в crop с квадратной областью и отключённым сохранением пропорций', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        },
        preserveAspectRatio: false
      })
    })

    await test.step('Проверить что публичное состояние отражает отключённый режим', async() => {
      expect(initialState.options.preserveAspectRatio).toBe(false)
      expect(initialState.rect.width / initialState.rect.height).toBeCloseTo(1, 3)
    })

    const freeResizeState = await test.step('Потянуть область за правую сторону без Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'mr',
        widthRatio: 0.72,
        heightRatio: 1
      })
    })

    await test.step('Проверить что без Shift правая сторона меняет только ширину', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(freeResizeState.rect.width).toBeLessThan(initialState.rect.width)
      expect(freeResizeState.rect.height).toBeCloseTo(initialState.rect.height, 3)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })

    await crop.cancel()

    const restartedState = await test.step('Снова войти в crop с тем же флагом для проверки Shift', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        },
        preserveAspectRatio: false
      })
    })

    const preservedState = await test.step('Потянуть область за правую сторону с Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'mr',
        widthRatio: 0.72,
        heightRatio: 1,
        shiftKey: true
      })
    })

    await test.step('Проверить что Shift возвращает сохранение пропорций и меняет обе оси', async() => {
      const initialRatio = restartedState.rect.width / restartedState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(preservedState.rect.width).toBeLessThan(restartedState.rect.width)
      expect(preservedState.rect.height).toBeLessThan(restartedState.rect.height)
      expect(resizedRatio).toBeCloseTo(initialRatio, 1)
    })
  })

  test('уже активной crop-области можно переключить сохранение пропорций у resize верхней стороны', async({ crop }) => {
    const initialState = await test.step('Войти в crop с квадратной областью', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    await test.step('Проверить что по умолчанию режим сохранения пропорций включён', async() => {
      expect(initialState.options.preserveAspectRatio).toBe(true)
      expect(initialState.rect.width / initialState.rect.height).toBeCloseTo(1, 3)
    })

    const unlockedState = await test.step('Отключить сохранение пропорций у уже активной области', async() => {
      return crop.setPreserveAspectRatio({
        preserveAspectRatio: false
      })
    })

    await test.step('Проверить что новый режим виден через публичное состояние', async() => {
      expect(unlockedState.options.preserveAspectRatio).toBe(false)
      expect(unlockedState.rect.width / unlockedState.rect.height).toBeCloseTo(1, 3)
    })

    const freeResizeState = await test.step('Потянуть область за верхнюю сторону без Shift после переключения режима', async() => {
      return crop.resizeFrameFromControl({
        control: 'mt',
        widthRatio: 1,
        heightRatio: 0.72
      })
    })

    await test.step('Проверить что без Shift верхняя сторона меняет только высоту', async() => {
      const initialRatio = unlockedState.rect.width / unlockedState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(freeResizeState.rect.width).toBeCloseTo(unlockedState.rect.width, 3)
      expect(freeResizeState.rect.height).toBeLessThan(unlockedState.rect.height)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })

    const relockedState = await test.step('Снова включить сохранение пропорций у уже активной области', async() => {
      return crop.setPreserveAspectRatio({
        preserveAspectRatio: true
      })
    })

    const preservedState = await test.step('Потянуть область за верхнюю сторону без Shift после обратного переключения', async() => {
      return crop.resizeFrameFromControl({
        control: 'mt',
        widthRatio: 1,
        heightRatio: 0.72
      })
    })

    await test.step('Проверить что после обратного переключения верхняя сторона снова сохраняет пропорции', async() => {
      const relockedRatio = relockedState.rect.width / relockedState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(preservedState.rect.width).toBeLessThan(relockedState.rect.width)
      expect(preservedState.rect.height).toBeLessThan(relockedState.rect.height)
      expect(resizedRatio).toBeCloseTo(relockedRatio, 1)
    })
  })

  test('при старте crop mode можно отключить сохранение пропорций у resize из угла', async({ crop }) => {
    const initialState = await test.step('Войти в crop с квадратной областью и отключённым сохранением пропорций', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        },
        preserveAspectRatio: false
      })
    })

    await test.step('Проверить что публичное состояние отражает отключённый режим', async() => {
      expect(initialState.options.preserveAspectRatio).toBe(false)
      expect(initialState.rect.width / initialState.rect.height).toBeCloseTo(1, 3)
    })

    const freeResizeState = await test.step('Потянуть область из угла без Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 1.45,
        heightRatio: 1.1
      })
    })

    await test.step('Проверить что без Shift пропорции больше не фиксируются', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(freeResizeState.rect.width).toBeGreaterThan(initialState.rect.width)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })

    await crop.cancel()

    const restartedState = await test.step('Снова войти в crop с тем же флагом для проверки Shift', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        },
        preserveAspectRatio: false
      })
    })

    const preservedState = await test.step('Потянуть область из угла с Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 1.45,
        heightRatio: 1.1,
        shiftKey: true
      })
    })

    await test.step('Проверить что Shift инвертирует режим и возвращает сохранение пропорций', async() => {
      const initialRatio = restartedState.rect.width / restartedState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(preservedState.rect.width).toBeGreaterThan(restartedState.rect.width)
      expect(resizedRatio).toBeCloseTo(initialRatio, 1)
    })
  })

  test('уже активной crop-области можно переключить сохранение пропорций у resize из угла', async({ crop }) => {
    const initialState = await test.step('Войти в crop с квадратной областью', async() => {
      return crop.startCanvasCrop({
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    await test.step('Проверить что по умолчанию режим сохранения пропорций включён', async() => {
      expect(initialState.options.preserveAspectRatio).toBe(true)
      expect(initialState.rect.width / initialState.rect.height).toBeCloseTo(1, 3)
    })

    const unlockedState = await test.step('Отключить сохранение пропорций и выбрать пользовательские пропорции', async() => {
      await crop.setPreserveAspectRatio({
        preserveAspectRatio: false
      })

      return crop.setAspectRatio({
        width: 5,
        height: 4
      })
    })

    await test.step('Проверить что новый режим виден через публичное состояние', async() => {
      expect(unlockedState.options.preserveAspectRatio).toBe(false)
      expect(unlockedState.rect.width / unlockedState.rect.height).toBeCloseTo(1.25, 1)
    })

    const freeResizeState = await test.step('Потянуть область из угла без Shift после переключения режима', async() => {
      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 1.4,
        heightRatio: 1.1
      })
    })

    await test.step('Проверить что без Shift пропорции меняются свободно', async() => {
      const initialRatio = unlockedState.rect.width / unlockedState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(freeResizeState.rect.width).toBeGreaterThan(unlockedState.rect.width)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })

    const relockedState = await test.step('Снова включить сохранение пропорций у уже активной области', async() => {
      return crop.setPreserveAspectRatio({
        preserveAspectRatio: true
      })
    })

    const preservedState = await test.step('Потянуть область из угла без Shift после обратного переключения', async() => {
      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 1.25,
        heightRatio: 1.05
      })
    })

    await test.step('Проверить что после обратного переключения пропорции снова фиксируются', async() => {
      const relockedRatio = relockedState.rect.width / relockedState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(relockedState.options.preserveAspectRatio).toBe(true)
      expect(resizedRatio).toBeCloseTo(relockedRatio, 1)
    })
  })

  test('resize из правого нижнего угла не выпускает crop-область за максимальный размер', async({
    editorModel,
    crop
  }) => {
    const resizedState = await test.step('Войти в crop и резко увеличить область', async() => {
      await crop.startCanvasCrop()

      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 20,
        heightRatio: 20
      })
    })

    await test.step('Проверить что live-размер ограничен максимумом', async() => {
      expect(resizedState.rect.width).toBe(CROP_MAX_SIZE.width)
      expect(resizedState.rect.height).toBe(CROP_MAX_SIZE.height)
    })

    await test.step('Применить crop и проверить что размер не меняется повторно', async() => {
      await crop.apply()

      const montageAfter = await editorModel.getMontageArea()

      expect(montageAfter.width).toBe(CROP_MAX_SIZE.width)
      expect(montageAfter.height).toBe(CROP_MAX_SIZE.height)
    })
  })

  CROP_CORNER_CASES.forEach(({ control, title }) => {
    test(`resize из ${title} не уменьшает crop-область меньше 16 px`, async({ crop }) => {
      const resizedState = await test.step('Войти в crop и резко уменьшить область', async() => {
        await crop.startCanvasCrop()

        return crop.resizeFrameFromControl({
          control,
          widthRatio: 0.001,
          heightRatio: 0.001
        })
      })

      await test.step('Проверить что live-размер остановился на минимуме', async() => {
        expect(resizedState.rect.width).toBe(CROP_MIN_SIZE.width)
        expect(resizedState.rect.height).toBe(CROP_MIN_SIZE.height)
      })
    })
  })

  CROP_SIDE_CASES.forEach(({ control, title }) => {
    test(`resize ${title} не выпускает crop-область за лимиты`, async({ crop }) => {
      const enlargedState = await test.step('Войти в crop и резко увеличить область', async() => {
        await crop.startCanvasCrop()

        return crop.resizeFrameFromControl({
          control,
          widthRatio: control === 'ml' || control === 'mr' ? 20 : 1,
          heightRatio: control === 'mt' || control === 'mb' ? 20 : 1
        })
      })

      await test.step('Проверить что live-размер ограничен максимумом с сохранением пропорций', async() => {
        expect(enlargedState.rect.width).toBe(CROP_MAX_SIZE.width)
        expect(enlargedState.rect.height).toBe(CROP_MAX_SIZE.height)
      })

      const shrunkState = await test.step('Снова войти в crop и резко уменьшить область', async() => {
        await crop.cancel()
        await crop.startCanvasCrop()

        return crop.resizeFrameFromControl({
          control,
          widthRatio: control === 'ml' || control === 'mr' ? 0.001 : 1,
          heightRatio: control === 'mt' || control === 'mb' ? 0.001 : 1
        })
      })

      await test.step('Проверить что live-размер остановился на минимуме с сохранением пропорций', async() => {
        expect(shrunkState.rect.width).toBe(CROP_MIN_SIZE.width)
        expect(shrunkState.rect.height).toBe(CROP_MIN_SIZE.height)
      })
    })
  })

  CROP_RESIZE_CASES.forEach(({ control, title }) => {
    test(`быстрый resize из ${title} через противоположную сторону останавливается на 16 px`, async({ crop }) => {
      const resizedState = await test.step('Войти в crop и резко провести pointer за противоположную сторону', async() => {
        await crop.startCanvasCrop()

        return crop.resizeFrameFromControl({
          control,
          widthRatio: -0.25,
          heightRatio: -0.25
        })
      })

      await test.step('Проверить что crop-область зафиксировалась на минимальном размере', async() => {
        expect(resizedState.rect.width).toBe(CROP_MIN_SIZE.width)
        expect(resizedState.rect.height).toBe(CROP_MIN_SIZE.height)
      })
    })
  })

  test('resize с Shift останавливает только сторону, которая дошла до 16 px', async({ crop }) => {
    const initialState = await test.step('Войти в crop монтажной области', async() => {
      return crop.startCanvasCrop()
    })

    const resizedState = await test.step('Сильно сузить область по X и умеренно уменьшить по Y', async() => {
      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 0.001,
        heightRatio: 0.25,
        shiftKey: true
      })
    })

    await test.step('Проверить что X остановился на минимуме, а Y продолжил свободный resize', async() => {
      expect(resizedState.rect.width).toBe(CROP_MIN_SIZE.width)
      expect(resizedState.rect.height).toBeGreaterThan(CROP_MIN_SIZE.height)
      expect(resizedState.rect.height).toBeLessThan(initialState.rect.height)
    })
  })

  test('по умолчанию позволяет применить область больше монтажной области', async({
    editorModel,
    crop
  }) => {
    const montageBefore = await editorModel.getMontageArea()
    const requestedSize = {
      width: montageBefore.width + 160,
      height: montageBefore.height + 120
    }

    const cropState = await test.step('Войти в crop с размером больше монтажной области', async() => {
      return crop.startCanvasCrop({
        size: requestedSize
      })
    })

    await test.step('Проверить что crop-область вышла за границы монтажной области', async() => {
      expect(cropState.options.allowFrameOverflow).toBe(true)
      expect(cropState.rect.left).toBeLessThan(0)
      expect(cropState.rect.top).toBeLessThan(0)
      expect(cropState.rect.width).toBe(requestedSize.width)
      expect(cropState.rect.height).toBe(requestedSize.height)
    })

    await test.step('Применить crop и проверить новый размер монтажной области', async() => {
      await crop.apply()

      const montageAfter = await editorModel.getMontageArea()

      expect(montageAfter.width).toBe(requestedSize.width)
      expect(montageAfter.height).toBe(requestedSize.height)
      expect(await crop.isActive()).toBe(false)
    })
  })

  test('не выпускает crop-область за монтажную область, когда overflow выключен', async({
    editorModel,
    crop
  }) => {
    const montage = await editorModel.getMontageArea()

    const cropState = await test.step('Войти в crop с размером больше монтажной области и выключенным overflow', async() => {
      return crop.startCanvasCrop({
        size: {
          width: montage.width + 160,
          height: montage.height + 120
        },
        allowFrameOverflow: false
      })
    })

    await test.step('Проверить что размер ограничен монтажной областью', async() => {
      expect(cropState.options.allowFrameOverflow).toBe(false)
      expect(cropState.rect.left).toBeGreaterThanOrEqual(0)
      expect(cropState.rect.top).toBeGreaterThanOrEqual(0)
      expect(cropState.rect.width).toBeLessThanOrEqual(montage.width)
      expect(cropState.rect.height).toBeLessThanOrEqual(montage.height)
    })
  })

  test('Space + ЛКМ двигает viewport и не сбрасывает crop монтажной области', async({
    editorModel,
    crop
  }) => {
    const cropBefore = await test.step('Войти в crop монтажной области', async() => {
      return crop.startCanvasCrop({
        cancelOnSelectionClear: true
      })
    })

    await test.step('Приблизить canvas до доступного pan по обеим осям', async() => {
      const panState = await editorModel.zoomInUntilViewportCanMove()

      expect(panState.horizontal.canPan).toBe(true)
      expect(panState.vertical.canPan).toBe(true)
    })

    await test.step('Подвигать viewport через реальный Space + ЛКМ drag', async() => {
      await editorModel.dragViewportBySpaceMouse({
        deltaX: -120,
        deltaY: -90
      })
    })

    await test.step('Проверить что crop mode и выделение crop-области восстановились', async() => {
      const cropAfter = await crop.requireState()
      const activeObject = await editorModel.getActiveObject()

      expect(cropAfter.frame.id).toBe(cropBefore.frame.id)
      expect(cropAfter.rect.width).toBe(cropBefore.rect.width)
      expect(cropAfter.rect.height).toBe(cropBefore.rect.height)
      expect(activeObject?.id).toBe(cropBefore.frame.id)
    })
  })

  test('кроп изображения больше его размера добавляет прозрачные поля без cropX/cropY', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 100,
          height: 80
        })
      })
    })

    const cropState = await test.step('Войти в crop изображения с областью больше объекта', async() => {
      return crop.startImageCrop({
        id: image.id,
        size: {
          width: 140,
          height: 120
        }
      })
    })

    await test.step('Проверить что область crop выходит за изображение', async() => {
      expect(cropState.rect.left).toBeLessThan(0)
      expect(cropState.rect.top).toBeLessThan(0)
      expect(cropState.rect.width).toBe(140)
      expect(cropState.rect.height).toBe(120)
    })

    await test.step('Применить crop и проверить новый source изображения', async() => {
      await crop.apply()

      const imageInfo = await crop.getImageSourceInfo({ id: image.id })

      expect(imageInfo.width).toBe(140)
      expect(imageInfo.height).toBe(120)
      expect(imageInfo.cropX).toBe(0)
      expect(imageInfo.cropY).toBe(0)
      expect(imageInfo.sourceWidth).toBe(140)
      expect(imageInfo.sourceHeight).toBe(120)
    })
  })

  test('не показывает тулбар объекта во время crop изображения и возвращает его после отмены', async({
    crop,
    images,
    toolbar
  }) => {
    const image = await test.step('Добавить и выделить изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 120,
          height: 90
        })
      })
    })

    await test.step('Проверить что обычный тулбар изображения видим до crop', async() => {
      await toolbar.waitUntilVisible()
      expect(await toolbar.isVisible()).toBe(true)
    })

    await test.step('Войти в crop и проверить что тулбар скрыт', async() => {
      await crop.startImageCrop({ id: image.id })

      expect(await toolbar.isVisible()).toBe(false)
    })

    await test.step('Отменить crop и проверить что тулбар изображения вернулся', async() => {
      await crop.cancel()
      await toolbar.waitUntilVisible()

      expect(await toolbar.isVisible()).toBe(true)
    })
  })

  test('при старте image crop можно отключить сохранение пропорций у resize правой стороны', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 140,
          height: 100
        })
      })
    })

    const initialState = await test.step('Войти в crop изображения с квадратной областью и отключённым сохранением пропорций', async() => {
      return crop.startImageCrop({
        id: image.id,
        aspectRatio: {
          width: 1,
          height: 1
        },
        preserveAspectRatio: false
      })
    })

    await test.step('Проверить что image crop стартовал с отключённым режимом', async() => {
      expect(initialState.mode).toBe('image')
      expect(initialState.options.preserveAspectRatio).toBe(false)
      expect(initialState.targetId).toBe(image.id)
    })

    const freeResizeState = await test.step('Потянуть область за правую сторону без Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'mr',
        widthRatio: 0.72,
        heightRatio: 1
      })
    })

    await test.step('Проверить что без Shift правая сторона меняет только ширину', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(freeResizeState.rect.width).toBeLessThan(initialState.rect.width)
      expect(freeResizeState.rect.height).toBeCloseTo(initialState.rect.height, 3)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })

    await crop.cancel()

    const restartedState = await test.step('Снова войти в image crop с тем же флагом для проверки Shift', async() => {
      return crop.startImageCrop({
        id: image.id,
        aspectRatio: {
          width: 1,
          height: 1
        },
        preserveAspectRatio: false
      })
    })

    const preservedState = await test.step('Потянуть область за правую сторону с Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'mr',
        widthRatio: 0.72,
        heightRatio: 1,
        shiftKey: true
      })
    })

    await test.step('Проверить что Shift возвращает сохранение пропорций и меняет обе оси', async() => {
      const initialRatio = restartedState.rect.width / restartedState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(preservedState.rect.width).toBeLessThan(restartedState.rect.width)
      expect(preservedState.rect.height).toBeLessThan(restartedState.rect.height)
      expect(resizedRatio).toBeCloseTo(initialRatio, 1)
    })
  })

  test('уже активному image crop можно переключить сохранение пропорций у resize верхней стороны', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 1000,
          height: 667
        })
      })
    })

    const initialState = await test.step('Войти в image crop с квадратной областью', async() => {
      return crop.startImageCrop({
        id: image.id,
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    await test.step('Проверить что по умолчанию режим сохранения пропорций включён', async() => {
      expect(initialState.mode).toBe('image')
      expect(initialState.options.preserveAspectRatio).toBe(true)
      expect(initialState.targetId).toBe(image.id)
    })

    const unlockedState = await test.step('Отключить сохранение пропорций у уже активного image crop', async() => {
      return crop.setPreserveAspectRatio({
        preserveAspectRatio: false
      })
    })

    await test.step('Проверить что новый режим виден через публичное состояние', async() => {
      expect(unlockedState.mode).toBe('image')
      expect(unlockedState.options.preserveAspectRatio).toBe(false)
      expect(unlockedState.targetId).toBe(image.id)
    })

    const freeResizeState = await test.step('Потянуть область за верхнюю сторону без Shift после переключения режима', async() => {
      return crop.resizeFrameFromControl({
        control: 'mt',
        widthRatio: 1,
        heightRatio: 0.72
      })
    })

    await test.step('Проверить что без Shift верхняя сторона меняет только высоту', async() => {
      const initialRatio = unlockedState.rect.width / unlockedState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(Math.abs(freeResizeState.rect.width - unlockedState.rect.width)).toBeLessThan(2)
      expect(freeResizeState.rect.height).toBeLessThan(unlockedState.rect.height)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })

    const relockedState = await test.step('Снова включить сохранение пропорций у уже активного image crop', async() => {
      return crop.setPreserveAspectRatio({
        preserveAspectRatio: true
      })
    })

    const preservedState = await test.step('Потянуть область за верхнюю сторону без Shift после обратного переключения', async() => {
      return crop.resizeFrameFromControl({
        control: 'mt',
        widthRatio: 1,
        heightRatio: 0.72
      })
    })

    await test.step('Проверить что после обратного переключения верхняя сторона снова сохраняет пропорции', async() => {
      const relockedRatio = relockedState.rect.width / relockedState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height

      expect(preservedState.rect.width).toBeLessThan(relockedState.rect.width)
      expect(preservedState.rect.height).toBeLessThan(relockedState.rect.height)
      expect(resizedRatio).toBeCloseTo(relockedRatio, 1)
    })
  })

  test('на маленьком image crop повторное включение сохранения пропорций у resize верхней стороны не ломает геометрию', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить маленькое изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 140,
          height: 100
        })
      })
    })

    const initialState = await test.step('Войти в image crop с квадратной областью', async() => {
      return crop.startImageCrop({
        id: image.id,
        aspectRatio: {
          width: 1,
          height: 1
        }
      })
    })

    const unlockedState = await test.step('Отключить сохранение пропорций у уже активного image crop', async() => {
      return crop.setPreserveAspectRatio({
        preserveAspectRatio: false
      })
    })

    const freeResizeState = await test.step('Потянуть область за верхнюю сторону без Shift после переключения режима', async() => {
      return crop.resizeFrameFromControl({
        control: 'mt',
        widthRatio: 1,
        heightRatio: 0.72
      })
    })

    await test.step('Проверить что без Shift маленькая область всё ещё заметно меняет пропорции', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = freeResizeState.rect.width / freeResizeState.rect.height

      expect(freeResizeState.rect.height).toBeLessThan(unlockedState.rect.height)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })

    const relockedState = await test.step('Снова включить сохранение пропорций у уже активного image crop', async() => {
      return crop.setPreserveAspectRatio({
        preserveAspectRatio: true
      })
    })

    const preservedState = await test.step('Потянуть область за верхнюю сторону без Shift после обратного переключения', async() => {
      return crop.resizeFrameFromControl({
        control: 'mt',
        widthRatio: 1,
        heightRatio: 0.72
      })
    })

    await test.step('Проверить что маленькая область после relock уменьшается по обеим осям и не уходит в сильный перекос', async() => {
      const relockedRatio = relockedState.rect.width / relockedState.rect.height
      const resizedRatio = preservedState.rect.width / preservedState.rect.height
      const widthScale = preservedState.rect.width / relockedState.rect.width
      const heightScale = preservedState.rect.height / relockedState.rect.height

      expect(preservedState.rect.width).toBeLessThan(relockedState.rect.width)
      expect(preservedState.rect.height).toBeLessThan(relockedState.rect.height)
      expect(Math.abs(widthScale - heightScale)).toBeLessThan(0.06)
      expect(Math.abs(resizedRatio - relockedRatio)).toBeLessThan(0.12)
    })
  })

  test('клик вне crop-области закрывает crop изображения и возвращает выделение на исходное изображение', async({
    editorModel,
    crop,
    images,
    shapes
  }) => {
    const image = await test.step('Добавить изображение для crop', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 120,
          height: 90
        })
      })
    })

    const shape = await test.step('Добавить другой объект для клика вне crop-области', async() => {
      return shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'crop-click-outside-shape',
          left: 40,
          top: 40,
          width: 64,
          height: 64
        }
      })
    })

    expect(shape?.id).toBe('crop-click-outside-shape')

    await test.step('Войти в crop изображения и кликнуть по другому объекту', async() => {
      await crop.startImageCrop({ id: image.id })
      await crop.clickObjectCenter({ id: 'crop-click-outside-shape' })
      await crop.waitUntilInactive()
    })

    await test.step('Проверить что выделено исходное изображение, а не объект под кликом', async() => {
      const activeObject = await editorModel.getActiveObject()

      expect(activeObject?.id).toBe(image.id)
      expect(activeObject?.id).not.toBe('crop-click-outside-shape')
    })
  })
})
