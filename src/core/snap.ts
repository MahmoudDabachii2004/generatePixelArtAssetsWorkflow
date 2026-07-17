// Pixel-snap, faithful to the Sprite Fusion method (ported to TypeScript so it
// runs everywhere with no WASM build):
//   1. quantize the image to a small palette (median-cut),
//   2. estimate the native grid period per axis from edge energy,
//   3. resample each native cell to its MAJORITY palette colour (not the
//      average — averaging is what made the first version muddy),
//   4. produce several nearby candidates and rank them by how well an exact
//      nearest-neighbour re-expansion reconstructs the source.
// Nearest-neighbour upscaling of the chosen native (rgba.upscaleNearest) is the
// exact integer pixel copy = the "nearest-neighbour-upscale" behaviour.
import { quantize, type QuantizeResult } from './palette'
import { createImage, upscaleNearest } from './rgba'
import type { Rgb, RgbaImage } from './types'

export interface SnapCandidate {
  pixelSize: number
  cellsX: number
  cellsY: number
  native: RgbaImage
  score: number
}

export interface SnapResult {
  pixelSize: number
  cellsX: number
  cellsY: number
  native: RgbaImage
  candidates: SnapCandidate[]
  confidence: number
  palette: Rgb[]
}

export interface SnapOptions {
  colorCount?: number
  minCells?: number
  maxCells?: number
  pixelSizeOverride?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function edgeProfile(image: RgbaImage, axis: 'x' | 'y'): Float64Array {
  const { data, width, height } = image
  const length = axis === 'x' ? width : height
  const profile = new Float64Array(length)
  const across = axis === 'x' ? height : width
  for (let a = 1; a < length; a += 1) {
    let sum = 0
    for (let b = 0; b < across; b += 1) {
      const cur = axis === 'x' ? (b * width + a) * 4 : (a * width + b) * 4
      const prev = axis === 'x' ? (b * width + a - 1) * 4 : ((a - 1) * width + b) * 4
      sum +=
        Math.abs((data[cur] ?? 0) - (data[prev] ?? 0)) +
        Math.abs((data[cur + 1] ?? 0) - (data[prev + 1] ?? 0)) +
        Math.abs((data[cur + 2] ?? 0) - (data[prev + 2] ?? 0)) +
        Math.abs((data[cur + 3] ?? 0) - (data[prev + 3] ?? 0))
    }
    profile[a] = sum
  }
  return profile
}

function detectPeriod(profile: Float64Array, minPeriod: number, maxPeriod: number): { period: number; confidence: number } {
  const n = profile.length
  let mean = 0
  for (let i = 0; i < n; i += 1) mean += profile[i] ?? 0
  mean /= Math.max(1, n)
  const centered = new Float64Array(n)
  let variance = 0
  for (let i = 0; i < n; i += 1) {
    const v = (profile[i] ?? 0) - mean
    centered[i] = v
    variance += v * v
  }
  if (variance < 1e-6) return { period: 1, confidence: 0 }

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
  // Prefer the fundamental (smallest strong divisor) to avoid a too-large period
  // (which would give too few cells = a too-small, mushy native).
  let fundamental = best
  for (let k = 2; k <= 8; k += 1) {
    const d = Math.round(best / k)
    if (d < Math.max(2, minPeriod)) break
    if (autocorr(d) >= 0.6 * bestScore) fundamental = d
  }
  const zeroLag = autocorr(0)
  const confidence = zeroLag > 0 ? clamp(autocorr(fundamental) / zeroLag, 0, 1) : 0
  return { period: fundamental, confidence }
}

// Majority-colour resample: each native cell becomes the most frequent palette
// colour among its pixels; a cell that is mostly transparent stays transparent.
function resampleMajority(quant: QuantizeResult, cellsX: number, cellsY: number): RgbaImage {
  const { palette, indices, width, height } = quant
  const out = createImage(cellsX, cellsY)
  const counts = new Int32Array(palette.length)
  for (let cy = 0; cy < cellsY; cy += 1) {
    const y0 = Math.floor((cy * height) / cellsY)
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * height) / cellsY))
    for (let cx = 0; cx < cellsX; cx += 1) {
      const x0 = Math.floor((cx * width) / cellsX)
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * width) / cellsX))
      counts.fill(0)
      let transparent = 0
      let opaque = 0
      for (let y = y0; y < y1 && y < height; y += 1) {
        for (let x = x0; x < x1 && x < width; x += 1) {
          const idx = indices[y * width + x] ?? -1
          if (idx < 0) {
            transparent += 1
          } else {
            counts[idx] = (counts[idx] ?? 0) + 1
            opaque += 1
          }
        }
      }
      const d = (cy * cellsX + cx) * 4
      if (opaque === 0 || transparent > opaque) continue // leave transparent
      let bestIdx = 0
      let bestCount = -1
      for (let i = 0; i < counts.length; i += 1) {
        const c = counts[i] ?? 0
        if (c > bestCount) {
          bestCount = c
          bestIdx = i
        }
      }
      const color = palette[bestIdx] ?? { r: 0, g: 0, b: 0 }
      out.data[d] = color.r
      out.data[d + 1] = color.g
      out.data[d + 2] = color.b
      out.data[d + 3] = 255
    }
  }
  return out
}

