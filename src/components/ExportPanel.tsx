import { formatBytes } from '../lib/processing/memoryLimits'

export interface ExportReceipt {
  filename: string
  width: number
  height: number
  compressedBytes: number
  rawBytes: number
}

interface ExportPanelProps {
  ready: boolean
  upscaledReady: boolean
  busy?: boolean
  receipt?: ExportReceipt | null
  onNative(): void
  onUpscaled(): void
  onBoth(): void
  onUse?(): void
}

export function ExportPanel({
  ready,
  upscaledReady,
  busy = false,
  receipt = null,
  onNative,
  onUpscaled,
  onBoth,
  onUse,
}: ExportPanelProps) {
  return (
    <section className="panel export-panel" aria-labelledby="export-title">
      <div className="section-heading compact">
        <div>
          <span className="step-number">06</span>
          <h2 id="export-title">Export PNG</h2>
        </div>
      </div>
      <p className="help-text">
        Pixel-art PNGs can be surprisingly small because repeated color blocks compress extremely
        well.
      </p>
      {receipt && (
        <div className="export-receipt" role="status">
          <strong>
            Verified {receipt.width} × {receipt.height} PNG
          </strong>
          <span>
            {formatBytes(receipt.compressedBytes)} compressed from {formatBytes(receipt.rawBytes)}{' '}
            raw RGBA
          </span>
          <small title={receipt.filename}>{receipt.filename}</small>
        </div>
      )}
      <div className="export-actions">
        {onUse && (
          <button
            type="button"
            className="button primary"
            disabled={!ready || busy}
            onClick={onUse}
          >
            {busy ? 'Encoding PNG...' : 'Save result to workflow'}
          </button>
        )}
        <button
          type="button"
          className="button secondary"
          disabled={!ready || busy}
          onClick={onNative}
        >
          {busy ? 'Encoding PNG…' : 'Download native PNG'}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={!upscaledReady || busy}
          onClick={onUpscaled}
        >
          {busy ? 'Encoding PNG…' : 'Download upscaled PNG'}
        </button>
        <button
          type="button"
          className={onUse ? 'button secondary' : 'button primary'}
          disabled={!upscaledReady || busy}
          onClick={onBoth}
        >
          Download both
        </button>
      </div>
    </section>
  )
}
