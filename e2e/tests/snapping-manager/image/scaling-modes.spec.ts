import { test, expect } from '../../../fixtures/image-scaling.fixture'
import {
  SNAPPING_IMAGE_SCALE_HOLD_OFFSETS_PX
} from '../../../fixtures/data/snapping-image-scaling.data'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'

/** Угол representative-проверок повёрнутого Image. */
const IMAGE_SCALE_ROTATION_DEGREES = 30

/** Толщина обычной масштабируемой обводки в scale-сценарии Image. */
const IMAGE_SCALE_STROKE_WIDTH = 6

/** Цвет обычной масштабируемой обводки в scale-сценарии Image. */
const IMAGE_SCALE_STROKE_COLOR = '#246bfd'

test('повёрнутое изображение прилипает внешней гранью при скейлинге за боковую ручку', async({
  imageScaleReferenceSetup: setup,
  images,
  snapping
}) => {
  await images.setAngle({
    angle: IMAGE_SCALE_ROTATION_DEGREES,
    id: setup.imageId
  })

  const started = await images.scaling.startFromControl({
    control: 'mr',
    id: setup.imageId
  })
  const fixedBefore = started.controlPoints.ml
  const live = await images.scaling.dragRotatedControlToBoundsRight({
    boundsRight: setup.guides.right
  })
  const guides = await snapping.getGuideState()

  expect(live.angle).toBeCloseTo(IMAGE_SCALE_ROTATION_DEGREES, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.controlPoints.ml.x).toBeCloseTo(fixedBefore.x, 5)
  expect(live.controlPoints.ml.y).toBeCloseTo(fixedBefore.y, 5)
  expect(live.width).toBe(started.width)
  expect(live.height).toBe(started.height)
  expect(live.scaleY).toBeCloseTo(started.scaleY, 5)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.right
  }])
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })

  expect(committed).toEqual(live)
  expect(committed.controlPoints.ml.x).toBeCloseTo(fixedBefore.x, 5)
})

test('повёрнутое изображение прилипает внешней гранью при скейлинге за угол', async({
  imageScaleReferenceSetup: setup,
  images,
  snapping
}) => {
  await images.setAngle({
    angle: IMAGE_SCALE_ROTATION_DEGREES,
    id: setup.imageId
  })

  const started = await images.scaling.startFromControl({
    control: 'br',
    id: setup.imageId
  })
  const fixedBefore = started.controlPoints.tl
  const live = await images.scaling.dragRotatedControlToBoundsRight({
    boundsRight: setup.guides.right
  })
  const guides = await snapping.getGuideState()
  const scaleXMultiplier = live.scaleX / started.scaleX
  const scaleYMultiplier = live.scaleY / started.scaleY

  expect(live.angle).toBeCloseTo(IMAGE_SCALE_ROTATION_DEGREES, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.controlPoints.tl.x).toBeCloseTo(fixedBefore.x, 5)
  expect(live.controlPoints.tl.y).toBeCloseTo(fixedBefore.y, 5)
  expect(scaleXMultiplier).toBeCloseTo(scaleYMultiplier, 5)
  expect(scaleXMultiplier).toBeGreaterThan(1)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.right
  }])
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })

  expect(committed).toEqual(live)
  expect(committed.controlPoints.tl.y).toBeCloseTo(fixedBefore.y, 5)
})

test('при скейлинге относительно центра за боковую ручку сохраняет центр и прилипает симметрично', async({
  imageScaleReferenceSetup: setup,
  images,
  snapping
}) => {
  const started = await images.scaling.startFromControl({
    altKey: true,
    control: 'mr',
    id: setup.imageId
  })
  const live = await images.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: started.controlPoints.mr.y
    }
  })
  const guides = await snapping.getGuideState()
  const leftGrowth = started.boundsLeft - live.boundsLeft
  const rightGrowth = live.boundsRight - started.boundsRight

  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(live.centerPoint.x).toBeCloseTo(started.centerPoint.x, 5)
  expect(live.centerPoint.y).toBeCloseTo(started.centerPoint.y, 5)
  expect(leftGrowth).toBeCloseTo(rightGrowth, 5)
  expect(live.scaleY).toBeCloseTo(started.scaleY, 5)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.left
  }])
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })

  expect(committed).toEqual(live)
  expect(committed.centerPoint.x).toBeCloseTo(started.centerPoint.x, 5)
})