// Rank a candidate by MSE between an exact re-expansion and the source.
function scoreNative(source: RgbaImage, native: RgbaImage): number {
  if (native.width < 1 || native.height < 1) return Number.POSITIVE_INFINITY
  const scale = Math.max(
    1,
    Math.round(Math.min(source.width / native.width, source.height / native.height)),
  )
  const recon = upscaleNearest(native, scale)
  const compareWidth = Math.min(source.width, recon.width)
  const compareHeight = Math.min(source.height, recon.height)
  const stride = Math.max(1, Math.floor(Math.max(compareWidth, compareHeight) / 160))
  let error = 0
  let samples = 0
  for (let y = 0; y < compareHeight; y += stride) {
    for (let x = 0; x < compareWidth; x += stride) {
      const so = (y * source.width + x) * 4
      const ro = (y * recon.width + x) * 4
      for (let c = 0; c < 4; c += 1) {
        const delta = (source.data[so + c] ?? 0) - (recon.data[ro + c] ?? 0)
        error += delta * delta
      }
      samples += 1
    }
  }
  const mse = samples > 0 ? error / (samples * 4 * 255 * 255) : 1
  const tiny = native.width < 4 || native.height < 4 ? 0.4 : 0
  return mse + tiny
}

export function detectAndSnap(image: RgbaImage, options: SnapOptions = {}): SnapResult {
  const colorCount = clamp(Math.round(options.colorCount ?? 64), 2, 256)
  const minCells = Math.max(2, options.minCells ?? 3)
  const maxCells = Math.max(minCells, options.maxCells ?? 400)
  const quant = quantize(image, colorCount)

  const periodRange = (size: number) => ({
    min: Math.max(2, Math.floor(size / maxCells)),
    max: Math.max(3, Math.floor(size / minCells)),
  })
  const rx = periodRange(image.width)
  const ry = periodRange(image.height)
  const px = detectPeriod(edgeProfile(image, 'x'), rx.min, rx.max)
  const py = detectPeriod(edgeProfile(image, 'y'), ry.min, ry.max)
  const basePixel = options.pixelSizeOverride ?? Math.max(2, Math.round((px.period + py.period) / 2))

  const sizes = options.pixelSizeOverride
    ? [options.pixelSizeOverride]
    : Array.from(new Set([basePixel - 1, basePixel, basePixel + 1, basePixel + 2, Math.max(2, Math.round(basePixel / 2))]))
        .filter((s) => s >= 2)

  const candidates: SnapCandidate[] = sizes
    .map((pixelSize) => {
      const cellsX = clamp(Math.round(image.width / pixelSize), 1, image.width)
      const cellsY = clamp(Math.round(image.height / pixelSize), 1, image.height)
      const native = resampleMajority(quant, cellsX, cellsY)
      return { pixelSize, cellsX, cellsY, native, score: scoreNative(image, native) }
    })
    .sort((a, b) => a.score - b.score)

  const best = candidates[0]!
  return {
    pixelSize: best.pixelSize,
    cellsX: best.cellsX,
    cellsY: best.cellsY,
    native: best.native,
    candidates,
    confidence: Math.min(px.confidence, py.confidence),
    palette: quant.palette,
  }
}
