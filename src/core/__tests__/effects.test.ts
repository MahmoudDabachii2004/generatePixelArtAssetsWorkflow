import { describe, expect, it } from 'vitest'
import { buildEffectPrompt, buildUiPrompt, type CharacterBrief } from '../prompts'
import { recenterToCell } from '../recenter'
import { contentBounds } from '../rgba'
import type { RgbaImage } from '../types'

const brief: CharacterBrief = {
  name: 'FX',
  description: 'une explosion de feu',
  style: '16-bit',
  palette: '12 couleurs',
  chroma: 'green',
  canvas: 1024,
  model: 'chatgpt',
}

describe('vfx & ui prompts', () => {
  it('vfx prompt centres the origin', () => {
    const out = buildEffectPrompt(brief, { frames: 6, columns: 3, rows: 2 })
    expect(out.prompt).toContain('CENTRÉ')
    expect(out.prompt).toContain('VFX')
  })
  it('ui prompt forbids readable numbers/text', () => {
    const out = buildUiPrompt({ ...brief, description: 'barre de vie, boutons' }, { columns: 3, rows: 2 })
    expect(out.prompt).toContain('AUCUN chiffre')
  })
})

describe('recenter: center anchor mode (VFX)', () => {
  it('places content centred, not on the floor', () => {
    const frame: RgbaImage = { data: new Uint8ClampedArray(64 * 64 * 4), width: 64, height: 64 }
    // a 20x20 block near the top-left
    for (let y = 4; y < 24; y += 1) {
      for (let x = 4; x < 24; x += 1) {
        const o = (y * 64 + x) * 4
        frame.data[o] = 200
        frame.data[o + 3] = 255
      }
    }
    const cell = recenterToCell(frame, { cell: 256, anchorMode: 'center' })
    const bounds = contentBounds(cell)
    expect(bounds).not.toBeNull()
    if (bounds) {
      const centreY = bounds.y + bounds.height / 2
      // centred vertically → far from the bottom baseline (255)
      expect(Math.abs(centreY - 128)).toBeLessThanOrEqual(4)
    }
  })
})