test('при скейлинге относительно центра за угол сохраняет центр и прилипает по обеим осям', async({
  imageScaleReferenceSetup: setup,
  images,
  snapping
}) => {
  const started = await images.scaling.startFromControl({
    altKey: true,
    control: 'br',
    id: setup.imageId
  })
  const live = await images.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.guides.bottom
    }
  })
  const guides = await snapping.getGuideState()
  const scaleXMultiplier = live.scaleX / started.scaleX
  const scaleYMultiplier = live.scaleY / started.scaleY

  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.boundsBottom).toBeCloseTo(setup.guides.bottom, 5)
  expect(live.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(live.boundsTop).toBeCloseTo(setup.guides.top, 5)
  expect(live.centerPoint.x).toBeCloseTo(started.centerPoint.x, 5)
  expect(live.centerPoint.y).toBeCloseTo(started.centerPoint.y, 5)
  expect(scaleXMultiplier).toBeCloseTo(scaleYMultiplier, 5)
  expect(scaleXMultiplier).toBeGreaterThan(1)
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.guides.left },
    { type: 'horizontal', position: setup.guides.top }
  ]))
  expect(guides.guides).toHaveLength(2)

  const committed = await images.scaling.finish({ id: setup.imageId })

  expect(committed).toEqual(live)
  expect(committed.centerPoint.y).toBeCloseTo(started.centerPoint.y, 5)
})

test('с Shift свободно меняет обе оси за угол и удерживает две направляющие', async({
  imageScaleReferenceSetup: setup,
  images,
  snapping
}) => {
  const started = await images.scaling.startFromControl({
    control: 'br',
    id: setup.imageId
  })
  const live = await images.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.guides.bottomOuter
    },
    shiftKey: true
  })
  const guides = await snapping.getGuideState()
  const scaleXMultiplier = live.scaleX / started.scaleX
  const scaleYMultiplier = live.scaleY / started.scaleY

  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.boundsBottom).toBeCloseTo(setup.guides.bottomOuter, 5)
  expect(scaleXMultiplier).not.toBeCloseTo(scaleYMultiplier, 3)
  expect(scaleXMultiplier).toBeGreaterThan(1)
  expect(scaleYMultiplier).toBeGreaterThan(scaleXMultiplier)
  expect(live.controlPoints.tl).toEqual(started.controlPoints.tl)
  expect(guides.guides).toHaveLength(2)
  expect(guides.guides.find(({ type }) => type === 'vertical')?.position)
    .toBeCloseTo(setup.guides.right, 5)
  expect(guides.guides.find(({ type }) => type === 'horizontal')?.position)
    .toBeCloseTo(setup.guides.bottomOuter, 5)
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })

  expect(committed).toEqual(live)
  expect(committed.controlPoints.tl).toEqual(started.controlPoints.tl)
})

