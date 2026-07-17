# Pixel-Art 2D Game Prompt System

This package is a modular prompt library for building a general-purpose 2D game-asset application. It includes the exact successful two-reference idle prompt, a verified one-pixel checkerboard calibration image, specialized prompts for characters, animation, tilesets, backgrounds, props, UI, VFX, repair, processing, validation, and export.

## The core discovery

Use two separate visual references:

1. **Reference Image 1: source asset or style authority**
2. **Reference Image 2: the supplied one-pixel checkerboard calibration image**

The checkerboard is not artwork and must never appear in the output. It gives the model a clear one-pixel lattice: 1024×1024, alternating every single pixel between `#E8E8E8` and `#D2D2D2`.

The exact successful prompt is stored unchanged at:

`prompts/00_gold_standard/00_exact_reference_grid_idle_prompt.md`

Treat that file as a regression fixture. Do not casually rewrite it.

## What to replace in the current app

Replace monolithic, duplicated prompts with a composition system.

Each generation request should be built from:

1. Request schema and normalized variables
2. Reference-image lock
3. Pixel-grid calibration
4. Pixel-art rendering lock
5. Palette lock
6. Camera and canvas lock
7. Background and alpha rules
8. One specialized asset or animation prompt
9. Zero or one direction wrapper
10. Zero or one loop module
11. Zero or one layout module
12. Output contract
13. Post-processing contract
14. Negative prompt library
15. The user's narrow `{{CUSTOM_REQUEST}}`

Do **not** send the entire library to the model. Select only compatible modules.

## Canonical composition order

```text
01_core/00-request-schema
01_core/01-reference-image-lock
01_core/02-pixel-grid-calibration
01_core/03-pixel-art-rendering-lock
01_core/04-palette-lock
01_core/05-camera-and-canvas-lock
01_core/06-background-and-alpha-rules

ONE specialized task prompt

OPTIONAL direction wrapper
OPTIONAL loop module
OPTIONAL layout module

01_core/08-output-contract
01_core/09-postprocessing-contract
01_core/07-negative-prompt-library
01_core/10-generation-priority-order

CUSTOM REQUEST
```

The priority-order module should be rendered near the end so conflicts are resolved predictably.

## How existing specific prompts should be migrated

For each current app prompt:

1. Identify the part that is genuinely unique: action, asset type, pose, gameplay phases, tile connectivity, or UI state.
2. Delete duplicated generic instructions about pixel art, camera, references, backgrounds, antialiasing, and output dimensions.
3. Map those generic requirements to the shared core modules.
4. Move the unique instruction into the matching specialized prompt's `SPECIFIC TASK` and `TASK-SPECIFIC RULES`.
5. Preserve custom user wording through `{{CUSTOM_REQUEST}}`.
6. Never edit the golden prompt to solve one specialized task. Extend it with a specialized module or create a repair prompt.
7. Version every changed prompt and keep the previous prompt for regression tests.

## Prompt-selection examples

### Existing character, subtle idle

```text
core modules
+ 05_character_animation/anim-idle-subtle-loop
+ 03_views/view-front-facing
+ 29_loops/loop-perfect-circular
+ 28_layouts/layout-horizontal-strip
```

For Gemini image-to-video, begin from the exact golden prompt whenever its assumptions match.

### Existing character, eight-direction walk

```text
core modules
+ 05_character_animation/anim-walk-loop
+ 07_direction_wrappers/direction-eight-way
+ 29_loops/loop-perfect-circular
+ 28_layouts/layout-direction-rows-action-columns
```

### New top-down tileset

```text
core modules
+ 12_tilesets/tileset-ground-autotile
+ 03_views/view-top-down-single-direction
+ 28_layouts/layout-grid-sheet
```

### Repair one bad frame

```text
core modules
+ 31_repairs/repair-one-frame-only
```

Do not rerun the original generation prompt when only one frame is wrong.

## Required request object

```json
{
  "assetType": "character_animation",
  "task": "walk",
  "assetDescription": "armored ranger with red scarf",
  "referenceImage1": "uploaded source sprite",
  "pixelGridReference": "assets/pixel-grid-calibration-1024.png",
  "cameraView": "front",
  "projection": "orthographic",
  "directionCount": 1,
  "frameCount": 8,
  "frameRate": 24,
  "loopType": "perfect_circular",
  "pixelSize": 8,
  "canvasWidth": 1024,
  "canvasHeight": 1024,
  "palette": ["..."],
  "backgroundMode": "flat_chroma",
  "outputLayout": "video_then_extract",
  "customRequest": "Keep the scarf motion especially subtle."
}
```

