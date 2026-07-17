# Pixel Forge

A **free, 100% local** pixel-art game-asset studio. It builds tuned prompts you
paste into ChatGPT or Gemini, then does the entire post-processing pipeline in
your browser — cut, pixel-snap, background clean, recentre/foot-anchor, pack —
and exports engine-ready sprite sheets, atlases, tilesets and parallax layers.

The method is adapted from chongdashu / VibeGameDev's workflow: **image
generation is ~20% of the work; the other 80% is a deterministic pipeline.**
Pixel Forge does that 80% locally so the free web models only have to do the
easy 20%.

## Why it works (the three failure modes it fixes)

- **Mixels** — AI paints fake sub-pixels. → *Pixel-snap* recovers the true
  native grid (pure-TypeScript detector, no WASM).
- **Bleeding** — naive grid crops merge neighbouring sprites. → *Cut* takes the
  largest connected component per cell and **never merges** boxes.
- **Drift** — characters slide/bob between frames. → *Recentre* foot-anchors
  every frame to the same baseline `(128, 255)` by integer translation.

## Tools (the hub doors)

| Door | What it does |
| --- | --- |
| **Générer un personnage** | South anchor → snap → NSEW (east = flip of west) → action/idle/attack boards → free walk cycle. Guided prompts + identity chain. |
| **Armes, objets & items** | Single object or a set → snap + trim → padded atlas + Phaser/generic JSON. |
| **Tileset** | Tile board → uniform slice + chroma clean → tile manifest (Godot/Unity/Tiled). |
| **Maps & parallax** | One playable map, or layered parallax: per-layer z-order + scroll factor, live scrolling preview, export per layer + manifest. |
| **Effets & interface** | VFX (centre-anchored sequence) or a UI/HUD atlas. |
| **J'ai déjà un sheet** | Drop an existing board → cut → snap → recentre → export. |
| **Pixel-snap seul** / **Recentrer / aligner** | The pipeline steps as standalone tools. |

Every generator shows the exact prompt, tells you **which reference images to
attach and in what order**, and processes the pasted-back result. Briefs persist
across refreshes.

## The canonical output format

Runtime sprite sheet: **1280×512 RGBA**, **5 columns × 2 rows**, **256×256**
cells, foot-anchored at **(128, 255)**, row-major, `#00FF00` chroma (or
`#FF00FF`). Every animation exports a `manifest.json`:

```json
{ "version": 1, "action": "walk", "direction": "w", "frameWidth": 256,
  "frameHeight": 256, "columns": 5, "rows": 2, "frames": 9, "fps": 10,
  "mode": "image", "anchor": { "x": 128, "y": 255 } }
```

Plus Phaser JSON atlases, a generic atlas JSON, and plain-language import notes
for Godot / Unity / GameMaker / LÖVE / Tiled.

## Architecture

- `src/core/` — pure, unit-tested pipeline modules (no DOM): `snap`, `cut`,
  `recenter`, `pack`, `bg`, `atlas`, `tiles`, `maps`, `export`, `prompts`,
  `pipeline`, `zip`, `rgba`.
- `src/ui/` — hub + hash router + one tool per door; `io.ts` is the only
  canvas-touching module (PNG decode/encode).

## Quick start

```text
npm install
npm run dev
```

## Quality checks

```text
npm run test    # vitest — the core pipeline is covered end-to-end
npm run lint
npm run build   # tsc -b && vite build
```

## Credits

Method and format adapted from chongdashu / VibeGameDev
(`ai-pixel-snapped-game-sprites`, `ai-game-spritesheets`, `vibe-fighter`, MIT)
and the video *"Stop Generating Fake Pixel Art Game Sprites"*. The pixel-snap
concept derives from the open-source Sprite Fusion pixel snapper.
