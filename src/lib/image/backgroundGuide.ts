export function buildBackgroundGuide(
  sourceRgba: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  outputWidth: number,
  outputHeight: number,
): Uint8ClampedArray {
  if (sourceRgba.length !== sourceWidth * sourceHeight * 4) {
    throw new Error('Source RGBA length does not match its dimensions.')
  }
  if (outputWidth < 1 || outputHeight < 1) {
    throw new Error('Background-guide dimensions must be positive.')
  }

  const guide = new Uint8ClampedArray(outputWidth * outputHeight * 4)
  for (let y = 0; y < outputHeight; y += 1) {
    const sourceY = Math.min(
      sourceHeight - 1,
      Math.floor(((y + 0.5) * sourceHeight) / outputHeight),
    )
    for (let x = 0; x < outputWidth; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(((x + 0.5) * sourceWidth) / outputWidth))
      const sourceOffset = (sourceY * sourceWidth + sourceX) * 4
      const outputOffset = (y * outputWidth + x) * 4
      guide[outputOffset] = sourceRgba[sourceOffset] ?? 0
      guide[outputOffset + 1] = sourceRgba[sourceOffset + 1] ?? 0
      guide[outputOffset + 2] = sourceRgba[sourceOffset + 2] ?? 0
      guide[outputOffset + 3] = sourceRgba[sourceOffset + 3] ?? 255
    }
  }
  return guide
}
