// Flagship tool: drop a sprite board you already have → cut (no merge) →
// pixel-snap → recentre on the foot baseline → export the canonical
// 1280×512 / 5×2 / 256px sheet + manifest.json (+ loose frames as a ZIP).
import { useCallback, useMemo, useRef, useState } from 'react'
import { processBoard, type ProcessBoardResult } from '../../core/pipeline'
import { CHROMA_GREEN, CHROMA_MAGENTA, type Rgb, type RgbaImage } from '../../core/types'
import { createZip, type ZipEntry } from '../../core/zip'
import {
  blobToBytes,
  decodeToRgba,
  downloadBlob,
  rgbaToDataUrl,
  rgbaToPngBlob,
  safeFilename,
} from '../io'

type ChromaKey = 'green' | 'magenta'
const CHROMA: Record<ChromaKey, Rgb> = { green: CHROMA_GREEN, magenta: CHROMA_MAGENTA }
const DIRECTIONS = ['s', 'w', 'n', 'e'] as const

export function SheetTool() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [board, setBoard] = useState<RgbaImage | null>(null)
  const [boardUrl, setBoardUrl] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessBoardResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [columns, setColumns] = useState(5)
  const [rows, setRows] = useState(2)
  const [gridKnown, setGridKnown] = useState(true)
  const [chroma, setChroma] = useState<ChromaKey>('green')
  const [tolerance, setTolerance] = useState(60)
  const [snap, setSnap] = useState(true)
  const [action, setAction] = useState('idle')
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]>('s')
  const [fps, setFps] = useState(10)

  const loadFile = useCallback(async (file: File) => {
    setError(null)
    setResult(null)
    try {
      const decoded = await decodeToRgba(file)
      setBoard(decoded)
      setBoardUrl(rgbaToDataUrl(decoded))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Image illisible.')
    }
  }, [])

  const run = useCallback(async () => {
    if (!board) return
    setBusy(true)
    setError(null)
    try {
      // Let the browser paint the busy state before the synchronous work.
      await new Promise((resolve) => setTimeout(resolve, 0))
      const processed = processBoard(board, {
        chroma: CHROMA[chroma],
        tolerance,
        columns: gridKnown ? columns : undefined,
        rows: gridKnown ? rows : undefined,
        snap,
        action,
        direction,
        fps,
      })
      setResult(processed)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Le traitement a échoué.')
    } finally {
      setBusy(false)
    }
  }, [board, chroma, tolerance, gridKnown, columns, rows, snap, action, direction, fps])

  const exportSheet = useCallback(async () => {
    if (!result) return
    const blob = await rgbaToPngBlob(result.sheet)
    downloadBlob(blob, safeFilename(`${action}-${direction}`, 'png'))
  }, [result, action, direction])

  const exportZip = useCallback(async () => {
    if (!result) return
    const entries: ZipEntry[] = []
    entries.push({ name: 'spritesheet.png', bytes: await blobToBytes(await rgbaToPngBlob(result.sheet)) })
    for (let i = 0; i < result.cells.length; i += 1) {
      const cell = result.cells[i]
      if (!cell) continue
      const name = `frames/frame-${String(i + 1).padStart(3, '0')}.png`
      entries.push({ name, bytes: await blobToBytes(await rgbaToPngBlob(cell)) })
    }
    entries.push({
      name: 'manifest.json',
      bytes: new TextEncoder().encode(JSON.stringify(result.manifest, null, 2)),
    })
    downloadBlob(createZip(entries), safeFilename(`${action}-${direction}`, 'zip'))
  }, [result, action, direction])

  const sheetUrl = useMemo(() => (result ? rgbaToDataUrl(result.sheet) : null), [result])
  const cellUrls = useMemo(() => (result ? result.cells.map(rgbaToDataUrl) : []), [result])

  return (
    <div className="tool">
      <aside className="panel">
        <h2 className="mono">1 · Ton board</h2>
        <div
          className={`dropzone${dragging ? ' drag' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files[0]
            if (file) void loadFile(file)
          }}
        >
          <strong>Dépose un sprite sheet</strong>
          <span>ou clique — PNG / JPEG / WebP</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void loadFile(file)
          }}
        />

        <h2 className="mono" style={{ marginTop: 22 }}>
          2 · Réglages
        </h2>
        <div className="controls">
          <label className="toggle">
            <input type="checkbox" checked={gridKnown} onChange={(e) => setGridKnown(e.target.checked)} />
            Grille connue (colonnes × lignes)
          </label>
          {gridKnown ? (
            <div className="row2">
              <div className="field">
                <label htmlFor="cols">Colonnes</label>
                <input id="cols" type="number" min={1} max={16} value={columns} onChange={(e) => setColumns(Math.max(1, Number(e.target.value)))} />
              </div>
              <div className="field">
                <label htmlFor="rows">Lignes</label>
                <input id="rows" type="number" min={1} max={16} value={rows} onChange={(e) => setRows(Math.max(1, Number(e.target.value)))} />
              </div>
            </div>
          ) : (
            <p className="hint">Mode auto : chaque silhouette isolée devient une frame (aucune fusion des voisins).</p>
          )}
          <div className="row2">
            <div className="field">
              <label htmlFor="chroma">Fond chroma</label>
              <select id="chroma" value={chroma} onChange={(e) => setChroma(e.target.value as ChromaKey)}>
                <option value="green">Vert #00FF00</option>
                <option value="magenta">Magenta #FF00FF</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="tol">Tolérance</label>
              <input id="tol" type="number" min={0} max={200} value={tolerance} onChange={(e) => setTolerance(Math.max(0, Number(e.target.value)))} />
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            Pixel-snap (récupérer la grille native)
          </label>
          <div className="row2">
            <div className="field">
              <label htmlFor="action">Action</label>
              <input id="action" type="text" value={action} onChange={(e) => setAction(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="dir">Direction</label>
              <select id="dir" value={direction} onChange={(e) => setDirection(e.target.value as (typeof DIRECTIONS)[number])}>
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="fps">FPS</label>
            <input id="fps" type="number" min={1} max={60} value={fps} onChange={(e) => setFps(Math.max(1, Number(e.target.value)))} />
          </div>
          <button className="btn primary" type="button" disabled={!board || busy} onClick={() => void run()}>
            {busy ? 'Traitement…' : result ? 'Retraiter' : 'Traiter →'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </aside>

      <main className="panel">
        <h2 className="mono">3 · Résultat</h2>
        {!board && <p className="hint">Dépose un board à gauche pour commencer.</p>}

        {board && (
          <>
            <div className="section-label">Board source · {board.width}×{board.height}</div>
            <div className="preview-sheet checker" style={{ maxHeight: 220 }}>
              {boardUrl && <img src={boardUrl} alt="Board source" style={{ maxWidth: '100%' }} />}
            </div>
          </>
        )}

        {result && (
          <>
            <div className="section-label">Sheet runtime</div>
            <div className="stat-row">
              <span>frames <b>{result.cells.length}</b></span>
              <span>sheet <b>{result.sheet.width}×{result.sheet.height}</b></span>
              <span>grille <b>{result.pack.columns}×{result.pack.rows}</b></span>
              <span>cellule <b>{result.pack.cell}px</b></span>
              <span>ancre <b>128,255</b></span>
            </div>
            <div className="preview-sheet checker">{sheetUrl && <img src={sheetUrl} alt="Spritesheet" />}</div>

            <div className="section-label">Frames recentrées (ancrées aux pieds)</div>
            <div className="frames">
              {cellUrls.map((url, index) => (
                <div className="frame-cell checker" key={index}>
                  <img src={url} alt={`Frame ${index + 1}`} />
                  <div className="cap">#{index + 1}</div>
                </div>
              ))}
            </div>

            <div className="btn-row" style={{ marginTop: 20 }}>
              <button className="btn primary" type="button" onClick={() => void exportSheet()}>
                Export PNG
              </button>
              <button className="btn" type="button" onClick={() => void exportZip()}>
                Export ZIP (sheet + frames + manifest)
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
