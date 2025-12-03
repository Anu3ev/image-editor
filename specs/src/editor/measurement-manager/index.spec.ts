import MeasurementManager from '../../../../src/editor/measurement-manager'
import {
  attachToolbarMock,
  createBoundsObject,
  createSnappingTestContext,
  setActiveObjects
} from '../../../test-utils/editor-helpers'
import { mockRaf } from '../../../test-utils/events'
import * as renderUtils from '../../../../src/editor/utils/render-utils'

describe('MeasurementManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const buildEvent = (target: any, altKey = true) => ({
    e: { altKey },
    target
  }) as any

  it('строит вертикальные и горизонтальные направляющие для цели под курсором', () => {
    const { editor, canvas } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 50, top: 50, width: 40, height: 40, id: 'active' })
    const target = createBoundsObject({ left: 200, top: 120, width: 60, height: 60, id: 'target' })
    setActiveObjects(canvas, [active])

    manager.isAltPressed = true
    manager._updateGuides({ event: buildEvent(target) })

    const guides = manager.activeGuides
    const types = guides.map(({ type }: any) => type)
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

    manager.isAltPressed = true
    manager._updateGuides({ event: buildEvent(null) })

    const guides = manager.activeGuides
    const horizontal = guides.filter((guide: any) => guide.type === 'horizontal')
    const vertical = guides.filter((guide: any) => guide.type === 'vertical')
    expect(horizontal).toHaveLength(2)
    expect(vertical).toHaveLength(2)

    manager.destroy()
  })

  it('не строит направляющие, если активный объект полностью вне монтажной области', () => {
    const { editor, canvas } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: -50, top: -50, width: 20, height: 20 })
    setActiveObjects(canvas, [active])

    manager.isAltPressed = true
    manager._updateGuides({ event: buildEvent(null) })

    expect(manager.activeGuides).toHaveLength(0)

    manager.destroy()
  })

  it('пропускает измерение при отсутствии активных объектов', () => {
    const { editor } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })

    manager.isAltPressed = true
    manager._handleMouseMove(buildEvent(null))

    expect(manager.activeGuides).toHaveLength(0)
    manager.destroy()
  })

  it('использует последнее движение при повторном нажатии ALT без перемещения курсора', () => {
    const { editor, canvas } = createSnappingTestContext()
    const { restore } = mockRaf()
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 60, top: 60, width: 20, height: 20 })
    const target = createBoundsObject({ left: 150, top: 150, width: 20, height: 20 })
    setActiveObjects(canvas, [active])

    manager._handleMouseMove(buildEvent(target))
    manager._handleKeyDown(new KeyboardEvent('keydown', { key: 'Alt', altKey: true }))

    expect(manager.activeGuides.length).toBeGreaterThan(0)
    restore()
    manager.destroy()
  })

  it('не показывает расстояние до стороны, за пределы которой вышел объект', () => {
    const { editor, canvas } = createSnappingTestContext()
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 380, top: 80, width: 40, height: 40 })
    setActiveObjects(canvas, [active])

    manager.isAltPressed = true
    manager._updateGuides({ event: buildEvent(null) })

    const guides = manager.activeGuides as Array<{ type: string; distance: number }>
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

    manager.isAltPressed = true
    manager._updateGuides({ event: buildEvent(null) })
    manager._handleAfterRender()

    expect(labelSpy).toHaveBeenCalled()
    const offsets = labelSpy.mock.calls.map(([args]) => (args as any).offsetAlongAxis)
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

    manager.isAltPressed = true
    manager._updateGuides({ event: buildEvent(target) })
    manager._handleAfterRender()

    const offsets = labelSpy.mock.calls.map(([args]) => (args as any).offsetAlongAxis ?? 0)
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

    manager.isAltPressed = true
    manager._updateGuides({ event: buildEvent(target) })
    expect(toolbar.hideTemporarily).toHaveBeenCalled()
    expect(manager.isToolbarHidden).toBe(true)

    manager._clearGuides()
    expect(toolbar.showAfterTemporary).toHaveBeenCalled()
    expect(manager.isToolbarHidden).toBe(false)

    manager.destroy()
  })

  it('очищает состояние при потере фокуса окна', () => {
    const { editor, canvas } = createSnappingTestContext()
    const toolbar = attachToolbarMock(editor)
    const manager = new MeasurementManager({ editor })
    const active = createBoundsObject({ left: 50, top: 50, width: 30, height: 30 })
    const target = createBoundsObject({ left: 120, top: 120, width: 20, height: 20 })
    setActiveObjects(canvas, [active])

    manager.isAltPressed = true
    manager._updateGuides({ event: buildEvent(target) })
    expect(manager.activeGuides.length).toBeGreaterThan(0)

    manager._handleWindowBlur()
    expect(manager.activeGuides).toHaveLength(0)
    expect(manager.isAltPressed).toBe(false)
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

    manager.isAltPressed = true
    manager._updateGuides({ event: buildEvent(target) })
    expect(manager.activeGuides.length).toBeGreaterThan(0)

    manager._handleKeyUp(new KeyboardEvent('keyup', { key: 'Alt', altKey: false }))
    expect(manager.activeGuides).toHaveLength(0)
    expect(toolbar.showAfterTemporary).toHaveBeenCalled()

    manager.destroy()
  })
})
