export const MAX_OUTPUT_PIXELS = 100_000_000
export const WARNING_OUTPUT_BYTES = 256 * 1024 * 1024

export interface AllocationEstimate {
  width: number
  height: number
  pixels: number
  bytes: number
  safe: boolean
  warning: boolean
}

export function estimateAllocation(
  width: number,
  height: number,
  scale: number,
): AllocationEstimate {
  if (![width, height, scale].every(Number.isFinite) || width <= 0 || height <= 0 || scale < 1) {
    return { width: 0, height: 0, pixels: 0, bytes: 0, safe: false, warning: false }
  }
  const outputWidth = width * scale
  const outputHeight = height * scale
  const pixels = outputWidth * outputHeight
  const bytes = pixels * 4
  const safe = Number.isSafeInteger(pixels) && pixels <= MAX_OUTPUT_PIXELS
  return {
    width: outputWidth,
    height: outputHeight,
    pixels,
    bytes,
    safe,
    warning: bytes >= WARNING_OUTPUT_BYTES,
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = units[0]
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024
    unit = units[index]
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${unit}`
}
