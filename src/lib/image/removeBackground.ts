import type { PixelBuffer } from '../../app/appTypes'

export interface RemoveBackgroundOptions {
  target: { r: number; g: number; b: number }
  tolerance: number
  edgeCleanup?: boolean
  edgeTrimPercent?: number
}

export interface BackgroundRemovalAssessment {
  warning: string | null
  originalOpaquePixels: number
  remainingOpaquePixels: number
  separableForegroundPixels: number
}

function squaredDistance(
  r: number,
  g: number,
  b: number,
  target: RemoveBackgroundOptions['target'],
): number {
  const dr = r - target.r
  const dg = g - target.g
  const db = b - target.b
  return dr * dr + dg * dg + db * db
}

function validateBuffer(rgba: Uint8ClampedArray, width: number, height: number, name: string) {
  if (rgba.length !== width * height * 4) {
    throw new Error(`${name} RGBA length does not match dimensions.`)
  }
}

export function removeBackground(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: RemoveBackgroundOptions,
  guideRgba: Uint8ClampedArray = rgba,
): PixelBuffer {
  validateBuffer(rgba, width, height, 'Image')
  validateBuffer(guideRgba, width, height, 'Background guide')

  const output = new Uint8ClampedArray(rgba)
  const threshold = Math.max(0, Math.min(100, options.tolerance)) / 100
  const thresholdSquared = threshold * threshold * 3 * 255 * 255
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let queueLength = 0

  const matches = (pixelIndex: number) => {
    const offset = pixelIndex * 4
    if ((guideRgba[offset + 3] ?? 0) === 0) return true
    return (
      squaredDistance(
        guideRgba[offset] ?? 0,
        guideRgba[offset + 1] ?? 0,
        guideRgba[offset + 2] ?? 0,
        options.target,
      ) <= thresholdSquared
    )
  }
  const enqueue = (pixelIndex: number) => {
    if (visited[pixelIndex] || !matches(pixelIndex)) return
    visited[pixelIndex] = 1
    queue[queueLength] = pixelIndex
    queueLength += 1
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

  for (let cursor = 0; cursor < queueLength; cursor += 1) {
    const pixelIndex = queue[cursor] ?? 0
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)
    const offset = pixelIndex * 4
    output[offset + 3] = 0
    if (x > 0) enqueue(pixelIndex - 1)
    if (x + 1 < width) enqueue(pixelIndex + 1)
    if (y > 0) enqueue(pixelIndex - width)
    if (y + 1 < height) enqueue(pixelIndex + width)
  }

  if (options.edgeCleanup) {
    const cleanupThreshold = Math.min(1, threshold + 0.04)
    const cleanupThresholdSquared = cleanupThreshold * cleanupThreshold * 3 * 255 * 255
    for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
      const offset = pixelIndex * 4
      if (output[offset + 3] === 0) continue
      const x = pixelIndex % width
      const y = Math.floor(pixelIndex / width)
      const touchesTransparent =
        (x > 0 && output[(pixelIndex - 1) * 4 + 3] === 0) ||
        (x + 1 < width && output[(pixelIndex + 1) * 4 + 3] === 0) ||
        (y > 0 && output[(pixelIndex - width) * 4 + 3] === 0) ||
        (y + 1 < height && output[(pixelIndex + width) * 4 + 3] === 0)
      if (
        touchesTransparent &&
        squaredDistance(
          guideRgba[offset] ?? 0,
          guideRgba[offset + 1] ?? 0,
          guideRgba[offset + 2] ?? 0,
          options.target,
        ) <= cleanupThresholdSquared
      ) {
        output[offset + 3] = Math.min(output[offset + 3] ?? 255, 32)
      }
    }
  }

  const trimPercent = Math.max(0, Math.min(3, options.edgeTrimPercent ?? 0))
  const trimIterations = Math.round((Math.min(width, height) * trimPercent) / 100)
  if (trimIterations > 0) {
    const trimThreshold = Math.min(1, threshold + 0.08)
    const trimThresholdSquared = trimThreshold * trimThreshold * 3 * 255 * 255
    for (let iteration = 0; iteration < trimIterations; iteration += 1) {
      const alphaSnapshot = new Uint8ClampedArray(width * height)
      for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
        alphaSnapshot[pixelIndex] = output[pixelIndex * 4 + 3] ?? 0
      }
      let removedThisPass = 0
      for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
        if ((alphaSnapshot[pixelIndex] ?? 0) === 0) continue
        const x = pixelIndex % width
        const y = Math.floor(pixelIndex / width)
        const touchesTransparent =
          (x > 0 && alphaSnapshot[pixelIndex - 1] === 0) ||
          (x + 1 < width && alphaSnapshot[pixelIndex + 1] === 0) ||
          (y > 0 && alphaSnapshot[pixelIndex - width] === 0) ||
          (y + 1 < height && alphaSnapshot[pixelIndex + width] === 0)
        if (!touchesTransparent) continue
        const offset = pixelIndex * 4
        if (
          squaredDistance(
            guideRgba[offset] ?? 0,
            guideRgba[offset + 1] ?? 0,
            guideRgba[offset + 2] ?? 0,
            options.target,
          ) <= trimThresholdSquared
        ) {
          output[offset + 3] = 0
          removedThisPass += 1
        }
      }
      if (removedThisPass === 0) break
    }
  }

  return { rgba: output, width, height }
}

