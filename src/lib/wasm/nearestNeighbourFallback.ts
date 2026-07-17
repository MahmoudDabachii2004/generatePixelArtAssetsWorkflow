import type { PixelBuffer } from '../../app/appTypes'
import { estimateAllocation } from '../processing/memoryLimits'

export interface UpscaleRequest extends PixelBuffer {
  scale: number
}

export function upscaleNearestFallback({
  rgba,
  width,
  height,
  scale,
}: UpscaleRequest): PixelBuffer {
  if (!Number.isInteger(scale) || scale < 1) throw new Error('Scale must be a positive integer.')
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.')
  }
  if (rgba.length !== width * height * 4) {
    throw new Error('RGBA length does not match the dimensions.')
  }
  const estimate = estimateAllocation(width, height, scale)
  if (!estimate.safe) throw new Error('The requested output exceeds the safe memory limit.')
  if (scale === 1) return { rgba: new Uint8ClampedArray(rgba), width, height }

  const sourceBytes = rgba.byteOffset % 4 === 0 ? rgba : new Uint8ClampedArray(rgba)
  const sourcePixels = new Uint32Array(
    sourceBytes.buffer,
    sourceBytes.byteOffset,
    sourceBytes.byteLength / 4,
  )
  const output = new Uint8ClampedArray(estimate.bytes)
  const outputPixels = new Uint32Array(output.buffer)
  const expandedRowWidth = estimate.width

  for (let sourceY = 0; sourceY < height; sourceY += 1) {
    const expandedRowStart = sourceY * scale * expandedRowWidth
    const sourceRowStart = sourceY * width
    for (let sourceX = 0; sourceX < width; sourceX += 1) {
      const targetStart = expandedRowStart + sourceX * scale
      outputPixels.fill(
        sourcePixels[sourceRowStart + sourceX] ?? 0,
        targetStart,
        targetStart + scale,
      )
    }
    const completedRow = outputPixels.subarray(
      expandedRowStart,
      expandedRowStart + expandedRowWidth,
    )
    for (let copy = 1; copy < scale; copy += 1) {
      outputPixels.set(completedRow, expandedRowStart + copy * expandedRowWidth)
    }
  }

  return { rgba: output, width: estimate.width, height: estimate.height }
}
