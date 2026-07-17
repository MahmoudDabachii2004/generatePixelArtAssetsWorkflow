// Maps + layered parallax. Simple mode: one opaque playable map. Layered mode:
// several parallax layers (each its own z-order + scroll factor), previewed
// live with a scroll slider (source-over composite), exported as separate PNGs
// + a layers.json manifest an engine can reproduce.
import { useCallback, useMemo, useState } from 'react'
import { removeChroma } from '../../core/bg'
import { buildLayerManifest, composeParallax, type LayerManifestEntry, type ParallaxLayer } from '../../core/maps'
import {
  buildLayerPrompt,
  buildMapPrompt,
  type CharacterBrief,
  type ChromaKey,
  type LayerDepth,
  type MapView,
  type ModelKey,
} from '../../core/prompts'
import { CHROMA_GREEN, CHROMA_MAGENTA, type Rgb, type RgbaImage } from '../../core/types'
import { createZip, type ZipEntry } from '../../core/zip'
import { blobToBytes, decodeToRgba, downloadBlob, rgbaToDataUrl, rgbaToPngBlob, safeFilename } from '../io'
import { DropArea } from '../components/DropArea'
import { PromptCard } from '../components/PromptCard'
import { usePersistentState } from '../usePersistentState'

const CHROMA: Record<ChromaKey, Rgb> = { green: CHROMA_GREEN, magenta: CHROMA_MAGENTA }
const DEPTHS: LayerDepth[] = ['ciel', 'lointain', 'moyen', 'proche']
const PREVIEW_W = 360
const PREVIEW_H = 200

interface LayerState {
  id: string
  name: string
  depth: LayerDepth
  scrollFactor: number
  seamless: boolean
  image: RgbaImage | null
}

function newLayer(depth: LayerDepth, scrollFactor: number): LayerState {
  return { id: crypto.randomUUID(), name: depth, depth, scrollFactor, seamless: true, image: null }
}

