// Objects / weapons / items. Single isolated object → snap + trim → clean PNG.
// A "set" board → cut (blob mode, no merge) → snap each → trim → pack into a
// padded atlas + Phaser/generic atlas JSON. Objects are centre-pivoted, not
// foot-anchored (that's a character concern).
import { useCallback, useMemo, useState } from 'react'
import { packAtlas, type AtlasRect } from '../../core/atlas'
import { removeChroma } from '../../core/bg'
import { cutFrames } from '../../core/cut'
import { toGenericAtlas, toPhaserAtlas } from '../../core/export'
import { buildObjectPrompt, type CharacterBrief, type ChromaKey, type ModelKey } from '../../core/prompts'
import { contentBounds, cropImage } from '../../core/rgba'
import { detectAndSnap } from '../../core/snap'
import { CHROMA_GREEN, CHROMA_MAGENTA, type Rgb, type RgbaImage } from '../../core/types'
import { createZip, type ZipEntry } from '../../core/zip'
import { blobToBytes, decodeToRgba, downloadBlob, rgbaToDataUrl, rgbaToPngBlob, safeFilename } from '../io'
import { DropArea } from '../components/DropArea'
import { PromptCard } from '../components/PromptCard'
import { usePersistentState } from '../usePersistentState'

const CHROMA: Record<ChromaKey, Rgb> = { green: CHROMA_GREEN, magenta: CHROMA_MAGENTA }

type ObjectResult =
  | { kind: 'single'; image: RgbaImage }
  | { kind: 'set'; sheet: RgbaImage; rects: AtlasRect[]; items: RgbaImage[] }

function trim(image: RgbaImage): RgbaImage {
  const bounds = contentBounds(image)
  return bounds ? cropImage(image, bounds) : image
}

