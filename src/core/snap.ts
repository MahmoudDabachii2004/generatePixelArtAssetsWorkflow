// Pure-TypeScript pixel-snap grid detector (replaces the missing Sprite Fusion
// WASM). It recovers the native pixel grid an AI "pixel-ish" image was trying
// to draw, then resamples one solid colour per native cell — killing mixels.
//
// Method: build 1-D edge-energy profiles along X and Y, find the dominant
// period by autocorrelation, then AVERAGE each native cell block. The critical
// detail is preferring the *fundamental* period over its harmonics: a harmonic
// (too-large period) yields too-few cells = a too-small native = exactly the
// "output is tiny / mushy" complaint. We divide down to the smallest period
// whose autocorrelation is still strong, which is the true fundamental.
import { createImage } from './rgba'
import type { RgbaImage } from './types'

export interface SnapResult {
  pixelSizeX: number
  pixelSizeY: number
  cellsX: number
  cellsY: number
  native: RgbaImage
  candidates: number[]
  confidence: number
}

export interface SnapOptions {
  minCells?: number
  maxCells?: number
}

function edgeProfile(image: RgbaImage, axis: 'x' | 'y'): Float64Array {
  const { data, width, height } = image
  const length = axis === 'x' ? width : height
  const profile = new Float64Array(length)
  if (axis === 'x') {
    for (let x = 1; x < width; x += 1) {
      let sum = 0
      for (let y = 0; y < height; y += 1) {
        const a = (y * width + x) * 4
        const b = (y * width + x - 1) * 4
        sum +=
          Math.abs((data[a] ?? 0) - (data[b] ?? 0)) +
          Math.abs((data[a + 1] ?? 0) - (data[b + 1] ?? 0)) +
          Math.abs((data[a + 2] ?? 0) - (data[b + 2] ?? 0)) +
          Math.abs((data[a + 3] ?? 0) - (data[b + 3] ?? 0))
      }
      profile[x] = sum
    }
  } else {
    for (let y = 1; y < height; y += 1) {
      let sum = 0
      for (let x = 0; x < width; x += 1) {
        const a = (y * width + x) * 4
        const b = ((y - 1) * width + x) * 4
        sum +=
          Math.abs((data[a] ?? 0) - (data[b] ?? 0)) +
          Math.abs((data[a + 1] ?? 0) - (data[b + 1] ?? 0)) +
          Math.abs((data[a + 2] ?? 0) - (data[b + 2] ?? 0)) +
          Math.abs((data[a + 3] ?? 0) - (data[b + 3] ?? 0))
      }
      profile[y] = sum
    }
  }
  return profile
}

interface PeriodResult {
  period: number
  confidence: number
  candidates: number[]
}

function detectPeriod(profile: Float64Array, minPeriod: number, maxPeriod: number): PeriodResult {
  const n = profile.length
  let mean = 0
  for (let i = 0; i < n; i += 1) mean += profile[i] ?? 0
  mean /= Math.max(1, n)
  let variance = 0
  const centered = new Float64Array(n)
  for (let i = 0; i < n; i += 1) {
    const v = (profile[i] ?? 0) - mean
    centered[i] = v
    variance += v * v
  }
  // Flat profile (near-uniform image): no grid to recover.
  if (variance < 1e-6) return { period: 1, confidence: 0, candidates: [1] }

  const cache = new Map<number, number>()
  const autocorr = (lag: number): number => {
    const cached = cache.get(lag)
    if (cached !== undefined) return cached
    let sum = 0
    let count = 0
    for (let i = 0; i + lag < n; i += 1) {
      sum += (centered[i] ?? 0) * (centered[i + lag] ?? 0)
      count += 1
    }
    const value = count > 0 ? sum / count : 0
    cache.set(lag, value)
    return value
  }

  const hi = Math.min(maxPeriod, Math.floor(n / 2))
  let best = Math.max(2, minPeriod)
  let bestScore = -Infinity
  for (let d = Math.max(2, minPeriod); d <= hi; d += 1) {
    const score = autocorr(d)
    if (score > bestScore) {
      bestScore = score
      best = d
    }
  }

  // Prefer the fundamental: the smallest divisor of `best` that still carries
  // most of the autocorrelation energy. Iterating k ascending and keeping the
  // last qualifying divisor lands on the smallest strong period.
  let fundamental = best
  for (let k = 2; k <= 8; k += 1) {
    const d = Math.round(best / k)
    if (d < Math.max(2, minPeriod)) break
    if (autocorr(d) >= 0.6 * bestScore) fundamental = d
  }

  const zeroLag = autocorr(0)
  const confidence = zeroLag > 0 ? Math.max(0, Math.min(1, autocorr(fundamental) / zeroLag)) : 0

  const candidates: number[] = []
  for (const c of [fundamental, fundamental - 1, fundamental + 1, best, Math.round(best / 2), best * 2]) {
    if (c >= Math.max(2, minPeriod) && c <= hi && !candidates.includes(c)) candidates.push(c)
  }
  return { period: fundamental, confidence, candidates }
}

// Average every native cell block into one output pixel.
function resampleNative(image: RgbaImage, cellsX: number, cellsY: number): RgbaImage {
  const out = createImage(cellsX, cellsY)
  const { data, width, height } = image
  for (let cy = 0; cy < cellsY; cy += 1) {
    const y0 = Math.floor((cy * height) / cellsY)
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * height) / cellsY))
    for (let cx = 0; cx < cellsX; cx += 1) {
      const x0 = Math.floor((cx * width) / cellsX)
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * width) / cellsX))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let count = 0
      for (let y = y0; y < y1 && y < height; y += 1) {
        for (let x = x0; x < x1 && x < width; x += 1) {
          const o = (y * width + x) * 4
          r += data[o] ?? 0
          g += data[o + 1] ?? 0
          b += data[o + 2] ?? 0
          a += data[o + 3] ?? 0
          count += 1
        }
      }
      const d = (cy * cellsX + cx) * 4
      const inv = count > 0 ? 1 / count : 0
      out.data[d] = Math.round(r * inv)
      out.data[d + 1] = Math.round(g * inv)
      out.data[d + 2] = Math.round(b * inv)
      out.data[d + 3] = Math.round(a * inv)
    }
  }
  return out
}

export function detectAndSnap(image: RgbaImage, options: SnapOptions = {}): SnapResult {
  const minCells = Math.max(2, options.minCells ?? 3)
  const maxCells = Math.max(minCells, options.maxCells ?? 400)
  const periodRange = (size: number) => ({
    min: Math.max(2, Math.floor(size / maxCells)),
    max: Math.max(3, Math.floor(size / minCells)),
  })

  const rx = periodRange(image.width)
  const ry = periodRange(image.height)
  const px = detectPeriod(edgeProfile(image, 'x'), rx.min, rx.max)
  const py = detectPeriod(edgeProfile(image, 'y'), ry.min, ry.max)

  const cellsX = Math.max(1, Math.round(image.width / px.period))
  const cellsY = Math.max(1, Math.round(image.height / py.period))
  const native = resampleNative(image, cellsX, cellsY)

  return {
    pixelSizeX: px.period,
    pixelSizeY: py.period,
    cellsX,
    cellsY,
    native,
    candidates: px.candidates,
    confidence: Math.min(px.confidence, py.confidence),
  }
}
