import type { CanvasOptions } from 'fabric'

export const basicOptions: Partial<CanvasOptions> = {
  editorContainerWidth: '800px',
  editorContainerHeight: '600px',
  canvasWrapperWidth: '700px',
  canvasWrapperHeight: '500px',
  canvasCSSWidth: '700px',
  canvasCSSHeight: '500px',
  montageAreaWidth: 400,
  montageAreaHeight: 300,
  scaleType: 'contain',
  showRotationAngle: false
}

export const createFullOptions = (partialOptions: Partial<CanvasOptions> = {}): CanvasOptions => ({
  ...basicOptions,
  ...partialOptions
} as CanvasOptions)
