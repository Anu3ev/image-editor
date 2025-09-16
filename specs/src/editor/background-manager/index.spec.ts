import BackgroundManager from '../../../src/editor/background-manager'
import { ImageEditor } from '../../../src/editor/index'
import { createEditor } from '../../test-utils/editor-helpers'

describe('BackgroundManager', () => {
  let editor: ImageEditor
  let backgroundManager: BackgroundManager

  beforeEach(() => {
    document.body.innerHTML = '<canvas id="test-canvas"></canvas>'
    editor = createEditor('test-canvas')
    backgroundManager = editor.backgroundManager
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('initialization', () => {
    it('should be initialized correctly', () => {
      expect(backgroundManager.editor).toBe(editor)
      expect(backgroundManager.backgroundObject).toBeNull()
      expect(backgroundManager.backgroundType).toBeNull()
    })
  })

  describe('setColorBackground', () => {
    it('should create a color background', () => {
      const color = '#FF0000'

      backgroundManager.setColorBackground(color)

      expect(backgroundManager.backgroundObject).toBeTruthy()
      expect(backgroundManager.backgroundType).toBe('color')
      expect(backgroundManager.backgroundObject?.get('fill')).toBe(color)
      expect(backgroundManager.backgroundObject?.get('selectable')).toBe(false)
      expect(backgroundManager.backgroundObject?.get('evented')).toBe(false)
    })

    it('should update existing color background', () => {
      const firstColor = '#FF0000'
      const secondColor = '#00FF00'

      backgroundManager.setColorBackground(firstColor)
      const firstBackground = backgroundManager.backgroundObject

      backgroundManager.setColorBackground(secondColor)
      const secondBackground = backgroundManager.backgroundObject

      expect(firstBackground).toBe(secondBackground) // Same object
      expect(backgroundManager.backgroundObject?.get('fill')).toBe(secondColor)
    })

    it('should replace non-color background', () => {
      const gradientCSS = 'linear-gradient(135deg, #FF0000 0%, #00FF00 100%)'
      const color = '#0000FF'

      backgroundManager.setGradientBackground(gradientCSS)
      const gradientBackground = backgroundManager.backgroundObject

      backgroundManager.setColorBackground(color)
      const colorBackground = backgroundManager.backgroundObject

      expect(gradientBackground).not.toBe(colorBackground) // Different objects
      expect(backgroundManager.backgroundType).toBe('color')
    })
  })

  describe('setGradientBackground', () => {
    it('should create a gradient background', () => {
      const gradientCSS = 'linear-gradient(135deg, #FF0000 0%, #00FF00 100%)'

      backgroundManager.setGradientBackground(gradientCSS)

      expect(backgroundManager.backgroundObject).toBeTruthy()
      expect(backgroundManager.backgroundType).toBe('gradient')
      expect(backgroundManager.backgroundObject?.get('selectable')).toBe(false)
      expect(backgroundManager.backgroundObject?.get('evented')).toBe(false)
    })

    it('should handle invalid gradient format', () => {
      const invalidGradient = 'invalid-gradient-format'

      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        backgroundManager.setGradientBackground(invalidGradient)
      }).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('removeBackground', () => {
    it('should remove existing background', () => {
      const color = '#FF0000'

      backgroundManager.setColorBackground(color)
      expect(backgroundManager.backgroundObject).toBeTruthy()

      backgroundManager.removeBackground()
      expect(backgroundManager.backgroundObject).toBeNull()
      expect(backgroundManager.backgroundType).toBeNull()
    })

    it('should handle removal when no background exists', () => {
      // Mock console.warn to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => {
        backgroundManager.removeBackground()
      }).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('refresh', () => {
    it('should update background position and size', () => {
      const color = '#FF0000'

      backgroundManager.setColorBackground(color)

      expect(() => {
        backgroundManager.refresh()
      }).not.toThrow()
    })

    it('should handle refresh with no background', () => {
      expect(() => {
        backgroundManager.refresh()
      }).not.toThrow()
    })
  })

  describe('events', () => {
    it('should fire background:changed event when color is set', (done) => {
      const color = '#FF0000'

      editor.canvas.on('background:changed', (event) => {
        expect(event.type).toBe('color')
        expect(event.color).toBe(color)
        done()
      })

      backgroundManager.setColorBackground(color)
    })

    it('should fire background:removed event when background is removed', (done) => {
      const color = '#FF0000'

      backgroundManager.setColorBackground(color)

      editor.canvas.on('background:removed', () => {
        done()
      })

      backgroundManager.removeBackground()
    })
  })
})
