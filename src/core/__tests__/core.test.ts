import { describe, expect, it } from 'vitest'
import { cutFrames } from '../cut'
import { recenterToCell } from '../recenter'
import { detectAndSnap } from '../snap'
import { upscaleNearest, contentBounds } from '../rgba'
import { processBoard } from '../pipeline'
import { CHROMA_GREEN, FOOT_ANCHOR, type RgbaImage } from '../types'

function makeImage(width: number, height: number): RgbaImage {
  return { data: new Uint8ClampedArray(width * height * 4), width, height }
}
function fill(image: RgbaImage, r: number, g: number, b: number, a = 255): void {
  for (let i = 0; i < image.width * image.height; i += 1) {
    const o = i * 4
    image.data[o] = r
    image.data[o + 1] = g
    image.data[o + 2] = b
    image.data[o + 3] = a
  }
}
function rect(image: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number): void {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue
      const o = (y * image.width + x) * 4
      image.data[o] = r
      image.data[o + 1] = g
      image.data[o + 2] = b
      image.data[o + 3] = 255
    }
  }
}
function bottomOpaqueRow(image: RgbaImage): number {
  for (let y = image.height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) > 8) return y
    }
  }
  return -1
}
function horizontalCentre(image: RgbaImage): number {
  const b = contentBounds(image)
  return b ? b.x + b.width / 2 : -1
}

describe('snap: recovers the native grid and never over-shrinks', () => {
  it('detects the pixel period of an upscaled native image', () => {
    // A 5x7 native with a distinct colour per cell, upscaled x12 -> hard edges
    // every 12px. The detector must recover ~5x7, not a harmonic (too few cells).
    const native = makeImage(5, 7)
    for (let cy = 0; cy < 7; cy += 1) {
      for (let cx = 0; cx < 5; cx += 1) {
        const o = (cy * 5 + cx) * 4
        native.data[o] = 20 + cx * 40
        native.data[o + 1] = 20 + cy * 25
        native.data[o + 2] = 120
        native.data[o + 3] = 255
      }
    }
    const big = upscaleNearest(native, 12)
    const snap = detectAndSnap(big, { minCells: 2, maxCells: 40 })
    expect(snap.cellsX).toBeGreaterThanOrEqual(4)
    expect(snap.cellsX).toBeLessThanOrEqual(6)
    expect(snap.cellsY).toBeGreaterThanOrEqual(6)
    expect(snap.cellsY).toBeLessThanOrEqual(8)
    expect(snap.pixelSizeX).toBeGreaterThanOrEqual(9)
    expect(snap.pixelSizeX).toBeLessThanOrEqual(15)
  })
})

describe('cut: separates neighbours, never merges', () => {
  it('blob mode keeps two nearby sprites as two frames', () => {
    const board = makeImage(120, 60)
    fill(board, 0, 255, 0)
    rect(board, 10, 10, 30, 40, 200, 40, 40)
    rect(board, 70, 10, 40, 40, 40, 80, 200)
    const cut = cutFrames(board, { chroma: CHROMA_GREEN, tolerance: 60 })
    expect(cut.frames.length).toBe(2)
  })
  it('grid mode returns exactly one frame per implied cell', () => {
    const board = makeImage(200, 100)
    fill(board, 0, 255, 0)
    rect(board, 20, 30, 40, 60, 200, 40, 40)
    rect(board, 120, 20, 50, 70, 40, 80, 200)
    const cut = cutFrames(board, { chroma: CHROMA_GREEN, tolerance: 60, columns: 2, rows: 1 })
    expect(cut.frames.length).toBe(2)
  })
})

describe('recenter: foot-anchors every frame to the same baseline', () => {
  it('places the content bottom on y=255 and centres it on x=128', () => {
    const frame = makeImage(80, 80)
    rect(frame, 10, 5, 30, 50, 180, 60, 60) // off-centre, not touching bottom
    const cell = recenterToCell(frame)
    expect(bottomOpaqueRow(cell)).toBe(FOOT_ANCHOR.y)
    expect(Math.abs(horizontalCentre(cell) - FOOT_ANCHOR.x)).toBeLessThanOrEqual(2)
    expect(cell.width).toBe(256)
    expect(cell.height).toBe(256)
  })
})

describe('pipeline: board -> cut -> snap -> recentre -> pack', () => {
  const board = makeImage(200, 100)
  fill(board, 0, 255, 0)
  rect(board, 20, 30, 40, 60, 200, 40, 40)
  rect(board, 120, 20, 50, 70, 40, 80, 200)
  const result = processBoard(board, { columns: 2, rows: 1, snap: false, action: 'walk', direction: 'w' })

  it('produces one cell per sprite, foot-anchored', () => {
    expect(result.cells.length).toBe(2)
    for (const cell of result.cells) {
      expect(cell.width).toBe(256)
      expect(cell.height).toBe(256)
      expect(bottomOpaqueRow(cell)).toBe(FOOT_ANCHOR.y)
      // corners are transparent (chroma removed globally)
      expect(cell.data[3]).toBe(0)
    }
  })
  it('packs into a canonical 1280-wide 5-column sheet', () => {
    expect(result.sheet.width).toBe(1280)
    expect(result.sheet.height).toBe(256)
    expect(result.pack.columns).toBe(5)
    expect(result.pack.rows).toBe(1)
  })
  it('emits the canonical manifest with the (128,255) anchor', () => {
    expect(result.manifest).toMatchObject({
      version: 1,
      action: 'walk',
      direction: 'w',
      frameWidth: 256,
      frameHeight: 256,
      columns: 5,
      frames: 2,
      anchor: { x: 128, y: 255 },
      mode: 'image',
    })
  })
})
