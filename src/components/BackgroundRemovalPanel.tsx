import type { BackgroundRemovalSettings } from '../app/appTypes'

interface BackgroundRemovalPanelProps {
  settings: BackgroundRemovalSettings
  suggestion: { r: number; g: number; b: number } | null
  disabled?: boolean
  processing?: boolean
  warning?: string | null
  onChange(value: Partial<BackgroundRemovalSettings>): void
}

const toHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
const fromHex = (value: string) => ({
  r: Number.parseInt(value.slice(1, 3), 16),
  g: Number.parseInt(value.slice(3, 5), 16),
  b: Number.parseInt(value.slice(5, 7), 16),
})

export function BackgroundRemovalPanel({
  settings,
  suggestion,
  disabled = false,
  processing = false,
  warning = null,
  onChange,
}: BackgroundRemovalPanelProps) {
  const target = settings.targetColor ?? suggestion ?? { r: 0, g: 0, b: 0 }
  return (
    <section className="panel" aria-labelledby="background-title">
      <div className="section-heading compact">
        <div>
          <span className="step-number">04</span>
          <h2 id="background-title">Remove background</h2>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            aria-label="Enable background removal"
            checked={settings.enabled}
            disabled={disabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
          <span />
        </label>
      </div>
      <p className="help-text">
        Flood fill starts only from matching boundary pixels, so similar interior details are
        preserved.
      </p>
      {processing && (
        <p className="background-status" role="status">
          Applying the latest settings in a background worker…
        </p>
      )}
      {warning && (
        <p className="background-warning" role="alert">
          {warning}
        </p>
      )}
      {suggestion && !settings.targetColor && (
        <button
          type="button"
          className="suggestion"
          disabled={disabled}
          onClick={() => onChange({ targetColor: suggestion })}
        >
          <span style={{ background: toHex(suggestion) }} />
          Use suggested corner color {toHex(suggestion)}
        </button>
      )}
      <div className="background-controls">
        <label className="field">
          <span>Target color</span>
          <input
            type="color"
            value={toHex(target)}
            disabled={disabled}
            onChange={(event) => onChange({ targetColor: fromHex(event.target.value) })}
          />
        </label>
        <label className="field range-field">
          <span>
            Tolerance <output>{settings.tolerance}</output>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.tolerance}
            disabled={disabled}
            onChange={(event) => onChange({ tolerance: Number(event.target.value) })}
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.edgeCleanup}
            disabled={disabled}
            onChange={(event) => onChange({ edgeCleanup: event.target.checked })}
          />
          Conservative semi-transparent edge cleanup
        </label>
        <label className="field range-field">
          <span>
            Chroma fringe trim <output>{settings.edgeTrimPercent ?? 0}%</output>
          </span>
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={settings.edgeTrimPercent ?? 0}
            disabled={disabled}
            onChange={(event) => onChange({ edgeTrimPercent: Number(event.target.value) })}
          />
        </label>
        <p className="help-text">
          Removes only background-colored pixels touching the new transparent edge. Start at 1%;
          use 2% for a stubborn hard-color outline.
        </p>
      </div>
      {settings.enabled && !settings.targetColor && !suggestion && (
        <p className="field-error">
          Choose a target color or click a pixel in the corrected preview.
        </p>
      )}
      <p className="help-text">Tip: click any pixel in the corrected preview to sample it.</p>
      <p className="help-text">
        The mask uses pre-quantization source colors so dark subjects are not merged into dark
        backgrounds before removal.
      </p>
    </section>
  )
}