export function ObjectTool() {
  const [name, setName] = usePersistentState('obj.name', 'Objets')
  const [description, setDescription] = usePersistentState('obj.description', 'une épée, un bouclier, une potion rouge')
  const [style, setStyle] = usePersistentState('obj.style', 'pixel art 16-bit chunky')
  const [palette] = usePersistentState('obj.palette', '8-16 couleurs')
  const [chroma, setChroma] = usePersistentState<ChromaKey>('obj.chroma', 'green')
  const [model, setModel] = usePersistentState<ModelKey>('obj.model', 'chatgpt')
  const [isSet, setIsSet] = useState(true)
  const [count, setCount] = useState(6)
  const [columns, setColumns] = useState(3)
  const [rows, setRows] = useState(2)
  const [tolerance, setTolerance] = useState(60)
  const [snap, setSnap] = useState(true)
  const [result, setResult] = useState<ObjectResult | null>(null)
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
        if (!isSet) {
          const noBackground = removeChroma(raw, { chroma: chromaColor, tolerance, despill: true })
          const native = snap ? detectAndSnap(noBackground).native : noBackground
          setResult({ kind: 'single', image: trim(native) })
        } else {
          const cut = cutFrames(raw, { chroma: chromaColor, tolerance })
          const items = cut.frames.map((frame) => {
            const noBackground = removeChroma(frame, { chroma: chromaColor, tolerance, despill: true })
            const native = snap ? detectAndSnap(noBackground).native : noBackground
            return trim(native)
          })
          const atlas = packAtlas(items, { padding: 2 })
          setResult({ kind: 'set', sheet: atlas.sheet, rects: atlas.rects, items })
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Le traitement a échoué.')
      } finally {
        setBusy(false)
      }
    },
    [chroma, isSet, tolerance, snap],
  )

  const exportResult = useCallback(
    async (asZip: boolean) => {
      if (!result) return
      const base = safeFilename(name, 'png')
      if (result.kind === 'single') {
        downloadBlob(await rgbaToPngBlob(result.image), base)
        return
      }
      const imageName = safeFilename(name, 'png')
      const sheetBytes = await blobToBytes(await rgbaToPngBlob(result.sheet))
      if (!asZip) {
        downloadBlob(new Blob([sheetBytes.buffer as ArrayBuffer], { type: 'image/png' }), imageName)
        return
      }
      const entries: ZipEntry[] = [
        { name: imageName, bytes: sheetBytes },
        { name: 'atlas.phaser.json', bytes: new TextEncoder().encode(toPhaserAtlas(imageName, result.sheet.width, result.sheet.height, result.rects)) },
        { name: 'atlas.json', bytes: new TextEncoder().encode(toGenericAtlas(imageName, result.sheet.width, result.sheet.height, result.rects)) },
      ]
      for (let i = 0; i < result.items.length; i += 1) {
        const item = result.items[i]
        if (item) entries.push({ name: `items/${result.rects[i]?.name ?? `item_${i + 1}`}.png`, bytes: await blobToBytes(await rgbaToPngBlob(item)) })
      }
      downloadBlob(createZip(entries), safeFilename(name, 'zip'))
    },
    [result, name],
  )

  const previewUrl = useMemo(() => {
    if (!result) return null
    return rgbaToDataUrl(result.kind === 'single' ? result.image : result.sheet)
  }, [result])
  const itemUrls = useMemo(
    () => (result && result.kind === 'set' ? result.items.map(rgbaToDataUrl) : []),
    [result],
  )

  return (
    <div className="tool">
      <aside className="panel">
        <h2 className="mono">Brief</h2>
        <div className="controls">
          <div className="field">
            <label htmlFor="o-name">Nom</label>
            <input id="o-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="o-desc">Description</label>
            <input id="o-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="o-style">Style</label>
            <input id="o-style" type="text" value={style} onChange={(e) => setStyle(e.target.value)} />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="o-chroma">Chroma</label>
              <select id="o-chroma" value={chroma} onChange={(e) => setChroma(e.target.value as ChromaKey)}>
                <option value="green">Vert #00FF00</option>
                <option value="magenta">Magenta #FF00FF</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="o-model">Modèle</label>
              <select id="o-model" value={model} onChange={(e) => setModel(e.target.value as ModelKey)}>
                <option value="chatgpt">ChatGPT</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={isSet} onChange={(e) => setIsSet(e.target.checked)} />
            Set d’objets (atlas) plutôt qu’un seul
          </label>
          {isSet && (
            <>
              <div className="field">
                <label htmlFor="o-count">Nombre d’objets</label>
                <input id="o-count" type="number" min={2} max={24} value={count} onChange={(e) => setCount(Math.max(2, Number(e.target.value)))} />
              </div>
              <div className="row2">
                <div className="field">
                  <label htmlFor="o-cols">Colonnes</label>
                  <input id="o-cols" type="number" min={1} max={8} value={columns} onChange={(e) => setColumns(Math.max(1, Number(e.target.value)))} />
                </div>
                <div className="field">
                  <label htmlFor="o-rows">Lignes</label>
                  <input id="o-rows" type="number" min={1} max={8} value={rows} onChange={(e) => setRows(Math.max(1, Number(e.target.value)))} />
                </div>
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="o-tol">Tolérance chroma</label>
            <input id="o-tol" type="number" min={0} max={200} value={tolerance} onChange={(e) => setTolerance(Math.max(0, Number(e.target.value)))} />
          </div>
          <label className="toggle">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            Pixel-snap
          </label>
        </div>
        {error && <p className="error">{error}</p>}
      </aside>

      <main className="panel">
        <PromptCard output={buildObjectPrompt(brief, { set: isSet, count, columns, rows })} />
        <div className="section-label">Colle l’image générée</div>
        <DropArea label={busy ? 'Traitement…' : isSet ? 'Board d’objets' : 'Objet'} onFile={(file) => void process(file)} />

        {result && (
          <>
            <div className="section-label">Résultat</div>
            <div className="preview-sheet checker">{previewUrl && <img src={previewUrl} alt="Résultat" />}</div>
            {result.kind === 'set' && (
              <div className="frames">
                {itemUrls.map((url, index) => (
                  <div className="frame-cell checker" key={index}>
                    <img src={url} alt={`Objet ${index + 1}`} />
                    <div className="cap">{result.rects[index]?.name ?? index + 1}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="btn-row" style={{ marginTop: 18 }}>
              <button className="btn primary" type="button" onClick={() => void exportResult(false)}>
                Export PNG
              </button>
              {result.kind === 'set' && (
                <button className="btn" type="button" onClick={() => void exportResult(true)}>
                  Export ZIP + atlas
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
