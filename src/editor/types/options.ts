import type { CanvasOptions } from 'fabric'
import type { EditorCanvasOptions } from './fabric-extensions'

/** Полные опции редактора, включая настройки canvas из Fabric. */
export type EditorOptions = CanvasOptions & EditorCanvasOptions
