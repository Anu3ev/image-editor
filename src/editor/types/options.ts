import type { CanvasOptions } from 'fabric'
import type { EditorCanvasOptions } from './fabric-extensions'

/** Complete editor options, including Fabric canvas settings. */
export type EditorOptions = CanvasOptions & EditorCanvasOptions
