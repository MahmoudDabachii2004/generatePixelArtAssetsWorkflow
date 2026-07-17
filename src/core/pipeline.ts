// The deterministic core pipeline — the "80%" that must be correct.
// board -> cut (no merge) -> remove chroma -> pixel snap -> recentre+foot-lock
// -> pack (1280-wide, 5 cols, 256 cells) + canonical manifest.
//
// This is the flow that proves "it works" for the user's own case: I already
// have a sheet, just cut -> pixel -> align -> export.
import { removeChroma } from './bg'
import { cutFrames } from './cut'
import type { CutResult } from './cut'
import { buildManifest, packSheet } from './pack'
import type { PackResult } from './pack'
import { recenterToCell } from './recenter'
import { detectAndSnap } from './snap'
import { CELL_SIZE, CHROMA_GREEN } from './types'
import type { Rgb, RgbaImage, SheetManifest, SpriteMode } from './types'

export interface ProcessBoardOptions {
  chroma?: Rgb
  tolerance?: number
  columns?: number
  rows?: number
  snap?: boolean
  cell?: number
  anchorMode?: 'feet' | 'center'
  action?: string
  direction?: string
  fps?: number
  mode?: SpriteMode
}

export interface ProcessBoardResult {
  frames: RgbaImage[] // recovered frames straight out of the cut
  natives: RgbaImage[] // snapped native frames (pre-upscale)
  cells: RgbaImage[] // recentred, foot-anchored 256px cells
  sheet: RgbaImage
  manifest: SheetManifest
  boxes: CutResult['boxes']
  pack: PackResult
}

export function processBoard(board: RgbaImage, options: ProcessBoardOptions = {}): ProcessBoardResult {
  const chroma = options.chroma ?? CHROMA_GREEN
  const tolerance = options.tolerance ?? 60
  const cell = options.cell ?? CELL_SIZE

  const cut = cutFrames(board, {
    chroma,
    tolerance,
    columns: options.columns,
    rows: options.rows,
  })

  const natives: RgbaImage[] = []
  const cells = cut.frames.map((frame) => {
    const noBackground = removeChroma(frame, { chroma, tolerance, despill: true })
    const native = options.snap === false ? noBackground : detectAndSnap(noBackground).native
    natives.push(native)
    return recenterToCell(native, { cell, anchorMode: options.anchorMode })
  })

  const pack = packSheet(cells)
  const manifest = buildManifest({
    action: options.action ?? 'idle',
    direction: options.direction ?? 's',
    frames: cells.length,
    columns: pack.columns,
    rows: pack.rows,
    cell,
    fps: options.fps,
    mode: options.mode,
  })

  return { frames: cut.frames, natives, cells, sheet: pack.sheet, manifest, boxes: cut.boxes, pack }
}
