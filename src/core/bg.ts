// Chroma-key background removal. Unlike the old border-only flood fill (which
// left enclosed pockets of green trapped between limbs), this removes EVERY
// pixel within tolerance of the chroma colour, then an optional 1px despill
// pulls the green cast off anti-aliased silhouette edges (the halo that read
// as "bleeding").
import { cloneImage, colorDistanceSquared } from './rgba'
import type { Rgb, RgbaImage } from './types'

export interface RemoveChromaOptions {
  chroma: Rgb
  tolerance?: number // per-channel radius, 0..255
  despill?: boolean
}

export function removeChroma(image: RgbaImage, options: RemoveChromaOptions): RgbaImage {
  const out = cloneImage(image)
  const { data, width, height } = out
  const tolerance = options.tolerance ?? 60
  const tol2 = tolerance * tolerance * 3
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4
    if ((data[o + 3] ?? 0) === 0) continue
    if (colorDistanceSquared(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0, options.chroma) <= tol2) {
      data[o + 3] = 0
    }
  }

  if (options.despill) {
    // On any opaque pixel touching a now-transparent one, clamp the chroma
    // channel down to the max of the other two so the fringe stops glowing.
    const isChromaGreen = options.chroma.g >= options.chroma.r && options.chroma.g >= options.chroma.b
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = y * width + x
        const o = i * 4
        if ((data[o + 3] ?? 0) === 0) continue
        const touchesTransparent =
          (x > 0 && (data[(i - 1) * 4 + 3] ?? 0) === 0) ||
          (x + 1 < width && (data[(i + 1) * 4 + 3] ?? 0) === 0) ||
          (y > 0 && (data[(i - width) * 4 + 3] ?? 0) === 0) ||
          (y + 1 < height && (data[(i + width) * 4 + 3] ?? 0) === 0)
        if (!touchesTransparent) continue
        const r = data[o] ?? 0
        const g = data[o + 1] ?? 0
        const b = data[o + 2] ?? 0
        if (isChromaGreen && g > Math.max(r, b)) data[o + 1] = Math.max(r, b)
      }
    }
  }
  return out
}
