import SnappingManager from '../../../../src/editor/snapping-manager'
import { MOVE_SNAP_STEP } from '../../../../src/editor/snapping-manager/constants'
import { createBoundsObject, createSnappingTestContext } from '../../../test-utils/editor-helpers'

describe('SnappingManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('кеширует интервалы между пересекающимися по ширине объектами независимо от их размеров', () => {
    const { editor, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 40, height: 30, id: 'obj-1' })
    const second = createBoundsObject({ left: 10, top: 100, width: 160, height: 20, id: 'obj-2' })
    const active = createBoundsObject({ left: 5, top: 180, width: 60, height: 40, id: 'active' })
    objects.push(first, second, active)

    const snappingManager = new SnappingManager({ editor })
    ;(snappingManager as any)._handleMouseDown({ target: active })

    const { spacingPatterns, cachedTargetBounds } = snappingManager as any
    expect(cachedTargetBounds).toHaveLength(2)
    expect(spacingPatterns.vertical).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          distance: 70,
          start: 30,
          end: 100
        })
      ])
    )
  })

  it('подтягивает активный объект к кешированному расстоянию с учётом перекрытия по ширине', () => {
    const { editor, canvas, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 40, height: 30, id: 'obj-1' })
    const second = createBoundsObject({ left: 10, top: 100, width: 160, height: 20, id: 'obj-2' })
    const active = createBoundsObject({ left: 5, top: 188, width: 20, height: 50, id: 'active' })
    objects.push(first, second, active)

    const snappingManager = new SnappingManager({ editor })
    ;(snappingManager as any)._handleMouseDown({ target: active })
    ;(snappingManager as any)._handleObjectMoving({ target: active })

    expect(active.top).toBe(190)

    const { activeSpacingGuides } = snappingManager as any
    expect(activeSpacingGuides.length).toBeGreaterThan(0)
    expect(activeSpacingGuides[0]).toEqual(expect.objectContaining({ distance: 70 }))
    expect(canvas.requestRenderAll).toHaveBeenCalled()
  })

  it('округляет координаты до шага MOVE_SNAP_STEP после перемещения', () => {
    const { editor } = createSnappingTestContext()
    const active = createBoundsObject({ left: 10.2, top: 15.8, width: 20, height: 20, id: 'active' })

    const snappingManager = new SnappingManager({ editor })
    ;(snappingManager as any)._handleObjectMoving({ target: active })

    expect(active.left).toBe(Math.round(10.2 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.top).toBe(Math.round(15.8 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.setCoords).toHaveBeenCalled()
  })

  it('округляет координаты до шага MOVE_SNAP_STEP при перемещении с CTRL', () => {
    const { editor } = createSnappingTestContext()
    const active = createBoundsObject({ left: 21.6, top: 33.3, width: 30, height: 30, id: 'active' })

    const snappingManager = new SnappingManager({ editor })
    ;(snappingManager as any)._handleObjectMoving({
      target: active,
      e: { ctrlKey: true }
    })

    expect(active.left).toBe(Math.round(21.6 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.top).toBe(Math.round(33.3 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.setCoords).toHaveBeenCalled()
  })
})
