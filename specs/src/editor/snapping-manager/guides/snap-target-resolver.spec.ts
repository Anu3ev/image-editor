import { SnapTargetResolver } from '../../../../../src/editor/snapping-manager/guides/snap-target-resolver'
import {
  createBoundsObject,
  createSnappingTestContext
} from '../../../../test-utils/canvas/geometry-objects'

describe('Выбор объектов для прилипания', () => {
  it('исключает активный объект и сохраняет исходный индекс цели без доступных границ', () => {
    const { canvas, objects } = createSnappingTestContext()
    const active = createBoundsObject({ id: 'active', left: 0, top: 0, width: 20, height: 20 })
    const first = createBoundsObject({ id: 'first', left: 30, top: 0, width: 20, height: 20 })
    const withoutBounds = createBoundsObject({ id: 'without-bounds', left: 60, top: 0, width: 20, height: 20 })
    const last = createBoundsObject({ id: 'last', left: 90, top: 0, width: 20, height: 20 })
    withoutBounds.getBoundingRect.mockImplementation(() => {
      throw new Error('Границы недоступны')
    })
    objects.push(active, first, withoutBounds, last)

    const targets = new SnapTargetResolver({ canvas }).resolve({ activeObject: active, mode: 'exact' })

    expect(targets.map(({ object }) => object.id)).toEqual(['first', 'last'])
    expect(targets.map(({ snapshotIndex }) => snapshotIndex)).toEqual([0, 2])
  })

  it('не возвращает скрытые и служебные объекты', () => {
    const { canvas, objects } = createSnappingTestContext()
    const visible = createBoundsObject({ id: 'visible', left: 0, top: 0, width: 20, height: 20 })
    const hidden = createBoundsObject({ id: 'hidden', left: 30, top: 0, width: 20, height: 20 })
    const background = createBoundsObject({ id: 'background', left: 60, top: 0, width: 20, height: 20 })
    hidden.visible = false
    objects.push(visible, hidden, background)

    const targets = new SnapTargetResolver({ canvas }).resolve({ mode: 'exact' })

    expect(targets).toHaveLength(1)
    expect(targets[0].object).toBe(visible)
  })

  it('не округляет границы источника активной crop-области', () => {
    const { canvas, objects } = createSnappingTestContext()
    const source = createBoundsObject({ id: 'source', left: 10.25, top: 20.5, width: 40.6, height: 30.4 })
    const regularActive = createBoundsObject({ id: 'active', left: 100, top: 100, width: 20, height: 20 })
    const cropFrame = createBoundsObject({ id: 'crop-frame', left: 100, top: 100, width: 20, height: 20 })
    objects.push(source)

    const resolver = new SnapTargetResolver({ canvas })
    const rounded = resolver.resolve({ activeObject: regularActive, mode: 'rounded' })[0].bounds
    const exact = resolver.resolve({ activeObject: regularActive, mode: 'exact' })[0].bounds
    const cropSource = resolver.resolve({
      activeObject: cropFrame, mode: 'rounded', domainBoundary: { object: source, bounds: exact }
    })[0].bounds

    expect(rounded.right - rounded.left).toBe(41)
    expect(cropSource.right - cropSource.left).toBeCloseTo(40.6, 10)
    expect(exact.right - exact.left).toBeCloseTo(40.6, 10)
  })

  it('не выбирает особую геометрию по служебным свойствам активного объекта', () => {
    const { canvas, objects } = createSnappingTestContext()
    const source = createBoundsObject({ id: 'source', left: 10.25, top: 20.5, width: 40.6, height: 30.4 })
    const active = createBoundsObject({ id: 'active', left: 100, top: 100, width: 20, height: 20 })
    active.cropSource = source
    objects.push(source)

    const targets = new SnapTargetResolver({ canvas }).resolve({ activeObject: active, mode: 'rounded' })

    expect(targets).toHaveLength(1)
    expect(targets[0].bounds.right - targets[0].bounds.left).toBe(41)
  })

  it('выделяет источник crop как доменную границу и исключает его из равноудалённости', () => {
    const { canvas, objects } = createSnappingTestContext()
    const active = createBoundsObject({ id: 'crop-frame', left: 40, top: 40, width: 20, height: 20 })
    const source = createBoundsObject({ id: 'image', left: 10.25, top: 20.5, width: 400.6, height: 300.4 })
    const neighbor = createBoundsObject({ id: 'shape', left: 50, top: 40, width: 20, height: 20 })
    const montageArea = createBoundsObject({ id: 'montage-area', left: 0, top: 0, width: 512, height: 512 })
    const contentBounds = {
      left: 20.25,
      right: 400.85,
      top: 30.5,
      bottom: 310.9,
      centerX: 210.55,
      centerY: 170.7
    }
    objects.push(active, source, neighbor, montageArea)

    const sources = new SnapTargetResolver({ canvas }).resolveSources({
      activeObject: active, domainBoundary: { object: source, bounds: contentBounds }, montageArea
    })

    expect(sources).toHaveLength(3)
    expect(sources[0]).toMatchObject({ edgeCategory: 'domain-boundary', useForSpacing: false })
    expect(sources[0].bounds).toEqual(contentBounds)
    expect(source.getBoundingRect).not.toHaveBeenCalled()
    expect(sources[1]).toMatchObject({ edgeCategory: 'edge', useForSpacing: true })
    expect(sources[2]).toMatchObject({ id: 'montage-area', edgeCategory: 'domain-boundary' })
    expect(sources.filter(({ useForSpacing }) => useForSpacing)).toHaveLength(1)
  })
})
