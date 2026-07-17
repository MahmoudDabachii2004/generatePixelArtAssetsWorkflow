// Pure RGBA buffer helpers. No canvas, no DOM — safe to unit-test in Node.
import type { Bounds, Rgb, RgbaImage } from './types'

export function createImage(width: number, height: number): RgbaImage {
  return { data: new Uint8ClampedArray(Math.max(0, width * height * 4)), width, height }
}

export function cloneImage(image: RgbaImage): RgbaImage {
  return { data: new Uint8ClampedArray(image.data), width: image.width, height: image.height }
}

export function colorDistanceSquared(r: number, g: number, b: number, target: Rgb): number {
  const dr = r - target.r
  const dg = g - target.g
  const db = b - target.b
  return dr * dr + dg * dg + db * db
}

// Bounding box of every pixel above an alpha threshold. Returns null when the
// image is fully transparent. This is the trim-to-content step that must run
// before anchoring — without it, canvas padding poisons the foot baseline.
export function contentBounds(image: RgbaImage, alphaThreshold = 8): Bounds | null {
  const { data, width, height } = image
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3] ?? 0
      if (alpha <= alphaThreshold) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

export function cropImage(image: RgbaImage, bounds: Bounds): RgbaImage {
  const out = createImage(bounds.width, bounds.height)
  const { data, width, height } = image
  for (let y = 0; y < bounds.height; y += 1) {
    const sy = bounds.y + y
    if (sy < 0 || sy >= height) continue
    for (let x = 0; x < bounds.width; x += 1) {
      const sx = bounds.x + x
      if (sx < 0 || sx >= width) continue
      const s = (sy * width + sx) * 4
      const d = (y * bounds.width + x) * 4
      out.data[d] = data[s] ?? 0
      out.data[d + 1] = data[s + 1] ?? 0
      out.data[d + 2] = data[s + 2] ?? 0
      out.data[d + 3] = data[s + 3] ?? 0
    }
  }
  return out
}

// Exact integer nearest-neighbour upscale — one source pixel becomes an f×f
// block. Never a fractional factor: fractional scaling resamples and destroys
// the snapped native grid (the bug in the old renderAlignedFrame).
export function upscaleNearest(image: RgbaImage, factor: number): RgbaImage {
  const f = Math.max(1, Math.floor(factor))
  if (f === 1) return cloneImage(image)
  const out = createImage(image.width * f, image.height * f)
  const { data, width, height } = image
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const s = (y * width + x) * 4
      const r = data[s] ?? 0
      const g = data[s + 1] ?? 0
      const b = data[s + 2] ?? 0
      const a = data[s + 3] ?? 0
      for (let dy = 0; dy < f; dy += 1) {
        for (let dx = 0; dx < f; dx += 1) {
          const d = ((y * f + dy) * out.width + (x * f + dx)) * 4
          out.data[d] = r
          out.data[d + 1] = g
          out.data[d + 2] = b
          out.data[d + 3] = a
        }
      }
    }
  }
  return out
}

// Copy src onto dst at (dx,dy), clipped to dst bounds. Straight overwrite —
// used to place a frame into an empty cell and to pack cells into a sheet
// (neither overlaps), so no alpha compositing is needed.
export function blit(dst: RgbaImage, src: RgbaImage, dx: number, dy: number): void {
  for (let y = 0; y < src.height; y += 1) {
    const ty = dy + y
    if (ty < 0 || ty >= dst.height) continue
    for (let x = 0; x < src.width; x += 1) {
      const tx = dx + x
      if (tx < 0 || tx >= dst.width) continue
      const s = (y * src.width + x) * 4
      const d = (ty * dst.width + tx) * 4
      dst.data[d] = src.data[s] ?? 0
      dst.data[d + 1] = src.data[s + 1] ?? 0
      dst.data[d + 2] = src.data[s + 2] ?? 0
      dst.data[d + 3] = src.data[s + 3] ?? 0
    }
  }
}

// Mirror an image horizontally. Used for the "East = flip of West" identity
// trick: never regenerate the east view, so it stays pixel-identical to west.
export function flipHorizontal(image: RgbaImage): RgbaImage {
  const out = createImage(image.width, image.height)
  const { data, width, height } = image
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const s = (y * width + x) * 4
      const d = (y * width + (width - 1 - x)) * 4
      out.data[d] = data[s] ?? 0
      out.data[d + 1] = data[s + 1] ?? 0
      out.data[d + 2] = data[s + 2] ?? 0
      out.data[d + 3] = data[s + 3] ?? 0
    }
  }
  return out
}

// Paint every pixel with one opaque colour (e.g. to build a chroma anchor).
export function fillColor(image: RgbaImage, r: number, g: number, b: number): void {
  for (let i = 0; i < image.width * image.height; i += 1) {
    const o = i * 4
    image.data[o] = r
    image.data[o + 1] = g
    image.data[o + 2] = b
    image.data[o + 3] = 255
  }
}

// Source-over alpha compositing (src drawn onto dst). Needed for parallax
// preview where upper layers reveal lower ones through transparency.
export function blitOver(dst: RgbaImage, src: RgbaImage, dx: number, dy: number): void {
  for (let y = 0; y < src.height; y += 1) {
    const ty = dy + y
    if (ty < 0 || ty >= dst.height) continue
    for (let x = 0; x < src.width; x += 1) {
      const tx = dx + x
      if (tx < 0 || tx >= dst.width) continue
      const s = (y * src.width + x) * 4
      const sa = (src.data[s + 3] ?? 0) / 255
      if (sa <= 0) continue
      const d = (ty * dst.width + tx) * 4
      const da = (dst.data[d + 3] ?? 0) / 255
      const outA = sa + da * (1 - sa)
      if (outA <= 0) continue
      for (let c = 0; c < 3; c += 1) {
        const sc = src.data[s + c] ?? 0
        const dc = dst.data[d + c] ?? 0
        dst.data[d + c] = Math.round((sc * sa + dc * da * (1 - sa)) / outA)
      }
      dst.data[d + 3] = Math.round(outA * 255)
    }
  }
}
