// Tilesets. Import a chroma tileset board → remove chroma → slice into a strict
// uniform grid (tiles are NOT trimmed to content — a tile's margin matters) →
// drop empty cells → export the cleaned uniform sheet + a tile manifest engines
// can slice by tile size.
import { useCallback, useMemo, useState } from 'react'
import { removeChroma } from '../../core/bg'
import { buildTilesetPrompt, type CharacterBrief, type ChromaKey, type ModelKey } from '../../core/prompts'
import { isEmpty, sliceUniform } from '../../core/tiles'
import { CHROMA_GREEN, CHROMA_MAGENTA, type Rgb, type RgbaImage } from '../../core/types'
import { createZip, type ZipEntry } from '../../core/zip'
import { blobToBytes, decodeToRgba, downloadBlob, rgbaToDataUrl, rgbaToPngBlob, safeFilename } from '../io'
import { DropArea } from '../components/DropArea'
import { PromptCard } from '../components/PromptCard'
import { usePersistentState } from '../usePersistentState'

const CHROMA: Record<ChromaKey, Rgb> = { green: CHROMA_GREEN, magenta: CHROMA_MAGENTA }

interface TilesetResult {
  cleaned: RgbaImage
  tiles: RgbaImage[]
  empty: boolean[]
  tileW: number
  tileH: number
}

export function TilesetTool() {
  const [name, setName] = usePersistentState('tile.name', 'Tileset')
  const [description, setDescription] = usePersistentState('tile.description', 'herbe, terre, pierre, eau et bordures')
  const [style, setStyle] = usePersistentState('tile.style', 'pixel art 16-bit')
  const [palette] = usePersistentState('tile.palette', '12-24 couleurs')
  const [chroma, setChroma] = usePersistentState<ChromaKey>('tile.chroma', 'magenta')
  const [model, setModel] = usePersistentState<ModelKey>('tile.model', 'chatgpt')
  const [columns, setColumns] = useState(4)
  const [rows, setRows] = useState(4)
  const [tilePx, setTilePx] = useState(32)
  const [tolerance, setTolerance] = useState(60)
  const [result, setResult] = useState<TilesetResult | null>(null)
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
        const cleaned = removeChroma(raw, { chroma: CHROMA[chroma], tolerance, despill: false })
        const tiles = sliceUniform(cleaned, columns, rows)
        setResult({
          cleaned,
          tiles,
          empty: tiles.map((tile) => isEmpty(tile)),
          tileW: Math.floor(cleaned.width / columns),
          tileH: Math.floor(cleaned.height / rows),
        })
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Le traitement a échoué.')
      } finally {
        setBusy(false)
      }
    },
    [chroma, tolerance, columns, rows],
  )

  const exportZip = useCallback(async () => {
    if (!result) return
    const imageName = safeFilename(name, 'png')
    const manifest = {
      image: imageName,
      tileWidth: result.tileW,
      tileHeight: result.tileH,
      columns,
      rows,
      count: result.tiles.length,
      emptyIndices: result.empty.flatMap((isEmptyTile, index) => (isEmptyTile ? [index] : [])),
    }
    const notes = [
      `# Tileset — ${imageName}`,
      `Grille uniforme ${columns}×${rows}, tuile ${result.tileW}×${result.tileH}.`,
      `Godot : TileSet → nouvelle texture, taille de tuile ${result.tileW}×${result.tileH}.`,
      `Unity : Sprite Mode Multiple → Slice Grid By Cell Size ${result.tileW}×${result.tileH}.`,
      `Tiled : new tileset "based on tileset image", tile ${result.tileW}×${result.tileH}.`,
    ].join('\n')
    const entries: ZipEntry[] = [
      { name: imageName, bytes: await blobToBytes(await rgbaToPngBlob(result.cleaned)) },
      { name: 'tileset.json', bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) },
      { name: 'IMPORT.md', bytes: new TextEncoder().encode(notes) },
    ]
    for (let i = 0; i < result.tiles.length; i += 1) {
      if (result.empty[i]) continue
      const tile = result.tiles[i]
      if (tile) entries.push({ name: `tiles/tile_${String(i).padStart(3, '0')}.png`, bytes: await blobToBytes(await rgbaToPngBlob(tile)) })
    }
    downloadBlob(createZip(entries), safeFilename(name, 'zip'))
  }, [result, name, columns, rows])

  const cleanedUrl = useMemo(() => (result ? rgbaToDataUrl(result.cleaned) : null), [result])
  const tileUrls = useMemo(() => (result ? result.tiles.map(rgbaToDataUrl) : []), [result])

  return (
    <div className="tool">
      <aside className="panel">
        <h2 className="mono">Brief</h2>
        <div className="controls">
          <div className="field">
            <label htmlFor="t-name">Nom</label>
            <input id="t-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="t-desc">Contenu</label>
            <input id="t-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="t-style">Style</label>
            <input id="t-style" type="text" value={style} onChange={(e) => setStyle(e.target.value)} />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="t-chroma">Chroma</label>
              <select id="t-chroma" value={chroma} onChange={(e) => setChroma(e.target.value as ChromaKey)}>
                <option value="magenta">Magenta #FF00FF</option>
                <option value="green">Vert #00FF00</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="t-model">Modèle</label>
              <select id="t-model" value={model} onChange={(e) => setModel(e.target.value as ModelKey)}>
                <option value="chatgpt">ChatGPT</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="t-cols">Colonnes</label>
              <input id="t-cols" type="number" min={1} max={16} value={columns} onChange={(e) => setColumns(Math.max(1, Number(e.target.value)))} />
            </div>
            <div className="field">
              <label htmlFor="t-rows">Lignes</label>
              <input id="t-rows" type="number" min={1} max={16} value={rows} onChange={(e) => setRows(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="t-px">Tuile (px, pour le prompt)</label>
              <input id="t-px" type="number" min={8} max={128} value={tilePx} onChange={(e) => setTilePx(Math.max(8, Number(e.target.value)))} />
            </div>
            <div className="field">
              <label htmlFor="t-tol">Tolérance</label>
              <input id="t-tol" type="number" min={0} max={200} value={tolerance} onChange={(e) => setTolerance(Math.max(0, Number(e.target.value)))} />
            </div>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <p className="hint" style={{ marginTop: 14 }}>Chroma magenta conseillé si le tileset contient beaucoup de vert (herbe).</p>
      </aside>

      <main className="panel">
        <PromptCard output={buildTilesetPrompt(brief, { columns, rows, tilePx })} />
        <div className="section-label">Colle le tileset généré</div>
        <DropArea label={busy ? 'Traitement…' : 'Tileset'} onFile={(file) => void process(file)} />

        {result && (
          <>
            <div className="section-label">
              Grille nettoyée · tuile {result.tileW}×{result.tileH} · {result.empty.filter((e) => !e).length}/{result.tiles.length} tuiles
            </div>
            <div className="preview-sheet checker">{cleanedUrl && <img src={cleanedUrl} alt="Tileset nettoyé" />}</div>
            <div className="frames">
              {tileUrls.map((url, index) => (
                <div className="frame-cell checker" key={index} style={{ opacity: result.empty[index] ? 0.35 : 1 }}>
                  <img src={url} alt={`Tuile ${index}`} />
                  <div className="cap">{index}{result.empty[index] ? ' (vide)' : ''}</div>
                </div>
              ))}
            </div>
            <div className="btn-row" style={{ marginTop: 18 }}>
              <button className="btn primary" type="button" onClick={() => void exportZip()}>
                Export ZIP (sheet + tuiles + manifest)
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
