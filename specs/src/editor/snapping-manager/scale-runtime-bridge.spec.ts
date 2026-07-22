import SnappingManager from '../../../../src/editor/snapping-manager'
import {
  createBoundsObject,
  createSnappingTestContext
} from '../../../test-utils/canvas/geometry-objects'
import { emitCanvasEvent } from '../../../test-utils/canvas/events'

describe('Публичный контракт SnappingManager для скейлинга', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('фиксирует кандидатов и zoom без округления в начале скейлинга', () => {
    const { editor, canvas, objects } = createSnappingTestContext()
    const source = createBoundsObject({
      left: 10.25,
      top: 20.5,
      width: 100.5,
      height: 80.25,
      id: 'source'
    })
    const active = createBoundsObject({ left: 150, top: 120, width: 40, height: 30, id: 'active' })
    objects.push(source, active)
    canvas.getZoom.mockReturnValue(2)

    const snappingManager = new SnappingManager({ editor })
    const environment = snappingManager.captureScaleSnapEnvironment({
      activeObject: active,
      targetEdges: ['right', 'top']
    })

    expect(environment.zoom).toBe(2)
    expect(environment.candidates).toHaveLength(12)
    expect(environment.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'object:0:source:left->right',
        edge: 'right',
        position: 10.25
      }),
      expect.objectContaining({
        id: 'object:0:source:top->top',
        edge: 'top',
        position: 20.5
      }),
      expect.objectContaining({
        id: 'montage-area:right->right',
        edge: 'right',
        category: 'domain-boundary'
      })
    ]))
    expect(Object.isFrozen(environment)).toBe(true)
  })

  it('после отметки обработанного шага не запускает старую логику прилипания', () => {
    const { editor, canvas } = createSnappingTestContext()
    const snappingManager = new SnappingManager({ editor })
    const marker = { ctrlKey: false }

    snappingManager.markScaleStepHandled({ marker })
    canvas.requestRenderAll.mockClear()
    emitCanvasEvent({ canvas, event: 'object:scaling', payload: { e: marker } })

    expect(canvas.requestRenderAll).not.toHaveBeenCalled()
    expect(canvas.getZoom).not.toHaveBeenCalled()
  })

  it('рисует только подтверждённые направляющие скейлинга', () => {
    const { editor, canvas, selectionContext } = createSnappingTestContext()
    const snappingManager = new SnappingManager({ editor })

    snappingManager.publishVerifiedScaleGuides({
      guides: [{
        axis: 'x',
        edge: 'right',
        position: 120,
        candidateId: 'right-edge',
        category: 'edge',
        snapshotIndex: 0
      }]
    })

    emitCanvasEvent({ canvas, event: 'after:render' })

    expect(selectionContext.moveTo).toHaveBeenCalledWith(120, 0)
    expect(selectionContext.lineTo).toHaveBeenCalledWith(120, 600)
    expect(canvas.requestRenderAll).toHaveBeenCalledTimes(1)
  })
})
