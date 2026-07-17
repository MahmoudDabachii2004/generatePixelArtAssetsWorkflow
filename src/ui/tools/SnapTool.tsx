// Standalone pixel-snap: drop any "pixel-ish" image, recover its native grid,
// preview + export the clean native sprite or an integer upscale. No prompt —
// this is a pipeline tool for images you already have.
import { useCallback, useMemo, useState } from 'react'
import { upscaleNearest } from '../../core/rgba'
import { detectAndSnap, type SnapResult } from '../../core/snap'
import { decodeToRgba, downloadBlob, rgbaToDataUrl, rgbaToPngBlob, safeFilename } from '../io'
import { DropArea } from '../components/DropArea'

const SCALES = [2, 4, 8, 16] as const

export function SnapTool() {
  const [snap, setSnap] = useState<SnapResult | null>(null)
  const [scale, setScale] = useState<(typeof SCALES)[number]>(8)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (file: File) => {
    setError(null)
    try {
      setSnap(detectAndSnap(await decodeToRgba(file)))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Image illisible.')
    }
  }, [])

  const nativeUrl = useMemo(() => (snap ? rgbaToDataUrl(snap.native) : null), [snap])
  const upscaled = useMemo(() => (snap ? upscaleNearest(snap.native, scale) : null), [snap, scale])
  const upscaledUrl = useMemo(() => (upscaled ? rgbaToDataUrl(upscaled) : null), [upscaled])

  return (
    <div className="tool">
      <aside className="panel">
        <h2 className="mono">Pixel-snap</h2>
        <p className="hint">Récupère la vraie grille native d’une image « pixel-ish » de l’IA et tue les mixels.</p>
        <div className="controls" style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="s-scale">Échelle d’aperçu/export</label>
            <select id="s-scale" value={scale} onChange={(e) => setScale(Number(e.target.value) as (typeof SCALES)[number])}>
              {SCALES.map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </div>
        </div>
        {snap && (
          <div className="stat-row" style={{ marginTop: 14 }}>
            <span>natif <b>{snap.native.width}×{snap.native.height}</b></span>
            <span>pixel <b>{snap.pixelSize.toFixed(1)}</b></span>
            <span>confiance <b>{(snap.confidence * 100).toFixed(0)}%</b></span>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </aside>

      <main className="panel">
        <div className="section-label">Image source</div>
        <DropArea label="Image à snapper" onFile={(file) => void load(file)} />
        {snap && (
          <>
            <div className="section-label">Natif {snap.native.width}×{snap.native.height}</div>
            <div className="frames">
              <div className="frame-cell checker">{nativeUrl && <img src={nativeUrl} alt="Natif" />}</div>
            </div>
            <div className="section-label">Upscale {scale}× (nearest-neighbour exact)</div>
            <div className="preview-sheet checker">{upscaledUrl && <img src={upscaledUrl} alt="Upscalé" />}</div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                className="btn primary"
                type="button"
                onClick={() => void rgbaToPngBlob(snap.native).then((blob) => downloadBlob(blob, safeFilename('sprite-native', 'png')))}
              >
                Export natif ({snap.native.width}×{snap.native.height})
              </button>
              <button
                className="btn"
                type="button"
                disabled={!upscaled}
                onClick={() => {
                  if (upscaled) void rgbaToPngBlob(upscaled).then((blob) => downloadBlob(blob, safeFilename(`sprite-${scale}x`, 'png')))
                }}
              >
                Export {scale}×
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
