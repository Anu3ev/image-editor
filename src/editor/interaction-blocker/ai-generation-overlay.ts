import {
  Rect,
  classRegistry,
  type Canvas,
  type RectProps
} from 'fabric'

export const AI_GENERATION_OVERLAY_TYPE = 'ai-generation-overlay'

// Базовая координатная система анимации. Она не равна размеру montage area:
// через неё задаётся плотность точек и движение пятен влияния в стабильных единицах.
const ANIMATION_SPACE_SIZE = 1080
const TAU = Math.PI * 2
const BASE_GRID_COUNT = 40
const DOT_SIZE = 8
const DOT_RADIUS = DOT_SIZE / 2
const GRID_GAP = (ANIMATION_SPACE_SIZE - BASE_GRID_COUNT * DOT_SIZE) / (BASE_GRID_COUNT + 1)
const GRID_START = GRID_GAP + DOT_RADIUS
const GRID_PITCH = DOT_SIZE + GRID_GAP
const MAX_GRID_LINES = BASE_GRID_COUNT * 16
const SCALE_START = 0.18
const SCALE_END = 0.58
const AI_OVERLAY_BACKDROP_FILL = 'rgba(136, 136, 136, 0.5)'
const DOT_FILL = '#ffffff'

type Dot = {
  x: number
  y: number
}

type OverlayRenderSize = {
  height: number
  width: number
}

type AnimationSpaceSize = {
  height: number
  width: number
}

type AnimationRenderMetrics = {
  animationSize: AnimationSpaceSize
  animationToOverlayScale: number
}

type GridAxis = {
  count: number
  start: number
}

type InfluenceBlob = {
  jitterX: number
  jitterY: number
  pulseSpeed: number
  rx: number
  ry: number
  seed: number
  speed: number
  travelPadX: number
  travelPadY: number
  weight: number
}

type InfluenceBlobState = {
  rx: number
  ry: number
  weight: number
  x: number
  y: number
}

const INFLUENCE_BLOBS: InfluenceBlob[] = [
  {
    rx: 540,
    ry: 430,
    weight: 1.30,
    speed: 0.62,
    pulseSpeed: 1.90,
    jitterX: 42,
    jitterY: 30,
    travelPadX: 360,
    travelPadY: 320,
    seed: 0.13
  },
  {
    rx: 430,
    ry: 340,
    weight: 1.16,
    speed: 0.72,
    pulseSpeed: 1.76,
    jitterX: 36,
    jitterY: 24,
    travelPadX: 300,
    travelPadY: 270,
    seed: 1.41
  },
  {
    rx: 380,
    ry: 300,
    weight: 1.08,
    speed: 0.82,
    pulseSpeed: 2.04,
    jitterX: 32,
    jitterY: 24,
    travelPadX: 280,
    travelPadY: 260,
    seed: 2.77
  },
  {
    rx: 300,
    ry: 235,
    weight: 1.00,
    speed: 0.92,
    pulseSpeed: 1.72,
    jitterX: 26,
    jitterY: 20,
    travelPadX: 240,
    travelPadY: 220,
    seed: 4.09
  },
  {
    rx: 210,
    ry: 165,
    weight: 0.92,
    speed: 1.08,
    pulseSpeed: 2.18,
    jitterX: 20,
    jitterY: 16,
    travelPadX: 210,
    travelPadY: 190,
    seed: 5.37
  }
]

function clamp({
  value,
  min = 0,
  max = 1
}: {
  max?: number
  min?: number
  value: number
}): number {
  return Math.max(min, Math.min(max, value))
}

function lerp({
  from,
  to,
  progress
}: {
  from: number
  progress: number
  to: number
}): number {
  return from + (to - from) * progress
}

function smoothstep({
  edgeStart,
  edgeEnd,
  value
}: {
  edgeEnd: number
  edgeStart: number
  value: number
}): number {
  const progress = clamp({
    value: (value - edgeStart) / (edgeEnd - edgeStart)
  })

  return progress * progress * (3 - 2 * progress)
}

function noise01({ time, seed }: { seed: number; time: number }): number {
  const signal = 0.53 * Math.sin(time * 0.73 + seed * 11.17)
    + 0.29 * Math.sin(time * 1.37 + seed * 7.13 + 1.1)
    + 0.18 * Math.sin(time * 2.21 + seed * 3.97 + 2.4)

  return clamp({ value: 0.5 + 0.5 * signal })
}

function getInfluenceBlobState({
  animationSize,
  blob,
  time
}: {
  animationSize: AnimationSpaceSize
  blob: InfluenceBlob
  time: number
}): InfluenceBlobState {
  const moveTime = time * blob.speed
  const pulseTime = time * blob.pulseSpeed + blob.seed * 3.1
  const minX = -blob.travelPadX
  const maxX = animationSize.width + blob.travelPadX
  const minY = -blob.travelPadY
  const maxY = animationSize.height + blob.travelPadY
  const xProgress = noise01({
    time: moveTime,
    seed: blob.seed + 0.11
  })
  const yProgress = noise01({
    time: moveTime * 0.93 + 7.3,
    seed: blob.seed + 0.67
  })
  let x = lerp({ from: minX, to: maxX, progress: xProgress })
  let y = lerp({ from: minY, to: maxY, progress: yProgress })

  x += Math.sin(moveTime * 0.57 + blob.seed * 5.4) * blob.jitterX * 1.8
  x += Math.sin(moveTime * 2.60 + blob.seed * 9.1) * blob.jitterX
  y += Math.cos(moveTime * 0.49 + blob.seed * 6.2) * blob.jitterY * 1.8
  y += Math.cos(moveTime * 2.10 + blob.seed * 7.7) * blob.jitterY

  return {
    x,
    y,
    rx: blob.rx * (0.88 + 0.24 * (0.5 + 0.5 * Math.sin(pulseTime))),
    ry: blob.ry * (0.88 + 0.24 * (0.5 + 0.5 * Math.cos(pulseTime * 1.07))),
    weight: blob.weight
  }
}

