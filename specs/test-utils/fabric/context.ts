/**
 * Создаёт минимальный мок CanvasRenderingContext2D для рендера.
 */
export const createMockContext = (): CanvasRenderingContext2D => {
  const ctx: any = {
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    _fillStyle: undefined as string | undefined
  }

  Object.defineProperty(ctx, 'fillStyle', {
    get: () => ctx._fillStyle,
    set: (value) => {
      ctx._fillStyle = value
    }
  })

  return ctx as CanvasRenderingContext2D
}
