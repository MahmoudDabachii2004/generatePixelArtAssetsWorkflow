// The calibration checkerboard the prompts tell the user to attach as the
// pixel-discipline reference. chongdashu's is a 1024×1024 board alternating one
// pixel at a time between two near-greys — the model uses it to lock onto a
// hard, aliased pixel lattice. The app must actually PROVIDE it (the old prompt
// system referenced it but never gave the user a way to get it).
import { createImage } from './rgba'
import type { Rgb, RgbaImage } from './types'

export const CALIBRATION_A: Rgb = { r: 232, g: 232, b: 232 } // #E8E8E8
export const CALIBRATION_B: Rgb = { r: 210, g: 210, b: 210 } // #D2D2D2

export function makeCheckerboard(width: number, height: number, cell: number, a: Rgb, b: Rgb): RgbaImage {
  const image = createImage(width, height)
  const size = Math.max(1, Math.floor(cell))
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const useA = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0
      const color = useA ? a : b
      const o = (y * width + x) * 4
      image.data[o] = color.r
      image.data[o + 1] = color.g
      image.data[o + 2] = color.b
      image.data[o + 3] = 255
    }
  }
  return image
}

// The 1-pixel-period pixel-discipline grid (attach for anchors / boards).
export function standardCalibrationGrid(): RgbaImage {
  return makeCheckerboard(1024, 1024, 1, CALIBRATION_A, CALIBRATION_B)
}

// A layout guide at the target board size: big checker cells hint the implied
// COLS×ROWS composition without drawing visible grid lines in the output.
export function poseBoardGuide(columns: number, rows: number, cellPx = 256): RgbaImage {
  return makeCheckerboard(
    Math.max(1, columns) * cellPx,
    Math.max(1, rows) * cellPx,
    cellPx,
    CALIBRATION_A,
    CALIBRATION_B,
  )
}
