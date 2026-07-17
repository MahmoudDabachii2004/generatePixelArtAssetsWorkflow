import { memo, useMemo, useState } from 'react'
import type { PixelBuffer } from '../app/appTypes'
import { PreviewViewport, type PreviewMode } from './PreviewViewport'

interface PreviewWorkspaceProps {
  original: PixelBuffer | null
  originalUrl?: string | null
  native: PixelBuffer | null
  nativeUrl?: string | null
  upscaled: PixelBuffer | null
  selectedPixelSize: number | null
  scale: number
  onSample?(color: { r: number; g: number; b: number }, x: number, y: number): void
}

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32]

export const PreviewWorkspace = memo(function PreviewWorkspace({
  original,
  originalUrl = null,
  native,
  nativeUrl = null,
  upscaled,
  selectedPixelSize,
  scale,
  onSample,
}: PreviewWorkspaceProps) {
  const [mode, setMode] = useState<PreviewMode>('native')
  const [zoom, setZoom] = useState(1)
  const [resetSignal, setResetSignal] = useState(0)

  const unavailable =
    (mode === 'original' && !original) ||
    (mode === 'native' && !native) ||
    (mode === 'upscaled' && !upscaled) ||
    (mode === 'compare' && (!original || !native))
  const availableMode: PreviewMode = unavailable ? (native ? 'native' : 'original') : mode

  const active =
    availableMode === 'original' ? original : availableMode === 'upscaled' ? upscaled : native
  const dimensions = active ? `${active.width} × ${active.height}` : 'No image'
  const zoomOptions = useMemo(() => ZOOM_STEPS, [])

  const resetView = () => {
    setZoom(1)
    setResetSignal((value) => value + 1)
  }

  const buttonLabel = (value: PreviewMode) =>
    value === 'native' ? 'Corrected native' : value[0]!.toUpperCase() + value.slice(1)

  return (
    <section className="preview-workspace panel" aria-labelledby="preview-title">
      <div className="preview-header">
        <div>
          <div className="eyebrow">Live local preview</div>
          <h2 id="preview-title">Pixel workspace</h2>
        </div>
        <div className="preview-meta">
          <span>{dimensions}</span>
          {selectedPixelSize && <span>{selectedPixelSize.toFixed(1)} px grid</span>}
          <span>{scale}× export scale</span>
        </div>
      </div>
      <div className="preview-toolbar" role="toolbar" aria-label="Preview controls">
        {(['original', 'native', 'upscaled', 'compare'] as PreviewMode[]).map((value) => (
          <button
            type="button"
            key={value}
            className={availableMode === value ? 'active' : ''}
            disabled={
              (value === 'original' && !original) ||
              (value === 'native' && !native) ||
              (value === 'upscaled' && !upscaled) ||
              (value === 'compare' && (!original || !native))
            }
            onClick={() => setMode(value)}
          >
            {buttonLabel(value)}
          </button>
        ))}
        <span className="toolbar-spacer" />
        <button
          type="button"
          className="reset-view-button"
          disabled={!original && !native}
          onClick={resetView}
        >
          Fit view
        </button>
        <label>
          Zoom
          <select
            aria-label="Zoom"
            value={zoom}
            disabled={!original && !native}
            onChange={(event) => setZoom(Number(event.target.value))}
          >
            {zoomOptions.map((value) => (
              <option key={value} value={value}>
                {Math.round(value * 100)}%
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="preview-stage checkerboard">
        {!original && !native ? (
          <div className="preview-empty">
            <div className="empty-pixel" />
            <strong>Your corrected sprite will appear here</strong>
            <span>Drop an image to detect its implied pixel grid.</span>
          </div>
        ) : (
          <PreviewViewport
            key={resetSignal}
            mode={availableMode}
            original={original}
            originalUrl={originalUrl}
            native={native}
            nativeUrl={nativeUrl}
            upscaled={upscaled}
            zoom={zoom}
            zoomSteps={zoomOptions}
            onZoomChange={setZoom}
            onSample={onSample}
          />
        )}
      </div>
      {native && (
        <p className="native-note">
          Original and corrected previews stay mounted for instant switching. The upscaled preview
          uses the identical native pixel pattern at the same virtual size, avoiding a huge
          duplicate canvas.
        </p>
      )}
    </section>
  )
})
