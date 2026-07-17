# Pixel Forge

Pixel Forge is a guided, offline-first React workshop for producing complete 2D game assets with AI. It creates strict prompts for ChatGPT or Gemini, accepts the generated images or videos, and keeps the rest of the production workflow inside the app: frame extraction, sprite-board separation, cropping, ordering, pixel cleanup, background removal, upscaling, alignment, preview, and packaging.

The only external step is generating an image or video in the AI tool of your choice. The final output can be one sprite-sheet PNG or one ZIP containing every ordered frame, the sheet, and its manifest.

The embedded Pixel Snapper engine turns inconsistent or AI-generated pixel art into a clean native-resolution sprite, then enlarges that corrected sprite with exact nearest-neighbour pixel copying.

The application does **not** stretch the source image to imitate pixel art. It first reconstructs the implied low-resolution grid with Sprite Fusion Pixel Snapper, presents several nearby grid interpretations, and only then upscales the selected native sprite.

## Privacy

Your images stay on this device. Processing happens locally in your browser. The application has no backend, analytics, image upload, cloud storage, or processing API.

Once the production files are loaded, image processing does not require network access.

## Features

- Focused seven-step wizard with recommended defaults and advanced settings hidden until requested.
- Original, style-reference, identity-reference, guarded-edit, and image-to-video prompt templates.
- Canonical alternating-pixel guides for directional anchors and 2048 x 1536 action pose boards, with exact attachment order plus runtime dimension and SHA-256 validation.
- Multiple-image drag and drop plus configurable Gemini video frame extraction.
- Foreground-component recovery for directional boards, pose sheets, atlases, and UI elements.
- Frame add, duplicate, flip, delete with undo, drag reorder, shared crop, and manual crop.
- Batch fast path or per-frame pixel cleanup, background/fringe removal, and upscaling.
- Feet, hips, head, center, or custom alignment without clipping.
- Loop preview, sprite-sheet PNG, loose PNG, JSON manifest, and complete ZIP export.
- PNG, JPEG, and WebP detection from byte signatures rather than filename extensions.
- Browser decoding with `createImageBitmap` and an image-element fallback.
- RGBA normalization to PNG before Rust/WASM processing.
- Sprite Fusion automatic grid detection plus three to five nearby candidates.
- Deterministic reconstruction-based candidate recommendation with neutral wording.
- 16, 32, 64, 128, 256, and custom color counts; default is 64.
- Validated custom hexadecimal palettes with swatches.
- Boundary-connected flood-fill background removal, corner-color suggestion, click sampling, tolerance, and conservative edge cleanup.
- Exact integer nearest-neighbour factors from 1× through 16×.
- Safe allocation checks and estimated raw memory display.
- Original, native, upscaled, and side-by-side previews with pixel-perfect display.
- Native PNG, upscaled PNG, and combined downloads with Windows-safe filenames.
- Worker-based processing, stale-job invalidation, progress messages, and partial candidate failure handling.
- Responsive desktop, tablet, and mobile layout.

## Why the output becomes smaller first

AI-generated pixel art is often a large raster image that imitates large pixels. Pixel Snapper reconstructs the underlying native grid, such as converting a 1024×1024 image into an approximately 64×64 sprite. Nearest-neighbour upscaling then enlarges that corrected native sprite without introducing blur.

The small native result is intentional. Each output pixel represents one corrected logical pixel from the reconstructed sprite.

## Why automatic detection may need adjustment

Automatic grid detection is a recommendation, not a guarantee. JPEG blocking, compression ringing, gradients, antialiased outlines, inconsistent generated blocks, dithering, mixed grid sizes, and painted details can all make the implied grid ambiguous.

Pixel Snapper Studio keeps the automatic estimate visible and processes nearby manual candidates so the user can compare outlines, repeated blocks, and native dimensions directly.

## Requirements

For ordinary development and production builds:

- Node.js 20 or newer
- npm

Only required when rebuilding third-party WASM artifacts:

- Rust and Cargo
- `wasm-pack`
- Emscripten SDK with `emcc` for the C module

The generated Sprite Fusion WASM package is checked into `src/wasm/spritefusion`, so normal users do not need Rust to run `npm run build`.

The nearest-neighbour wrapper uses the C/WASM module when `public/wasm/nearest-neighbour.js` and its `.wasm` companion exist. When those files are unavailable, it uses the included explicit TypeScript pixel-copy implementation. It never uses canvas scaling as the algorithmic fallback.

## Quick start

```text
npm install
npm run dev
```

Open the local URL printed by Vite.

Production workflow:

```text
npm run build
npm run preview
```

Quality checks:

```text
npm run test
npm run lint
npm run format:check
npm run check
```

Format source files:

```text
npm run format
```

## Available npm scripts

| Command                     | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `npm run dev`               | Start Vite development mode.                                   |
| `npm run build`             | Run strict TypeScript checks and create the production bundle. |
| `npm run preview`           | Serve the production bundle locally.                           |
| `npm run test`              | Run Vitest and React Testing Library tests once.               |
| `npm run test:watch`        | Run tests interactively.                                       |
| `npm run lint`              | Run ESLint.                                                    |
| `npm run format`            | Format supported files with Prettier.                          |
| `npm run format:check`      | Verify formatting without changing files.                      |
| `npm run wasm:spritefusion` | Rebuild the Rust/WASM package.                                 |
| `npm run wasm:nearest`      | Rebuild the C/WASM nearest-neighbour package.                  |
| `npm run wasm:build`        | Rebuild both WASM packages.                                    |
| `npm run check`             | Run lint, tests, and production build.                         |

