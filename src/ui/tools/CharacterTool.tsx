// Guided character generator (free, copy-paste). Walks the chongdashu identity
// chain: South anchor -> snap -> W/N from the snapped anchor (E = flip of W) ->
// action/walk boards -> cut+snap+recentre+pack. Generation is external (paste
// prompt into ChatGPT/Gemini, drop the result back); the app builds the exact
// prompt, says which images to attach, and runs the deterministic pipeline.
import { useCallback, useMemo, useState } from 'react'
import {
  buildActionPrompt,
  buildAnchorPrompt,
  buildDirectionalPrompt,
  buildWalkPrompt,
  type CharacterBrief,
  type ChromaKey,
  type Direction,
  type ModelKey,
} from '../../core/prompts'
import { processBoard, type ProcessBoardResult } from '../../core/pipeline'
import { detectAndSnap } from '../../core/snap'
import { blit, createImage, fillColor, flipHorizontal, upscaleNearest } from '../../core/rgba'
import { CHROMA_GREEN, CHROMA_MAGENTA, type Rgb, type RgbaImage } from '../../core/types'
import { createZip, type ZipEntry } from '../../core/zip'
import { blobToBytes, decodeToRgba, downloadBlob, rgbaToDataUrl, rgbaToPngBlob, safeFilename } from '../io'
import { usePersistentState } from '../usePersistentState'
import { DropArea } from '../components/DropArea'
import { PromptCard } from '../components/PromptCard'

const CHROMA: Record<ChromaKey, Rgb> = { green: CHROMA_GREEN, magenta: CHROMA_MAGENTA }
const DIRECTIONS: Direction[] = ['s', 'w', 'n', 'e']

function toChromaAnchor(native: RgbaImage, chroma: Rgb, target = 512): RgbaImage {
  const factor = Math.max(1, Math.floor(target / Math.max(native.width, native.height)))
  const up = upscaleNearest(native, factor)
  const canvas = createImage(target, target)
  fillColor(canvas, chroma.r, chroma.g, chroma.b)
  blit(canvas, up, Math.round((target - up.width) / 2), Math.round((target - up.height) / 2))
  return canvas
}

// PromptCard and DropArea are shared components in ../components.

type Section = 'anchor' | 'dir' | 'action'

