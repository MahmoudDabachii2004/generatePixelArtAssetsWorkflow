import { describe, expect, it } from 'vitest'
import { packAtlas } from '../atlas'
import { rectsFromGrid, toGenericAtlas, toPhaserAtlas } from '../export'
import { buildObjectPrompt, buildTilesetPrompt, type CharacterBrief } from '../prompts'
import { isEmpty, sliceUniform } from '../tiles'
import type { RgbaImage } from '../types'

function makeImage(width: number, height: number, opaque = false): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4)
  if (opaque) for (let i = 0; i < width * height; i += 1) data[i * 4 + 3] = 255
  return { data, width, height }
}

const brief: CharacterBrief = {
  name: 'Kit',
  description: 'des potions et des clés',
  style: '16-bit',
  palette: '8-16 couleurs',
  chroma: 'green',
  canvas: 1024,
  model: 'chatgpt',
}

describe('tiles: uniform slicing (no trim)', () => {
  it('slices a board into columns*rows equal tiles', () => {
    const tiles = sliceUniform(makeImage(40, 20), 4, 2)
    expect(tiles.length).toBe(8)
    expect(tiles[0]?.width).toBe(10)
    expect(tiles[0]?.height).toBe(10)
  })
  it('detects empty tiles', () => {
    expect(isEmpty(makeImage(8, 8))).toBe(true)
    expect(isEmpty(makeImage(8, 8, true))).toBe(false)
  })
})

describe('atlas: uniform-cell packing with padding, no bleed', () => {
  it('packs items and reports in-bounds rects', () => {
    const items = [makeImage(5, 5, true), makeImage(8, 3, true), makeImage(4, 9, true)]
    const atlas = packAtlas(items, { padding: 2, columns: 2 })
    expect(atlas.rects.length).toBe(3)
    for (const rect of atlas.rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.width).toBeLessThanOrEqual(atlas.sheet.width)
      expect(rect.y + rect.height).toBeLessThanOrEqual(atlas.sheet.height)
    }
  })
})

describe('export presets', () => {
  it('Phaser atlas is valid JSON with named frames', () => {
    const rects = rectsFromGrid(5, 2, 256, 8, 'walk_w')
    const json = JSON.parse(toPhaserAtlas('walk-w.png', 1280, 512, rects)) as {
      frames: Record<string, unknown>
      meta: { image: string }
    }
    expect(Object.keys(json.frames)).toContain('walk_w_01')
    expect(json.meta.image).toBe('walk-w.png')
  })
  it('generic atlas lists frames', () => {
    const rects = rectsFromGrid(2, 1, 32, 2, 'obj')
    const json = JSON.parse(toGenericAtlas('a.png', 64, 32, rects)) as { frames: unknown[] }
    expect(json.frames.length).toBe(2)
  })
})

describe('prompts: objects & tilesets', () => {
  it('object set forbids grid lines', () => {
    expect(buildObjectPrompt(brief, { set: true, count: 6, columns: 3, rows: 2 }).prompt).toContain('AUCUNE ligne de grille')
  })
  it('tileset asks for seamless edges', () => {
    expect(buildTilesetPrompt(brief, { columns: 4, rows: 4, tilePx: 32 }).prompt.toLowerCase()).toContain('raccordables')
  })
})
