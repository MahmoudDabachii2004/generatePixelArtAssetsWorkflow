import { describe, expect, it } from 'vitest'
import { makeCheckerboard, poseBoardGuide, standardCalibrationGrid, CALIBRATION_A, CALIBRATION_B } from '../calibration'

describe('calibration grid', () => {
  it('alternates every pixel at cell=1', () => {
    const grid = standardCalibrationGrid()
    expect(grid.width).toBe(1024)
    expect(grid.height).toBe(1024)
    // (0,0) = A, (1,0) = B, (0,1) = B, (1,1) = A
    expect(grid.data[0]).toBe(CALIBRATION_A.r)
    expect(grid.data[4]).toBe(CALIBRATION_B.r)
    const rowBelow = 1024 * 4
    expect(grid.data[rowBelow]).toBe(CALIBRATION_B.r)
    expect(grid.data[3]).toBe(255)
  })
  it('makeCheckerboard honours the cell size', () => {
    const grid = makeCheckerboard(4, 2, 2, CALIBRATION_A, CALIBRATION_B)
    // cell 2 → (0,0) and (1,0) share colour A
    expect(grid.data[0]).toBe(CALIBRATION_A.r)
    expect(grid.data[4]).toBe(CALIBRATION_A.r)
    // (2,0) flips to B
    expect(grid.data[8]).toBe(CALIBRATION_B.r)
  })
  it('pose-board guide has the requested cell layout', () => {
    const guide = poseBoardGuide(4, 3, 100)
    expect(guide.width).toBe(400)
    expect(guide.height).toBe(300)
  })
})
