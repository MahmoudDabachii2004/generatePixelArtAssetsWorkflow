export function buildCandidateSizes(autoSize: number, width: number, height: number): number[] {
  const maximum = Math.max(1, Math.floor(Math.min(width, height) / 2))
  const rounded = Math.round(autoSize)
  const values = [
    autoSize,
    Math.floor(autoSize),
    rounded,
    Math.ceil(autoSize),
    rounded - 1,
    rounded + 1,
  ]
  if (Math.abs(autoSize - rounded) > 0.2 && rounded + 2 <= maximum) values.push(rounded + 2)

  const candidates = [...new Set(values.map((value) => Math.round(value * 10) / 10))]
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= maximum)
    .sort((a, b) => Math.abs(a - autoSize) - Math.abs(b - autoSize))
    .slice(0, 5)

  return candidates.length ? candidates : [Math.min(maximum, Math.max(1, Math.round(autoSize)))]
}
