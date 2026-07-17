// Effects (VFX) + UI. VFX = an animation board, centre-anchored (not feet),
// packed into a sheet. UI = an atlas of separated components. Both are free
// copy-paste generations processed by the same deterministic core.
import { useCallback, useMemo, useState } from 'react'
import { packAtlas, type AtlasRect } from '../../core/atlas'
import { removeChroma } from '../../core/bg'
import { cutFrames } from '../../core/cut'
import { toGenericAtlas, toPhaserAtlas } from '../../core/export'
import { processBoard, type ProcessBoardResult } from '../../core/pipeline'
import { buildEffectPrompt, buildUiPrompt, type CharacterBrief, type ChromaKey, type ModelKey } from '../../core/prompts'
import { contentBounds, cropImage } from '../../core/rgba'
import { detectAndSnap } from '../../core/snap'
import { CHROMA_GREEN, CHROMA_MAGENTA, type Rgb, type RgbaImage } from '../../core/types'
import { createZip, type ZipEntry } from '../../core/zip'
import { blobToBytes, decodeToRgba, downloadBlob, rgbaToDataUrl, rgbaToPngBlob, safeFilename } from '../io'
import { DropArea } from '../components/DropArea'
import { PromptCard } from '../components/PromptCard'
import { usePersistentState } from '../usePersistentState'

const CHROMA: Record<ChromaKey, Rgb> = { green: CHROMA_GREEN, magenta: CHROMA_MAGENTA }

function trim(image: RgbaImage): RgbaImage {
  const bounds = contentBounds(image)
  return bounds ? cropImage(image, bounds) : image
}

type Result =
  | { kind: 'vfx'; board: ProcessBoardResult }
  | { kind: 'ui'; sheet: RgbaImage; rects: AtlasRect[]; items: RgbaImage[] }

