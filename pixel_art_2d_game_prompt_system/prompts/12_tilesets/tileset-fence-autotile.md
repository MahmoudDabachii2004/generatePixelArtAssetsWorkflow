---
id: "12_tilesets/tileset-fence-autotile"
title: "Tileset Fence Autotile"
category: "12_tilesets"
kind: "generation"
version: "1.0.0"
custom_request_variable: "{{CUSTOM_REQUEST}}"
variables:
  - "{{CUSTOM_REQUEST}}"
  - "{{ASSET_DESCRIPTION}}"
  - "{{REFERENCE_IMAGE_1}}"
  - "{{PIXEL_GRID_REFERENCE}}"
  - "{{STYLE_REFERENCE_IMAGES}}"
  - "{{PALETTE}}"
  - "{{PIXEL_SIZE}}"
  - "{{CANVAS_WIDTH}}"
  - "{{CANVAS_HEIGHT}}"
  - "{{BACKGROUND_MODE}}"
  - "{{SPECIAL_REQUIREMENTS}}"
  - "{{FORBIDDEN_ELEMENTS}}"
  - "{{TILE_SIZE}}"
  - "{{AUTOTILE_FORMAT}}"
  - "{{EDGE_RULES}}"
---

# Tileset Fence Autotile

## Purpose

Seam-safe tileset generation prompt. Target: Tileset Fence Autotile.

## Composition rule

Compose the shared core modules first, then this specialized prompt, then one compatible direction/loop/layout module when needed. Do not concatenate unrelated specialized prompts.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{COMPOSED_CORE_PROMPT}}

SPECIFIC TASK: **Tileset Fence Autotile**

Asset description:
{{ASSET_DESCRIPTION}}

Custom request injection:
{{CUSTOM_REQUEST}}

Special requirements:
{{SPECIAL_REQUIREMENTS}}

TASK-SPECIFIC RULES:
- Every tile must occupy exactly {{TILE_SIZE}} × {{TILE_SIZE}} logical pixels.
- Shared edges must match pixel-for-pixel with no seams, accidental borders, lighting discontinuities, or unique landmarks that reveal repetition.
- Keep collision-reading silhouettes clear and reserve decorative variation for non-collision interior pixels.
- Generate the exact connectivity cases required by {{AUTOTILE_FORMAT}} and include no duplicate or missing masks.
- Validate each edge against all compatible neighbors.

OUTPUT:
Follow the composed output contract exactly. Preserve the checkerboard reference only as a hidden one-pixel calibration source; never include it in the rendered asset.
