// Standalone recentre/align: drop loose frame images (already cut), foot- or
// centre-anchor every one to the same baseline, and pack the canonical sheet +
// manifest. This is the drift fix as a single-purpose tool.
import { useCallback, useMemo, useState } from 'react'
import { removeChroma } from '../../core/bg'
import { buildManifest, packSheet } from '../../core/pack'
import { recenterToCell } from '../../core/recenter'
import { CHROMA_GREEN, CHROMA_MAGENTA, type Rgb, type RgbaImage, type SheetManifest } from '../../core/types'
import { createZip, type ZipEntry } from '../../core/zip'
import { blobToBytes, decodeToRgba, downloadBlob, rgbaToDataUrl, rgbaToPngBlob, safeFilename } from '../io'
import { DropArea } from '../components/DropArea'

const CHROMA: Record<'green' | 'magenta', Rgb> = { green: CHROMA_GREEN, magenta: CHROMA_MAGENTA }

interface AlignResult {
  sheet: RgbaImage
  cells: RgbaImage[]
  manifest: SheetManifest
}

export function AlignTool() {
  const [raw, setRaw] = useState<RgbaImage[]>([])
  const [chromaRemove, setChromaRemove] = useState(true)
  const [chroma, setChroma] = useState<'green' | 'magenta'>('green')
  const [anchorMode, setAnchorMode] = useState<'feet' | 'center'>('feet')
  const [action, setAction] = useState('anim')
  const [result, setResult] = useState<AlignResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadFiles = useCallback(async (files: File[]) => {
    setError(null)
    setResult(null)
    try {
      const images = await Promise.all(files.map((file) => decodeToRgba(file)))
      setRaw((current) => [...current, ...images])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Une image est illisible.')
    }
  }, [])

  const align = useCallback(() => {
    if (raw.length === 0) return
    const cells = raw.map((frame) =>
      recenterToCell(chromaRemove ? removeChroma(frame, { chroma: CHROMA[chroma], tolerance: 60, despill: true }) : frame, {
        anchorMode,
      }),
    )
    const pack = packSheet(cells)
    const manifest = buildManifest({ action, direction: 's', frames: cells.length, columns: pack.columns, rows: pack.rows })
    setResult({ sheet: pack.sheet, cells, manifest })
  }, [raw, chromaRemove, chroma, anchorMode, action])

  const exportZip = useCallback(async () => {
    if (!result) return
    const entries: ZipEntry[] = [
      { name: 'spritesheet.png', bytes: await blobToBytes(await rgbaToPngBlob(result.sheet)) },
      { name: 'manifest.json', bytes: new TextEncoder().encode(JSON.stringify(result.manifest, null, 2)) },
    ]
    for (let i = 0; i < result.cells.length; i += 1) {
      const cell = result.cells[i]
      if (cell) entries.push({ name: `frames/frame-${String(i + 1).padStart(3, '0')}.png`, bytes: await blobToBytes(await rgbaToPngBlob(cell)) })
    }
    downloadBlob(createZip(entries), safeFilename(action, 'zip'))
  }, [result, action])

  const rawUrls = useMemo(() => raw.map(rgbaToDataUrl), [raw])
  const sheetUrl = useMemo(() => (result ? rgbaToDataUrl(result.sheet) : null), [result])

  return (
    <div className="tool">
      <aside className="panel">
        <h2 className="mono">Aligner</h2>
        <p className="hint">Dépose des frames séparées : elles seront toutes ancrées à la même ligne, puis packées.</p>
        <div className="controls" style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="al-anchor">Ancrage</label>
            <select id="al-anchor" value={anchorMode} onChange={(e) => setAnchorMode(e.target.value as 'feet' | 'center')}>
              <option value="feet">Pieds (personnages)</option>
              <option value="center">Centre (VFX/objets)</option>
            </select>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={chromaRemove} onChange={(e) => setChromaRemove(e.target.checked)} />
            Retirer le fond chroma
          </label>
          {chromaRemove && (
            <div className="field">
              <label htmlFor="al-chroma">Chroma</label>
              <select id="al-chroma" value={chroma} onChange={(e) => setChroma(e.target.value as 'green' | 'magenta')}>
                <option value="green">Vert #00FF00</option>
                <option value="magenta">Magenta #FF00FF</option>
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="al-action">Nom d’action</label>
            <input id="al-action" type="text" value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <button className="btn primary" type="button" disabled={raw.length === 0} onClick={align}>
            Aligner {raw.length || ''} frame{raw.length > 1 ? 's' : ''}
          </button>
          {raw.length > 0 && (
            <button className="btn" type="button" onClick={() => { setRaw([]); setResult(null) }}>
              Vider
            </button>
          )}
        </div>
        {error && <p className="error">{error}</p>}
      </aside>

      <main className="panel">
        <div className="section-label">Frames ({raw.length})</div>
        <DropArea label="Frames à aligner" multiple onFiles={(files) => void loadFiles(files)} />
        {raw.length > 0 && (
          <div className="frames">
            {rawUrls.map((url, index) => (
              <div className="frame-cell checker" key={index}>
                <img src={url} alt={`Frame ${index + 1}`} />
                <div className="cap">#{index + 1}</div>
              </div>
            ))}
          </div>
        )}
        {result && (
          <>
            <div className="section-label">Sheet alignée · {result.sheet.width}×{result.sheet.height} · ancre 128,255</div>
            <div className="preview-sheet checker">{sheetUrl && <img src={sheetUrl} alt="Spritesheet" />}</div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn primary" type="button" onClick={() => void rgbaToPngBlob(result.sheet).then((b) => downloadBlob(b, safeFilename(action, 'png')))}>
                Export PNG
              </button>
              <button className="btn" type="button" onClick={() => void exportZip()}>
                Export ZIP + manifest
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
