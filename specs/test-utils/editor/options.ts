import type { CanvasOptions } from 'fabric'

interface BasicEditorOptions extends Partial<CanvasOptions> {
  montageAreaHeight: number
  montageAreaWidth: number
}

export const basicOptions: BasicEditorOptions = {
  editorContainerWidth: '800px',
  editorContainerHeight: '600px',
  canvasWrapperWidth: '700px',
  canvasWrapperHeight: '500px',
  canvasCSSWidth: '700px',
  canvasCSSHeight: '500px',
  montageAreaWidth: 400,
  montageAreaHeight: 300,
  scaleType: 'contain',
  showRotationAngle: false,
  showViewportScrollbars: false
}

export const createFullOptions = (partialOptions: Partial<CanvasOptions> = {}): CanvasOptions => ({
  ...basicOptions,
  ...partialOptions
} as CanvasOptions)
