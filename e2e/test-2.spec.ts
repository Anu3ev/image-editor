import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test.use({ ignoreHTTPSErrors: true })

const bypassCertificateWarning = async({ page }: { page: Page }): Promise<void> => {
  const isCertificateInterstitial = page.url().startsWith('chrome-error://chromewebdata/')
  if (!isCertificateInterstitial) return

  const advancedButton = page.getByRole('button', { name: /Дополнительные настройки|Advanced/i })
  const hasAdvancedButton = await advancedButton.count()
  if (hasAdvancedButton > 0) {
    await advancedButton.first().click()
  } else {
    const detailsButton = page.locator('#details-button')
    const hasDetailsButton = await detailsButton.count()
    if (hasDetailsButton > 0) {
      await detailsButton.click()
    }
  }

  const proceedLink = page.getByRole('link', { name: /Перейти на сайт|Proceed to|unsafe/i })
  const hasProceedLink = await proceedLink.count()
  if (hasProceedLink > 0) {
    await proceedLink.first().click()
    return
  }

  const proceedById = page.locator('#proceed-link')
  const hasProceedById = await proceedById.count()
  if (hasProceedById > 0) {
    await proceedById.click()
  }
}

const TEMPLATE_FIXTURE = {
  id: 'template-rL55pnkZIlc-2dt2OYpsk',
  meta: {
    baseWidth: 512,
    baseHeight: 512,
    positionsNormalized: true
  },
  objects: [
    {
      rx: 0,
      ry: 0,
      id: 'rect-w3pmR17QpZN9mAKQDBkaa',
      width: 100,
      height: 100,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      type: 'Rect',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.1484375,
      top: 0.2890625,
      fill: 'blue',
      stroke: null,
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: false,
      strokeMiterLimit: 4,
      scaleX: 0.3294,
      scaleY: 0.4292,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.18092288011695912,
      _templateCenterY: 0.3313919346978558,
      _templateAnchorX: 'start',
      _templateAnchorY: 'start'
    },
    {
      rx: 0,
      ry: 0,
      id: 'rect-2oV0Qygm_kEs7pGSAH0hx',
      width: 100,
      height: 100,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      type: 'Rect',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.080078125,
      top: 0.11328125,
      fill: 'blue',
      stroke: null,
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: false,
      strokeMiterLimit: 4,
      scaleX: 1.028,
      scaleY: 0.489,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.18147188718323592,
      _templateCenterY: 0.16151711744639374,
      _templateAnchorX: 'start',
      _templateAnchorY: 'start'
    },
    {
      rx: 0,
      ry: 0,
      id: 'rect-j-cTQrzfnl_WL9fcDIkFR',
      width: 100,
      height: 100,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      type: 'Rect',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.080078125,
      top: 0.4765625,
      fill: 'blue',
      stroke: null,
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: false,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.17871555190058475,
      _templateCenterY: 0.5751999269005847,
      _templateAnchorX: 'start',
      _templateAnchorY: 'end'
    },
    {
      rx: 0,
      ry: 0,
      id: 'rect-1N37Sr8MvR4jQnSFkZkNq',
      width: 100,
      height: 100,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      type: 'Rect',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.126953125,
      top: 0.77734375,
      fill: 'blue',
      stroke: null,
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: false,
      strokeMiterLimit: 4,
      scaleX: 0.52,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.17824064936647177,
      _templateCenterY: 0.8759811769005847,
      _templateAnchorX: 'start',
      _templateAnchorY: 'end'
    },
    {
      rx: 0,
      ry: 0,
      id: 'rect-qTsAXMgg1qmBuUUa6CsLE',
      width: 100,
      height: 100,
      evented: true,
      selectable: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      type: 'Rect',
      version: '6.9.1',
      originX: 'left',
      originY: 'top',
      left: 0.1471734892787524,
      top: -0.050682261208576995,
      fill: 'blue',
      stroke: null,
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: false,
      strokeMiterLimit: 4,
      scaleX: 0.3294,
      scaleY: 0.4292,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      _templateCenterX: 0.17965886939571152,
      _templateCenterY: -0.008352826510721223,
      _templateAnchorX: 'start',
      _templateAnchorY: 'start'
    }
  ]
}