## How Sprite Fusion Pixel Snapper is used

Source is vendored at `vendor/spritefusion-pixel-snapper` from revision:

`ae20461f60fb39e75d15f184bab1ebec1219511c`

The browser worker calls a minimally added `process_image_detailed` Rust/WASM export. It returns:

- PNG output bytes
- detected or applied pixel size
- native output width and height
- whether a manual override was used

The original `process_image` export and native CLI behavior remain intact. See `docs/SPRITEFUSION_PATCH.md`.

Rebuild:

```text
npm run wasm:spritefusion
```

Install Rust from the official Rust installer, then install `wasm-pack`:

```text
cargo install wasm-pack
```

## How Nearest-Neighbour-Upscale is used

Source is vendored at `vendor/nearest-neighbour-upscale` from revision:

`a76163192ff975337fbabb92f52d1b023e8ca476`

The production wrapper is designed to compile only `NearestNeighbourUpscale.c`, export `upscaleNN_RGBA`, `_malloc`, and `_free`, and preserve alpha. The native filesystem-oriented driver is not included in the browser bundle.

Rebuild after activating the Emscripten SDK:

```text
npm run wasm:nearest
```

See `docs/NEAREST_NEIGHBOUR_WASM.md` for exact flags and the current build status.

## Windows notes

All package scripts use Node or cross-platform npm commands. They work from Command Prompt and PowerShell.

- Do not run Bash-only cleanup commands.
- Activate the Emscripten SDK in the current terminal before running `npm run wasm:nearest`.
- The rebuild scripts never delete existing generated WASM files when a prerequisite is missing.
- Output filenames remove Windows-invalid characters and always end in `.png`.

## Candidate recommendation metric

Each candidate is decoded to RGBA, reconstructed toward source dimensions with explicit nearest-neighbour copying, and compared with the normalized source. The score adds small penalties for implausibly tiny output, aspect-ratio changes, and distance from the automatic estimate.

Lower internal scores are preferred. The interface exposes a friendly match score but does not claim scientific certainty. See `docs/CANDIDATE_SCORING.md`.

## Testing

The test suite includes synthetic, original fixtures only. It covers:

- PNG, JPEG, WebP, unknown, and extension mismatch detection
- candidate generation and bounds
- palette parsing and normalization
- connected background removal, tolerance, existing alpha, and interior-color preservation
- filename sanitization and PNG naming
- 1× and 2× nearest-neighbour expansion and alpha preservation
- invalid allocation inputs
- deterministic candidate scoring
- file selection, unsupported input, candidate selection, scale dimensions, export state, and background controls
- conditional C/WASM parity when the generated nearest-neighbour module is present

## Folder structure

```text
src/
  app/             reducer, state types, application composition
  components/      accessible reusable UI panels
  hooks/           worker, debounce, and object-URL hooks
  lib/image/       decoding, signatures, PNG export, palettes, transparency
  lib/processing/  candidates, scoring, and memory limits
  lib/wasm/        typed Rust/WASM and C/WASM wrappers plus TS fallback
  workers/         typed processing worker
  styles/          reset, design tokens, and responsive application CSS
  test/            unit and UI tests
  wasm/            generated Sprite Fusion package
scripts/           cross-platform WASM rebuild scripts
vendor/            unmodified upstream history plus documented local patch
docs/              integration and algorithm notes
public/wasm/        generated nearest-neighbour C/WASM output when available
public/reference-guides/ immutable native-pixel and 4 x 3 pose-board generation guides
```

## Troubleshooting

### Sprite Fusion engine is unavailable

Run:

```text
npm run wasm:spritefusion
```

Confirm Rust and `wasm-pack` are on `PATH`. Existing generated artifacts are retained if the command cannot run.

### `emcc was not found`

Install and activate the Emscripten SDK, then rerun:

```text
npm run wasm:nearest
```

Until then, the interface reports `typescript-fallback`; the fallback still performs exact RGBA pixel copying and does not blur.

### An image is rejected

The application trusts image bytes, not extensions. Confirm the file is a valid PNG, JPEG, or WebP, is non-empty, is under 50 MB, and is below the source pixel limits.

### Candidate processing fails

Try a lower color count, remove a custom palette, or choose a different source image. Individual candidate failures do not discard successful candidates.

### Large upscale is disabled

The requested output exceeds the configured 100 million pixel safety limit. Choose a lower scale or a smaller native candidate.

## Known limitations

- The automatic detector can be ambiguous for mixed grids, heavy compression, gradients, or painterly source images.
- The current machine did not provide Emscripten, so the C/WASM nearest-neighbour artifact was not generated during this implementation. The working explicit TypeScript fallback is active until `npm run wasm:nearest` succeeds.
- Browser canvas PNG encoding is used only to serialize final RGBA pixels; it does not scale or interpolate them.
- PWA/service-worker support was intentionally deferred to keep the core local processing pipeline focused and reliable.

## Licensing and attribution

This application includes MIT-licensed third-party source. Full notices, copyright statements, revisions, modifications, and license texts are in `THIRD_PARTY_NOTICES.md`. Vendored upstream license files remain in their original repositories.
