import { upscaleNearestFallback } from '../wasm/nearestNeighbourFallback'

export interface ScoreCandidateInput {
  sourceRgba: Uint8ClampedArray
  sourceWidth: number
  sourceHeight: number
  candidateRgba: Uint8ClampedArray
  candidateWidth: number
  candidateHeight: number
  pixelSize: number
  autoPixelSize: number
}

export function scoreCandidate(input: ScoreCandidateInput): number {
  const {
    sourceRgba,
    sourceWidth,
    sourceHeight,
    candidateRgba,
    candidateWidth,
    candidateHeight,
    pixelSize,
    autoPixelSize,
  } = input
  if (!sourceWidth || !sourceHeight || !candidateWidth || !candidateHeight)
    return Number.MAX_SAFE_INTEGER

  const scaleX = Math.max(1, Math.round(sourceWidth / candidateWidth))
  const scaleY = Math.max(1, Math.round(sourceHeight / candidateHeight))
  const scale = Math.max(1, Math.min(scaleX, scaleY))
  const reconstructed = upscaleNearestFallback({
    rgba: candidateRgba,
    width: candidateWidth,
    height: candidateHeight,
    scale,
  })
  const compareWidth = Math.min(sourceWidth, reconstructed.width)
  const compareHeight = Math.min(sourceHeight, reconstructed.height)
  const stride = Math.max(1, Math.floor(Math.max(compareWidth, compareHeight) / 256))
  let error = 0
  let samples = 0
  for (let y = 0; y < compareHeight; y += stride) {
    for (let x = 0; x < compareWidth; x += stride) {
      const sourceOffset = (y * sourceWidth + x) * 4
      const reconOffset = (y * reconstructed.width + x) * 4
      for (let channel = 0; channel < 4; channel += 1) {
        const delta =
          (sourceRgba[sourceOffset + channel] ?? 0) -
          (reconstructed.rgba[reconOffset + channel] ?? 0)
        error += delta * delta
      }
      samples += 1
    }
  }
  const mse = samples ? error / (samples * 4 * 255 * 255) : 1
  const tinyPenalty = candidateWidth < 4 || candidateHeight < 4 ? 0.4 : 0
  const aspectSource = sourceWidth / sourceHeight
  const aspectCandidate = candidateWidth / candidateHeight
  const aspectPenalty = Math.abs(Math.log(aspectSource / aspectCandidate)) * 0.1
  const distancePenalty = (Math.abs(pixelSize - autoPixelSize) / Math.max(1, autoPixelSize)) * 0.08
  const score = mse + tinyPenalty + aspectPenalty + distancePenalty
  return Number.isFinite(score) ? score : Number.MAX_SAFE_INTEGER
}
