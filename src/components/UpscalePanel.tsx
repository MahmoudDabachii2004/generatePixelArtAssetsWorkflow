import { estimateAllocation, formatBytes } from '../lib/processing/memoryLimits'

const SCALES = [1, 2, 3, 4, 6, 8, 10, 12, 16]

interface UpscalePanelProps {
  width: number
  height: number
  scale: number
  disabled?: boolean
  processing?: boolean
  onScale(value: number): void
  onGenerate(): void
}

export function UpscalePanel({
  width,
  height,
  scale,
  disabled = false,
  processing = false,
  onScale,
  onGenerate,
}: UpscalePanelProps) {
  const estimate = estimateAllocation(width, height, scale)
  return (
    <section className="panel" aria-labelledby="upscale-title">
      <div className="section-heading compact">
        <div>
          <span className="step-number">05</span>
          <h2 id="upscale-title">Nearest-neighbour upscale</h2>
        </div>
      </div>
      <div className="scale-grid">
        {SCALES.map((value) => {
          const option = estimateAllocation(width, height, value)
          return (
            <button
              type="button"
              key={value}
              className={scale === value ? 'scale-button selected' : 'scale-button'}
              disabled={disabled || !option.safe}
              onClick={() => onScale(value)}
            >
              {value}×
            </button>
          )
        })}
      </div>
      <div className="dimension-summary">
        <span>
          Native sprite{' '}
          <strong>
            {width} × {height}
          </strong>
        </span>
        <span>
          Scale <strong>{scale}×</strong>
        </span>
        <span>
          Export{' '}
          <strong>
            {estimate.width} × {estimate.height}
          </strong>
        </span>
      </div>
      <p className={estimate.warning ? 'inline-warning' : 'help-text'}>
        Estimated raw image memory: {formatBytes(estimate.bytes)}
        {estimate.warning ? '. This is a large allocation.' : ''}
      </p>
      <button
        type="button"
        className="button primary wide"
        disabled={disabled || !estimate.safe || processing}
        onClick={onGenerate}
      >
        {processing ? 'Upscaling…' : 'Generate upscaled result'}
      </button>
    </section>
  )
}
