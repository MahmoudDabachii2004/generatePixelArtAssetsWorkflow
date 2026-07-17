import { describe, expect, it } from 'vitest'
import {
  buildActionPrompt,
  buildAnchorPrompt,
  buildDirectionalPrompt,
  buildWalkPrompt,
  type CharacterBrief,
} from '../prompts'
import { flipHorizontal } from '../rgba'
import type { RgbaImage } from '../types'

const brief: CharacterBrief = {
  name: 'Pirate',
  description: 'un capitaine pirate en manteau bleu',
  style: 'pixel art 16-bit chunky',
  palette: '8-16 couleurs',
  chroma: 'green',
  canvas: 1024,
  model: 'chatgpt',
}

describe('prompts: chongdashu skeleton, ingest-tuned', () => {
  it('anchor prompt carries the load-bearing constraints', () => {
    const out = buildAnchorPrompt(brief)
    expect(out.prompt).toContain('#00FF00')
    expect(out.prompt).toContain('bord à bord')
    expect(out.prompt).toContain('pieds')
    expect(out.prompt.toLowerCase()).toContain('anti-aliasing')
    expect(out.attachments[0]?.what).toContain('damier')
  })
  it('directional prompt locks identity and attaches the snapped anchor', () => {
    const out = buildDirectionalPrompt(brief, 'w')
    expect(out.prompt).toContain('LE MÊME personnage')
    expect(out.attachments.some((a) => a.what.includes('SNAPPÉE'))).toBe(true)
  })
  it('action prompt states the grid and forbids grid lines', () => {
    const out = buildActionPrompt(brief, { action: 'attack', direction: 'w', frames: 8, columns: 4, rows: 2 })
    expect(out.prompt).toContain('4 colonnes × 2 lignes')
    expect(out.prompt).toContain('AUCUNE ligne de grille')
    // explicit frame-by-frame beats (chongdashu's action template)
    expect(out.prompt).toContain('extension maximale')
  })
  it('walk prompt hammers the anti-drift rule (free grounded-walk path)', () => {
    const out = buildWalkPrompt(brief, 's', 8)
    expect(out.prompt.toLowerCase()).toContain('marche')
    expect(out.prompt).toContain('NE se déplace PAS')
  })
  it('gemini model gets the anti-grid note', () => {
    const out = buildAnchorPrompt({ ...brief, model: 'gemini' })
    expect(out.modelNote.toLowerCase()).toContain('gemini')
  })
})

describe('flipHorizontal: East = flip of West', () => {
  it('mirrors columns and is its own inverse', () => {
    const src: RgbaImage = { data: new Uint8ClampedArray(2 * 1 * 4), width: 2, height: 1 }
    // left pixel red, right pixel blue
    src.data.set([255, 0, 0, 255], 0)
    src.data.set([0, 0, 255, 255], 4)
    const flipped = flipHorizontal(src)
    expect(Array.from(flipped.data.slice(0, 4))).toEqual([0, 0, 255, 255])
    expect(Array.from(flipped.data.slice(4, 8))).toEqual([255, 0, 0, 255])
    const back = flipHorizontal(flipped)
    expect(Array.from(back.data)).toEqual(Array.from(src.data))
  })
})