test('за угол удерживает две направляющие на нескольких микродвижениях', async({ imageScaleReferenceSetup: setup, images, snapping }) => {
  const { started, acquired } = await test.step('Прилипнуть к двум направляющим', async() => {
    const startedSnapshot = await images.scaling.startFromControl({
      control: 'br',
      id: setup.imageId,
      shiftKey: true
    })
    const acquiredSnapshot = await images.scaling.dragControlToScenePoint({
      point: {
        x: setup.guides.right,
        y: setup.guides.bottom
      }
    })

    expect(acquiredSnapshot.boundsRight).toBeCloseTo(setup.guides.right, 5)
    expect(acquiredSnapshot.boundsBottom).toBeCloseTo(setup.guides.bottom, 5)

    return {
      acquired: acquiredSnapshot,
      started: startedSnapshot
    }
  })

  await test.step('Удержать обе направляющие и завершить жест', async() => {
    for (const offset of SNAPPING_IMAGE_SCALE_HOLD_OFFSETS_PX) {
      const held = await images.scaling.dragControlToScenePoint({
        point: {
          x: setup.guides.right + (offset * setup.scenePixel),
          y: setup.guides.bottom + (offset * setup.scenePixel)
        }
      })
      const guides = await snapping.getGuideState()

      expect(held.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
      expect(held.boundsBottom).toBeCloseTo(acquired.boundsBottom, 5)
      expect(held.scaleX).toBeCloseTo(acquired.scaleX, 5)
      expect(held.scaleY).toBeCloseTo(acquired.scaleY, 5)
      expect(guides.guides).toHaveLength(2)
      expect(guides.spacingGuides).toHaveLength(0)
    }

    const committed = await images.scaling.finish({ id: setup.imageId })
    const clearedGuides = await snapping.getGuideState()

    expect(committed.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
    expect(committed.boundsBottom).toBeCloseTo(acquired.boundsBottom, 5)
    expect(committed.scaleX).toBeCloseTo(acquired.scaleX, 5)
    expect(committed.scaleY).toBeCloseTo(acquired.scaleY, 5)
    expect(committed.controlPoints.tl).toEqual(started.controlPoints.tl)
    expect(clearedGuides.guides).toHaveLength(0)
    expect(clearedGuides.spacingGuides).toHaveLength(0)
  })
})

test('за угол отпускает направляющие независимо по каждой оси', async({ imageScaleReferenceSetup: setup, images, snapping }) => {
  const { started, acquired } = await test.step('Прилипнуть к двум направляющим', async() => {
    const startedSnapshot = await images.scaling.startFromControl({
      control: 'br',
      id: setup.imageId,
      shiftKey: true
    })
    const acquiredSnapshot = await images.scaling.dragControlToScenePoint({
      point: {
        x: setup.guides.right,
        y: setup.guides.bottom
      }
    })

    expect(acquiredSnapshot.boundsRight).toBeCloseTo(setup.guides.right, 5)
    expect(acquiredSnapshot.boundsBottom).toBeCloseTo(setup.guides.bottom, 5)

    return { acquired: acquiredSnapshot, started: startedSnapshot }
  })

  const released = await test.step('Сначала отпустить X, затем Y', async() => {
    const releaseDistance = 30 * setup.scenePixel
    const releasedX = await images.scaling.dragControlToScenePoint({
      point: {
        x: setup.guides.right + releaseDistance,
        y: setup.guides.bottom + (2 * setup.scenePixel)
      }
    })
    const heldYGuides = await snapping.getGuideState()

    expect(Math.abs(releasedX.boundsRight - acquired.boundsRight))
      .toBeGreaterThan(SNAPPING_TOLERANCE.position)
    expect(releasedX.boundsBottom).toBeCloseTo(acquired.boundsBottom, 5)
    expect(heldYGuides.guides).toEqual([{ type: 'horizontal', position: setup.guides.bottom }])
    expect(heldYGuides.spacingGuides).toHaveLength(0)

    const releasedBoth = await images.scaling.dragControlToScenePoint({
      point: {
        x: setup.guides.right + releaseDistance,
        y: setup.guides.bottom + releaseDistance
      }
    })
    const releasedGuides = await snapping.getGuideState()

    expect(Math.abs(releasedBoth.boundsBottom - acquired.boundsBottom))
      .toBeGreaterThan(SNAPPING_TOLERANCE.position)
    expect(releasedBoth.controlPoints.tl).toEqual(started.controlPoints.tl)
    expect(releasedGuides.guides).toHaveLength(0)
    expect(releasedGuides.spacingGuides).toHaveLength(0)

    return releasedBoth
  })

  await test.step('Сохранить геометрию после mouseup', async() => {
    const committed = await images.scaling.finish({ id: setup.imageId })

    expect(committed).toEqual(released)
    expect(committed.controlPoints.tl).toEqual(started.controlPoints.tl)
  })
})

test('изображение с обычной обводкой прилипает внешней границей и сохраняет геометрию после mouseup', async({
  imageScaleReferenceSetup: setup,
  images,
  snapping
}) => {
  const stroked = await images.setStroke({
    id: setup.imageId,
    stroke: IMAGE_SCALE_STROKE_COLOR,
    strokeWidth: IMAGE_SCALE_STROKE_WIDTH
  })
  const started = await images.scaling.startFromControl({
    control: 'mr',
    id: setup.imageId
  })
  const fixedBefore = started.controlPoints.ml
  const live = await images.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: started.controlPoints.mr.y
    }
  })
  const guides = await snapping.getGuideState()

  expect(stroked.boundsWidth).toBeGreaterThan(setup.baseline.boundsWidth)
  expect(stroked.width).toBe(setup.baseline.width)
  expect(started).toEqual(stroked)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.controlPoints.ml.x).toBeCloseTo(fixedBefore.x, 5)
  expect(live.controlPoints.ml.y).toBeCloseTo(fixedBefore.y, 5)
  expect(live.width).toBe(started.width)
  expect(live.height).toBe(started.height)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.right
  }])
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })
  const clearedGuides = await snapping.getGuideState()

  expect(committed).toEqual(live)
  expect(committed.controlPoints.ml).toEqual(live.controlPoints.ml)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('с Shift боковая ручка переключается на skew и очищает гайды скейлинга', async({
  imageScaleReferenceSetup: setup,
  images,
  snapping
}) => {
  await images.scaling.startFromControl({
    control: 'mr',
    id: setup.imageId
  })
  const snapped = await images.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.baseline.controlPoints.mr.y
    }
  })
  const snappedGuides = await snapping.getGuideState()

  expect(snapped.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(snappedGuides.guides).toHaveLength(1)

  const skewed = await images.scaling.dragControlBy({
    deltaX: 0,
    deltaY: 20,
    shiftKey: true
  })
  const clearedGuides = await snapping.getGuideState()

  expect(Math.abs(skewed.skewY)).toBeGreaterThan(0.1)
  expect(skewed.skewX).toBeCloseTo(0, 5)
  expect(skewed.scaleX).toBeCloseTo(snapped.scaleX, 5)
  expect(skewed.scaleY).toBeCloseTo(snapped.scaleY, 5)
  expect(skewed.width).toBe(snapped.width)
  expect(skewed.height).toBe(snapped.height)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })

  expect(committed).toEqual(skewed)
  expect(committed.skewY).toBeCloseTo(skewed.skewY, 5)
})