test('equal spacing: два снапа 41 и ALT замер 47 для третьего объекта', async({ page }) => {
  await page.goto('https://localhost:5173/')
  await bypassCertificateWarning({ page })

  await page.waitForFunction(() => {
    const editor = (window as any).editor
    return Boolean(editor?.canvas && editor?.templateManager)
  })

  await page.locator('#montage-width-input').fill('512')
  await page.locator('#montage-height-input').fill('512')
  await page.locator('#apply-montage-resolution-btn').click()
  await expect(page.locator('#montage-area-resolution')).toHaveText('512x512')

  await page.locator('#template-json-input').fill(JSON.stringify(TEMPLATE_FIXTURE))
  await page.locator('#apply-template-btn').click()
  await page.waitForFunction(() => {
    const editor = (window as any).editor
    if (!editor?.canvas) return false

    const objects = editor.canvas.getObjects().filter((object: any) => {
      const isInteractiveRect = object?.type === 'rect'
        && object?.selectable === true
        && object?.evented === true
      return Boolean(isInteractiveRect)
    })

    return objects.length >= 5
  })
  await page.evaluate(() => {
    const editor = (window as any).editor
    const canvas = editor?.canvas
    if (!canvas) return

    canvas.discardActiveObject()
    canvas.requestRenderAll()
  })

  const result = await page.evaluate(() => {
    const editor = (window as any).editor
    const canvas = editor.canvas
    const getBounds = (object: any) => object.getBoundingRect(false, true)
    const getTopSortedObjects = () => {
      const objects = canvas.getObjects().filter((object: any) => {
        const isInteractiveRect = object?.type === 'rect'
          && object?.selectable === true
          && object?.evented === true

        return Boolean(isInteractiveRect)
      })
      objects.sort((a: any, b: any) => getBounds(a).top - getBounds(b).top)
      return objects
    }

    const objects = getTopSortedObjects()
    if (objects.length < 5) {
      throw new Error(`Expected at least 5 objects, received ${objects.length}`)
    }

    const columnCenters = objects.slice(0, 5).map((object: any) => {
      const bounds = getBounds(object)
      return bounds.left + (bounds.width / 2)
    })
    const minCenterX = Math.min(...columnCenters)
    const maxCenterX = Math.max(...columnCenters)

    const target = objects[2]
    const snappingManager = editor.snappingManager
    const measurementManager = editor.measurementManager

    canvas.discardActiveObject()
    canvas.setActiveObject(target)
    target.setCoords()
    canvas.requestRenderAll()

    snappingManager._handleMouseDown({ target })

    const initialTop = target.top
    const hitStates: Array<{ top: number; distance: number }> = []
    const encounteredDisplayDistances: number[] = []

    for (let offset = -220; offset <= 220; offset += 1) {
      target.set({ top: initialTop + offset })
      target.setCoords()
      snappingManager._handleObjectMoving({ target })

      const guides = (snappingManager as any).activeSpacingGuides ?? []
      const verticalGuide = guides.find((guide: any) => guide.type === 'vertical')
      const distance = verticalGuide?.distance
      const displayDistance = Number.isFinite(distance)
        ? Math.round(Math.max(0, distance))
        : null

      if (displayDistance !== null && !encounteredDisplayDistances.includes(displayDistance)) {
        encounteredDisplayDistances.push(displayDistance)
      }

      if (displayDistance === 41) {
        hitStates.push({ top: target.top, distance: displayDistance })
      }
    }

    const uniqueTops: number[] = []
    for (const state of hitStates) {
      const exists = uniqueTops.some((top) => Math.abs(top - state.top) < 0.001)
      if (!exists) {
        uniqueTops.push(state.top)
      }
    }

    if (uniqueTops.length < 2) {
      const debugDistances = encounteredDisplayDistances.sort((a, b) => a - b).join(', ')
      throw new Error(`Expected at least 2 different snap positions with distance 41, received ${uniqueTops.length}. Encountered display distances: [${debugDistances}]`)
    }

    target.set({ top: uniqueTops[uniqueTops.length - 1] })
    target.setCoords()
    snappingManager._handleObjectMoving({ target })

    const afterMoveObjects = getTopSortedObjects()
    const targetIndex = afterMoveObjects.findIndex((object: any) => object === target)
    if (targetIndex <= 0 || targetIndex >= afterMoveObjects.length - 1) {
      throw new Error('Target object is not between two neighbors for vertical measurement')
    }

    const upperNeighbor = afterMoveObjects[targetIndex - 1]
    const lowerNeighbor = afterMoveObjects[targetIndex + 1]

    canvas.setActiveObject(target)
    target.setCoords()
    measurementManager.isAltPressed = true
    measurementManager._updateGuides({
      event: {
        e: { altKey: true },
        target: upperNeighbor
      }
    })

    const measurementGuides = (measurementManager as any).activeGuides ?? []
    const verticalMeasurementGuide = measurementGuides.find((guide: any) => guide.type === 'vertical')
    const measuredDistance = verticalMeasurementGuide?.distance ?? null

    const upperBounds = getBounds(upperNeighbor)
    const targetBounds = getBounds(target)
    const lowerBounds = getBounds(lowerNeighbor)
    const gapAbove = Math.round(targetBounds.top - (upperBounds.top + upperBounds.height))
    const gapBelow = Math.round(lowerBounds.top - (targetBounds.top + targetBounds.height))

    return {
      objectCount: objects.length,
      isSingleColumn: (maxCenterX - minCenterX) < 40,
      snap41Positions: uniqueTops.length,
      measuredDistance,
      gapAbove,
      gapBelow
    }
  })

  expect(result.objectCount).toBeGreaterThanOrEqual(5)
  expect(result.isSingleColumn).toBeTruthy()
  expect(result.snap41Positions).toBeGreaterThanOrEqual(2)
  expect(result.measuredDistance).toBe(41)
  expect(result.gapAbove).toBe(41)
  expect(result.gapBelow).toBe(53)
})
