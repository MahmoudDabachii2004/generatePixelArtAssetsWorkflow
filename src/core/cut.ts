// Frame recovery. chongdashu's hard rule: NEVER grid-crop, NEVER merge.
// A grid crop chops sprites that swing past a cell border; merging nearby
// boxes fuses two neighbours into one ("bleeding" — the old app's bug).
//
// Instead: chroma-key to a foreground mask, then take the single LARGEST
// connected component inside each implied cell region (grid-aware mode), or
// every component sorted row-major (blob mode). No box is ever merged.
import { cropImage } from './rgba'
import { colorDistanceSquared } from './rgba'
import type { Bounds, Rgb, RgbaImage } from './types'

export interface CutOptions {
  chroma: Rgb
  tolerance?: number // per-channel colour radius, 0..255
  columns?: number
  rows?: number
  padding?: number // extra px around each recovered box
  minAreaFraction?: number // blob mode: drop components smaller than this fraction of the image
}

function foregroundMask(image: RgbaImage, chroma: Rgb, tolerance: number): Uint8Array {
  const { data, width, height } = image
  const mask = new Uint8Array(width * height)
  const tol2 = tolerance * tolerance * 3
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4
    const alpha = data[o + 3] ?? 0
    if (alpha <= 8) continue
    const isBackground = colorDistanceSquared(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0, chroma) <= tol2
    mask[i] = isBackground ? 0 : 1
  }
  return mask
}

interface Component {
  bounds: Bounds
  area: number
}

// 8-connected components whose seeds lie inside `region`. `visited` is shared
// so a component is counted once even if it straddles region boundaries.
function componentsInRegion(
  mask: Uint8Array,
  width: number,
  height: number,
  region: Bounds,
  visited: Uint8Array,
): Component[] {
  const components: Component[] = []
  const queue = new Int32Array(width * height)
  const x1 = Math.min(width, region.x + region.width)
  const y1 = Math.min(height, region.y + region.height)
  for (let sy = Math.max(0, region.y); sy < y1; sy += 1) {
    for (let sx = Math.max(0, region.x); sx < x1; sx += 1) {
      const start = sy * width + sx
      if (!mask[start] || visited[start]) continue
      let head = 0
      let tail = 0
      queue[tail++] = start
      visited[start] = 1
      let left = sx
      let right = sx
      let top = sy
      let bottom = sy
      let area = 0
      while (head < tail) {
        const p = queue[head++] ?? 0
        const px = p % width
        const py = Math.floor(p / width)
        if (px < left) left = px
        if (px > right) right = px
        if (py < top) top = py
        if (py > bottom) bottom = py
        area += 1
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) continue
            const nx = px + ox
            const ny = py + oy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            const np = ny * width + nx
            if (mask[np] && !visited[np]) {
              visited[np] = 1
              queue[tail++] = np
            }
          }
        }
      }
      components.push({
        bounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 },
        area,
      })
    }
  }
  return components
}

function padBounds(bounds: Bounds, pad: number, width: number, height: number): Bounds {
  const x = Math.max(0, bounds.x - pad)
  const y = Math.max(0, bounds.y - pad)
  const right = Math.min(width, bounds.x + bounds.width + pad)
  const bottom = Math.min(height, bounds.y + bounds.height + pad)
  return { x, y, width: right - x, height: bottom - y }
}

export interface CutResult {
  frames: RgbaImage[]
  boxes: Bounds[]
}

export function cutFrames(image: RgbaImage, options: CutOptions): CutResult {
  const tolerance = options.tolerance ?? 48
  const padding = options.padding ?? 2
  const mask = foregroundMask(image, options.chroma, tolerance)
  const visited = new Uint8Array(image.width * image.height)
  const boxes: Bounds[] = []

  if (options.columns && options.rows && options.columns > 0 && options.rows > 0) {
    // Grid-aware: one frame per implied cell = the largest component in it.
    const cellW = image.width / options.columns
    const cellH = image.height / options.rows
    for (let r = 0; r < options.rows; r += 1) {
      for (let c = 0; c < options.columns; c += 1) {
        const region: Bounds = {
          x: Math.floor(c * cellW),
          y: Math.floor(r * cellH),
          width: Math.ceil(cellW),
          height: Math.ceil(cellH),
        }
        const comps = componentsInRegion(mask, image.width, image.height, region, visited)
        if (comps.length === 0) continue
        let largest = comps[0]!
        for (const comp of comps) if (comp.area > largest.area) largest = comp
        boxes.push(padBounds(largest.bounds, padding, image.width, image.height))
      }
    }
  } else {
    // Blob mode: every component, no merge, sorted row-major.
    const whole: Bounds = { x: 0, y: 0, width: image.width, height: image.height }
    const minArea = (options.minAreaFraction ?? 0.0015) * image.width * image.height
    const comps = componentsInRegion(mask, image.width, image.height, whole, visited).filter(
      (comp) => comp.area >= Math.max(4, minArea),
    )
    comps.sort((a, b) => {
      const rowTolerance = Math.min(a.bounds.height, b.bounds.height) * 0.5
      if (Math.abs(a.bounds.y - b.bounds.y) > rowTolerance) return a.bounds.y - b.bounds.y
      return a.bounds.x - b.bounds.x
    })
    for (const comp of comps) boxes.push(padBounds(comp.bounds, padding, image.width, image.height))
  }

  return { frames: boxes.map((box) => cropImage(image, box)), boxes }
}
