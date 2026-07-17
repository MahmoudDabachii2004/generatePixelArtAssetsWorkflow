export interface RgbColor {
  r: number
  g: number
  b: number
}

const colorDistance = (a: RgbColor, b: RgbColor) =>
  Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)

export function sampleBackground(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  closeness = 28,
): RgbColor | null {
  if (!width || !height || rgba.length !== width * height * 4) return null
  const indices = [0, width - 1, (height - 1) * width, width * height - 1]
  const colors = indices.map((index) => ({
    r: rgba[index * 4] ?? 0,
    g: rgba[index * 4 + 1] ?? 0,
    b: rgba[index * 4 + 2] ?? 0,
  }))
  for (let anchor = 0; anchor < colors.length; anchor += 1) {
    const group = colors.filter((color) => colorDistance(color, colors[anchor]!) <= closeness)
    if (group.length >= 3) {
      const sorted = (key: keyof RgbColor) => group.map((color) => color[key]).sort((a, b) => a - b)
      const r = sorted('r')
      const g = sorted('g')
      const b = sorted('b')
      return {
        r: r[Math.floor(r.length / 2)]!,
        g: g[Math.floor(g.length / 2)]!,
        b: b[Math.floor(b.length / 2)]!,
      }
    }
  }
  return null
}
