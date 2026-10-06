import CanvasManager from '../../../src/editor/canvas-manager'
import TemplateManager, { TemplateDefinition } from '../../../src/editor/template-manager'
import { createPlacementTestObject } from '../canvas/placement'
import { createEditorStub } from '../editor/editor-stub'

type BaseEditorStub = ReturnType<typeof createEditorStub>

type MontageBounds = {
  left: number
  top: number
  width: number
  height: number
}

type TemplateManagerEditorStub = BaseEditorStub & {
  montageArea: BaseEditorStub['montageArea'] & {
    getBoundingRect: jest.Mock
    getScaledWidth: jest.Mock
    getScaledHeight: jest.Mock
  }
  backgroundManager: BaseEditorStub['backgroundManager'] & {
    setColorBackground: jest.Mock
    setGradientBackground: jest.Mock
    setImageBackground: jest.Mock
    setPreparedImageBackground: jest.Mock
  }
}

/** Chain geometry with three exact gaps of 47.25 pixels. */
const EQUAL_FRACTIONAL_SPACING_GEOMETRY = [
  { center: 21.125, size: 102 },
  { center: 163, size: 87.25 },
  { center: 304.1875, size: 100.625 },
  { center: 452.75, size: 102 }
] as const

/** Axis of fractional equal spacing in the test template. */
type FractionalSpacingTemplateAxis = 'x' | 'y'

/** Builds a template and restored objects with equal fractional gaps. */
export function createFractionalSpacingTemplateScenario({
  axis
}: {
  axis: FractionalSpacingTemplateAxis
}) {
  const objects = EQUAL_FRACTIONAL_SPACING_GEOMETRY.map(({ center, size }, index) => ({
    id: `equal-spacing-${index + 1}`,
    type: 'rect',
    left: axis === 'x' ? center / 512 : 0.5,
    top: axis === 'y' ? center / 512 : 0.5,
    width: size,
    height: size,
    originX: 'center' as const,
    originY: 'center' as const
  }))
  const revivedObjects = objects.map((object) => Object.assign(
    createPlacementTestObject(object),
    {
      _templateAnchorX: 'start' as const,
      _templateAnchorY: 'center' as const
    }
  ))

  return {
    revivedObjects,
    template: {
      id: 'equal-fractional-spacing',
      meta: { baseWidth: 512, baseHeight: 512, positionsNormalized: true },
      objects
    } satisfies TemplateDefinition
  }
}

/**
 * Creates a TemplateManager setup with a configurable artboard and placement strategy.
 */
export const createTemplateManagerTestSetup = ({
  montageBounds = {
    left: 100,
    top: 50,
    width: 400,
    height: 300
  },
  useRealCanvasManager = false
}: {
  montageBounds?: MontageBounds
  useRealCanvasManager?: boolean
} = {}): {
  manager: TemplateManager
  editor: TemplateManagerEditorStub
} => {
  const {
    left,
    top,
    width,
    height
  } = montageBounds
  const editor = createEditorStub() as TemplateManagerEditorStub

  editor.montageArea.getBoundingRect = jest.fn(() => ({
    left,
    top,
    width,
    height
  }))
  editor.montageArea.width = width
  editor.montageArea.height = height
  editor.montageArea.left = left
  editor.montageArea.top = top
  editor.montageArea.getScaledWidth = jest.fn(() => width)
  editor.montageArea.getScaledHeight = jest.fn(() => height)

  editor.backgroundManager = {
    ...editor.backgroundManager,
    setColorBackground: jest.fn(),
    setGradientBackground: jest.fn(),
    setImageBackground: jest.fn(),
    setPreparedImageBackground: jest.fn()
  }

  if (useRealCanvasManager) {
    editor.canvasManager = new CanvasManager({ editor: editor as never }) as never
  }

  return {
    manager: new TemplateManager({ editor: editor as never }),
    editor
  }
}

/**
 * Creates a minimal template definition for shape-group insertion tests.
 */
export const createShapeTemplateDefinition = (): TemplateDefinition => ({
  id: 'template-1',
  meta: {
    baseWidth: 400,
    baseHeight: 300,
    positionsNormalized: true
  },
  objects: [
    {
      type: 'shape-group',
      left: 100,
      top: 100,
      shapePresetKey: 'square'
    }
  ]
})

/**
 * Creates a minimal template definition for centered standalone text with a top anchor.
 */
export const createStandaloneTextTemplateDefinition = (): TemplateDefinition => ({
  id: 'template-standalone-text',
  meta: {
    baseWidth: 810,
    baseHeight: 1080,
    positionsNormalized: true
  },
  objects: [
    {
      type: 'background-textbox',
      left: 0.03209876543209877,
      top: 0.04351851851851852,
      width: 758,
      originX: 'left',
      originY: 'top',
      _templateAnchorX: 'center',
      _templateAnchorY: 'start'
    }
  ]
})

/**
 * Creates a template containing an image for testing restoration and placement.
 */
export const createImageTemplateDefinition = ({
  left,
  top,
  width,
  height,
  positionsNormalized = true,
  src,
  imageFit,
  imageCrop,
  legacyCropMode = false,
  scaleX = 1,
  scaleY = 1,
  cropX = 0,
  cropY = 0
}: {
  left: number
  top: number
  width: number
  height: number
  positionsNormalized?: boolean
  src?: string
  imageFit?: 'contain' | 'stretch'
  imageCrop?: {
    source: string
    sourceWidth: number
    sourceHeight: number
  }
  legacyCropMode?: boolean
  scaleX?: number
  scaleY?: number
  cropX?: number
  cropY?: number
}): TemplateDefinition => ({
  id: 'template-image-placement',
  meta: {
    baseWidth: 810,
    baseHeight: 1080,
    positionsNormalized
  },
  objects: [
    {
      type: 'image',
      src,
      id: 'template-image',
      left,
      top,
      width,
      height,
      originX: 'left',
      originY: 'top',
      scaleX,
      scaleY,
      cropX,
      cropY,
      customData: imageFit || imageCrop || legacyCropMode
        ? {
          imageFit: legacyCropMode ? 'crop' : imageFit,
          imageCrop
        } as TemplateDefinition['objects'][number]['customData']
        : undefined
    }
  ]
})

/**
 * Creates a template definition with an image background and one content object.
 */
export const createImageBackgroundTemplateDefinition = ({
  source,
  customData = {}
}: {
  source?: unknown
  customData?: Record<string, unknown>
}): TemplateDefinition => {
  const backgroundObject: TemplateDefinition['objects'][number] = {
    type: 'image',
    id: 'background',
    backgroundType: 'image',
    customData
  }

  if (source !== undefined) {
    backgroundObject.src = source
  }

  return {
    id: 'template-with-image-background',
    meta: {
      baseWidth: 400,
      baseHeight: 300,
      positionsNormalized: true
    },
    objects: [
      backgroundObject,
      { type: 'shape-group', left: 100, top: 100, shapePresetKey: 'square' }
    ]
  }
}
