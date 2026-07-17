// Recentre + foot-anchor into a fixed cell. This is the frame-drift fix the
// old app skipped/broke: every frame is trimmed to content, integer-upscaled
// to fill the cell, then placed so its bottom row sits on the foot baseline
// (y=255) and its horizontal centre on x=128. Placement is integer TRANSLATION
// only — never a fractional scale — so the snapped native grid survives and
// the feet land on the same screen point in every frame.
import { blit, contentBounds, createImage, cropImage, upscaleNearest } from './rgba'
import { CELL_SIZE, FOOT_ANCHOR } from './types'
import type { RgbaImage } from './types'

export interface RecenterOptions {
  cell?: number
  anchorX?: number
  anchorY?: number
  anchorMode?: 'feet' | 'center' // feet = bottom baseline (characters); center = origin (VFX)
  fillHeight?: number // fraction of the cell the content may fill (headroom for tall frames)
  allowUpscale?: boolean
}

export function recenterToCell(image: RgbaImage, options: RecenterOptions = {}): RgbaImage {
  const cell = options.cell ?? CELL_SIZE
  const mode = options.anchorMode ?? 'feet'
  const anchorX = options.anchorX ?? (cell === CELL_SIZE ? FOOT_ANCHOR.x : Math.floor(cell / 2))
  const anchorY = options.anchorY ?? (mode === 'center' ? Math.floor(cell / 2) : cell - 1)
  const fillHeight = options.fillHeight ?? 0.98

  const bounds = contentBounds(image)
  if (!bounds) return createImage(cell, cell)

  let content = cropImage(image, bounds)

  if (options.allowUpscale !== false) {
    const maxHeight = cell * fillHeight
    const factor = Math.max(
      1,
      Math.floor(Math.min(maxHeight / content.height, cell / content.width)),
    )
    if (factor > 1) content = upscaleNearest(content, factor)
  }

  const out = createImage(cell, cell)
  const dx = Math.round(anchorX - content.width / 2)
  // feet: bottom content row lands on anchorY; center: content centre lands on anchorY.
  const dy = mode === 'center' ? Math.round(anchorY - content.height / 2) : anchorY - content.height + 1
  blit(out, content, dx, dy)
  return out
}
