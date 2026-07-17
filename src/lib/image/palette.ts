export interface PaletteParseResult {
  colors: string[]
  error: string | null
}

export const EXAMPLE_PALETTE = [
  '0d2b45',
  '203c56',
  '544e68',
  '8d697a',
  'd08159',
  'ffaa5e',
  'ffd4a3',
  'ffecd6',
]

export function parsePalette(value: string): PaletteParseResult {
  if (!value.trim()) return { colors: [], error: null }
  const raw = value.split(',').map((entry) => entry.trim())
  if (raw.some((entry) => !entry)) {
    return { colors: [], error: 'Remove empty palette entries between commas.' }
  }
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    const color = entry.replace(/^#/, '').toLowerCase()
    if (!/^[0-9a-f]{6}$/.test(color)) {
      return { colors: [], error: `“${entry}” is not a six-digit hexadecimal color.` }
    }
    if (!seen.has(color)) {
      seen.add(color)
      normalized.push(color)
    }
  }
  if (normalized.length > 256) return { colors: [], error: 'Use at most 256 colors.' }
  return { colors: normalized, error: null }
}