export function CharacterTool() {
  const [name, setName] = usePersistentState('char.name', 'Mon perso')
  const [description, setDescription] = usePersistentState('char.description', 'un chevalier en armure bleue avec une épée')
  const [style, setStyle] = usePersistentState('char.style', 'pixel art 16-bit chunky')
  const [palette, setPalette] = usePersistentState('char.palette', '8-16 couleurs')
  const [chroma, setChroma] = usePersistentState<ChromaKey>('char.chroma', 'green')
  const [model, setModel] = usePersistentState<ModelKey>('char.model', 'chatgpt')
  const [section, setSection] = useState<Section>('anchor')
  const [error, setError] = useState<string | null>(null)

  const [anchors, setAnchors] = useState<Partial<Record<Direction, RgbaImage>>>({})

  const [action, setAction] = useState('idle')
  const [actionDir, setActionDir] = useState<Direction>('s')
  const [frames, setFrames] = useState(8)
  const [columns, setColumns] = useState(4)
  const [rows, setRows] = useState(2)
  const [walkMode, setWalkMode] = useState(false)
  const [actionResult, setActionResult] = useState<ProcessBoardResult | null>(null)
  const [busy, setBusy] = useState(false)

  const brief: CharacterBrief = useMemo(
    () => ({ name, description, style, palette, chroma, canvas: 1024, model }),
    [name, description, style, palette, chroma, model],
  )

  const snapAnchor = useCallback(
    async (direction: Direction, file: File) => {
      setError(null)
      try {
        const raw = await decodeToRgba(file)
        const native = detectAndSnap(raw).native
        setAnchors((current) => {
          const next = { ...current, [direction]: native }
          if (direction === 'w') next.e = flipHorizontal(native) // East = flip of West
          return next
        })
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Image illisible.')
      }
    },
    [],
  )

  const downloadAnchor = useCallback(
    async (direction: Direction) => {
      const native = anchors[direction]
      if (!native) return
      const blob = await rgbaToPngBlob(toChromaAnchor(native, CHROMA[chroma]))
      downloadBlob(blob, safeFilename(`${name}-anchor-${direction}`, 'png'))
    },
    [anchors, chroma, name],
  )

  const runAction = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      try {
        const raw = await decodeToRgba(file)
        await new Promise((r) => setTimeout(r, 0))
        const result = processBoard(raw, {
          chroma: CHROMA[chroma],
          columns,
          rows,
          snap: true,
          action: walkMode ? 'walk' : action,
          direction: actionDir,
          mode: 'image',
        })
        setActionResult(result)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Le traitement a échoué.')
      } finally {
        setBusy(false)
      }
    },
    [chroma, columns, rows, walkMode, action, actionDir],
  )

  const exportAction = useCallback(
    async (asZip: boolean) => {
      if (!actionResult) return
      const label = `${walkMode ? 'walk' : action}-${actionDir}`
      if (!asZip) {
        downloadBlob(await rgbaToPngBlob(actionResult.sheet), safeFilename(label, 'png'))
        return
      }
      const entries: ZipEntry[] = [
        { name: 'spritesheet.png', bytes: await blobToBytes(await rgbaToPngBlob(actionResult.sheet)) },
        { name: 'manifest.json', bytes: new TextEncoder().encode(JSON.stringify(actionResult.manifest, null, 2)) },
      ]
      for (let i = 0; i < actionResult.cells.length; i += 1) {
        const cell = actionResult.cells[i]
        if (cell) entries.push({ name: `frames/frame-${String(i + 1).padStart(3, '0')}.png`, bytes: await blobToBytes(await rgbaToPngBlob(cell)) })
      }
      downloadBlob(createZip(entries), safeFilename(label, 'zip'))
    },
    [actionResult, walkMode, action, actionDir],
  )

  const anchorPreviews = useMemo(() => {
    const out: Partial<Record<Direction, string>> = {}
    for (const d of DIRECTIONS) {
      const native = anchors[d]
      if (native) out[d] = rgbaToDataUrl(toChromaAnchor(native, CHROMA[chroma], 256))
    }
    return out
  }, [anchors, chroma])

  const sheetUrl = useMemo(() => (actionResult ? rgbaToDataUrl(actionResult.sheet) : null), [actionResult])
  const cellUrls = useMemo(() => (actionResult ? actionResult.cells.map(rgbaToDataUrl) : []), [actionResult])

  const actionPrompt = walkMode
    ? buildWalkPrompt(brief, actionDir, frames)
    : buildActionPrompt(brief, { action, direction: actionDir, frames, columns, rows })

  return (
    <div className="tool">
      <aside className="panel">
        <h2 className="mono">Brief</h2>
        <div className="controls">
          <div className="field">
            <label htmlFor="c-name">Nom</label>
            <input id="c-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-desc">Description</label>
            <input id="c-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-style">Style</label>
            <input id="c-style" type="text" value={style} onChange={(e) => setStyle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-pal">Palette</label>
            <input id="c-pal" type="text" value={palette} onChange={(e) => setPalette(e.target.value)} />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="c-chroma">Chroma</label>
              <select id="c-chroma" value={chroma} onChange={(e) => setChroma(e.target.value as ChromaKey)}>
                <option value="green">Vert #00FF00</option>
                <option value="magenta">Magenta #FF00FF</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-model">Modèle</label>
              <select id="c-model" value={model} onChange={(e) => setModel(e.target.value as ModelKey)}>
                <option value="chatgpt">ChatGPT</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <p className="hint" style={{ marginTop: 16 }}>
          Flux : ancre Sud → snap → directions (Est = flip d’Ouest) → boards d’action. Télécharge l’ancre snappée
          et attache-la comme Image 1 aux étapes suivantes.
        </p>
      </aside>

      <main className="panel">
        <div className="tabs">
          <button className={`tab${section === 'anchor' ? ' on' : ''}`} type="button" onClick={() => setSection('anchor')}>
            1 · Ancre
          </button>
          <button className={`tab${section === 'dir' ? ' on' : ''}`} type="button" onClick={() => setSection('dir')}>
            2 · Directions
          </button>
          <button className={`tab${section === 'action' ? ' on' : ''}`} type="button" onClick={() => setSection('action')}>
            3 · Animations
          </button>
        </div>

        {section === 'anchor' && (
          <>
            <PromptCard output={buildAnchorPrompt(brief)} />
            <div className="section-label">Colle l’ancre Sud générée</div>
            <DropArea label="Ancre Sud" onFile={(file) => void snapAnchor('s', file)} />
            {anchorPreviews.s && (
              <div style={{ marginTop: 14 }}>
                <div className="section-label">Ancre Sud snappée ✓</div>
                <div className="frames">
                  <div className="frame-cell checker">
                    <img src={anchorPreviews.s} alt="Ancre Sud snappée" />
                    <div className="cap">SUD</div>
                  </div>
                </div>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button className="btn" type="button" onClick={() => void downloadAnchor('s')}>
                    Télécharger l’ancre snappée
                  </button>
                  <button className="btn primary" type="button" onClick={() => setSection('dir')}>
                    Directions →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {section === 'dir' && (
          <>
            <p className="hint">Attache l’ancre Sud snappée (Image 1) + le damier (Image 2). L’Est est généré automatiquement (flip d’Ouest).</p>
            <PromptCard output={buildDirectionalPrompt(brief, 'w')} />
            <DropArea label="Direction Ouest" onFile={(file) => void snapAnchor('w', file)} />
            <PromptCard output={buildDirectionalPrompt(brief, 'n')} />
            <DropArea label="Direction Nord" onFile={(file) => void snapAnchor('n', file)} />
            <div className="section-label">Ancres directionnelles</div>
            <div className="frames">
              {DIRECTIONS.map((d) => (
                <div className="frame-cell checker" key={d}>
                  {anchorPreviews[d] ? <img src={anchorPreviews[d]} alt={`Ancre ${d}`} /> : <div className="cap">—</div>}
                  <div className="cap">{d.toUpperCase()}{d === 'e' ? ' (flip)' : ''}</div>
                </div>
              ))}
            </div>
            <div className="btn-row" style={{ marginTop: 12 }}>
              {DIRECTIONS.filter((d) => anchors[d]).map((d) => (
                <button className="btn" type="button" key={d} onClick={() => void downloadAnchor(d)}>
                  ↓ ancre {d.toUpperCase()}
                </button>
              ))}
            </div>
          </>
        )}

        {section === 'action' && (
          <>
            <div className="controls" style={{ marginBottom: 14 }}>
              <label className="toggle">
                <input type="checkbox" checked={walkMode} onChange={(e) => setWalkMode(e.target.checked)} />
                Cycle de marche (chemin gratuit : pose-board + verrou pieds)
              </label>
              <div className="row2">
                {!walkMode && (
                  <div className="field">
                    <label htmlFor="a-name">Action</label>
                    <input id="a-name" type="text" value={action} onChange={(e) => setAction(e.target.value)} />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="a-dir">Direction</label>
                  <select id="a-dir" value={actionDir} onChange={(e) => setActionDir(e.target.value as Direction)}>
                    {DIRECTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label htmlFor="a-frames">Frames</label>
                  <input id="a-frames" type="number" min={1} max={20} value={frames} onChange={(e) => setFrames(Math.max(1, Number(e.target.value)))} />
                </div>
                <div className="field">
                  <label htmlFor="a-cols">Colonnes × lignes</label>
                  <div className="row2">
                    <input id="a-cols" type="number" min={1} max={8} value={columns} onChange={(e) => setColumns(Math.max(1, Number(e.target.value)))} />
                    <input aria-label="lignes" type="number" min={1} max={8} value={rows} onChange={(e) => setRows(Math.max(1, Number(e.target.value)))} />
                  </div>
                </div>
              </div>
            </div>
            <PromptCard output={actionPrompt} />
            <div className="section-label">Colle le board d’action généré</div>
            <DropArea label={busy ? 'Traitement…' : 'Board d’action'} onFile={(file) => void runAction(file)} />

            {actionResult && (
              <>
                <div className="section-label">Sheet runtime</div>
                <div className="stat-row">
                  <span>frames <b>{actionResult.cells.length}</b></span>
                  <span>sheet <b>{actionResult.sheet.width}×{actionResult.sheet.height}</b></span>
                  <span>ancre <b>128,255</b></span>
                </div>
                <div className="preview-sheet checker">{sheetUrl && <img src={sheetUrl} alt="Spritesheet" />}</div>
                <div className="frames">
                  {cellUrls.map((url, index) => (
                    <div className="frame-cell checker" key={index}>
                      <img src={url} alt={`Frame ${index + 1}`} />
                      <div className="cap">#{index + 1}</div>
                    </div>
                  ))}
                </div>
                <div className="btn-row" style={{ marginTop: 18 }}>
                  <button className="btn primary" type="button" onClick={() => void exportAction(false)}>
                    Export PNG
                  </button>
                  <button className="btn" type="button" onClick={() => void exportAction(true)}>
                    Export ZIP + manifest
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
