// Core data model shared by every pure pipeline step.
// The whole pipeline operates on plain RGBA buffers so each step is a pure,
// testable function with no DOM/canvas dependency. The UI layer is the only
// place that decodes/encodes PNGs (via canvas); everything below is pure.

export interface RgbaImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export type SpriteMode = 'image' | 'video'

// The canonical runtime manifest, matching chongdashu / vibe-fighter exactly so
// output is drop-in for Phaser/Godot. Fields (and the `mode` field the shipped
// manifests carry but the docs omit) are reproduced verbatim.
export interface SheetManifest {
  version: number
  action: string
  direction: string
  spritesheet: string
  previewGif?: string
  frameWidth: number
  frameHeight: number
  columns: number
  rows: number
  frames: number
  fps: number
  mode: SpriteMode
  anchor: { x: number; y: number }
}

// The canonical runtime contract (chongdashu): 256px cells, 5 columns,
// foot-anchored at the horizontal centre / bottom row of a cell.
export const CELL_SIZE = 256
export const SHEET_COLUMNS = 5
export const FOOT_ANCHOR = { x: 128, y: 255 } as const
export const CHROMA_GREEN: Rgb = { r: 0, g: 255, b: 0 }
export const CHROMA_MAGENTA: Rgb = { r: 255, g: 0, b: 255 }
