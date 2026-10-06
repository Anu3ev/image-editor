import FontManager from '../../../src/editor/font-manager'
import type { EditorFontDefinition } from '../../../src/editor/types/font'

type FontFaceRegistryEntry = Record<string, unknown>

/**
 * Parameters for setting up the FontManager test environment.
 */
export type FontManagerTestSetupOptions = {
  fonts?: EditorFontDefinition[]
  existingFontFaces?: FontFaceRegistryEntry[]
}

const createTrackedHeadAppendChildSpy = () => {
  const appendedNodes: Node[] = []
  const originalAppendChild = document.head.appendChild.bind(document.head)
  const appendChildSpy = jest
    .spyOn(document.head, 'appendChild')
    .mockImplementation((node: Node) => {
      appendedNodes.push(node)
      return originalAppendChild(node)
    })

  return {
    appendedNodes,
    appendChildSpy
  }
}

const createDocumentFontSetStub = (existingFontFaces: FontFaceRegistryEntry[]) => ({
  add: jest.fn(),
  forEach: jest.fn((callback: (fontFace: FontFaceRegistryEntry) => void) => {
    existingFontFaces.forEach((fontFace) => callback(fontFace))
  })
})

const setDocumentFontSet = (fontSet: ReturnType<typeof createDocumentFontSetStub>) => {
  const originalFontSet = Reflect.get(document, 'fonts')

  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: fontSet
  })

  return originalFontSet
}

const restoreDocumentFontSet = (originalFontSet: unknown) => {
  if (originalFontSet !== undefined) {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: originalFontSet
    })
    return
  }

  Reflect.deleteProperty(document, 'fonts')
}

const restoreGlobalFontFace = (originalFontFace: unknown) => {
  if (originalFontFace === undefined) {
    Reflect.deleteProperty(globalThis, 'FontFace')
    return
  }

  Reflect.set(globalThis, 'FontFace', originalFontFace)
}

const removeAppendedNodes = (nodes: Node[]) => {
  nodes.forEach((node) => {
    if (node.parentNode) {
      node.parentNode.removeChild(node)
    }
  })
}

/**
 * Starts FontManager in the test environment together with the DOM dependencies
 * it uses to register fonts.
 */
export const createFontManagerTestSetup = (
  options: FontManagerTestSetupOptions = {}
) => {
  const {
    fonts = [],
    existingFontFaces = []
  } = options

  const { appendedNodes, appendChildSpy } = createTrackedHeadAppendChildSpy()
  const fontSet = createDocumentFontSetStub(existingFontFaces)
  const originalFontSet = setDocumentFontSet(fontSet)
  const fontManager = new FontManager(fonts)
  const originalFontFace = Reflect.get(globalThis, 'FontFace')

  const restore = () => {
    appendChildSpy.mockRestore()
    removeAppendedNodes(appendedNodes)
    restoreDocumentFontSet(originalFontSet)
    restoreGlobalFontFace(originalFontFace)
  }

  const setFontFaceMock = (implementation?: unknown) => {
    if (implementation === undefined) {
      Reflect.deleteProperty(globalThis, 'FontFace')
    } else {
      Reflect.set(globalThis, 'FontFace', implementation)
    }
  }

  return {
    fontManager,
    appendChildSpy,
    fontSet,
    styleElements: appendedNodes,
    restore,
    setFontFaceMock
  }
}

/**
 * Resets FontManager's static registry between tests.
 */
export const resetFontManagerRegistry = () => {
  const registry = Reflect.get(FontManager, 'registeredFontKeys') as Set<string> | undefined

  if (registry && typeof registry.clear === 'function') {
    registry.clear()
    return
  }

  Reflect.set(FontManager, 'registeredFontKeys', new Set<string>())
}
