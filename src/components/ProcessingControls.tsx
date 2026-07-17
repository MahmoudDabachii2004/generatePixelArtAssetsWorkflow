import { useMemo, useState } from 'react'
import { EXAMPLE_PALETTE, parsePalette } from '../lib/image/palette'

interface ProcessingControlsProps {
  colorCount: number
  palette: string[]
  disabled?: boolean
  onColorCount(value: number): void
  onPalette(colors: string[]): void
}

const PRESETS = [16, 32, 64, 128, 256]

export function ProcessingControls({
  colorCount,
  palette,
  disabled = false,
  onColorCount,
  onPalette,
}: ProcessingControlsProps) {
  const [paletteText, setPaletteText] = useState(palette.join(','))
  const [paletteError, setPaletteError] = useState<string | null>(null)
  const custom = !PRESETS.includes(colorCount)
  const selectValue = custom ? 'custom' : String(colorCount)
  const swatches = useMemo(() => palette.map((color) => `#${color}`), [palette])

  const updatePalette = (value: string) => {
    setPaletteText(value)
    const parsed = parsePalette(value)
    setPaletteError(parsed.error)
    if (!parsed.error) onPalette(parsed.colors)
  }

  return (
    <section className="panel controls-panel" aria-labelledby="processing-title">
      <div className="section-heading">
        <div>
          <span className="step-number">02</span>
          <h2 id="processing-title">Grid &amp; color processing</h2>
        </div>
      </div>
      <label className="field">
        <span>Color mode</span>
        <select
          value={selectValue}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.value === 'custom') onColorCount(48)
            else onColorCount(Number(event.target.value))
          }}
        >
          <option value="256">Preserve detail / high color count</option>
          <option value="16">16 colors</option>
          <option value="32">32 colors</option>
          <option value="64">64 colors</option>
          <option value="128">128 colors</option>
          <option value="custom">Custom count</option>
        </select>
      </label>
      {custom && (
        <label className="field">
          <span>Custom colors</span>
          <input
            type="number"
            min={2}
            max={256}
            value={colorCount}
            disabled={disabled}
            onChange={(event) =>
              onColorCount(Math.min(256, Math.max(2, Math.round(Number(event.target.value) || 2))))
            }
          />
        </label>
      )}
      <p className="help-text">
        Lower values create a stricter palette. Higher values preserve more shading.
      </p>
      <div className="field palette-field">
        <label htmlFor="palette-input">Optional custom palette</label>
        <textarea
          id="palette-input"
          rows={3}
          value={paletteText}
          disabled={disabled}
          placeholder="0d2b45, 203c56, 544e68"
          onChange={(event) => updatePalette(event.target.value)}
          aria-invalid={Boolean(paletteError)}
          aria-describedby={paletteError ? 'palette-error' : 'palette-help'}
        />
        <p id="palette-help" className="help-text">
          Comma-separated six-digit hex colors, with or without #.
        </p>
        {paletteError && (
          <p id="palette-error" className="field-error">
            {paletteError}
          </p>
        )}
        <div className="palette-actions">
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => updatePalette(EXAMPLE_PALETTE.join(','))}
          >
            Use example palette
          </button>
          <button
            type="button"
            className="text-button"
            disabled={disabled || !paletteText}
            onClick={() => updatePalette('')}
          >
            Clear palette
          </button>
        </div>
        {swatches.length > 0 && (
          <div className="swatches" aria-label={`${swatches.length} active palette colors`}>
            {swatches.map((color) => (
              <span key={color} title={color} style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
        {palette.length > 0 && (
          <p className="help-text">
            The custom palette is active, so color count has less influence on final colors.
          </p>
        )}
      </div>
    </section>
  )
}
