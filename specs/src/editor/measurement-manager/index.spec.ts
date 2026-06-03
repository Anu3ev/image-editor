import type { FabricObject } from 'fabric'
import MeasurementManager from '../../../../src/editor/measurement-manager'
import {
  createBoundsObject,
  createSnappingTestContext,
  setActiveObjects
} from '../../../test-utils/canvas/geometry-objects'
import { attachToolbarMock } from '../../../test-utils/managers/toolbar'
import { mockRaf } from '../../../test-utils/events/raf'
import * as renderUtils from '../../../../src/editor/utils/render-utils'
import type { MeasurementGuide } from '../../../../src/editor/measurement-manager/types'

/** Минимальная форма mouse:move события, которую реально использует MeasurementManager. */
type MeasurementMouseMoveEvent = {
  e: { altKey: boolean }
  target: FabricObject | null
}

/** Canvas-события, через которые MeasurementManager получает runtime-сигналы в unit-тестах. */
type MeasurementCanvasEventName = 'mouse:move' | 'after:render'

/** Обработчик canvas-события, сохранённый canvas-стабом после подписки manager'а. */
type MeasurementCanvasHandler = (event?: MeasurementMouseMoveEvent) => void

/** Минимальный canvas-стаб с event registry для проверки подписанного lifecycle. */
type MeasurementCanvasStub = {
  __handlers: Partial<Record<MeasurementCanvasEventName, MeasurementCanvasHandler[]>>
}

/** Boolean-поля runtime-состояния, которые тесты читают как наблюдаемый итог lifecycle. */
type MeasurementManagerStateKey = 'isAltPressed' | 'isToolbarHidden'

