// Engine export presets. We ship formats we can produce correctly without
// guessing version-specific binary formats: a Phaser 3 JSON-hash atlas (stable
// and widely re-usable), our own generic atlas JSON, and a plain-language
// import note for the other engines (Godot / Unity / GameMaker / LÖVE) so the
// user always has a correct path.
import type { AtlasRect } from './atlas'
import type { SheetManifest } from './types'

// Per-frame rects for a uniform grid sheet (character animations).
export function rectsFromGrid(
  columns: number,
  rows: number,
  cell: number,
  count: number,
  namePrefix: string,
): AtlasRect[] {
  const rects: AtlasRect[] = []
  for (let i = 0; i < count; i += 1) {
    const c = i % columns
    const r = Math.floor(i / columns)
    if (r >= rows) break
    rects.push({
      name: `${namePrefix}_${String(i + 1).padStart(2, '0')}`,
      x: c * cell,
      y: r * cell,
      width: cell,
      height: cell,
    })
  }
  return rects
}

export function toPhaserAtlas(imageName: string, width: number, height: number, rects: AtlasRect[]): string {
  const frames: Record<string, unknown> = {}
  for (const rect of rects) {
    frames[rect.name] = {
      frame: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: rect.width, h: rect.height },
      sourceSize: { w: rect.width, h: rect.height },
    }
  }
  return JSON.stringify(
    {
      frames,
      meta: {
        app: 'Pixel Forge',
        version: '1.0',
        image: imageName,
        format: 'RGBA8888',
        size: { w: width, h: height },
        scale: '1',
      },
    },
    null,
    2,
  )
}

export function toGenericAtlas(imageName: string, width: number, height: number, rects: AtlasRect[]): string {
  return JSON.stringify(
    {
      image: imageName,
      size: { width, height },
      frames: rects.map((rect) => ({ name: rect.name, x: rect.x, y: rect.y, width: rect.width, height: rect.height })),
    },
    null,
    2,
  )
}

export function toEngineNotes(manifest: SheetManifest, imageName: string): string {
  const { frameWidth, frameHeight, columns, frames, fps, anchor } = manifest
  return [
    `# Import — ${imageName}`,
    ``,
    `Feuille uniforme : ${columns} colonnes, cellule ${frameWidth}×${frameHeight}, ${frames} frames, ${fps} fps.`,
    `Point d'ancrage (pivot) : (${anchor.x}, ${anchor.y}) = centre-bas (pieds).`,
    ``,
    `## Godot 4`,
    `AnimatedSprite2D → SpriteFrames → "Add frames from Sprite Sheet", grille ${frameWidth}×${frameHeight}. Régle l'offset du pivot à (${anchor.x - frameWidth / 2}, ${anchor.y - frameHeight}).`,
    ``,
    `## Unity 2D`,
    `Sprite Mode = Multiple, Sprite Editor → Slice → Grid By Cell Size ${frameWidth}×${frameHeight}, Pivot = Custom (${(anchor.x / frameWidth).toFixed(3)}, ${(1 - anchor.y / frameHeight).toFixed(3)}).`,
    ``,
    `## GameMaker`,
    `Nouveau sprite → importer la strip, ${frames} frames de ${frameWidth}×${frameHeight}, origine (${anchor.x}, ${anchor.y}).`,
    ``,
    `## Phaser 3`,
    `Utilise le fichier atlas .json fourni : this.load.atlas(key, '${imageName}', 'atlas.json').`,
    ``,
    `## LÖVE`,
    `Découpe en quads de ${frameWidth}×${frameHeight} ; origine de dessin (${anchor.x}, ${anchor.y}).`,
  ].join('\n')
}
