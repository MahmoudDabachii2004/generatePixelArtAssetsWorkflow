// Uniform tile slicing for tilesets. Unlike character frames, tiles are a
// strict regular grid and must NOT be trimmed to content (a tile's transparent
// margin is meaningful), so this is a plain uniform crop — no component search.
import { cropImage } from './rgba'
import type { RgbaImage } from './types'

export function sliceUniform(image: RgbaImage, columns: number, rows: number): RgbaImage[] {
  const cols = Math.max(1, Math.floor(columns))
  const rws = Math.max(1, Math.floor(rows))
  const cellW = Math.floor(image.width / cols)
  const cellH = Math.floor(image.height / rws)
  const tiles: RgbaImage[] = []
  for (let r = 0; r < rws; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      tiles.push(cropImage(image, { x: c * cellW, y: r * cellH, width: cellW, height: cellH }))
    }
  }
  return tiles
}

// A tile is "empty" if every pixel is transparent — used to drop blank cells
// from a chroma board after background removal.
export function isEmpty(image: RgbaImage, alphaThreshold = 8): boolean {
  for (let i = 0; i < image.width * image.height; i += 1) {
    if ((image.data[i * 4 + 3] ?? 0) > alphaThreshold) return false
  }
  return true
}
