import type { EditorOptions } from '../../../src/editor/types/options'

interface BasicEditorOptions extends Partial<EditorOptions> {
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

export const createFullOptions = (partialOptions: Partial<EditorOptions> = {}): EditorOptions => ({
  ...basicOptions,
  ...partialOptions
} as EditorOptions)
