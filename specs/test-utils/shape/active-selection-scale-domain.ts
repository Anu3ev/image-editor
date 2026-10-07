import { ActiveSelection } from 'fabric'

import ShapeManager from '../../../src/editor/shape-manager'
import type {
  ActiveSelectionScaleDomainSource,
  ActiveSelectionScaleFrame
} from '../../../src/editor/selection-manager/scaling/active-selection-scale-domain-source'
import type ShapeLifecycleController from '../../../src/editor/shape-manager/lifecycle/shape-lifecycle-controller'
import type ShapeScalingController from '../../../src/editor/shape-manager/scaling/shape-scaling-controller'
import type { ShapeGroup } from '../../../src/editor/shape-manager/types'
import { createShapeManagerEditorStub } from './editor-stub'
import {
  createShapeScalingTransform,
  type ShapeScalingTransformStub
} from './scaling'

/** Repeatable setup of two shapes for testing a shared scaling session. */
type ShapeActiveSelectionScaleDomainSetup = Readonly<{
  editor: ReturnType<typeof createShapeManagerEditorStub>
  first: ShapeGroup
  lifecycleController: ShapeLifecycleController
  manager: ShapeManager
  scalingController: ShapeScalingController
  second: ShapeGroup
  selection: ActiveSelection
  transform: ShapeScalingTransformStub
}>

/** Confirmed horizontal shape step and the shared frame applied to it. */
type ConfirmedShapeActiveSelectionScale = Readonly<{
  frame: ActiveSelectionScaleFrame
  source: ActiveSelectionScaleDomainSource
}>

/** Creates two shapes and a shared frame with a horizontal transform. */
export async function createShapeActiveSelectionScaleDomainSetup(): Promise<ShapeActiveSelectionScaleDomainSetup> {
  const editor = createShapeManagerEditorStub()
  const manager = new ShapeManager({ editor: editor as never })
  const first = await manager.add({ presetKey: 'square', options: { text: 'first' } })
  const second = await manager.add({ presetKey: 'square', options: { text: 'second' } })
  if (!first || !second) throw new Error('Для теста должны быть созданы два шейпа')

  const selection = new ActiveSelection([first, second], { canvas: editor.canvas as never })
  const transform = createShapeScalingTransform({
    action: 'scaleX',
    corner: 'mr',
    originX: 'left',
    originY: 'center',
    target: selection
  })

  return {
    editor,
    first,
    lifecycleController: Reflect.get(manager, 'lifecycleController'),
    manager,
    scalingController: Reflect.get(manager, 'scalingController'),
    second,
    selection,
    transform
  }
}

/** Applies and confirms one horizontal step of the shape domain session. */
export function applyConfirmedShapeActiveSelectionScale({
  manager,
  scaleX,
  selection,
  transform
}: {
  manager: ShapeManager
  scaleX: number
  selection: ActiveSelection
  transform: ShapeScalingTransformStub
}): ConfirmedShapeActiveSelectionScale {
  const source = manager.createActiveSelectionScaleDomainSource({ selection, transform: transform as never })
  if (!source) throw new Error('Поддерживаемые шейпы должны создать доменную сессию')

  const measurement = source.measure({ mode: 'horizontal', multipliers: { x: scaleX, y: 1 } })
  const frame = {
    center: selection.getCenterPoint(),
    height: selection.height,
    scaleX,
    scaleY: 1,
    width: selection.width * scaleX
  }
  source.apply({ children: measurement.children, frame, measurement })
  source.confirmAppliedState({ measurement })

  return { frame, source }
}

/** Stops the commit at the second shape after the first has actually changed. */
export function failSecondShapeMaterializationAfterFirst({
  first,
  scalingController,
  second
}: {
  first: ShapeGroup
  scalingController: ShapeScalingController
  second: ShapeGroup
}): Readonly<{ firstMaterializedWidth: number }> {
  const materialize = scalingController.materializeActiveSelectionGroupScaling.bind(scalingController)
  const result = { firstMaterializedWidth: first.width }

  jest.spyOn(scalingController, 'resolveActiveSelectionCommittedScale').mockReturnValue({
    preserveSceneGeometryOnCommit: false,
    scaleX: 1.2,
    scaleY: 1
  })
  jest.spyOn(scalingController, 'materializeActiveSelectionGroupScaling')
    .mockImplementation((options) => {
      if (options.group === second) {
        jest.spyOn(second, 'set').mockImplementationOnce(() => {
          throw new Error('Ошибка восстановления второго шейпа')
        })

        return false
      }

      const didMaterialize = materialize(options)
      result.firstMaterializedWidth = first.width

      return didMaterialize
    })

  return result
}
