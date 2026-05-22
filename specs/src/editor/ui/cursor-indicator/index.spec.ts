import {
  CURSOR_INDICATOR_OFFSET_X,
  CURSOR_INDICATOR_OFFSET_Y
} from '../../../../../src/editor/ui/cursor-indicator/constants'
import {
  createCursorIndicatorFixture,
  TEST_CURSOR_INDICATOR_CLASS
} from '../../../../test-utils/ui/indicator-test-utils'

describe('CursorIndicator', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('создаёт скрытый DOM-элемент внутри переданного parent', () => {
    const {
      indicator,
      parent
    } = createCursorIndicatorFixture()

    expect(indicator.el.className).toBe(TEST_CURSOR_INDICATOR_CLASS)
    expect(indicator.el.style.display).toBe('none')
    expect(parent.contains(indicator.el)).toBe(true)
  })

  it('показывает текст рядом с указателем в координатах parent', () => {
    const { indicator } = createCursorIndicatorFixture()

    indicator.showAtPointer({
      text: '45°',
      event: new MouseEvent('mousemove', {
        clientX: 500,
        clientY: 300
      })
    })

    expect(indicator.el.style.display).toBe('block')
    expect(indicator.el.textContent).toBe('45°')
    expect(indicator.el.style.left).toBe(`${400 + CURSOR_INDICATOR_OFFSET_X}px`)
    expect(indicator.el.style.top).toBe(`${250 + CURSOR_INDICATOR_OFFSET_Y}px`)
  })

  it('переносит индикатор влево и вверх, если справа или снизу нет места', () => {
    const { indicator } = createCursorIndicatorFixture()

    indicator.showAtPointer({
      text: 'ширина: 100 высота: 80',
      event: new MouseEvent('mousemove', {
        clientX: 890,
        clientY: 640
      })
    })

    expect(indicator.el.style.left).toBe(`${790 - 50 - CURSOR_INDICATOR_OFFSET_X}px`)
    expect(indicator.el.style.top).toBe(`${590 - 30 - CURSOR_INDICATOR_OFFSET_Y}px`)
  })

  it('не выпускает индикатор за левую и верхнюю границу parent, если курсор ушёл за canvas', () => {
    const { indicator } = createCursorIndicatorFixture({
      parentBounds: {
        left: 100,
        top: 50,
        width: 800,
        height: 600
      },
      indicatorBounds: {
        width: 120,
        height: 40
      }
    })

    indicator.showAtPointer({
      text: 'value',
      event: new MouseEvent('mousemove', {
        clientX: 0,
        clientY: 0
      })
    })

    expect(indicator.el.style.left).toBe('0px')
    expect(indicator.el.style.top).toBe('0px')
  })

  it('не выпускает индикатор за правую и нижнюю границу parent, если курсор ушёл за canvas', () => {
    const { indicator } = createCursorIndicatorFixture({
      parentBounds: {
        left: 100,
        top: 50,
        width: 800,
        height: 600
      },
      indicatorBounds: {
        width: 120,
        height: 40
      }
    })

    indicator.showAtPointer({
      text: 'value',
      event: new MouseEvent('mousemove', {
        clientX: 1200,
        clientY: 900
      })
    })

    expect(indicator.el.style.left).toBe('680px')
    expect(indicator.el.style.top).toBe('560px')
  })

  it('скрывает индикатор и очищает текст', () => {
    const { indicator } = createCursorIndicatorFixture()

    indicator.showAtPointer({
      text: 'visible',
      event: new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 140
      })
    })
    indicator.hide()

    expect(indicator.el.style.display).toBe('none')
    expect(indicator.el.textContent).toBe('')
  })

  it('удаляет DOM-элемент при destroy', () => {
    const {
      indicator,
      parent
    } = createCursorIndicatorFixture()

    indicator.destroy()

    expect(parent.contains(indicator.el)).toBe(false)
  })
})
