---
id: "17_maps_levels/map-town-layout"
title: "Map Town Layout"
category: "17_maps_levels"
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
---

# Map Town Layout

## Purpose

Playable map and level-art planning prompt. Target: Map Town Layout.

## Composition rule

Compose the shared core modules first, then this specialized prompt, then one compatible direction/loop/layout module when needed. Do not concatenate unrelated specialized prompts.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{COMPOSED_CORE_PROMPT}}

SPECIFIC TASK: **Map Town Layout**

Asset description:
{{ASSET_DESCRIPTION}}

Custom request injection:
{{CUSTOM_REQUEST}}

Special requirements:
{{SPECIAL_REQUIREMENTS}}

TASK-SPECIFIC RULES:
- Prioritize navigable space, readable entrances, traversal routes, and gameplay silhouettes over decorative density.
- Do not bake characters, enemies, pickups, UI, or collision markers into the final environment art unless requested.

OUTPUT:
Follow the composed output contract exactly. Preserve the checkerboard reference only as a hidden one-pixel calibration source; never include it in the rendered asset.
