---
id: "07_direction_wrappers/direction-eight-way"
title: "Direction Eight Way"
category: "07_direction_wrappers"
kind: "direction-wrapper"
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
  - "{{DIRECTION_COUNT}}"
  - "{{DIRECTION}}"
  - "{{PROJECTION}}"
  - "{{CAMERA_VIEW}}"
---

# Direction Eight Way

## Purpose

Directional consistency wrapper composed with another asset or animation prompt. Target: Direction Eight Way.

## Composition rule

Compose the shared core modules first, then this specialized prompt, then one compatible direction/loop/layout module when needed. Do not concatenate unrelated specialized prompts.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{COMPOSED_CORE_PROMPT}}

SPECIFIC TASK: **Direction Eight Way**

Asset description:
{{ASSET_DESCRIPTION}}

Custom request injection:
{{CUSTOM_REQUEST}}

Special requirements:
{{SPECIAL_REQUIREMENTS}}

TASK-SPECIFIC RULES:
- Generate every requested direction with identical canvas size, scale, frame count, timing, anchor, and lighting logic.
- Equipment must remain on the physically correct side; do not mirror asymmetric details unless explicitly allowed.
- Diagonal views are new directional poses, not rotated cameras.
- Use the canonical order N, NE, E, SE, S, SW, W, NW unless {{OUTPUT_LAYOUT}} overrides it.
- Keep proportions, equipment, palette, and lighting coherent across all eight views.

OUTPUT:
Follow the composed output contract exactly. Preserve the checkerboard reference only as a hidden one-pixel calibration source; never include it in the rendered asset.
