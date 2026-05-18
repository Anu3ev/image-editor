import type { CanvasFullState } from '../../../../src/editor/history-manager'

/**
 * Создаёт состояние canvas для history-manager specs.
 */
export const createHistoryState = (overrides: Partial<CanvasFullState> = {}): CanvasFullState => ({
  clipPath: null,
  width: 800,
  height: 600,
  version: '5.0.0',
  objects: [],
  ...overrides
})