describe('MeasurementManager', () => {
  /** Восстановление requestAnimationFrame после каждого теста. */
  let restoreRaf: (() => void) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    restoreRaf = mockRaf().restore
  })

  afterEach(() => {
    restoreRaf?.()
    restoreRaf = null
  })

  /**
   * Возвращает активные направляющие manager'а через проверяемую test-only границу.
   */
  const getActiveGuides = ({ manager }: { manager: MeasurementManager }): MeasurementGuide[] => {
    const guides = Reflect.get(manager, 'activeGuides')

    expect(guides).toBeDefined()
    expect(Array.isArray(guides)).toBe(true)

    if (!Array.isArray(guides)) {
      throw new Error('activeGuides должен быть массивом направляющих MeasurementManager')
    }

    return guides as MeasurementGuide[]
  }

  /**
   * Возвращает boolean-состояние manager'а через проверяемую test-only границу.
   */
  const getBooleanManagerState = ({
    manager,
    key
  }: {
    manager: MeasurementManager
    key: MeasurementManagerStateKey
  }): boolean => {
    const value = Reflect.get(manager, key)

    expect(value).toBeDefined()
    expect(typeof value).toBe('boolean')

    if (typeof value !== 'boolean') {
      throw new Error(`${key} должен быть boolean-состоянием MeasurementManager`)
    }

    return value
  }

  /**
   * Возвращает подписанный canvas handler и явно валидирует тестовый event registry.
   */
  const getCanvasHandler = ({
    canvas,
    eventName
  }: {
    canvas: MeasurementCanvasStub
    eventName: MeasurementCanvasEventName
  }): MeasurementCanvasHandler => {
    const handlers = canvas.__handlers[eventName] ?? []
    const handler = handlers[0]

    expect(handlers).toHaveLength(1)
    expect(typeof handler).toBe('function')

    if (typeof handler !== 'function') {
      throw new Error(`MeasurementManager должен подписаться на ${eventName}`)
    }

    return handler
  }

  /**
   * Собирает минимальное событие движения мыши для MeasurementManager.
   */
  const buildEvent = (target: FabricObject | null, altKey = true): MeasurementMouseMoveEvent => ({
    e: { altKey },
    target
  })

  /**
   * Отправляет mouse:move через тот же canvas handler, который использует runtime.
   */
  const fireCanvasMouseMove = ({
    canvas,
    target,
    altKey = true
  }: {
    canvas: MeasurementCanvasStub
    target: FabricObject | null
    altKey?: boolean
  }): void => {
    const handler = getCanvasHandler({ canvas, eventName: 'mouse:move' })
    handler(buildEvent(target, altKey))
  }

  /**
   * Запускает отрисовку направляющих через подписанный after:render handler.
   */
  const fireCanvasAfterRender = ({
    canvas
  }: {
    canvas: MeasurementCanvasStub
  }): void => {
    const handler = getCanvasHandler({ canvas, eventName: 'after:render' })
    handler()
  }

  /**
   * Возвращает первое горизонтальное расстояние из активных направляющих.
   */
  const getHorizontalDistance = ({ manager }: { manager: MeasurementManager }): number => {
    const horizontalGuide = getActiveGuides({ manager }).find(({ type }) => type === 'horizontal')

    expect(horizontalGuide).toBeDefined()
    expect(horizontalGuide?.distance).toBeDefined()

    if (!horizontalGuide) {
      throw new Error('MeasurementManager должен построить горизонтальную направляющую')
    }

    return horizontalGuide.distance
  }

  /**
   * Создаёт три объекта в линию с равными зазорами.
   */
  const createEqualSpacingHorizontalScene = () => {
    const { editor, canvas, objects } = createSnappingTestContext()
    const left = createBoundsObject({ left: 0, top: 100, width: 40, height: 40, id: 'left' })
    const center = createBoundsObject({ left: 83, top: 100, width: 40, height: 40, id: 'center' })
    const right = createBoundsObject({ left: 166, top: 100, width: 40, height: 40, id: 'right' })
    objects.push(left)
    objects.push(center)
    objects.push(right)
    canvas.getObjects.mockReturnValue(objects)

    return {
      editor,
      canvas,
      left,
      center,
      right
    }
  }

  it('строит вертикальные и горизонтальные направляющие для цели под курсором', () => {
    const { editor, canvas } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 50, top: 50, width: 40, height: 40, id: 'active' })
    const target = createBoundsObject({ left: 200, top: 120, width: 60, height: 60, id: 'target' })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target })

    const guides = getActiveGuides({ manager })
    const types = guides.map(({ type }) => type)
    expect(guides.length).toBeGreaterThanOrEqual(2)
    expect(types).toEqual(expect.arrayContaining(['horizontal', 'vertical']))
    expect(canvas.requestRenderAll).toHaveBeenCalled()

    manager.destroy()
  })

  it('строит направляющие до краёв монтажной области при наведении на пустое место', () => {
    const { editor, canvas } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 100, top: 80, width: 40, height: 40 })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target: null })

    const guides = getActiveGuides({ manager })
    const horizontal = guides.filter((guide) => guide.type === 'horizontal')
    const vertical = guides.filter((guide) => guide.type === 'vertical')
    expect(horizontal).toHaveLength(2)
    expect(vertical).toHaveLength(2)

    manager.destroy()
  })

  it('не строит направляющие, если активный объект полностью вне монтажной области', () => {
    const { editor, canvas } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: -50, top: -50, width: 20, height: 20 })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target: null })

    expect(getActiveGuides({ manager })).toHaveLength(0)

    manager.destroy()
  })

  it('пропускает измерение при отсутствии активных объектов', () => {
    const { editor, canvas } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })

    fireCanvasMouseMove({ canvas, target: null })

    expect(getActiveGuides({ manager })).toHaveLength(0)
    manager.destroy()
  })

  it('использует последнее движение при повторном нажатии ALT без перемещения курсора', () => {
    const { editor, canvas } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 60, top: 60, width: 20, height: 20 })
    const target = createBoundsObject({ left: 150, top: 150, width: 20, height: 20 })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target, altKey: false })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true }))

    expect(getActiveGuides({ manager }).length).toBeGreaterThan(0)
    manager.destroy()
  })

  it('не показывает расстояние до стороны, за пределы которой вышел объект', () => {
    const { editor, canvas } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 380, top: 80, width: 40, height: 40 })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target: null })

    const guides = getActiveGuides({ manager })
    const horizontal = guides.filter((guide) => guide.type === 'horizontal')
    expect(horizontal).toHaveLength(1)
    expect(horizontal[0].distance).toBe(380)

    manager.destroy()
  })

  it('не смещает метки при измерении до монтажной области', () => {
    const { editor, canvas } = createSnappingTestContext()
    const labelSpy = jest.spyOn(renderUtils, 'drawGuideLabel')
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 100, top: 100, width: 40, height: 40 })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target: null })
    fireCanvasAfterRender({ canvas })

    expect(labelSpy).toHaveBeenCalled()
    const offsets = labelSpy.mock.calls.map(([args]) => args.offsetAlongAxis)
    expect(offsets.every((val) => val === 0 || val === undefined)).toBe(true)
    labelSpy.mockRestore()
    manager.destroy()
  })

  it('разводит метки при измерении между двумя объектами по обеим осям', () => {
    const { editor, canvas } = createSnappingTestContext()
    const labelSpy = jest.spyOn(renderUtils, 'drawGuideLabel')
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 50, top: 50, width: 30, height: 30 })
    const target = createBoundsObject({ left: 150, top: 150, width: 30, height: 30 })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target })
    fireCanvasAfterRender({ canvas })

    const offsets = labelSpy.mock.calls.map(([args]) => args.offsetAlongAxis ?? 0)
    expect(offsets.some((offset) => offset !== 0)).toBe(true)
    labelSpy.mockRestore()
    manager.destroy()
  })

  it('скрывает тулбар в режиме измерений и возвращает после очистки', () => {
    const { editor, canvas } = createSnappingTestContext()
    const toolbar = attachToolbarMock(editor)
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 40, top: 40, width: 30, height: 30 })
    const target = createBoundsObject({ left: 100, top: 80, width: 20, height: 20 })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target })
    expect(toolbar.hideTemporarily).toHaveBeenCalled()
    expect(getBooleanManagerState({ manager, key: 'isToolbarHidden' })).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', altKey: false }))
    expect(toolbar.showAfterTemporary).toHaveBeenCalled()
    expect(getBooleanManagerState({ manager, key: 'isToolbarHidden' })).toBe(false)

    manager.destroy()
  })

  it('очищает состояние при потере фокуса окна', () => {
    const { editor, canvas } = createSnappingTestContext()
    const toolbar = attachToolbarMock(editor)
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 50, top: 50, width: 30, height: 30 })
    const target = createBoundsObject({ left: 120, top: 120, width: 20, height: 20 })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target })
    expect(getActiveGuides({ manager }).length).toBeGreaterThan(0)

    window.dispatchEvent(new Event('blur'))
    expect(getActiveGuides({ manager })).toHaveLength(0)
    expect(getBooleanManagerState({ manager, key: 'isAltPressed' })).toBe(false)
    expect(toolbar.showAfterTemporary).toHaveBeenCalled()

    manager.destroy()
  })

  it('очищает состояние при отпускании ALT', () => {
    const { editor, canvas } = createSnappingTestContext()
    const toolbar = attachToolbarMock(editor)
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 60, top: 60, width: 30, height: 30 })
    const target = createBoundsObject({ left: 120, top: 120, width: 20, height: 20 })
    setActiveObjects(canvas, [active])

    fireCanvasMouseMove({ canvas, target })
    expect(getActiveGuides({ manager }).length).toBeGreaterThan(0)

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', altKey: false }))
    expect(getActiveGuides({ manager })).toHaveLength(0)
    expect(toolbar.showAfterTemporary).toHaveBeenCalled()

    manager.destroy()
  })

  it('показывает одинаковое расстояние от центрального объекта к левому и правому соседу', () => {
    const {
      editor,
      canvas,
      left,
      center,
      right
    } = createEqualSpacingHorizontalScene()
    const manager = new MeasurementManager({ editor })
    setActiveObjects(canvas, [center])

    fireCanvasMouseMove({ canvas, target: left })
    const leftDistance = getHorizontalDistance({ manager })

    fireCanvasMouseMove({ canvas, target: right })
    const rightDistance = getHorizontalDistance({ manager })

    expect(leftDistance).toBe(43)
    expect(rightDistance).toBe(43)

    manager.destroy()
  })

  it('показывает одинаковое расстояние при измерении центр→крайний и крайний→центр', () => {
    const {
      editor,
      canvas,
      left,
      center
    } = createEqualSpacingHorizontalScene()
    const manager = new MeasurementManager({ editor })

    setActiveObjects(canvas, [center])
    fireCanvasMouseMove({ canvas, target: left })
    const centerToLeftDistance = getHorizontalDistance({ manager })

    setActiveObjects(canvas, [left])
    fireCanvasMouseMove({ canvas, target: center })
    const leftToCenterDistance = getHorizontalDistance({ manager })

    expect(centerToLeftDistance).toBe(43)
    expect(leftToCenterDistance).toBe(43)

    manager.destroy()
  })
})
