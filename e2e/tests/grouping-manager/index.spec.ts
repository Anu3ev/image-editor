import { test, expect } from '../../fixtures/editor.fixture'
import {
  GROUPING_EDITED_TEXT,
  GROUPING_HORIZONTAL_UNGROUP_EDITING_SCENARIOS,
  GROUPING_RESIZE_DELTA,
  GROUPING_SHAPE_SEEDS,
  GROUPING_SIZE_TOLERANCE,
  GROUPING_VERTICAL_UNGROUP_MOVE_SCENARIOS,
  resolveGroupingShapeOptions
} from '../../fixtures/data/grouping-manager.data'

test.describe('Группировка шейпов', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    for (const shape of GROUPING_SHAPE_SEEDS) {
      const createdShape = await shapes.addAtBounds({
        presetKey: 'square',
        options: resolveGroupingShapeOptions({
          montageLeft: montageBounds.left,
          montageTop: montageBounds.top,
          shape
        })
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })
    }
  })

  for (const scenario of GROUPING_HORIZONTAL_UNGROUP_EDITING_SCENARIOS) {
    test(scenario.title, async({
      editorModel,
      grouping,
      selection,
      shapes
    }) => {
      const initialShape = await shapes.getScaleSnapshot({ id: scenario.targetShapeId })

      await test.step('Сгруппировать оба шейпа и сузить группу по горизонтали', async() => {
        await editorModel.selectAllObjects()
        await grouping.groupActiveSelection()

        if (scenario.side === 'right') {
          await selection.scaleHorizontallyFromRight({
            scaleX: scenario.scaleX
          })
        } else {
          await selection.scaleHorizontallyFromLeft({
            scaleX: scenario.scaleX
          })
        }

        await selection.finishScale()
      })

      await test.step('Разгруппировать изменённую группу', async() => {
        const ungrouped = await grouping.ungroupActiveGroup()

        expect(ungrouped.activeObjectType).toBe('activeselection')
        expect(ungrouped.objectIds).toHaveLength(GROUPING_SHAPE_SEEDS.length)
        expect(ungrouped.objectIds).toContain(scenario.targetShapeId)
      })

      const resizedShape = await shapes.getScaleSnapshot({ id: scenario.targetShapeId })

      await test.step('Открыть редактирование текста внутри нужного шейпа', async() => {
        await shapes.select({ id: scenario.targetShapeId })
        await shapes.enterTextEditing({ id: scenario.targetShapeId })
        await shapes.updateEditingText({
          id: scenario.targetShapeId,
          text: GROUPING_EDITED_TEXT
        })
      })

      const editingShape = await shapes.getScaleSnapshot({ id: scenario.targetShapeId })

      await test.step('Проверить что после редактирования шейп не возвращается к исходной ширине', () => {
        expect(initialShape.groupBoundsWidth - resizedShape.groupBoundsWidth)
          .toBeGreaterThan(GROUPING_RESIZE_DELTA)
        expect(Math.abs(editingShape.groupBoundsWidth - resizedShape.groupBoundsWidth))
          .toBeLessThanOrEqual(GROUPING_SIZE_TOLERANCE)
        expect(Math.abs(editingShape.groupBoundsHeight - resizedShape.groupBoundsHeight))
          .toBeLessThanOrEqual(GROUPING_SIZE_TOLERANCE)

        shapes.checkNodeInsideGroup({
          snapshot: editingShape,
          kind: 'shape'
        })
        shapes.checkNodeInsideGroup({
          snapshot: editingShape,
          kind: 'text'
        })
      })
    })
  }

  for (const scenario of GROUPING_VERTICAL_UNGROUP_MOVE_SCENARIOS) {
    test(scenario.title, async({
      editorModel,
      grouping,
      selection,
      shapes,
      snapping
    }) => {
      const initialShape = await shapes.getScaleSnapshot({ id: scenario.targetShapeId })

      await test.step('Сгруппировать оба шейпа и сузить группу по вертикали', async() => {
        await editorModel.selectAllObjects()
        await grouping.groupActiveSelection()

        if (scenario.side === 'top') {
          await selection.scaleVerticallyFromTop({
            scaleY: scenario.scaleY
          })
        } else {
          await selection.scaleVerticallyFromBottom({
            scaleY: scenario.scaleY
          })
        }

        await selection.finishScale()
      })

      await test.step('Разгруппировать изменённую группу', async() => {
        const ungrouped = await grouping.ungroupActiveGroup()

        expect(ungrouped.activeObjectType).toBe('activeselection')
        expect(ungrouped.objectIds).toHaveLength(GROUPING_SHAPE_SEEDS.length)
        expect(ungrouped.objectIds).toContain(scenario.targetShapeId)
      })

      const resizedShape = await shapes.getScaleSnapshot({ id: scenario.targetShapeId })
      const resizedObject = await snapping.getObjectSnapshot({ id: scenario.targetShapeId })

      const movedObject = await test.step('Передвинуть нужный шейп после ungroup', async() => {
        await shapes.select({ id: scenario.targetShapeId })

        return snapping.moveObjectBoundsTo({
          id: scenario.targetShapeId,
          left: resizedObject.boundsLeft + scenario.moveLeftOffset,
          top: resizedObject.boundsTop + scenario.moveTopOffset
        })
      })

      const movedShape = await shapes.getScaleSnapshot({ id: scenario.targetShapeId })

      await test.step('Проверить что после перемещения шейп не возвращается к исходной высоте', () => {
        expect(initialShape.groupBoundsHeight - resizedShape.groupBoundsHeight)
          .toBeGreaterThan(GROUPING_RESIZE_DELTA)
        expect(Math.abs(movedShape.groupBoundsWidth - resizedShape.groupBoundsWidth))
          .toBeLessThanOrEqual(GROUPING_SIZE_TOLERANCE)
        expect(Math.abs(movedShape.groupBoundsHeight - resizedShape.groupBoundsHeight))
          .toBeLessThanOrEqual(GROUPING_SIZE_TOLERANCE)
        expect(Math.abs(movedObject.boundsLeft - resizedObject.boundsLeft))
          .toBeGreaterThan(1)
        expect(Math.abs(movedObject.boundsTop - resizedObject.boundsTop))
          .toBeGreaterThan(1)

        shapes.checkNodeInsideGroup({
          snapshot: movedShape,
          kind: 'shape'
        })
        shapes.checkNodeInsideGroup({
          snapshot: movedShape,
          kind: 'text'
        })
      })
    })
  }
})