test('после zoom и pan прилипает за угол в координатах сцены', async({
  editorModel,
  imageScaleReferenceSetup: setup,
  images,
  snapping
}) => {
  const viewportBefore = await editorModel.getCanvasViewportTransform()

  await editorModel.zoomInUntilViewportCanMove()
  await editorModel.dragViewportBySpaceMouse({
    deltaX: -24,
    deltaY: -18
  })

  const viewportAfter = await editorModel.getCanvasViewportTransform()
  const started = await images.scaling.startFromControl({
    control: 'br',
    id: setup.imageId
  })
  const live = await images.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.guides.bottom
    }
  })
  const guides = await snapping.getGuideState()

  expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
  expect(viewportAfter.x).not.toBeCloseTo(viewportBefore.x, 5)
  expect(viewportAfter.y).not.toBeCloseTo(viewportBefore.y, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.boundsBottom).toBeCloseTo(setup.guides.bottom, 5)
  expect(live.controlPoints.tl).toEqual(started.controlPoints.tl)
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.guides.right },
    { type: 'horizontal', position: setup.guides.bottom }
  ]))
  expect(guides.guides).toHaveLength(2)

  const committed = await images.scaling.finish({ id: setup.imageId })

  expect(committed).toEqual(live)
  expect(committed.controlPoints.tl).toEqual(started.controlPoints.tl)
})