export function EffectsUiTool() {
  const [mode, setMode] = useState<'vfx' | 'ui'>('vfx')
  const [name, setName] = usePersistentState('fx.name', 'Effet')
  const [description, setDescription] = usePersistentState('fx.description', 'une explosion de feu')
  const [style, setStyle] = usePersistentState('fx.style', 'pixel art 16-bit')
  const [palette] = usePersistentState('fx.palette', '12-16 couleurs')
  const [chroma, setChroma] = usePersistentState<ChromaKey>('fx.chroma', 'green')
  const [model, setModel] = usePersistentState<ModelKey>('fx.model', 'chatgpt')
  const [frames, setFrames] = useState(6)
  const [columns, setColumns] = useState(3)
  const [rows, setRows] = useState(2)
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const brief: CharacterBrief = useMemo(
    () => ({ name, description, style, palette, chroma, canvas: 1024, model }),
    [name, description, style, palette, chroma, model],
  )

  const process = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      try {
        const raw = await decodeToRgba(file)
        await new Promise((r) => setTimeout(r, 0))
        const chromaColor = CHROMA[chroma]
        if (mode === 'vfx') {
          const board = processBoard(raw, { chroma: chromaColor, columns, rows, snap: true, anchorMode: 'center', action: 'vfx', mode: 'image' })
          setResult({ kind: 'vfx', board })
        } else {
          const cut = cutFrames(raw, { chroma: chromaColor, tolerance: 60 })
          const items = cut.frames.map((frame) => trim(detectAndSnap(removeChroma(frame, { chroma: chromaColor, tolerance: 60, despill: true })).native))
          const atlas = packAtlas(items, { padding: 3 })
          setResult({ kind: 'ui', sheet: atlas.sheet, rects: atlas.rects, items })
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Le traitement a échoué.')
      } finally {
        setBusy(false)
      }
    },
    [mode, chroma, columns, rows],
  )

  const exportResult = useCallback(
    async (asZip: boolean) => {
      if (!result) return
      if (result.kind === 'vfx') {
        if (!asZip) {
          downloadBlob(await rgbaToPngBlob(result.board.sheet), safeFilename(name, 'png'))
          return
        }
        const entries: ZipEntry[] = [
          { name: 'spritesheet.png', bytes: await blobToBytes(await rgbaToPngBlob(result.board.sheet)) },
          { name: 'manifest.json', bytes: new TextEncoder().encode(JSON.stringify(result.board.manifest, null, 2)) },
        ]
        downloadBlob(createZip(entries), safeFilename(name, 'zip'))
        return
      }
      const imageName = safeFilename(name, 'png')
      if (!asZip) {
        downloadBlob(await rgbaToPngBlob(result.sheet), imageName)
        return
      }
      const entries: ZipEntry[] = [
        { name: imageName, bytes: await blobToBytes(await rgbaToPngBlob(result.sheet)) },
        { name: 'atlas.phaser.json', bytes: new TextEncoder().encode(toPhaserAtlas(imageName, result.sheet.width, result.sheet.height, result.rects)) },
        { name: 'atlas.json', bytes: new TextEncoder().encode(toGenericAtlas(imageName, result.sheet.width, result.sheet.height, result.rects)) },
      ]
      downloadBlob(createZip(entries), safeFilename(name, 'zip'))
    },
    [result, name],
  )

  const prompt = mode === 'vfx' ? buildEffectPrompt(brief, { frames, columns, rows }) : buildUiPrompt(brief, { columns, rows })
  const sheetUrl = useMemo(() => {
    if (!result) return null
    return rgbaToDataUrl(result.kind === 'vfx' ? result.board.sheet : result.sheet)
  }, [result])
  const itemUrls = useMemo(() => {
    if (!result) return []
    return (result.kind === 'vfx' ? result.board.cells : result.items).map(rgbaToDataUrl)
  }, [result])

  return (
    <div className="tool">
      <aside className="panel">
        <h2 className="mono">Effets & UI</h2>
        <div className="controls">
          <div className="field">
            <label htmlFor="e-mode">Type</label>
            <select
              id="e-mode"
              value={mode}
              onChange={(e) => {
                const next = e.target.value as 'vfx' | 'ui'
                setMode(next)
                setChroma(next === 'ui' ? 'magenta' : 'green')
                setResult(null)
              }}
            >
              <option value="vfx">VFX (séquence d’effet)</option>
              <option value="ui">UI / HUD (atlas)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-name">Nom</label>
            <input id="e-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-desc">Description</label>
            <input id="e-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-style">Style</label>
            <input id="e-style" type="text" value={style} onChange={(e) => setStyle(e.target.value)} />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="e-chroma">Chroma</label>
              <select id="e-chroma" value={chroma} onChange={(e) => setChroma(e.target.value as ChromaKey)}>
                <option value="green">Vert #00FF00</option>
                <option value="magenta">Magenta #FF00FF</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="e-model">Modèle</label>
              <select id="e-model" value={model} onChange={(e) => setModel(e.target.value as ModelKey)}>
                <option value="chatgpt">ChatGPT</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          </div>
          {mode === 'vfx' && (
            <div className="field">
              <label htmlFor="e-frames">Frames</label>
              <input id="e-frames" type="number" min={2} max={20} value={frames} onChange={(e) => setFrames(Math.max(2, Number(e.target.value)))} />
            </div>
          )}
          <div className="row2">
            <div className="field">
              <label htmlFor="e-cols">Colonnes</label>
              <input id="e-cols" type="number" min={1} max={8} value={columns} onChange={(e) => setColumns(Math.max(1, Number(e.target.value)))} />
            </div>
            <div className="field">
              <label htmlFor="e-rows">Lignes</label>
              <input id="e-rows" type="number" min={1} max={8} value={rows} onChange={(e) => setRows(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </aside>

      <main className="panel">
        <PromptCard output={prompt} />
        <div className="section-label">Colle l’image générée</div>
        <DropArea label={busy ? 'Traitement…' : mode === 'vfx' ? 'Board VFX' : 'Atlas UI'} onFile={(file) => void process(file)} />

        {result && (
          <>
            <div className="section-label">Résultat</div>
            <div className="preview-sheet checker">{sheetUrl && <img src={sheetUrl} alt="Résultat" />}</div>
            <div className="frames">
              {itemUrls.map((url, index) => (
                <div className="frame-cell checker" key={index}>
                  <img src={url} alt={`Élément ${index + 1}`} />
                  <div className="cap">#{index + 1}</div>
                </div>
              ))}
            </div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn primary" type="button" onClick={() => void exportResult(false)}>
                Export PNG
              </button>
              <button className="btn" type="button" onClick={() => void exportResult(true)}>
                Export ZIP
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