function getInfluenceValue({
  state,
  dot
}: {
  dot: Dot
  state: InfluenceBlobState
}): number {
  const dx = (dot.x - state.x) / state.rx
  const dy = (dot.y - state.y) / state.ry

  return Math.exp(-(dx * dx + dy * dy) * 1.60) * state.weight
}

function getDotScale({
  dot,
  states,
  time
}: {
  dot: Dot
  states: InfluenceBlobState[]
  time: number
}): number {
  let field = 0

  for (const state of states) {
    field += getInfluenceValue({ state, dot })
  }

  const microPulse = 0.98
    + 0.02 * Math.sin(dot.x * 0.012 + dot.y * 0.010 + time * 3.1)

  return smoothstep({ edgeStart: SCALE_START, edgeEnd: SCALE_END, value: field }) * microPulse
}

function getAnimationRenderMetrics({
  size
}: {
  size: OverlayRenderSize
}): AnimationRenderMetrics {
  // Canvas zoom применится внешним viewport transform Fabric.
  // Внутри overlay animation-space зависит только от размера montage area.
  const animationToOverlayScale = Math.min(size.width, size.height) / ANIMATION_SPACE_SIZE

  return {
    animationSize: {
      width: size.width / animationToOverlayScale,
      height: size.height / animationToOverlayScale
    },
    animationToOverlayScale
  }
}

function getGridAxis({ size }: { size: number }): GridAxis {
  const rawCount = Math.floor((size - 2 * GRID_START) / GRID_PITCH) + 1
  const count = Math.max(1, Math.min(MAX_GRID_LINES, rawCount))

  // Сетка центрируется по каждой оси отдельно: точки не растягиваются,
  // а на вытянутых форматах просто добавляются новые ряды или колонки.
  return {
    count,
    start: (size - (count - 1) * GRID_PITCH) / 2
  }
}

function drawDots({
  ctx,
  size,
  time
}: {
  ctx: CanvasRenderingContext2D
  size: OverlayRenderSize
  time: number
}): void {
  const { animationSize, animationToOverlayScale } = getAnimationRenderMetrics({ size })
  const columnAxis = getGridAxis({ size: animationSize.width })
  const rowAxis = getGridAxis({ size: animationSize.height })
  const halfWidth = size.width / 2
  const halfHeight = size.height / 2
  const states = INFLUENCE_BLOBS.map((blob) => getInfluenceBlobState({
    animationSize,
    blob,
    time
  }))

  ctx.fillStyle = DOT_FILL

  for (let row = 0; row < rowAxis.count; row += 1) {
    for (let col = 0; col < columnAxis.count; col += 1) {
      const dot = {
        x: columnAxis.start + col * GRID_PITCH,
        y: rowAxis.start + row * GRID_PITCH
      }
      const dotScale = getDotScale({ dot, states, time })
      if (dotScale <= 0.01) continue

      const x = dot.x * animationToOverlayScale - halfWidth
      const y = dot.y * animationToOverlayScale - halfHeight
      const radius = DOT_RADIUS * Math.min(dotScale, 1) * animationToOverlayScale

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, TAU)
      ctx.fill()
    }
  }
}

export class AiGenerationOverlay extends Rect {
  static override type = AI_GENERATION_OVERLAY_TYPE

  private _animationFrameId: number | null

  private _renderTimeMs: number

  constructor(options: Partial<RectProps> = {}) {
    super({
      ...options,
      fill: AI_OVERLAY_BACKDROP_FILL,
      objectCaching: false
    })

    this._animationFrameId = null
    this._renderTimeMs = 0
  }

  public startAnimation({ canvas }: { canvas: Canvas }): void {
    if (this._animationFrameId !== null) return
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      canvas.requestRenderAll()
      return
    }

    const tick = (timeMs: number) => {
      if (this._animationFrameId === null) return

      this._renderTimeMs = timeMs
      this.dirty = true
      canvas.requestRenderAll()
      this._animationFrameId = window.requestAnimationFrame(tick)
    }

    this._animationFrameId = window.requestAnimationFrame(tick)
  }

  public stopAnimation(): void {
    const frameId = this._animationFrameId
    if (frameId === null) return

    this._animationFrameId = null

    if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(frameId)
    }
  }

  public override _render(ctx: CanvasRenderingContext2D): void {
    const width = this.width ?? 0
    const height = this.height ?? 0
    if (width <= 0 || height <= 0) return

    ctx.save()
    ctx.beginPath()
    ctx.rect(-width / 2, -height / 2, width, height)
    ctx.clip()
    ctx.fillStyle = AI_OVERLAY_BACKDROP_FILL
    ctx.fillRect(-width / 2, -height / 2, width, height)
    drawDots({
      ctx,
      size: { width, height },
      time: this._renderTimeMs / 1000
    })
    ctx.restore()
  }
}

export const registerAiGenerationOverlay = (): void => {
  if (classRegistry?.setClass) {
    classRegistry.setClass(AiGenerationOverlay, AI_GENERATION_OVERLAY_TYPE)
  }
}