## Resolver behavior

The app's prompt resolver should:

- classify the request
- reject incompatible module combinations
- choose one specialized prompt
- add a direction wrapper only when directions are requested
- add a loop module only for looping output
- add a layout module only when a sheet or frame layout is requested
- interpolate variables
- append the custom request last
- log the exact resolved prompt IDs and versions

The resolver must not allow `{{CUSTOM_REQUEST}}` to override immutable constraints. For example, "make it smoother" cannot enable antialiasing or subpixel interpolation.

## Reference upload order

For models that accept multiple images:

- Slot 1: source character, prop, tileset, or style asset
- Slot 2: `assets/pixel-grid-calibration-1024.png`
- Additional slots: project style references only

Never composite the checkerboard behind the source image. Upload it separately.

## Recommended generation and processing pipeline

1. Generate the asset or animation with the selected prompt composition.
2. Preserve the raw model output.
3. Extract frames when output is video.
4. Select one deterministic master cycle.
5. Normalize dimensions and frame origin.
6. Apply one shared palette across the complete asset set.
7. Run Pixel Snapper using one fixed pixel-size override for every related frame.
8. Validate anchor, bounds, frame count, palette, background, and loop seam.
9. Upscale only by an integer factor with nearest-neighbor scaling.
10. Pack the spritesheet.
11. Export metadata for the target engine.
12. Keep a build manifest containing prompt IDs, prompt versions, model, seed when available, references, processing parameters, and checksums.

## Pixel Snapper integration

The prompt pack includes `32_processing/process-pixel-snap.md`.

Important implementation rule: do not independently auto-detect pixel size for every animation frame. Use one fixed value across the whole cycle or asset family, or the grid can change between frames.

Example CLI shape:

```bash
spritefusion-pixel-snapper input.png output.png 16 --pixel-size 8
```

Example fixed palette shape:

```bash
spritefusion-pixel-snapper input.png output.png --pixel-size 8 \
  --palette "0d2b45,203c56,544e68,8d697a,d08159,ffaa5e,ffd4a3,ffecd6"
```

For application integration, the project also exposes a WASM `process_image` function. Keep all frames on identical arguments.

## Nearest-neighbor upscale integration

The prompt pack includes `32_processing/process-nearest-neighbor-upscale.md`.

Run nearest-neighbor scaling only after the asset has been snapped, quantized, cleaned, and validated. Use a positive integer scale. Never combine it with smoothing, AI enhancement, sharpening, or resampling filters.

Example command shape:

```bash
./NearestNeighbourUpscale snapped.png 4
```

## Animation-loop rule

A perfect game loop is circular:

```text
P0 → P1 → P2 → ... → P7 → P0
```

The final exported pose is `P7`, not a duplicate of `P0`. Duplicating `P0` at the end creates a boundary hold.

When a video contains repeated cycles, frames separated by one master-cycle length should be pixel-identical after deterministic processing.

## Repair strategy

Never regenerate an almost-correct asset from scratch.

Use a prompt from `31_repairs` and name only the defect. Freeze all successful properties. The repair prompt must preserve frame count, canvas, timing, palette intent, anchor, identity, and good motion.

## Validation gates

Before an asset is accepted, run the relevant files in `33_validation`.

At minimum for character animation:

- dimensions
- frame count
- palette
- grid alignment
- frame origin
- foot anchor
- character bounds
- duplicate frames
- loop seam
- background uniformity or alpha

At minimum for tiles:

- dimensions
- palette
- grid alignment
- tile seams
- output naming

## Directory overview

- `assets/`: calibration image and verified metadata
- `prompts/00_gold_standard/`: exact successful prompt
- `prompts/01_core/`: global composition modules
- `prompts/02_project_style/` through `prompts/30_transitions/`: creation prompts
- `prompts/31_repairs/`: surgical correction prompts
- `prompts/32_processing/`: deterministic post-processing specs
- `prompts/33_validation/`: machine-readable validation specs
- `prompts/34_exports/`: engine export profiles
- `examples/`: integration examples
- `manifest.json`: complete prompt registry

## Non-negotiable implementation rule

Specialized prompts **extend** the shared reference-and-grid system. They do not replace it.

When adding a new prompt later, create only the smallest task-specific module needed. Reuse the core locks and keep the exact golden prompt unchanged as the known-good benchmark.
