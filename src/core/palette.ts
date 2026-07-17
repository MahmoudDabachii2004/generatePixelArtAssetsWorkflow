// Median-cut colour quantization. Sprite Fusion reduces the image to a small
// palette BEFORE snapping; the native cell then takes the majority palette
// colour, which is what makes the output crisp instead of the muddy average my
// first snapper produced. Histogram-based (5-bit buckets) so it's fast on a
// 1024² image.
import type { Rgb, RgbaImage } from './types'

const BITS = 5
const SHIFT = 8 - BITS
const LEVELS = 1 << BITS

function bucketKey(r: number, g: number, b: number): number {
  return ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT)
}

interface Bucket {
  r: number
  g: number
  b: number
  count: number
  key: number
}

export interface QuantizeResult {
  palette: Rgb[]
  indices: Int32Array // per pixel: palette index, or -1 for transparent
  width: number
  height: number
}

export function quantize(image: RgbaImage, maxColors: number): QuantizeResult {
  const { data, width, height } = image
  const total = width * height
  const counts = new Int32Array(LEVELS * LEVELS * LEVELS)
  for (let i = 0; i < total; i += 1) {
    const o = i * 4
    if ((data[o + 3] ?? 0) <= 8) continue
    const key = bucketKey(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0)
    counts[key] = (counts[key] ?? 0) + 1
  }

  const buckets: Bucket[] = []
  const half = 1 << (SHIFT - 1)
  for (let key = 0; key < counts.length; key += 1) {
    const count = counts[key] ?? 0
    if (count === 0) continue
    const r = (((key >> (BITS * 2)) & (LEVELS - 1)) << SHIFT) + half
    const g = (((key >> BITS) & (LEVELS - 1)) << SHIFT) + half
    const b = ((key & (LEVELS - 1)) << SHIFT) + half
    buckets.push({ r, g, b, count, key })
  }

  const target = Math.max(1, Math.min(maxColors, buckets.length))
  const boxes: Bucket[][] = [buckets]

  const rangeOf = (box: Bucket[]): { channel: 'r' | 'g' | 'b'; span: number } => {
    let rMin = 255
    let rMax = 0
    let gMin = 255
    let gMax = 0
    let bMin = 255
    let bMax = 0
    for (const item of box) {
      rMin = Math.min(rMin, item.r)
      rMax = Math.max(rMax, item.r)
      gMin = Math.min(gMin, item.g)
      gMax = Math.max(gMax, item.g)
      bMin = Math.min(bMin, item.b)
      bMax = Math.max(bMax, item.b)
    }
    const dr = rMax - rMin
    const dg = gMax - gMin
    const db = bMax - bMin
    if (dr >= dg && dr >= db) return { channel: 'r', span: dr }
    if (dg >= db) return { channel: 'g', span: dg }
    return { channel: 'b', span: db }
  }

  while (boxes.length < target) {
    // Split the box with the largest colour span.
    let index = -1
    let best = -1
    for (let i = 0; i < boxes.length; i += 1) {
      const box = boxes[i]
      if (!box || box.length < 2) continue
      const span = rangeOf(box).span
      if (span > best) {
        best = span
        index = i
      }
    }
    if (index < 0) break
    const box = boxes[index]!
    const channel = rangeOf(box).channel
    box.sort((a, b) => a[channel] - b[channel])
    const totalCount = box.reduce((sum, item) => sum + item.count, 0)
    let acc = 0
    let split = 1
    for (let i = 0; i < box.length; i += 1) {
      acc += box[i]?.count ?? 0
      if (acc >= totalCount / 2) {
        split = Math.max(1, Math.min(box.length - 1, i + 1))
        break
      }
    }
    boxes.splice(index, 1, box.slice(0, split), box.slice(split))
  }

  const palette: Rgb[] = []
  const lookup = new Int32Array(counts.length).fill(-1)
  boxes.forEach((box, paletteIndex) => {
    let r = 0
    let g = 0
    let b = 0
    let count = 0
    for (const item of box) {
      r += item.r * item.count
      g += item.g * item.count
      b += item.b * item.count
      count += item.count
      lookup[item.key] = paletteIndex
    }
    const inv = count > 0 ? 1 / count : 0
    palette.push({ r: Math.round(r * inv), g: Math.round(g * inv), b: Math.round(b * inv) })
  })

  const indices = new Int32Array(total)
  for (let i = 0; i < total; i += 1) {
    const o = i * 4
    if ((data[o + 3] ?? 0) <= 8) {
      indices[i] = -1
      continue
    }
    indices[i] = lookup[bucketKey(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0)] ?? 0
  }

  return { palette, indices, width, height }
}
