import AngleIndicatorManager from '../../../../../src/editor/ui/angle-indicator'
import { createManagerTestMocks } from '../../../../test-utils/editor-helpers'
import { ANGLE_INDICATOR_CLASS, OFFSET_X, OFFSET_Y } from '../../../../../src/editor/ui/angle-indicator/constants'

describe('AngleIndicatorManager', () => {
  let mockEditor: any
  let angleIndicatorManager: AngleIndicatorManager
  let mockCanvas: any
  let mockMontageArea: any

  beforeEach(() => {
    const mocks = createManagerTestMocks()
    mockMontageArea = mocks.mockMontageArea
    mockCanvas = mocks.mockCanvas
    mockEditor = mocks.mockEditor

    // Убеждаемся что showRotationAngle включен
    mockEditor.options.showRotationAngle = true

    angleIndicatorManager = new AngleIndicatorManager({ editor: mockEditor })
  })

  afterEach(() => {
    angleIndicatorManager.destroy()
  })

  describe('Инициализация', () => {
    it('создает экземпляр с корректными ссылками', () => {
      expect(angleIndicatorManager.editor).toBe(mockEditor)
      expect(angleIndicatorManager.canvas).toBe(mockCanvas)
      expect(angleIndicatorManager.options).toBe(mockEditor.options)
    })

    it('создает DOM-элемент с правильным классом', () => {
      expect(angleIndicatorManager.el).toBeDefined()
      expect(angleIndicatorManager.el.className).toBe(ANGLE_INDICATOR_CLASS)
      expect(angleIndicatorManager.el.tagName).toBe('DIV')
    })

    it('добавляет элемент в canvas.wrapperEl', () => {
      expect(mockCanvas.wrapperEl.appendChild).toHaveBeenCalledWith(angleIndicatorManager.el)
    })

    it('элемент скрыт по умолчанию', () => {
      expect(angleIndicatorManager.el.style.display).toBe('none')
    })

    it('подписывается на события canvas', () => {
      expect(mockCanvas.on).toHaveBeenCalledWith('object:rotating', expect.any(Function))
      expect(mockCanvas.on).toHaveBeenCalledWith('mouse:up', expect.any(Function))
      expect(mockCanvas.on).toHaveBeenCalledWith('object:modified', expect.any(Function))
      expect(mockCanvas.on).toHaveBeenCalledWith('selection:cleared', expect.any(Function))
    })
  })

  describe('Обработка события object:rotating', () => {
    let mockTarget: any
    let mockEvent: any

    beforeEach(() => {
      mockTarget = {
        id: 'test-object',
        angle: 45,
        lockRotation: false,
        lockMovementX: false,
        lockMovementY: false
      }

      mockEvent = {
        transform: { target: mockTarget },
        e: {
          clientX: 500,
          clientY: 300
        } as MouseEvent
      }

      // Мокаем getBoundingClientRect
      jest.spyOn(mockCanvas.wrapperEl, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        width: 800,
        height: 600
      } as DOMRect)

      jest.spyOn(angleIndicatorManager.el, 'getBoundingClientRect').mockReturnValue({
        width: 50,
        height: 30
      } as DOMRect)
    })

    it('показывает индикатор при вращении объекта', () => {
      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.style.display).toBe('block')
    })

    it('обновляет текст индикатора с текущим углом', () => {
      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.textContent).toBe('45°')
    })

    it('позиционирует индикатор относительно курсора', () => {
      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      // clientX (500) - canvasRect.left (100) + OFFSET_X (16) = 416
      // clientY (300) - canvasRect.top (50) + OFFSET_Y (16) = 266
      expect(angleIndicatorManager.el.style.left).toBe('416px')
      expect(angleIndicatorManager.el.style.top).toBe('266px')
    })

    it('не показывает индикатор для montageArea', () => {
      mockEvent.transform.target = mockMontageArea

      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.style.display).toBe('none')
    })

    it('не показывает индикатор для заблокированного объекта (lockRotation)', () => {
      mockTarget.lockRotation = true

      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.style.display).toBe('none')
    })

    it('не показывает индикатор если showRotationAngle === false', () => {
      mockEditor.options.showRotationAngle = false

      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.style.display).toBe('none')
    })

    it('смещает индикатор влево при выходе за правую границу', () => {
      // Ставим курсор близко к правому краю
      mockEvent.e.clientX = 850 // 850 - 100 + 16 + 50 > 800 (ширина canvas)

      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      // Должен сместиться влево: 850 - 100 - 50 - 16 = 684
      expect(angleIndicatorManager.el.style.left).toBe('684px')
    })

    it('смещает индикатор вверх при выходе за нижнюю границу', () => {
      // Ставим курсор близко к нижнему краю
      mockEvent.e.clientY = 650 // 650 - 50 + 16 + 30 > 600 (высота canvas)

      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      // Должен сместиться вверх: 650 - 50 - 30 - 16 = 554
      expect(angleIndicatorManager.el.style.top).toBe('554px')
    })
  })

  describe('Обработка события mouse:up', () => {
    it('скрывает индикатор при отпускании кнопки мыши', () => {
      // Сначала показываем индикатор
      angleIndicatorManager.el.style.display = 'block'

      const handlers = mockCanvas.__handlers['mouse:up']
      handlers[0]({})

      expect(angleIndicatorManager.el.style.display).toBe('none')
    })
  })

  describe('Обработка события object:modified', () => {
    it('скрывает индикатор при модификации объекта', () => {
      angleIndicatorManager.el.style.display = 'block'

      const handlers = mockCanvas.__handlers['object:modified']
      handlers[0]()

      expect(angleIndicatorManager.el.style.display).toBe('none')
    })
  })

  describe('Обработка события selection:cleared', () => {
    it('скрывает индикатор при снятии выделения', () => {
      angleIndicatorManager.el.style.display = 'block'

      const handlers = mockCanvas.__handlers['selection:cleared']
      handlers[0]()

      expect(angleIndicatorManager.el.style.display).toBe('none')
    })
  })

  describe('Нормализация угла (_normalizeAngle)', () => {
    const normalizeAngle = (AngleIndicatorManager as any)._normalizeAngle

    describe('положительные углы', () => {
      it('возвращает 0° для 0°', () => {
        expect(normalizeAngle(0)).toBe(0)
      })

      it('возвращает 45° для 45°', () => {
        expect(normalizeAngle(45)).toBe(45)
      })

      it('возвращает 90° для 90°', () => {
        expect(normalizeAngle(90)).toBe(90)
      })

      it('возвращает 179° для 179°', () => {
        expect(normalizeAngle(179)).toBe(179)
      })

      it('возвращает 180° для 180°', () => {
        expect(normalizeAngle(180)).toBe(180)
      })

      it('возвращает -90° для 270°', () => {
        expect(normalizeAngle(270)).toBe(-90)
      })

      it('возвращает -1° для 359°', () => {
        expect(normalizeAngle(359)).toBe(-1)
      })

      it('возвращает 0° для 360°', () => {
        expect(normalizeAngle(360)).toBe(0)
      })
    })

    describe('отрицательные углы', () => {
      it('возвращает -1° для -1°', () => {
        expect(normalizeAngle(-1)).toBe(-1)
      })

      it('возвращает -45° для -45°', () => {
        expect(normalizeAngle(-45)).toBe(-45)
      })

      it('возвращает -90° для -90°', () => {
        expect(normalizeAngle(-90)).toBe(-90)
      })

      it('возвращает -179° для -179°', () => {
        expect(normalizeAngle(-179)).toBe(-179)
      })

      it('возвращает -180° для -180°', () => {
        expect(normalizeAngle(-180)).toBe(-180)
      })

      it('возвращает 90° для -270°', () => {
        expect(normalizeAngle(-270)).toBe(90)
      })

      it('возвращает 0° для -360°', () => {
        expect(Math.abs(normalizeAngle(-360))).toBe(0)
      })
    })

    describe('большие углы (несколько оборотов)', () => {
      it('возвращает 45° для 405° (360° + 45°)', () => {
        expect(normalizeAngle(405)).toBe(45)
      })

      it('возвращает 0° для 720° (2 оборота)', () => {
        expect(normalizeAngle(720)).toBe(0)
      })

      it('возвращает -45° для -405°', () => {
        expect(normalizeAngle(-405)).toBe(-45)
      })

      it('возвращает 0° для -720°', () => {
        expect(Math.abs(normalizeAngle(-720))).toBe(0)
      })
    })

    describe('дробные углы', () => {
      it('округляет 45.4° до 45°', () => {
        expect(normalizeAngle(45.4)).toBe(45)
      })

      it('округляет 45.6° до 46°', () => {
        expect(normalizeAngle(45.6)).toBe(46)
      })

      it('округляет -45.4° до -45°', () => {
        expect(normalizeAngle(-45.4)).toBe(-45)
      })

      it('округляет -45.6° до -46°', () => {
        expect(normalizeAngle(-45.6)).toBe(-46)
      })
    })
  })

  describe('Форматирование текста', () => {
    let mockTarget: any
    let mockEvent: any

    beforeEach(() => {
      mockTarget = {
        id: 'test-object',
        angle: 0,
        lockRotation: false,
        lockMovementX: false,
        lockMovementY: false
      }

      mockEvent = {
        transform: { target: mockTarget },
        e: {
          clientX: 500,
          clientY: 300
        } as MouseEvent
      }

      jest.spyOn(mockCanvas.wrapperEl, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        width: 800,
        height: 600
      } as DOMRect)

      jest.spyOn(angleIndicatorManager.el, 'getBoundingClientRect').mockReturnValue({
        width: 50,
        height: 30
      } as DOMRect)
    })

    it('отображает положительные углы без знака +', () => {
      mockTarget.angle = 45
      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.textContent).toBe('45°')
    })

    it('отображает отрицательные углы со знаком -', () => {
      mockTarget.angle = -45
      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.textContent).toBe('-45°')
    })

    it('отображает ноль без знака', () => {
      mockTarget.angle = 0
      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.textContent).toBe('0°')
    })

    it('всегда добавляет символ °', () => {
      mockTarget.angle = 90
      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.textContent).toContain('°')
    })
  })

  describe('Очистка ресурсов (destroy)', () => {
    let freshManager: AngleIndicatorManager

    beforeEach(() => {
      // Создаем новый экземпляр для тестов destroy
      const mocks = createManagerTestMocks()
      mocks.mockEditor.options.showRotationAngle = true
      freshManager = new AngleIndicatorManager({ editor: mocks.mockEditor })
    })

    it('отписывается от всех событий canvas', () => {
      const canvas = freshManager.canvas
      freshManager.destroy()

      expect(canvas.off).toHaveBeenCalledWith('object:rotating', expect.any(Function))
      expect(canvas.off).toHaveBeenCalledWith('mouse:up', expect.any(Function))
      expect(canvas.off).toHaveBeenCalledWith('object:modified', expect.any(Function))
      expect(canvas.off).toHaveBeenCalledWith('selection:cleared', expect.any(Function))
    })

    it('удаляет DOM-элемент из дерева', () => {
      const parentNode = document.createElement('div')
      const el = freshManager.el
      parentNode.appendChild(el)
      const removeChildSpy = jest.spyOn(parentNode, 'removeChild')

      Object.defineProperty(el, 'parentNode', {
        value: parentNode,
        writable: true
      })

      freshManager.destroy()

      expect(removeChildSpy).toHaveBeenCalledWith(el)
    })

    it('не выбрасывает ошибку если parentNode отсутствует', () => {
      Object.defineProperty(freshManager.el, 'parentNode', {
        value: null,
        writable: true
      })

      expect(() => freshManager.destroy()).not.toThrow()
    })

    it('безопасно вызывать destroy несколько раз', () => {
      freshManager.destroy()
      expect(() => freshManager.destroy()).not.toThrow()
    })
  })

  describe('Edge cases', () => {
    it('корректно обрабатывает target === undefined', () => {
      const mockEvent = {
        transform: { target: undefined },
        e: { clientX: 500, clientY: 300 } as MouseEvent
      }

      const handlers = mockCanvas.__handlers['object:rotating']
      expect(() => handlers[0](mockEvent)).not.toThrow()
      expect(angleIndicatorManager.el.style.display).toBe('none')
    })

    it('корректно обрабатывает target.angle === undefined', () => {
      const mockEvent = {
        transform: {
          target: {
            id: 'test',
            lockRotation: false,
            lockMovementX: false,
            lockMovementY: false
          }
        },
        e: { clientX: 500, clientY: 300 } as MouseEvent
      }

      jest.spyOn(mockCanvas.wrapperEl, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        width: 800,
        height: 600
      } as DOMRect)

      jest.spyOn(angleIndicatorManager.el, 'getBoundingClientRect').mockReturnValue({
        width: 50,
        height: 30
      } as DOMRect)

      const handlers = mockCanvas.__handlers['object:rotating']
      handlers[0](mockEvent)

      expect(angleIndicatorManager.el.textContent).toBe('0°')
    })
  })
})
