// Pack cells into the canonical runtime sheet and emit the exact manifest.
// Fixed 5 columns (sheet width = 5 * cell), rows = ceil(frames/5); trailing
// cells stay transparent. Row-major order. This is the contract vibe-fighter's
// Phaser loader assumes, so output is drop-in.
import { blit, createImage } from './rgba'
import { CELL_SIZE, FOOT_ANCHOR, SHEET_COLUMNS } from './types'
import type { RgbaImage, SheetManifest, SpriteMode } from './types'

export interface PackResult {
  sheet: RgbaImage
  columns: number
  rows: number
  cell: number
}

export function packSheet(cells: RgbaImage[], columns = SHEET_COLUMNS): PackResult {
  const cell = cells[0]?.width ?? CELL_SIZE
  const cols = Math.max(1, columns)
  const rows = Math.max(1, Math.ceil(cells.length / cols))
  const sheet = createImage(cols * cell, rows * cell)
  cells.forEach((frame, index) => {
    blit(sheet, frame, (index % cols) * cell, Math.floor(index / cols) * cell)
  })
  return { sheet, columns: cols, rows, cell }
}

export interface ManifestInput {
  action: string
  direction: string
  frames: number
  columns: number
  rows: number
  cell?: number
  fps?: number
  mode?: SpriteMode
  spritesheet?: string
  previewGif?: string
}

export function buildManifest(input: ManifestInput): SheetManifest {
  const cell = input.cell ?? CELL_SIZE
  return {
    version: 1,
    action: input.action,
    direction: input.direction,
    spritesheet: input.spritesheet ?? 'spritesheet.png',
    previewGif: input.previewGif ?? 'preview.gif',
    frameWidth: cell,
    frameHeight: cell,
    columns: input.columns,
    rows: input.rows,
    frames: input.frames,
    fps: input.fps ?? 10,
    mode: input.mode ?? 'image',
    anchor: { x: FOOT_ANCHOR.x, y: FOOT_ANCHOR.y },
  }
}
