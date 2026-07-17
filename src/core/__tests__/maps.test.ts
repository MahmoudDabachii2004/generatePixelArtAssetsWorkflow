import { describe, expect, it } from 'vitest'
import { buildLayerManifest, composeParallax, type ParallaxLayer } from '../maps'
import { buildLayerPrompt, buildMapPrompt, type CharacterBrief } from '../prompts'
import { fillColor } from '../rgba'
import type { RgbaImage } from '../types'

function solid(width: number, height: number, r: number, g: number, b: number): RgbaImage {
  const image: RgbaImage = { data: new Uint8ClampedArray(width * height * 4), width, height }
  fillColor(image, r, g, b)
  return image
}

const brief: CharacterBrief = {
  name: 'Forêt',
  description: 'une forêt brumeuse',
  style: '16-bit',
  palette: '16 couleurs',
  chroma: 'green',
  canvas: 1024,
  model: 'chatgpt',
}

describe('map & layer prompts', () => {
  it('map prompt asks for an opaque playable map', () => {
    const out = buildMapPrompt(brief, 'top')
    expect(out.prompt.toLowerCase()).toContain('jouable')
    expect(out.prompt).toContain('OPAQUE')
  })
  it('layer prompt asks for seamless + chroma reveal on non-sky layers', () => {
    const out = buildLayerPrompt(brief, { depth: 'moyen', seamless: true })
    expect(out.prompt.toLowerCase()).toContain('raccordable')
    expect(out.prompt).toContain('#00FF00')
  })
  it('sky layer is opaque (no chroma reveal)', () => {
    const out = buildLayerPrompt(brief, { depth: 'ciel', seamless: false })
    expect(out.prompt).toContain('opaque')
  })
})

describe('parallax manifest & compositing', () => {
  it('manifest sorts layers by z (back to front)', () => {
    const json = JSON.parse(
      buildLayerManifest([
        { name: 'front', file: 'front.png', z: 2, scrollFactor: 1, width: 320, height: 180 },
        { name: 'sky', file: 'sky.png', z: 0, scrollFactor: 0, width: 320, height: 180 },
      ]),
    ) as { layers: { name: string }[] }
    expect(json.layers[0]?.name).toBe('sky')
    expect(json.layers[1]?.name).toBe('front')
  })
  it('composes a viewport that is fully opaque when a sky layer fills it', () => {
    const layers: ParallaxLayer[] = [
      { name: 'sky', z: 0, scrollFactor: 0, image: solid(8, 8, 30, 60, 120) },
      { name: 'hill', z: 1, scrollFactor: 0.5, image: solid(4, 4, 40, 120, 40) },
    ]
    const view = composeParallax(layers, 8, 8, 3)
    expect(view.width).toBe(8)
    expect(view.height).toBe(8)
    // top-left pixel is covered by the opaque sky
    expect(view.data[3]).toBe(255)
  })
})