export function assessBackgroundRemoval(
  sourceRgba: Uint8ClampedArray,
  guideRgba: Uint8ClampedArray,
  resultRgba: Uint8ClampedArray,
  width: number,
  height: number,
  target: RemoveBackgroundOptions['target'],
): BackgroundRemovalAssessment {
  validateBuffer(sourceRgba, width, height, 'Image')
  validateBuffer(guideRgba, width, height, 'Background guide')
  validateBuffer(resultRgba, width, height, 'Result')

  const totalPixels = width * height
  let originalOpaquePixels = 0
  let remainingOpaquePixels = 0
  let separableForegroundPixels = 0
  const separableThresholdSquared = 27

  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
    const offset = pixelIndex * 4
    if ((sourceRgba[offset + 3] ?? 0) > 0) originalOpaquePixels += 1
    if ((resultRgba[offset + 3] ?? 0) > 0) remainingOpaquePixels += 1
    if (
      (guideRgba[offset + 3] ?? 0) > 0 &&
      squaredDistance(
        guideRgba[offset] ?? 0,
        guideRgba[offset + 1] ?? 0,
        guideRgba[offset + 2] ?? 0,
        target,
      ) > separableThresholdSquared
    ) {
      separableForegroundPixels += 1
    }
  }

  let warning: string | null = null
  const minimumForeground = Math.max(8, Math.ceil(totalPixels * 0.0015))
  const mostlyOpaqueSource = originalOpaquePixels >= totalPixels * 0.5

  if (
    totalPixels >= 256 &&
    mostlyOpaqueSource &&
    separableForegroundPixels <= minimumForeground &&
    remainingOpaquePixels <= minimumForeground
  ) {
    warning = `Safety stop: the background and subject are effectively the same color at this grid size. Only ${remainingOpaquePixels.toLocaleString()} pixels would remain, so export is disabled. Choose a different target, use more source colors, or turn background removal off.`
  } else if (
    totalPixels >= 256 &&
    separableForegroundPixels > minimumForeground &&
    remainingOpaquePixels < separableForegroundPixels * 0.35
  ) {
    warning = `Safety stop: this tolerance removed most colors that were distinguishable from the background. Lower the tolerance or choose a more precise target color before exporting.`
  }

  return {
    warning,
    originalOpaquePixels,
    remainingOpaquePixels,
    separableForegroundPixels,
  }
}
