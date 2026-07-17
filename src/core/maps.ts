// Parallax / layered maps. Layers are composited back-to-front, each scrolling
// at its own factor and tiled horizontally so scrolling is seamless. The
// manifest records z-order + scroll factor so an engine can reproduce it.
import { blitOver, createImage } from './rgba'
import type { RgbaImage } from './types'

export interface ParallaxLayer {
  name: string
  z: number // paint order, low = far/back
  scrollFactor: number // 0 = fixed (far sky), 1 = moves with camera (foreground)
  image: RgbaImage
}

export interface LayerManifestEntry {
  name: string
  file: string
  z: number
  scrollFactor: number
  width: number
  height: number
}

export function buildLayerManifest(entries: LayerManifestEntry[]): string {
  const ordered = [...entries].sort((a, b) => a.z - b.z)
  return JSON.stringify({ type: 'parallax', layers: ordered }, null, 2)
}

// Compose a viewport at a given horizontal scroll offset. Each layer is offset
// by -scrollX*scrollFactor and tiled across the viewport width; aligned to the
// bottom so ground layers sit on the floor. Pure — used for the live preview.
export function composeParallax(
  layers: ParallaxLayer[],
  viewportWidth: number,
  viewportHeight: number,
  scrollX: number,
): RgbaImage {
  const out = createImage(viewportWidth, viewportHeight)
  const ordered = [...layers].sort((a, b) => a.z - b.z)
  for (const layer of ordered) {
    const width = Math.max(1, layer.image.width)
    const offset = Math.round(-scrollX * layer.scrollFactor)
    const y = viewportHeight - layer.image.height
    let startX = offset % width
    if (startX > 0) startX -= width
    for (let x = startX; x < viewportWidth; x += width) {
      blitOver(out, layer.image, x, y)
    }
  }
  return out
}
