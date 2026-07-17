// Pack variable-size items (objects, weapons, icons) into a uniform-cell atlas
// with padding so nothing bleeds into its neighbour. Uniform cells keep the
// atlas engine-friendly and the rect maths trivial. Returns per-item rects for
// the manifest / engine presets.
import { blit, createImage } from './rgba'
import type { RgbaImage } from './types'

export interface AtlasRect {
  name: string
  x: number
  y: number
  width: number
  height: number
}

export interface AtlasResult {
  sheet: RgbaImage
  rects: AtlasRect[]
  columns: number
  rows: number
  cellWidth: number
  cellHeight: number
}

export interface PackAtlasOptions {
  columns?: number
  padding?: number
  names?: string[]
}

export function packAtlas(items: RgbaImage[], options: PackAtlasOptions = {}): AtlasResult {
  const padding = options.padding ?? 2
  let maxWidth = 1
  let maxHeight = 1
  for (const item of items) {
    if (item.width > maxWidth) maxWidth = item.width
    if (item.height > maxHeight) maxHeight = item.height
  }
  const cellWidth = maxWidth + padding * 2
  const cellHeight = maxHeight + padding * 2
  const columns = Math.max(1, options.columns ?? Math.ceil(Math.sqrt(Math.max(1, items.length))))
  const rows = Math.max(1, Math.ceil(items.length / columns))
  const sheet = createImage(columns * cellWidth, rows * cellHeight)
  const rects: AtlasRect[] = []
  items.forEach((item, index) => {
    const cellX = (index % columns) * cellWidth
    const cellY = Math.floor(index / columns) * cellHeight
    const x = cellX + padding + Math.floor((maxWidth - item.width) / 2)
    const y = cellY + padding + Math.floor((maxHeight - item.height) / 2)
    blit(sheet, item, x, y)
    rects.push({
      name: options.names?.[index] ?? `item_${String(index + 1).padStart(2, '0')}`,
      x,
      y,
      width: item.width,
      height: item.height,
    })
  })
  return { sheet, rects, columns, rows, cellWidth, cellHeight }
}
