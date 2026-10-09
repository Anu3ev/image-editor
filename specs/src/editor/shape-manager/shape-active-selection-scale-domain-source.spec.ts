import '../../../test-utils/shape/manager-module-mocks'
import type { ShapeUpdatedPayload } from '../../../../src/editor/shape-manager/types'
import {
  captureShapeScalingGeometry
} from '../../../../src/editor/shape-manager/scaling/shape-scaling-geometry-snapshot'
import {
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape/manager-spec-helpers'
import { getCanvasEventPayloads } from '../../../test-utils/canvas/handlers'
import {
  applyConfirmedShapeActiveSelectionScale,
  createShapeActiveSelectionScaleDomainSetup,
  failSecondShapeMaterializationAfterFirst
} from '../../../test-utils/shape/active-selection-scale-domain'

describe('shape-manager mixed selection scale domain', () => {
  const mocks = getShapeManagerUnitMocks()

  beforeEach(() => {
    resetShapeManagerUnitMocks(mocks)
  })

  it('при ошибке запуска одного шейпа очищает состояние всего выделения', async() => {
    const {
      first,
      lifecycleController,
      manager,
      second,
      selection,
      transform
    } = await createShapeActiveSelectionScaleDomainSetup()
    const beginResizeMock = jest.spyOn(lifecycleController, 'beginResize')
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('Ошибка запуска второго шейпа')
      })
    const clearPreviewMock = jest.spyOn(manager, 'clearActiveSelectionScalePreviewState')
      .mockImplementation(() => {})

    expect(() => manager.createActiveSelectionScaleDomainSource({
      selection,
      transform: transform as never
    })).toThrow('Ошибка запуска второго шейпа')
    expect(beginResizeMock).toHaveBeenCalledTimes(2)
    expect(beginResizeMock).toHaveBeenNthCalledWith(1, { group: first })
    expect(beginResizeMock).toHaveBeenNthCalledWith(2, { group: second })
    expect(clearPreviewMock).toHaveBeenCalledWith({
      children: [first, second],
      selection
    })
  })

  it('при ошибке второго шейпа восстанавливает первый и сохраняет состояние общей сессии', async() => {
    const {
      first,
      lifecycleController,
      manager,
      scalingController,
      second,
      selection,
      transform
    } = await createShapeActiveSelectionScaleDomainSetup()
    const finishResizeMock = jest.spyOn(lifecycleController, 'finishResize')
    const cancelResizeMock = jest.spyOn(lifecycleController, 'cancelResize')
    const clearSelectionStateMock = jest.spyOn(scalingController, 'clearActiveSelectionState')
    const clearStateMock = jest.spyOn(scalingController, 'clearState')
    const before = captureShapeScalingGeometry({ group: first })
    const materialization = failSecondShapeMaterializationAfterFirst({
      first,
      scalingController,
      second
    })
    lifecycleController.beginResize({ group: first })
    lifecycleController.beginResize({ group: second })

    expect(() => manager.prepareActiveSelectionScaleCommit({
      children: [first, second],
      selection,
      transform: transform as never
    })).toThrow('Each measured shape must commit its calculated dimensions')
    const after = captureShapeScalingGeometry({ group: first })

    expect(materialization.firstMaterializedWidth).toBeGreaterThan(before.groupGeometry.width)
    expect(after.groupGeometry).toEqual(before.groupGeometry)
    expect(after.groupLayout).toEqual(before.groupLayout)
    expect(after.shapeGeometry).toEqual(before.shapeGeometry)
    expect(after.shapeRounding).toEqual(before.shapeRounding)
    expect(after.textGeometry).toEqual(before.textGeometry)
    expect(after.textLayout).toEqual(before.textLayout)
    expect(finishResizeMock).not.toHaveBeenCalled()
    expect(cancelResizeMock).not.toHaveBeenCalled()
    expect(clearSelectionStateMock).not.toHaveBeenCalled()
    expect(clearStateMock).not.toHaveBeenCalled()
  })

  it('публикует подготовленные изменения только после успешной фиксации общего выделения', async() => {
    const {
      editor,
      first,
      lifecycleController,
      manager,
      scalingController,
      second,
      selection,
      transform
    } = await createShapeActiveSelectionScaleDomainSetup()
    applyConfirmedShapeActiveSelectionScale({ manager, scaleX: 1.2, selection, transform })

    const clearSelectionMock = jest.spyOn(scalingController, 'clearActiveSelectionState')
    const clearShapeMock = jest.spyOn(scalingController, 'clearState')
    const finishResizeMock = jest.spyOn(lifecycleController, 'finishResize')
    editor.canvas.fire.mockClear()
    const commit = manager.prepareActiveSelectionScaleCommit({
      children: [first, second],
      selection,
      transform: transform as never
    })

    expect(scalingController.resolveActiveSelectionCommittedScale({ selection }).scaleX).toBe(1.2)
    expect(clearSelectionMock).not.toHaveBeenCalled()
    expect(clearShapeMock).not.toHaveBeenCalled()
    expect(finishResizeMock).not.toHaveBeenCalled()
    expect(getCanvasEventPayloads({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })).toHaveLength(0)

    first.set({ left: first.left + 100 })
    second.set({ top: second.top + 100 })
    manager.finishActiveSelectionScaleCommit({ commit })
    const payloads = getCanvasEventPayloads<ShapeUpdatedPayload>({
      canvas: editor.canvas,
      eventName: 'editor:shape-updated'
    })

    expect(clearSelectionMock).toHaveBeenCalledTimes(1)
    expect(clearShapeMock).toHaveBeenCalledTimes(2)
    expect(finishResizeMock).toHaveBeenCalledTimes(2)
    expect(payloads).toHaveLength(2)
    expect(payloads[0]?.after.left).toBe(first.left)
    expect(payloads[0]?.after.top).toBe(first.top)
    expect(payloads[1]?.after.left).toBe(second.left)
    expect(payloads[1]?.after.top).toBe(second.top)
  })

  it('при ошибке применения текущего состояния возвращает все шейпы к подтверждённой геометрии', async() => {
    const {
      first,
      manager,
      scalingController,
      second,
      selection,
      transform
    } = await createShapeActiveSelectionScaleDomainSetup()
    const { frame, source } = applyConfirmedShapeActiveSelectionScale({
      manager,
      scaleX: 1.1,
      selection,
      transform
    })
    expect(scalingController.resolveActiveSelectionCommittedScale({ selection }).scaleX).toBe(1.1)

    const confirmedFirst = captureShapeScalingGeometry({ group: first })
    const confirmedSecond = captureShapeScalingGeometry({ group: second })
    const failedMeasurement = source.measure({ mode: 'horizontal', multipliers: { x: 1.2, y: 1 } })
    jest.spyOn(second, 'setPositionByOrigin').mockImplementationOnce(() => {
      jest.spyOn(second, 'set').mockImplementationOnce(() => {
        throw new Error('Ошибка восстановления второго шейпа')
      })

      throw new Error('Ошибка применения живого состояния второго шейпа')
    })

    expect(() => source.apply({
      children: failedMeasurement.children,
      frame: { ...frame, scaleX: 1.2, width: selection.width * 1.2 },
      measurement: failedMeasurement
    })).toThrow('Ошибка применения живого состояния второго шейпа')
    const restoredFirst = captureShapeScalingGeometry({ group: first })
    const restoredSecond = captureShapeScalingGeometry({ group: second })

    expect(scalingController.resolveActiveSelectionCommittedScale({ selection }).scaleX).toBe(1.1)
    expect(restoredFirst.groupGeometry).toEqual(confirmedFirst.groupGeometry)
    expect(restoredFirst.groupLayout).toEqual(confirmedFirst.groupLayout)
    expect(restoredFirst.shapeGeometry).toEqual(confirmedFirst.shapeGeometry)
    expect(restoredFirst.textGeometry).toEqual(confirmedFirst.textGeometry)
    expect(restoredSecond.groupGeometry).toEqual(confirmedSecond.groupGeometry)
    expect(restoredSecond.shapeGeometry).toEqual(confirmedSecond.shapeGeometry)
    expect(restoredSecond.textGeometry).toEqual(confirmedSecond.textGeometry)
  })
})