export function MapTool() {
  const [mode, setMode] = useState<'simple' | 'layered'>('layered')
  const [name, setName] = usePersistentState('map.name', 'Niveau')
  const [description, setDescription] = usePersistentState('map.description', 'une forêt brumeuse au crépuscule')
  const [style, setStyle] = usePersistentState('map.style', 'pixel art 16-bit')
  const [palette] = usePersistentState('map.palette', '16-32 couleurs')
  const [chroma, setChroma] = usePersistentState<ChromaKey>('map.chroma', 'green')
  const [model, setModel] = usePersistentState<ModelKey>('map.model', 'chatgpt')
  const [view, setView] = useState<MapView>('side')
  const [mapImage, setMapImage] = useState<RgbaImage | null>(null)
  const [layers, setLayers] = useState<LayerState[]>(() => [
    newLayer('ciel', 0),
    newLayer('lointain', 0.2),
    newLayer('proche', 0.6),
  ])
  const [scrollX, setScrollX] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const brief: CharacterBrief = useMemo(
    () => ({ name, description, style, palette, chroma, canvas: 1024, model }),
    [name, description, style, palette, chroma, model],
  )

  const loadMap = useCallback(async (file: File) => {
    setError(null)
    try {
      setMapImage(await decodeToRgba(file))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Image illisible.')
    }
  }, [])

  const loadLayer = useCallback(
    async (id: string, file: File) => {
      setError(null)
      try {
        const raw = await decodeToRgba(file)
        setLayers((current) =>
          current.map((layer) => {
            if (layer.id !== id) return layer
            // Sky is opaque; other layers reveal what's behind → key out chroma.
            const image = layer.depth === 'ciel' ? raw : removeChroma(raw, { chroma: CHROMA[chroma], tolerance: 60, despill: true })
            return { ...layer, image }
          }),
        )
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Image illisible.')
      }
    },
    [chroma],
  )

  const updateLayer = useCallback((id: string, patch: Partial<LayerState>) => {
    setLayers((current) => current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)))
  }, [])
  const removeLayer = useCallback((id: string) => {
    setLayers((current) => current.filter((layer) => layer.id !== id))
  }, [])
  const addLayer = useCallback(() => {
    setLayers((current) => [...current, newLayer('moyen', 0.4)])
  }, [])

  const previewUrl = useMemo(() => {
    const loaded: ParallaxLayer[] = layers
      .map((layer, index) => ({ layer, index }))
      .filter((entry) => entry.layer.image)
      .map((entry) => ({
        name: entry.layer.name,
        z: entry.index,
        scrollFactor: entry.layer.scrollFactor,
        image: entry.layer.image as RgbaImage,
      }))
    if (loaded.length === 0) return null
    return rgbaToDataUrl(composeParallax(loaded, PREVIEW_W, PREVIEW_H, scrollX))
  }, [layers, scrollX])

  const exportMap = useCallback(async () => {
    if (!mapImage) return
    downloadBlob(await rgbaToPngBlob(mapImage), safeFilename(name, 'png'))
  }, [mapImage, name])

  const exportLayers = useCallback(async () => {
    const entries: ZipEntry[] = []
    const manifest: LayerManifestEntry[] = []
    for (let i = 0; i < layers.length; i += 1) {
      const layer = layers[i]
      if (!layer || !layer.image) continue
      const file = safeFilename(`${i}-${layer.name}`, 'png')
      entries.push({ name: file, bytes: await blobToBytes(await rgbaToPngBlob(layer.image)) })
      manifest.push({
        name: layer.name,
        file,
        z: i,
        scrollFactor: layer.scrollFactor,
        width: layer.image.width,
        height: layer.image.height,
      })
    }
    if (entries.length === 0) return
    entries.push({ name: 'layers.json', bytes: new TextEncoder().encode(buildLayerManifest(manifest)) })
    const notes = [
      `# Parallax — ${name}`,
      `Couches de l'arrière (z bas) vers l'avant. scrollFactor 0 = fixe, 1 = suit la caméra.`,
      `Chaque PNG se répète horizontalement (seamless) pour boucler au défilement.`,
    ].join('\n')
    entries.push({ name: 'IMPORT.md', bytes: new TextEncoder().encode(notes) })
    downloadBlob(createZip(entries), safeFilename(name, 'zip'))
  }, [layers, name])

  return (
    <div className="tool">
      <aside className="panel">
        <h2 className="mono">Brief</h2>
        <div className="controls">
          <div className="field">
            <label htmlFor="m-name">Nom</label>
            <input id="m-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="m-desc">Description</label>
            <input id="m-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="m-style">Style</label>
            <input id="m-style" type="text" value={style} onChange={(e) => setStyle(e.target.value)} />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="m-chroma">Chroma</label>
              <select id="m-chroma" value={chroma} onChange={(e) => setChroma(e.target.value as ChromaKey)}>
                <option value="green">Vert #00FF00</option>
                <option value="magenta">Magenta #FF00FF</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="m-model">Modèle</label>
              <select id="m-model" value={model} onChange={(e) => setModel(e.target.value as ModelKey)}>
                <option value="chatgpt">ChatGPT</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="m-mode">Type</label>
            <select id="m-mode" value={mode} onChange={(e) => setMode(e.target.value as 'simple' | 'layered')}>
              <option value="layered">Map en calques (parallax)</option>
              <option value="simple">Map simple</option>
            </select>
          </div>
          {mode === 'simple' && (
            <div className="field">
              <label htmlFor="m-view">Vue</label>
              <select id="m-view" value={view} onChange={(e) => setView(e.target.value as MapView)}>
                <option value="side">De côté (side-scroller)</option>
                <option value="top">De dessus (top-down)</option>
              </select>
            </div>
          )}
        </div>
        {error && <p className="error">{error}</p>}
      </aside>

      <main className="panel">
        {mode === 'simple' ? (
          <>
            <PromptCard output={buildMapPrompt(brief, view)} />
            <div className="section-label">Colle la map générée</div>
            <DropArea label="Map" onFile={(file) => void loadMap(file)} />
            {mapImage && (
              <>
                <div className="section-label">Map · {mapImage.width}×{mapImage.height}</div>
                <div className="preview-sheet checker">
                  <img src={rgbaToDataUrl(mapImage)} alt="Map" style={{ maxWidth: '100%' }} />
                </div>
                <div className="btn-row" style={{ marginTop: 16 }}>
                  <button className="btn primary" type="button" onClick={() => void exportMap()}>
                    Export PNG
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {previewUrl && (
              <>
                <div className="section-label">Aperçu parallax (glisse pour défiler)</div>
                <div className="preview-sheet checker" style={{ display: 'flex', justifyContent: 'center' }}>
                  <img src={previewUrl} alt="Aperçu parallax" style={{ width: PREVIEW_W, imageRendering: 'pixelated' }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={600}
                  value={scrollX}
                  onChange={(e) => setScrollX(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 10 }}
                  aria-label="Défilement"
                />
              </>
            )}
            <div className="section-label" style={{ marginTop: 18 }}>Calques (arrière → avant)</div>
            {layers.map((layer, index) => (
              <div className="panel" key={layer.id} style={{ marginBottom: 12, padding: 14 }}>
                <div className="row2">
                  <div className="field">
                    <label>Nom (z={index})</label>
                    <input type="text" value={layer.name} onChange={(e) => updateLayer(layer.id, { name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Profondeur (prompt)</label>
                    <select value={layer.depth} onChange={(e) => updateLayer(layer.id, { depth: e.target.value as LayerDepth })}>
                      {DEPTHS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row2" style={{ marginTop: 10 }}>
                  <div className="field">
                    <label>Scroll factor ({layer.scrollFactor.toFixed(2)})</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={layer.scrollFactor}
                      onChange={(e) => updateLayer(layer.id, { scrollFactor: Number(e.target.value) })}
                    />
                  </div>
                  <label className="toggle" style={{ alignSelf: 'end' }}>
                    <input type="checkbox" checked={layer.seamless} onChange={(e) => updateLayer(layer.id, { seamless: e.target.checked })} />
                    Seamless
                  </label>
                </div>
                <details style={{ marginTop: 10 }}>
                  <summary className="mono" style={{ cursor: 'pointer', fontSize: 12 }}>prompt de cette couche</summary>
                  <PromptCard output={buildLayerPrompt(brief, { depth: layer.depth, seamless: layer.seamless })} />
                </details>
                <div style={{ marginTop: 10 }}>
                  <DropArea label={layer.image ? `${layer.name} ✓ (remplacer)` : `Colle la couche « ${layer.name} »`} onFile={(file) => void loadLayer(layer.id, file)} />
                </div>
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button className="btn" type="button" onClick={() => removeLayer(layer.id)}>
                    Retirer ce calque
                  </button>
                </div>
              </div>
            ))}
            <div className="btn-row">
              <button className="btn" type="button" onClick={addLayer}>
                + Ajouter un calque
              </button>
              <button className="btn primary" type="button" onClick={() => void exportLayers()}>
                Export ZIP (calques + manifest)
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
