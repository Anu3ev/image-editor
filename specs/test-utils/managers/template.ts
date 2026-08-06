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

/** Геометрия цепочки с тремя точными интервалами 47,25 пикселя. */
const EQUAL_FRACTIONAL_SPACING_GEOMETRY = [
  { center: 21.125, size: 102 },
  { center: 163, size: 87.25 },
  { center: 304.1875, size: 100.625 },
  { center: 452.75, size: 102 }
] as const

/** Ось дробной равноудалённости в тестовом шаблоне. */
type FractionalSpacingTemplateAxis = 'x' | 'y'

/** Собирает шаблон и восстановленные объекты с равными дробными интервалами. */
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
 * Создаёт TemplateManager setup с настраиваемой монтажной областью и placement-стратегией.
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
 * Создаёт минимальный template definition для тестов вставки shape-group.
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
 * Создаёт минимальный template definition для centered standalone text с top-anchor.
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
 * Создаёт image template definition для проверок rehydration и placement.
 */
export const createImageTemplateDefinition = ({
  left,
  top,
  width,
  height,
  positionsNormalized = true,
  imageFit
}: {
  left: number
  top: number
  width: number
  height: number
  positionsNormalized?: boolean
  imageFit?: 'contain' | 'stretch'
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
      id: 'template-image',
      left,
      top,
      width,
      height,
      originX: 'left',
      originY: 'top',
      scaleX: 1,
      scaleY: 1,
      customData: imageFit
        ? {
          imageFit
        }
        : undefined
    }
  ]
})

/**
 * Создаёт template definition с image-фоном и одним content-объектом.
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
