import {
  getSmallestPositiveGap,
  renderAiGenerationOverlay
} from './ai-generation-overlay-test-setup'

describe('AiGenerationOverlay', () => {
  it('рисует белые точки поверх полупрозрачной подложки', () => {
    const snapshot = renderAiGenerationOverlay({
      width: 512,
      height: 512
    })

    expect(snapshot.fillRects).toHaveLength(1)
    expect(snapshot.fillRects[0].fillStyle).toBe('rgba(136, 136, 136, 0.5)')
    expect(snapshot.arcs.length).toBeGreaterThan(0)
    expect(snapshot.arcs.every((arc) => arc.fillStyle === '#ffffff')).toBe(true)
  })

  it('при вытянутой монтажной области не растягивает точки через canvas scale', () => {
    const snapshot = renderAiGenerationOverlay({
      width: 512,
      height: 4000
    })

    expect(snapshot.scaleMock).not.toHaveBeenCalled()
    expect(snapshot.translateMock).not.toHaveBeenCalled()
    expect(snapshot.arcs.length).toBeGreaterThan(0)
    expect(snapshot.arcs.every((arc) => arc.radius > 0)).toBe(true)
  })

  it('при высокой монтажной области сохраняет расстояние между рядами как в квадратной области', () => {
    const squareSnapshot = renderAiGenerationOverlay({
      width: 512,
      height: 512
    })
    const tallSnapshot = renderAiGenerationOverlay({
      width: 512,
      height: 4000
    })
    const squareRowGap = getSmallestPositiveGap({
      values: squareSnapshot.arcs.map((arc) => arc.y)
    })
    const tallRowGap = getSmallestPositiveGap({
      values: tallSnapshot.arcs.map((arc) => arc.y)
    })

    expect(tallRowGap).toBeGreaterThan(0)
    expect(tallRowGap).toBeCloseTo(squareRowGap, 3)
  })

  it('при широкой монтажной области сохраняет расстояние между колонками как в квадратной области', () => {
    const squareSnapshot = renderAiGenerationOverlay({
      width: 512,
      height: 512
    })
    const wideSnapshot = renderAiGenerationOverlay({
      width: 4000,
      height: 512
    })
    const squareColumnGap = getSmallestPositiveGap({
      values: squareSnapshot.arcs.map((arc) => arc.x)
    })
    const wideColumnGap = getSmallestPositiveGap({
      values: wideSnapshot.arcs.map((arc) => arc.x)
    })

    expect(wideColumnGap).toBeGreaterThan(0)
    expect(wideColumnGap).toBeCloseTo(squareColumnGap, 3)
  })

  it('при изменении zoom сохраняет ту же внутреннюю animation-модель', () => {
    const minimumZoomSnapshot = renderAiGenerationOverlay({
      width: 512,
      height: 4000,
      zoom: 0.2
    })
    const maximumZoomSnapshot = renderAiGenerationOverlay({
      width: 512,
      height: 4000,
      zoom: 2
    })
    const minimumZoomRowGap = getSmallestPositiveGap({
      values: minimumZoomSnapshot.arcs.map((arc) => arc.y)
    })
    const maximumZoomRowGap = getSmallestPositiveGap({
      values: maximumZoomSnapshot.arcs.map((arc) => arc.y)
    })

    expect(minimumZoomSnapshot.arcs.length).toBeGreaterThan(0)
    expect(maximumZoomSnapshot.arcs.length).toBe(minimumZoomSnapshot.arcs.length)
    expect(maximumZoomRowGap).toBeCloseTo(minimumZoomRowGap, 3)
  })
})
